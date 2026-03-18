import { useState, useEffect } from "react";
import Logo from "../components/Logo";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, getToken } from "../context/AuthContext";
import { getState, API_BASE, deleteRoom } from "../api";
import { useTranslation } from "react-i18next";
import LandingHeader from "../components/LandingHeader";
import { Toaster } from "react-hot-toast";

interface MyRoom {
  code: string;
  createdAt: string;
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, registerGuest } = useAuth();

  // Minhas salas (se for host)
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);

  // Estado para entrar em sala
  const [joinCode, setJoinCode] = useState(() => {
    return localStorage.getItem("karaokefactory_last_room") || "";
  });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<"participant" | "tv">("participant");

  // Modais
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestNeedsLogin, setGuestNeedsLogin] = useState(false);

  const [showTvPasswordModal, setShowTvPasswordModal] = useState(false);
  const [tvPassword, setTvPassword] = useState("");
  const [tvPasswordError, setTvPasswordError] = useState<string | null>(null);
  const [tvPasswordLoading, setTvPasswordLoading] = useState(false);

  // Carregar minhas salas se for host
  useEffect(() => {
    if (user?.canHost) {
      const token = getToken();
      fetch(`${API_BASE}/api/rooms/my-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.rooms) setMyRooms(data.rooms);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleDeleteRoom = async (code: string) => {
    if (!window.confirm(t("home.confirmDelete", "Are you sure you want to delete this room?"))) {
      return;
    }
    try {
      const res = await deleteRoom(code);
      if (res.success) {
        setMyRooms(prev => prev.filter(r => r.code !== code));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 3) return;
    setJoining(true);
    setJoinError(null);
    try {
      const state = await getState(code);
      if (!state || state.error === "room_not_found") {
        setJoinError(t("home.roomNotFound", "Sala não encontrada. Verifique o código."));
        return;
      }
      setPendingRoomCode(code);
      if (joinMode === "tv") {
        setShowTvPasswordModal(true);
      } else if (user) {
        navigate(`/room/${code}`);
      } else {
        setShowGuestModal(true);
      }
    } catch {
      setJoinError(t("home.checkRoomError", "Erro ao verificar sala. Tente novamente."));
    } finally {
      setJoining(false);
    }
  };

  const handleTvPasswordSubmit = async () => {
    if (!pendingRoomCode || tvPassword.length < 6) return;
    setTvPasswordLoading(true);
    setTvPasswordError(null);
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${pendingRoomCode}/tv/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tvPassword: tvPassword }),
      });
      const data = await res.json();
      if (res.ok && data.tvToken) {
        localStorage.setItem(`tvToken_${pendingRoomCode}`, data.tvToken);
        navigate(`/room/${pendingRoomCode}/tv`);
      } else {
        setTvPasswordError(data.message || "Senha incorreta");
      }
    } catch {
      setTvPasswordError(t("tvLogin.connError", "Erro de conexão"));
    } finally {
      setTvPasswordLoading(false);
    }
  };

  const openMyRoomAsTV = (code: string) => {
    const token = getToken();
    fetch(`${API_BASE}/api/rooms/${code}/tv/owner-access`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.tvToken) {
          localStorage.setItem(`tvToken_${code}`, data.tvToken);
          navigate(`/room/${code}/tv`);
        }
      })
      .catch(() => navigate(`/room/${code}/tv/login`));
  };

  const handleGuestSubmit = async () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setGuestError(t("guest.fillAllFields", "Preencha todos os campos"));
      return;
    }
    setGuestLoading(true);
    const result = await registerGuest(guestName.trim(), guestEmail.trim(), guestPhone.trim());
    setGuestLoading(false);
    if (result.success && pendingRoomCode) {
      navigate(`/room/${pendingRoomCode}`);
    } else if (result.requiresLogin) {
      setGuestNeedsLogin(true);
    } else {
      setGuestError(result.error || "Erro ao registrar");
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0a0a0a" }}>
        <p style={{ color: "#fff" }}>{t("home.loading", "Loading...")}</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <Toaster position="top-right" />

      {/* Hero / Main Action Section */}
      <section style={{
        padding: "36px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}>
        <div className="container" style={{ animation: "fadeInUp 0.8s ease-out" }}>
          <Logo width={320} style={{ marginBottom: "36px" }} />
          
          {/* Main Content Area (Cyber-HUD style) */}
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "40px",
            width: "100%",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            marginBottom: "40px",
            textAlign: "left"
          }}>
            {user ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "20px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#fff" }}>{t("common.welcome", "Olá")}, {user.name}</h2>
                  <p style={{ margin: "4px 0 0", color: "#888" }}>{user.email}</p>
                </div>
                <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#888", padding: "8px 16px" }}>
                  {t("auth.logout", "Sair")}
                </button>
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: window.innerWidth > 900 ? "1.2fr 1fr" : "1fr", gap: "40px" }}>
              {/* Join Room Side */}
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "20px", color: "#fff" }}>🎵 {t("home.joinRoom", "Entrar em uma sala")}</h3>
                <input
                  placeholder={t("home.roomCodePlaceholder", "ABC12")}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    padding: "16px",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    marginBottom: "20px",
                    borderRadius: "12px"
                  }}
                />
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <button
                    onClick={() => setJoinMode("participant")}
                    style={{
                      flex: 1,
                      background: joinMode === "participant" ? "#ff007f" : "rgba(255,255,255,0.05)",
                      color: joinMode === "participant" ? "#fff" : "#888",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px",
                      transition: "all 0.2s"
                    }}
                  >
                   🎤 {t("home.modeSinger", "Cantar")}
                  </button>
                  <button
                    onClick={() => setJoinMode("tv")}
                    style={{
                      flex: 1,
                      background: joinMode === "tv" ? "#ff007f" : "rgba(255,255,255,0.05)",
                      color: joinMode === "tv" ? "#fff" : "#888",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px",
                      transition: "all 0.2s"
                    }}
                  >
                    🖥️ {t("home.modeTV", "TV")}
                  </button>
                </div>
                {joinError && <p style={{ color: "#ff4444", marginBottom: "10px" }}>{joinError}</p>}
                <button
                  onClick={joinRoom}
                  disabled={joining || !joinCode}
                  style={{ 
                    width: "100%", 
                    background: "#fff", 
                    color: "#000", 
                    borderRadius: "12px", 
                    padding: "16px", 
                    fontSize: "1.1rem",
                    fontWeight: "800",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
                  }}
                >
                  {joining ? t("common.wait", "Aguarde...") : t("common.enter", "Entrar")}
                </button>
              </div>

              {/* My Rooms / Create Side */}
              <div style={{ borderLeft: window.innerWidth > 900 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingLeft: window.innerWidth > 900 ? "40px" : "0" }}>
                {user?.canHost ? (
                  <>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "20px", color: "#fff" }}>🎟️ {t("home.myRooms", "Minhas Salas")}</h3>
                    <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "20px" }}>
                      {myRooms.length === 0 ? (
                        <p style={{ color: "#555" }}>{t("home.noRoomsYet", "Sem salas")}</p>
                      ) : (
                        myRooms.map(r => (
                          <div key={r.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <strong style={{ fontSize: "1.1rem", color: "#fff" }}>{r.code}</strong>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => navigate(`/room/${r.code}`)} style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#ff007f" }}>{t("home.singBtn", "Cantar")}</button>
                              <button onClick={() => openMyRoomAsTV(r.code)} style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#000" }}>{t("home.showOnTV", "TV")}</button>
                              <button
                                onClick={() => handleDeleteRoom(r.code)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.8rem",
                                  background: "transparent",
                                  border: "1px solid #ff4444",
                                  color: "#ff4444"
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => navigate("/create-room")}
                      style={{ width: "100%", background: "transparent", border: "2px solid #ff007f", color: "#ff007f", borderRadius: "12px", fontWeight: "700" }}
                    >
                      + {t("home.createRoom", "Criar Sala")}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: "10px" }}>
                    <h3 style={{ marginBottom: "16px", color: "#fff" }}>{t("home.createYourRoom", "Crie sua própria festa!")}</h3>
                    <p style={{ color: "#888", marginBottom: "24px" }}>{t("home.loginToCreate", "Junte seus amigos e comece a festa agora.")}</p>
                    <button
                      onClick={() => navigate(user ? "/complete-profile" : "/login")}
                      style={{ width: "100%", background: "#ff007f", borderRadius: "12px", fontWeight: "700" }}
                    >
                      {user ? t("home.completeRegistration", "Be Host") : t("auth.login", "Login")}
                    </button>
                    {!user && (
                      <p style={{ marginTop: "16px", fontSize: "0.9rem", color: "#666" }}>
                        {t("home.noAccount", "Don't have an account?")} <span onClick={() => navigate("/register")} style={{ color: "#ff007f", cursor: "pointer", fontWeight: "700" }}>{t("auth.createAccount", "Register")}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section style={{ padding: "60px 20px", background: "#0a0a0a", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "2.5rem", fontWeight: "900", color: "#fff", marginBottom: "12px" }}>
            {t("landing.howItWorks.title", "How it works")}
          </h2>
          <p style={{ color: "#888", marginBottom: "60px", fontSize: "1.1rem" }}>
            {t("landing.howItWorks.subtitle", "Three simple steps to start singing with your friends")}
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "32px"
          }}>
            {[
              { id: 1, icon: "➕", title: t("landing.howItWorks.step1Title"), desc: t("landing.howItWorks.step1Desc"), color: "#ff007f" },
              { id: 2, icon: "↪️", title: t("landing.howItWorks.step2Title"), desc: t("landing.howItWorks.step2Desc"), color: "#00d1ff" },
              { id: 3, icon: "🎤", title: t("landing.howItWorks.step3Title"), desc: t("landing.howItWorks.step3Desc"), color: "#7c4dff" }
            ].map(step => (
              <div key={step.id} style={{
                background: "rgba(255,255,255,0.03)",
                padding: "48px 32px",
                borderRadius: "32px",
                border: "1px solid rgba(255,255,255,0.05)",
                textAlign: "left",
                transition: "transform 0.3s ease",
                cursor: "default"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: `${step.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  marginBottom: "32px",
                  color: step.color
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "16px", fontWeight: "800" }}>{step.title}</h3>
                <p style={{ color: "#888", lineHeight: "1.6", fontSize: "1.05rem" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ padding: "40px 0" }}>
        <div className="container" style={{
          background: "linear-gradient(90deg, #1b1b1b, #0d0d0d)",
          borderRadius: "32px",
          padding: "40px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-around",
          gap: "40px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          {[
            { value: "100%", label: t("landing.stats.free"), icon: "💎" },
            { value: "∞", label: t("landing.stats.songs"), icon: "🎵" },
            { value: "QR", label: t("landing.stats.qr"), icon: "📱" },
            { value: "⚡", label: t("landing.stats.realtime"), icon: "🎤" }
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center", minWidth: "120px" }}>
              <div style={{ fontSize: "2rem", fontWeight: "900", color: "#fff", marginBottom: "8px" }}>{stat.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#666", letterSpacing: "2px", fontWeight: "800" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ready to Sing CTA */}
      <section style={{ padding: "120px 20px", textAlign: "center" }}>
        <div className="container">
          <h2 style={{
             fontSize: "clamp(3rem, 10vw, 6rem)",
             fontWeight: "900",
             color: "#fff",
             marginBottom: "32px",
             letterSpacing: "-2px",
             lineHeight: "1"
          }}
          dangerouslySetInnerHTML={{ __html: t("landing.cta.ready", "Ready to <span>sing</span>?") }}
          />
          <p style={{ color: "#888", marginBottom: "48px", fontSize: "1.2rem" }}>
            {t("landing.cta.subtitle", "Start right now. No registration, no hassle.")}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              background: "#ff007f",
              padding: "20px 48px",
              borderRadius: "50px",
              fontSize: "1.2rem",
              fontWeight: "800",
              boxShadow: "0 20px 40px rgba(255, 0, 127, 0.3)",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🚀 {t("landing.cta.start", "Create My Party")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "80px 20px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        textAlign: "center"
      }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img 
                  src="/am-logo.png" 
                  alt="AM" 
                  style={{ 
                    width: "28px", 
                    height: "28px", 
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }} 
                />
                <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: "600", letterSpacing: "-0.3px" }}>by Adolfo Marques</span>
             </div>
             <div style={{ display: "flex", gap: "32px" }}>
                <Link to="/terms" style={{ color: "#666", textDecoration: "none", fontSize: "0.9rem" }}>{t("landing.terms.title", "Terms")}</Link>
                <span style={{ color: "#333", fontSize: "0.9rem" }}>{t("landing.footer.copyright")}</span>
             </div>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        h2 span {
          color: #ff007f;
          position: relative;
          display: inline-block;
        }
        
        h2 span::after {
          content: '';
          position: absolute;
          bottom: 15%;
          left: 0;
          width: 100%;
          height: 8px;
          background: #ff007f40;
          z-index: -1;
          transform: skewX(-15deg);
        }

        input:focus {
          outline: none;
          border-color: #ff007f !important;
          box-shadow: 0 0 0 4px rgba(255, 0, 127, 0.1);
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0d0d0d;
        }
        ::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
      
      {/* Modals are kept as they were in logic, but re-styled */}
      {showGuestModal && (
        <div className="modal-overlay" onClick={() => setShowGuestModal(false)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: "32px", padding: "40px", width: "100%", maxWidth: "420px", color: "#000"
          }}>
            {guestNeedsLogin ? (
               <>
                 <h2 style={{ fontWeight: "900", marginBottom: "16px" }}>{t("guest.alreadyHaveAccount")}</h2>
                 <p style={{ color: "#666", marginBottom: "32px" }}>{t("guest.emailAlreadyRegistered1")} <strong>{guestEmail}</strong> {t("guest.emailAlreadyRegistered2")}</p>
                 <button onClick={() => navigate("/login", { state: { returnTo: `/room/${pendingRoomCode}` } })} style={{ width: "100%", background: "#ff007f", borderRadius: "16px", padding: "16px" }}>{t("auth.login")}</button>
               </>
            ) : (
              <>
                <h2 style={{ fontWeight: "900", marginBottom: "8px" }}>{t("guest.enterRoom")} {pendingRoomCode}</h2>
                <p style={{ color: "#666", marginBottom: "30px" }}>{t("guest.identifyYourself")}</p>
                {guestError && <p style={{ color: "#ff4444", marginBottom: "16px" }}>{guestError}</p>}
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder={t("guest.yourName")}
                  style={{ background: "#f5f5f5", border: "1px solid #eee", color: "#000", marginBottom: "16px", borderRadius: "12px" }}
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder={t("guest.yourEmail")}
                  style={{ background: "#f5f5f5", border: "1px solid #eee", color: "#000", marginBottom: "16px", borderRadius: "12px" }}
                />
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder={t("guest.yourPhone")}
                  style={{ background: "#f5f5f5", border: "1px solid #eee", color: "#000", marginBottom: "30px", borderRadius: "12px" }}
                />
                <button onClick={handleGuestSubmit} disabled={guestLoading} style={{ width: "100%", background: "#ff007f", color: "#fff", borderRadius: "16px", padding: "16px" }}>
                  {guestLoading ? t("guest.entering") : t("guest.enterRoomBtn")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showTvPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowTvPasswordModal(false)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: "32px", padding: "40px", width: "100%", maxWidth: "420px", color: "#000",
            textAlign: "center"
          }}>
            <h2 style={{ fontWeight: "900", marginBottom: "8px" }}>{t("tv.passwordTitle")}</h2>
            <p style={{ color: "#666", marginBottom: "30px" }}>{t("tv.passwordInstruction")} <strong>{pendingRoomCode}</strong></p>
            {tvPasswordError && <p style={{ color: "#ff4444", marginBottom: "16px" }}>{tvPasswordError}</p>}
            <input
              type="text"
              maxLength={6}
              value={tvPassword}
              onChange={e => setTvPassword(e.target.value.toUpperCase())}
              style={{
                background: "#f5f5f5", border: "1px solid #eee", color: "#000", marginBottom: "30px", borderRadius: "16px",
                textAlign: "center", fontSize: "2rem", letterSpacing: "10px", padding: "20px"
              }}
            />
            <button onClick={handleTvPasswordSubmit} disabled={tvPasswordLoading} style={{ width: "100%", background: "#ff007f", color: "#fff", borderRadius: "16px", padding: "16px" }}>
              {tvPasswordLoading ? t("tv.verifying") : t("common.enter")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
