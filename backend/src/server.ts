import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import authRoutes, { getUserFromRequest } from "./routes/auth.js";
import roomRoutes, {
  setRoomCallbacks,
  recordRoomVisit,
} from "./routes/rooms.js";
import adminRoutes from "./routes/admin.js";
import { Innertube, UniversalCache } from 'youtubei.js';
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

// Initialize Innertube client
let youtube: Innertube;
async function initYoutube() {
  try {
    youtube = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true });
    console.log("📺 Native YouTube client (youtubei.js) initialized.");
  } catch (err) {
    console.error("❌ Failed to initialize youtubei.js", err);
  }
}
initYoutube();

// ─────────────────────────────────────────────────────────────
// YouTube Search Cache
// Prevents spawning duplicate yt-dlp processes for the same query.
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours persistent cache

// In-flight deduplication: same query that's still in progress shares one Promise
const inFlightSearches = new Map<string, Promise<YouTubeSearchResult[]>>();

// ─────────────────────────────────────────────────────────────
// Concurrency Limiter: Now much higher as youtubei.js is efficient
// ─────────────────────────────────────────────────────────────
const YT_DLP_MAX_CONCURRENT = 10;
let ytDlpActiveCount = 0;
const ytDlpQueue: Array<{
  resolve: () => void;
  userId?: string;
  roomCode?: string;
}> = [];

async function acquireYtDlpSlot(userId?: string, roomCode?: string): Promise<void> {
  if (ytDlpActiveCount < YT_DLP_MAX_CONCURRENT) {
    ytDlpActiveCount++;
    return;
  }
  return new Promise<void>((resolve) => {
    ytDlpQueue.push({ resolve, userId, roomCode });
    // Notify immediate position after joining queue
    if (userId && roomCode) {
      sendSearchQueueUpdate(roomCode, userId, ytDlpQueue.length);
    }
  });
}

function releaseYtDlpSlot(): void {
  if (ytDlpQueue.length > 0) {
    const next = ytDlpQueue.shift()!;
    next.resolve();
    // Update everyone still in the queue
    notifyQueuePositions();
  } else {
    ytDlpActiveCount--;
  }
}

function notifyQueuePositions() {
  ytDlpQueue.forEach((item, index) => {
    if (item.userId && item.roomCode) {
      sendSearchQueueUpdate(item.roomCode, item.userId, index + 1);
    }
  });
}

function sendSearchQueueUpdate(roomCode: string, userId: string, position: number) {
  const conns = connections.get(roomCode);
  if (!conns) return;

  const payload = JSON.stringify({
    type: "SEARCH_QUEUE_POSITION",
    position,
    total: ytDlpQueue.length
  });

  for (const [socket, info] of conns.participants.entries()) {
    if (info.id === userId && socket.readyState === 1) {
      socket.send(payload);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Per-IP Search Rate Limiter: max 10 searches per minute
// ─────────────────────────────────────────────────────────────
const SEARCH_RATE_LIMIT = 10;
const SEARCH_RATE_WINDOW_MS = 60_000;
const searchRateMap = new Map<string, { count: number; resetAt: number }>();

function isSearchRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = searchRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + SEARCH_RATE_WINDOW_MS };
    searchRateMap.set(ip, entry);
    return false;
  }
  entry.count++;
  return entry.count > SEARCH_RATE_LIMIT;
}

// Housekeeping: clean expired rate limits and DB search cache
setInterval(async () => {
  const now = Date.now();
  // Clean rate limit map
  for (const [ip, entry] of searchRateMap.entries()) {
    if (now > entry.resetAt) searchRateMap.delete(ip);
  }
  // Clean DB search cache (expired entries)
  try {
    const deleted = await prisma.searchCache.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (deleted.count > 0) console.log(`[housekeeping] Removed ${deleted.count} expired search cache entries from DB.`);
  } catch (err) {
    console.error("[housekeeping] DB Error", err);
  }
}, 30 * 60 * 1000).unref();

