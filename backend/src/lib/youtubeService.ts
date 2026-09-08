import { Innertube, UniversalCache } from 'youtubei.js';
import prisma from "./prisma.js";
import { connections } from "./roomManager.js";

let youtube: Innertube | null = null;

export async function initYoutube() {
  try {
    youtube = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true });
    console.log("📺 Native YouTube client (youtubei.js) initialized.");
  } catch (err) {
    console.error("❌ Failed to initialize youtubei.js", err);
  }
}
// Automatically init
initYoutube();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_MEM_TTL = 10 * 60 * 1000;
const SEARCH_MEM_MAX = 200;

export const searchMemCache = new Map<string, { data: YouTubeSearchResult[]; expiresAt: number }>();
export const inFlightSearches = new Map<string, Promise<YouTubeSearchResult[]>>();

const YT_DLP_MAX_CONCURRENT = 10;
let ytDlpActiveCount = 0;
const ytDlpQueue: Array<{
  resolve: () => void;
  userId?: string;
  roomCode?: string;
}> = [];

export async function acquireYtDlpSlot(userId?: string, roomCode?: string): Promise<void> {
  if (ytDlpActiveCount < YT_DLP_MAX_CONCURRENT) {
    ytDlpActiveCount++;
    return;
  }
  return new Promise<void>((resolve) => {
    ytDlpQueue.push({ resolve, userId, roomCode });
    if (userId && roomCode) {
      sendSearchQueueUpdate(roomCode, userId, ytDlpQueue.length);
    }
  });
}

