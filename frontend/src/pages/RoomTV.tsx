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
} from "../api";
import ScoreOverlay from "../components/ScoreOverlay";
import Logo from "../components/Logo";
import toast, { Toaster } from "react-hot-toast";
import { GlassContainer, LiquidBackground } from "../components/ui/LiquidGlassLayout";

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

// Icon components (Minimalist)
const IconChevronUp = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const IconChevronDown = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const IconChevronsUp = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 11 12 6 7 11"></polyline>
    <polyline points="17 18 12 13 7 18"></polyline>
  </svg>
);

const IconSkipForward = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const IconTrash = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconMusic = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const IconMic = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconX = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconTrophy = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
);

const IconPlay = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconMaximize = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const IconMinimize = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
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
            background: 'linear-gradient(135deg, #ff007f, #ff66cc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
            boxShadow: '0 4px 15px rgba(255, 0, 127, 0.4)'
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
  }, [state?.queue, t]);

  // Check for tvToken on mount
  useEffect(() => {
    if (!code) return;
    const token = localStorage.getItem(`tvToken_${code}`);
    if (!token) {
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

  // Listen to fullscreenchange events to sync state
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
          reaction?: string;
          name?: string;
        };
        if (m.type === "STATE" && m.state) {
          const newState = m.state;
          if (!finalized || isTransitioningRef.current) {
            setState(newState);
          }
          if (newState.nowPlaying || newState.queue.length === 0) {
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
          const newReaction = {
            id: Math.random().toString(36).substring(2, 9),
            emoji: m.reaction!,
            name: m.name || "Convidado",
            x: Math.random() * 80 + 10,
          };
          setReactions(prev => [...prev, newReaction]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
          }, 4500);
        }
      },
      tvToken
    );
    wsRef.current = ws;

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
  }, [code, authChecked, finalized, reconnectKey, t, tvToken]);

  // Handle visibility change to refresh state
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === "visible" && code) {
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
      window.removeEventListener("visibilitychange", handleSync);
    };
  }, [code, finalized]);

  // Create / destroy YouTube player
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    if (!ytReady || !videoId || showScore || !hasInteracted) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const container = playerContainerRef.current;
      if (!container) return;

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
          fs: 0,
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
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [ytReady, videoId, showScore, hasInteracted, handleVideoEnd]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <LiquidBackground />
        <p style={{ color: "#fff", position: "relative", zIndex: 1 }}>{t("tv.verifyingAccess", "Verificando acesso...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LiquidBackground />
        <GlassContainer style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: '2rem' }}>
            <IconX size={32} /> {error}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 16 }}>
            {t("tv.noRoomFound", "Go back and create a new room.")}
          </p>
          <button
            onClick={() => navigate("/")}
            className="tap-effect"
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              padding: "16px 32px",
              borderRadius: 20,
              fontSize: "1.1rem",
              fontWeight: 900,
              marginTop: 32,
              cursor: "pointer",
              boxShadow: "0 10px 30px var(--primary-glow)"
            }}
          >
            {t("common.backToHome", "← Back to home")}
          </button>
        </GlassContainer>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LiquidBackground />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Logo width={400} />
          <h2 style={{ color: "#fff", marginTop: 40, fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 4 }}>
            {t("mobile.connecting", { code })}...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <LiquidBackground />
      
      <div 
        ref={fullScreenWrapperRef}
        style={{ 
          height: "100vh", 
          position: 'relative',
          zIndex: 1
        }}
      >
        <Toaster />
        
        {/* Interaction Overlay */}
        {!hasInteracted && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(40px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setHasInteracted(true)}
          >
            <GlassContainer style={{ padding: 60, textAlign: "center", maxWidth: 500 }}>
              <div style={{ 
                width: 100, height: 100, borderRadius: "50%", background: "var(--primary)", 
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px",
                boxShadow: "0 0 50px var(--primary-glow)"
              }}>
                <IconPlay size={48} />
              </div>
              <h2 style={{ fontSize: "2.5rem", margin: "0 0 16px", fontWeight: 900 }}>{t("tv.clickToActivate", "Clique para Ativar a TV")}</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", lineHeight: 1.6 }}>
                {t("tv.autoplayWarning", "Browsers block autoplay videos. Click anywhere on this screen once for autoplay karaoke.")}
              </p>
              <button
                style={{
                  marginTop: 40,
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  padding: "20px 48px",
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  borderRadius: 24,
                  cursor: "pointer",
                  boxShadow: "0 10px 40px var(--primary-glow)"
                }}
              >
                {t("common.continue", "Continuar")}
              </button>
            </GlassContainer>
          </div>
        )}

        {/* MODO 1: NOW PLAYING */}
        {(state.nowPlaying || isTransitioning) && !showScore && (
          <div style={{ position: "absolute", inset: 0, background: "#000", display: "flex", flexDirection: "column" }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, padding: "40px 60px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)",
              zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                {state.nowPlaying ? (
                  <>
                    <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#fff", textShadow: "0 5px 20px rgba(0,0,0,0.8)", margin: "0 0 8px" }}>
                      <TruncatedText text={state.nowPlaying.title} maxLength={50} />
                    </h1>
                    <div style={{ color: "var(--primary)", fontSize: "1.8rem", display: "flex", alignItems: "center", gap: 15, fontWeight: 800, textShadow: "0 0 20px var(--primary-glow)" }}>
                      <IconMic size={32} />
                      {state.nowPlaying.singers?.map(s => (typeof s === "string" ? s : s.name)).join(" & ") || state.nowPlaying.requestedBy}
                    </div>
                  </>
                ) : (
                  <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", opacity: 0.6 }}>{t("tv.preparingNext", "Preparando próxima música...")}</h1>
                )}
              </div>
              
              <div style={{ textAlign: "right" }}>
                <GlassContainer intensity={0} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 24px", borderRadius: 30, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2ecc71", boxShadow: "0 0 15px #2ecc71" }} />
                  <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>{participantsCount} {t("tv.participants", "Participantes")}</span>
                </GlassContainer>
                
                {state.queue.length > 0 && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", fontWeight: 700, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                    <span style={{ color: "var(--primary)" }}>{t("tv.nextSong", "Próxima")}:</span>{" "}
                    {state.queue[0].singers?.map(s => (typeof s === "string" ? s : s.name)).join(" & ") || state.queue[0].requestedBy}
                  </div>
                )}
              </div>
            </div>

            <div ref={playerContainerRef} style={{ flex: 1, width: "100%", height: "100%" }} />

            {/* Controls */}
            <div style={{ position: "absolute", bottom: 40, right: 60, display: "flex", gap: 20, zIndex: 10 }}>
              <button
                onClick={toggleFullscreen}
                className="tap-effect"
                style={{
                  background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)",
                  padding: "12px 24px", borderRadius: 16, color: "#fff", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 10
                }}
              >
                {isFullscreen ? <><IconMinimize size={20} /> {t("tv.exitScreen", "Sair")}</> : <><IconMaximize size={20} /> {t("tv.fullScreen", "Tela Cheia")}</>}
              </button>
              
              <button
                onClick={() => code && finalizeSong(code, "Host", undefined, tvToken)}
                className="tap-effect"
                style={{
                  background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)",
                  padding: "12px 24px", borderRadius: 16, color: "#fff", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 10
                }}
              >
                {t("common.skip", "Pular")} <IconSkipForward size={20} />
              </button>
            </div>

            <div style={{ position: "absolute", bottom: 40, left: 60, background: "#fff", padding: 12, borderRadius: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 10, opacity: 0.8 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin + "/join/" + code)}`}
                alt="QR Code" style={{ width: 120, height: 120, display: "block" }}
              />
              <div style={{ color: "#000", textAlign: "center", fontWeight: 900, marginTop: 8, fontSize: "1.2rem", letterSpacing: 2 }}>{code}</div>
            </div>
          </div>
        )}

        {/* MODO 2: LOBBY */}
        {!state.nowPlaying && !showScore && !isTransitioning && (
          <div style={{ height: "100vh", padding: "40px 60px", display: "flex", flexDirection: "column" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 60 }}>
              <div style={{ flex: 1 }}>
                <button onClick={() => navigate("/")} className="tap-effect" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 24px", borderRadius: 16, color: "#fff", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                  {t("auth.logout", "Sair")}
                </button>
              </div>
              
              <div style={{ flex: 1, textAlign: "center" }}>
                <Logo width={300} />
                <div style={{ marginTop: 16, fontSize: "1.8rem", fontWeight: 900, letterSpacing: 4 }}>
                  <span style={{ opacity: 0.3 }}>SALA:</span> <span style={{ color: "var(--primary)" }}>{code}</span>
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                <GlassContainer style={{ padding: 16, background: "#fff", borderRadius: 24, display: "flex", alignItems: "center", gap: 20 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + "/join/" + code)}`} alt="QR" style={{ width: 80, height: 80 }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ color: "#000", fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>{t("tv.scanToJoin", "Scan to Sing")}</div>
                    <div style={{ color: "#888", fontSize: "0.8rem", fontWeight: 700 }}>KARAOKE ONLINE</div>
                  </div>
                </GlassContainer>
              </div>
            </header>

            <main style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, minHeight: 0, overflow: "hidden" }}>
              {/* Queue */}
              <GlassContainer intensity={20} style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
                {state.queue.length > 0 ? (
                  <>
                    <div style={{ padding: 40, background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                      <div style={{ color: "var(--primary)", fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, marginBottom: 20 }}>
                        {t("tv.nextSong", "PRÓXIMA MÚSICA")}
                      </div>
                      <h2 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "0 0 16px" }}>{state.queue[0].title}</h2>
                      <div style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.6)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
                        <IconMic size={28} />
                        {state.queue[0].singers?.map(s => (typeof s === "string" ? s : s.name)).join(" & ") || state.queue[0].requestedBy}
                      </div>
                      <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
                        <button
                          onClick={() => { setAutoPlayCountdown(null); if (code) nextSong(code, undefined, tvToken); }}
                          className="tap-effect"
                          style={{ background: "var(--primary)", color: "#fff", border: "none", padding: "18px 48px", borderRadius: 24, fontSize: "1.4rem", fontWeight: 900, boxShadow: "0 10px 40px var(--primary-glow)", display: "flex", alignItems: "center", gap: 12 }}
                        >
                          <IconPlay size={28} />
                          {autoPlayCountdown !== null ? `${t("common.start", "COMEÇAR")} (${autoPlayCountdown}s)` : t("common.start", "COMEÇAR")}
                        </button>
                        <button onClick={() => handleQueueRemove(state.queue[0].id)} className="tap-effect" style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.2)", color: "#ff4444", padding: "0 24px", borderRadius: 24 }}><IconTrash size={28} /></button>
                      </div>
                    </div>
                    {state.queue.length > 1 && (
                      <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
                        <h3 style={{ fontSize: "1rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 24 }}>NA FILA ({state.queue.length - 1})</h3>
                        {state.queue.slice(1, 6).map(item => (
                          <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: 24, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ overflow: "hidden" }}>
                              <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 4 }}><TruncatedText text={item.title} maxLength={40} /></div>
                              <div style={{ color: "var(--primary)", fontSize: "1rem", fontWeight: 700 }}>{item.singers?.map(s => (typeof s === "string" ? s : s.name)).join(" & ") || item.requestedBy}</div>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <button onClick={() => handleQueueMove(item.id, "up")} className="tap-effect" style={{ padding: 10, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 12, color: "#fff" }}><IconChevronUp /></button>
                              <button onClick={() => handleQueueMove(item.id, "down")} className="tap-effect" style={{ padding: 10, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 12, color: "#fff" }}><IconChevronDown /></button>
                              <button onClick={() => handleQueueToTop(item.id)} className="tap-effect" style={{ padding: 10, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 12, color: "#fff" }}><IconChevronsUp /></button>
                              <button onClick={() => handleQueueRemove(item.id)} className="tap-effect" style={{ padding: 10, background: "rgba(255,68,68,0.1)", border: "none", borderRadius: 12, color: "#ff4444" }}><IconTrash /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, textAlign: "center" }}>
                    <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                      <IconMusic size={60} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: 16 }}>{t("tv.emptyQueue", "Fila Vazia")}</h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", fontWeight: 700 }}>{t("tv.scanToAdd", "Escaneie o QR code acima para adicionar músicas!")}</p>
                  </div>
                )}
              </GlassContainer>

              {/* Ranking */}
              <GlassContainer intensity={20} style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
                <div style={{ padding: 40, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h2 style={{ fontSize: "2rem", fontWeight: 900, display: "flex", alignItems: "center", gap: 16 }}><IconTrophy size={40} /> RANKING</h2>
                  <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 6 }}>
                    <button onClick={() => { setRankingView("solo"); setAutoRotate(false); }} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: rankingView === "solo" ? "var(--primary)" : "transparent", color: "#fff", fontWeight: 800, cursor: "pointer" }}>SOLO</button>
                    <button onClick={() => { setRankingView("duet"); setAutoRotate(false); }} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: rankingView === "duet" ? "var(--primary)" : "transparent", color: "#fff", fontWeight: 800, cursor: "pointer" }}>DUPLAS</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
                  {rankingView === "solo" ? (
                    Object.keys(state.ranking).length === 0 ? (
                      <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>{t("tv.nobodyScored", "Ninguém pontuou ainda.")}</div>
                    ) : (
                      Object.entries(state.ranking).sort(([, a], [, b]) => b.score - a.score).map(([id, entry], i) => (
                        <div key={id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: 24, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", border: i === 0 ? "2px solid #ffcc00" : "1px solid rgba(255,255,255,0.05)", boxShadow: i === 0 ? "0 0 30px rgba(255,204,0,0.1)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: i === 0 ? "#ffcc00" : i === 1 ? "#ddd" : i === 2 ? "#cd7f32" : "#333", color: i < 3 ? "#000" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.4rem" }}>{i + 1}</div>
                            <span style={{ fontSize: "1.6rem", fontWeight: 800 }}>{entry.name}</span>
                          </div>
                          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: i === 0 ? "#ffcc00" : "var(--primary)" }}>{entry.score} pts</span>
                        </div>
                      ))
                    )
                  ) : (
                    !state.duetRanking || state.duetRanking.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>{t("tv.noDuetScored", "Nenhuma dupla pontuou ainda.")}</div>
                    ) : (
                      [...state.duetRanking].sort((a, b) => b.score - a.score).map((duet, i) => (
                        <div key={duet.names.join("-")} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: 24, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", border: i === 0 ? "2px solid #ffcc00" : "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: i === 0 ? "#ffcc00" : "#333", color: i === 0 ? "#000" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.4rem" }}>{i + 1}</div>
                            <span style={{ fontSize: "1.6rem", fontWeight: 800 }}>{duet.names.join(" & ")}</span>
                          </div>
                          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--primary)" }}>{duet.score} pts</span>
                        </div>
                      ))
                    )
                  )}
                </div>
              </GlassContainer>
            </main>
          </div>
        )}

        {/* Score Overlay */}
        {showScore && finalized && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
            <ScoreOverlay
              open={showScore}
              scoreOverride={finalized.score}
              singer={finalized.singer}
              enableAudio={true}
              onDone={() => setFinalized(null)}
            />
          </div>
        )}

        {/* Reactions */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
          <ReactionDisplay reactions={reactions} />
        </div>
      </div>
    </div>
  );
}
