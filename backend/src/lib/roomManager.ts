import type { WebSocket } from "ws";
import prisma from "./prisma.js";

export interface Singer {
  id: string; // Unique user ID
  name: string; // Display name
}

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  requestedBy: string;
  requesterId: string; // ID of the user who added the song
  singers: Singer[]; // All singers with their IDs
  duration?: number; // seconds
}

export interface RankingEntry {
  name: string;
  score: number;
}

export interface DuetRankingEntry {
  singerIds: [string, string]; // Sorted IDs for consistent lookup
  names: [string, string]; // Display names
  score: number;
  count: number; // Number of songs sung together
}

export interface RoomState {
  code: string;
  createdAt: number;
  lastActivityAt: number; // timestamp da última atividade
  nowPlaying: QueueItem | null;
  skipVotes: string[]; // ids dos usuários que votaram para pular
  queue: QueueItem[];
  ranking: Record<string, RankingEntry | number>; // odUserId -> { name, score }
  duetRanking?: Record<string, DuetRankingEntry>; // "id1|id2" -> { names, score, count }
  currentSongScores?: Record<string, number[]>; // odUserId -> lista de notas dadas
  ownerId: string; // The user who created the room
  lastEnqueueAt: Record<string, number>; // userId -> timestamp of last successful enqueue
  lastEnqueueAtByDevice: Record<string, number>; // deviceFingerprint -> timestamp (anti-abuse)
  lastFinalizeMs: number;
  showingScore: boolean; // true while TV is showing score overlay
  history: QueueItem[]; // recently played songs (for encore)
}

export interface RoomConnections {
  tv: Set<WebSocket>;
  mobile: Set<WebSocket>;
  participants: Map<WebSocket, { id: string; name: string }>; // socket -> user info
  recentParticipants: Map<string, { name: string; lastSeen: number }>; // odUserId -> info
}

// Global State
export const rooms = new Map<string, RoomState>();
export const connections = new Map<string, RoomConnections>();

// Cleanup
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const INACTIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

export function startCleanupIfNeeded() {
  if (cleanupIntervalId === null && rooms.size > 0) {
    cleanupIntervalId = setInterval(() => {
      runCleanup();
      persistAllRooms();
    }, CLEANUP_INTERVAL_MS);
  }
}

export function stopCleanupIfEmpty() {
  if (cleanupIntervalId !== null && rooms.size === 0) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

export function runCleanup() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const conns = connections.get(code);
    const hasConnections = conns && (conns.tv.size > 0 || conns.mobile.size > 0);
    const isInactive = now - room.lastActivityAt > INACTIVE_THRESHOLD_MS;

    if (!hasConnections && isInactive) {
      rooms.delete(code);
      connections.delete(code);
    }
  }
  stopCleanupIfEmpty();
}

export function addRoom(code: string, room: RoomState) {
  rooms.set(code, room);
  startCleanupIfNeeded();
}

export function touchRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    room.lastActivityAt = Date.now();
  }
}

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function makeDuetKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("|");
}

export function biasedPartyScore(): number {
  if (Math.random() < 0.01) return 100;
  const random = Math.random();
  const bias = 2;
  const scoreValue = Math.pow(random, 1 / bias) * 100;
  return Math.floor(scoreValue);
}

export function getRoomState(room: RoomState) {
  const rankingForFrontend: Record<string, { name: string; score: number }> = {};
  for (const [odUserId, entry] of Object.entries(room.ranking)) {
    if (typeof entry === "number") {
      rankingForFrontend[odUserId] = { name: odUserId, score: entry };
    } else {
      rankingForFrontend[odUserId] = { name: entry.name, score: entry.score };
    }
  }

  const duetRankingArray = Object.values(room.duetRanking || {}).map(entry => ({
    names: entry.names,
    score: entry.score,
    count: entry.count,
  }));

  return {
    roomCode: room.code,
    nowPlaying: room.nowPlaying ? { ...room.nowPlaying } : null,
    queue: room.queue.map(item => ({ ...item })),
    history: room.history,
    ranking: rankingForFrontend,
    duetRanking: duetRankingArray,
    showingScore: room.showingScore,
    ownerId: room.ownerId,
    lastEnqueueAt: room.lastEnqueueAt,
  };
}

