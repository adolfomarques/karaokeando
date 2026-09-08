import type { WebSocket } from "ws";
import type { FastifyRequest } from "fastify";
import { verifyToken } from "./auth.js";
import { recordRoomVisit } from "../routes/rooms.js";
import {
  getOrRestoreRoom,
  connections,
  touchRoom,
  getUniqueNickname,
  broadcastParticipants,
  randomId,
  getRoomState,
  getParticipantsList,
  broadcast
} from "./roomManager.js";

export async function handleWebSocket(socket: WebSocket, req: FastifyRequest) {
  const params = req.params as { roomCode: string };
  const roomCode = (params.roomCode || "").trim().toUpperCase();
  const room = await getOrRestoreRoom(roomCode);
  let role: "tv" | "mobile" = "mobile";
  let name = "";
  let odUserId = "";

  if (!room) {
    socket.send(JSON.stringify({ type: "ERROR", error: "room_not_found" }));
    socket.close();
    return;
  }

  socket.on("message", (raw: Buffer | string) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "HELLO") {
        let conns = connections.get(roomCode);
        if (!conns) {
          conns = {
            tv: new Set(),
            mobile: new Set(),
            participants: new Map(),
            recentParticipants: new Map(),
          };
          connections.set(roomCode, conns);
        }
        touchRoom(roomCode);

        // New auth flow: token-based
        if (msg.token) {
          const payload = verifyToken(msg.token);

          if (!payload) {
            socket.send(
              JSON.stringify({
                type: "ERROR",
                error: "invalid_token",
                message: "Token inválido ou expirado",
              })
            );
            socket.close();
            return;
          }

          if (payload.type === "tv") {
            // TV token
            if (payload.roomCode !== roomCode) {
              socket.send(
                JSON.stringify({
                  type: "ERROR",
                  error: "wrong_room",
                  message: "Token não é válido para esta sala",
                })
              );
              socket.close();
              return;
            }
            role = "tv";
            name = "TV";
            odUserId = `tv_${roomCode}`;
            conns.tv.add(socket);
          } else if (payload.type === "user") {
            // User token (mobile)
            role = "mobile";
            odUserId = payload.userId;

            const requestedName = msg.name || payload.name;
            name = getUniqueNickname(roomCode, requestedName, odUserId);

            conns.mobile.add(socket);
            conns.participants.set(socket, { id: odUserId, name });
            conns.recentParticipants.delete(odUserId);

            socket.send(
              JSON.stringify({
                type: "NICKNAME_ASSIGNED",
                nickname: name,
                originalName: requestedName,
                wasModified: name !== requestedName,
              })
            );

            broadcastParticipants(roomCode);
            recordRoomVisit(roomCode, odUserId).catch(() => { });
          }
        } else {
          // Legacy flow: no token
          role = msg.role === "tv" ? "tv" : "mobile";
          name = msg.name || "";
          odUserId = msg.userId || `anon_${randomId()}`;

          if (role === "mobile" && name) {
            const originalName = name;
            name = getUniqueNickname(roomCode, name, odUserId);

            if (name !== originalName) {
              socket.send(
                JSON.stringify({
                  type: "NICKNAME_ASSIGNED",
                  nickname: name,
                  originalName,
                  wasModified: true,
                })
              );
            }
          }

          if (role === "tv") {
            conns.tv.add(socket);
          } else {
            conns.mobile.add(socket);
            if (name && odUserId) {
              conns.participants.set(socket, { id: odUserId, name });
              conns.recentParticipants.delete(odUserId);
              broadcastParticipants(roomCode);
            }
          }
        }

        socket.send(
          JSON.stringify({ type: "HELLO", roomCode, role, name, odUserId })
        );
        socket.send(
          JSON.stringify({ type: "STATE", state: getRoomState(room) })
        );
        socket.send(
          JSON.stringify({
            type: "PARTICIPANTS",
            participants: getParticipantsList(roomCode),
          })
        );
      } else if (msg.type === "REACTION") {
        touchRoom(roomCode);
        broadcast(roomCode, {
          type: "REACTION",
          reaction: msg.reaction,
          name: msg.name || name || "Convidado",
          userId: odUserId
        });
      } else if (msg.type === "SUBMIT_SCORE") {
        touchRoom(roomCode);
        if (odUserId && typeof msg.score === "number" && !isNaN(msg.score)) {
          if (!room.currentSongScores) room.currentSongScores = {};
          if (!room.currentSongScores[odUserId]) room.currentSongScores[odUserId] = [];
          const validScore = Math.max(1, Math.min(100, Math.round(msg.score)));
          room.currentSongScores[odUserId].push(validScore);
        }
      } else {
        socket.send(JSON.stringify({ type: "ACK" }));
      }
    } catch {
      // ignore
    }
  });

  socket.on("error", (err) => {
    console.error(`[WS] Socket error in room ${roomCode}:`, err.message);
  });

  socket.on("close", () => {
    const conns = connections.get(roomCode);
    if (conns) {
      const participantInfo = conns.participants.get(socket);

      conns.tv.delete(socket);
      conns.mobile.delete(socket);
      conns.participants.delete(socket);

      if (participantInfo) {
        conns.recentParticipants.set(participantInfo.id, {
          name: participantInfo.name,
          lastSeen: Date.now(),
        });
        broadcastParticipants(roomCode);
      }
    }
  });
}
