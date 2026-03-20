import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGoogleLogin } from '@react-oauth/google';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
    </g>
  </svg>
);

const LoadingOverlay = ({ isWakingUp, t }: { isWakingUp: boolean; t: Function }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 100,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
    borderRadius: 'inherit', textAlign: 'center', padding: '24px', color: '#fff',
    animation: 'fadeInOverlay 0.4s ease-out',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '300px' }}>
      {isWakingUp ? (
        <div style={{ animation: 'pulseWarmup 2s infinite ease-in-out' }}>
          <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🎙️</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px', color: '#FF0080', letterSpacing: '1px' }}>
            {t("login.wakingUpTitle", "Waking Up the Stage")}
          </h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>
            {t("login.wakingUp", "The server is starting up after inactivity (may take up to 40s)...")}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '44px', height: '44px',
            border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF0080',
            borderRadius: '50%', animation: 'spinLoader 1s linear infinite', marginBottom: '18px',
          }} />
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>{t("login.entering", "Autenticando...")}</p>
        </div>
      )}
    </div>
    <style>{`
      @keyframes spinLoader { to { transform: rotate(360deg); } }
      @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulseWarmup { 0% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }
    `}</style>
  </div>
);

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) timer = setTimeout(() => setIsWakingUp(true), 4000);
    else setIsWakingUp(false);
    return () => clearTimeout(timer);
  }, [loading]);

  const state = location.state as { returnTo?: string; redirectTo?: string; roomCode?: string } | null;
  const returnTo = state?.roomCode
    ? `/room/${state.roomCode}`
    : (state?.redirectTo || state?.returnTo || "/");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate(returnTo);
    else setError(result.error || t("login.invalidCredentials", "Email ou senha inválidos"));
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      try {
        setLoading(true);
        const result = await loginWithGoogle(tokenResponse.access_token);
        if (result.success) navigate(returnTo);
        else setError(result.error || "Google login error");
      } catch {
        setError("Error authenticating via Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Failed to open Google popup."),
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>

      <Logo width={300} style={{ marginBottom: "8px" }} />
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginBottom: "28px", fontSize: "0.95rem" }}>
        {t("login.desc", "Faça login na sua conta")}
      </p>

      <div className="glass-card" style={{ padding: "36px", width: "100%", maxWidth: "420px", position: "relative", overflow: "hidden" }}>
        {loading && <LoadingOverlay isWakingUp={isWakingUp} t={t} />}

        {/* Google button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleGoogleLogin()}
          style={{
            width: "100%", marginBottom: "20px",
            background: "#fff", color: "#333",
            fontWeight: 600, fontSize: "0.95rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            border: "none", padding: "12px 24px", borderRadius: "999px",
            boxShadow: "none",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#f0f0f0";
            e.currentTarget.style.transform = "scale(1.03)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <GoogleIcon />
          {t("login.googleBtn", "Entrar com Google")}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            {t("login.orUseEmail", "ou email")}
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: "rgba(255,80,80,0.15)", color: "#ff6b6b",
              padding: "12px 14px", borderRadius: "10px",
              marginBottom: "14px", fontSize: "0.88rem",
              border: "1px solid rgba(255,80,80,0.3)",
            }}>
              ⚠️ {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
            {t("login.email", "Email")}
          </label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@email.com" required
            style={{ marginBottom: "14px" }}
          />

          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
            {t("login.password", "Senha")}
          </label>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••" required
            style={{ marginBottom: "22px" }}
          />

          <button type="submit" disabled={loading} style={{ width: "100%", marginBottom: "14px" }}>
            {loading ? t("login.entering", "Entrando...") : t("common.enter", "Entrar")}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.88rem", marginBottom: "6px" }}>
          {t("home.noAccount", "Não tem conta?")}{" "}
          <Link to="/register" style={{ color: "#FF0080", fontWeight: 700, textDecoration: "none" }}>
            {t("login.createHost", "Criar conta Host")}
          </Link>
        </p>
        <p style={{ textAlign: "center" }}>
          <Link to="/forgot-password" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "underline", fontSize: "0.85rem" }}>
            {t("login.forgotPassword", "Esqueci minha senha")}
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: "16px" }}>
          <Link to="/" style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", textDecoration: "none" }}>
            {t("common.backToHome", "← Voltar ao início")}
          </Link>
        </p>
      </div>
    </div>
  );
}