// ─────────────────────────────────────────────────────────────
// Pre-warm Cache Hits (Popular Songs)
// ─────────────────────────────────────────────────────────────
const KARAOKE_HITS = [
  // Brazilian Sertanejo / Arrocha
  "Evidências Chitãozinho e Xororó", "Boate Azul", "Sandra Rosa Madalena", "Borbulhas de Amor", 
  "Infiel Marília Mendonça", "Cerveja de Garrafa", "Regime Fechado", "Chora, Me Liga", "Amo Noite e Dia",
  "Dormi na Praça", "Nuvem de Lágrimas", "Fio de Cabelo", "Pense em Mim", "Galopeira", "Meu Ex-Amor Amado Batista",
  "Telefone Mudo", "Ainda Ontem Chorei de Saudade", "Um Sonhador Leandro e Leonardo", "Não Aprendi a Dizer Adeus",
  "Decida", "Fuscão Preto", "Convite de Casamento", "Notificação Preferida Zé Neto", "Largado as Traças",
  "Romance com Safadeza", "Camarote Wesley Safadão", "Apelido Carinhoso Gusttavo Lima", "Homem de Família Gusttavo Lima",

  // Brazilian Pop / Rock / MPB
  "Anna Julia Los Hermanos", "Pelados em Santos", "Primeiros Erros", "Garçon Reginaldo Rossi",
  "O Sol Jota Quest", "A Lenda Sandy e Junior", "Sutilmente Skank", "Amor e Sexo Rita Lee",
  "Acelerou Banda Eva", "Tempo Perdido Legião Urbana", "Faroeste Caboclo", "Pais e Filhos", "Exagerado Cazuza",
  "Menina Veneno", "Cheia de Manias", "Sozinho Caetano Veloso", "Lanterna dos Afogados", "Epitáfio Titãs",
  "Pro Dia Nascer Feliz", "Como Nossos Pais", "Malandragem Cássia Eller", "Por Você Barão Vermelho",
  "Me Chama Lobão", "Vou Deixar Skank", "Garota de Ipanema", "Aquele Abraço", "Oceano Djavan",
  "Se Eu Não Te Amasse Tanto Assim", "Fogo e Paixão Wando", "Alma Gêmea Fabio Jr", "Pai Fabio Jr",
  
  // Pagode e Axé
  "Cheia de Manias Raça Negra", "É Tarde Demais Raça Negra", "Deus Me Livre Raça Negra",
  "Me Apaixonei Pela Pessoa Errada", "Cilada Molejo", "Dança da Vassoura", "Pimpolho",
  "Eva Banda Eva", "Araketu é Bom Demais", "O Canto da Cidade", "Milla Netinho",

  // International Rock / Pop / Classics
  "Tears in Heaven", "Let It Go", "My Heart Will Go On", "Shallow",
  "Bohemian Rhapsody", "Thriller", "Imagine", "Don't Stop Believin'",
  "Sweet Child O' Mine", "Hotel California", "Smells Like Teen Spirit",
  "Billie Jean", "Like a Prayer", "Rolling in the Deep", "Uptown Funk",
  "Despacito", "Shape of You", "Perfect", "Someone Like You",
  "Hello", "Counting Stars", "Radioactive", "Thinking Out Loud",
  "I Want It That Way", "Wonderwall", "Take On Me", "Livin' on a Prayer",
  "I Will Always Love You", "Careless Whisper", "Dancing Queen",
  "Hey Jude", "Let It Be", "Yesterday", "Hallelujah", "Total Eclipse of the Heart",
  "Girls Just Want to Have Fun", "Zombie Cranberries", "Creep Radiohead", "Losing My Religion",
  "Every Breath You Take", "Africa Toto", "Wannabe Spice Girls", "Toxic Britney Spears",
  "Bad Romance Lady Gaga", "Blank Space Taylor Swift", "Watermelon Sugar", "Blinding Lights",
  "Believer Imagine Dragons", "As It Was Harry Styles"
];

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
  duration?: number; // seconds (for "time until your turn" estimate)
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
  history: QueueItem[]; // recently played songs (for encore)
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
      duration: item.duration,
    })),
    history: room.history,
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
      history: [],
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

const app = Fastify({ logger: { level: "warn" }, trustProxy: true });

await app.register(cors, {
  origin: [
    /^https:\/\/karaokefactory\.org$/,
    /^https:\/\/[a-z0-9-]+\.netlify\.app$/, // Netlify deploy previews
    /^http:\/\/localhost:\d+$/,
    /^https?:\/\/\d{1,3}(\.\d{1,3}){3}:\d+$/, // LAN dev (e.g. 192.168.x.x)
  ],
});

// Global rate limit per IP (auth routes apply stricter limits below)
await app.register(rateLimit, {
  max: 300,
  timeWindow: "1 minute",
});
await app.register(websocket);

// Register auth routes
await app.register(authRoutes);

// Register room routes (new DB-backed routes)
await app.register(roomRoutes);