export function broadcast(roomCode: string, msg: object) {
  const conns = connections.get(roomCode);
  if (!conns) return;
  const payload = JSON.stringify(msg);
  const dead: WebSocket[] = [];
  for (const ws of [...conns.tv, ...conns.mobile]) {
    try {
      if (ws.readyState === 1) ws.send(payload);
      else dead.push(ws);
    } catch {
      dead.push(ws);
    }
  }
  for (const ws of dead) {
    conns.tv.delete(ws);
    conns.mobile.delete(ws);
  }
}

export interface ParticipantInfo {
  id: string;
  name: string;
}

export function getParticipantsList(roomCode: string): ParticipantInfo[] {
  const conns = connections.get(roomCode);
  if (!conns) return [];

  const participantsMap = new Map<string, string>();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  for (const info of conns.participants.values()) {
    if (info && info.id) {
      participantsMap.set(info.id, info.name);
    }
  }

  for (const [odUserId, info] of conns.recentParticipants) {
    if (now - info.lastSeen < ONE_HOUR) {
      if (!participantsMap.has(odUserId)) {
        participantsMap.set(odUserId, info.name);
      }
    } else {
      conns.recentParticipants.delete(odUserId);
    }
  }

  return Array.from(participantsMap.entries()).map(([id, name]) => ({ id, name }));
}

export function getParticipantsNamesList(roomCode: string): string[] {
  return getParticipantsList(roomCode).map(p => p.name);
}

export function getUniqueNickname(roomCode: string, desiredName: string, odUserId: string): string {
  const participants = getParticipantsList(roomCode);
  const trimmedName = desiredName.trim();

  const nameExists = participants.some(
    p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== odUserId
  );

  if (!nameExists) return trimmedName;

  let suffix = 2;
  while (suffix < 100) {
    const candidateName = `${trimmedName}${suffix}`;
    const candidateExists = participants.some(
      p => p.name.toLowerCase() === candidateName.toLowerCase() && p.id !== odUserId
    );
    if (!candidateExists) return candidateName;
    suffix++;
  }

  return `${trimmedName}_${randomId().slice(0, 4)}`;
}

export async function persistAllRooms() {
  for (const [code, room] of rooms) {
    try {
      await prisma.room.update({
        where: { code },
        data: { state: room as any },
      });
    } catch (err) {
      console.error(`[DB] Failed to persist room state for ${code}:`, err);
    }
  }
}

export async function getOrRestoreRoom(roomCode: string): Promise<RoomState | null> {
  const code = roomCode.toUpperCase();
  let room = rooms.get(code);

  if (!room) {
    try {
      const dbRoom = await prisma.room.findUnique({ where: { code } });
      if (!dbRoom) return null;

      if (dbRoom.state) {
        room = dbRoom.state as unknown as RoomState;
        room.lastActivityAt = Date.now();
      } else {
        room = {
          code: dbRoom.code,
          createdAt: dbRoom.createdAt.getTime(),
          lastActivityAt: Date.now(),
          nowPlaying: null,
          skipVotes: [],
          queue: [],
          ranking: {},
          duetRanking: {},
          currentSongScores: {},
          ownerId: dbRoom.ownerId,
          lastEnqueueAt: {},
          lastEnqueueAtByDevice: {},
          lastFinalizeMs: 0,
          showingScore: false,
          history: [],
        };
      }
      
      addRoom(code, room);
      connections.set(code, {
        tv: new Set(),
        mobile: new Set(),
        participants: new Map(),
        recentParticipants: new Map(),
      });
    } catch (err) {
      console.error(`[DB] Error looking up room ${code}:`, err);
      return rooms.get(code) || null;
    }
  }
  return room;
}

export function broadcastParticipants(roomCode: string) {
  const participants = getParticipantsList(roomCode);
  broadcast(roomCode, {
    type: "PARTICIPANTS",
    participants,
  });
}
