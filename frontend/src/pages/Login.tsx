import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGoogleLogin } from '@react-oauth/google';

const LoadingOverlay = ({ isWakingUp, t }: { isWakingUp: boolean, t: any }) => (
  <div style={{
    position: 'absolute',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    borderRadius: 'inherit',
    textAlign: 'center',
    padding: '24px',
    color: '#fff',
    animation: 'fadeInOverlay 0.4s ease-out',
    userSelect: 'none'
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '300px' }}>
      {isWakingUp ? (
        <div style={{ animation: 'pulseWarmup 2s infinite ease-in-out' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎙️</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: '#ff6600', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t("login.wakingUpTitle", "Waking Up the Stage")}
          </h3>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.9, fontWeight: 500 }}>
            {t("login.wakingUp", "The server is starting up after inactivity (may take up to 40s the first time)...")}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: '#ff6600',
            borderRadius: '50%',
            animation: 'spinLoader 1s linear infinite',
            marginBottom: '20px'
          }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.5px' }}>{t("login.entering", "Authenticating...")}</p>
        </div>
      )}
    </div>
    <style>{`
      @keyframes spinLoader { to { transform: rotate(360deg); } }
      @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulseWarmup {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 0.9; }
      }
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

  // Monitora o estado de Loading. Se demorar mais que 4s, o servidor "Render" provavelmente está acordando
  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => {
        setIsWakingUp(true);
      }, 4000);
    } else {
      setIsWakingUp(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Get return URL from navigation state
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

    if (result.success) {
      navigate(returnTo);
    } else {
      setError(result.error || t("login.invalidCredentials", "Email or password invalid"));
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const result = await loginWithGoogle(tokenResponse.access_token);
        if (result.success) {
          navigate(returnTo);
        } else {
          setError(result.error || "Google login error");
        }
      } catch {
        setError("Error authenticating via Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Failed to open Google popup.");
    }
  });

  return (
    <div className="container" style={{ paddingTop: 60, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 32 }}>
        {t("login.desc", "Login to your account")}
      </p>

      <div className="card" style={{ position: "relative", overflow: "hidden" }}>
        {loading && <LoadingOverlay isWakingUp={isWakingUp} t={t} />}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleGoogleLogin()}
          style={{
            width: "100%",
            marginBottom: 24,
            background: "#fff",
            color: "#333",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            border: "1px solid #ddd",
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
          {t("login.googleBtn", "Sign in with Google")}
        </button>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <div style={{ flex: 1, borderBottom: "1px solid #333" }}></div>
          <span style={{ padding: "0 10px", color: "#666", fontSize: "0.85rem", textTransform: "uppercase" }}>{t("login.orUseEmail", "or use your email")}</span>
          <div style={{ flex: 1, borderBottom: "1px solid #333" }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "#ff4444",
                color: "white",
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("login.email", "Email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@email.com"
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("login.password", "Password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••"
            required
            style={{ marginBottom: 24 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginBottom: 16 }}
          >
            {loading ? t("login.entering", "Logging in...") : t("common.enter", "Login")}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#888", fontSize: "0.9rem", marginBottom: 8 }}>
          {t("home.noAccount", "Don't have an account?")}{" "}
          <Link to="/register" style={{ color: "#4CAF50", fontWeight: 600 }}>
            {t("login.createHost", "Create Host account")}
          </Link>
        </p>

        <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
          <Link to="/forgot-password" style={{ color: "#888", textDecoration: "underline" }}>
            {t("login.forgotPassword", "Forgot password?")}
          </Link>
        </p>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" style={{ color: "#888" }}>
            {t("common.backToHome", "← Back to home")}
          </Link>
        </p>
      </div>
    </div>
  );
}
