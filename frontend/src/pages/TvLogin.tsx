import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api";
import Logo from "../components/Logo";

export default function TvLogin() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [tvPassword, setTvPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${code}/tv/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tvPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem(`tvToken_${code}`, data.tvToken);
        navigate(`/room/${code}/tv`);
      } else {
        setError(data.message || t("tvLogin.wrongPassword", "Senha incorreta"));
      }
    } catch {
      setError(t("tvLogin.connError", "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <Logo width={220} style={{ marginBottom: "24px" }} />
      
      <h1 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: 8, fontWeight: "900", color: "#fff" }}>
        {t("tvLogin.title", "📺 Modo TV")}
      </h1>
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginBottom: "32px", fontSize: "1rem" }}>
        {t("tvLogin.room", "Sala")}: <strong style={{ color: "#FF0080", letterSpacing: "1px" }}>{code}</strong>
      </p>

      <div className="glass-card" style={{ padding: "40px 36px", width: "100%", maxWidth: "400px" }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: "rgba(255,80,80,0.15)", color: "#ff6b6b",
              padding: "12px 14px", borderRadius: "10px", marginBottom: "20px", fontSize: "0.88rem",
              border: "1px solid rgba(255,80,80,0.3)",
            }}>
              ⚠️ {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
            {t("tvLogin.desc", "Digite a senha para acessar o modo TV")}
          </label>
          <input
            type="text"
            value={tvPassword}
            onChange={e => setTvPassword(e.target.value.slice(0, 6))}
            placeholder="••••••"
            required
            maxLength={6}
            autoFocus
            style={{
              marginBottom: "28px",
              letterSpacing: "0.3em",
              textAlign: "center",
              fontSize: "1.8rem",
              fontWeight: "900",
              color: "#fff",
              background: "rgba(255,255,255,0.05)",
            }}
          />

          <button
            type="submit"
            disabled={loading || tvPassword.length === 0}
            className="glow-pulse"
            style={{ width: "100%", padding: "16px", fontSize: "1rem", fontWeight: "800" }}
          >
            {loading ? t("tv.verifying", "Verificando...") : t("common.enter", "Entrar")}
          </button>
        </form>
      </div>

      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.9rem", marginTop: 32 }}>
        {t("tvLogin.wantToJoin", "Quer entrar como participante?")}{" "}
        <span
          onClick={() => navigate(`/room/${code}`)}
          style={{ color: "#FF0080", fontWeight: "700", cursor: "pointer", marginLeft: "4px" }}
        >
          {t("tvLogin.clickHere", "Clique aqui")}
        </span>
      </p>
    </div>
  );
}
