import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkEmbeddable(videoId: string): Promise<boolean> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok; // 200 = embeddable, 401/403 = disabled
  } catch {
    return true; // assume embeddable on network error
  }
}

async function main() {
  console.log("Starting library cleanup...");
  const songs = await prisma.song.findMany();
  console.log(`Found ${songs.length} songs in library.`);

  let deletedCount = 0;
  for (const song of songs) {
    process.stdout.write(`Checking ${song.videoId} (${song.title})... `);
    const embeddable = await checkEmbeddable(song.videoId);
    if (!embeddable) {
      console.log("NOT EMBEDDABLE. Deleting...");
      await prisma.song.delete({ where: { videoId: song.videoId } });
      deletedCount++;
    } else {
      console.log("OK.");
    }
    // Small delay to avoid hitting oEmbed too hard
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`Cleanup finished. Deleted ${deletedCount} non-embeddable songs.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
