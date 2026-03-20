import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getToken } from "../context/AuthContext";
import { API_BASE } from "../api";
import { GlassContainer, LiquidBackground } from '../components/ui/LiquidGlassLayout';

export default function CreateRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tvPassword, setTvPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not a host
  if (!user?.canHost) {
    navigate("/complete-profile");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tvPassword.length !== 6) {
      setError(t("createRoom.sixChars", "Senha da TV deve ter 6 caracteres"));
      return;
    }

    if (tvPassword !== confirmPassword) {
      setError(t("createRoom.passwordsDontMatch", "Senhas não coincidem"));
      return;
    }

    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tvPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save TV token for this room
        const tvRes = await fetch(
          `${API_BASE}/api/rooms/${data.roomCode}/tv/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tvPassword }),
          }
        );

        if (tvRes.ok) {
          const tvData = await tvRes.json();
          localStorage.setItem(`tvToken_${data.roomCode}`, tvData.tvToken);
        }

        // Navigate to TV view
        navigate(`/room/${data.roomCode}/tv`);
      } else {
        setError(data.message || t("createRoom.error", "Erro ao criar sala"));
      }
    } catch {
      setError(t("tvLogin.connError", "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: "transparent", minHeight: "100vh", position: "relative", overflow: "hidden", 
      fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px"
    }}>
      <LiquidBackground />
      
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, animation: 'fadeInUp 0.8s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
           <Logo width={280} style={{ marginBottom: 24 }} />
           <p style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: '1.1rem' }}>
            {t("createRoom.desc1", "Defina a senha para o MODO TV")}
          </p>
        </div>

        <GlassContainer intensity={30} style={{ 
          position: "relative", overflow: "hidden", borderRadius: 48, padding: 40,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 100px rgba(0,0,0,0.5)'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "rgba(255,68,68,0.1)", border: '1px solid rgba(255,68,68,0.2)', color: "#ff4444", padding: "14px 20px", borderRadius: 16, marginBottom: 24, fontSize: "0.9rem", fontWeight: 700, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ 
              background: "rgba(var(--primary-rgb), 0.1)", 
              padding: "20px", 
              borderRadius: 24, 
              marginBottom: 32, 
              border: '1px solid rgba(var(--primary-rgb), 0.2)',
              fontSize: "0.9rem", 
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.5
            }}>
              <p style={{ margin: 0 }}>
                💡 {t("createRoom.desc2", "Esta senha será usada para acessar o")} <strong style={{ color: 'var(--primary)' }}>{t("createRoom.tvMode", "MODO TV")}</strong>{" "}
                {t("createRoom.desc3", "desta sala. Compartilhe apenas com quem deve controlar a TV.")}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 12, fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>
                {t("createRoom.tvPassword", "Senha da TV (6 digitos)")}
              </label>
              <input
                type="text"
                value={tvPassword}
                onChange={e => setTvPassword(e.target.value.slice(0, 6))}
                placeholder="Ex: stage1"
                required
                maxLength={6}
                style={{
                  width: '100%',
                  padding: "20px",
                  borderRadius: 20,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: "#fff",
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  textAlign: "center",
                  letterSpacing: "0.3em",
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", marginBottom: 12, fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>
                {t("createRoom.confirmPassword", "Confirmar Senha")}
              </label>
              <input
                type="text"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value.slice(0, 6))}
                placeholder="Dígite novamente"
                required
                maxLength={6}
                style={{
                  width: '100%',
                  padding: "20px",
                  borderRadius: 20,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: "#fff",
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  textAlign: "center",
                  letterSpacing: "0.3em",
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || tvPassword.length !== 6}
              style={{ 
                width: "100%", padding: 22, borderRadius: 28, 
                background: 'var(--primary)', color: '#fff', border: 'none',
                fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 15px 40px var(--primary-glow)',
                transition: 'all 0.3s ease'
              }}
              className="tap-effect"
            >
              {loading ? t("createRoom.creating", "Criando...") : t("createRoom.btn", "CRIAR SALA")}
            </button>
          </form>
        </GlassContainer>
      </div>
    </div>
  );
}
