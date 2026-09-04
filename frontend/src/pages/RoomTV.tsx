import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  connectWS,
  finalizeSong,
  getState,
  moveQueueItem,
  nextSong,
  queueItemToTop,
  removeQueueItem,
  scoreDone,
} from "../api";
import ScoreOverlay from "../components/ScoreOverlay";
import Logo from "../components/Logo";
import toast, { Toaster } from "react-hot-toast";

// Declare global YouTube IFrame API types
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  requestedBy: string;
  singers?: { id: string; name: string }[];
}

interface DuetRankingEntry {
  names: [string, string];
  score: number;
  count: number;
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
}

type RankingView = "solo" | "duet";

interface FinalizedEvent {
  singer: string;
  score: number;
  title: string;
}

interface Reaction {
  id: string;
  emoji: string;
  name?: string;
  x: number;
  size?: number;
  duration?: number;
  delay?: number;
  targetY?: number;
  rotOffset?: number;
}

// Icon components
const IconChevronUp = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const IconChevronDown = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const IconChevronsUp = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="17 11 12 6 7 11"></polyline>
    <polyline points="17 18 12 13 7 18"></polyline>
  </svg>
);

const IconSkipForward = ({ size = 16 }: { size?: number }) => (
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
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const IconSkipBack = ({ size = 16 }: { size?: number }) => (
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
    <polygon points="19 20 9 12 19 4 19 20"></polygon>
    <line x1="5" y1="19" x2="5" y2="5"></line>
  </svg>
);

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

const IconX = ({ size = 16 }: { size?: number }) => (
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
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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

const IconUsers = ({ size = 16 }: { size?: number }) => (
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
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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

const ReactionDisplay = ({ reactions }: { reactions: Reaction[] }) => {
  return (
    <>
      {reactions.map(r => (
        <div
          key={r.id}
          style={{
            position: "absolute",
            bottom: -80,
            left: `${r.x}%`,
            fontSize: `${r.size || 56}px`,
            "--ty": `${r.targetY || -400}px`,
            "--rot": `${r.rotOffset || 10}`,
            animation: `organicFloatTV ${r.duration || 2.5}s ease-out ${r.delay || 0}s forwards`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.8))",
            zIndex: 9999,
          } as React.CSSProperties}
        >
          {r.name && (
            <span
              style={{
                fontSize: "18px",
                color: "#fff",
                fontWeight: 800,
                textShadow: "0 2px 8px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.5)",
                marginBottom: 6,
                whiteSpace: "nowrap",
                padding: "4px 12px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: "12px",
                backdropFilter: "blur(4px)",
              }}
            >
              {r.name}
            </span>
          )}
          {r.emoji}
        </div>
      ))}
    </>
  );
};

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
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const IconMaximize = ({ size = 16 }: { size?: number }) => (
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
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const IconMinimize = ({ size = 16 }: { size?: number }) => (
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
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

export default function RoomTV() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalized, setFinalized] = useState<FinalizedEvent | null>(null);
  const [rankingView, setRankingView] = useState<RankingView>("solo");
  const [autoRotate, setAutoRotate] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [tvToken, setTvToken] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [recentlyMoved, setRecentlyMoved] = useState<string[]>([]);
  const [reconnectKey, setReconnectKey] = useState(0);
  const isTransitioningRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reactionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const fullScreenWrapperRef = useRef<HTMLDivElement | null>(null);

  // Track previous queue for toasts
  const prevQueueRef = useRef<QueueItem[]>([]);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    document.title = "TV Mode | Room " + code + " | Karaoke Factory";
    const metaDesc = window.document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `Assista e cante no Room ${code} do Karaoke Factory.`);
    }
  }, [code]);

  // Toast notifications for new songs in queue
  useEffect(() => {
    if (!state) return;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevQueueRef.current = state.queue;
      return;
    }

    const newItems = state.queue.filter(
      item => !prevQueueRef.current.some(prev => prev.id === item.id)
    );

    const emojis = ["🎤","🎶","🎸","🥁","🎹","🎧","🔥","🌟","💃","🕺","🎉","🎊","✨","⭐","🎵"];
    const colors = [
      ["#FF0080","#7928CA"],
      ["#06b6d4","#0d9488"],
      ["#f59e0b","#ef4444"],
      ["#10b981","#ec4899"],
      ["#10b981","#3b82f6"],
      ["#f97316","#ec4899"],
    ];

    newItems.forEach(item => {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const [c1, c2] = colors[Math.floor(Math.random() * colors.length)];
      toast.custom((toastRef) => (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${c1}33`,
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '360px',
            color: 'white',
            opacity: toastRef.visible ? 1 : 0,
            transform: toastRef.visible ? 'translateX(0)' : 'translateX(120px)',
            transition: 'all 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            flexShrink: 0,
            boxShadow: `0 4px 15px ${c1}66`,
          }}>
            {emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.62)', marginBottom: '2px', fontWeight: 500 }}>
              {t("tv.newSongToast", "New song in queue")}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {item.title.length > 25 ? (
                // @ts-ignore
                <marquee scrollamount="6" style={{ width: '100%', display: 'block' }}>
                  {item.title}
                </marquee>
              ) : (
                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {item.title}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '2px' }}>
              {t("tv.requestedBy", "Requested by")} <span style={{ color: '#ec4899', fontWeight: 600 }}>{item.requestedBy}</span>
            </div>
          </div>
        </div>
      ), { duration: 5000, position: 'top-right' });
    });

    prevQueueRef.current = state.queue;
  }, [state?.queue]);

  // Check for tvToken on mount
  useEffect(() => {
    if (!code) return;
    const token = localStorage.getItem(`tvToken_${code}`);
    if (!token) {
      // Redirect to TV login page
      navigate(`/room/${code}/tv/login`);
    } else {
      setTvToken(token);
      setAuthChecked(true);
    }
  }, [code, navigate]);

  // Auto-rotate ranking view every 10 seconds
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setRankingView(prev => (prev === "solo" ? "duet" : "solo"));
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRotate]);

  // Global listener for user interaction to allow autoplay
  useEffect(() => {
    const handler = () => setHasInteracted(true);
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const [ytReady, setYtReady] = useState(!!window.YT);

  const handleQueueRemove = useCallback(
    async (itemId: string, songTitle?: string) => {
      if (!code) return;
      const title = songTitle || "esta música";
      if (!window.confirm(`Remover "${title}" da fila?`)) return;
      setDeletingId(itemId);
      await removeQueueItem(code, itemId, undefined, tvToken).catch(() => { });
      setDeletingId(null);
    },
    [code, tvToken]
  );

  const handleQueueMove = useCallback(
    async (itemId: string, direction: "up" | "down") => {
      if (!code) return;
      setRecentlyMoved([itemId, direction]);
      await moveQueueItem(code, itemId, direction, undefined, tvToken).catch(() => { });
    },
    [code, tvToken]
  );

  useEffect(() => {
    if (recentlyMoved.length > 0) {
      const timer = setTimeout(() => {
        setRecentlyMoved([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [recentlyMoved]);

  const handleQueueToTop = useCallback(
    async (itemId: string) => {
      if (!code) return;
      setRecentlyMoved([itemId, "up"]);
      await queueItemToTop(code, itemId, undefined, tvToken).catch(() => { });
    },
    [code, tvToken]
  );
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await fullScreenWrapperRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // Listen to fullscreenchange events to sync state (e.g., if user exits via Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Truncated text with tooltip on hover
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
              marginBottom: 8,
              padding: "10px 14px",
              background: "#222",
              border: "1px solid #444",
              borderRadius: 8,
              fontSize: "0.9rem",
              color: "#fff",
              whiteSpace: "normal",
              wordBreak: "break-word",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              minWidth: 250,
              maxWidth: 400,
            }}
          >
            {text}
          </span>
        )}
      </span>
    );
  };

  // Derive values from state (safe even when state is null)
  const videoId = state?.nowPlaying?.videoId ?? null;
  const showScore = !!finalized;

  // Auto-play next song countdown
  useEffect(() => {
    // Only start countdown if there's a queue, nothing is playing, and no score is showing
    if (!state || state.nowPlaying || showScore || state.queue.length === 0 || isTransitioning) {
      setAutoPlayCountdown(null);
      return;
    }

    if (autoPlayCountdown === null) {
      setAutoPlayCountdown(10);
      setIsPaused(false);
      return;
    }

    if (autoPlayCountdown > 0) {
      if (isPaused) return; // Se estiver pausado, não diminui o contador
      const timer = setTimeout(() => {
        setAutoPlayCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoPlayCountdown === 0 && code && !isTransitioningRef.current) {
      // Countdown finished, play next song
      console.log("[TV] Countdown finished, advancing queue...");

      // Defensivamente: setar flags e limpar contador ANTES da chamada assíncrona
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setAutoPlayCountdown(null);

      nextSong(code, undefined, tvToken).catch(err => {
        console.error("[TV] nextSong error", err);
        isTransitioningRef.current = false;
        setIsTransitioning(false);
      });
    }
  }, [state, showScore, autoPlayCountdown, code, tvToken, isTransitioning, isPaused]);

  // Auto-finalize when YouTube video ends
  const handleVideoEnd = useCallback(async () => {
    if (!code) return;
    try {
      await finalizeSong(code, "Auto", undefined, tvToken);
    } catch (err) {
      console.error("[TV] finalize error", err);
    }
  }, [code, tvToken]);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT) {
      setYtReady(true);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      setYtReady(true);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, []);

  // Connect to room via WS + HTTP fallback
  useEffect(() => {
    if (!code || !authChecked) return;

    const tvToken = localStorage.getItem(`tvToken_${code}`);

    // Fallback: fetch state via HTTP in case WS is slow (with retry for server cold starts)
    const fetchInitialState = (retries = 2) => {
      getState(code)
        .then(s => {
          if (s && s.error === "room_not_found") {
            if (retries > 0) {
              setTimeout(() => fetchInitialState(retries - 1), 1200);
            } else {
              setError("Sala não encontrada. Verifique o código.");
            }
          } else if (s && !s.error) {
            setError(null);
            setState(s);
          }
        })
        .catch(err => {
          console.error("[TV] HTTP state error", err);
          if (retries > 0) {
            setTimeout(() => fetchInitialState(retries - 1), 1200);
          }
        });
    };
    fetchInitialState();

    const ws = connectWS(
      code,
      "tv",
      "TV",
      (msg: unknown) => {
        const m = msg as {
          type: string;
          state?: RoomState;
          singer?: string;
          score?: number;
          title?: string;
          error?: string;
          action?: string;
          participants?: { id: string; name: string }[];
        };
        if (m.type === "STATE" && m.state) {
          const newState = m.state;

          // Update state if not showing score (to prevent jumpy UI during scoring)
          // or if we're in the middle of a transition (to get the nowPlaying data)
          if (!finalized || isTransitioningRef.current) {
            setState(newState);
          }

          // Reset transitioning flag ONLY IF we have a new song playing
          // OR if the queue is empty (meaning the transition is technically over/failed)
          if (newState.nowPlaying || newState.queue.length === 0) {
            console.log("[TV] Transition complete or queue empty, resetting flag");
            isTransitioningRef.current = false;
            setIsTransitioning(false);
          }
        } else if (m.type === "ERROR" && m.error === "room_not_found") {
          // Double check via HTTP before locking screen in case of temporary reconnect race
          getState(code).then(s => {
            if (s && !s.error) {
              setState(s);
              setError(null);
            } else {
              setError(t("home.roomNotFound", "Room not found. Check the code."));
            }
          }).catch(() => {
            setError(t("home.roomNotFound", "Room not found. Check the code."));
          });
        } else if (m.type === "PARTICIPANTS" && m.participants) {
          setParticipantsCount(m.participants.length);
        } else if (m.type === "FINALIZED") {
          setFinalized({ singer: m.singer!, score: m.score!, title: m.title! });
        } else if (m.type === "PLAYER_COMMAND") {
          if (playerRef.current) {
            if (m.action === "play") {
              playerRef.current.playVideo();
            } else if (m.action === "pause") {
              playerRef.current.pauseVideo();
            }
          }
        } else if (m.type === "REACTION") {
          const mReaction = m as unknown as { reaction: string; name: string };
          const newReactions = Array.from({ length: 4 }).map((_, i) => ({
            id: Math.random().toString(36).substring(2, 9),
            emoji: mReaction.reaction,
            name: i === 0 ? (mReaction.name || "Convidado") : undefined,
            x: 10 + Math.random() * 80,
            duration: 1.5 + Math.random() * 1.5,
            delay: Math.random() * 0.3,
            size: 40 + Math.random() * 50,
            targetY: -(300 + Math.random() * 500),
            rotOffset: -20 + Math.random() * 40
          }));
          setReactions(prev => [...prev, ...newReactions].slice(-20));
          const timer = setTimeout(() => {
            setReactions(prev => prev.filter(r => !newReactions.find(nr => nr.id === r.id)));
          }, 4000);
          reactionTimersRef.current.push(timer);
        }
      },
      tvToken
    );
    wsRef.current = ws;

    // Polling fallback to maintain state if WebSocket fails
    const pollInterval = setInterval(() => {
      const wsState = wsRef.current?.readyState;
      if (!wsRef.current || wsState !== WebSocket.OPEN) {
        getState(code)
          .then(s => {
            if (s && !s.error && !finalized) {
              setState(s);
              if (s.nowPlaying || s.queue.length === 0) {
                isTransitioningRef.current = false;
                setIsTransitioning(false);
              }
            }
          })
          .catch(() => { });

        // Auto-reconnect: if the WS is truly closed, force a fresh WS.
        // Otherwise reactions (emoji) never arrive while the TV keeps
        // looking alive via the HTTP polling above.
        if (!wsRef.current || wsState === WebSocket.CLOSED || wsState === WebSocket.CLOSING) {
          setReconnectKey(prev => prev + 1);
        }
      }
    }, 5000);

    return () => {
      ws.close();
      clearInterval(pollInterval);
      reactionTimersRef.current.forEach(clearTimeout);
      reactionTimersRef.current = [];
    };
  }, [code, authChecked, finalized, reconnectKey]);

  // Handle visibility change to refresh state and reconnect WS if needed
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === "visible" && code) {
        console.log("[Visibility] TV Page visible/focused, refreshing state...");
        getState(code).then(s => {
          if (s && !s.error && !finalized) {
            setState(s);
            if (s.nowPlaying || s.queue.length === 0) {
              isTransitioningRef.current = false;
              setIsTransitioning(false);
            }
          }
        }).catch(() => { });
        
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
  }, [code, finalized]);

  // Create / destroy YouTube player
  useEffect(() => {
    // Cleanup old player when videoId changes or score shown
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Wait for user interaction before creating player (browser autoplay policy)
    if (!ytReady || !videoId || showScore || !hasInteracted) {
      return;
    }

    // Wait for the container to be rendered
    const timeoutId = setTimeout(() => {
      const container = playerContainerRef.current;
      if (!container) {
        return;
      }

      // Clear container
      container.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-player-" + videoId;
      container.appendChild(div);

      playerRef.current = new window.YT!.Player(div.id, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          start: 0,
          playsinline: 1,
          enablejsapi: 1,
          fs: 0, // Disable native YouTube fullscreen to use our custom wrapper
        },
        events: {
          onReady: e => {
            e.target.playVideo();
          },
          onStateChange: e => {
            if (e.data === window.YT!.PlayerState.ENDED) {
              handleVideoEnd();
            }
          },
        },
      });
    }, 300); // Increased delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [ytReady, videoId, showScore, hasInteracted, handleVideoEnd]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  // Wait for auth check
  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <p>{t("tv.verifyingAccess", "Verificando acesso...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="container"
        style={{ paddingTop: 60, textAlign: "center" }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <IconX size={24} /> {error}
        </h2>
        <p style={{ color: "#888", marginTop: 16 }}>
          {t("tv.noRoomFound", "Go back and create a new room.")}
        </p>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 16 }}>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            style={{
              padding: "10px 20px",
              background: "#10b981",
              color: "#fff",
              fontWeight: 700,
              borderRadius: 8,
              border: "none",
              cursor: "pointer"
            }}
          >
            🔄 {t("common.tryAgain", "Tentar Novamente")}
          </button>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            {t("common.backToHome", "← Back to home")}
          </a>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 24,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          <IconMic size={64} />
        </div>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>
          {t("mobile.connecting", { code })}
        </h2>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.95); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={fullScreenWrapperRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      {/* Overlay inicial para interação (Browsers bloqueiam autoplay) */}
      {!hasInteracted && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
          }}
          onClick={() => setHasInteracted(true)}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at center, rgba(255,0,128,0.08) 0%, rgba(0,0,0,0.95) 70%)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
          }} />
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 24,
              padding: "60px 72px",
              textAlign: "center",
              maxWidth: 520,
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,0,128,0.06)",
            }}
          >
            <div style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF0080, #7928CA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 0 40px rgba(255,0,128,0.3)",
              animation: "tvPulse 2s ease-in-out infinite",
            }}>
              <IconPlay size={44} />
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 900, margin: "0 0 12px", letterSpacing: "-0.03em" }}>
              {t("tv.clickToActivate", "Clique para Ativar a TV")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 28px" }}>
              {t("tv.autoplayWarning", "Browsers block autoplay videos. Click anywhere on this screen once for autoplay karaoke.")}
            </p>
            <button
              style={{
                background: "linear-gradient(135deg, #FF0080, #7928CA)",
                color: "#fff",
                border: "none",
                padding: "14px 40px",
                fontSize: "1rem",
                fontWeight: 800,
                borderRadius: 14,
                cursor: "pointer",
                boxShadow: "0 8px 30px rgba(255,0,128,0.3)",
                transition: "transform 0.15s, box-shadow 0.15s",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,0,128,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(255,0,128,0.3)"; }}
            >
              {t("common.continue", "Continue")}
            </button>
          </div>
        </div>
      )}

      {(state.nowPlaying || isTransitioning) && !showScore && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Blur nas bordas superior esquerda/direita — centro limpo para a letra */}
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: "30%", height: "100px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 9, pointerEvents: "none",
            maskImage: "linear-gradient(to right, black 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 40%, transparent 100%)",
          }} />
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: "30%", height: "100px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 9, pointerEvents: "none",
            maskImage: "linear-gradient(to left, black 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, black 40%, transparent 100%)",
          }} />
          {/* Barra superior com info da música */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "20px 40px",
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ animation: "slideIn 0.5s ease-out" }}>
              {state.nowPlaying ? (
                <>
                  <div style={{ 
                      fontSize: "1.8rem", 
                      fontWeight: 900, 
                      color: "#fff", 
                      textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      marginBottom: 4
                  }}>
                    <TruncatedText text={state.nowPlaying.title} maxLength={50} />
                  </div>
                    <div
                      style={{
                        color: "#FF0080",
                        fontSize: "1.2rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontWeight: 600,
                        textShadow: "0 0 10px rgba(255, 0, 128, 0.4)"
                      }}
                    >
                      <IconMic size={20} />
                      {state.nowPlaying.singers
                        ?.map(s => (typeof s === "string" ? s : s.name))
                        .join(` ${t("common.and")} `) || state.nowPlaying.requestedBy}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", opacity: 0.8 }}>
                    {t("tv.preparingNext", "Preparando próxima música...")}
                  </div>
              )}
            </div>
            <div
              style={{ textAlign: "right", animation: "slideIn 0.5s ease-out" }}
            >
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "30px",
                padding: "8px 20px",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 700,
                boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                marginBottom: "12px"
              }}>
                <div style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#2ecc71",
                  boxShadow: "0 0 12px #2ecc71"
                }} />
                {participantsCount} {t("tv.participants", "Participantes")}
              </div>
              {state.queue.length > 0 && (
                <div style={{ 
                    color: "rgba(255,255,255,0.6)", 
                    fontSize: "0.95rem", 
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                }}>
                    <span style={{ color: "#FF0080" }}>{t("tv.nextSong", "Next song")}:</span>{" "}
                  {state.queue[0].singers
                    ?.map(s => (typeof s === "string" ? s : s.name))
                    .join(` ${t("common.and")} `) || state.queue[0].requestedBy}
                </div>
              )}
            </div>
          </div>

          {/* Player YouTube em tela cheia */}
          <div
            ref={playerContainerRef}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
            }}
          />

          {/* Botão de pular discreto no canto */}
          <button
            onClick={() => code && finalizeSong(code, "Host", undefined, tvToken)}
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              fontSize: "0.85rem",
              opacity: 0.5,
              transition: "opacity 0.2s",
              zIndex: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t("common.skip", "Skip")} <IconSkipForward size={16} />
            </span>
          </button>

          {/* Botão Tela Cheia Customizado */}
          <button
            onClick={toggleFullscreen}
            style={{
              position: "absolute",
              bottom: 20,
              right: 120, // Posição ao lado do botão Pular
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              fontSize: "0.85rem",
              opacity: 0.5,
              transition: "opacity 0.2s",
              zIndex: 10,
              color: "#fff",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {isFullscreen ? (
                <>{t("tv.exitScreen", "Exit Screen")} <IconMinimize size={16} /></>
              ) : (
                <>{t("tv.fullScreen", "Full Screen")} <IconMaximize size={16} /></>
              )}
            </span>
          </button>

          {/* QR Code no canto inferior esquerdo */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              padding: 14,
              borderRadius: 20,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(255, 0, 128, 0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
                window.location.origin + "/join/" + code
              )}&color=000000&bgcolor=ffffff`}
              alt="QR Code"
              loading="lazy"
              style={{ 
                width: 160, 
                height: 160, 
                display: "block", 
                borderRadius: 12,
                padding: 6,
                background: "#fff",
                boxShadow: "0 0 20px rgba(255, 255, 255, 0.4)"
              }}
            />
            <div
              style={{
                color: "#FF0080",
                fontSize: "0.9rem",
                fontWeight: 900,
                marginTop: 10,
                letterSpacing: "4px",
                textShadow: "0 0 10px rgba(255,0,128,0.3)",
                opacity: 1
              }}
            >
              {code}
            </div>
            <div style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.65rem",
              fontWeight: 600,
              marginTop: 4,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}>
              {t("tv.scanToAdd", "QR Code to add songs!")}
            </div>
          </div>
        </div>
      )}


      {!state.nowPlaying && !showScore && !isTransitioning && (
        <div
          style={{
            height: "100vh",
            overflow: "hidden",
            padding: "2vw 3vw",
            background: "#0A0A0A",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="tv-background-blobs" />
          <style>{`
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .tv-glass-card {
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 24px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 0, 128, 0.08);
              overflow: hidden;
              animation: slideIn 0.8s ease-out forwards;
              padding: 24px;
            }
            .tv-header-separator {
              padding-bottom: 2vh;
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            .tv-gradient-text {
              background: linear-gradient(135deg, #FF0080, #FF4D6D);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              font-weight: 900;
              text-shadow: 0 0 20px rgba(255, 0, 128, 0.3);
            }
            .tv-neon-text {
                color: #FF0080;
                text-shadow: 0 0 15px rgba(255, 0, 128, 0.6), 0 0 30px rgba(255, 0, 128, 0.3);
            }
            .tv-btn-glass {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.7);
              padding: 10px 20px;
              border-radius: 12px;
              font-size: 0.95rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.25s ease;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .tv-btn-glass.active {
              background: linear-gradient(135deg, #FF0080, #FF4D6D);
              border-color: transparent;
              color: #fff;
              box-shadow: 0 0 25px rgba(255, 0, 128, 0.45);
              transform: translateY(-2px);
            }
            @media (hover: hover) {
              .tv-btn-glass:hover {
                background: linear-gradient(135deg, #FF0080, #FF4D6D);
                border-color: transparent;
                color: #fff;
                box-shadow: 0 0 25px rgba(255, 0, 128, 0.45);
                transform: translateY(-2px);
              }
            }
            .tv-item-box {
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 12px 16px;
              transition: all 0.3s ease;
              line-height: 1.4;
              min-height: 60px;
            }
            .tv-item-box:hover {
                border-color: rgba(255, 0, 128, 0.3);
                background: rgba(255, 255, 255, 0.04);
            }
            .tv-item-box.moved {
                animation: slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            @keyframes slideUp {
                0% { opacity: 0.5; transform: translateY(10px); }
                50% { background: rgba(255, 0, 128, 0.15); border-color: rgba(255, 0, 128, 0.5); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .tv-item-box.moving-down {
                animation: slideDown 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            @keyframes slideDown {
                0% { opacity: 0.5; transform: translateY(-10px); }
                50% { background: rgba(255, 0, 128, 0.15); border-color: rgba(255, 0, 128, 0.5); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .tv-background-blobs {
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: -1;
            }
            .tv-background-blobs::before,
            .tv-background-blobs::after {
              content: "";
              position: absolute;
              border-radius: 50%;
              filter: blur(90px);
            }
            .tv-background-blobs::before {
              width: 500px; height: 500px;
              top: -10%; left: -5%;
              background: radial-gradient(circle, rgba(255, 0, 128, 0.15) 0%, transparent 70%);
              animation: drift 15s ease-in-out infinite alternate;
            }
            .tv-background-blobs::after {
              width: 600px; height: 600px;
              bottom: -15%; right: -10%;
              background: radial-gradient(circle, rgba(121, 40, 202, 0.12) 0%, transparent 70%);
              animation: drift2 20s ease-in-out infinite alternate;
            }
            @keyframes drift {
              from { transform: translate(0, 0); }
              to   { transform: translate(50px, 100px); }
            }
            @keyframes drift2 {
              from { transform: translate(0, 0); }
              to   { transform: translate(-80px, -60px); }
            }
          `}</style>
          
          {/* Header */}
          <header className="w-full flex justify-between items-start gap-4 px-2 md:px-0 shrink-0">
            {/* Esquerda: Logout - menor e mais discreto */}
            <div className="flex justify-start" style={{ paddingTop: 8 }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "999px",
                    padding: "6px 14px",
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.3s ease",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)";
                    }}
                >
                    <IconSkipBack size={12} />
                    {t("auth.logout", "Sair")}
                </button>
            </div>

            {/* Centro: Logo e Room Code */}
            <div className="flex-1 flex flex-col items-center justify-start" style={{ maxWidth: '180px', marginTop: -10 }}>
                <div style={{ transform: 'scale(0.45)', transformOrigin: 'center top', width: '336px', marginBottom: '-120px' }}><Logo /></div>
                <div className="flex items-center gap-3 text-white tracking-[0.2em]" style={{ paddingBottom: 20, paddingTop: 8 }}>
                    <span className="opacity-50 font-light" style={{ fontSize: '1.5em', letterSpacing: '0.15em' }}>ROOM</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.2em' }}>—</span>
                    <span className="tv-neon-text font-black" style={{ fontSize: 24, fontWeight: 'bold', color: '#FF0080', textShadow: '0 0 15px rgba(255,0,128,0.5)' }}>{code}</span>
                </div>
            </div>
            
            {/* Direita: QR Code */}
            <div className="flex justify-end" style={{ paddingTop: 8 }}>
              <div style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(12px)",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
              }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                      window.location.origin + "/join/" + code
                    )}&color=000000&bgcolor=ffffff`}
                    alt="QR"
                    loading="lazy"
                    style={{ width: 120, height: 120, borderRadius: 8, background: "rgb(255, 255, 255)", padding: 4 }}
                  />
                  <div style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    marginTop: 4,
                    width: 120,
                    textAlign: "center",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                  }}>
                    {t("tv.scanToAdd", "QR Code to add songs!")}
                  </div>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 grid grid-cols-2 gap-8 items-stretch max-w-[1800px] w-full mx-auto min-h-0 overflow-hidden" style={{ gap: 32 }}>
            {/* Próxima música / Fila */}
            <div className="tv-glass-card flex flex-col overflow-hidden">
              {state.queue.length > 0 ? (
                <>
                  <div className="tv-header-separator" style={{ padding: "1.5vh 3vh", textAlign: "center" }}>
                    <div style={{ fontSize: "1rem", color: "#FF0080", textTransform: "uppercase", letterSpacing: "3px", fontWeight: 900, marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                      <IconMusic size={16} /> 
                      <span>{t("tv.nextSong", "PRÓXIMA MÚSICA")}</span>
                      <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.8rem" }}>—</span>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <IconMic size={14} />
                        {state.queue[0].singers?.map(s => (typeof s === "string" ? s : s.name)).join(" e ") || state.queue[0].requestedBy}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: "clamp(18px, 1.8vw, 20px)", 
                      fontWeight: 900, 
                      color: "#fff", 
                      marginBottom: "0.5vh", 
                      lineHeight: 1.1, 
                      textTransform: "uppercase",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {state.queue[0].title}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                      <button
                        onClick={() => {
                          setAutoPlayCountdown(null);
                          if (code) nextSong(code, undefined, tvToken);
                        }}
                        className="glow-pulse"
                        style={{
                          background: "linear-gradient(135deg, #FF0080, #FF4D6D)",
                          color: "#fff",
                          border: "none",
                          fontSize: "clamp(12px, 1vw, 16px)",
                          padding: "8px 16px",
                          fontWeight: 800,
                          borderRadius: '999px',
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          display: "flex",
                          alignItems: "center",
                          minHeight: "36px",
                          whiteSpace: "nowrap",
                          gap: 6,
                          boxShadow: "0 0 20px rgba(255, 0, 128, 0.4)",
                          cursor: "pointer",
                          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                        }}
                      >
                        <IconPlay size={18} />
                        {autoPlayCountdown !== null
                          ? `${t("mobile.start", "Iniciar")} (${autoPlayCountdown}s)`
                          : t("mobile.start", "Iniciar")}
                      </button>

                      {autoPlayCountdown !== null && (
                        <button
                          onClick={() => setIsPaused(!isPaused)}
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            color: isPaused ? "#00e5ff" : "rgba(255, 255, 255, 0.6)",
                            border: `1px solid ${isPaused ? "#00e5ff" : "rgba(255, 255, 255, 0.1)"}`,
                            borderRadius: '999px',
                            padding: "8px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "36px",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxShadow: isPaused ? "0 0 20px rgba(0, 229, 255, 0.2)" : "none"
                          }}
                          title={isPaused ? "Retomar" : "Pausar"}
                        >
                          {isPaused ? <IconPlay size={22} /> : <IconPause size={22} />}
                          <span style={{ marginLeft: 8, fontSize: "clamp(12px, 1vw, 16px)", fontWeight: 700, textTransform: "uppercase" }}>
                            {isPaused ? t("common.resume", "Retomar") : t("common.pause", "Pausar")}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => handleQueueRemove(state.queue[0].id, state.queue[0].title)}
                        disabled={deletingId === state.queue[0].id}
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: deletingId === state.queue[0].id ? "rgba(255,0,0,0.8)" : "rgba(255, 255, 255, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: '999px',
                          padding: "1vh 2vw",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,0,0,0.15)";
                          e.currentTarget.style.color = "#ff4444";
                          e.currentTarget.style.borderColor = "rgba(255,68,68,0.3)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                        }}
                        title="Remover da fila"
                      >
                        <IconTrash size={20} />
                      </button>
                    </div>
                  </div>

                  {state.queue.length > 1 && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: "12px 20px", maxHeight: "400px" }}>
                      <style>{`
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,0,128,0.3); border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,0,128,0.5); }
                      `}</style>
                      <h3 style={{ margin: "0 0 12px", fontSize: "1rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700 }}>
                        {t("tv.queueTitle")} ({state.queue.length - 1} {t("tv.remaining")})
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {state.queue.slice(1, 7).map((item) => {
                            const isMoved = recentlyMoved[0] === item.id;
                            const moveDirection = isMoved ? recentlyMoved[1] : null;
                            const animClass = isMoved ? (moveDirection === "up" ? "moved" : "moving-down") : "";
                            return (
                              <div
                                key={item.id}
                                className={`tv-item-box ${animClass}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 16,
                            }}
                          >
                            <div style={{ flex: 1, overflow: "hidden" }}>
                              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff", marginBottom: "2px", textTransform: "uppercase" }}>
                                <TruncatedText text={item.title} maxLength={40} />
                              </div>
                              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
                                <IconUser size={14} />
                                {item.singers?.map(s => (typeof s === "string" ? s : s.name)).join(" e ") || item.requestedBy}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="tv-btn-glass" style={{ padding: 8, minWidth: 36, minHeight: 36, justifyContent: "center" }} onClick={() => handleQueueMove(item.id, "up")} title="Subir"><IconChevronUp /></button>
                              <button className="tv-btn-glass" style={{ padding: 8, minWidth: 36, minHeight: 36, justifyContent: "center" }} onClick={() => handleQueueMove(item.id, "down")} title="Descer"><IconChevronDown /></button>
                              <button className="tv-btn-glass" style={{ padding: 8, minWidth: 36, minHeight: 36, justifyContent: "center" }} onClick={() => handleQueueToTop(item.id)} title="Mover para o topo"><IconChevronsUp /></button>
                              <button className="tv-btn-glass tv-btn-trash" 
                                style={{ padding: 8, minWidth: 36, minHeight: 36, justifyContent: "center", color: deletingId === item.id ? "rgba(255,0,0,0.8)" : "rgba(255,255,255,0.8)", borderColor: "rgba(255,80,80,0.3)" }} 
                                onClick={() => handleQueueRemove(item.id, item.title)} 
                                title="Remover"
                                disabled={deletingId === item.id}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                      {state.queue.length > 6 && (
                        <div style={{ color: "rgba(255,255,255,0.2)", marginTop: 24, textAlign: "center", fontWeight: 700, fontSize: "1rem", letterSpacing: "2px" }}>
                          + {state.queue.length - 6} {t("tv.songsInQueue")}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1" style={{ padding: "8vh 2vw", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "5vw", marginBottom: "2vh", color: "#FF0080", opacity: 0.9, textShadow: "0 0 30px rgba(255, 0, 128, 0.4)", display: "flex", justifyContent: "center" }}>
                    <IconMusic size={80} />
                  </div>
                  <h2 className="tv-vip-title" style={{ fontSize: "2.5vw", marginBottom: "2vh", whiteSpace: "normal" }}>{t("tv.emptyQueue", "Fila vazia")}</h2>
                  <p style={{ color: "#00e5ff", fontSize: "1.2vw", fontWeight: 600, letterSpacing: "1px" }}>
                    {t("tv.scanToAdd", "QR Code to add songs!")}
                  </p>
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="tv-glass-card flex flex-col overflow-hidden">
              <div className="tv-header-separator" style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3vh"
              }}>
                <h2 className="tv-gradient-text" style={{ fontSize: "1.6vw", display: "flex", alignItems: "center", gap: 15, margin: 0 }}>
                  <IconTrophy size={32} /> RANKING
                </h2>
                {/* Toggle Solo/Duplas */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button className={`tv-btn-glass ${rankingView === "solo" ? "active" : ""}`} onClick={() => { setRankingView("solo"); setAutoRotate(false); }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><IconUser size={18} /> SOLO</span>
                  </button>
                  <button className={`tv-btn-glass ${rankingView === "duet" ? "active" : ""}`} onClick={() => { setRankingView("duet"); setAutoRotate(false); }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><IconUsers size={18} /> DUPLAS</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: "1vh 3vh 3vh" }}>
              {rankingView === "solo" ? (
                // Solo ranking
                Object.keys(state.ranking).length === 0 ? (
                  <div style={{ padding: "4vh", textAlign: "center", color: "#888", fontSize: "1.2vw", lineHeight: 1.6 }}>
                    {t("tv.nobodyScored", "Ninguém pontuou ainda.")}
                    <br />
                    <span style={{ color: "#FF0080", fontWeight: 700, letterSpacing: "1px" }}>{t("tv.singToAppear", "CANTE UMA MÚSICA PARA APARECER AQUI!")}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                    {Object.entries(state.ranking)
                      .sort(([, a], [, b]) => b.score - a.score)
                      .map(([odUserId, entry], i) => (
                        <div key={odUserId} className="tv-item-box" style={{ 
                          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1vh 2vh",
                          border: i === 0 ? "1px solid #FFD700" : i === 1 ? "1px solid #C0C0C0" : i === 2 ? "1px solid #CD7F32" : "1px solid rgba(255, 255, 255, 0.08)",
                          boxShadow: i === 0 ? "0 0 20px rgba(255, 215, 0, 0.2)" : "none",
                          background: i === 0 ? "rgba(255, 215, 0, 0.05)" : "rgba(255, 255, 255, 0.02)"
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: i === 0 ? "linear-gradient(45deg, #FFD700, #FFA500)" : i === 1 ? "linear-gradient(45deg, #eee, #aaa)" : i === 2 ? "linear-gradient(45deg, #e6a181, #cd7f32)" : "rgba(255, 255, 255, 0.05)",
                              color: i < 3 ? "#000" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800,
                              boxShadow: i < 3 ? "0 0 15px rgba(0,0,0,0.5)" : "none"
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: "1.2rem", fontWeight: i < 3 ? 900 : 700, color: "#fff", textTransform: "uppercase" }}>{entry.name}</span>
                          </span>
                          <span style={{ fontSize: "1.5vw", fontWeight: 900, color: i === 0 ? "#FFD700" : i === 1 ? "#ddd" : i === 2 ? "#cd7f32" : "#FF0080", textShadow: i === 0 ? "0 0 15px rgba(255,215,0,0.5)" : "none" }}>
                            {entry.score} pts
                          </span>
                        </div>
                      ))}
                  </div>
                )
              ) : // Duet ranking
                !state.duetRanking || state.duetRanking.length === 0 ? (
                  <div style={{ padding: "4vh", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "1.2vw", lineHeight: 1.6 }}>
                    {t("tv.noDuetScored", "Nenhuma dupla pontuou ainda.")}
                    <br />
                    <span style={{ color: "#FF0080", fontWeight: 700, letterSpacing: "1px" }}>{t("tv.singDuetToAppear", "CANTE EM DUPLA PARA APARECER AQUI!")}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                    {[...state.duetRanking]
                      .sort((a, b) => b.score - a.score)
                      .map((duet, i) => (
                        <div key={duet.names.join("-")} className="tv-item-box" style={{ 
                          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1vh 2vh",
                          border: i === 0 ? "1px solid #FFD700" : i === 1 ? "1px solid #C0C0C0" : i === 2 ? "1px solid #CD7F32" : "1px solid rgba(255, 255, 255, 0.08)",
                          boxShadow: i === 0 ? "0 0 20px rgba(255, 215, 0, 0.2)" : "none",
                          background: i === 0 ? "rgba(255, 215, 0, 0.05)" : "rgba(255, 255, 255, 0.02)"
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: i === 0 ? "linear-gradient(45deg, #FFD700, #FFA500)" : i === 1 ? "linear-gradient(45deg, #eee, #aaa)" : i === 2 ? "linear-gradient(45deg, #e6a181, #cd7f32)" : "rgba(255, 255, 255, 0.05)",
                              color: i < 3 ? "#000" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800,
                              boxShadow: i < 3 ? "0 0 15px rgba(0,0,0,0.5)" : "none"
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: "1.1rem", fontWeight: i < 3 ? 900 : 700, color: "#fff", textTransform: "uppercase" }}>{duet.names[0]} & {duet.names[1]}</span>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontSize: "1.5vw", fontWeight: 900, color: i === 0 ? "#FFD700" : i === 1 ? "#ddd" : i === 2 ? "#cd7f32" : "#FF0080", textShadow: i === 0 ? "0 0 15px rgba(255,215,0,0.5)" : "none" }}>
                              {duet.score} pts
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
                              {duet.count} {duet.count > 1 ? t("tv.songs", "Músicas") : t("tv.songs", "Música")}
                            </span>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Footer Informativo */}
          <footer style={{ 
            marginTop: "auto", 
            padding: "2vh 0", 
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: 0.6,
            fontSize: "0.9rem",
            letterSpacing: "1px",
            textTransform: "uppercase"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <div style={{ 
                    width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 10px #2ecc71"
                }} />
                <span>{participantsCount} {t("tv.participants", "Participantes")}</span>
            </div>
            <div>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ fontWeight: 700 }}>KARAOKE FACTORY &copy; 2025</div>
          </footer>
        </div>
      )}

      {/* Score Overlay (aparece após cada música) */}
      <ScoreOverlay
        open={!!finalized}
        scoreOverride={finalized?.score}
        singer={finalized?.singer}
        enableAudio={true}
        onDone={async () => {
          setFinalized(null);
          if (code) {
            // Fetch latest state since we ignored updates during score
            try {
              const s = await getState(code);
              if (s && !s.error) setState(s);
            } catch { }
            scoreDone(code);
          }
        }}
      />
      <Toaster position="top-right" />
      <style>{`
        @keyframes organicFloatTV {
          0% { transform: translateY(0) scale(0.3) rotate(calc(var(--rot) * -1deg)); opacity: 0; }
          15% { opacity: 1; transform: translateY(-30px) scale(1.2) rotate(calc(var(--rot) * 1deg)); }
          70% { transform: translateY(calc(var(--ty) * 0.6)) scale(1) rotate(calc(var(--rot) * 0.5deg)); opacity: 0.8; }
          100% { transform: translateY(var(--ty)) scale(0.8) rotate(calc(var(--rot) * 1.5deg)); opacity: 0; }
        }
        @keyframes tvPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(255,0,128,0.3); }
          50% { transform: scale(1.06); box-shadow: 0 0 60px rgba(255,0,128,0.5); }
        }
      `}</style>
      {/* Reações Animadas - absolute to wrapper container */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "hidden",
        }}
      >
        <ReactionDisplay reactions={reactions} />
      </div>
    </div>
  );
}
