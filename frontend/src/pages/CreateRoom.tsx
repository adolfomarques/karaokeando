import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getToken } from "../context/AuthContext";
import { API_BASE } from "../api";

export default function CreateRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tvPassword, setTvPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user?.canHost) {
    navigate("/complete-profile");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tvPassword.length !== 6) {
      setError(t("createRoom.sixChars", "A senha da TV deve ter exatamente 6 caracteres"));
      return;
    }
    if (tvPassword !== confirmPassword) {
      setError(t("createRoom.passwordsDontMatch", "As senhas não coincidem"));
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tvPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        const tvRes = await fetch(`${API_BASE}/api/rooms/${data.roomCode}/tv/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tvPassword }),
        });
        if (tvRes.ok) {
          const tvData = await tvRes.json();
          localStorage.setItem(`tvToken_${data.roomCode}`, tvData.tvToken);
        }
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
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <Logo width={220} style={{ marginBottom: "8px" }} />
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginBottom: "28px", fontSize: "0.95rem" }}>
        {t("createRoom.desc1", "Configure a senha do modo TV")}
      </p>

      <div className="glass-card" style={{ padding: "36px", width: "100%", maxWidth: "420px" }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: "rgba(255,80,80,0.15)", color: "#ff6b6b",
              padding: "12px 14px", borderRadius: "10px", marginBottom: "14px", fontSize: "0.88rem",
              border: "1px solid rgba(255,80,80,0.3)",
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Info glass box */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "14px 16px",
            borderRadius: "12px",
            marginBottom: "22px",
            fontSize: "0.88rem",
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.6,
          }}>
            💡 {t("createRoom.desc2", "Esta senha será usada para acessar o")} <strong style={{ color: "rgba(255,255,255,0.8)" }}>{t("createRoom.tvMode", "modo TV")}</strong>{" "}
            {t("createRoom.desc3", "da sala. Compartilhe apenas com quem deve controlar a TV.")}
          </div>

          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
            {t("createRoom.tvPassword", "Senha da TV (6 chars)")}
          </label>
          <input
            type="text"
            value={tvPassword}
            onChange={e => setTvPassword(e.target.value.slice(0, 6))}
            placeholder={t("createRoom.placeholderTV", "Ex: abc123")}
            required maxLength={6}
            style={{ marginBottom: "14px", letterSpacing: "0.25em", textAlign: "center", fontSize: "1.3rem" }}
          />

          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
            {t("createRoom.confirmPassword", "Confirmar Senha")}
          </label>
          <input
            type="text"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value.slice(0, 6))}
            placeholder={t("createRoom.placeholderConfirm", "Digite novamente")}
            required maxLength={6}
            style={{ marginBottom: "26px", letterSpacing: "0.25em", textAlign: "center", fontSize: "1.3rem" }}
          />

          <button
            type="submit"
            disabled={loading || tvPassword.length !== 6}
            style={{ width: "100%" }}
          >
            {loading ? t("createRoom.creating", "Criando...") : t("createRoom.btn", "Criar Sala")}
          </button>
        </form>
      </div>
    </div>
  );
}
