import type { FastifyInstance } from "fastify";
import { searchWithInnertube, getYoutubeInfo, checkEmbeddable, searchMemCache, inFlightSearches } from "../lib/youtubeService.js";
import prisma from "../lib/prisma.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export default async function youtubeRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q: string; userId?: string; roomCode?: string } }>(
    "/api/youtube/search",
    async (req, reply) => {
      const query = (req.query.q || "").trim();
      const userId = req.query.userId;
      const roomCode = req.query.roomCode;
      if (!query) return reply.code(400).send({ error: "missing_query" });

      const searchTerm = query + " karaoke";
      const cacheKey = searchTerm.toLowerCase();

      const memHit = searchMemCache.get(cacheKey);
      if (memHit && Date.now() < memHit.expiresAt) {
        reply.header("Cache-Control", `public, max-age=600, stale-while-revalidate=60`);
        return memHit.data.filter(r => r.isEmbeddable === true);
      }

      try {
        const cached = await prisma.searchCache.findUnique({ where: { query: cacheKey } });
        if (cached && new Date() < cached.expiresAt) {
          reply.header("Cache-Control", `public, max-age=3600, stale-while-revalidate=600`);
          return (cached.results as any[]).filter((r: any) => r.isEmbeddable === true);
        }
      } catch (err) {}

      const existing = inFlightSearches.get(cacheKey);
      if (existing) {
        try {
          const results = await existing;
          reply.header("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`);
          return results.filter(r => r.isEmbeddable === true);
        } catch {
          return reply.code(500).send({ error: "search_failed" });
        }
      }

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

  app.get<{ Querystring: { videoId: string } }>(
    "/api/youtube/info",
    async (req, reply) => {
      const videoId = (req.query.videoId || "").trim();
      if (!videoId) return reply.code(400).send({ error: "missing_videoId" });

      try {
        const info = await getYoutubeInfo(videoId);
        const result = {
          videoId,
          title: info.basic_info.title || "",
          thumbnail: info.basic_info.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          channelTitle: info.basic_info.author || "",
          duration: typeof info.basic_info.duration === "number" ? info.basic_info.duration : undefined,
        };
        reply.header("Cache-Control", "public, max-age=3600");
        return result;
      } catch {
        return {
          videoId,
          title: "",
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          channelTitle: "",
        };
      }
    }
  );
}
