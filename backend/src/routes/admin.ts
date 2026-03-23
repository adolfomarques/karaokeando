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
    const [userCount, roomCount, songCount] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.song.count(),
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
      recentRooms: recentRooms.map(r => ({
        code: r.code,
        owner: r.owner.name,
        visitors: r.uniqueVisitors,
        createdAt: r.createdAt
      }))
    };
  });

  // --- USERS MANAGEMENT ---
  app.get("/api/admin/users", { preHandler: [requireAdmin] }, async () => {
    const users = await prisma.user.findMany({
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
        _count: {
          select: { ownedRooms: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return users.map(user => ({
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
      roomsCreated: user._count.ownedRooms
    }));
  });

  // --- SONGS MANAGEMENT ---
  app.get("/api/admin/songs", { preHandler: [requireAdmin] }, async () => {
    return prisma.song.findMany({ orderBy: { createdAt: "desc" } });
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
}
