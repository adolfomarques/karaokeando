import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { useAuth, getToken } from "../context/AuthContext";
import { getDeviceFingerprint } from "../lib/deviceId";
import Logo from "../components/Logo";
import {
  connectWS,
  enqueue,
  getState,
  getParticipants,
  getSongLibrary,
  getTopSongs,
  deleteSong,
  sendPlayerCommand,
  nextSong,
  finalizeSong,
  removeQueueItem,
  searchYouTube,
  getVideoInfo,
  updateUserName,
  roomJoinUrl,
  type SavedSong,
  type TopSong,
  type YouTubeSearchResult,
} from "../api";

interface Singer {
  id: string;
  name: string;
}

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  requestedBy: string;
  requesterId: string;
  singers?: Singer[];
  duration?: number;
}

interface DuetRankingEntry {
  names: [string, string];
  score: number;
  count: number;
}

interface ParticipantInfo {
  id: string;
  name: string;
}

interface RankingEntry {
  name: string;
  score: number;
}

interface RoomState {
  roomCode: string;
  nowPlaying: QueueItem | null;
  queue: QueueItem[];
  ranking: Record<string, RankingEntry>;
  duetRanking: DuetRankingEntry[];
  showingScore: boolean;
  ownerId: string;
  lastEnqueueAt: Record<string, number>;
  history: QueueItem[];
}

type Tab = "queue" | "ranking" | "saved" | "history";
type RankingView = "solo" | "duet";

// Format seconds as m:ss (e.g. 225 -> "3:45")
function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Extra emojis available through the "+" reaction picker
const EXTRA_REACTIONS = [
  "❤️","👍","🎉","🥳","🤩","😍","👑","💖","🫶","✌️","🤘","🎶","🎵","🎸","🎷","🥁","🎺","🎹","💃","🕺","🤣","😅","🙌","😎","🤠","🥰","😢","😭","💯","⭐","🌟","✨","💪","🤝","👋","🙏","😜","🤪","😇","🥺","🫡","🤯","😱","😈","💀","👻","🤖","🎭","🕶️","🎊","🎁","🍾","🥂","🍻","🍺","🎧","🎼","📢","💥","⚡","🌈","☀️","🦄","🐻","🦖","🌹","🌺","🌸","💫","🕊️","💜","💙","💚","🧡","💛","🩷","🖤","🤍","🏆","🥇","🥈","🥉","🎖️","🚀","⭐","🫶","😤","🤗","🫠","🥲","😳","🫣","🤔","😴","🥱","🤒","🩹","👀","👅","🫦","👍🏽","👌","🤙","👊","✊","🖐️","🤲","💅","🪩","🪅","🪇","🪗","🎺","🪕","🎻","🎤","🎫","🕹️","🎮","👾","🎱","⚽","🏀","🏈","⚾","🥎","🏐","🏉","🎳","🏓","🏸","⛳","⛸️","🛼","🛹","🎿","🏂","🏄","🏊","🚴","🧗","🤸","🧘","🏃","💨","🫧","🌊","🔥"
];

// Icon components
const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconPlus = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const IconMic = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconMusic = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const IconSearch = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);


const IconTrophy = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
);

const IconPlay = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconPause = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const IconSkipForward = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line
      x1="19"
      y1="5"
      x2="19"
      y2="19"
      stroke="currentColor"
      strokeWidth="2"
    ></line>
  </svg>
);

const IconTrendingUp = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);


const IconUser = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const IconLibrary = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const IconHistory = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    <polyline points="12 7 12 12 16 14"></polyline>
  </svg>
);

const IconShare = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);

