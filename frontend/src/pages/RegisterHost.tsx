import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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

export default function RegisterHost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerHost, loginWithGoogle } = useAuth();

  const state = location.state as { redirectTo?: string; roomCode?: string } | null;
  const returnTo = state?.roomCode ? `/room/${state.roomCode}` : (state?.redirectTo || "/create-room");

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
      const result = await registerHost({ name, email, password });
      if (result.success) navigate(returnTo);
      else setError(result.error || t("register.error", "Erro ao criar conta"));
    } catch {
      setError(t("tvLogin.connError", "Erro de conexão"));
    } finally {
      setLoading(false);
    }
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

      <Logo width={280} style={{ marginBottom: "8px" }} />
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginBottom: "28px", fontSize: "0.95rem" }}>
        {t("register.desc", "Crie sua conta para criar salas de karaoke")}
      </p>

      <div className="glass-card" style={{ padding: "36px", width: "100%", maxWidth: "420px" }}>
        {/* Google */}
        <button
          type="button"
          onClick={() => handleGoogleLogin()}
          disabled={loading}
          style={{
            width: "100%", marginBottom: "20px",
            background: "#fff", color: "#333",
            fontWeight: 600, fontSize: "0.95rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            border: "none", padding: "12px 24px", borderRadius: "999px", boxShadow: "none",
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
          {t("register.googleBtn", "Criar conta com Google")}
        </button>

        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            {t("register.orEmail", "ou email")}
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

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

          {[
            { label: t("register.nameLabel", "Seu nome"), type: "text", val: name, set: setName, placeholder: t("register.namePlaceholder", "Como quer ser chamado?") },
            { label: t("login.email", "Email"), type: "email", val: email, set: setEmail, placeholder: "voce@email.com" },
            { label: t("login.password", "Senha"), type: "password", val: password, set: setPassword, placeholder: t("register.passwordPlaceholder", "Mín. 6 caracteres") },
            { label: t("register.confirmPassword", "Confirmar Senha"), type: "password", val: confirmPassword, set: setConfirmPassword, placeholder: t("register.confirmPasswordPlaceholder", "Repita a senha") },
          ].map((field, i) => (
            <div key={i}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {field.label}
              </label>
              <input
                type={field.type}
                value={field.val}
                onChange={e => field.set(e.target.value)}
                placeholder={field.placeholder}
                required
                minLength={field.type === "password" ? 6 : undefined}
                style={{ marginBottom: i < 3 ? "14px" : "22px" }}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} style={{ width: "100%", marginBottom: "14px" }}>
            {loading ? t("register.creating", "Criando conta...") : t("register.createBtn", "Criar conta e continuar")}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.88rem", marginBottom: "6px" }}>
          {t("home.alreadyHaveAccount", "Já tem conta?")}{" "}
          <Link to="/login" style={{ color: "#FF0080", fontWeight: 700, textDecoration: "none" }}>
            {t("auth.login", "Login")}
          </Link>
        </p>
        <p style={{ textAlign: "center" }}>
          <Link to="/forgot-password" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "underline", fontSize: "0.85rem" }}>
            {t("login.forgotPassword", "Esqueci minha senha")}
          </Link>
        </p>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Link to="/" style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", textDecoration: "none" }}>
          {t("common.backToHome", "← Voltar ao início")}
        </Link>
      </div>
    </div>
  );
}
