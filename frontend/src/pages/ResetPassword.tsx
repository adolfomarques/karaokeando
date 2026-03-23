import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE } from "../api";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error(t("resetPassword.tokenMissing", "Token de recuperação ausente."));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("resetPassword.passwordsDontMatch", "As senhas não coincidem."));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t("resetPassword.success", "Senha atualizada com sucesso!"));
        navigate("/login");
      } else {
        toast.error(data.message || t("resetPassword.error", "Erro ao redefinir senha"));
      }
    } catch {
      toast.error(t("tvLogin.connError", "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <Logo width={220} style={{ marginBottom: "32px" }} />
        <div className="glass-card" style={{ padding: "40px", maxWidth: "420px", textAlign: "center" }}>
          <p style={{ color: "#ff6b6b", marginBottom: "24px", fontSize: "1rem", fontWeight: "600" }}>
            {t("resetPassword.invalidToken", "Link de recuperação inválido ou expirado.")}
          </p>
          <button onClick={() => navigate("/forgot-password")} style={{ width: "100%" }}>
            {t("resetPassword.requestNew", "Solicitar novo link")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <Logo width={220} style={{ marginBottom: "24px" }} />
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", marginBottom: "32px", fontSize: "1rem" }}>
        {t("resetPassword.title", "Crie sua nova senha")}
      </p>

      <div className="glass-card" style={{ padding: "40px 36px", width: "100%", maxWidth: "420px" }}>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
            {t("resetPassword.newPasswordLabel", "Nova Senha")}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t("resetPassword.passwordPlaceholder", "Pelo menos 6 caracteres")}
            required
            minLength={6}
            style={{ marginBottom: "20px" }}
          />

          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
            {t("resetPassword.confirmPasswordLabel", "Confirmar Nova Senha")}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={t("resetPassword.confirmPlaceholder", "Confirme sua senha")}
            required
            style={{ marginBottom: "32px" }}
          />

          <button
            type="submit"
            disabled={loading}
            className="glow-pulse"
            style={{ width: "100%", padding: "16px", fontWeight: "800" }}
          >
            {loading ? t("resetPassword.submitting", "Atualizando...") : t("resetPassword.submitBtn", "Redefinir Senha")}
          </button>
        </form>
      </div>
    </div>
  );
}