// Register admin routes
await app.register(adminRoutes);

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
        history: [],
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

  // 3-minute cooldown for non-hosts
  const authUser = await getUserFromRequest(req);
  const isHost = !!authUser && authUser.userId === room.ownerId;
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
    duration: typeof req.body.duration === "number" && req.body.duration > 0 ? req.body.duration : undefined,
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

    const tvTokenHeader = req.headers["x-tv-token"] as string | undefined;

    // Allow if: authenticated owner, OR a valid tvToken for this room is provided
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

    // Move the finished song into history before starting the next one
    if (room.nowPlaying) {
      room.history.unshift(room.nowPlaying);
      room.history = room.history.slice(0, 15); // keep last 15 played
    }

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

  // Permissions: Authenticated Host OR Requester OR TV
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

    // Allow if: authenticated owner, OR a valid tvToken for this room is provided
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

    const authUser = await getUserFromRequest(req);
    if (!authUser || authUser.userId !== room.ownerId) {
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
  channelId?: string;
  isEmbeddable?: boolean;
  duration?: number; // seconds
}

// Convert "3:45" or "1:02:33" text (youtubei.js) into seconds.
function parseDurationText(value: unknown): number | undefined {
  if (typeof value === "number" && value > 0) return value;
  const obj = value as any;
  if (obj && typeof obj.seconds === "number" && obj.seconds > 0) return obj.seconds;
  const text = obj?.text ?? (typeof value === "string" ? value : "");
  if (typeof text !== "string") return undefined;
  const parts = text.split(":").map(Number);
  if (parts.some(isNaN) || parts.length === 0 || parts.length > 3) return undefined;
  const [a, b, c] = parts.length === 3 ? [parts[0], parts[1], parts[2]] : [0, parts[0], parts[1]];
  return a * 3600 + b * 60 + c;
}

// Check if a YouTube video can be embedded using the free oEmbed API.
// Returns true if embeddable, false otherwise. Never throws.
async function checkEmbeddable(videoId: string): Promise<boolean> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      console.log(`[embed-check] Video ${videoId} BLOCKED (Status ${res.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[embed-check] Network error for ${videoId}, assuming embeddable`, err);
    return true; // assume embeddable on network error to avoid hiding results
  }
}

// Search YouTube using youtubei.js (InnerTube API).
async function searchWithInnertube(
  query: string,
  cacheKey: string,
  userId?: string,
  roomCode?: string
): Promise<YouTubeSearchResult[]> {
  // Wait for a slot in the concurrency limiter (just to prevent absolute spam)
  await acquireYtDlpSlot(userId, roomCode);
  console.log(`[youtubei] Slot acquired for "${query}" (${ytDlpActiveCount}/${YT_DLP_MAX_CONCURRENT} active)`);

  try {
    if (!youtube) await initYoutube();
    
    const search = await youtube.search(query, { type: 'video' });
    const results: YouTubeSearchResult[] = [];

    // Filter and map results
    const videos = search.videos.filter(v => v.type === 'Video').slice(0, 20);

    for (const video of videos) {
      if ('id' in video && video.id) {
        results.push({
          videoId: video.id,
          title: (video as any).title?.text || "",
          thumbnail: (video as any).thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
          channelTitle: (video as any).author?.name || "",
          channelId: (video as any).author?.id || "",
          duration: parseDurationText((video as any).duration),
        });
      }
    }

    // Fetch blocked channels
    let blockedChannels: string[] = [];
    try {
      const blockedData = await prisma.blockedChannel.findMany({ select: { channelId: true } });
      blockedChannels = blockedData.map(c => c.channelId);
    } catch (err) {
      console.error("Error fetching blocked channels, bypassing filter:", err);
    }
    const blockedIds = new Set(blockedChannels);

    // Filter blocked and check embeddability
    const filteredResults = results.filter(r => !r.channelId || !blockedIds.has(r.channelId));
    
    // oEmbed check still needed for strict licensing/embed policy verification
    const embeddableFlags = await Promise.all(filteredResults.map(r => checkEmbeddable(r.videoId)));

    const final = filteredResults.map((r, i) => ({
      ...r,
      isEmbeddable: embeddableFlags[i],
    })).filter(r => r.isEmbeddable === true).slice(0, 12);

    // Store in DB cache before returning (ignoring errors)
    try {
      await prisma.searchCache.upsert({
        where: { query: cacheKey },
        update: { 
          results: final as any, 
          expiresAt: new Date(Date.now() + CACHE_TTL_MS) 
        },
        create: {
          query: cacheKey,
          results: final as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS)
        }
      });
    } catch {}

    return final;
  } catch (err) {
    console.error("[youtubei search error]", err);
    // Fallback to yt-dlp if youtubei fails? (optional)
    return [];
  } finally {
    // Release the semaphore slot
    releaseYtDlpSlot();
    // Remove in-flight entry regardless of success/failure
    inFlightSearches.delete(cacheKey);
  }
}

