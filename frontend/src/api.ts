// Verifica se é um IP de rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
function isPrivateIP(hostname: string): boolean {
  return (
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  );
}

// Em dev na rede local, conecta direto no backend. Caso contrário, URL relativa ou variável de ambiente.
export const DEVICE_KEY = "karaokefactory_deviceId";
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isPrivateIP(window.location.hostname)
    ? `http://${window.location.hostname}:8787`
    : "");

// ─────────────────────────────────────────────────────────────
// YouTube Search (with localStorage cache)
// ─────────────────────────────────────────────────────────────

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  isEmbeddable?: boolean;
}

const SEARCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const SEARCH_CACHE_PREFIX = "yt_search_";
const SEARCH_CACHE_MAX_ENTRIES = 50;

function getCachedSearch(query: string): YouTubeSearchResult[] | null {
  try {
    const key = SEARCH_CACHE_PREFIX + query.toLowerCase().trim();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { results, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return results;
  } catch {
    return null;
  }
}

function setCachedSearch(query: string, results: YouTubeSearchResult[]): void {
  try {
    const key = SEARCH_CACHE_PREFIX + query.toLowerCase().trim();
    const data = { results, expiresAt: Date.now() + SEARCH_CACHE_TTL };
    localStorage.setItem(key, JSON.stringify(data));
    // Evict oldest entries if over limit
    const keys = Object.keys(localStorage).filter(k => k.startsWith(SEARCH_CACHE_PREFIX));
    if (keys.length > SEARCH_CACHE_MAX_ENTRIES) {
      keys.sort();
      for (let i = 0; i < keys.length - SEARCH_CACHE_MAX_ENTRIES; i++) {
        localStorage.removeItem(keys[i]);
      }
    }
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export async function searchYouTube(
  query: string,
  signal?: AbortSignal,
  userId?: string,
  roomCode?: string
): Promise<YouTubeSearchResult[]> {
  // Check localStorage cache first
  const cached = getCachedSearch(query);
  if (cached && cached.length > 0) return cached;

  const url = new URL(`${API_BASE}/api/youtube/search`);
  url.searchParams.set("q", query);
  if (userId) url.searchParams.set("userId", userId);
  if (roomCode) url.searchParams.set("roomCode", roomCode);

  try {
    const res = await fetch(url.toString(), { signal });
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        setCachedSearch(query, results);
      }
      return results;
    }
    
    // If we get an error (like 429) and we're not already retrying, throw to let the UI handle or fallback
    if (res.status === 429 || !res.ok) {
       throw new Error(`SEARCH_FAILED_${res.status}`);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    
    // If it failed and we haven't retried yet, the UI might try to call a relay directly if we had them.
    // For now, we propagate the error so RoomMobile can show the "Congestion" warning.
    throw err;
  }

  return [];
}

export async function getVideoInfo(
  videoId: string,
  signal?: AbortSignal
): Promise<YouTubeSearchResult> {
  const res = await fetch(
    `${API_BASE}/api/youtube/info?videoId=${encodeURIComponent(videoId)}`,
    { signal }
  );
  if (!res.ok) {
    return {
      videoId,
      title: "",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      channelTitle: "",
    };
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Room API
// ─────────────────────────────────────────────────────────────

export async function createRoom(): Promise<{ roomCode: string }> {
  const res = await fetch(`${API_BASE}/api/rooms`, { method: "POST" });
  return res.json();
}

export async function getState(roomCode: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/state`);
  return res.json();
}

export interface ParticipantInfo {
  id: string;
  name: string;
}

export async function getParticipants(
  roomCode: string
): Promise<{ participants: ParticipantInfo[] }> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/participants`);
  return res.json();
}

export async function enqueue(
  roomCode: string,
  videoId: string,
  title: string,
  requestedBy: string,
  partner?: string,
  userId?: string,
  partnerId?: string,
  deviceFingerprint?: string
) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/enqueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      title,
      requestedBy,
      partner,
      userId,
      partnerId,
      deviceFingerprint,
    }),
  });
  return res.json();
}

export async function nextSong(roomCode: string, userId?: string, tvToken?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tvToken) headers["x-tv-token"] = tvToken;
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/next`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function finalizeSong(roomCode: string, requester: string, userId?: string, tvToken?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tvToken) headers["x-tv-token"] = tvToken;
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ requester, userId }),
  });
  return res.json();
}

export async function sendPlayerCommand(
  roomCode: string,
  action: "play" | "pause",
  userId?: string
) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/player`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, userId }),
  });
  return res.json();
}

export async function updateUserName(
  roomCode: string,
  userId: string,
  newName: string
) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/update-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, newName }),
  });
  return res.json();
}

export async function removeQueueItem(roomCode: string, itemId: string, userId?: string, tvToken?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tvToken) headers["x-tv-token"] = tvToken;
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/queue/remove`, {
    method: "POST",
    headers,
    body: JSON.stringify({ itemId, userId }),
  });
  return res.json();
}

export async function moveQueueItem(
  roomCode: string,
  itemId: string,
  direction: "up" | "down",
  userId?: string,
  tvToken?: string | null
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tvToken) headers["x-tv-token"] = tvToken;
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/queue/move`, {
    method: "POST",
    headers,
    body: JSON.stringify({ itemId, direction, userId }),
  });
  return res.json();
}

