import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import authRoutes from "./routes/auth.js";
import roomRoutes, {
  setRoomCallbacks,
  recordRoomVisit,
} from "./routes/rooms.js";
import { verifyToken, UserTokenPayload, TvTokenPayload } from "./lib/auth.js";
import prisma from "./lib/prisma.js";
import {
  addSongToLibrary,
  incrementPlayCount,
  getSongLibrary as getSongLibraryFromDb,
  getTopSongs as getTopSongsFromDb,
  removeSongFromLibrary,
} from "./lib/songs.js";

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────
// YouTube Search Cache
// Prevents spawning duplicate yt-dlp processes for the same query.
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const CACHE_FILE = "search_cache.json";

interface CacheEntry {
  results: YouTubeSearchResult[];
  expiresAt: number;
}

// Results cache: key = normalized query string
let searchCache = new Map<string, CacheEntry>();

async function loadSearchCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    searchCache = new Map(Object.entries(parsed));
    console.log(`[cache] Loaded ${searchCache.size} search cache entries from disk`);
  } catch {
    // no existing cache or invalid format
  }
}

async function saveSearchCache() {
  try {
    const obj = Object.fromEntries(searchCache);
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj), "utf-8");
  } catch (err) {
    console.error("[cache] Failed to save search cache to disk", err);
  }
}

loadSearchCache();

// In-flight deduplication: same query that's still in progress shares one Promise
const inFlightSearches = new Map<string, Promise<YouTubeSearchResult[]>>();

// Housekeeping: clear expired entries every 10 minutes and flush to disk
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of searchCache.entries()) {
    if (now > entry.expiresAt) {
      searchCache.delete(key);
      changed = true;
    }
  }
  if (changed) saveSearchCache().catch(() => {});
}, 10 * 60 * 1000).unref();

// ─────────────────────────────────────────────────────────────

interface Singer {
  id: string; // Unique user ID
  name: string; // Display name
}

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  requestedBy: string;
  requesterId: string; // ID of the user who added the song
  singers: Singer[]; // All singers with their IDs
}

interface RankingEntry {
  name: string;
  score: number;
}

interface DuetRankingEntry {
  singerIds: [string, string]; // Sorted IDs for consistent lookup
  names: [string, string]; // Display names
  score: number;
  count: number; // Number of songs sung together
}

interface RoomState {
  code: string;
  createdAt: number;
  lastActivityAt: number; // timestamp da última atividade (pra cleanup)
  nowPlaying: QueueItem | null;
  queue: QueueItem[];
  ranking: Record<string, RankingEntry | number>; // odUserId -> { name, score } OR old format name -> score
  duetRanking?: Record<string, DuetRankingEntry>; // "id1|id2" -> { names, score, count }
  ownerId: string; // The user who created the room
  lastEnqueueAt: Record<string, number>; // userId -> timestamp of last successful enqueue
  lastEnqueueAtByDevice: Record<string, number>; // deviceFingerprint -> timestamp (anti-abuse)
  lastFinalizeMs: number;
  showingScore: boolean; // true while TV is showing score overlay
}

interface RoomConnections {
  tv: Set<WebSocket>;
  mobile: Set<WebSocket>;
  participants: Map<WebSocket, { id: string; name: string }>; // socket -> user info
  recentParticipants: Map<string, { name: string; lastSeen: number }>; // odUserId -> info
}

// ─────────────────────────────────────────────────────────────
// State (in-memory for rooms only - songs now in database)
// ─────────────────────────────────────────────────────────────

const rooms = new Map<string, RoomState>();
const connections = new Map<string, RoomConnections>();

// ─────────────────────────────────────────────────────────────
// Cleanup automático de salas inativas (on/off dinâmico)
// ─────────────────────────────────────────────────────────────

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
const INACTIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 horas

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function startCleanupIfNeeded() {
  if (cleanupIntervalId === null && rooms.size > 0) {
    cleanupIntervalId = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  }
}

