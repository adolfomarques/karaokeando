import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';

export default function RegisterHost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerHost, loginWithGoogle } = useAuth();

  // Redirection context
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
    <div className="container" style={{ paddingTop: 40, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 24 }}>
        {t("register.desc", "Crie sua conta para poder criar salas de karaokê")}
      </p>

      <div className="card">
        <button
          type="button"
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
          {t("register.googleBtn", "Criar conta com o Google")}
        </button>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <div style={{ flex: 1, borderBottom: "1px solid #333" }}></div>
          <span style={{ padding: "0 10px", color: "#666", fontSize: "0.85rem", textTransform: "uppercase" }}>ou use seu email</span>
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
            {t("register.nameLabel", "Seu nome")}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("register.namePlaceholder", "Como quer ser chamado?")}
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("login.email", "Email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("login.password", "Senha")}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t("register.passwordPlaceholder", "Mín. 6 caracteres")}
            required
            minLength={6}
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("register.confirmPassword", "Confirmar Senha")}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={t("register.confirmPasswordPlaceholder", "Repita sua senha")}
            required
            minLength={6}
            style={{ marginBottom: 24 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginBottom: 16 }}
          >
            {loading ? t("register.creating", "Criando conta...") : t("register.createBtn", "Criar conta e continuar")}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#888", fontSize: "0.9rem", marginBottom: 8 }}>
          {t("home.noAccount", "Já tem conta?")}{" "}
          <Link to="/login" style={{ color: "#4CAF50", fontWeight: 600 }}>
            {t("auth.login", "Fazer login")}
          </Link>
        </p>

        <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
          <Link to="/forgot-password" style={{ color: "#888", textDecoration: "underline" }}>
            {t("login.forgotPassword", "Esqueceu a senha?")}
          </Link>
        </p>

      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/" style={{ color: "#888" }}>
          {t("common.backToHome", "← Voltar ao início")}
        </Link>
      </div>
    </div>
  );
}