export async function queueItemToTop(roomCode: string, itemId: string, userId?: string, tvToken?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tvToken) headers["x-tv-token"] = tvToken;
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/queue/to-top`, {
    method: "POST",
    headers,
    body: JSON.stringify({ itemId, userId }),
  });
  return res.json();
}

// Called by TV when score overlay closes
export async function scoreDone(roomCode: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomCode}/score-done`, {
    method: "POST",
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Song Library API (global, shared by all users)
// ─────────────────────────────────────────────────────────────

export interface SavedSong {
  id: string;
  videoId: string;
  title: string;
  addedBy: string;
  savedAt: number;
}

export async function getSongLibrary(): Promise<SavedSong[]> {
  const res = await fetch(`${API_BASE}/api/songs`);
  return res.json();
}

export async function saveSong(
  videoId: string,
  title: string,
  addedBy: string
): Promise<{ ok: boolean; song?: SavedSong; alreadySaved?: boolean }> {
  const res = await fetch(`${API_BASE}/api/songs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, title, addedBy }),
  });
  return res.json();
}

export async function deleteSong(songId: string) {
  const res = await fetch(`${API_BASE}/api/songs/${songId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function deleteRoom(code: string) {
  const TOKEN_KEY = "karaokefactory_token";
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}/api/rooms/${code}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export function connectWS(
  roomCode: string,
  role: "tv" | "mobile",
  name: string,
  onMessage: (msg: unknown) => void,
  token?: string | null
): WebSocket {
  let url = "";

  if (API_BASE) {
    // Se temos uma API_BASE definida (URL completa), usamos ela trocando http por ws
    url = API_BASE.replace(/^http/, "ws") + `/ws/${roomCode}`;
  } else {
    // Fallback relativo (mesmo domínio do frontend)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    url = `${protocol}//${host}/ws/${roomCode}`;
  }

  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[WS] Connected, sending HELLO");
    ws.send(JSON.stringify({ type: "HELLO", role, name, token }));
  };

  ws.onmessage = event => {
    try {
      const msg = JSON.parse(event.data);
      onMessage(msg);
    } catch {
      // ignore
    }
  };

  ws.onerror = err => {
    console.error("[WS] Error", err);
  };

  ws.onclose = () => { };

  return ws;
}

// ─────────────────────────────────────────────────────────────
// Analytics API
// ─────────────────────────────────────────────────────────────

export interface TopSong {
  videoId: string;
  title: string;
  playCount: number;
}

export async function getTopSongs(
  limit = 20,
  period?: string
): Promise<TopSong[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (period) params.set("period", period);
  const res = await fetch(`${API_BASE}/api/analytics/top-songs?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.topSongs || [];
}

export interface ActiveRoom {
  code: string;
  createdAt: number;
  queueLength: number;
  nowPlaying: string | null;
  participantsCount: number;
}

export async function getActiveRooms(adminKey: string): Promise<ActiveRoom[]> {
  const res = await fetch(
    `${API_BASE}/api/analytics/active-rooms?key=${adminKey}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.activeRooms || [];
}
// ─────────────────────────────────────────────────────────────
// Admin API
// ─────────────────────────────────────────────────────────────

export interface AdminStats {
  userCount: number;
  roomCount: number;
  songCount: number;
  cacheCount: number;
  recentRooms: {
    code: string;
    owner: string;
    visitors: number;
    createdAt: string;
  }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  birthDate: string | null;
  gender: string | null;
  canHost: boolean;
  isAdmin: boolean;
  createdAt: string;
  roomsCreated: number;
}

export interface AdminSong {
  id: string;
  videoId: string;
  title: string;
  addedBy: string;
  playCount: number;
  createdAt: string;
}

export interface AdminBackground {
  id: string;
  url: string;
  active: boolean;
  createdAt: string;
}

export interface AdminPhrase {
  id: string;
  phrase: string;
  minScore: number;
  maxScore: number;
  active: boolean;
  createdAt: string;
}

export interface AdminBlockedChannel {
  id: string;
  channelId: string;
  name: string | null;
  createdAt: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Acesso negado");
  return res.json();
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Acesso negado");
  return res.json();
}

export async function deleteAdminUser(id: string): Promise<{ success?: boolean; error?: string }> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function bulkDeleteAdminUsers(ids: string[]): Promise<{
  success?: boolean;
  deletedCount?: number;
  requestedCount?: number;
  skipped?: {
    adminIds?: string[];
    selfIds?: string[];
    notFoundIds?: string[];
  };
  error?: string;
}> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/users/bulk-delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  return res.json();
}

export async function getAdminSongs(): Promise<AdminSong[]> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/songs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function deleteAdminSong(id: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/songs/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAdminBackgrounds(): Promise<AdminBackground[]> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/backgrounds`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addAdminBackground(url: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/backgrounds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function updateAdminBackground(id: string, url: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/backgrounds/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function deleteAdminBackground(id: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/backgrounds/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAdminPhrases(): Promise<AdminPhrase[]> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/phrases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addAdminPhrase(phrase: string, minScore: number, maxScore: number) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/phrases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phrase, minScore, maxScore }),
  });
  return res.json();
}

export async function updateAdminPhrase(id: string, phrase: string, minScore: number, maxScore: number) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/phrases/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phrase, minScore, maxScore }),
  });
  return res.json();
}

export async function deleteAdminPhrase(id: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/phrases/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAdminBlockedChannels(): Promise<AdminBlockedChannel[]> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/blocked-channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addAdminBlockedChannel(channelId: string, name?: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/blocked-channels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channelId, name }),
  });
  return res.json();
}

export async function deleteAdminBlockedChannel(id: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/blocked-channels/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getPublicScoreMeta(): Promise<{ backgrounds: AdminBackground[], phrases: AdminPhrase[] }> {
  const res = await fetch(`${API_BASE}/api/public/score-meta`);
  return res.json();
}

export async function runAdminPrewarm(quantity?: number): Promise<{ success: boolean; count?: number; addedSongs?: string[]; skippedSongs?: string[]; totalAvailable?: number; message?: string; error?: string }> {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/prewarm`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: quantity ? JSON.stringify({ quantity }) : undefined,
  });
  return res.json();
}
