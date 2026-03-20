import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGoogleLogin } from '@react-oauth/google';
import { GlassContainer, LiquidBackground } from '../components/ui/LiquidGlassLayout';

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
    backdropFilter: 'blur(20px)',
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
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🎙️</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '16px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 20px var(--primary-glow)' }}>
            {t("login.wakingUpTitle", "Preparando o Palco")}
          </h3>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.7, fontWeight: 500 }}>
            {t("login.wakingUp", "O servidor está acordando (pode levar até 40s na primeira vez)...")}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.05)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spinLoader 1s linear infinite',
            marginBottom: '24px',
            boxShadow: '0 0 30px var(--primary-glow)'
          }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>{t("login.entering", "Autenticando...")}</p>
        </div>
      )}
    </div>
    <style>{`
      @keyframes spinLoader { to { transform: rotate(360deg); } }
      @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulseWarmup {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
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
      setError(result.error || t("login.invalidCredentials", "Email ou senha incorretos"));
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
          setError(result.error || "Erro no login com Google");
        }
      } catch {
        setError("Erro ao autenticar via Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Falha ao abrir popup do Google.");
    }
  });

  return (
    <div style={{ 
      background: "transparent", minHeight: "100vh", position: "relative", overflow: "hidden", 
      fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px"
    }}>
      <LiquidBackground />
      
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, animation: 'fadeInUp 0.8s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
           <Logo width={320} style={{ marginBottom: 24 }} />
           <p style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: '1.1rem' }}>
            {t("login.desc", "Bem-vindo de volta, astro!")}
          </p>
        </div>

        <GlassContainer intensity={25} style={{ 
          position: "relative", overflow: "hidden", borderRadius: 40, padding: 40,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
        }}>
          {loading && <LoadingOverlay isWakingUp={isWakingUp} t={t} />}
          
          <button
            type="button"
            disabled={loading}
            onClick={() => handleGoogleLogin()}
            style={{
              width: "100%",
              marginBottom: 32,
              background: "#fff",
              color: "#000",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: 20,
              padding: '16px',
              border: "none",
              boxShadow: '0 10px 20px rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}
            className="tap-effect"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{t("login.googleBtn", "Entrar com Google")}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
            <div style={{ flex: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}></div>
            <span style={{ padding: "0 15px", color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{t("login.orUseEmail", "OU EMAIL")}</span>
            <div style={{ flex: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}></div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  background: "rgba(255, 68, 68, 0.1)",
                  border: '1px solid rgba(255, 68, 68, 0.2)',
                  color: "#ff4444",
                  padding: "14px 16px",
                  borderRadius: 16,
                  marginBottom: 24,
                  fontSize: "0.9rem",
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t("login.email", "Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="astro@karaokeando.app"
                required
                style={{ 
                  width: '100%', padding: '16px 20px', borderRadius: 18, 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#fff', fontSize: '1rem', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t("login.password", "Senha")}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: '100%', padding: '16px 20px', borderRadius: 18, 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#fff', fontSize: '1rem', outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: "100%", marginBottom: 32, padding: 20, borderRadius: 24, 
                background: 'var(--primary)', color: '#fff', border: 'none',
                fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 10px 30px var(--primary-glow)'
              }}
              className="tap-effect"
            >
              {loading ? t("login.entering", "Entrando...") : t("common.enter", "ENTRAR")}
            </button>
          </form>

          <div style={{ textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.95rem", fontWeight: 600, marginBottom: 16 }}>
              {t("home.noAccount", "Ainda não tem conta?")}{" "}
              <Link to="/register" style={{ color: "var(--primary)", fontWeight: 800 }}>
                {t("login.createHost", "Criar conta Host")}
              </Link>
            </p>

            <p style={{ fontSize: "0.9rem" }}>
              <Link to="/forgot-password" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontWeight: 600 }}>
                {t("login.forgotPassword", "Esqueceu a senha?")}.
              </Link>
            </p>
          </div>
        </GlassContainer>
        
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link to="/" style={{ color: "rgba(255,255,255,0.4)", textDecoration: 'none', fontWeight: 800, fontSize: '0.9rem' }} className="tap-effect">
            {t("common.backToHome", "← VOLTAR AO INÍCIO")}
          </Link>
        </div>
      </div>
    </div>
  );
}