function stopCleanupIfEmpty() {
  if (cleanupIntervalId !== null && rooms.size === 0) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

function runCleanup() {
  const now = Date.now();

  for (const [code, room] of rooms) {
    const conns = connections.get(code);
    const hasConnections =
      conns && (conns.tv.size > 0 || conns.mobile.size > 0);
    const isInactive = now - room.lastActivityAt > INACTIVE_THRESHOLD_MS;

    // Limpa se: ninguém conectado E inativo há mais de threshold
    if (!hasConnections && isInactive) {
      rooms.delete(code);
      connections.delete(code);
    }
  }

  // Se não sobrou nenhuma sala, para o cleanup
  stopCleanupIfEmpty();
}

// Helper para adicionar sala e iniciar cleanup se necessário
function addRoom(code: string, room: RoomState) {
  rooms.set(code, room);
  startCleanupIfNeeded();
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

// Atualiza timestamp de última atividade da sala
function touchRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    room.lastActivityAt = Date.now();
  }
}

function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Create a normalized duet key from two user IDs (sorted alphabetically)
function makeDuetKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("|");
}

// Mesma fórmula do frontend (pikaraokeScore.ts) - port exato do PiKaraoke original
// bias=2 significa sqrt(random), que puxa os valores pra cima mas não exagera
// Máximo 99 normal, com 1% de chance de tirar 100 (perfeito!)
function biasedPartyScore(): number {
  // 1% de chance de score perfeito!
  if (Math.random() < 0.01) return 100;

  const random = Math.random();
  const bias = 2;
  const scoreValue = Math.pow(random, 1 / bias) * 100; // sqrt(random) * 100 → máx 99
  return Math.floor(scoreValue);
}

function getRoomState(room: RoomState) {
  // Convert ranking to format for frontend: userId -> { name, score }
  // This keeps users with same name separate
  const rankingForFrontend: Record<string, { name: string; score: number }> =
    {};
  for (const [odUserId, entry] of Object.entries(room.ranking)) {
    // Handle both old format (name -> number) and new format (userId -> { name, score })
    if (typeof entry === "number") {
      // Old format: userId is actually the name, entry is the score
      rankingForFrontend[odUserId] = { name: odUserId, score: entry };
    } else {
      // New format: entry is { name, score }
      rankingForFrontend[odUserId] = { name: entry.name, score: entry.score };
    }
  }

  // Convert duet ranking to array format for frontend
  const duetRankingArray = Object.values(room.duetRanking || {}).map(entry => ({
    names: entry.names,
    score: entry.score,
    count: entry.count,
  }));

  return {
    roomCode: room.code,
    nowPlaying: room.nowPlaying
      ? {
        id: room.nowPlaying.id,
        videoId: room.nowPlaying.videoId,
        title: room.nowPlaying.title,
        requestedBy: room.nowPlaying.requestedBy,
        singers: room.nowPlaying.singers,
      }
      : null,
    queue: room.queue.map(item => ({
      id: item.id,
      videoId: item.videoId,
      title: item.title,
      requestedBy: item.requestedBy,
      requesterId: item.requesterId,
      singers: item.singers,
    })),
    ranking: rankingForFrontend,
    duetRanking: duetRankingArray,
    showingScore: room.showingScore,
    ownerId: room.ownerId,
    lastEnqueueAt: room.lastEnqueueAt,
  };
}

function broadcast(roomCode: string, msg: object) {
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

interface ParticipantInfo {
  id: string;
  name: string;
}

function getParticipantsList(roomCode: string): ParticipantInfo[] {
  const conns = connections.get(roomCode);
  if (!conns) return [];

  const participantsMap = new Map<string, string>(); // id -> name
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  // Add online participants
  for (const info of conns.participants.values()) {
    if (info && info.id) {
      participantsMap.set(info.id, info.name);
    }
  }

  // Add recently offline participants (< 1 hour)
  for (const [odUserId, info] of conns.recentParticipants) {
    if (now - info.lastSeen < ONE_HOUR) {
      if (!participantsMap.has(odUserId)) {
        participantsMap.set(odUserId, info.name);
      }
    } else {
      conns.recentParticipants.delete(odUserId);
    }
  }

  return Array.from(participantsMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));
}

function getParticipantsNamesList(roomCode: string): string[] {
  return getParticipantsList(roomCode).map(p => p.name);
}

