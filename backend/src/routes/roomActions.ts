import type { FastifyInstance } from "fastify";
import { verifyToken } from "../lib/auth.js";
import { getUserFromRequest } from "./auth.js";
import {
  getOrRestoreRoom,
  touchRoom,
  getRoomState,
  broadcast,
  getParticipantsList,
  randomId,
  Singer,
  QueueItem,
  biasedPartyScore,
  makeDuetKey,
  RankingEntry,
  connections,
  broadcastParticipants
} from "../lib/roomManager.js";
import { addSongToLibrary, incrementPlayCount } from "../lib/songs.js";

export default async function roomActionsRoutes(app: FastifyInstance) {
  app.get<{ Params: { roomCode: string } }>(
    "/api/rooms/:roomCode/state",
    async (req, reply) => {
      const room = await getOrRestoreRoom(req.params.roomCode);
      if (!room) return reply.code(404).send({ error: "room_not_found" });
      return getRoomState(room);
    }
  );

  app.get<{ Params: { roomCode: string } }>(
    "/api/rooms/:roomCode/participants",
    async (req, reply) => {
      const room = await getOrRestoreRoom(req.params.roomCode);
      if (!room) return reply.code(404).send({ error: "room_not_found" });
      const conns = connections.get(room.code);
      if (!conns) return reply.code(404).send({ error: "room_not_found" });

      const participants = getParticipantsList(req.params.roomCode);
      return { participants };
    }
  );

  app.post<{
    Params: { roomCode: string };
    Body: {
      videoId: string;
      title?: string;
      requestedBy?: string;
      partner?: string;
      userId?: string;
      partnerId?: string;
      deviceFingerprint?: string;
      duration?: number;
    };
  }>("/api/rooms/:roomCode/enqueue", async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });
    touchRoom(req.params.roomCode);

    const videoId = (req.body.videoId || "").trim();
    const title = (req.body.title || "").trim() || "(sem título)";
    const requestedBy = (req.body.requestedBy || "").trim() || "Convidado";
    const partner = (req.body.partner || "").trim();
    const odUserId = (req.body.userId || "").trim() || `anon_${randomId()}`;
    const partnerId = (req.body.partnerId || "").trim();
    const deviceFingerprint = (req.body.deviceFingerprint || "").trim();

    if (!videoId) return reply.code(400).send({ error: "missing_videoId" });

    const authUser = await getUserFromRequest(req);
    const isHost = !!authUser && authUser.userId === room.ownerId;
    const THREE_MINUTES = 3 * 60 * 1000;
    const now = Date.now();

    if (!isHost) {
      const lastByUser = room.lastEnqueueAt[odUserId] || 0;
      if (now - lastByUser < THREE_MINUTES) {
        const remaining = Math.ceil((THREE_MINUTES - (now - lastByUser)) / 1000);
        return reply.code(429).send({
          error: "cooldown",
          remainingSeconds: remaining,
          message: `Aguarde ${remaining} segundos para adicionar outra música.`,
        });
      }

      if (deviceFingerprint) {
        const deviceKey = deviceFingerprint.slice(0, 40);
        const lastByDevice = room.lastEnqueueAtByDevice[deviceKey] || 0;
        if (now - lastByDevice < THREE_MINUTES) {
          const remaining = Math.ceil((THREE_MINUTES - (now - lastByDevice)) / 1000);
          return reply.code(429).send({
            error: "cooldown",
            remainingSeconds: remaining,
            message: `Aguarde ${remaining} segundos para adicionar outra música.`,
          });
        }
      }
    }

    const singers: Singer[] = [{ id: odUserId, name: requestedBy }];
    if (partner && partner !== requestedBy && partnerId) {
      singers.push({ id: partnerId, name: partner });
    }

    const item: QueueItem = {
      id: randomId(),
      videoId,
      title,
      requestedBy,
      requesterId: odUserId,
      singers,
      duration: typeof req.body.duration === "number" && req.body.duration > 0 ? req.body.duration : undefined,
    };
    room.queue.push(item);
    room.lastEnqueueAt[odUserId] = now;
    if (deviceFingerprint) {
      const deviceKey = deviceFingerprint.slice(0, 40);
      room.lastEnqueueAtByDevice[deviceKey] = now;
    }

    addSongToLibrary(videoId, title, requestedBy).catch(() => {});

    broadcast(room.code, { type: "STATE", state: getRoomState(room) });

    return { ok: true, itemId: item.id };
  });

  app.post<{ Params: { roomCode: string }; Body: { userId?: string } }>(
    "/api/rooms/:roomCode/next",
    async (req, reply) => {
      const room = await getOrRestoreRoom(req.params.roomCode);
      if (!room) return reply.code(404).send({ error: "room_not_found" });

      const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;
      const authUser = await getUserFromRequest(req);
      const isOwner = !!authUser && authUser.userId === room.ownerId;
      let isTvToken = false;
      if (!isOwner && tvTokenHeader) {
        const decoded = verifyToken(tvTokenHeader);
        isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
      }

      if (!isOwner && !isTvToken) {
        return reply.code(403).send({ error: "forbidden" });
      }
      touchRoom(req.params.roomCode);

      if (room.nowPlaying) {
        room.history.unshift(room.nowPlaying);
        room.history = room.history.slice(0, 15);
      }
      room.currentSongScores = {};
      room.skipVotes = [];
      room.nowPlaying = room.queue.shift() || null;
      broadcast(room.code, { type: "STATE", state: getRoomState(room) });

      if (room.nowPlaying) {
        const code = room.code;
        setTimeout(() => {
          const conns = connections.get(code);
          if (conns) {
            const payload = JSON.stringify({
              type: "PLAYER_COMMAND",
              action: "play",
            });
            for (const ws of conns.tv) {
              try {
                if (ws.readyState === 1) ws.send(payload);
              } catch {}
            }
          }
        }, 800);
      }
      return { ok: true };
    }
  );

  app.post<{
    Params: { roomCode: string };
    Body: { itemId: string; userId?: string };
  }>("/api/rooms/:roomCode/queue/remove", async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const itemId = (req.body.itemId || "").trim();
    const userId = (req.body.userId || "").trim();
    if (!itemId) return reply.code(400).send({ error: "missing_itemId" });

    const item = room.queue.find(i => i.id === itemId);
    if (!item) return reply.code(404).send({ error: "not_found" });

    const authUser = await getUserFromRequest(req);
    const isHost = !!authUser && authUser.userId === room.ownerId;
    const isRequester = userId === item.requesterId;
    const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;
    let isTvToken = false;
    if (!isHost && !isRequester && tvTokenHeader) {
      const decoded = verifyToken(tvTokenHeader);
      isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
    }

    if (!isHost && !isRequester && !isTvToken) {
      return reply.code(403).send({ error: "forbidden", message: "Apenas o dono da sala, o TV ou quem adicionou a música pode removê-la." });
    }

    room.queue = room.queue.filter(i => i.id !== itemId);
    if (isRequester) {
      delete room.lastEnqueueAt[userId];
    }
    broadcast(room.code, { type: "STATE", state: getRoomState(room) });
    return { ok: true };
  });

  app.post<{
    Params: { roomCode: string };
    Body: { itemId: string; direction: "up" | "down" };
  }>("/api/rooms/:roomCode/queue/move", async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const itemId = (req.body.itemId || "").trim();
    const direction = req.body.direction;
    const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;

    const authUser = await getUserFromRequest(req);
    const isHost = !!authUser && authUser.userId === room.ownerId;
    let isTvToken = false;
    if (!isHost && tvTokenHeader) {
      const decoded = verifyToken(tvTokenHeader);
      isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
    }

    if (!isHost && !isTvToken) {
      return reply.code(403).send({ error: "forbidden" });
    }

    if (!itemId) return reply.code(400).send({ error: "missing_itemId" });
    if (direction !== "up" && direction !== "down") return reply.code(400).send({ error: "invalid_direction" });

    const idx = room.queue.findIndex(i => i.id === itemId);
    if (idx === -1) return reply.code(404).send({ error: "not_found" });

    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= room.queue.length) return { ok: true };

    const tmp = room.queue[idx];
    room.queue[idx] = room.queue[newIdx];
    room.queue[newIdx] = tmp;

    broadcast(room.code, { type: "STATE", state: getRoomState(room) });
    return { ok: true };
  });

  app.post<{
    Params: { roomCode: string };
    Body: { itemId: string };
  }>("/api/rooms/:roomCode/queue/to-top", async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const itemId = (req.body.itemId || "").trim();
    const { userId } = req.body as { userId?: string };
    const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;

    const isHost = userId === room.ownerId;
    let isTvToken = false;
    if (!isHost && tvTokenHeader) {
      const decoded = verifyToken(tvTokenHeader);
      isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
    }

    if (!isHost && !isTvToken) {
      return reply.code(403).send({ error: "forbidden" });
    }

    if (!itemId) return reply.code(400).send({ error: "missing_itemId" });

    const idx = room.queue.findIndex(i => i.id === itemId);
    if (idx === -1) return reply.code(404).send({ error: "not_found" });
    if (idx === 0) return { ok: true };

    const [item] = room.queue.splice(idx, 1);
    room.queue.unshift(item);

    broadcast(room.code, { type: "STATE", state: getRoomState(room) });
    return { ok: true };
  });

  app.post<{ Params: { roomCode: string }; Body: { requester?: string; userId?: string } }>(
    "/api/rooms/:roomCode/finalize",
    async (req, reply) => {
      const room = await getOrRestoreRoom(req.params.roomCode);
      if (!room) return reply.code(404).send({ error: "room_not_found" });
      touchRoom(req.params.roomCode);

      const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;
      const authUser = await getUserFromRequest(req);
      const isOwner = !!authUser && authUser.userId === room.ownerId;
      let isTvToken = false;
      if (!isOwner && tvTokenHeader) {
        const decoded = verifyToken(tvTokenHeader);
        isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
      }

      if (!isOwner && !isTvToken) return reply.code(403).send({ error: "forbidden" });

      const requester = (req.body.requester || "").trim() || "Convidado";
      const now = Date.now();

      if (now - room.lastFinalizeMs < 10_000) {
        return reply.code(429).send({ error: "cooldown", cooldownMs: 10_000 });
      }
      room.lastFinalizeMs = now;

      if (!room.nowPlaying) return reply.code(400).send({ error: "nothing_playing" });

      const singers: Singer[] = room.nowPlaying.singers || [
        { id: `anon_${randomId()}`, name: room.nowPlaying.requestedBy },
      ];
      
      let score = 0;
      if (room.currentSongScores && Object.keys(room.currentSongScores).length > 0) {
        const userAverages: number[] = [];
        for (const scores of Object.values(room.currentSongScores)) {
          if (Array.isArray(scores) && scores.length > 0) {
            const userSum = scores.reduce((a, b) => a + b, 0);
            userAverages.push(userSum / scores.length);
          }
        }
        if (userAverages.length > 0) {
          const totalSum = userAverages.reduce((a, b) => a + b, 0);
          score = Math.round(totalSum / userAverages.length);
        } else {
          score = biasedPartyScore();
        }
      } else {
        score = biasedPartyScore(); 
      }

      room.currentSongScores = {};

      for (const singer of singers) {
        const existingEntry = room.ranking[singer.id];
        if (!existingEntry || typeof existingEntry === "number") {
          room.ranking[singer.id] = { name: singer.name, score: 0 };
        }
        (room.ranking[singer.id] as RankingEntry).score += score;
        (room.ranking[singer.id] as RankingEntry).name = singer.name;
      }

      if (singers.length === 2) {
        if (!room.duetRanking) room.duetRanking = {};
        const duetKey = makeDuetKey(singers[0].id, singers[1].id);
        if (!room.duetRanking[duetKey]) {
          const sortedSingers = [...singers].sort((a, b) => a.id.localeCompare(b.id));
          room.duetRanking[duetKey] = {
            singerIds: [sortedSingers[0].id, sortedSingers[1].id] as [string, string],
            names: [sortedSingers[0].name, sortedSingers[1].name] as [string, string],
            score: 0,
            count: 0,
          };
        } else {
          const entry = room.duetRanking[duetKey];
          for (let i = 0; i < entry.singerIds.length; i++) {
            const singer = singers.find(s => s.id === entry.singerIds[i]);
            if (singer) entry.names[i] = singer.name;
          }
        }
        room.duetRanking[duetKey].score += score;
        room.duetRanking[duetKey].count += 1;
      }

      const singerNames = singers.map(s => s.name);
      const singerDisplay = singerNames.length > 1 ? singerNames.slice(0, -1).join(", ") + " e " + singerNames[singerNames.length - 1] : singerNames[0];

      room.showingScore = true;

      broadcast(room.code, {
        type: "FINALIZED",
        by: requester,
        singer: singerDisplay,
        singers: singerNames,
        score,
        videoId: room.nowPlaying.videoId,
        title: room.nowPlaying.title,
      });

      const finalizedVideoId = room.nowPlaying.videoId;
      incrementPlayCount(finalizedVideoId).catch(() => {});

      room.nowPlaying = null;
      broadcast(room.code, { type: "STATE", state: getRoomState(room) });

      return { ok: true, score };
    }
  );

  app.post<{
    Params: { roomCode: string };
    Body: { userId: string; newName: string };
  }>("/api/rooms/:roomCode/update-name", async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const { userId, newName } = req.body;
    if (!userId || !newName) return reply.code(400).send({ error: "missing_userId_or_newName" });

    const trimmedName = newName.trim();
    if (!trimmedName) return reply.code(400).send({ error: "empty_name" });

    const existingParticipants = getParticipantsList(req.params.roomCode);
    const duplicateName = existingParticipants.find(
      p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== userId
    );
    if (duplicateName) {
      return reply.code(400).send({
        error: "duplicate_name",
        message: `O nome "${trimmedName}" já está sendo usado nesta sala.`,
      });
    }

    if (room.ranking[userId] && typeof room.ranking[userId] !== "number") {
      (room.ranking[userId] as RankingEntry).name = trimmedName;
    }

    if (room.duetRanking) {
      for (const entry of Object.values(room.duetRanking)) {
        const idx = entry.singerIds.indexOf(userId);
        if (idx !== -1) entry.names[idx] = trimmedName;
      }
    }

    for (const item of room.queue) {
      for (const singer of item.singers) {
        if (singer.id === userId) singer.name = trimmedName;
      }
      if (item.singers.some(s => s.id === userId)) {
        item.requestedBy = item.singers.map(s => s.name).join(" e ");
      }
    }

    if (room.nowPlaying) {
      for (const singer of room.nowPlaying.singers) {
        if (singer.id === userId) singer.name = trimmedName;
      }
      if (room.nowPlaying.singers.some(s => s.id === userId)) {
        room.nowPlaying.requestedBy = room.nowPlaying.singers.map(s => s.name).join(" e ");
      }
    }

    const conns = connections.get(req.params.roomCode);
    if (conns) {
      for (const [socket, info] of conns.participants) {
        if (info.id === userId) {
          conns.participants.set(socket, { id: userId, name: trimmedName });
        }
      }
      if (conns.recentParticipants.has(userId)) {
        const existing = conns.recentParticipants.get(userId)!;
        conns.recentParticipants.set(userId, { ...existing, name: trimmedName });
      }
      broadcastParticipants(req.params.roomCode);
    }

    broadcast(room.code, { type: "STATE", state: getRoomState(room) });

    return { ok: true };
  });

  app.post<{ Params: { roomCode: string } }>(
    "/api/rooms/:roomCode/score-done",
    async (req, reply) => {
      const room = await getOrRestoreRoom(req.params.roomCode);
      if (!room) return reply.code(404).send({ error: "room_not_found" });

      room.showingScore = false;
      broadcast(room.code, { type: "STATE", state: getRoomState(room) });

      return { ok: true };
    }
  );

  app.post<{ Params: { roomCode: string }; Body: { action: string; userId?: string } }>(
    "/api/rooms/:roomCode/player",
    async (req, reply) => {
      const room = await getOrRestoreRoom(req.params.roomCode);
      if (!room) return reply.code(404).send({ error: "room_not_found" });

      const authUser = await getUserFromRequest(req);
      if (!authUser || authUser.userId !== room.ownerId) {
        return reply.code(403).send({ error: "forbidden" });
      }
      touchRoom(req.params.roomCode);

      const action = req.body.action;
      if (!["play", "pause"].includes(action)) return reply.code(400).send({ error: "invalid_action" });

      const conns = connections.get(room.code);
      if (conns) {
        const payload = JSON.stringify({ type: "PLAYER_COMMAND", action });
        for (const ws of conns.tv) {
          try {
            if (ws.readyState === 1) ws.send(payload);
          } catch {}
        }
      }

      return { ok: true, action };
    }
  );

  app.post<{
    Params: { roomCode: string };
    Body: { deviceId: string };
  }>("/api/rooms/:roomCode/skip-vote", async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const { deviceId } = req.body;
    if (!deviceId) return reply.code(400).send({ error: "missing_deviceId" });

    if (!room.nowPlaying) return reply.code(400).send({ error: "nothing_playing" });

    if (!room.skipVotes.includes(deviceId)) {
      room.skipVotes.push(deviceId);
    }

    const participantsCount = getParticipantsList(room.code).length;
    const requiredVotes = participantsCount <= 2 ? 1 : Math.max(2, Math.ceil(participantsCount / 2));

    if (room.skipVotes.length >= requiredVotes) {
      room.skipVotes = [];
      
      if (room.nowPlaying) {
        room.history.unshift(room.nowPlaying);
        room.history = room.history.slice(0, 15);
      }
      room.currentSongScores = {};
      room.nowPlaying = room.queue.shift() || null;
      
      broadcast(room.code, { type: "STATE", state: getRoomState(room) });

      if (room.nowPlaying) {
        setTimeout(() => {
          const conns = connections.get(room.code);
          if (conns) {
            const payload = JSON.stringify({ type: "PLAYER_COMMAND", action: "play" });
            for (const ws of conns.tv) {
              try { if (ws.readyState === 1) ws.send(payload); } catch {}
            }
          }
        }, 800);
      }
      return { ok: true, skipped: true };
    }

    broadcast(room.code, { type: "STATE", state: getRoomState(room) });
    return { ok: true, skipped: false, votes: room.skipVotes.length, required: requiredVotes };
  });
}
