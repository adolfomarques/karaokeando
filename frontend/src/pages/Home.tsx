import { useState, useEffect } from "react";
import Logo from "../components/Logo";
import { useNavigate } from "react-router-dom";
import { useAuth, getToken } from "../context/AuthContext";
import { getState, API_BASE } from "../api";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";

interface MyRoom {
  code: string;
  createdAt: string;
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, registerGuest } = useAuth();

  // Minhas salas (se for host)
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [loadingMyRooms, setLoadingMyRooms] = useState(false);

  // Estado para entrar em sala - pré-preenche com última sala visitada
  const [joinCode, setJoinCode] = useState(() => {
    return localStorage.getItem("karaokeando_last_room") || "";
  });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<"participant" | "tv">("participant");

  // Modal de registro rápido (visitante)
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestNeedsLogin, setGuestNeedsLogin] = useState(false);

  // Modal de senha TV
  const [showTvPasswordModal, setShowTvPasswordModal] = useState(false);
  const [tvPassword, setTvPassword] = useState("");
  const [tvPasswordError, setTvPasswordError] = useState<string | null>(null);
  const [tvPasswordLoading, setTvPasswordLoading] = useState(false);

  // Carregar minhas salas se for host
  useEffect(() => {
    if (user?.canHost) {
      setLoadingMyRooms(true);
      const token = getToken();
      fetch(`${API_BASE}/api/rooms/my-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.rooms) setMyRooms(data.rooms);
        })
        .catch(() => {})
        .finally(() => setLoadingMyRooms(false));
    }
  }, [user]);

  // Verifica sala e decide próximo passo
  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;

    setJoining(true);
    setJoinError(null);

    try {
      const state = await getState(code);

      if (!state || state.error === "room_not_found") {
        setJoinError(t("home.roomNotFound", "Sala não encontrada. Verifique o código."));
        setJoining(false);
        return;
      }

      // Sala existe!
      setPendingRoomCode(code);

      if (joinMode === "tv") {
        // Modo TV - pede senha
        setShowTvPasswordModal(true);
      } else {
        // Modo participante
        if (user) {
          // Já logado, vai direto
          navigate(`/room/${code}`);
        } else {
          // Precisa se identificar - abre modal
          setShowGuestModal(true);
        }
      }
    } catch {
      setJoinError(t("home.checkRoomError", "Erro ao verificar sala. Tente novamente."));
    } finally {
      setJoining(false);
    }
  };

  // Submete senha da TV
  const handleTvPasswordSubmit = async () => {
    if (!pendingRoomCode || tvPassword.length < 6) return;

    setTvPasswordLoading(true);
    setTvPasswordError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/rooms/${pendingRoomCode}/tv/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tvPassword: tvPassword }),
        }
      );

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

  // Entrar na própria sala como TV (sem senha)
  const openMyRoomAsTV = (code: string) => {
    // Para sala própria, gerar token direto no backend
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
      .catch(() => {
        // Fallback: vai para página de login TV
        navigate(`/room/${code}/tv/login`);
      });
  };

  // Submete registro de visitante e entra na sala
  const handleGuestSubmit = async () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setGuestError(t("guest.fillAllFields", "Preencha todos os campos"));
      return;
    }

    if (!guestEmail.includes("@")) {
      setGuestError(t("guest.invalidEmail", "Email inválido"));
      return;
    }

    const phoneDigits = guestPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setGuestError(t("guestReg.invalidPhone", "Telefone inválido (mínimo 10 dígitos)"));
      return;
    }

    setGuestLoading(true);
    setGuestError(null);

    const result = await registerGuest(
      guestName.trim(),
      guestEmail.trim(),
      guestPhone.trim()
    );

    setGuestLoading(false);

    if (result.success) {
      if (pendingRoomCode) {
        navigate(`/room/${pendingRoomCode}`);
      }
    } else if (result.requiresLogin) {
      // Email belongs to a host - show message to login
      setGuestNeedsLogin(true);
      setGuestError(null);
    } else {
      setGuestError(result.error || "Erro ao registrar. Tente novamente.");
    }
  };

  const handleCreateRoom = () => {
    if (!user) {
      navigate("/login");
    } else if (!user.canHost) {
      navigate("/complete-profile");
    } else {
      navigate("/create-room");
    }
  };

  if (authLoading) {
    return (
      <div
        className="container"
        style={{ paddingTop: 60, textAlign: "center" }}
      >
        <p>{t("home.loading", "Carregando...")}</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <LanguageSwitcher />
      <Logo width={480} />
      <p style={{ textAlign: "center", color: "#888", marginTop: -10, marginBottom: 30 }}>
        {t("home.slogan", "Karaokê em grupo, fácil e divertido")}
      </p>

      {/* Usuário logado */}
      {user && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{user?.name}</strong>
              <br />
              <small style={{ color: "#888" }}>{user?.email}</small>
              {user?.canHost && (
                <span
                  style={{
                    marginLeft: 10,
                    background: "#4CAF50",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                  }}
                >
                  Host
                </span>
              )}
            </div>
            <button
              onClick={logout}
              style={{
                background: "transparent",
                border: "1px solid #666",
                padding: "6px 12px",
                fontSize: "0.9rem",
              }}
            >
              {t("auth.logout", "Sair")}
            </button>
          </div>
        </div>
      )}

      {/* Minhas Salas (só para hosts) */}
      {user?.canHost && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2>📺 {t("home.myRooms", "Minhas Salas")}</h2>

          {loadingMyRooms ? (
            <p style={{ color: "#888" }}>{t("home.loading", "Carregando...")}</p>
          ) : myRooms.length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              {t("home.noRoomsYet", "Você ainda não tem salas criadas.")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {myRooms.map(room => (
                <div
                  key={room.code}
                  style={{
                    background: "#2a2a2a",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                      {room.code}
                    </span>
                    <small style={{ color: "#888" }}>
                      {new Date(room.createdAt).toLocaleDateString(i18n.language === "pt" ? "pt-BR" : "en-US")}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => openMyRoomAsTV(room.code)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        background: "#7c4dff",
                      }}
                    >
                      🖥️ {t("home.showOnTV", "Exibir")}
                    </button>
                    <button
                      onClick={() => navigate(`/room/${room.code}`)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "0.85rem",
                        background: "#444",
                      }}
                    >
                      🎤 {t("home.singBtn", "Cantar")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            style={{ width: "100%", marginTop: 16 }}
          >
            + {t("home.createRoom", "Criar nova sala")}
          </button>
        </div>
      )}

      {/* Entrar em sala */}
      <div className="card">
        <h2>🎵 {t("home.joinRoom", "Entrar em uma sala")}</h2>
        <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: 16 }}>
          {t("home.joinInstruction", "Digite o código da sala ou escaneie o QR Code na TV")}
        </p>

        <input
          placeholder={t("home.roomCodePlaceholder", "Código da sala (ex: ABC12)")}
          value={joinCode}
          onChange={e => {
            setJoinCode(e.target.value.toUpperCase());
            if (joinError) setJoinError(null);
          }}
          onKeyDown={e => e.key === "Enter" && joinRoom()}
          style={{ marginBottom: 16 }}
        />

        {/* Seletor de modo */}
        <p
          style={{
            color: "#aaa",
            fontSize: "0.95rem",
            marginBottom: 14,
            fontWeight: 500,
          }}
        >
          {t("home.whatToDo", "O que você quer fazer?")}
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setJoinMode("participant")}
            style={{
              flex: 1,
              padding: "18px 12px",
              background: joinMode === "participant" ? "#7c4dff" : "#2a2a2a",
              border:
                joinMode === "participant"
                  ? "2px solid #9d7aff"
                  : "2px solid #444",
              borderRadius: 12,
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>🎤</div>
            <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>
              {t("home.modeSinger", "Quero cantar")}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "#ccc",
                marginTop: 8,
                lineHeight: 1.4,
              }}
            >
              {t("home.modeSingerDesc1", "Escolher músicas e")}
              <br />
              {t("home.modeSingerDesc2", "acompanhar a fila")}
            </div>
          </button>
          <button
            onClick={() => setJoinMode("tv")}
            style={{
              flex: 1,
              padding: "18px 12px",
              background: joinMode === "tv" ? "#7c4dff" : "#2a2a2a",
              border:
                joinMode === "tv" ? "2px solid #9d7aff" : "2px solid #444",
              borderRadius: 12,
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>🖥️</div>
            <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>
              {t("home.modeTV", "Exibir na tela")}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "#ccc",
                marginTop: 8,
                lineHeight: 1.4,
              }}
            >
              {t("home.modeTVDesc1", "Mostrar vídeo e letra")}
              <br />
              {t("home.modeTVDesc2", "para todos verem")}
            </div>
          </button>
        </div>

        {joinError && (
          <p style={{ color: "#ff6b6b", fontSize: "0.9rem", marginBottom: 12 }}>
            {joinError}
          </p>
        )}

        <button
          onClick={joinRoom}
          disabled={joining || !joinCode.trim()}
          style={{ width: "100%", fontSize: "1.1rem" }}
        >
          {joining ? t("home.joining", "Verificando...") : t("home.continue", "Continuar")}
        </button>
      </div>

      {/* Criar sala (só se não for host ainda) */}
      {(!user || !user?.canHost) && (
        <div className="card">
          <h2>🎤 {t("home.createRoomHeader", "Criar sala")}</h2>
          <p style={{ color: "#888", marginBottom: 12, fontSize: "0.9rem" }}>
            {!user
              ? t("home.loginToCreate", "Faça login para criar sua própria sala de karaokê")
              : t("home.completeProfileToHost", "Complete seu cadastro para virar Host")}
          </p>
          <button onClick={handleCreateRoom} style={{ width: "100%" }}>
            {!user ? t("auth.login", "Fazer login") : t("home.completeRegistration", "Completar cadastro")}
          </button>
        </div>
      )}

      {/* Link criar conta se não logado */}
      {!user && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: "#888" }}>{t("home.noAccount", "Não tem conta?")} </span>
          <a
            href="/register"
            style={{ color: "#4CAF50" }}
            onClick={e => {
              e.preventDefault();
              navigate("/register");
            }}
          >
            {t("auth.createAccount", "Criar conta")}
          </a>
        </div>
      )}

      {/* Modal de registro rápido (visitante) */}
      {showGuestModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => {
            setShowGuestModal(false);
            setGuestNeedsLogin(false);
          }}
        >
          <div
            style={{
              background: "#1e1e1e",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 360,
            }}
            onClick={e => e.stopPropagation()}
          >
            {guestNeedsLogin ? (
              // Tela de "precisa fazer login"
              <>
                <h3 style={{ margin: "0 0 16px", textAlign: "center" }}>
                  👋 {t("guest.alreadyHaveAccount", "Você já tem uma conta!")}
                </h3>
                <p
                  style={{
                    color: "#888",
                    textAlign: "center",
                    margin: "0 0 24px",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  {t("guest.emailAlreadyRegistered1", "O email")} {" "}
                  <strong style={{ color: "#fff" }}>{guestEmail}</strong>{" "}
                  {t("guest.emailAlreadyRegistered2", "já está cadastrado. Faça login para continuar.")}
                </p>

                <button
                  onClick={() => {
                    setShowGuestModal(false);
                    setGuestNeedsLogin(false);
                    navigate("/login", {
                      state: { returnTo: `/room/${pendingRoomCode}` },
                    });
                  }}
                  style={{
                    width: "100%",
                    padding: 14,
                    background: "#4CAF50",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  {t("auth.login", "Fazer login")}
                </button>

                <button
                  onClick={() => {
                    setGuestNeedsLogin(false);
                    setGuestEmail("");
                  }}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "transparent",
                    border: "1px solid #444",
                    borderRadius: 8,
                    color: "#888",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t("guest.useAnotherEmail", "Usar outro email")}
                </button>
              </>
            ) : (
              // Formulário normal de guest
              <>
                <h3 style={{ margin: "0 0 8px", textAlign: "center" }}>
                  🎵 {t("guest.enterRoom", "Entrar na sala")} {pendingRoomCode}
                </h3>
                <p
                  style={{
                    color: "#888",
                    textAlign: "center",
                    margin: "0 0 20px",
                    fontSize: "0.9rem",
                  }}
                >
                  {t("guest.identifyYourself", "Identifique-se para participar")}
                </p>

                {guestError && (
                  <div
                    style={{
                      background: "#ff4444",
                      color: "#fff",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: "0.9rem",
                      textAlign: "center",
                    }}
                  >
                    {guestError}
                  </div>
                )}

                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder={t("guest.yourName", "Seu nome")}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    background: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: 8,
                    color: "#fff",
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />

                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder={t("guest.yourEmail", "Seu email")}
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    background: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: 8,
                    color: "#fff",
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />

                <input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder={t("guest.yourPhone", "Seu celular (ex: 11999998888)")}
                  onKeyDown={e => e.key === "Enter" && handleGuestSubmit()}
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    background: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: 8,
                    color: "#fff",
                    marginBottom: 20,
                    boxSizing: "border-box",
                  }}
                />

                <button
                  onClick={handleGuestSubmit}
                  disabled={
                    guestLoading ||
                    !guestName.trim() ||
                    !guestEmail.trim() ||
                    !guestPhone.trim()
                  }
                  style={{
                    width: "100%",
                    padding: 14,
                    background: guestLoading ? "#666" : "#7c4dff",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: guestLoading ? "not-allowed" : "pointer",
                    marginBottom: 12,
                  }}
                >
                  {guestLoading ? t("guest.entering", "Entrando...") : t("guest.enterRoomBtn", "Entrar na sala")}
                </button>

                <button
                  onClick={() => {
                    setShowGuestModal(false);
                    setGuestNeedsLogin(false);
                  }}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "transparent",
                    border: "1px solid #444",
                    borderRadius: 8,
                    color: "#888",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t("common.cancel", "Cancelar")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal senha TV */}
      {showTvPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowTvPasswordModal(false)}
        >
          <div
            style={{
              background: "#1e1e1e",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 360,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", textAlign: "center" }}>
              🔐 {t("tv.passwordTitle", "Senha da sala")}
            </h3>
            <p
              style={{
                color: "#888",
                textAlign: "center",
                margin: "0 0 20px",
                fontSize: "0.9rem",
              }}
            >
              {t("tv.passwordInstruction", "Digite a senha para abrir a exibição na sala")}{" "}
              <strong>{pendingRoomCode}</strong>
            </p>

            {tvPasswordError && (
              <div
                style={{
                  background: "#ff4444",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: "0.9rem",
                  textAlign: "center",
                }}
              >
                {tvPasswordError}
              </div>
            )}

            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              value={tvPassword}
              onChange={e => setTvPassword(e.target.value.slice(0, 6))}
              placeholder={t("tv.passwordPlaceholder", "Ex: abc123")}
              autoFocus
              maxLength={6}
              style={{
                width: "100%",
                padding: 16,
                fontSize: 24,
                background: "#2a2a2a",
                border: "1px solid #444",
                borderRadius: 8,
                color: "#fff",
                marginBottom: 20,
                boxSizing: "border-box",
                textAlign: "center",
                letterSpacing: "0.5em",
              }}
              onKeyDown={e => e.key === "Enter" && handleTvPasswordSubmit()}
            />

            <button
              onClick={handleTvPasswordSubmit}
              disabled={tvPasswordLoading || tvPassword.length < 6}
              style={{
                width: "100%",
                padding: 14,
                background: tvPasswordLoading ? "#666" : "#7c4dff",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: tvPasswordLoading ? "not-allowed" : "pointer",
                marginBottom: 12,
              }}
            >
              {tvPasswordLoading ? t("tv.verifying", "Verificando...") : t("common.enter", "Entrar")}
            </button>

            <button
              onClick={() => setShowTvPasswordModal(false)}
              style={{
                width: "100%",
                padding: 12,
                background: "transparent",
                border: "1px solid #444",
                borderRadius: 8,
                color: "#888",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t("common.cancel", "Cancelar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