// Generate unique nickname for a user in a room
// If "André" exists, returns "André2", "André3", etc.
function getUniqueNickname(
  roomCode: string,
  desiredName: string,
  odUserId: string
): string {
  const participants = getParticipantsList(roomCode);
  const trimmedName = desiredName.trim();

  // Check if this exact name is already used by someone else
  const nameExists = participants.some(
    p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== odUserId
  );

  if (!nameExists) {
    return trimmedName;
  }

  // Find unique suffix
  let suffix = 2;
  while (suffix < 100) {
    const candidateName = `${trimmedName}${suffix}`;
    const candidateExists = participants.some(
      p =>
        p.name.toLowerCase() === candidateName.toLowerCase() &&
        p.id !== odUserId
    );
    if (!candidateExists) {
      return candidateName;
    }
    suffix++;
  }

  // Fallback (very unlikely)
  return `${trimmedName}_${randomId().slice(0, 4)}`;
}

// Helper: Get or restore room from DB
async function getOrRestoreRoom(roomCode: string): Promise<RoomState | null> {
  const code = roomCode.toUpperCase();
  let room = rooms.get(code);

  if (!room) {
    // Check database
    const dbRoom = await prisma.room.findUnique({
      where: { code },
    });

    if (!dbRoom) return null;

    // Restore room in memory
    room = {
      code: dbRoom.code,
      createdAt: dbRoom.createdAt.getTime(),
      lastActivityAt: Date.now(),
      nowPlaying: null,
      queue: [],
      ranking: {},
      duetRanking: {},
      ownerId: dbRoom.ownerId,
      lastEnqueueAt: {},
      lastEnqueueAtByDevice: {},
      lastFinalizeMs: 0,
      showingScore: false,
    };
    addRoom(code, room);
    connections.set(code, {
      tv: new Set(),
      mobile: new Set(),
      participants: new Map(),
      recentParticipants: new Map(),
    });
  }

  return room;
}

function broadcastParticipants(roomCode: string) {
  const participants = getParticipantsList(roomCode);
  broadcast(roomCode, {
    type: "PARTICIPANTS",
    participants,
  });
}

// ─────────────────────────────────────────────────────────────────
// Fastify App
// ─────────────────────────────────────────────────────────────

const app = Fastify({ logger: { level: "warn" } });

await app.register(cors, { origin: true });
await app.register(websocket);

// Register auth routes
await app.register(authRoutes);

// Register room routes (new DB-backed routes)
await app.register(roomRoutes);

// Setup callback for when room is created via DB
setRoomCallbacks({
  onRoomCreated: (roomCode: string, ownerId: string) => {
    // Create in-memory state for the room
    if (!rooms.has(roomCode)) {
      addRoom(roomCode, {
        code: roomCode,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        nowPlaying: null,
        queue: [],
        ranking: {},
        duetRanking: {},
        ownerId: ownerId,
        lastEnqueueAt: {},
        lastEnqueueAtByDevice: {},
        lastFinalizeMs: 0,
        showingScore: false,
      });
      connections.set(roomCode, {
        tv: new Set(),
        mobile: new Set(),
        participants: new Map(),
        recentParticipants: new Map(),
      });
    }
  },
});

// Health
app.get("/health", async () => ({ status: "ok" }));

// Get state (with auto-restore from DB if room exists in DB but not in memory)
app.get<{ Params: { roomCode: string } }>(
  "/api/rooms/:roomCode/state",
  async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });
    return getRoomState(room);
  }
);

// Get participants in room (for duet selection)
// Returns online users + recently offline (< 1 hour)
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

