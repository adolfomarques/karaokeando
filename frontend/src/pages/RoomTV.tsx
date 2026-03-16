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
  name: string;
  x: number;
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
            fontSize: "56px",
            animation: "rise 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.8))",
            zIndex: 9999,
          }}
        >
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
          {r.emoji}
        </div>
      ))}
      <style>{`
        @keyframes rise {
          0% {
            transform: translateY(0) scale(0.3) rotate(-10deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-100px) scale(1.4) rotate(0deg);
          }
          30% {
            transform: translateY(-300px) scale(1.1) rotate(5deg);
          }
          100% {
            transform: translateY(-1200px) scale(1) rotate(0deg);
            opacity: 0;
          }
        }
      `}</style>
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reconnectKey, setReconnectKey] = useState(0);
  const isTransitioningRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const fullScreenWrapperRef = useRef<HTMLDivElement | null>(null);

  // Track previous queue for toasts
  const prevQueueRef = useRef<QueueItem[]>([]);
  const isInitialLoadRef = useRef(true);

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

    newItems.forEach(item => {
      toast.custom((toastRef) => (
        <div
          style={{
            background: 'rgba(26, 28, 41, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '350px',
            color: 'white',
            opacity: toastRef.visible ? 1 : 0,
            transform: toastRef.visible ? 'translateX(0)' : 'translateX(-50px)',
            transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(236, 72, 153, 0.3)'
          }}>
            🎵
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '2px', fontWeight: 500 }}>
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
    async (itemId: string) => {
      if (!code) return;
      await removeQueueItem(code, itemId, undefined, tvToken).catch(() => { });
    },
    [code, tvToken]
  );

  const handleQueueMove = useCallback(
    async (itemId: string, direction: "up" | "down") => {
      if (!code) return;
      await moveQueueItem(code, itemId, direction, undefined, tvToken).catch(() => { });
    },
    [code, tvToken]
  );

  const handleQueueToTop = useCallback(
    async (itemId: string) => {
      if (!code) return;
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
      return;
    }

    if (autoPlayCountdown > 0) {
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
  }, [state, showScore, autoPlayCountdown, code, tvToken, isTransitioning]);

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

    // Fallback: fetch state via HTTP in case WS is slow
    getState(code)
      .then(s => {
        if (s && s.error === "room_not_found") {
          setError("Sala não encontrada. Verifique o código.");
        } else if (s && !s.error) {
          setState(s);
        }
      })
      .catch(err => {
        console.error("[TV] HTTP state error", err);
      });

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
          setError(t("home.roomNotFound", "Room not found. Check the code."));
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
          console.log("[TV] Reaction received:", m);
          const mReaction = m as unknown as { reaction: string; name: string };
          const newReaction = {
            id: Math.random().toString(36).substring(2, 9),
            emoji: mReaction.reaction,
            name: mReaction.name || "Convidado",
            x: Math.random() * 80 + 10, // 10% a 90%
          };
          setReactions(prev => [...prev, newReaction]);
          // Remove after animation finishes
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
          }, 4500);
        }
      },
      tvToken
    );
    wsRef.current = ws;

    // Polling fallback to maintain state if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
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
      }
    }, 5000);

    return () => {
      ws.close();
      clearInterval(pollInterval);
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
        <a
          href="/"
          style={{ color: "#3498db", marginTop: 20, display: "inline-block" }}
        >
          {t("common.backToHome", "← Back to home")}
        </a>
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
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
          onClick={() => setHasInteracted(true)}
        >
          <div style={{ padding: 40, textAlign: "center", background: "#222", borderRadius: 16 }}>
            <IconPlay size={64} />
            <h2 style={{ fontSize: "2rem", margin: "20px 0 10px" }}>{t("tv.clickToActivate", "Clique para Ativar a TV")}</h2>
            <p style={{ color: "#aaa", fontSize: "1.1rem", maxWidth: 400 }}>
              {t("tv.autoplayWarning", "Browsers block autoplay videos. Click anywhere on this screen once for autoplay karaoke.")}
            </p>
            <button
              style={{
                marginTop: 24,
                background: "#ff4081",
                color: "#fff",
                border: "none",
                padding: "16px 32px",
                fontSize: "1.2rem",
                fontWeight: "bold",
                borderRadius: 8,
                cursor: "pointer",
              }}
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
          {/* Barra superior com info da música */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "20px 40px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)",
              backdropFilter: "blur(4px)",
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
                      color: "#00e5ff",
                      fontSize: "1.2rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontWeight: 600,
                      textShadow: "0 0 10px rgba(0,229,255,0.4)"
                    }}
                  >
                    <IconMic size={20} />
                    {state.nowPlaying.singers
                      ?.map(s => (typeof s === "string" ? s : s.name))
                      .join(" e ") || state.nowPlaying.requestedBy}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", opacity: 0.8 }}>
                  {t("tv.preparingNext", "Preparing next song...")}
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
                  <span style={{ color: "#ff6600" }}>{t("tv.nextSong", "Next song")}:</span>{" "}
                  {state.queue[0].singers
                    ?.map(s => (typeof s === "string" ? s : s.name))
                    .join(" e ") || state.queue[0].requestedBy}
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

          {/* QR Code discreto no canto inferior esquerdo */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              background: "rgba(255,255,255,0.95)",
              padding: 8,
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: 0.7,
              transition: "opacity 0.2s",
              zIndex: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=104x104&data=${encodeURIComponent(
                window.location.origin + "/join/" + code
              )}`}
              alt="QR Code"
              loading="lazy"
              style={{ width: 104, height: 104, display: "block" }}
            />
            <div
              style={{
                color: "#000",
                fontSize: "0.65rem",
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              {code}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODO 2: LOBBY - Entre músicas (fila, ranking, QR code)
          ───────────────────────────────────────────────────────────── */}
      {!state.nowPlaying && !showScore && !isTransitioning && (
        <div
          style={{
            minHeight: "100vh",
            padding: 40,
            background: "#0d0d0d", // Dark background
            display: "flex",
            flexDirection: "column",
          }}
        >
          <style>{`
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .tv-vip-ticket {
              position: relative;
              background: #0d0d0d;
              border-radius: 16px;
              border: 2px solid #ff6600;
              box-shadow: 0 0 25px rgba(255, 102, 0, 0.3), inset 0 0 30px rgba(255, 102, 0, 0.05);
              overflow: hidden;
              animation: slideIn 0.8s ease-out forwards;
            }
            .tv-vip-header {
              padding: 2.5vh;
              border-bottom: 2px dashed rgba(255, 102, 0, 0.4);
              background: repeating-linear-gradient(
                45deg,
                rgba(255, 102, 0, 0.03),
                rgba(255, 102, 0, 0.03) 15px,
                transparent 15px,
                transparent 30px
              );
            }
            .tv-vip-title {
              font-family: 'Inter', sans-serif;
              color: transparent;
              -webkit-text-stroke: 1.5px #ff6600;
              text-shadow: 0 0 15px rgba(255, 102, 0, 0.7);
              font-size: 2.5rem;
              font-weight: 900;
              letter-spacing: 6px;
              text-transform: uppercase;
              margin: 0;
            }
            .tv-vip-body {
              padding: 3vh;
              background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0, 229, 255, 0.03));
            }
            .tv-vip-btn-cyan {
              background: transparent;
              border: 1px solid rgba(0, 229, 255, 0.5);
              color: #00e5ff;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 1rem;
              font-weight: 700;
              cursor: pointer;
              text-transform: uppercase;
              transition: all 0.3s ease;
              box-shadow: inset 0 0 10px rgba(0, 229, 255, 0.05);
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .tv-vip-btn-cyan:hover, .tv-vip-btn-cyan.active {
              background: rgba(0, 229, 255, 0.2);
              border-color: #00e5ff;
              box-shadow: inset 0 0 15px rgba(0, 229, 255, 0.3), 0 0 20px rgba(0, 229, 255, 0.4);
              color: #fff;
              transform: translateY(-2px);
            }
            .tv-vip-box {
              background: rgba(20, 20, 20, 0.6);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 12px;
              padding: 2vh;
              transition: all 0.3s ease;
            }
            .tv-vip-box:hover {
                border-color: rgba(0, 229, 255, 0.3);
                background: rgba(30, 30, 30, 0.8);
            }
            .tv-neon-text {
                color: #00e5ff;
                text-shadow: 0 0 10px rgba(0, 229, 255, 0.8), 0 0 20px rgba(0, 229, 255, 0.4);
                font-weight: 900;
            }
            .tv-gradient-bg {
                background: radial-gradient(circle at top right, rgba(255, 102, 0, 0.1), transparent 40%),
                            radial-gradient(circle at bottom left, rgba(0, 229, 255, 0.05), transparent 40%);
            }
          `}</style>
          
          {/* Header */}
          <header className="relative w-full flex justify-between items-center mb-10 px-4 md:px-8">
            {/* Esquerda: Logout */}
            <div className="z-10 flex-shrink-0">
                <button
                    onClick={() => navigate("/")}
                    style={{
                    background: "rgba(255, 102, 0, 0.05)",
                    border: "1.5px solid rgba(255, 102, 0, 0.4)",
                    borderRadius: 12,
                    padding: "12px 20px",
                    color: "#ff6600",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 0.3s ease",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255, 102, 0, 0.15)";
                        e.currentTarget.style.borderColor = "#ff6600";
                        e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 102, 0, 0.3)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(255, 102, 0, 0.05)";
                        e.currentTarget.style.borderColor = "rgba(255, 102, 0, 0.4)";
                        e.currentTarget.style.boxShadow = "none";
                    }}
                >
                    <IconSkipBack size={18} />
                    {t("auth.logout", "Sair")}
                </button>
            </div>

            {/* Centro: Logo e Room Code */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-full max-w-[50%]">
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-48 sm:w-64 md:w-80"><Logo width="100%" /></div>
                    <div className="flex items-center gap-4 text-2xl md:text-4xl text-white tracking-widest mt-2">
                        <span className="opacity-40 font-light">ROOM:</span>
                        <span className="tv-neon-text font-black text-3xl md:text-5xl">{code}</span>
                    </div>
                </div>
            </div>
            
            {/* Direita: QR Code Ticket */}
            <div
              className="tv-vip-ticket z-10 flex-shrink-0 flex items-stretch h-[120px] md:h-[140px] w-[260px] md:w-[300px] bg-[#0d0d0d]"
            >
              <div className="flex items-center justify-center px-3 border-r-2 border-dashed border-[#ff660066] w-12" style={{
                background: "repeating-linear-gradient(45deg, rgba(255, 102, 0, 0.05), rgba(255, 102, 0, 0.05) 8px, transparent 8px, transparent 16px)",
               }}>
                <span className="tv-vip-title text-sm md:text-base -rotate-90 whitespace-nowrap">
                  TICKET
                </span>
              </div>
              <div className="flex-1 p-2 bg-white flex flex-col items-center justify-center overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                    window.location.origin + "/join/" + code
                  )}&color=000000&bgcolor=ffffff`}
                  alt="QR Code"
                  loading="lazy"
                  className="w-[70px] h-[70px] md:w-[80px] md:h-[80px] mb-2 object-contain"
                />
                <div className="text-black text-[0.65rem] md:text-xs font-black uppercase tracking-wider text-center leading-tight">
                  {t("tv.scanToJoin", "Escaneie para entrar")}
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[4vw] items-start max-w-[1600px] w-full mx-auto pb-8 md:pb-[4vh] px-4 md:px-8">
            {/* Próxima música / Fila */}
            <div className="tv-vip-ticket">
              {state.queue.length > 0 ? (
                <>
                  <div className="tv-vip-header" style={{ padding: "40px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.4rem", color: "#00e5ff", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, marginBottom: "20px", textShadow: "0 0 10px rgba(0,229,255,0.6)" }}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <IconMusic size={24} /> {t("tv.nextSong", "Next song")}
                      </span>
                    </div>
                    <div style={{ fontSize: "3rem", fontWeight: 900, color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.5)", marginBottom: "20px", lineHeight: 1.2 }}>
                      {state.queue[0].title}
                    </div>
                    <div style={{ fontSize: "1.6rem", color: "#ff6600", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontWeight: 600, textShadow: "0 0 10px rgba(255,102,0,0.6)", marginBottom: "40px" }}>
                      <IconMic size={28} />
                      {state.queue[0].singers?.map(s => (typeof s === "string" ? s : s.name)).join(" e ") || state.queue[0].requestedBy}
                    </div>
                    <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
                      <button
                        onClick={() => {
                          setAutoPlayCountdown(null);
                          if (code) nextSong(code, undefined, tvToken);
                        }}
                        style={{
                          background: "transparent",
                          color: "#00e5ff",
                          border: "2px solid #00e5ff",
                          fontSize: "1.6rem",
                          padding: "18px 56px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          boxShadow: "inset 0 0 15px rgba(0,229,255,0.2), 0 0 15px rgba(0,229,255,0.2)",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(0,229,255,0.15)";
                          e.currentTarget.style.boxShadow = "inset 0 0 25px rgba(0,229,255,0.4), 0 0 25px rgba(0,229,255,0.4)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.boxShadow = "inset 0 0 15px rgba(0,229,255,0.2), 0 0 15px rgba(0,229,255,0.2)";
                        }}
                      >
                        <IconPlay size={28} />
                        {autoPlayCountdown !== null
                          ? `${t("mobile.start", "Start!")} (${autoPlayCountdown}s)`
                          : t("mobile.start", "Start!")}
                      </button>
                      <button
                        onClick={() => handleQueueRemove(state.queue[0].id)}
                        style={{
                          background: "rgba(255, 102, 0, 0.1)",
                          color: "#ff6600",
                          border: "2px solid #ff6600",
                          padding: "16px 28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,102,0,0.2)";
                          e.currentTarget.style.boxShadow = "inset 0 0 15px rgba(255,102,0,0.4), 0 0 15px rgba(255,102,0,0.4)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,102,0,0.1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        title="Remover da fila"
                      >
                        <IconTrash size={32} />
                      </button>
                    </div>
                  </div>

                  {state.queue.length > 1 && (
                    <div className="tv-vip-body">
                      <h3 style={{ margin: "0 0 24px", fontSize: "1.4rem", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Na fila ({state.queue.length - 1} mais)
                      </h3>
                      {state.queue.slice(1, 6).map((item) => (
                        <div
                          key={item.id}
                          className="tv-vip-box"
                          style={{
                            marginBottom: "16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                            padding: "20px",
                          }}
                        >
                          <div style={{ flex: 1, overflow: "hidden" }}>
                            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
                              <TruncatedText text={item.title} maxLength={35} />
                            </div>
                            <div style={{ color: "#00e5ff", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                              <IconUser size={14} />
                              {item.singers?.map(s => (typeof s === "string" ? s : s.name)).join(" e ") || item.requestedBy}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 12 }}>
                            <button className="tv-vip-btn-cyan" style={{ padding: "12px" }} onClick={() => handleQueueMove(item.id, "up")} title="Subir"><IconChevronUp /></button>
                            <button className="tv-vip-btn-cyan" style={{ padding: "12px" }} onClick={() => handleQueueMove(item.id, "down")} title="Descer"><IconChevronDown /></button>
                            <button className="tv-vip-btn-cyan" style={{ padding: "12px" }} onClick={() => handleQueueToTop(item.id)} title="Mover para o topo"><IconChevronsUp /></button>
                            <button 
                              className="tv-vip-btn-cyan" 
                              style={{ padding: "12px", borderColor: "#ff3333", color: "#ff3333", boxShadow: "inset 0 0 8px rgba(255,51,51,0.1)" }} 
                              onClick={() => handleQueueRemove(item.id)} 
                              title="Remover"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                      {state.queue.length > 6 && (
                        <div style={{ color: "#ff6600", marginTop: 20, textAlign: "center", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "1px" }}>
                          ... e mais {state.queue.length - 6}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: "100px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: "6rem", marginBottom: 30, color: "#ff6600", opacity: 0.8, textShadow: "0 0 30px rgba(255,102,0,0.4)", display: "flex", justifyContent: "center" }}>
                    <IconMusic size={100} />
                  </div>
                  <h2 className="tv-vip-title" style={{ fontSize: "3rem", marginBottom: "20px", whiteSpace: "normal" }}>{t("tv.emptyQueue", "Fila vazia")}</h2>
                  <p style={{ color: "#00e5ff", fontSize: "1.5rem", fontWeight: 600, letterSpacing: "1px" }}>
                    {t("tv.scanToAdd", "Escaneie o QR code e adicione músicas!")}
                  </p>
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="tv-vip-ticket">
              <div className="tv-vip-header" style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <h2 className="tv-vip-title" style={{ fontSize: "2rem", display: "flex", alignItems: "center", gap: 16 }}>
                  <IconTrophy size={40} /> {t("tv.ranking", "Ranking")}
                </h2>
                {/* Toggle Solo/Duplas */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button className={`tv-vip-btn-cyan ${rankingView === "solo" ? "active" : ""}`} onClick={() => { setRankingView("solo"); setAutoRotate(false); }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IconUser size={18} /> {t("tv.solo", "Solo")}</span>
                  </button>
                  <button className={`tv-vip-btn-cyan ${rankingView === "duet" ? "active" : ""}`} onClick={() => { setRankingView("duet"); setAutoRotate(false); }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IconUsers size={18} /> {t("tv.duets", "Duplas")}</span>
                  </button>
                </div>
              </div>

              <div className="tv-vip-body">
              {rankingView === "solo" ? (
                // Solo ranking
                Object.keys(state.ranking).length === 0 ? (
                  <div style={{ padding: "60px", textAlign: "center", color: "#888", fontSize: "1.4rem", lineHeight: 1.6 }}>
                    {t("tv.nobodyScored", "Ninguém pontuou ainda.")}
                    <br />
                    <span style={{ color: "#00e5ff" }}>{t("tv.singToAppear", "Cante uma música para aparecer aqui!")}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {Object.entries(state.ranking)
                      .sort(([, a], [, b]) => b.score - a.score)
                      .map(([odUserId, entry], i) => (
                        <div key={odUserId} className="tv-vip-box" style={{ 
                          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px",
                          border: i === 0 ? "1px solid #ffcc00" : i === 1 ? "1px solid #cdcdcd" : i === 2 ? "1px solid #cd7f32" : "1px solid #333",
                          boxShadow: i === 0 ? "0 0 20px rgba(255,204,0,0.2)" : "none"
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <span style={{
                              width: 44, height: 44, borderRadius: "50%",
                              background: i === 0 ? "linear-gradient(45deg, #ffcc00, #ffaa00)" : i === 1 ? "linear-gradient(45deg, #eee, #aaa)" : i === 2 ? "linear-gradient(45deg, #e6a181, #cd7f32)" : "#222",
                              color: i < 3 ? "#000" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 800,
                              boxShadow: i < 3 ? "0 0 15px rgba(0,0,0,0.5)" : "none"
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: "1.6rem", fontWeight: i < 3 ? 800 : 600, color: "#fff" }}>{entry.name}</span>
                          </span>
                          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: i === 0 ? "#ffcc00" : i === 1 ? "#ddd" : i === 2 ? "#cd7f32" : "#00e5ff", textShadow: i === 0 ? "0 0 15px rgba(255,204,0,0.5)" : "none" }}>
                            {entry.score} pts
                          </span>
                        </div>
                      ))}
                  </div>
                )
              ) : // Duet ranking
                !state.duetRanking || state.duetRanking.length === 0 ? (
                  <div style={{ padding: "60px", textAlign: "center", color: "#888", fontSize: "1.4rem", lineHeight: 1.6 }}>
                    {t("tv.noDuetScored", "Nenhuma dupla pontuou ainda.")}
                    <br />
                    <span style={{ color: "#00e5ff" }}>{t("tv.singDuetToAppear", "Cante em dupla para aparecer aqui!")}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {[...state.duetRanking]
                      .sort((a, b) => b.score - a.score)
                      .map((duet, i) => (
                        <div key={duet.names.join("-")} className="tv-vip-box" style={{ 
                          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px",
                          border: i === 0 ? "1px solid #ffcc00" : i === 1 ? "1px solid #cdcdcd" : i === 2 ? "1px solid #cd7f32" : "1px solid #333",
                          boxShadow: i === 0 ? "0 0 20px rgba(255,204,0,0.2)" : "none"
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <span style={{
                              width: 44, height: 44, borderRadius: "50%",
                              background: i === 0 ? "linear-gradient(45deg, #ffcc00, #ffaa00)" : i === 1 ? "linear-gradient(45deg, #eee, #aaa)" : i === 2 ? "linear-gradient(45deg, #e6a181, #cd7f32)" : "#222",
                              color: i < 3 ? "#000" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 800,
                              boxShadow: i < 3 ? "0 0 15px rgba(0,0,0,0.5)" : "none"
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: "1.5rem", fontWeight: i < 3 ? 800 : 600, color: "#fff" }}>{duet.names[0]} & {duet.names[1]}</span>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontSize: "1.8rem", fontWeight: 900, color: i === 0 ? "#ffcc00" : i === 1 ? "#ddd" : i === 2 ? "#cd7f32" : "#00e5ff", textShadow: i === 0 ? "0 0 15px rgba(255,204,0,0.5)" : "none" }}>
                              {duet.score} pts
                            </span>
                            <span style={{ fontSize: "1rem", color: "#888", marginTop: 4, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                              {duet.count} {duet.count > 1 ? "músicas" : "música"}
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