// Search YouTube (with cache + in-flight deduplication)
app.get<{ Querystring: { q: string; userId?: string; roomCode?: string } }>(
  "/api/youtube/search",
  async (req, reply) => {
    const query = (req.query.q || "").trim();
    const userId = req.query.userId;
    const roomCode = req.query.roomCode;
    if (!query) return reply.code(400).send({ error: "missing_query" });

    // Rate limit per IP
    const clientIp = req.ip || "unknown";
    /* if (isSearchRateLimited(clientIp)) {
      console.log(`[search] RATE LIMITED: IP ${clientIp}`);
      return reply.code(429).send({ error: "rate_limited", message: "Too many searches. Try again in a minute." });
    } */

    const searchTerm = query + " karaoke";
    const cacheKey = searchTerm.toLowerCase();

    // 1) DB Cache hit → check persistent storage
    try {
      const cached = await prisma.searchCache.findUnique({ where: { query: cacheKey } });
      if (cached && new Date() < cached.expiresAt) {
        console.log(`[search] DB CACHE HIT: "${query}"`);
        reply.header("Cache-Control", `public, max-age=3600, stale-while-revalidate=600`);
        return (cached.results as any[]).filter(r => r.isEmbeddable === true);
      }
    } catch (err) {
      console.error("[search] DB Cache Error", err);
    }

    // 2) Deduplicate in-flight requests for the same query
    const existing = inFlightSearches.get(cacheKey);
    if (existing) {
      console.log(`[search] IN-FLIGHT HIT: "${query}"`);
      try {
        const results = await existing;
        reply.header("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`);
        return results.filter(r => r.isEmbeddable === true);
      } catch {
        return reply.code(500).send({ error: "search_failed" });
      }
    }

    // 3) New search — use native youtubei and register as in-flight
    console.log(`[search] NEW NATIVE SEARCH: "${query}" (userId: ${userId}, room: ${roomCode})`);
    const promise = searchWithInnertube(searchTerm, cacheKey, userId, roomCode);
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

// In-memory cache for video info (videoId → info), TTL 1h, max 1000 entries
const VIDEO_CACHE_MAX = 1000;
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
      if (!youtube) await initYoutube();
      const info = await youtube.getInfo(videoId);

      const result = {
        videoId,
        title: info.basic_info.title || "",
        thumbnail: info.basic_info.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        channelTitle: info.basic_info.author || "",
        duration: typeof info.basic_info.duration === "number" ? info.basic_info.duration : undefined,
      };

      // Cache for 1 hour
      if (videoInfoCache.size >= VIDEO_CACHE_MAX) {
        const oldest = videoInfoCache.keys().next().value;
        if (oldest) videoInfoCache.delete(oldest);
      }
      videoInfoCache.set(videoId, { data: result, expiresAt: Date.now() + 60 * 60 * 1000 });
      reply.header("Cache-Control", "public, max-age=3600");
      return result;
    } catch {
      // Fallback basic info
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
app.get("/api/songs", async (req) => {
  const query = req.query as { limit?: string; offset?: string };
  const limit = Math.min(parseInt(query.limit || "50", 10) || 50, 200);
  const offset = parseInt(query.offset || "0", 10) || 0;
  const [songs, total] = await Promise.all([
    getSongLibraryFromDb(limit, offset),
    prisma.song.count(),
  ]);
  return {
    songs: songs.map(s => ({
      id: s.id,
      videoId: s.videoId,
      title: s.title,
      addedBy: s.addedBy,
      savedAt: s.createdAt.getTime(),
      playCount: s.playCount,
    })),
    total,
    limit,
    offset,
  };
});

// Save a song to library
app.post<{
  Body: { videoId: string; title?: string; addedBy?: string };
}>("/api/songs", async (req, reply) => {
  const videoId = (req.body.videoId || "").trim();
  const title = (req.body.title || "").trim() || "(sem título)";
  const addedBy = (req.body.addedBy || "").trim() || "Anônimo";

  if (!videoId) return reply.code(400).send({ error: "missing_videoId" });

  // Verify embeddability before saving
  const embeddable = await checkEmbeddable(videoId);
  if (!embeddable) {
    return reply.code(400).send({ error: "not_embeddable", message: "This video cannot be played in the app." });
  }

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

// Blocked Channels routes moved to routes/admin.ts

// ─────────────────────────────────────────────────────────────
// Admin Pre-warm Endpoint
// ─────────────────────────────────────────────────────────────
app.post("/api/admin/prewarm", async (req, reply) => {
  // Simple check for admin token (JWT)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "missing_token" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded || !("isAdmin" in decoded) || !decoded.isAdmin) {
    return reply.status(403).send({ error: "forbidden_admin_only" });
  }

  const { quantity } = req.body as { quantity?: number };
  const requestedQty = quantity && quantity > 0 ? quantity : 50;

  // 1. Identify which hits are missing from cache — batch query
  const cacheKeys = KARAOKE_HITS.map(h => (h + " karaoke").toLowerCase());
  const existingCache = await prisma.searchCache.findMany({
    where: { query: { in: cacheKeys }, expiresAt: { gt: new Date() } },
    select: { query: true },
  });
  const cachedQueries = new Set(existingCache.map(c => c.query));
  const missingHits = KARAOKE_HITS.filter(h => !cachedQueries.has((h + " karaoke").toLowerCase()));
  const skippedSongs = KARAOKE_HITS.filter(h => cachedQueries.has((h + " karaoke").toLowerCase()));

  // 2. Fisher-Yates shuffle on the needed amount of missing songs
  const shuffledMissing = [...missingHits];
  for (let i = shuffledMissing.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledMissing[i], shuffledMissing[j]] = [shuffledMissing[j], shuffledMissing[i]];
  }
  const songsToProcess = shuffledMissing.slice(0, requestedQty);

  if (songsToProcess.length === 0) {
    return { 
      success: true, 
      count: 0,
      addedSongs: [],
      skippedSongs,
      totalAvailable: KARAOKE_HITS.length,
      message: `O cache já possui as ${KARAOKE_HITS.length} músicas configuradas! Nenhuma nova foi adicionada.`
    };
  }

  console.log(`[prewarm] STARTING AUTO-WARM for ${songsToProcess.length} queries...`);
  
  let count = 0;
  const addedSongs: string[] = [];
  
  // 3. Search and cache
  for (const hit of songsToProcess) {
    const searchTerm = hit + " karaoke";
    const cacheKey = searchTerm.toLowerCase();
    
    try {
      console.log(`[prewarm] Warming up: "${hit}"`);
      await searchWithInnertube(searchTerm, cacheKey);
      count++;
      addedSongs.push(hit);
      
      // Small delay between searches to be safe
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[prewarm] Failed for "${hit}":`, err);
    }
  }

  console.log(`[prewarm] COMPLETED. Warmer added ${count} new queries to cache.`);
  return { 
    success: true, 
    count,
    addedSongs,
    skippedSongs,
    totalAvailable: KARAOKE_HITS.length,
    message: `Aquecimento concluído! ${count} músicas adicionadas ao cache de um total de ${KARAOKE_HITS.length} disponíveis.`
  };
});

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

    socket.on("error", (err) => {
      console.error(`[WS] Socket error in room ${roomCode}:`, err.message);
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

// ─────────────────────────────────────────────────────────────
// Cache Pre-warming: Popular karaoke songs
// Runs on startup to fill the cache so first searches are instant
// ─────────────────────────────────────────────────────────────
const PREWARM_QUERIES = [
  "bohemian rhapsody karaoke",
  "despacito karaoke",
  "someone like you karaoke",
  "shallow karaoke",
  "dont stop believin karaoke",
  "hotel california karaoke",
  "sweet home alabama karaoke",
  "take on me karaoke",
  "africa toto karaoke",
  "wonderwall karaoke",
  "billie jean karaoke",
  "sweet caroline karaoke",
  "dancing queen abba karaoke",
  "i will survive karaoke",
  "dont stop me now queen karaoke",
  "livin on a prayer karaoke",
  "eye of the tiger karaoke",
  "total eclipse of the heart karaoke",
  "killing me softly karaoke",
  "summer nights grease karaoke",
];

async function prewarmSearchCache() {
  console.log(`[cache] Pre-warming logic disabled (now persistent in DB).`);
}

// Start
const PORT = parseInt(process.env.PORT || "8787", 10);
app.listen({ port: PORT, host: "0.0.0.0" }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🎤 KaraokeFactory backend running on http://localhost:${PORT}`);
  // Pre-warm cache in background (non-blocking)
  setTimeout(() => prewarmSearchCache().catch(console.error), 5000);
});