// Enqueue
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

  // 3-minute cooldown for non-hosts
  const isHost = odUserId === room.ownerId;
  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  if (!isHost) {
    // Check by userId
    const lastByUser = room.lastEnqueueAt[odUserId] || 0;
    if (now - lastByUser < THREE_MINUTES) {
      const remaining = Math.ceil((THREE_MINUTES - (now - lastByUser)) / 1000);
      return reply.code(429).send({
        error: "cooldown",
        remainingSeconds: remaining,
        message: `Aguarde ${remaining} segundos para adicionar outra música.`,
      });
    }

    // Check by device fingerprint (blocks same device / different userId bypass)
    if (deviceFingerprint) {
      // We hash only the stable deviceId part (before "::" which is the browser fingerprint)
      const deviceKey = deviceFingerprint.slice(0, 40); // first ~40 chars is the stable deviceId
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

  // Build singers array with IDs
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
  };
  room.queue.push(item);
  room.lastEnqueueAt[odUserId] = now;
  // Also record device fingerprint timestamp to enforce cooldown across accounts
  if (deviceFingerprint) {
    const deviceKey = deviceFingerprint.slice(0, 40);
    room.lastEnqueueAtByDevice[deviceKey] = now;
  }

  // Auto-save to database library (upsert - creates if not exists)
  addSongToLibrary(videoId, title, requestedBy).catch(() => {
    // Silent fail - song still plays even if library save fails
  });

  broadcast(room.code, { type: "STATE", state: getRoomState(room) });

  return { ok: true, itemId: item.id };
});

// Next song
app.post<{ Params: { roomCode: string }; Body: { userId?: string } }>(
  "/api/rooms/:roomCode/next",
  async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const { userId } = req.body;
    const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;

    // Allow if: userId is owner, OR a valid tvToken for this room is provided
    const isOwner = userId === room.ownerId;
    let isTvToken = false;
    if (!isOwner && tvTokenHeader) {
      const decoded = verifyToken(tvTokenHeader);
      isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
    }

    if (!isOwner && !isTvToken) {
      return reply.code(403).send({ error: "forbidden" });
    }
    touchRoom(req.params.roomCode);

    room.nowPlaying = room.queue.shift() || null;
    broadcast(room.code, { type: "STATE", state: getRoomState(room) });

    // Auto-play after a delay to give TV time to create the player
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
            } catch {
              // ignore
            }
          }
        }
      }, 800);
    }

    return { ok: true };
  }
);

// Queue management (host/requester controls)
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

  // Permissions: Host OR Requester OR TV
  const isHost = userId === room.ownerId;
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

  // If requester removed their own song, clear cooldown
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
  if (direction !== "up" && direction !== "down") {
    return reply.code(400).send({ error: "invalid_direction" });
  }

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

