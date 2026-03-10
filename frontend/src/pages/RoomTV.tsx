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
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
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
  }, [code, authChecked, finalized]);

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
              padding: "12px 20px",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              {state.nowPlaying ? (
                <>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    <TruncatedText text={state.nowPlaying.title} maxLength={60} />
                  </div>
                  <div
                    style={{
                      opacity: 0.7,
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconMic size={14} />
                    {state.nowPlaying.singers
                      ?.map(s => (typeof s === "string" ? s : s.name))
                      .join(" e ") || state.nowPlaying.requestedBy}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "1.1rem", fontWeight: 700, opacity: 0.8 }}>
                  {t("tv.preparingNext", "Preparing next song...")}
                </div>
              )}
            </div>
            <div
              style={{ textAlign: "right", opacity: 0.9, fontSize: "0.85rem" }}
            >
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(30, 30, 30, 0.7)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                padding: "6px 14px",
                color: "#e0e0e0",
                fontSize: "0.95rem",
                fontWeight: 600,
                boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                marginBottom: "8px"
              }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#2ecc71",
                  boxShadow: "0 0 8px #2ecc71"
                }} />
                {participantsCount} pessoa{participantsCount !== 1 ? 's' : ''}
              </div>
              {state.queue.length > 0 && (
                <div>
                  {t("tv.nextSong", "Next song")}:{" "}
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
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 40,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => navigate("/")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                {t("auth.logout", "Logout")}
              </button>
              <h1
                style={{
                  margin: 0,
                  fontSize: "2rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Logo width={160} /> - {t("tv.room", "Room")}: {code}
              </h1>
            </div>
            <div
              style={{
                background: "white",
                padding: 16,
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                  window.location.origin + "/join/" + code
                )}`}
                alt="QR Code"
                loading="lazy"
                style={{
                  display: "block",
                  marginBottom: 8,
                  width: 120,
                  height: 120,
                }}
              />
              <div
                style={{ color: "#000", fontSize: "0.8rem", fontWeight: 600 }}
              >
                {t("tv.scanToJoin", "Scan to join")}
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "start",
            }}
          >
            {/* Próxima música / Fila */}
            <div>
              {state.queue.length > 0 ? (
                <>
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #7c4dff 0%, #ff4081 100%)",
                      borderRadius: 16,
                      padding: 32,
                      marginBottom: 24,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1rem",
                        opacity: 0.9,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <IconMusic size={16} /> {t("tv.nextSong", "Next song")}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      {state.queue[0].title}
                    </div>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        opacity: 0.9,
                        marginBottom: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <IconMic size={20} />
                      {state.queue[0].singers
                        ?.map(s => (typeof s === "string" ? s : s.name))
                        .join(" e ") || state.queue[0].requestedBy}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => {
                          setAutoPlayCountdown(null);
                          if (code) nextSong(code, undefined, tvToken);
                        }}
                        style={{
                          background: "white",
                          color: "#7c4dff",
                          fontSize: "1.3rem",
                          padding: "16px 48px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <IconPlay size={20} />
                        {autoPlayCountdown !== null
                          ? `${t("mobile.start", "Start!")} (${autoPlayCountdown}s)`
                          : t("mobile.start", "Start!")}
                      </button>
                      <button
                        onClick={() => handleQueueRemove(state.queue[0].id)}
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          padding: "16px 22px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Remover da fila"
                      >
                        <IconTrash size={24} />
                      </button>
                    </div>
                  </div>

                  {state.queue.length > 1 && (
                    <div className="card" style={{ padding: 20 }}>
                      <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>
                        Na fila ({state.queue.length - 1} mais)
                      </h3>
                      {state.queue.slice(1, 6).map((item, i) => (
                        <div
                          key={item.id}
                          style={{
                            padding: "10px 0",
                            borderBottom:
                              i < Math.min(state.queue.length - 2, 4)
                                ? "1px solid #333"
                                : "none",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <span style={{ flex: 1 }}>
                            <TruncatedText text={item.title} maxLength={40} />
                          </span>
                          <span style={{ color: "#888", whiteSpace: "nowrap" }}>
                            {item.singers
                              ?.map(s => (typeof s === "string" ? s : s.name))
                              .join(" e ") || item.requestedBy}
                          </span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => handleQueueMove(item.id, "up")}
                              style={{
                                padding: "6px 8px",
                                background: "#333",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Subir"
                            >
                              <IconChevronUp />
                            </button>
                            <button
                              onClick={() => handleQueueMove(item.id, "down")}
                              style={{
                                padding: "6px 8px",
                                background: "#333",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Descer"
                            >
                              <IconChevronDown />
                            </button>
                            <button
                              onClick={() => handleQueueToTop(item.id)}
                              style={{
                                padding: "6px 8px",
                                background: "#333",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Mover para o topo"
                            >
                              <IconChevronsUp />
                            </button>
                            <button
                              onClick={() => handleQueueRemove(item.id)}
                              style={{
                                padding: "6px 8px",
                                background: "rgba(180,60,60,0.9)",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Remover"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                      {state.queue.length > 6 && (
                        <div style={{ color: "#888", marginTop: 8 }}>
                          ... e mais {state.queue.length - 6}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className="card"
                  style={{
                    padding: 48,
                    textAlign: "center",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "4rem",
                      marginBottom: 16,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <IconMusic size={64} />
                  </div>
                  <h2 style={{ margin: "0 0 12px" }}>{t("tv.emptyQueue", "Empty queue")}</h2>
                  <p style={{ color: "#888", fontSize: "1.1rem" }}>
                    {t("tv.scanToAdd", "Scan QR code to add songs!")}
                  </p>
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <IconTrophy size={28} /> {t("tv.ranking", "Ranking")}
                </h2>
                {/* Toggle Solo/Duplas */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "#222",
                    borderRadius: 8,
                    padding: 4,
                  }}
                >
                  <button
                    onClick={() => {
                      setRankingView("solo");
                      setAutoRotate(false);
                    }}
                    style={{
                      padding: "6px 12px",
                      background:
                        rankingView === "solo" ? "#ff4081" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                    }}
                  >
                    <IconUser size={14} /> {t("tv.solo", "Solo")}
                  </button>
                  <button
                    onClick={() => {
                      setRankingView("duet");
                      setAutoRotate(false);
                    }}
                    style={{
                      padding: "6px 12px",
                      background:
                        rankingView === "duet" ? "#ff4081" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                    }}
                  >
                    <IconUsers size={14} /> {t("tv.duets", "Duets")}
                  </button>
                </div>
              </div>

              {rankingView === "solo" ? (
                // Solo ranking
                Object.keys(state.ranking).length === 0 ? (
                  <p style={{ color: "#888", fontSize: "1.1rem" }}>
                    {t("tv.nobodyScored", "Nobody scored yet.")}
                    <br />
                    {t("tv.singToAppear", "Sing a song to appear here!")}
                  </p>
                ) : (
                  <div>
                    {Object.entries(state.ranking)
                      .sort(([, a], [, b]) => b.score - a.score)
                      .map(([odUserId, entry], i) => (
                        <div
                          key={odUserId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 0",
                            borderBottom: "1px solid #333",
                            fontSize: i < 3 ? "1.2rem" : "1rem",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background:
                                  i === 0
                                    ? "#f1c40f"
                                    : i === 1
                                      ? "#bdc3c7"
                                      : i === 2
                                        ? "#cd6133"
                                        : "#555",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                              }}
                            >
                              {i + 1}
                            </span>
                            {entry.name}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: i === 0 ? "#ffd700" : "inherit",
                            }}
                          >
                            {entry.score} pts
                          </span>
                        </div>
                      ))}
                  </div>
                )
              ) : // Duet ranking
                !state.duetRanking || state.duetRanking.length === 0 ? (
                  <p style={{ color: "#888", fontSize: "1.1rem" }}>
                    {t("tv.noDuetScored", "No duet scored yet.")}
                    <br />
                    {t("tv.singDuetToAppear", "Sing a duet to appear here!")}
                  </p>
                ) : (
                  <div>
                    {[...state.duetRanking]
                      .sort((a, b) => b.score - a.score)
                      .map((duet, i) => (
                        <div
                          key={duet.names.join("-")}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 0",
                            borderBottom: "1px solid #333",
                            fontSize: i < 3 ? "1.2rem" : "1rem",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background:
                                  i === 0
                                    ? "#f1c40f"
                                    : i === 1
                                      ? "#bdc3c7"
                                      : i === 2
                                        ? "#cd6133"
                                        : "#555",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                              }}
                            >
                              {i + 1}
                            </span>
                            {duet.names[0]} & {duet.names[1]}
                          </span>
                          <span
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: i === 0 ? "#ffd700" : "inherit",
                              }}
                            >
                              {duet.score} pts
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#888" }}>
                              {duet.count} música{duet.count > 1 ? "s" : ""}
                            </span>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
            </div>
          </div>
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
    </div>
  );
}