const IconAlertTriangle = ({ size = 16, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

// Truncated text with tooltip on click/tap
const TruncatedText = ({
  text,
  maxLength,
  style,
}: {
  text: string;
  maxLength: number;
  style?: React.CSSProperties;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation
    ? text.slice(0, maxLength).trim() + "..."
    : text;

  if (!needsTruncation) {
    return <span style={style}>{text}</span>;
  }

  return (
    <span
      style={{ position: "relative", cursor: "pointer", ...style }}
      onClick={e => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {displayText}
      {showTooltip && (
        <span
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            marginBottom: 8,
            padding: "8px 12px",
            background: "#333",
            border: "1px solid #555",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "#fff",
            whiteSpace: "normal",
            wordBreak: "break-word",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            minWidth: 200,
            maxWidth: 280,
          }}
          onClick={e => e.stopPropagation()}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default function RoomMobile() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("queue");
  const [rankingView, setRankingView] = useState<RankingView>("solo");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchCongested, setIsSearchCongested] = useState(false);
  const [customTitle, setCustomTitle] = useState(""); // For when pasting a link
  const [adding, setAdding] = useState<string | null>(null); // videoId being added
  const [songLibrary, setSongLibrary] = useState<SavedSong[]>([]);
  const [savedFilter, setSavedFilter] = useState("");
  const [previewVideo, setPreviewVideo] = useState<YouTubeSearchResult | null>(
    null
  );
  const [showAllQueue, setShowAllQueue] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true); // Assume playing when song starts
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [topSongs, setTopSongs] = useState<TopSong[]>([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const cleanTitle = (title: string) => title.replace(/\s*[\[\(][^\]\)]*karaok[eê][^\]\)]*[\]\)]/gi, "").replace(/\s*karaok[eê][:\s-]*/gi, " ").replace(/\s*\(\)\s*/g, "").replace(/\s*\[\s*\]\s*/g, "").replace(/\s+/g, " ").trim();
  const showToast = (msg: string, duration = 4000) => {
    toast.custom((t) => (
      <div style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "16px",
        padding: "14px 20px",
        color: "#fff",
        fontSize: "0.9rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "360px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        transform: t.visible ? "translateX(0)" : "translateX(60px)",
        opacity: t.visible ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: "auto",
      }}>
        <div style={{ width: "3px", height: "28px", borderRadius: "2px", background: "#FF0080", flexShrink: 0 }} />
        {msg}
      </div>
    ), { duration, position: "top-right" });
  };
  // Modal para adicionar música (escolher solo/dueto)
  const [addSongModal, setAddSongModal] = useState<{
    videoId: string;
    title: string;
    source: "search" | "library" | "top";
    duration?: number;
  } | null>(null);
  const [modalPartner, setModalPartner] = useState<string>(""); // Partner ID selected in modal
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [reactionBursts, setReactionBursts] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [reconnectKey, setReconnectKey] = useState(0); // Para forçar reconexão do WS
  const [searchQueuePosition, setSearchQueuePosition] = useState<number | null>(null);
  const [searchQueueTotal, setSearchQueueTotal] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Dynamic loading text steps
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    t("mobile.searchingYouTube", "Searching YouTube..."),
    t("mobile.analyzingResults", "Analyzing results..."),
    t("mobile.almostReady", "Almost ready..."),
  ];

  useEffect(() => {
    if (!searching) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [searching, loadingMessages.length]);

  // Floating emojis were removed from mobile (they are now exclusive to TV).
  // The sender gets a small local burst as feedback that the reaction was sent.
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const sendReaction = (emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "REACTION",
          reaction: emoji,
          name: nickname || user?.name || t("mobile.anonymous", "Anônimo"),
          userId: myUserId
        })
      );
    }
    const id = Date.now() + Math.random();
    const x = Math.round(Math.random() * 48 - 24);
    setReactionBursts(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setReactionBursts(prev => prev.filter(b => b.id !== id)), 1000);
  };

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);

  const sendScore = (stars: number) => {
    setSelectedStar(stars);
    const score = stars * 20; // 1 to 5 stars mapped to 20 to 100 points
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "SUBMIT_SCORE",
          score,
          userId: myUserId
        })
      );
    }
    toast.success(t("mobile.scoreSent", "Nota enviada!"));
    
    // Wait for the fill animation before closing
    setTimeout(() => {
      setShowRatingModal(false);
      // Reset selected star after modal closes
      setTimeout(() => setSelectedStar(null), 300);
    }, 800);
  };

  // Share the room invite via native share sheet (WhatsApp, Messenger, etc.)
  const shareRoom = async () => {
    if (!code) return;
    const url = roomJoinUrl(code);
    const text = t("mobile.shareText", `Vem cantar comigo no karaokê! Sala ${code}`, { code });
    if (navigator.share) {
      try {
        await navigator.share({ title: t("mobile.shareTitle", "Karaoke Factory"), text, url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("mobile.shareCopied", "Link copiado! Envie para seus amigos."));
    } catch {
      showToast(t("mobile.shareFailed", "Não foi possível compartilhar."));
    }
  };

  // Re-request a previously played song (encore)
  const handleEncore = async (song: QueueItem) => {
    if (!code) return;
    setAdding(song.videoId);
    try {
      const result = await enqueue(code, song.videoId, song.title, nickname, undefined, myUserId, undefined, undefined, song.duration);
      if (result?.error) {
        showToast(result.message || t("mobile.addError", "Não foi possível adicionar. Tente de novo."));
      } else {
        showToast(t("mobile.encoreAdded", "🔁 De volta à fila!"));
      }
    } catch {
      showToast(t("mobile.addError", "Não foi possível adicionar. Tente de novo."));
    }
    setAdding(null);
  };

  // Check auth on mount
  useEffect(() => {
    if (!authLoading && !user && code) {
      // Redirect to guest register with this room code
      navigate(`/guest-register?redirect=${code}`);
    }
  }, [authLoading, user, code, navigate]);

  // Initialize nickname from user name (will be updated by server if duplicate)
  useEffect(() => {
    if (user?.name && !nickname) {
      setNickname(user.name);
    }
  }, [user?.name, nickname]);

  const myUserId = user?.id || "";
  const isHost = state?.ownerId === myUserId;
  // queue[0] appears in the "up next" box when nothing is playing — don't repeat it in the list
  const upNextInBox = !state?.nowPlaying && !state?.showingScore && (state?.queue.length ?? 0) > 0;
  const queueList = upNextInBox ? state!.queue.slice(1) : (state?.queue ?? []);

  // Cooldown effect
  useEffect(() => {
    if (!state || isHost) {
      setCooldownRemaining(0);
      return;
    }

    const last = state.lastEnqueueAt[myUserId] || 0;
    const now = Date.now();
    const diff = now - last;
    const THREE_MINUTES = 3 * 60 * 1000;

    if (diff < THREE_MINUTES) {
      setCooldownRemaining(Math.ceil((THREE_MINUTES - diff) / 1000));
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCooldownRemaining(0);
    }
  }, [state, myUserId, isHost]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed && code) {
      try {
        const result = await updateUserName(code, myUserId, trimmed);
        if (result.error === "duplicate_name") {
          setNameError(result.message || t("mobile.nameAlreadyUsed", "This name is already used."));
          return;
        }
        // Update local nickname
        setNickname(trimmed);
        setShowNameModal(false);
        setNameError(null);
        showToast(t("mobile.nameUpdated", "✨ Apelido atualizado!"));

        // Reconnect WebSocket with new name
        if (wsRef.current) {
          wsRef.current.close();
        }
      } catch (e) {
        console.error("Failed to update name on server", e);
      }
    }
  };

  // Load song library and top songs on mount
  useEffect(() => {
    getSongLibrary()
      .then(setSongLibrary)
      .catch(() => { });
    getTopSongs(10)
      .then(setTopSongs)
      .catch(() => { });
  }, []);

  // Salvar última sala visitada
  useEffect(() => {
    if (code) {
      localStorage.setItem("karaokefactory_last_room", code);
    }
  }, [code]);

  useEffect(() => {
    if (!code || !user) return;

    const token = getToken();

    // Fallback: fetch state via HTTP in case WS is slow
    const refreshState = async () => {
      try {
        const s = await getState(code);
        if (s && s.error === "room_not_found") {
          setError(t("home.roomNotFound", "Room not found. Check the code."));
        } else if (s && !s.error) {
          setState(s);
        }
      } catch (e) {
        console.error("Failed to refresh state", e);
      }
    };

    refreshState();

    const ws = connectWS(
      code,
      "mobile",
      nickname || user?.name || "",
      (msg: unknown) => {
        const m = msg as {
          type: string;
          state?: RoomState;
          error?: string;
          message?: string;
          participants?: ParticipantInfo[];
          nickname?: string;
          originalName?: string;
          wasModified?: boolean;
        };
        if (m.type === "STATE" && m.state) {
          setState(prev => {
            // Reset isPlaying when a new song starts
            if (m.state!.nowPlaying?.id !== prev?.nowPlaying?.id) {
              setIsPlaying(true);
            }
            return m.state!;
          });
        } else if (m.type === "PARTICIPANTS" && m.participants) {
          setParticipants(m.participants);
        } else if (m.type === "SEARCH_QUEUE_POSITION") {
          const mq = m as any as { position: number, total: number };
          setSearchQueuePosition(mq.position);
          setSearchQueueTotal(mq.total);
        } else if (m.type === "NICKNAME_ASSIGNED" && m.nickname) {
          setNickname(m.nickname);
          if (m.wasModified) {
            showToast(t("mobile.nicknameAssigned", { nickname: m.nickname }), 5000);
          }
        } else if (m.type === "ERROR" && m.error === "room_not_found") {
          setError(t("home.roomNotFound", "Room not found. Check the code."));
        } else if (m.type === "ERROR" && m.error === "duplicate_name") {
          setError(
            m.message || t("mobile.nameAlreadyUsed", "This name is already used. Choose another.")
          );
        }
        // FINALIZED is now only handled by TV - mobile ignores it
      },
      token
    );
    wsRef.current = ws;

    // Polling fallback: if WS is dead, keep state updated via HTTP
    const pollInterval = setInterval(() => {
      const wsState = wsRef.current?.readyState;
      if (!wsRef.current || wsState !== WebSocket.OPEN) {
        getState(code)
          .then(s => {
            if (s && !s.error) setState(s);
          })
          .catch(() => { });
        
        getParticipants(code)
          .then(data => {
            if (data.participants) setParticipants(data.participants);
          })
          .catch(() => { });

        // Auto-reconnect: if the WS is truly closed, force a fresh WS.
        // Without this, reactions and live updates silently stop while the
        // room keeps looking alive via the HTTP polling above.
        if (!wsRef.current || wsState === WebSocket.CLOSED || wsState === WebSocket.CLOSING) {
          setReconnectKey(prev => prev + 1);
        }
      }
    }, 10000); // 10s fallback

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, [code, user, nickname, reconnectKey]);

  // Handle visibility change to refresh state and reconnect WS if needed
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === "visible" && code) {
        console.debug("[Visibility] Page visible/focused, refreshing state...");
        // Re-fetch everything immediately
        getState(code).then(s => { if (s && !s.error) setState(s); }).catch(() => { });
        getParticipants(code).then(d => { if (d.participants) setParticipants(d.participants); }).catch(() => { });
        
        // Se o WS estiver morto, oReconnectKey força o efeito acima a rodar e reconectar
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
          setReconnectKey(prev => prev + 1);
        }
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleSync);
    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [code]);

  // Fetch participants once on mount (WebSocket will keep it updated)
  useEffect(() => {
    if (!code) return;
    getParticipants(code)
      .then(data => {
        if (data.participants) {
          setParticipants(data.participants);
        }
      })
      .catch(() => { });
  }, [code]);

  // Refresh song library when tab changes to saved
  useEffect(() => {
    if (tab === "saved") {
      getSongLibrary()
        .then(setSongLibrary)
        .catch(() => { });
    }
  }, [tab]);

  // Extract video ID from YouTube URL or return null
  const extractVideoId = (input: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Just the ID
    ];
    for (const p of patterns) {
      const m = input.trim().match(p);
      if (m) return m[1];
    }
    return null;
  };

  // Check if current input looks like a YouTube link
  const isLinkMode = extractVideoId(searchQuery) !== null;

  // Filter library songs that match query
  const matchingLibrarySongs = searchQuery.trim()
    ? songLibrary.filter(song =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  // Reaction pill hides while search UI is open so it never covers the "+" buttons
  const searchOpen = searching || searchResults.length > 0 || matchingLibrarySongs.length > 0;

  const handleSearch = useCallback(async (query: string, abortSignal: AbortSignal) => {
    query = query.trim();
    if (!query) return;

    setSearchError(null);
    setIsSearchCongested(false);
    setSearchQueuePosition(null);
    setSearching(true);

    // Check if it's a YouTube link
    const videoId = extractVideoId(query);
    if (videoId) {
      // It's a link - fetch video info from YouTube
      try {
        const info = await getVideoInfo(videoId, abortSignal);
        if (abortSignal.aborted) return;
        setSearchResults([
          {
            videoId,
            title: info.title || `YouTube Video (${videoId})`,
            thumbnail: info.thumbnail,
            channelTitle: info.channelTitle || t("mobile.pastedLink", "Link colado"),
          },
        ]);
        // Pre-fill custom title if we got one
        if (info.title && !customTitle) {
          setCustomTitle(info.title);
        }
      } catch {
        if (abortSignal.aborted) return;
        // Fallback if API fails
        setSearchResults([
          {
            videoId,
            title: `YouTube Video (${videoId})`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            channelTitle: t("mobile.pastedLink", "Link colado"),
          },
        ]);
      }
      setSearching(false);
      setSearchQueuePosition(null);
      return;
    }

    // If there are matching library songs, don't search YouTube yet
    // User can click "Buscar no YouTube" if they want more results
    const libMatches = songLibrary.filter(song =>
      song.title.toLowerCase().includes(query.toLowerCase())
    );
    if (libMatches.length > 0) {
      setSearchResults([]);
      setSearching(false);
      setSearchQueuePosition(null);
      return;
    }

    // No saved songs match - search YouTube
    setSearchResults([]);
    try {
      const results = await searchYouTube(query, abortSignal, myUserId, code);
      if (abortSignal.aborted) return;
      if (results.length === 0) {
        setSearchError(
          t("mobile.noSongFound", "No song found. Try another term or paste YouTube link.")
        );
      }
      setSearchResults(results);
    } catch (err: any) {
      if (abortSignal.aborted) return;
      console.error("Search error:", err);
      if (err.message?.includes("SEARCH_FAILED_429")) {
        setIsSearchCongested(true);
      } else {
        setSearchError(
          t("mobile.searchError", "Search error. Try again or paste YouTube link.")
        );
      }
    }
    setSearching(false);
    setSearchQueuePosition(null);
  }, [customTitle, songLibrary, t, myUserId, code]);

  const triggerDebouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    debounceTimerRef.current = setTimeout(() => {
      searchAbortRef.current = new AbortController();
      handleSearch(query, searchAbortRef.current.signal);
    }, 400); // 400ms debounce
  }, [handleSearch]);

  const handleManualSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    
    searchAbortRef.current = new AbortController();
    handleSearch(searchQuery, searchAbortRef.current.signal);
  }, [searchQuery, handleSearch]);

  const handleSearchYouTube = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    const query = searchQuery.trim();
    if (!query) return;

    setSearchError(null);
    setIsSearchCongested(false);
    setSearchQueuePosition(null);
    setSearching(true);
    setSearchResults([]);

    searchAbortRef.current = new AbortController();
    try {
      const results = await searchYouTube(query, searchAbortRef.current.signal, myUserId, code);
      if (results.length === 0) {
        setSearchError(t("mobile.noSongFound", "No song found on YouTube."));
      }
      setSearchResults(results);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (err.message?.includes("SEARCH_FAILED_429")) {
        setIsSearchCongested(true);
      } else {
        setSearchError(t("mobile.searchError", "Search error. Try again."));
      }
    }
    setSearching(false);
    setSearchQueuePosition(null);
  };

  // Opens modal to choose solo/duet for search result
  const handleAddFromSearch = (result: YouTubeSearchResult) => {
    if (cooldownRemaining > 0) return;
    const title =
      isLinkMode && customTitle.trim() ? customTitle.trim() : result.title;
    openAddSongModal(result.videoId, title, "search", result.duration);
  };

  const handleDeleteSaved = async (songId: string) => {
    await deleteSong(songId);
    setSongLibrary(prev => prev.filter(s => s.id !== songId));
  };

  // Abre o modal para escolher solo/dueto
  const openAddSongModal = (
    videoId: string,
    title: string,
    source: "search" | "library" | "top",
    duration?: number
  ) => {
    setAddSongModal({ videoId, title, source, duration });
    setModalPartner(""); // Reset partner selection
  };

  // Confirma a adição da música do modal
  const handleConfirmAddSong = async () => {
    if (!code || !addSongModal) return;

    const partner = participants.find(p => p.id === modalPartner);
    const deviceFP = await getDeviceFingerprint();

    setAdding(addSongModal.videoId);
    try {
      // Fetch missing duration (e.g. cached search results without it)
      let duration = addSongModal.duration;
      if (!duration) {
        const info = await getVideoInfo(addSongModal.videoId).catch(() => null);
        duration = info?.duration;
      }
      const result = await enqueue(
        code,
        addSongModal.videoId,
        addSongModal.title,
        nickname,
        partner?.name || undefined,
        myUserId,
        partner?.id || undefined,
        deviceFP,
        duration
      );
      if (result?.error) {
        showToast(result.message || t("mobile.addError", "Não foi possível adicionar. Tente de novo."));
      } else {
        const position = (state?.queue.length ?? 0) + 1;
        showToast(t("mobile.addedToQueue", { position }));
      }
    } catch {
      showToast(t("mobile.addError", "Não foi possível adicionar. Tente de novo."));
    }
    setAdding(null);
    setAddSongModal(null);
    setModalPartner("");

    // Clear search field and results after adding any song
    setSearchResults([]);
    setSearchQuery("");
    setCustomTitle("");
    setSearchError(null);
    setSavedFilter(""); // Also clear library filter

    // Refresh library
    getSongLibrary()
      .then(setSongLibrary)
      .catch(() => { });
  };

  const handleQueueRemove = async (itemId: string) => {
    if (!code) return;
    if (!window.confirm(t("mobile.confirmRemove", "Remover esta música da fila?"))) return;
    try {
      await removeQueueItem(code, itemId, myUserId);
    } catch (err) {
      console.error("Error removing song", err);
    }
  };

  // Legacy function - now opens modal
  const handleAddFromSaved = (song: SavedSong) => {
    openAddSongModal(song.videoId, song.title, "library");
  };

  // Loading state while checking auth
  if (authLoading || !user) {
    return (
      <div
        className="container"
        style={{ paddingTop: 60, textAlign: "center" }}
      >
        <h2>{t("home.loading", "Carregando...")}</h2>
      </div>
    );
  }

  // Show error screen for room_not_found
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div className="glass-card" style={{ padding: "40px", textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "20px" }}>⚠️</div>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontWeight: "900" }}>{error}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px", lineHeight: 1.6 }}>
            {t("mobile.invalidCode", "O código da sala parece ser inválido ou expirou.")}
          </p>
          <button onClick={() => navigate("/")} className="glow-pulse" style={{ width: "100%" }}>
            {t("common.backToHome", "Voltar ao Início")}
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Logo width={180} />
        <div style={{ marginTop: "40px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="pulse-dot" style={{ background: "#FF0080" }}></div>
          <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", letterSpacing: "2px" }}>
            {t("mobile.connecting", { code }).toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      color: "#fff",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      paddingBottom: "120px",
      position: "relative",
      overflowX: "hidden"
    }}>
      {/* Animated Blobs for depth */}
      <div className="blob blob-1" style={{ top: "10%", left: "5%" }}></div>
      <div className="blob blob-2" style={{ bottom: "20%", right: "10%" }}></div>
      {/* Removed obsolete mobile-header-left style */}
      {/* Header Sticky Glass */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "rgba(10, 10, 10, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }} className="mobile-header-left">
          <div style={{
            background: "rgba(255, 0, 128, 0.1)",
            color: "#FF0080",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: "900",
            letterSpacing: "1px",
            border: "1px solid rgba(255, 0, 128, 0.2)"
          }}>
            {code}
          </div>
        </div>
        <div style={{ 
          position: "absolute", 
          left: "50%", 
          transform: "translateX(-50%)", 
          display: "flex", 
          alignItems: "center" 
        }}>
          <Logo width={110} />
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
          <button
            onClick={shareRoom}
            aria-label={t("mobile.share", "Convidar amigos")}
            title={t("mobile.share", "Convidar amigos")}
            style={{
              padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "none"
            }}
          >
            <IconShare size={20} />
          </button>
          <button
            onClick={() => { setNameInput(nickname); setNameError(null); setShowNameModal(true); }}
            aria-label={t("mobile.changeNickname", "Alterar Apelido")}
            style={{
              padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "none"
            }}
          >
            <IconUser size={20} />
          </button>
        </div>
      </div>

      {/* Modal para mudar nome - Glass implementation */}
      {showNameModal && (
        <div
          onClick={() => { setShowNameModal(false); setNameError(null); }}
          style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: "20px"
        }}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ padding: "32px", width: "100%", maxWidth: "380px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.25rem", fontWeight: "900", textAlign: "center" }}>
              {t("mobile.changeNickname", "Alterar Apelido")}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", textAlign: "center", marginBottom: "24px", lineHeight: 1.5 }}>
              {t("mobile.nameDesc", "Como as outras pessoas verão seu nome na sala e no ranking.")}
            </p>

            {nameError && (
              <div style={{
                background: "rgba(255, 68, 68, 0.15)", color: "#ff4444",
                padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center",
                border: "1px solid rgba(255, 68, 68, 0.3)"
              }}>
                {nameError}
              </div>
            )}

            <input
              type="text" value={nameInput}
              onChange={e => { setNameInput(e.target.value); if (nameError) setNameError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              placeholder={t("mobile.typeNickname", "Digite seu apelido")}
              autoFocus
              style={{ width: "100%", marginBottom: "24px" }}
            />

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => { setShowNameModal(false); setNameError(null); }}
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "14px" }}
              >
                {t("common.cancel", "Cancelar")}
              </button>
              <button
                onClick={handleSaveName}
                disabled={!nameInput.trim()}
                className="glow-pulse"
                style={{ flex: 1, padding: "14px", fontWeight: "700" }}
              >
                {t("common.save", "Salvar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Pills Design */}
      <div style={{
        padding: "20px 20px 10px",
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        scrollbarWidth: "none"
      }}>
        {[
          { id: "queue", label: t("mobile.queue", "Fila"), icon: <IconMusic size={16} /> },
          { id: "ranking", label: t("tv.ranking", "Ranking"), icon: <IconTrophy size={16} /> },
          { id: "saved", label: t("mobile.songs", "Músicas"), icon: <IconLibrary size={16} /> },
          { id: "history", label: t("mobile.history", "Tocadas"), icon: <IconHistory size={16} /> }
        ].map(t_item => (
          <button
            key={t_item.id}
            onClick={() => setTab(t_item.id as Tab)}
            style={{
              flex: "1 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: "700",
              height: "44px",
              background: tab === t_item.id ? "#FF0080" : "rgba(255,255,255,0.05)",
              color: tab === t_item.id ? "#fff" : "rgba(255,255,255,0.5)",
              border: tab === t_item.id ? "1px solid rgba(255,0,128,0.3)" : "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              whiteSpace: "nowrap",
              boxShadow: tab === t_item.id ? "0 4px 15px rgba(255,0,128,0.3)" : "none"
            }}
          >
            {t_item.icon} {t_item.label}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="card">
          <h3>{t("mobile.queue", "Queue")} ({state.queue.length})</h3>

          {/* Música tocando agora */}
          {state.nowPlaying ? (
            <div
              style={{
                background: "linear-gradient(135deg, #7c4dff 0%, #ff4081 100%)",
                margin: "-10px -10px 16px",
                padding: 16,
                borderRadius: "8px 8px 0 0",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.8,
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconMusic size={14} /> {t("mobile.nowPlaying", "Now playing")}
              </div>
              <div
                style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}
              >
                <TruncatedText text={state.nowPlaying.title} maxLength={50} />
              </div>
              <div style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.45)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6, marginBottom: isHost ? 12 : 0 }}>
                <IconMic size={14} />
                {state.nowPlaying.singers
                  ?.map(s => (typeof s === "string" ? s : s.name))
                  .join(" e ") || state.nowPlaying.requestedBy}
              </div>
              {isHost && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      if (code) {
                        sendPlayerCommand(code, isPlaying ? "pause" : "play", myUserId);
                        setIsPlaying(!isPlaying);
                      }
                    }}
                    style={{
                      flex: 1,
                      background: isPlaying ? "#e67e22" : "#2ecc71",
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {isPlaying ? (
                      <>
                        <IconPause size={16} /> {t("common.pause", "Pause")}
                      </>
                    ) : (
                      <>
                        <IconPlay size={16} /> {t("common.continue", "Continue")}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => code && finalizeSong(code, nickname, myUserId)}
                    style={{
                      flex: 1,
                      background: "#e74c3c",
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <IconSkipForward size={16} /> {t("common.skip", "Skip")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: "#2a2a2a",
                margin: "-10px -10px 16px",
                padding: 16,
                borderRadius: "8px 8px 0 0",
                textAlign: "center",
              }}
            >
              {state.showingScore ? (
                <>
                  <div
                    style={{
                      color: "#f1c40f",
                      marginBottom: 8,
                      fontSize: "1.1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <IconTrophy size={20} /> {t("mobile.calculatingScore", "Calculating score...")}
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.62)", margin: 0 }}>
                    {t("mobile.waitTV", "Wait for TV to show result")}
                  </p>
                </>
              ) : state.queue.length > 0 ? (
                <>
                  <div
                    style={{
                      color: "#fff",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <IconMusic size={16} /> {t("mobile.upNext", "Up next")}:{" "}
                    <strong>{state.queue[0].title}</strong>
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.62)",
                      fontSize: "0.9rem",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <IconMic size={14} />
                    {state.queue[0].singers
                      ?.map(s => (typeof s === "string" ? s : s.name))
                      .join(" e ") || state.queue[0].requestedBy}
                    {formatDuration(state.queue[0].duration) && (
                      <span style={{ fontWeight: "600", color: "rgba(255,255,255,0.5)" }}>⏱ {formatDuration(state.queue[0].duration)}</span>
                    )}
                  </div>
                  {isHost ? (
                    <button
                      onClick={() => code && nextSong(code, myUserId)}
                      style={{
                        background: "#2ecc71",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <IconPlay size={18} /> {t("mobile.start", "Start!")}
                    </button>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", margin: 0 }}>
                      {t("mobile.waitingHost", "Waiting for Host...")}
                    </p>
                  )}
                </>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.62)" }}>{t("mobile.queueEmptySearch", "Queue is empty - search for a song below!")}</span>
              )}
            </div>
          )}

          {/* Próximas na fila */}
          {state.queue.length === 0 ? (
            state.nowPlaying && (
              <p style={{ color: "rgba(255,255,255,0.62)" }}>
                {t("mobile.queueEmptySearch", "Queue is empty - search for a song below!")}
              </p>
            )
          ) : queueList.length > 0 && (
            <>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: "12px", fontWeight: "700", letterSpacing: "1px" }}>
                {t("mobile.upNextList", "Próximas na fila").toUpperCase()}:
              </div>
              {(showAllQueue ? queueList : queueList.slice(0, 5)).map((item, i) => {
                const singers = item.singers || [];
                const singerNames = singers.map(s => typeof s === "string" ? s : s.name);
                const singersDisplay = singerNames.length > 1 ? singerNames.join(" e ") : singerNames[0] || item.requestedBy;
                const absIndex = i + (upNextInBox ? 1 : 0);
                // Estimate time until this song starts (sum of durations of songs before it)
                const before = (state?.queue ?? []).slice(0, absIndex);
                const estMinutes = before.reduce((acc, it) => acc + (it.duration || 0), 0) > 0
                  ? Math.max(1, Math.round(before.reduce((acc, it) => acc + (it.duration || 0), 0) / 60))
                  : null;
                const isMine = item.requesterId === myUserId;
                return (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    background: "rgba(255,255,255,0.03)", borderRadius: "16px",
                    padding: "16px", marginBottom: "12px", border: isMine ? "1px solid rgba(255,0,128,0.35)" : "1px solid rgba(255,255,255,0.05)",
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: "950", color: "#FF0080", minWidth: "28px", textAlign: "center", opacity: 0.8 }}>
                      {String(absIndex + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "700", color: "#B983FF" }}>{singersDisplay}</span>
                        {formatDuration(item.duration) && (
                          <span style={{ fontWeight: "600", color: "rgba(255,255,255,0.5)" }}>⏱ {formatDuration(item.duration)}</span>
                        )}
                        {isMine && estMinutes !== null && (
                          <span style={{ fontWeight: "800", color: "#FF0080" }}>{t("mobile.yourTurn", "Sua vez em ~{{min}} min", { min: estMinutes })}</span>
                        )}
                      </div>
                    </div>
                    {(isHost || item.requesterId === myUserId) && (
                      <button
                        onClick={() => handleQueueRemove(item.id)}
                        aria-label={t("mobile.removeFromQueue", "Remover da fila")}
                        style={{
                          padding: "10px", background: "rgba(255, 68, 68, 0.1)",
                          color: "#ff4444", border: "1px solid rgba(255, 68, 68, 0.15)",
                          borderRadius: "12px", height: "42px", width: "42px", flexShrink: 0
                        }}
                      >
                        <IconTrash size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
              {queueList.length > 5 && (
                <button
                  onClick={() => setShowAllQueue(!showAllQueue)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)", marginTop: "12px",
                    padding: "12px", fontSize: "0.85rem", borderRadius: "12px", fontWeight: "700",
                    color: "rgba(255,255,255,0.6)"
                  }}
                >
                  {showAllQueue ? t("mobile.showLess", "▲ Ver menos") : t("mobile.showMore", { count: queueList.length - 5 })}
                </button>
              )}
            </>
          )}

          {/* Buscar música */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h4
              style={{
                margin: "0 0 8px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "1rem",
                fontWeight: 800,
                color: "#fff",
              }}
            >
              <IconSearch size={16} /> {t("mobile.addSong", "Add song")}
            </h4>

            <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "0.8rem", marginBottom: 12 }}>
              {t("mobile.pasteLink", "Paste a YouTube link or type song name")}
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: isLinkMode ? 8 : 12,
              }}
            >
              <input
                placeholder={t("mobile.linkOrNamePlaceholder", "Link or song name...")}
                value={searchQuery}
                onChange={e => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim() === "") {
                    setSearchResults([]);
                    setSearchError(null);
                    if (searchAbortRef.current) searchAbortRef.current.abort();
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  } else {
                    triggerDebouncedSearch(val);
                  }
                }}
                onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                style={{ flex: 1, minWidth: 0, margin: 0, height: 48 }}
              />
              <button
                onClick={handleManualSearch}
                disabled={searching || !searchQuery.trim()}
                style={{
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  height: 48,
                  borderRadius: 12,
                  padding: "0 20px",
                  border: "none",
                  background: searching ? "rgba(255,255,255,0.08)" : "#FF0080",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: searching || !searchQuery.trim() ? "not-allowed" : "pointer",
                  opacity: searching || !searchQuery.trim() ? 0.5 : 1,
                }}
              >
                {searching ? "…" : t("mobile.search", "Search")}
              </button>
            </div>

            {/* Cooldown: buscar é livre, adicionar é que espera */}
            {cooldownRemaining > 0 && (
              <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "0.8rem", marginTop: -8, marginBottom: 12 }}>
                ⏱ {t("mobile.cooldownHint", {
                  time: `${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, "0")}`
                })}
              </p>
            )}

            {/* Campo de título quando é link */}
            {isLinkMode && (
              <input
                placeholder={t("mobile.optionalNamePlaceholder", "Nome da música (opcional)")}
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                style={{ marginBottom: 12 }}
              />
            )}

            {/* Músicas da biblioteca que batem com a busca */}
            {!isLinkMode && matchingLibrarySongs.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconLibrary size={14} /> {t("mobile.inLibrary", "Na biblioteca")}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                    {matchingLibrarySongs.slice(0, 5).map(song => (
                      <div
                        key={song.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: "16px",
                          padding: "14px",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <img
                          src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
                          alt="Thumbnail"
                          style={{
                            width: 112,
                            height: 84,
                            objectFit: "cover",
                            borderRadius: 8,
                            flexShrink: 0,
                          }}
                        />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: "#fff",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.3,
                        }}
                      >
                          {cleanTitle(song.title)}
                        </span>
                      <button
                        onClick={() => handleAddFromSaved(song)}
                        disabled={adding === song.videoId || cooldownRemaining > 0}
                        aria-label={t("mobile.addToQueue", "Adicionar à Fila")}
                        style={{
                          padding: "10px",
                          background: adding === song.videoId ? "#2ecc71" : (cooldownRemaining > 0 ? "rgba(255,255,255,0.05)" : "#FF0080"),
                          borderRadius: "10px",
                          border: "none",
                          color: "#fff",
                          cursor: cooldownRemaining > 0 ? "not-allowed" : "pointer",
                          opacity: cooldownRemaining > 0 ? 0.3 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "background 0.2s ease",
                        }}
                      >
                        {adding === song.videoId ? (
                          <span style={{ fontSize: "0.8rem" }}>✓</span>
                        ) : cooldownRemaining > 0 ? (
                          <span style={{ fontSize: "0.75rem" }}>{t("common.wait", "Aguarde")}</span>
                        ) : (
                          <IconPlus size={18} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                {searchResults.length === 0 && !searching && (
                  <button
                    onClick={handleSearchYouTube}
                    style={{
                      width: "100%",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.62)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.62)"; }}
                  >
                    <IconSearch size={16} /> {t("mobile.searchYouTubeToo", "Buscar no YouTube também")}
                  </button>
                )}
              </>
            )}

            {/* Resultados da busca */}
            {searching && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                {searchQueuePosition && searchQueuePosition > 1 ? (
                  <div style={{ 
                    padding: "16px", 
                    background: "rgba(230, 126, 34, 0.1)", 
                    border: "1px solid rgba(230, 126, 34, 0.3)", 
                    borderRadius: "12px",
                    textAlign: "center",
                    marginBottom: 8,
                    animation: "pulse 2s infinite"
                  }}>
                    <p style={{ color: "#e67e22", margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>
                      ⚠️ {t("mobile.manySearching", "Many people searching...")}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.7)", margin: "4px 0 0", fontSize: "0.85rem" }}>
                      {t("mobile.searchQueuePosition", { 
                        position: searchQueuePosition, 
                        total: searchQueueTotal 
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="pulse-text" style={{ color: "var(--accent)", textAlign: "center", marginBottom: 8, fontWeight: 500 }}>
                    {loadingMessages[loadingStep]}
                  </p>
                )}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer" style={{ height: 80, width: "100%" }} />
                ))}
              </div>
            )}
            {isSearchCongested && (
              <div style={{ 
                padding: "20px", 
                background: "rgba(231, 76, 60, 0.1)", 
                border: "1px solid rgba(231, 76, 60, 0.3)", 
                borderRadius: "16px",
                textAlign: "center",
                marginBottom: "20px"
              }}>
                <IconAlertTriangle size={32} style={{ color: "#e74c3c", marginBottom: "12px", margin: "0 auto" }} />
                <h4 style={{ color: "#e74c3c", margin: "0 0 8px", fontWeight: "900", fontSize: "1.05rem" }}>
                  {t("mobile.searchCongested", "Busca Congestionada")}
                </h4>
                <p style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {t("mobile.searchCongestedDesc", "Muitas pessoas estão buscando música agora. Para ir mais rápido, cole o link do YouTube diretamente no campo de busca.")}
                </p>
              </div>
            )}
            {searchError && (
              <p
                style={{
                  color: "#e74c3c",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                {searchError}
              </p>
            )}
            {searchResults.length > 0 && (
              <>
                {matchingLibrarySongs.length > 0 && (
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: 8,
                    }}
                  >
                    {t("mobile.youtubeResults", "YouTube:")}
                  </div>
                )}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {searchResults.map((result, idx) => (
                    <div
                      key={result.videoId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "16px",
                        padding: "14px",
                        border: "1px solid rgba(255,255,255,0.10)",
                        animation: `fadeInUp 0.3s ease ${idx * 0.05}s both`,
                      }}
                    >
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <img
                          src={result.thumbnail}
                          alt="Thumbnail"
                          style={{
                            width: 112,
                            height: 84,
                            objectFit: "cover",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                          onClick={() => setPreviewVideo(result)}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreviewVideo(result)}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.12)",
                              backdropFilter: "blur(6px)",
                              WebkitBackdropFilter: "blur(6px)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                              color: "rgba(255,255,255,0.9)",
                              transition: "background 0.2s ease, transform 0.2s ease",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "scale(1.1)" }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "scale(1)" }}
                          >
                            <IconPlay size={18} />
                          </div>
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            color: "#fff",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.3,
                          }}
                        >
                          {cleanTitle(result.title)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFromSearch(result)}
                        disabled={adding === result.videoId || cooldownRemaining > 0}
                        aria-label={t("mobile.addToQueue", "Adicionar à Fila")}
                        style={{
                          padding: "10px",
                          background: adding === result.videoId ? "#2ecc71" : (cooldownRemaining > 0 ? "rgba(255,255,255,0.05)" : "#FF0080"),
                          borderRadius: "10px",
                          border: "none",
                          color: "#fff",
                          cursor: cooldownRemaining > 0 ? "not-allowed" : "pointer",
                          opacity: cooldownRemaining > 0 ? 0.3 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "background 0.2s ease",
                        }}
                      >
                        {adding === result.videoId ? (
                          <span style={{ fontSize: "0.9rem" }}>✓</span>
                        ) : cooldownRemaining > 0 ? (
                          <span style={{ fontSize: "0.75rem" }}>{t("common.wait", "Aguarde")}</span>
                        ) : (
                          <IconPlus size={18} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "ranking" && (
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <button
              onClick={() => setRankingView("solo")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "12px",
                background: rankingView === "solo" ? "#FF0080" : "rgba(255,255,255,0.05)",
                color: "#fff",
                border: "none",
                fontWeight: "700",
              }}
            >
              {t("tv.solo", "Solo")}
            </button>
            <button
              onClick={() => setRankingView("duet")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "12px",
                background: rankingView === "duet" ? "#7928CA" : "rgba(255,255,255,0.05)",
                color: "#fff",
                border: "none",
                fontWeight: "700",
              }}
            >
              {t("tv.duet", "Dueto")}
            </button>
          </div>

          {rankingView === "solo" ? (
            Object.keys(state.ranking).length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🎤</div>
                <p style={{ color: "rgba(255,255,255,0.62)", margin: "0 0 24px" }}>{t("tv.nobodyScored", "Ninguém pontuou ainda")}</p>
                <button onClick={() => setTab("queue")} className="glow-pulse" style={{ padding: "14px 28px", fontWeight: "700" }}>
                  {t("mobile.singFirst", "Seja o primeiro a cantar!")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.entries(state.ranking)
                  .sort(([, a], [, b]) => b.score - a.score)
                  .map(([odUserId, entry], i) => (
                    <div key={odUserId} className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          width: "24px", height: "24px", borderRadius: "50%", background: i === 0 ? "#FFD700" : "rgba(255,255,255,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", color: i === 0 ? "#000" : "#fff"
                        }}>{i + 1}</span>
                        <span style={{ fontWeight: "700" }}>{entry.name}</span>
                      </div>
                      <span style={{ fontWeight: "700" }}>{entry.score} pts</span>
                    </div>
                  ))}
              </div>
            )
          ) : (!state.duetRanking || state.duetRanking.length === 0) ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🎤</div>
              <p style={{ color: "rgba(255,255,255,0.62)", margin: "0 0 24px" }}>{t("tv.noDuetScored", "Nenhuma dupla pontuou ainda")}</p>
              <button onClick={() => setTab("queue")} className="glow-pulse" style={{ padding: "14px 28px", fontWeight: "700" }}>
                {t("mobile.singFirstDuet", "Chame alguém para um dueto!")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[...state.duetRanking]
                .sort((a, b) => b.score - a.score)
                .map((duet, i) => (
                  <div key={duet.names.join("-")} className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{
                        width: "24px", height: "24px", borderRadius: "50%", background: i === 0 ? "#FFD700" : "rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", color: i === 0 ? "#000" : "#fff"
                      }}>{i + 1}</span>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "700" }}>{duet.names[0]} & {duet.names[1]}</span>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                          {duet.count} {duet.count > 1 ? t("mobile.songs", "músicas") : t("mobile.song", "música")}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontWeight: "700" }}>{duet.score} pts</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === "saved" && (
        <div style={{ padding: "10px 20px" }}>
          {/* Top Songs Section */}
          {topSongs.length > 0 && (
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <IconTrendingUp size={20} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900" }}>{t("mobile.mostPlayed", "Mais Tocadas")}</h3>
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "20px" }}>
                {t("mobile.mostPopular", "As músicas mais populares em todas as festas.")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {topSongs.slice(0, 5).map((song, i) => (
                  <div key={song.videoId} style={{
                    display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)",
                    padding: "12px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", background: i === 0 ? "#FFD700" : "rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "900", color: i === 0 ? "#000" : "#fff"
                    }}>{i + 1}</div>
                    <img src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`} alt="Thumbnail" style={{ width: "72px", height: "54px", objectFit: "cover", borderRadius: "8px" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#fff" }}><TruncatedText text={cleanTitle(song.title)} maxLength={35} /></div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{song.playCount} {song.playCount === 1 ? t("mobile.playTime", "play") : t("mobile.playTimes", "plays")}</div>
                    </div>
                    <button
                      onClick={() => openAddSongModal(song.videoId, song.title, "top")}
                      disabled={adding === song.videoId || cooldownRemaining > 0}
                      style={{
                        padding: "10px", background: "#FF0080", borderRadius: "10px", opacity: cooldownRemaining > 0 ? 0.3 : 1
                      }}
                    >
                      <IconPlus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Library Section */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <IconLibrary size={20} />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900" }}>{t("mobile.library", "Minha Biblioteca")}</h3>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "20px" }}>
              {t("mobile.libraryDesc", "Músicas que as pessoas da sala já salvaram.")}
            </p>

            {songLibrary.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
                <IconMusic size={48} />
                <p>{t("mobile.libraryEmpty", "A biblioteca da sala está vazia.")}</p>
              </div>
            ) : (
              <>
                <input
                  placeholder={t("mobile.filterSongs", "Filtrar músicas...")}
                  value={savedFilter}
                  onChange={e => setSavedFilter(e.target.value)}
                  style={{ marginBottom: "20px" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {songLibrary.filter(song => song.title.toLowerCase().includes(savedFilter.toLowerCase())).map(song => (
                    <div key={song.id} style={{
                      display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)",
                      padding: "12px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      <img src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`} alt="Thumbnail" style={{ width: "72px", height: "54px", objectFit: "cover", borderRadius: "8px" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#fff" }}><TruncatedText text={cleanTitle(song.title)} maxLength={40} /></div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{t("mobile.addedBy", "por")} {song.addedBy}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleAddFromSaved(song)}
                          disabled={adding === song.videoId || cooldownRemaining > 0}
                          aria-label={t("mobile.addToQueue", "Adicionar à Fila")}
                          style={{
                            padding: "10px", background: "#FF0080", borderRadius: "10px", opacity: cooldownRemaining > 0 ? 0.3 : 1
                          }}
                        >
                          <IconPlus size={18} />
                        </button>
                        {isHost && (
                          <button
                            onClick={() => handleDeleteSaved(song.id)}
                            aria-label={t("mobile.removeFromLibrary", "Remover da biblioteca")}
                            style={{ padding: "10px", background: "rgba(255,68,68,0.1)", color: "#ff4444", borderRadius: "10px", border: "1px solid rgba(255,68,68,0.2)" }}
                          >
                            <IconTrash size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <h3>{t("mobile.history", "Tocadas")} ({state?.history?.length ?? 0})</h3>
          {(state?.history?.length ?? 0) === 0 && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
              {t("mobile.historyEmpty", "Nada tocado ainda nesta sala.")}
            </p>
          )}
          {(state?.history ?? []).map(item => {
            const singers = item.singers || [];
            const singerNames = singers.map(s => typeof s === "string" ? s : s.name);
            const singersDisplay = singerNames.length > 1 ? singerNames.join(" e ") : singerNames[0] || item.requestedBy;
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: "16px",
                background: "rgba(255,255,255,0.03)", borderRadius: "16px",
                padding: "14px 16px", marginBottom: "12px", border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cleanTitle(item.title)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "700", color: "#B983FF" }}>{singersDisplay}</span>
                    {formatDuration(item.duration) && <span>⏱ {formatDuration(item.duration)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleEncore(item)}
                  disabled={adding === item.videoId || cooldownRemaining > 0}
                  title={t("mobile.encore", "Tocar de novo")}
                  className="glow-pulse"
                  style={{ padding: "10px 14px", borderRadius: "12px", background: "#FF0080", color: "#fff", border: "none", fontWeight: "700", fontSize: "0.9rem", whiteSpace: "nowrap", opacity: adding === item.videoId ? 0.6 : 1 }}
                >
                  {adding === item.videoId ? "..." : t("mobile.encore", "Encore")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals & Reactions */}
      {previewVideo && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)", display: "flex", flexDirection: "column", padding: "20px", zIndex: 3000
        }}>
          <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => setPreviewVideo(null)} 
              style={{ 
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "40px", 
                height: "40px",
                padding: "0",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                border: "1px solid rgba(255, 255, 255, 0.2)",
                cursor: "pointer",
                zIndex: 100,
                overflow: "hidden",
                transition: "background-color 0.2s ease"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="glass-card" style={{ padding: "20px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
              <iframe
                src={`https://www.youtube.com/embed/${previewVideo.videoId}?autoplay=1`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                allow="autoplay; encrypted-media" allowFullScreen
              />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: "900", color: "#fff" }}>{cleanTitle(previewVideo.title)}</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "24px", fontSize: "0.9rem" }}>{previewVideo.channelTitle}</p>
            <button
              onClick={() => { handleAddFromSearch(previewVideo); setPreviewVideo(null); }}
              disabled={adding === previewVideo.videoId || cooldownRemaining > 0}
              className="glow-pulse"
              style={{ width: "100%", padding: "16px", fontWeight: "700", background: "#FF0080", borderRadius: "12px", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              {adding === previewVideo.videoId ? "..." : <><IconPlus size={20} /> {t("mobile.addToQueue", "Adicionar à Fila")}</>}
            </button>
          </div>
        </div>
      )}

      {addSongModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 3000,
          animation: "fadeIn 0.25s ease-out",
        }}>
          <div className="glass-card" style={{ padding: "32px", width: "100%", maxWidth: "380px", border: "1px solid rgba(255,255,255,0.2)", animation: "fadeInUp 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: "900", letterSpacing: "1px", marginBottom: "8px", textTransform: "uppercase" }}>{t("mobile.soloOrDuet", "Solo ou dueto?")}</div>
            <h3 style={{ margin: "0 0 24px", fontSize: "1.25rem", fontWeight: "900", lineHeight: 1.3, color: "#fff" }}>{cleanTitle(addSongModal.title)}</h3>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "12px" }}>
                {t("mobile.whoWillSing", "Quem vai cantar?")}:
              </label>
              <select
                value={modalPartner} onChange={e => setModalPartner(e.target.value)}
                style={{ width: "100%", padding: "14px", height: "54px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
              >
                <option value="" style={{ background: "#000" }}>{t("mobile.alone", "Vou cantar sozinho(a)")}</option>
                {participants.filter(p => p.id !== myUserId).map(p => (
                  <option key={p.id} value={p.id} style={{ background: "#000" }}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setAddSongModal(null)}
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "14px", borderRadius: "12px" }}
              >
                {t("common.cancel", "Cancelar")}
              </button>
              <button
                onClick={handleConfirmAddSong}
                disabled={adding === addSongModal.videoId || cooldownRemaining > 0}
                className="glow-pulse"
                style={{ flex: 1, padding: "14px", fontWeight: "700", background: "#FF0080", borderRadius: "12px", border: "none", color: "#fff" }}
              >
                {t("common.confirm", "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster
        position="top-right"
        containerStyle={{ top: "76px", zIndex: 3000 }}
        toastOptions={{ duration: 4000 }}
      />
      {!searchOpen && (
      <div style={{
        position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: "12px", zIndex: 100, background: "rgba(10, 10, 10, 0.6)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        padding: "10px 16px", borderRadius: "32px", border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
      }}>
        {reactionBursts.map(b => (
          <span key={b.id} className="reaction-burst" style={{ left: `calc(50% + ${b.x}px)` }}>
            {b.emoji}
          </span>
        ))}
        {["⭐", "👏", "🎤", "🔥"].map(emoji => (
          <button
            key={emoji} 
            onClick={() => {
              if (emoji === "⭐") {
                setShowRatingModal(true);
              } else {
                sendReaction(emoji);
              }
            }}
            aria-label={emoji === "⭐" ? t("mobile.rateSinger", "Avaliar Cantor") : t("mobile.sendReaction", { emoji })}
            style={{
              width: "48px", height: "48px", padding: "0", borderRadius: "50%", fontSize: "22px",
              background: "rgba(255,255,255,0.05)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}
            onPointerDown={e => (e.currentTarget.style.transform = "scale(0.85)")}
            onPointerUp={e => {
              const el = e.currentTarget;
              el.style.transform = "scale(1.2)";
              setTimeout(() => { el.style.transform = "scale(1)"; }, 150);
            }}
            onPointerCancel={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {emoji}
          </button>
        ))}
        <button
          key="more" onClick={() => setShowEmojiPicker(true)}
          aria-label={t("mobile.moreReactions", "Mais reações")}
          title={t("mobile.moreReactions", "Mais reações")}
          style={{
            width: "48px", height: "48px", padding: "0", borderRadius: "50%", fontSize: "22px",
            background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700",
            transition: "transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          }}
          onPointerDown={e => (e.currentTarget.style.transform = "scale(0.85)")}
          onPointerUp={e => { e.currentTarget.style.transform = "scale(1.15)"; setTimeout(() => { e.currentTarget.style.transform = "scale(1)"; }, 150); }}
          onPointerCancel={e => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          +
        </button>
      </div>
      )}

      {/* Rating picker modal */}
      {showRatingModal && (
        <div
          onClick={() => setShowRatingModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000,
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #1f1f22 0%, #121214 100%)", width: "100%", 
              borderTopLeftRadius: "32px", borderTopRightRadius: "32px",
              padding: "32px 24px", paddingBottom: "max(32px, env(safe-area-inset-bottom))",
              animation: "slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
              textAlign: "center"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#fff", letterSpacing: "-0.02em" }}>
                {t("mobile.rateSinger", "Avaliar Cantor")}
              </h3>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "28px", padding: "0 8px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px", marginBottom: "32px", lineHeight: 1.5 }}>
              {t("mobile.rateDescription", "Dê uma nota para a performance atual:")}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "24px" }}>
              {[1, 2, 3, 4, 5].map(star => {
                const isActive = selectedStar !== null && star <= selectedStar;
                return (
                  <button
                    key={star}
                    onClick={() => sendScore(star)}
                    style={{
                      background: "none", border: "none", padding: "0", cursor: "pointer",
                      outline: "none", WebkitTapHighlightColor: "transparent",
                      transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transform: isActive ? "scale(1.15)" : "scale(1)",
                    }}
                    onPointerDown={e => (e.currentTarget.style.transform = "scale(0.85)")}
                    onPointerUp={e => (e.currentTarget.style.transform = isActive ? "scale(1.15)" : "scale(1)")}
                    onPointerCancel={e => (e.currentTarget.style.transform = isActive ? "scale(1.15)" : "scale(1)")}
                  >
                    <svg 
                      width="44" height="44" viewBox="0 0 24 24" 
                      fill={isActive ? "#facc15" : "none"} 
                      stroke={isActive ? "#facc15" : "rgba(255,255,255,0.15)"} 
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        transitionDelay: isActive ? `${star * 50}ms` : "0ms",
                        filter: isActive ? "drop-shadow(0 0 12px rgba(250,204,21,0.6))" : "none",
                        transform: isActive ? "rotate(0deg)" : "rotate(-5deg)",
                      }}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Emoji picker modal */}
      {showEmojiPicker && (
        <div
          onClick={() => setShowEmojiPicker(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000,
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass-card"
            style={{
              padding: "24px", width: "100%", maxWidth: "420px", maxHeight: "70vh", display: "flex", flexDirection: "column",
              borderBottomLeftRadius: 0, borderBottomRightRadius: 0, animation: "fadeInUp 0.35s cubic-bezier(0.22,1,0.36,1)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase" }}>
                {t("mobile.pickReaction", "Escolha um emoji")}
              </span>
              <button
                onClick={() => setShowEmojiPicker(false)}
                aria-label={t("common.close", "Fechar")}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: "32px", height: "32px", padding: "0", borderRadius: "50%", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", overflowY: "auto" }}>
              {EXTRA_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { sendReaction(emoji); setShowEmojiPicker(false); }}
                  aria-label={t("mobile.sendReaction", { emoji })}
                  style={{
                    width: "52px", height: "52px", padding: "0", fontSize: "26px", border: "none", borderRadius: "12px",
                    background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s ease, transform 0.1s ease"
                  }}
                  onPointerDown={e => (e.currentTarget.style.transform = "scale(0.9)")}
                  onPointerUp={e => { e.currentTarget.style.transform = "scale(1.1)"; setTimeout(() => { e.currentTarget.style.transform = "scale(1)"; }, 150); }}
                  onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