// Finalize (party-friendly, minimal cooldown)
app.post<{ Params: { roomCode: string }; Body: { requester?: string; userId?: string } }>(
  "/api/rooms/:roomCode/finalize",
  async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });
    touchRoom(req.params.roomCode);

    const userId = (req.body.userId || "").trim();
    const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;

    // Allow if: userId is owner, OR a valid tvToken for this room is provided
    const isOwner = userId === room.ownerId;
    let isTvToken = false;
    if (!isOwner && tvTokenHeader) {
      const decoded = verifyToken(tvTokenHeader);
      isTvToken = !!(decoded && decoded.type === "tv" && decoded.roomCode === room.code);
    }

    if (!isOwner && !isTvToken) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const requester = (req.body.requester || "").trim() || "Convidado";
    const now = Date.now();

    // 10s cooldown (party spam protection)
    if (now - room.lastFinalizeMs < 10_000) {
      return reply.code(429).send({ error: "cooldown", cooldownMs: 10_000 });
    }
    room.lastFinalizeMs = now;

    if (!room.nowPlaying) {
      return reply.code(400).send({ error: "nothing_playing" });
    }

    // Get all singers (supports duets) - now with IDs
    const singers: Singer[] = room.nowPlaying.singers || [
      { id: `anon_${randomId()}`, name: room.nowPlaying.requestedBy },
    ];
    const score = biasedPartyScore();

    // Give points to ALL singers (individual ranking)
    for (const singer of singers) {
      const existingEntry = room.ranking[singer.id];
      if (!existingEntry || typeof existingEntry === "number") {
        room.ranking[singer.id] = { name: singer.name, score: 0 };
      }
      (room.ranking[singer.id] as RankingEntry).score += score;
      // Update name in case it changed
      (room.ranking[singer.id] as RankingEntry).name = singer.name;
    }

    // If it's a duet, update duet ranking
    if (singers.length === 2) {
      // Initialize duetRanking if it doesn't exist (old room)
      if (!room.duetRanking) {
        room.duetRanking = {};
      }
      const duetKey = makeDuetKey(singers[0].id, singers[1].id);
      if (!room.duetRanking[duetKey]) {
        // Sort singers by ID to keep ID-name correspondence consistent
        const sortedSingers = [...singers].sort((a, b) =>
          a.id.localeCompare(b.id)
        );
        room.duetRanking[duetKey] = {
          singerIds: [sortedSingers[0].id, sortedSingers[1].id] as [
            string,
            string
          ],
          names: [sortedSingers[0].name, sortedSingers[1].name] as [
            string,
            string
          ],
          score: 0,
          count: 0,
        };
      } else {
        // Update names based on singerIds order (preserves ID-name correspondence)
        const entry = room.duetRanking[duetKey];
        for (let i = 0; i < entry.singerIds.length; i++) {
          const singer = singers.find(s => s.id === entry.singerIds[i]);
          if (singer) {
            entry.names[i] = singer.name;
          }
        }
      }
      room.duetRanking[duetKey].score += score;
      room.duetRanking[duetKey].count += 1;
    }

    // Format singer names for display (e.g., "Dede e Ana")
    const singerNames = singers.map(s => s.name);
    const singerDisplay =
      singerNames.length > 1
        ? singerNames.slice(0, -1).join(", ") +
        " e " +
        singerNames[singerNames.length - 1]
        : singerNames[0];

    // Set showingScore flag - TV will clear it when done
    room.showingScore = true;

    broadcast(room.code, {
      type: "FINALIZED",
      by: requester,
      singer: singerDisplay,
      singers: singerNames, // Array of singer names for display
      score,
      videoId: room.nowPlaying.videoId,
      title: room.nowPlaying.title,
    });

    // Increment play count in database
    const finalizedVideoId = room.nowPlaying.videoId;
    incrementPlayCount(finalizedVideoId).catch(() => {
      // Silent fail - finalize still works even if count fails
    });

    // NÃO auto-avança para próxima - espera alguém apertar "Começar"
    room.nowPlaying = null;
    broadcast(room.code, { type: "STATE", state: getRoomState(room) });

    return { ok: true, score };
  }
);

// Update user name (when user changes their display name)
app.post<{
  Params: { roomCode: string };
  Body: { userId: string; newName: string };
}>("/api/rooms/:roomCode/update-name", async (req, reply) => {
  const room = await getOrRestoreRoom(req.params.roomCode);
  if (!room) return reply.code(404).send({ error: "room_not_found" });

  const { userId, newName } = req.body;
  if (!userId || !newName) {
    return reply.code(400).send({ error: "missing_userId_or_newName" });
  }

  const trimmedName = newName.trim();
  if (!trimmedName) {
    return reply.code(400).send({ error: "empty_name" });
  }

  // Check for duplicate name in room
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

  // Update in ranking
  if (room.ranking[userId] && typeof room.ranking[userId] !== "number") {
    (room.ranking[userId] as RankingEntry).name = trimmedName;
  }

  // Update in duet ranking
  if (room.duetRanking) {
    for (const entry of Object.values(room.duetRanking)) {
      const idx = entry.singerIds.indexOf(userId);
      if (idx !== -1) {
        entry.names[idx] = trimmedName;
      }
    }
  }

  // Update in queue
  for (const item of room.queue) {
    for (const singer of item.singers) {
      if (singer.id === userId) {
        singer.name = trimmedName;
      }
    }
    // Also update requestedBy if it matches
    if (item.singers.some(s => s.id === userId)) {
      item.requestedBy = item.singers.map(s => s.name).join(" e ");
    }
  }

  // Update in nowPlaying
  if (room.nowPlaying) {
    for (const singer of room.nowPlaying.singers) {
      if (singer.id === userId) {
        singer.name = trimmedName;
      }
    }
    if (room.nowPlaying.singers.some(s => s.id === userId)) {
      room.nowPlaying.requestedBy = room.nowPlaying.singers
        .map(s => s.name)
        .join(" e ");
    }
  }

  // Update in participants map
  const conns = connections.get(req.params.roomCode);
  if (conns) {
    for (const [socket, info] of conns.participants) {
      if (info.id === userId) {
        conns.participants.set(socket, { id: userId, name: trimmedName });
      }
    }
    // Update in recentParticipants
    if (conns.recentParticipants.has(userId)) {
      const existing = conns.recentParticipants.get(userId)!;
      conns.recentParticipants.set(userId, { ...existing, name: trimmedName });
    }
    // Broadcast updated participants
    broadcastParticipants(req.params.roomCode);
  }

  // Broadcast updated state
  broadcast(room.code, { type: "STATE", state: getRoomState(room) });

  return { ok: true };
});

