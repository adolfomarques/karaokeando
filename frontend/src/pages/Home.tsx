import { useState, useEffect } from "react";
import Logo from "../components/Logo";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, getToken } from "../context/AuthContext";
import { getState, API_BASE, deleteRoom } from "../api";
import { useTranslation } from "react-i18next";
import LandingHeader from "../components/LandingHeader";

interface MyRoom {
  code: string;
  createdAt: string;
}



export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, registerGuest } = useAuth();

  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [joinCode, setJoinCode] = useState(() => localStorage.getItem("karaokefactory_last_room") || "");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<"participant" | "tv">("participant");

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

  useEffect(() => {
    if (user?.canHost) {
      const token = getToken();
      fetch(`${API_BASE}/api/rooms/my-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => { if (data.rooms) setMyRooms(data.rooms); })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    document.title = "Karaoke Factory | Free Online Karaoke Party";
    const metaDesc = window.document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Cante seus sucessos favoritos com amigos! Karaoke Factory é a plataforma definitiva para festas de karaokê colaborativas.");
    }
  }, []);

  const handleDeleteRoom = async (code: string) => {
    if (!window.confirm(t("home.confirmDelete", "Are you sure you want to delete this room?"))) return;
    try {
      const res = await deleteRoom(code);
      if (res.success) setMyRooms(prev => prev.filter(r => r.code !== code));
    } catch (e) { console.error(e); }
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
      if (joinMode === "tv") setShowTvPasswordModal(true);
      else if (user) navigate(`/room/${code}`);
      else setShowGuestModal(true);
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
        body: JSON.stringify({ tvPassword }),
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
    if (result.success && pendingRoomCode) navigate(`/room/${pendingRoomCode}`);
    else if (result.requiresLogin) setGuestNeedsLogin(true);
    else setGuestError(result.error || "Erro ao registrar");
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg)" }}>
        <div className="text-tertiary" style={{ fontSize: "1rem" }}>{t("home.loading", "Loading...")}</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <LandingHeader />

      {/* ── Hero Section ──────────────────────────────────── */}
      <section style={{
        padding: "28px 20px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        zIndex: 1,
      }}>
        <h1 className="sr-only">{t("home.title", "Karaoke Factory")}</h1>
        <div className="container" style={{ padding: "0 16px", animation: "fadeInUp 0.75s ease-out" }}>

          {/* Logo */}
          <Logo width={`min(384px, 85vw)`} style={{ marginBottom: "28px" }} />

          {/* Main glass card */}
            <div className="glass-card card-padding" style={{
              marginBottom: "48px",
              textAlign: "left",
            }}>
            {/* User greeting */}
            {user && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "28px",
                paddingBottom: "20px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexWrap: "wrap",
                gap: "12px",
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: "800", color: "#fff" }}>
                    {t("common.welcome", "Olá")}, {user.name} 👋
                  </h2>
                  <p className="text-secondary" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="btn-logout"
                >
                  {t("auth.logout", "Sair")}
                </button>
              </div>
            )}

            {/* Two columns */}
            <div className="grid-join">
              {/* Join Room */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "18px", color: "rgba(255,255,255,0.9)" }}>
                  🎵 {t("home.joinRoom", "Entrar em uma sala")}
                </h3>
                <input
                  aria-label={t("home.roomCodePlaceholder", "Código da sala")}
                  placeholder={t("home.roomCodePlaceholder", "ABC")}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                  style={{
                    marginBottom: "16px",
                    fontSize: "1.3rem",
                    fontWeight: "800",
                    textAlign: "center",
                    letterSpacing: "0.2em",
                    color: "#fff",
                  }}
                />

                {/* Mode toggles */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  {(["participant", "tv"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setJoinMode(mode)}
                      style={{
                        flex: 1,
                        background: joinMode === mode
                          ? "linear-gradient(135deg, #FF0080, #FF4D6D)"
                          : "rgba(255,255,255,0.05)",
                        color: joinMode === mode ? "#fff" : "rgba(255,255,255,0.55)",
                        border: "1px solid",
                        borderColor: joinMode === mode ? "transparent" : "rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        padding: "11px",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        boxShadow: joinMode === mode ? "0 0 20px rgba(255,0,128,0.35)" : "none",
                        transition: "all 0.2s",
                        transform: "scale(1)",
                      }}
                    >
                      {mode === "participant" ? `🎤 ${t("home.modeSinger", "Cantar")}` : `🖥️ ${t("home.modeTV", "TV")}`}
                    </button>
                  ))}
                </div>

                {joinError && (
                  <p style={{ color: "#ff6b6b", marginBottom: "12px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    ⚠️ {joinError}
                  </p>
                )}

                <button
                  onClick={joinRoom}
                  disabled={joining || !joinCode}
                  className="glow-pulse"
                  style={{ width: "100%", padding: "15px", fontSize: "1rem", fontWeight: "800" }}
                >
                  {joining ? t("common.wait", "Aguarde...") : `🚀 ${t("common.enter", "Entrar")}`}
                </button>
              </div>

              {/* My Rooms / Create */}
              <div className="separator-vertical separator-horizontal" style={{
                paddingLeft: "48px",
                paddingTop: 0,
              }}>
                {user?.canHost ? (
                  <>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "18px", color: "rgba(255,255,255,0.9)" }}>
                      🎟️ {t("home.myRooms", "Minhas Salas")}
                    </h3>
                    <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "16px" }}>
                      {myRooms.length === 0 ? (
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem" }}>{t("home.noRoomsYet", "Sem salas ainda")}</p>
                      ) : (
                        myRooms.map(r => (
                          <div
                            key={r.code}
                            className="glass-card"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              marginBottom: "8px",
                              borderRadius: "12px",
                            }}
                          >
                            <strong style={{ fontSize: "1.05rem", color: "#fff", letterSpacing: "0.08em" }}>{r.code}</strong>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => navigate(`/room/${r.code}`)}
                                style={{ padding: "6px 14px", fontSize: "0.78rem", borderRadius: "8px" }}
                              >
                                {t("home.singBtn", "Cantar")}
                              </button>
                              <button
                                onClick={() => openMyRoomAsTV(r.code)}
                                style={{
                                  padding: "6px 14px",
                                  fontSize: "0.78rem",
                                  background: "rgba(255,255,255,0.07)",
                                  boxShadow: "none",
                                  color: "rgba(255,255,255,0.7)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "8px",
                                }}
                              >
                                TV
                              </button>
                              <button
                                onClick={() => handleDeleteRoom(r.code)}
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "0.78rem",
                                  background: "rgba(255,80,80,0.12)",
                                  color: "#ff6b6b",
                                  border: "1px solid rgba(255,80,80,0.25)",
                                  boxShadow: "none",
                                  borderRadius: "8px",
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
                      className="btn-ghost"
                      style={{
                        width: "100%",
                        border: "1px solid rgba(255,0,128,0.4)",
                        color: "#FF0080",
                        padding: "13px",
                        fontSize: "0.95rem",
                        borderRadius: "999px",
                      }}
                    >
                      + {t("home.createRoom", "Criar Sala")}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: "8px" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🎤</div>
                    <h3 style={{ marginBottom: "12px", color: "#fff", fontSize: "1.1rem" }}>
                      {t("home.createYourRoom", "Crie sua própria festa!")}
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.62)", marginBottom: "24px", fontSize: "0.9rem", lineHeight: 1.6 }}>
                      {t("home.loginToCreate", "Junte seus amigos e comece a festa agora.")}
                    </p>
                    <button
                      onClick={() => navigate(user ? "/complete-profile" : "/login")}
                      style={{ width: "100%", padding: "14px" }}
                    >
                      {user ? t("home.completeRegistration", "Ser Host") : t("auth.login", "Login")}
                    </button>
                    {!user && (
                      <p style={{ marginTop: "16px", fontSize: "0.88rem", color: "rgba(255,255,255,0.4)" }}>
                        {t("home.noAccount", "Não tem conta?")}{" "}
                        <span
                          onClick={() => navigate("/register")}
                          style={{ color: "#FF0080", cursor: "pointer", fontWeight: "700" }}
                        >
                          {t("auth.createAccount", "Criar conta")}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it Works ──────────────────────────────────── */}
      <section style={{ padding: "70px 20px", position: "relative", zIndex: 1 }}>
        <div className="container">
          <h2 style={{ fontSize: "clamp(1.8rem, 5vw, 2.5rem)", fontWeight: "900", color: "#fff", marginBottom: "10px", textAlign: "center" }}>
            {t("landing.howItWorks.title", "Como funciona")}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.62)", marginBottom: "52px", fontSize: "1.05rem", textAlign: "center" }}>
            {t("landing.howItWorks.subtitle", "Três passos simples para cantar com seus amigos")}
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}>
            {[
              { id: 1, icon: "➕", title: t("landing.howItWorks.step1Title"), desc: t("landing.howItWorks.step1Desc"), color: "#FF0080", badge: "01" },
              { id: 2, icon: "↪️", title: t("landing.howItWorks.step2Title"), desc: t("landing.howItWorks.step2Desc"), color: "#7928CA", badge: "02" },
              { id: 3, icon: "🎤", title: t("landing.howItWorks.step3Title"), desc: t("landing.howItWorks.step3Desc"), color: "#00d1ff", badge: "03" },
            ].map(step => (
              <div
                key={step.id}
                className="glass-card glass-card--lift"
                style={{ padding: "36px 28px", textAlign: "left", position: "relative" }}
              >
                <div style={{
                  position: "absolute", top: 16, right: 20,
                  fontSize: "2.5rem", fontWeight: "900", letterSpacing: "-2px",
                  color: `${step.color}15`,
                  lineHeight: 1,
                }}>
                  {step.badge}
                </div>
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: step.id === 1
                    ? "linear-gradient(135deg, #FF0080, #FF4D6D)"
                    : step.id === 2
                    ? "linear-gradient(135deg, #7928CA, #a855f7)"
                    : "linear-gradient(135deg, #00d1ff, #06b6d4)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  marginBottom: "24px",
                  position: "relative",
                  zIndex: 1,
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: "1.25rem", color: "#fff", marginBottom: "12px", fontWeight: "800", position: "relative", zIndex: 1 }}>{step.title}</h3>
                <p className="text-secondary" style={{ lineHeight: "1.65", fontSize: "0.95rem", position: "relative", zIndex: 1 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Strip ───────────────────────────────────── */}
      <section style={{ padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
        <div className="container" style={{ padding: 0 }}>
          <div className="glass-card" style={{
            padding: "36px 40px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-around",
            gap: "32px",
            borderRadius: "24px",
          }}>
            {[
              { value: "100%", label: t("landing.stats.free") },
              { value: "∞",    label: t("landing.stats.songs") },
              { value: "QR",   label: t("landing.stats.qr") },
              { value: "⚡",   label: t("landing.stats.realtime") },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center", minWidth: "100px" }}>
                <div style={{ fontSize: "2rem", fontWeight: "900", color: "#fff", marginBottom: "6px" }}>{stat.value}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", letterSpacing: "2px", fontWeight: "700", textTransform: "uppercase" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────── */}
      <section style={{ padding: "80px 20px 100px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div className="container">
          <h2
            className="cta-heading"
            style={{ fontSize: "clamp(2.5rem, 9vw, 5.5rem)", fontWeight: "900", color: "#fff", marginBottom: "24px", letterSpacing: "-2px", lineHeight: "1" }}
          >
            {t("landing.cta.prefix", "Pronto para")}{" "}
            <span>{t("landing.cta.highlight", "cantar")}</span>
            ?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.62)", marginBottom: "44px", fontSize: "1.1rem" }}>
            {t("landing.cta.subtitle", "Comece agora. Sem cadastro complicado.")}
          </p>
          <button
            onClick={() => navigate(user ? "/create-room" : "/login")}
            className="glow-pulse"
            style={{ padding: "18px 48px", fontSize: "1.1rem", fontWeight: "800" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            🎉 {t("landing.cta.start", "Criar Minha Festa")}
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        padding: "40px 20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        zIndex: 1,
      }}>
        <div className="container" style={{ padding: 0, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src="/am-logo.png"
                alt="AM"
                style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <span style={{ color: "rgba(255,255,255,0.62)", fontSize: "0.82rem", fontWeight: "600" }}>by Adolfo Marques</span>
            </div>
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <Link to="/terms" style={{ color: "rgba(255,255,255,0.62)", textDecoration: "none", fontSize: "0.85rem" }}>
                {t("landing.terms.title", "Terms")}
              </Link>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{t("landing.footer.copyright")}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Guest Modal ───────────────────────────────────── */}
      {showGuestModal && (
        <div
          onClick={() => setShowGuestModal(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2000, padding: 20,
          }}
        >
          <div
            className="glass-card"
            onClick={e => e.stopPropagation()}
            style={{ padding: "40px 36px", width: "100%", maxWidth: "420px", borderRadius: "24px" }}
          >
            {guestNeedsLogin ? (
              <>
                <h2 style={{ fontWeight: "900", marginBottom: "12px", color: "#fff" }}>{t("guest.alreadyHaveAccount")}</h2>
                <p style={{ color: "rgba(255,255,255,0.62)", marginBottom: "28px" }}>
                  {t("guest.emailAlreadyRegistered1")} <strong>{guestEmail}</strong> {t("guest.emailAlreadyRegistered2")}
                </p>
                <button
                  onClick={() => navigate("/login", { state: { returnTo: `/room/${pendingRoomCode}` } })}
                  style={{ width: "100%" }}
                >
                  {t("auth.login")}
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontWeight: "900", marginBottom: "6px", color: "#fff" }}>
                  {t("guest.enterRoom")} <span style={{ color: "#FF0080" }}>{pendingRoomCode}</span>
                </h2>
                <p style={{ color: "rgba(255,255,255,0.62)", marginBottom: "24px", fontSize: "0.9rem" }}>{t("guest.identifyYourself")}</p>
                {guestError && <p style={{ color: "#ff6b6b", marginBottom: "14px", fontSize: "0.9rem" }}>⚠️ {guestError}</p>}
                <input type="text" aria-label={t("guest.yourName")} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={t("guest.yourName")} style={{ marginBottom: "12px" }} />
                <input type="email" aria-label={t("guest.yourEmail")} value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={t("guest.yourEmail")} style={{ marginBottom: "12px" }} />
                <input type="tel" aria-label={t("guest.yourPhone")} value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder={t("guest.yourPhone")} style={{ marginBottom: "24px" }} />
                <button onClick={handleGuestSubmit} disabled={guestLoading} style={{ width: "100%" }}>
                  {guestLoading ? t("guest.entering") : t("guest.enterRoomBtn")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TV Password Modal ─────────────────────────────── */}
      {showTvPasswordModal && (
        <div
          onClick={() => setShowTvPasswordModal(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2000, padding: 20,
          }}
        >
          <div
            className="glass-card"
            onClick={e => e.stopPropagation()}
            style={{ padding: "40px 36px", width: "100%", maxWidth: "380px", borderRadius: "24px", textAlign: "center" }}
          >
            <h2 style={{ fontWeight: "900", marginBottom: "8px", color: "#fff" }}>{t("tv.passwordTitle")}</h2>
            <p style={{ color: "rgba(255,255,255,0.62)", marginBottom: "28px" }}>
              {t("tv.passwordInstruction")} <strong style={{ color: "#FF0080" }}>{pendingRoomCode}</strong>
            </p>
            {tvPasswordError && <p style={{ color: "#ff6b6b", marginBottom: "14px" }}>⚠️ {tvPasswordError}</p>}
            <input
              type="text"
              maxLength={6}
              aria-label={t("tv.passwordTitle", "Senha da TV")}
              value={tvPassword}
              onChange={e => setTvPassword(e.target.value.toUpperCase())}
              style={{
                textAlign: "center", fontSize: "2rem", letterSpacing: "12px",
                padding: "18px", marginBottom: "24px",
              }}
            />
            <button onClick={handleTvPasswordSubmit} disabled={tvPasswordLoading} style={{ width: "100%" }}>
              {tvPasswordLoading ? t("tv.verifying") : t("common.enter")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
