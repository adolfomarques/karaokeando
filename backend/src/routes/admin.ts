import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { requireAdmin } from "./auth.js";

const songSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  addedBy: z.string(),
});

const backgroundSchema = z.object({
  url: z.string().url(),
  active: z.boolean().optional(),
});

const phraseSchema = z.object({
  phrase: z.string(),
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  active: z.boolean().optional(),
});

const bulkDeleteUsersSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export default async function adminRoutes(app: FastifyInstance) {
  // Helper for public consumption of score metals
  app.get("/api/public/score-meta", async () => {
    const [backgrounds, phrases] = await Promise.all([
      prisma.scoreBackground.findMany({ where: { active: true } }),
      prisma.scorePhrase.findMany({ where: { active: true } }),
    ]);
    return { backgrounds, phrases };
  });

  // All other routes require admin
  app.get("/api/admin/stats", { preHandler: [requireAdmin] }, async () => {
    const [userCount, roomCount, songCount, cacheCount] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.song.count(),
      prisma.searchCache.count(),
    ]);
    
    // Get some recent rooms
    const recentRooms = await prisma.room.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true } } }
    });

    return {
      userCount,
      roomCount,
      songCount,
      cacheCount,
      recentRooms: recentRooms.map(r => ({
        code: r.code,
        owner: r.owner.name,
        visitors: r.uniqueVisitors,
        createdAt: r.createdAt
      }))
    };
  });

  // --- LOGIN HISTORY ---
  // Returns recent login events with user info, paginated.
  // Supports filtering by user email/name via ?q= and by method via ?method=.
  app.get<{ Querystring: { limit?: string; offset?: string; q?: string; method?: string } }>(
    "/api/admin/logins",
    { preHandler: [requireAdmin] },
    async (request) => {
      const query = request.query;
      const limit = Math.min(parseInt(query.limit || "100", 10) || 100, 500);
      const offset = parseInt(query.offset || "0", 10) || 0;
      const q = (query.q || "").trim().toLowerCase();
      const method = (query.method || "").trim() || undefined;

      const where: any = {};
      if (method) where.method = method;
      if (q) {
        where.user = {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
          ],
        };
      }

      const [events, total] = await Promise.all([
        prisma.loginEvent.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, name: true, email: true, isAdmin: true },
            },
          },
        }),
        prisma.loginEvent.count({ where }),
      ]);

      return {
        events: events.map((e) => ({
          id: e.id,
          userId: e.userId,
          userName: e.user.name,
          userEmail: e.user.email,
          userIsAdmin: e.user.isAdmin,
          method: e.method,
          ip: e.ip,
          userAgent: e.userAgent,
          createdAt: e.createdAt,
        })),
        total,
        limit,
        offset,
      };
    }
  );

  // --- LOGIN STATS (summary) ---
  app.get("/api/admin/logins/stats", { preHandler: [requireAdmin] }, async () => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [last24h, last7d, total, byMethodRaw, uniqueUsers] = await Promise.all([
      prisma.loginEvent.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.loginEvent.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.loginEvent.count(),
      prisma.loginEvent.groupBy({ by: ["method"], _count: { _all: true } }),
      prisma.loginEvent.findMany({
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

    return {
      last24h,
      last7d,
      total,
      uniqueUsers: uniqueUsers.length,
      byMethod: Object.fromEntries(
        byMethodRaw.map((m) => [m.method, m._count._all])
      ),
    };
  });

  // --- USERS MANAGEMENT ---
  // API endpoint to list all users with detailed information
  app.get("/api/admin/users", { preHandler: [requireAdmin] }, async (request) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || "50", 10) || 50, 200);
    const offset = parseInt(query.offset || "0", 10) || 0;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          birthDate: true,
          gender: true,
          canHost: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { ownedRooms: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count(),
    ]);

    return {
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        birthDate: user.birthDate,
        gender: user.gender,
        canHost: user.canHost,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        roomsCreated: user._count.ownedRooms
      })),
      total,
      limit,
      offset,
    };
  });

  app.delete("/api/admin/users/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = (request as any).user as { userId: string };

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isAdmin: true }
    });

    if (!userToDelete) {
      return reply.code(404).send({ error: "user_not_found" });
    }

    if (userToDelete.id === currentUser.userId) {
      return reply.code(400).send({ error: "cannot_delete_self" });
    }

    if (userToDelete.isAdmin) {
      return reply.code(400).send({ error: "cannot_delete_admin" });
    }

    await prisma.$transaction([
      prisma.room.deleteMany({ where: { ownerId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    return { success: true };
  });

  app.post("/api/admin/users/bulk-delete", { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = bulkDeleteUsersSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }

    const currentUser = (request as any).user as { userId: string };
    const requestedIds = Array.from(new Set(parsed.data.ids));

    const usersFound = await prisma.user.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true, isAdmin: true },
    });

    const foundIds = new Set(usersFound.map((user) => user.id));
    const adminIds = usersFound.filter((user) => user.isAdmin).map((user) => user.id);
    const selfIds = usersFound.filter((user) => user.id === currentUser.userId).map((user) => user.id);
    const notFoundIds = requestedIds.filter((id) => !foundIds.has(id));
    const deletableIds = usersFound
      .filter((user) => !user.isAdmin && user.id !== currentUser.userId)
      .map((user) => user.id);

    const deletedIds: string[] = [];
    const failedIds: string[] = [];

    for (const userId of deletableIds) {
      try {
        await prisma.$transaction([
          prisma.room.deleteMany({ where: { ownerId: userId } }),
          prisma.user.delete({ where: { id: userId } }),
        ]);
        deletedIds.push(userId);
      } catch {
        failedIds.push(userId);
      }
    }

    return {
      success: true,
      requestedCount: requestedIds.length,
      deletedCount: deletedIds.length,
      skipped: {
        adminIds,
        selfIds,
        notFoundIds,
        failedIds,
      },
    };
  });

  // --- SONGS MANAGEMENT ---
  app.get("/api/admin/songs", { preHandler: [requireAdmin] }, async (request) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || "50", 10) || 50, 200);
    const offset = parseInt(query.offset || "0", 10) || 0;
    const [songs, total] = await Promise.all([
      prisma.song.findMany({ skip: offset, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.song.count(),
    ]);
    return { songs, total, limit, offset };
  });

  app.post("/api/admin/songs", { preHandler: [requireAdmin] }, async (request) => {
    const data = songSchema.parse(request.body);
    return prisma.song.upsert({
      where: { videoId: data.videoId },
      update: data,
      create: data,
    });
  });

  app.delete("/api/admin/songs/:id", { preHandler: [requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.song.delete({ where: { id } });
    return { success: true };
  });

  // --- BACKGROUNDS MANAGEMENT ---
  app.get("/api/admin/backgrounds", { preHandler: [requireAdmin] }, async () => {
    return prisma.scoreBackground.findMany({ orderBy: { createdAt: "desc" } });
  });

  app.post("/api/admin/backgrounds", { preHandler: [requireAdmin] }, async (request) => {
    const data = backgroundSchema.parse(request.body);
    return prisma.scoreBackground.create({ data });
  });

  app.patch("/api/admin/backgrounds/:id", { preHandler: [requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const data = backgroundSchema.partial().parse(request.body);
    return prisma.scoreBackground.update({ where: { id }, data });
  });

  app.delete("/api/admin/backgrounds/:id", { preHandler: [requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.scoreBackground.delete({ where: { id } });
    return { success: true };
  });

  // --- PHRASES MANAGEMENT ---
  app.get("/api/admin/phrases", { preHandler: [requireAdmin] }, async () => {
    return prisma.scorePhrase.findMany({ orderBy: { minScore: "asc" } });
  });

  app.post("/api/admin/phrases", { preHandler: [requireAdmin] }, async (request) => {
    const data = phraseSchema.parse(request.body);
    return prisma.scorePhrase.create({ data });
  });

  app.patch("/api/admin/phrases/:id", { preHandler: [requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const data = phraseSchema.partial().parse(request.body);
    return prisma.scorePhrase.update({ where: { id }, data });
  });

  app.delete("/api/admin/phrases/:id", { preHandler: [requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.scorePhrase.delete({ where: { id } });
    return { success: true };
  });

  // --- PLAYLISTS MANAGEMENT ---
  app.get("/api/admin/playlists", { preHandler: [requireAdmin] }, async () => {
    return prisma.playlist.findMany({
      include: { songs: { include: { song: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/api/admin/playlists", { preHandler: [requireAdmin] }, async (request) => {
    const { name, imageUrl, songIds } = request.body as { name: string, imageUrl?: string, songIds: string[] };
    return prisma.playlist.create({
      data: {
        name,
        imageUrl,
        songs: {
          create: songIds?.map((id: string, index: number) => ({
            songId: id,
            order: index,
          })),
        },
      },
    });
  });

  app.delete("/api/admin/playlists/:id", { preHandler: [requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.playlist.delete({ where: { id } });
    return { success: true };
  });

  // --- BLOCKED CHANNELS MANAGEMENT ---
  app.get("/api/admin/blocked-channels", { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      return await prisma.blockedChannel.findMany({ orderBy: { createdAt: "desc" } });
    } catch (err) {
      console.error("Missing table blocked_channels:", err);
      return [];
    }
  });

  app.post("/api/admin/blocked-channels", { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { channelId, name } = request.body as { channelId: string; name?: string };
      if (!channelId) throw new Error("Missing channelId");
      
      return await prisma.blockedChannel.upsert({
        where: { channelId },
        update: { name },
        create: { channelId, name },
      });
    } catch (err) {
      console.error("Database error in blocked-channels:", err);
      return reply.code(500).send({ error: "Erro ao acessar banco de dados. Verifique as migrações." });
    }
  });

  app.delete("/api/admin/blocked-channels/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.blockedChannel.delete({ where: { id } });
      return { success: true };
    } catch (err) {
      console.error("Database error in delete blocked-channel:", err);
      return reply.code(500).send({ error: "Erro ao deletar. Verifique se a tabela existe." });
    }
  });
}