// Clear showingScore flag (called by TV when score overlay closes)
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

// Remote play control (mobile -> TV)
app.post<{ Params: { roomCode: string }; Body: { action: string; userId?: string } }>(
  "/api/rooms/:roomCode/player",
  async (req, reply) => {
    const room = await getOrRestoreRoom(req.params.roomCode);
    if (!room) return reply.code(404).send({ error: "room_not_found" });

    const { userId } = req.body;
    if (userId !== room.ownerId) {
      return reply.code(403).send({ error: "forbidden" });
    }
    touchRoom(req.params.roomCode);

    const action = req.body.action; // 'play' | 'pause'
    if (!["play", "pause"].includes(action)) {
      return reply.code(400).send({ error: "invalid_action" });
    }

    // Broadcast to TV clients only
    const conns = connections.get(room.code);
    if (conns) {
      const payload = JSON.stringify({ type: "PLAYER_COMMAND", action });
      for (const ws of conns.tv) {
        try {
          if (ws.readyState === 1) ws.send(payload);
        } catch {
          // ignore
        }
      }
    }

    return { ok: true, action };
  }
);

// ─────────────────────────────────────────────────────────────
// YouTube Search API (using yt-dlp like PiKaraoke)
// ─────────────────────────────────────────────────────────────

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  isEmbeddable?: boolean;
}

// Check if a YouTube video can be embedded using the free oEmbed API.
// Returns true if embeddable, false otherwise. Never throws.
async function checkEmbeddable(videoId: string): Promise<boolean> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    return res.ok; // 200 = embeddable, 401/403 = disabled
  } catch {
    return true; // assume embeddable on network error to avoid hiding results
  }
}

// Search YouTube using yt-dlp (same method as PiKaraoke).
// Fetches extra results so we can filter/sort by embeddability via oEmbed.
async function searchWithYtDlp(
  query: string,
  cacheKey: string
): Promise<YouTubeSearchResult[]> {
  const numResults = 15; // Fetch more to have room to filter
  const safeQuery = query.replace(/[`$\\]/g, "\\$&").replace(/"/g, '\\"');
  const cmd = `yt-dlp -j --no-playlist --flat-playlist "ytsearch${numResults}:${safeQuery}"`;

  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000 });

    const raw: YouTubeSearchResult[] = [];
    for (const line of stdout.split("\n")) {
      if (line.trim().length < 2) continue;
      try {
        const j = JSON.parse(line);
        if (!j.id) continue;
        raw.push({
          videoId: j.id,
          title: j.title || "(sem título)",
          thumbnail: `https://i.ytimg.com/vi/${j.id}/mqdefault.jpg`,
          channelTitle: j.channel || j.uploader || "",
        });
      } catch {
        // skip invalid JSON lines
      }
    }

    // Check embeddability for all results in parallel
    const embeddableFlags = await Promise.all(raw.map(r => checkEmbeddable(r.videoId)));

    const results: YouTubeSearchResult[] = raw.map((r, i) => ({
      ...r,
      isEmbeddable: embeddableFlags[i],
    }));

    // Sort: embeddable first, non-embeddable last. Keep original relative order within each group.
    results.sort((a, b) => {
      if (a.isEmbeddable === b.isEmbeddable) return 0;
      return a.isEmbeddable ? -1 : 1;
    });

    // Return top 12 results
    const final = results.slice(0, 12);

    // Store in cache before returning
    searchCache.set(cacheKey, { results: final, expiresAt: Date.now() + CACHE_TTL_MS });
    saveSearchCache().catch(() => {});
    return final;
  } catch (err) {
    console.error("[yt-dlp search error]", err);
    return [];
  } finally {
    // Remove in-flight entry regardless of success/failure
    inFlightSearches.delete(cacheKey);
  }
}

