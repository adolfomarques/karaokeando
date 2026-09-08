import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import authRoutes from "./routes/auth.js";
import roomRoutes, { setRoomCallbacks } from "./routes/rooms.js";
import adminRoutes from "./routes/admin.js";
import youtubeRoutes from "./routes/youtube.js";
import roomActionsRoutes from "./routes/roomActions.js";
import { handleWebSocket } from "./lib/websocketController.js";
import { addRoom, rooms, connections, persistAllRooms } from "./lib/roomManager.js";
import { verifyToken } from "./lib/auth.js";
import prisma from "./lib/prisma.js";
import { getSongLibrary as getSongLibraryFromDb, getTopSongs as getTopSongsFromDb, removeSongFromLibrary, addSongToLibrary } from "./lib/songs.js";
import { checkEmbeddable, KARAOKE_HITS, searchWithInnertube } from "./lib/youtubeService.js";

const app = Fastify({ logger: { level: "warn" }, trustProxy: true });

await app.register(cors, {
  origin: [
    /^https:\/\/karaokefactory\.org$/,
    /^https:\/\/[a-z0-9-]+\.netlify\.app$/, // Netlify deploy previews
    /^http:\/\/localhost:\d+$/,
    /^https?:\/\/\d{1,3}(\.\d{1,3}){3}:\d+$/, // LAN dev (e.g. 192.168.x.x)
  ],
});

// Global rate limit per IP
await app.register(rateLimit, {
  max: 300,
  timeWindow: "1 minute",
});
await app.register(websocket);

// Register routes
await app.register(authRoutes);
await app.register(roomRoutes);
await app.register(adminRoutes);
await app.register(youtubeRoutes);
await app.register(roomActionsRoutes);

// Setup callback for when room is created via DB
setRoomCallbacks({
  onRoomCreated: (roomCode: string, ownerId: string) => {
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

app.get("/health", async () => ({ status: "ok" }));

// Song Library API
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

app.post<{ Body: { videoId: string; title?: string; addedBy?: string } }>("/api/songs", async (req, reply) => {
  const videoId = (req.body.videoId || "").trim();
  const title = (req.body.title || "").trim() || "(sem título)";
  const addedBy = (req.body.addedBy || "").trim() || "Anônimo";

  if (!videoId) return reply.code(400).send({ error: "missing_videoId" });

  const embeddable = await checkEmbeddable(videoId);
  if (!embeddable) {
    return reply.code(400).send({ error: "not_embeddable", message: "This video cannot be played in the app." });
  }

  const song = await addSongToLibrary(videoId, title, addedBy);
  return { ok: true, song };
});

app.delete<{ Params: { songId: string } }>("/api/songs/:songId", async (req, reply) => {
  const songId = req.params.songId;
  const deleted = await removeSongFromLibrary(songId);
  if (!deleted) return reply.code(404).send({ error: "not_found" });
  return { ok: true };
});

// Analytics
app.get<{ Querystring: { limit?: string; key?: string } }>("/api/analytics/top-songs", async req => {
  const limit = parseInt(req.query.limit || "20", 10);
  const songs = await getTopSongsFromDb(limit);
  return {
    topSongs: songs.map(s => ({
      videoId: s.videoId,
      title: s.title,
      playCount: s.playCount,
    })),
  };
});

app.get<{ Querystring: { key?: string } }>("/api/analytics/active-rooms", async (req, reply) => {
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
});

// Admin Pre-warm Endpoint
app.post("/api/admin/prewarm", async (req, reply) => {
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

  const cacheKeys = KARAOKE_HITS.map(h => (h + " karaoke").toLowerCase());
  const existingCache = await prisma.searchCache.findMany({
    where: { query: { in: cacheKeys }, expiresAt: { gt: new Date() } },
    select: { query: true },
  });
  const cachedQueries = new Set(existingCache.map(c => c.query));
  const missingHits = KARAOKE_HITS.filter(h => !cachedQueries.has((h + " karaoke").toLowerCase()));
  const skippedSongs = KARAOKE_HITS.filter(h => cachedQueries.has((h + " karaoke").toLowerCase()));

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
  
  for (const hit of songsToProcess) {
    const searchTerm = hit + " karaoke";
    const cacheKey = searchTerm.toLowerCase();
    
    try {
      console.log(`[prewarm] Warming up: "${hit}"`);
      await searchWithInnertube(searchTerm, cacheKey);
      count++;
      addedSongs.push(hit);
      
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
  handleWebSocket
);

async function prewarmSearchCache() {
  console.log(`[cache] Pre-warming logic disabled (now persistent in DB).`);
}

// Start
const PORT = parseInt(process.env.PORT || "8787", 10);
// Graceful Shutdown
const shutdown = async () => {
  console.log("Shutting down gracefully...");
  await persistAllRooms();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

app.listen({ port: PORT, host: "0.0.0.0" }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🎤 KaraokeFactory backend running on http://localhost:${PORT}`);
  setTimeout(() => prewarmSearchCache().catch(console.error), 5000);
});
