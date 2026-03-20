import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getDeviceFingerprint } from "../lib/deviceId";
import {
  connectWS,
  enqueue,
  getState,
  getParticipants,
  getSongLibrary,
  deleteSong,
  removeQueueItem,
  searchYouTube,
  getVideoInfo,
  type SavedSong,
  type YouTubeSearchResult,
} from "../api";
import { GlassContainer, LiquidBackground } from "../components/ui/LiquidGlassLayout";
import Logo from "../components/Logo";

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
}

type Tab = "queue" | "ranking" | "saved";
type RankingView = "solo" | "duet";

// Icon components
const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconPlus = ({ size = 16, className, style, color }: { size?: number; className?: string; style?: React.CSSProperties; color?: string }) => (
  <svg width={size} height={size} className={className} style={style} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const IconMic = ({ size = 16, className, style, color }: { size?: number; className?: string; style?: React.CSSProperties; color?: string }) => (
  <svg width={size} height={size} className={className} style={style} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconMusic = ({ size = 16, className, style, color }: { size?: number; className?: string; style?: React.CSSProperties; color?: string }) => (
  <svg width={size} height={size} className={className} style={style} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const IconSearch = ({ size = 16, className, style, color }: { size?: number; className?: string; style?: React.CSSProperties; color?: string }) => (
  <svg width={size} height={size} className={className} style={style} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconX = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconUser = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const IconUsers = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconTrophy = ({ size = 16, className, style, color }: { size?: number; className?: string; style?: React.CSSProperties; color?: string }) => (
  <svg width={size} height={size} className={className} style={style} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
);

const IconLibrary = ({ size = 16, color }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 17.5a2.5 2.5 0 0 0 0-5H4.5a2.5 2.5 0 0 0 0 5H8z"></path>
    <path d="M19.5 17.5a2.5 2.5 0 0 0 0-5H16a2.5 2.5 0 0 0 0 5h3.5z"></path>
    <path d="M4.5 17.5V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v12.5"></path>
  </svg>
);

const IconPlay = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

export default function RoomMobile() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [state, setState] = useState<RoomState | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [tab, setTab] = useState<Tab>("queue");
  const [rankingView, setRankingView] = useState<RankingView>("solo");
  
  // States for song adding
  const [showAddSong, setShowAddSong] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  
  // Selection / Modal states
  const [addSongModal, setAddSongModal] = useState<YouTubeSearchResult | null>(null);
  const [modalPartner, setModalPartner] = useState("");
  const [previewVideo, setPreviewVideo] = useState<YouTubeSearchResult | null>(null);
  
  // Library
  const [songLibrary, setSongLibrary] = useState<SavedSong[]>([]);
  const [showAllQueue, setShowAllQueue] = useState(false);
  
  // Other UI states
  const [toast, setToast] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [myUserId, setMyUserId] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getDeviceFingerprint().then(setMyUserId);
  }, []);

  const isHost = state?.ownerId === myUserId || (user?.canHost && state?.ownerId === user.id);

  // Notification helper
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Cooldown timer logic
  useEffect(() => {
    if (!state || !state.lastEnqueueAt || !myUserId) return;
    const last = state.lastEnqueueAt[myUserId] || 0;
    const now = Date.now();
    const wait = 2 * 60 * 1000; // 2 minutes
    const passed = now - last;
    
    if (passed < wait) {
      setCooldownRemaining(Math.ceil((wait - passed) / 1000));
      const interval = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCooldownRemaining(0);
    }
  }, [state?.lastEnqueueAt, myUserId]);

  // Load participants periodically
  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => {
      getParticipants(code).then(data => setParticipants(data.participants)).catch(() => {});
    }, 5000);
    getParticipants(code).then(data => setParticipants(data.participants)).catch(() => {});
    return () => clearInterval(interval);
  }, [code]);

  // Load library when needed
  useEffect(() => {
    if (tab === "saved") {
      getSongLibrary().then(setSongLibrary).catch(() => {});
    }
  }, [tab]);

  // WebSocket Connection
  useEffect(() => {
    if (!code) return;

    getState(code).then(s => {
      if (s && !s.error) setState(s);
    }).catch(() => {});

    const ws = connectWS(code, "mobile", t("common.guest", "Convidado"), (msg: any) => {
      if (msg.type === "STATE" && msg.state) {
        setState(msg.state);
      }
    });
    wsRef.current = ws;

    return () => ws.close();
  }, [code, t]);

  // Song management functions
  const handleAddFromSearch = (result: YouTubeSearchResult) => {
    setAddSongModal(result);
    setModalPartner("");
  };

  const handleAddFromSaved = (song: SavedSong) => {
    setAddSongModal({
      videoId: song.videoId,
      title: song.title,
      thumbnail: `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`,
      channelTitle: "Biblioteca"
    });
    setModalPartner("");
  };

  const handleConfirmAddSong = async () => {
    if (!addSongModal || !code) return;
    setAdding(addSongModal.videoId);
    try {
      const myName = t("common.me", "Eu");
      const partnerObj = modalPartner ? participants.find(x => x.id === modalPartner) : null;
      
      const res = await enqueue(
        code, 
        addSongModal.videoId, 
        addSongModal.title, 
        myName, 
        partnerObj?.name, 
        myUserId, 
        partnerObj?.id, 
        myUserId
      );
      
      if (res.success) {
        notify(t("mobile.songAdded", "Música adicionada à fila!"));
        setAddSongModal(null);
        setShowAddSong(false);
      } else {
        notify(res.error || t("mobile.addError", "Erro ao adicionar música."));
      }
    } catch (e) {
      console.error(e);
      notify(t("mobile.addError", "Erro ao adicionar música."));
    } finally {
      setAdding(null);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    if (!window.confirm(t("mobile.confirmDeleteSaved", "Deseja remover esta música da biblioteca?"))) return;
    try {
      const res = await deleteSong(id);
      if (res.success) {
        setSongLibrary(prev => prev.filter(s => s.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const handleQueueRemove = async (itemId: string) => {
    if (!code) return;
    try {
      await removeQueueItem(code, itemId, myUserId);
    } catch(e) { console.error(e); }
  };

  const sendReaction = (emoji: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "REACTION", reaction: emoji }));
  };

  // Searching logic
  const triggerDebouncedSearch = (query: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleManualSearch(query);
    }, 700);
  };

  const handleManualSearch = async (queryOverride?: string) => {
    const q = queryOverride || searchQuery;
    if (!q || q.trim().length < 2) return;
    
    setSearching(true);
    
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();
    
    try {
       const isLink = q.includes("youtube.com") || q.includes("youtu.be");
       if (isLink) {
         const info = await getVideoInfo(q);
         if (info && info.videoId) {
           setSearchResults([{
             videoId: info.videoId,
             title: info.title,
             thumbnail: info.thumbnail,
             channelTitle: info.channelTitle || ""
           }]);
         }
       } else {
         const results = await searchYouTube(q);
         setSearchResults(results);
       }
    } catch (e: any) {
    } finally {
      setSearching(false);
    }
  };

  if (!state) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LiquidBackground />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Logo width={220} />
          <h2 style={{ color: "rgba(255,255,255,0.6)", marginTop: 32, fontSize: '1.2rem', fontWeight: 800 }}>{t("mobile.connecting", { code })}...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <LiquidBackground />
      
      <div style={{ padding: "24px 16px 140px", position: "relative", zIndex: 1 }}>
        {toast && (
          <div style={{
            position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
            background: "var(--primary)", color: "#fff", padding: "14px 28px",
            borderRadius: 999, zIndex: 3000, boxShadow: "0 10px 40px var(--primary-glow)",
            fontSize: "0.95rem", fontWeight: 800, whiteSpace: "nowrap",
            animation: "fadeInUp 0.3s cubic-bezier(0.23, 1, 0.32, 1)"
          }}>
            {toast}
          </div>
        )}

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18, padding: "10px 16px", color: "#fff", fontSize: "0.8rem", fontWeight: 800,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(20px)"
            }}
            className="tap-effect"
          >
            <IconX size={18} />
            <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{t("mobile.leaveRoom", "Sair")}</span>
          </button>
          
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 900, marginBottom: 4 }}>
              {t("mobile.room", "SALA")}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--primary)", lineHeight: 1, textShadow: '0 0 20px var(--primary-glow)' }}>
              {code}
            </div>
          </div>
        </header>

        <GlassContainer intensity={20} style={{ 
          background: "rgba(255,255,255,0.03)", borderRadius: 32, padding: "24px", marginBottom: 32,
          border: "1px solid rgba(255,255,255,0.1)", boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 900, marginBottom: 16 }}>
             {t("tv.nowPlaying", "TOCANDO AGORA")}
          </div>
          {state.nowPlaying ? (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
               <div style={{ position: 'relative', width: 90, height: 68, flexShrink: 0 }}>
                  <img src={`https://i.ytimg.com/vi/${state.nowPlaying.videoId}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16, boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)', borderRadius: 16 }} />
               </div>
               <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                    {state.nowPlaying.title}
                  </div>
                  <div style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                    <IconMic size={14} />
                    {state.nowPlaying.singers?.map(s => s.name).join(" & ") || state.nowPlaying.requestedBy}
                  </div>
               </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: 0.5 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconMusic size={22} />
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{t("tv.preparingNext", "Ninguém cantando ainda...")}</div>
            </div>
          )}
        </GlassContainer>

        <div style={{ 
          display: "flex", background: "rgba(0,0,0,0.2)", padding: 6, borderRadius: 24, marginBottom: 32,
          border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)'
        }}>
          {(["queue", "ranking", "saved"] as Tab[]).map(tName => (
            <button
              key={tName}
              onClick={() => { setTab(tName); if(tName === "queue") setShowAddSong(false); }}
              style={{
                flex: 1, padding: "14px", border: "none", borderRadius: 18, fontWeight: 900, fontSize: "0.8rem",
                background: tab === tName ? "var(--primary)" : "transparent",
                color: tab === tName ? "#fff" : "rgba(255,255,255,0.3)",
                boxShadow: tab === tName ? "0 8px 20px var(--primary-glow)" : "none",
                transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
                textTransform: 'uppercase', letterSpacing: 1
              }}
              className="tap-effect"
            >
              {tName === "queue" ? t("tv.queue", "Fila") : tName === "ranking" ? t("tv.ranking", "Placar") : t("mobile.songLibrary", "Vips")}
            </button>
          ))}
        </div>

        {tab === "queue" && (
          <div style={{ animation: "fadeInUp 0.6s cubic-bezier(0.23, 1, 0.32, 1)" }}>
            {!showAddSong && (
              <>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                   {t("tv.queue", "Fila de Reprodução")}
                   <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,1)', color: '#000', padding: '2px 10px', borderRadius: 99, fontWeight: 900 }}>{state.queue.length}</span>
                </h3>

                <GlassContainer intensity={15} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 32, padding: "24px" }}>
                  {state.queue.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                         <IconMusic size={32} style={{ opacity: 0.2 }} />
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>{t("tv.emptyQueue", "A fila está vazia!")}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(showAllQueue ? state.queue : state.queue.slice(0, 5)).map((item, idx) => (
                        <div key={item.id} style={{ 
                          display: "flex", alignItems: "center", gap: 16, padding: 16, 
                          background: "rgba(255,255,255,0.02)", borderRadius: 20, 
                          border: "1px solid rgba(255,255,255,0.05)"
                        }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 900, color: "var(--primary)" }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{item.singers?.map(s => s.name).join(" & ") || item.requestedBy}</div>
                          </div>
                          {(isHost || item.requesterId === myUserId) && (
                            <button onClick={() => handleQueueRemove(item.id)} style={{ padding: 10, borderRadius: 12, background: 'rgba(255,68,68,0.1)', border: 'none', color: '#ff4444' }}><IconTrash size={18} /></button>
                          )}
                        </div>
                      ))}
                      {!showAllQueue && state.queue.length > 5 && (
                        <button onClick={() => setShowAllQueue(true)} style={{ marginTop: 8, padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 900 }} className="tap-effect">
                           + {state.queue.length - 5} {t("mobile.moreSongs", "músicas")}
                        </button>
                      )}
                    </div>
                  )}
                </GlassContainer>

                <button 
                  onClick={() => setShowAddSong(true)}
                  disabled={cooldownRemaining > 0}
                  style={{ 
                    marginTop: 32, width: '100%', padding: '24px', borderRadius: 28, 
                    background: cooldownRemaining > 0 ? "rgba(255,255,255,0.05)" : 'var(--primary)',
                    color: cooldownRemaining > 0 ? "rgba(255,255,255,0.2)" : '#fff', 
                    fontSize: '1.2rem', fontWeight: 900, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    boxShadow: cooldownRemaining > 0 ? "none" : '0 15px 40px var(--primary-glow)',
                    cursor: cooldownRemaining > 0 ? "not-allowed" : "pointer"
                  }}
                  className={cooldownRemaining > 0 ? "" : "tap-effect"}
                >
                   {cooldownRemaining > 0 ? (
                     <span>{Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, '0')}</span>
                  ) : (
                    <><IconPlus size={28} /> {t("mobile.addSong", "Cantar Agora!")}</>
                  )}
                </button>
              </>
            )}

            {showAddSong && (
              <GlassContainer intensity={10} style={{ padding: 24, background: "rgba(255,255,255,0.03)", borderRadius: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}><IconSearch size={22} color="var(--primary)" /> {t("mobile.search", "Buscar")}</h4>
                  <button onClick={() => setShowAddSong(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: 8, borderRadius: 12, color: 'rgba(255,255,255,0.4)' }}><IconX size={20} /></button>
                </div>
                
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  <input
                    placeholder={t("mobile.linkOrNamePlaceholder", "Link ou nome da música...")}
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim() !== "") triggerDebouncedSearch(e.target.value);
                    }}
                    onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                    style={{ width: '100%', padding: '18px 20px', borderRadius: 20, background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}
                  />
                </div>

                {searching && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 80, borderRadius: 20 }} />)}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {searchResults.map(res => (
                      <GlassContainer key={res.videoId} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 12, borderRadius: 24, background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ position: 'relative', width: 70, height: 52, flexShrink: 0 }}>
                          <img src={res.thumbnail} alt="" style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
                          <div onClick={() => setPreviewVideo(res)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPlay size={20} /></div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{res.channelTitle}</div>
                        </div>
                        <button onClick={() => handleAddFromSearch(res)} style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', color: '#fff', border: 'none' }}>
                          {adding === res.videoId ? "..." : <IconPlus size={20} />}
                        </button>
                      </GlassContainer>
                    ))}
                  </div>
                )}
              </GlassContainer>
            )}
          </div>
        )}

        {tab === "ranking" && (
           <div style={{ animation: "fadeInUp 0.6s ease" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <IconTrophy size={24} color="#f1c40f" /> {t("tv.ranking", "Placar Geral")}
            </h3>
            
            <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.2)", padding: 6, borderRadius: 20, marginBottom: 24 }}>
              <button onClick={() => setRankingView("solo")} style={{ flex: 1, padding: 10, borderRadius: 14, border: 'none', background: rankingView === "solo" ? "var(--primary)" : "transparent", color: "#fff", fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <IconUser size={16} /> Solo
              </button>
              <button onClick={() => setRankingView("duet")} style={{ flex: 1, padding: 10, borderRadius: 14, border: 'none', background: rankingView === "duet" ? "var(--primary)" : "transparent", color: "#fff", fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <IconUsers size={16} /> Duplas
              </button>
            </div>

            <GlassContainer intensity={15} style={{ padding: 20, borderRadius: 32, background: 'rgba(255,255,255,0.03)' }}>
              {rankingView === "solo" ? (
                Object.keys(state.ranking).length === 0 ? <p style={{ textAlign: 'center', opacity: 0.3 }}>{t("tv.nobodyScored", "Vazio")}</p> :
                Object.entries(state.ranking).sort(([,a],[,b]) => b.score - a.score).map(([id, entry], i) => (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 18 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? '#f1c40f' : '#333', color: i===0 ? '#000':'#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i+1}</div>
                      <span style={{ fontWeight: 800 }}>{entry.name}</span>
                    </div>
                    <span style={{ fontWeight: 900, color: i===0 ? '#f1c40f' : 'var(--primary)' }}>{entry.score} pts</span>
                  </div>
                ))
              ) : (
                state.duetRanking.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.3 }}>{t("tv.noDuetScored", "Vazio")}</p> :
                state.duetRanking.sort((a,b) => b.score - a.score).map((duet, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 18 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? '#f1c40f' : '#333', color: i===0 ? '#000':'#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i+1}</div>
                      <span style={{ fontWeight: 800 }}>{duet.names[0]} & {duet.names[1]}</span>
                    </div>
                    <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{duet.score} pts</span>
                  </div>
                ))
              )}
            </GlassContainer>
           </div>
        )}

        {tab === "saved" && (
          <div style={{ animation: "fadeInUp 0.6s ease" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <IconLibrary size={24} color="var(--primary)" /> {t("mobile.songLibrary", "Vips da Sala")}
            </h3>
            
            <GlassContainer intensity={15} style={{ padding: 20, borderRadius: 32, background: 'rgba(255,255,255,0.03)' }}>
              {songLibrary.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.3 }}>Vazia</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {songLibrary.map(song => (
                    <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 20 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.3 }}>{t("mobile.addedBy", "Por")} {song.addedBy}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAddFromSaved(song)} style={{ padding: 10, borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff' }}><IconPlus size={18} /></button>
                        {isHost && (
                          <button onClick={() => handleDeleteSaved(song.id)} style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.2)' }}><IconTrash size={18} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassContainer>
          </div>
        )}

        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 12, zIndex: 100, background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)", padding: "10px 16px", borderRadius: "40px",
          border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 15px 45px rgba(0,0,0,0.5)"
        }}>
          {["👏", "🎤", "🔥", "😂"].map(emoji => (
            <button key={emoji} onClick={() => sendReaction(emoji)} style={{ width: 54, height: 54, borderRadius: "50%", fontSize: 24, background: "transparent", border: "none", cursor: "pointer" }} className="tap-effect">
              {emoji}
            </button>
          ))}
        </div>

        {previewVideo && (
           <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setPreviewVideo(null)}>
              <GlassContainer style={{ width: '100%', maxWidth: 400, padding: 20, borderRadius: 32 }} onClick={e => e.stopPropagation()}>
                 <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', borderRadius: 20, overflow: 'hidden' }}>
                    <iframe src={`https://www.youtube.com/embed/${previewVideo.videoId}?autoplay=1`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay" />
                 </div>
                 <button onClick={() => { handleAddFromSearch(previewVideo); setPreviewVideo(null); }} style={{ marginTop: 20, width: '100%', padding: 20, borderRadius: 20, background: 'var(--primary)', color: '#fff', fontWeight: 900, border: 'none' }}>
                    {t("mobile.addToQueue", "ADICIONAR")}
                 </button>
              </GlassContainer>
           </div>
        )}

        {addSongModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setAddSongModal(null)}>
            <GlassContainer style={{ width: '100%', maxWidth: 400, padding: 32, borderRadius: 40 }} onClick={e => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 16px', fontWeight: 900 }}>{t("mobile.whoWillSing", "Cantando com:")}</h4>
              <select value={modalPartner} onChange={e => setModalPartner(e.target.value)} style={{ width: '100%', padding: 18, borderRadius: 18, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
                <option value="">{t("mobile.alone", "Sozinho")}</option>
                {participants.filter(p => p.id !== myUserId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={handleConfirmAddSong} style={{ width: '100%', padding: 20, borderRadius: 20, background: 'var(--primary)', color: '#fff', fontWeight: 900, border: 'none' }}>
                {adding ? "..." : t("common.add", "CONFIRMAR")}
              </button>
            </GlassContainer>
          </div>
        )}

      </div>
    </div>
  );
}
