import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { GlassContainer, LiquidBackground } from '../components/ui/LiquidGlassLayout';

export default function RegisterHost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerHost, loginWithGoogle } = useAuth();

  const state = location.state as { redirectTo?: string; roomCode?: string } | null;
  const returnTo = state?.roomCode 
    ? `/room/${state.roomCode}` 
    : (state?.redirectTo || "/create-room");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("createRoom.passwordsDontMatch", "As senhas não coincidem"));
      return;
    }

    setLoading(true);

    try {
      const result = await registerHost({
        name,
        email,
        password,
      });

      if (result.success) {
        navigate(returnTo);
      } else {
        setError(result.error || t("register.error", "Erro ao criar conta"));
      }
    } catch {
      setError(t("tvLogin.connError", "Erro de conexão"));
    } finally {
      setLoading(false);
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
           <Logo width={280} style={{ marginBottom: 16 }} />
           <p style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: '1rem' }}>
            {t("register.desc", "Crie sua conta para comandar salas de Karaoke!")}
          </p>
        </div>

        <GlassContainer intensity={25} style={{ 
          position: "relative", overflow: "hidden", borderRadius: 40, padding: "32px 40px",
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
        }}>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleGoogleLogin()}
            style={{
              width: "100%",
              marginBottom: 24,
              background: "#fff",
              color: "#000",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: 18,
              padding: '14px',
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
            <span style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.85rem' }}>{t("register.googleBtn", "Criar com Google")}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
            <div style={{ flex: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}></div>
            <span style={{ padding: "0 15px", color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{t("register.orEmail", "OU EMAIL")}</span>
            <div style={{ flex: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}></div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "rgba(255, 68, 68, 0.1)", border: '1px solid rgba(255, 68, 68, 0.2)', color: "#ff4444", padding: "12px", borderRadius: 12, marginBottom: 20, fontSize: "0.85rem", textAlign: 'center', fontWeight: 600 }}>{error}</div>
            )}

            <div style={{ marginBottom: 16 }}>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t("register.nameLabel", "Seu nome")} required style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" required style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" required minLength={6} style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetir" required minLength={6} style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: "100%", marginBottom: 24, padding: 18, borderRadius: 20, 
                background: 'var(--primary)', color: '#fff', border: 'none',
                fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 10px 30px var(--primary-glow)'
              }}
              className="tap-effect"
            >
              {loading ? t("register.creating", "Criando...") : t("register.createBtn", "CRIAR CONTA")}
            </button>
          </form>

          <div style={{ textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem", fontWeight: 600, marginBottom: 12 }}>
              {t("home.alreadyHaveAccount", "Já tem conta?")}{" "}
              <Link to="/login" style={{ color: "var(--primary)", fontWeight: 800 }}>{t("auth.login", "Entrar")}</Link>
            </p>
          </div>
        </GlassContainer>
        
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="/" style={{ color: "rgba(255,255,255,0.4)", textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }} className="tap-effect">
            {t("common.backToHome", "← VOLTAR AO INÍCIO")}
          </Link>
        </div>
      </div>
    </div>
  );
}