export function releaseYtDlpSlot(): void {
  if (ytDlpQueue.length > 0) {
    const next = ytDlpQueue.shift()!;
    next.resolve();
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

const SEARCH_RATE_LIMIT = 10;
const SEARCH_RATE_WINDOW_MS = 60_000;
const searchRateMap = new Map<string, { count: number; resetAt: number }>();

export function isSearchRateLimited(ip: string): boolean {
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

setInterval(async () => {
  const now = Date.now();
  for (const [ip, entry] of searchRateMap.entries()) {
    if (now > entry.resetAt) searchRateMap.delete(ip);
  }
  try {
    const deleted = await prisma.searchCache.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (deleted.count > 0) console.log(`[housekeeping] Removed ${deleted.count} expired search cache entries from DB.`);
  } catch (err) {
    console.error("[housekeeping] DB Error", err);
  }
}, 30 * 60 * 1000).unref();

export const KARAOKE_HITS = [
  "Evidências Chitãozinho e Xororó", "Boate Azul", "Sandra Rosa Madalena", "Borbulhas de Amor", 
  "Infiel Marília Mendonça", "Cerveja de Garrafa", "Regime Fechado", "Chora, Me Liga", "Amo Noite e Dia",
  "Dormi na Praça", "Nuvem de Lágrimas", "Fio de Cabelo", "Pense em Mim", "Galopeira", "Meu Ex-Amor Amado Batista",
  "Telefone Mudo", "Ainda Ontem Chorei de Saudade", "Um Sonhador Leandro e Leonardo", "Não Aprendi a Dizer Adeus",
  "Decida", "Fuscão Preto", "Convite de Casamento", "Notificação Preferida Zé Neto", "Largado as Traças",
  "Romance com Safadeza", "Camarote Wesley Safadão", "Apelido Carinhoso Gusttavo Lima", "Homem de Família Gusttavo Lima",
  "Anna Julia Los Hermanos", "Pelados em Santos", "Primeiros Erros", "Garçon Reginaldo Rossi",
  "O Sol Jota Quest", "A Lenda Sandy e Junior", "Sutilmente Skank", "Amor e Sexo Rita Lee",
  "Acelerou Banda Eva", "Tempo Perdido Legião Urbana", "Faroeste Caboclo", "Pais e Filhos", "Exagerado Cazuza",
  "Menina Veneno", "Cheia de Manias", "Sozinho Caetano Veloso", "Lanterna dos Afogados", "Epitáfio Titãs",
  "Pro Dia Nascer Feliz", "Como Nossos Pais", "Malandragem Cássia Eller", "Por Você Barão Vermelho",
  "Me Chama Lobão", "Vou Deixar Skank", "Garota de Ipanema", "Aquele Abraço", "Oceano Djavan",
  "Se Eu Não Te Amasse Tanto Assim", "Fogo e Paixão Wando", "Alma Gêmea Fabio Jr", "Pai Fabio Jr",
  "Cheia de Manias Raça Negra", "É Tarde Demais Raça Negra", "Deus Me Livre Raça Negra",
  "Me Apaixonei Pela Pessoa Errada", "Cilada Molejo", "Dança da Vassoura", "Pimpolho",
  "Eva Banda Eva", "Araketu é Bom Demais", "O Canto da Cidade", "Milla Netinho",
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

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelId?: string;
  isEmbeddable?: boolean;
  duration?: number;
}

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

const EMBED_CACHE_TTL = 24 * 60 * 60 * 1000;
const embedCache = new Map<string, { embeddable: boolean; expiresAt: number }>();

export async function checkEmbeddable(videoId: string): Promise<boolean> {
  const cached = embedCache.get(videoId);
  if (cached && Date.now() < cached.expiresAt) return cached.embeddable;
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    const embeddable = res.ok;
    embedCache.set(videoId, { embeddable, expiresAt: Date.now() + EMBED_CACHE_TTL });
    if (!embeddable) console.log(`[embed-check] Video ${videoId} BLOCKED (Status ${res.status})`);
    return embeddable;
  } catch (err) {
    console.warn(`[embed-check] Network error for ${videoId}, assuming embeddable`);
    return true;
  }
}

export async function searchWithInnertube(
  query: string,
  cacheKey: string,
  userId?: string,
  roomCode?: string
): Promise<YouTubeSearchResult[]> {
  await acquireYtDlpSlot(userId, roomCode);
  try {
    if (!youtube) await initYoutube();
    const search = await youtube!.search(query, { type: 'video' });
    const results: YouTubeSearchResult[] = [];
    const videos = search.videos.filter(v => v.type === 'Video').slice(0, 20);

    for (const video of videos) {
      if ('id' in video && video.id) {
        results.push({
          videoId: video.id as string,
          title: (video as any).title?.text || "",
          thumbnail: (video as any).thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
          channelTitle: (video as any).author?.name || "",
          channelId: (video as any).author?.id || "",
          duration: parseDurationText((video as any).duration),
        });
      }
    }

    let blockedChannels: string[] = [];
    try {
      const blockedData = await prisma.blockedChannel.findMany({ select: { channelId: true } });
      blockedChannels = blockedData.map(c => c.channelId);
    } catch (err) {
      console.error("Error fetching blocked channels, bypassing filter:", err);
    }
    const blockedIds = new Set(blockedChannels);

    const filteredResults = results.filter(r => !r.channelId || !blockedIds.has(r.channelId));
    const embeddableFlags = await Promise.all(filteredResults.slice(0, 15).map(r => checkEmbeddable(r.videoId)));

    const final = filteredResults.slice(0, 15).map((r, i) => ({
      ...r,
      isEmbeddable: embeddableFlags[i],
    })).filter(r => r.isEmbeddable === true).slice(0, 12);

    searchMemCache.set(cacheKey, { data: final, expiresAt: Date.now() + SEARCH_MEM_TTL });
    if (searchMemCache.size > SEARCH_MEM_MAX) {
      const oldest = searchMemCache.keys().next().value;
      if (oldest) searchMemCache.delete(oldest);
    }

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
    return [];
  } finally {
    releaseYtDlpSlot();
    inFlightSearches.delete(cacheKey);
  }
}

export async function getYoutubeInfo(videoId: string) {
  if (!youtube) await initYoutube();
  return youtube!.getInfo(videoId);
}
