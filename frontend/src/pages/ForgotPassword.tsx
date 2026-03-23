import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE } from "../api";
import i18n from '../i18n';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email,
          lng: i18n.language
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        toast.error(data.message || t("forgotPassword.error", "Error requesting reset"));
      }
    } catch {
      toast.error(t("tvLogin.connError", "Connection error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <Logo width={220} style={{ marginBottom: "24px" }} />
      
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", marginBottom: "32px", fontSize: "1rem" }}>
        {t("forgotPassword.desc", "Recuperar senha de acesso")}
      </p>

      <div className="glass-card" style={{ padding: "40px 36px", width: "100%", maxWidth: "420px" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 24 }}>📩</div>
            <h3 style={{ margin: "0 0 16px", color: "#FF0080", fontWeight: "900", fontSize: "1.5rem" }}>
              {t("forgotPassword.successTitle", "Verifique seu e-mail!")}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 32 }}>
              {t("forgotPassword.successDesc", "Enviamos um link de recuperação para {{email}}. Verifique sua caixa de entrada e também a pasta de spam.", { email })}
            </p>
            <button 
              onClick={() => setSubmitted(false)} 
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", width: "100%" }}
            >
              {t("forgotPassword.tryAgain", "Tentar novamente")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginBottom: 28, lineHeight: 1.6 }}>
              {t("forgotPassword.instruction", "Informe o e-mail associado à sua conta. Enviaremos um link para redefinir sua senha.")}
            </p>

            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
              {t("forgotPassword.emailLabel", "E-mail")}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t("forgotPassword.emailPlaceholder", "seu@email.com")}
              required
              style={{ marginBottom: 32 }}
            />

            <button
              type="submit"
              disabled={loading}
              className="glow-pulse"
              style={{ width: "100%", marginBottom: "12px", padding: "16px", fontWeight: "800" }}
            >
              {loading ? t("forgotPassword.submitting", "Enviando link...") : t("forgotPassword.submitBtn", "Enviar link de recuperação")}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <Link to="/login" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textDecoration: "none" }}>
            {t("common.backToLogin", "← Voltar ao login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
