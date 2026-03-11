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
          lng: i18n.language // Envia o idioma atual (pt ou en)
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        toast.error(data.message || "Erro ao solicitar redefinição");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 60, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 32 }}>
        {t("forgotPassword.desc", "Recuperar senha de acesso")}
      </p>

      <div className="card">
        {submitted ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>📩</div>
            <h3 style={{ margin: "0 0 16px", color: "#4CAF50" }}>
              {t("forgotPassword.successTitle", "Verifique seu email!")}
            </h3>
            <p style={{ color: "#aaa", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: 24 }}>
              {t("forgotPassword.successDesc", "Enviamos um link de recuperação para {{email}}. Por favor, verifique sua caixa de entrada e também a pasta de spam.", { email })}
            </p>
            <button 
              onClick={() => setSubmitted(false)} 
              style={{ background: "transparent", border: "1px solid #444", color: "#fff", marginBottom: 16 }}
            >
              {t("forgotPassword.tryAgain", "Tentar novamente")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: 24, lineHeight: 1.5 }}>
              {t("forgotPassword.instruction", "Digite o e-mail associado à sua conta. Enviaremos um link para redefinir sua senha.")}
            </p>

            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              {t("forgotPassword.emailLabel", "Email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t("forgotPassword.emailPlaceholder", "seu@email.com")}
              required
              style={{ marginBottom: 24 }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginBottom: 16 }}
            >
              {loading ? t("forgotPassword.submitting", "Enviando link...") : t("forgotPassword.submitBtn", "Enviar link de recuperação")}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: "0.9rem", marginTop: 16 }}>
          <Link to="/login" style={{ color: "#888", textDecoration: "underline" }}>
            {t("common.backToLogin", "← Voltar ao login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