// Search YouTube (with cache + in-flight deduplication)
app.get<{ Querystring: { q: string } }>(
  "/api/youtube/search",
  async (req, reply) => {
    const query = (req.query.q || "").trim();
    if (!query) return reply.code(400).send({ error: "missing_query" });

    const searchTerm = query + " karaoke";
    const cacheKey = searchTerm.toLowerCase();

    // 1) Cache hit → return immediately with cache headers
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[search] CACHE HIT: "${query}"`);
      const remainingTtl = Math.floor((cached.expiresAt - Date.now()) / 1000);
      reply.header("Cache-Control", `public, max-age=${remainingTtl}, stale-while-revalidate=60`);
      return cached.results;
    }

    // 2) Deduplicate in-flight requests for the same query
    const existing = inFlightSearches.get(cacheKey);
    if (existing) {
      console.log(`[search] IN-FLIGHT HIT: "${query}"`);
      try {
        const results = await existing;
        reply.header("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`);
        return results;
      } catch {
        return reply.code(500).send({ error: "search_failed" });
      }
    }

    // 3) New search — spawn yt-dlp and register as in-flight
    console.log(`[search] NEW SEARCH: "${query}"`);
    const promise = searchWithYtDlp(searchTerm, cacheKey);
    inFlightSearches.set(cacheKey, promise);

    try {
      const results = await promise;
      reply.header("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`);
      return results;
    } catch {
      return reply.code(500).send({ error: "search_failed" });
    }
  }
);

// In-memory cache for video info (videoId → info), TTL 1h
const videoInfoCache = new Map<string, { data: YouTubeSearchResult; expiresAt: number }>();

// Get video info from YouTube (for when user pastes a link)
app.get<{ Querystring: { videoId: string } }>(
  "/api/youtube/info",
  async (req, reply) => {
    const videoId = (req.query.videoId || "").trim();
    if (!videoId) return reply.code(400).send({ error: "missing_videoId" });

    // Check cache first
    const cachedInfo = videoInfoCache.get(videoId);
    if (cachedInfo && Date.now() < cachedInfo.expiresAt) {
      reply.header("Cache-Control", "public, max-age=3600");
      return cachedInfo.data;
    }

    try {
      // Use yt-dlp to get video title
      const cmd = `yt-dlp -j --no-playlist "https://www.youtube.com/watch?v=${videoId}"`;

      const { stdout } = await execAsync(cmd, { timeout: 12000 });
      const info = JSON.parse(stdout);

      const result = {
        videoId,
        title: info.title || "",
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        channelTitle: info.channel || info.uploader || "",
      };

      // Cache for 1 hour
      videoInfoCache.set(videoId, { data: result, expiresAt: Date.now() + 60 * 60 * 1000 });
      reply.header("Cache-Control", "public, max-age=3600");
      return result;
    } catch {
      // Return basic info even if yt-dlp fails (not cached)
      return {
        videoId,
        title: "",
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        channelTitle: "",
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Song Library API (global, shared by all users) - uses database
// ─────────────────────────────────────────────────────────────

// List all songs in library
app.get("/api/songs", async () => {
  const songs = await getSongLibraryFromDb();
  // Map to expected format
  return songs.map(s => ({
    id: s.id,
    videoId: s.videoId,
    title: s.title,
    addedBy: s.addedBy,
    savedAt: s.createdAt.getTime(),
    playCount: s.playCount,
  }));
});

// Save a song to library
app.post<{
  Body: { videoId: string; title?: string; addedBy?: string };
}>("/api/songs", async (req, reply) => {
  const videoId = (req.body.videoId || "").trim();
  const title = (req.body.title || "").trim() || "(sem título)";
  const addedBy = (req.body.addedBy || "").trim() || "Anônimo";

  if (!videoId) return reply.code(400).send({ error: "missing_videoId" });

  const song = await addSongToLibrary(videoId, title, addedBy);
  return { ok: true, song };
});

// Delete a song from library (by videoId now, not id)
app.delete<{ Params: { songId: string } }>(
  "/api/songs/:songId",
  async (req, reply) => {
    const songId = req.params.songId;

    // Try to find by id first, then by videoId
    const deleted = await removeSongFromLibrary(songId);
    if (!deleted) return reply.code(404).send({ error: "not_found" });

    return { ok: true };
  }
);

// ─────────────────────────────────────────────────────────────
// Analytics Endpoints (simplified)
// ─────────────────────────────────────────────────────────────

// Top songs (from database)
app.get<{ Querystring: { limit?: string; key?: string } }>(
  "/api/analytics/top-songs",
  async req => {
    const limit = parseInt(req.query.limit || "20", 10);
    const songs = await getTopSongsFromDb(limit);
    return {
      topSongs: songs.map(s => ({
        videoId: s.videoId,
        title: s.title,
        playCount: s.playCount,
      })),
    };
  }
);

// Active rooms (admin only)
app.get<{ Querystring: { key?: string } }>(
  "/api/analytics/active-rooms",
  async (req, reply) => {
    const key = req.query.key;
    if (!key || key !== process.env.ADMIN_KEY) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const activeRooms = Array.from(rooms.entries()).map(([code, room]) => {
      const conns = connections.get(code);
      return {
        code,
        createdAt: room.createdAt,
        queueLength: room.queue.length,
        nowPlaying: room.nowPlaying?.title || null,
        participantsCount: conns?.participants.size || 0,
      };
    });

    return { activeRooms };
  }
);

// WebSocket
app.get<{ Params: { roomCode: string } }>(
  "/ws/:roomCode",
  { websocket: true },
  (socket, req) => {
    const roomCode = req.params.roomCode;
    const room = rooms.get(roomCode);
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
          const conns = connections.get(roomCode)!;
          touchRoom(roomCode); // Marca atividade na sala

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

              // Use the name from HELLO message (current nickname) if provided,
              // otherwise fall back to name from token (original registered name)
              const requestedName = msg.name || payload.name;

              // Get unique nickname (auto-number if duplicate)
              name = getUniqueNickname(roomCode, requestedName, odUserId);

              conns.mobile.add(socket);
              conns.participants.set(socket, { id: odUserId, name });
              conns.recentParticipants.delete(odUserId);

              // Send the assigned nickname back to the user
              // wasModified is true only if server changed the requested name
              socket.send(
                JSON.stringify({
                  type: "NICKNAME_ASSIGNED",
                  nickname: name,
                  originalName: requestedName,
                  wasModified: name !== requestedName,
                })
              );

              broadcastParticipants(roomCode);

              // Record room visit (async, don't wait)
              recordRoomVisit(roomCode, odUserId).catch(() => { });
            }
          } else {
            // Legacy flow: no token (for users without accounts yet)
            role = msg.role === "tv" ? "tv" : "mobile";
            name = msg.name || "";
            odUserId = msg.userId || `anon_${randomId()}`;

            if (role === "mobile" && name) {
              // Get unique nickname (auto-number if duplicate)
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
          // Broadcast reaction to everyone in the room
          touchRoom(roomCode);
          broadcast(roomCode, {
            type: "REACTION",
            reaction: msg.reaction,
            name: msg.name || name || "Convidado",
            userId: odUserId
          });
        } else {
          socket.send(JSON.stringify({ type: "ACK" }));
        }
      } catch {
        // ignore
      }
    });

    socket.on("close", () => {
      const conns = connections.get(roomCode);
      if (conns) {
        // Get info before removing from participants
        const participantInfo = conns.participants.get(socket);

        conns.tv.delete(socket);
        conns.mobile.delete(socket);
        conns.participants.delete(socket);

        // Add to recentParticipants with current timestamp (for offline < 1h feature)
        if (participantInfo) {
          conns.recentParticipants.set(participantInfo.id, {
            name: participantInfo.name,
            lastSeen: Date.now(),
          });
          // Broadcast updated participants list
          broadcastParticipants(roomCode);
        }
      }
    });
  }
);

// Start
const PORT = parseInt(process.env.PORT || "8787", 10);
app.listen({ port: PORT, host: "0.0.0.0" }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🎤 KaraokeFactory backend running on http://localhost:${PORT}`);
});
