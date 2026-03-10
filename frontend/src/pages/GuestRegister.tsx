import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GuestRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { registerGuest } = useAuth();

  // Get redirect info from query params OR location state
  const roomCode =
    searchParams.get("redirect") ||
    (location.state as any)?.roomCode ||
    null;
  const redirectTo = roomCode ? `/room/${roomCode}` : (location.state as any)?.redirectTo || "/";

  const [name, setName] = useState(() => {
    return localStorage.getItem("karaokeando_name") || "";
  });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError(t("guestReg.phoneRequired", "Informe seu telefone"));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError(t("guestReg.invalidPhone", "Telefone inválido (mínimo 10 dígitos)"));
      return;
    }

    setLoading(true);

    const result = await registerGuest(name, email, phone);
    setLoading(false);

    if (result.success) {
      // Save name for convenience
      localStorage.setItem("karaokeando_name", name);

      // Redirect to intended destination
      if (roomCode) {
        // Salvar última sala para acesso rápido
        localStorage.setItem("karaokeando_last_room", roomCode);
        navigate(`/room/${roomCode}`);
      } else {
        navigate(redirectTo);
      }
    } else {
      setError(result.error || t("guestReg.registerError", "Erro ao registrar"));
    }
  };

  return (
    <div className="container" style={{ paddingTop: 60, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 32 }}>
        {roomCode
          ? t("guestReg.enterRoomWithCode", `Informe seus dados para entrar na sala ${roomCode}`, { code: roomCode })
          : t("guestReg.enterData", "Informe seus dados para continuar")}
      </p>

      <div className="card">
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
            {t("guestReg.yourName", "Seu Nome")}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("guestReg.namePlaceholder", "Como quer ser chamado")}
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("guestReg.email", "Email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@email.com"
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("guestReg.phone", "Telefone")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            required
            style={{ marginBottom: 24 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginBottom: 16 }}
          >
            {loading
              ? t("guestReg.entering", "Entrando...")
              : roomCode
              ? t("guestReg.enterRoomBtn", "Entrar na Sala")
              : t("common.continue", "Continuar")}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#888", fontSize: "0.9rem" }}>
          {t("guest.alreadyHaveAccount", "Já tem conta completa?")}{" "}
          <a
            href="/login"
            onClick={e => {
              e.preventDefault();
              navigate("/login", { state: { redirectTo, roomCode } });
            }}
            style={{ color: "#007bff" }}
          >
            {t("auth.login", "Fazer login")}
          </a>
        </p>
      </div>
    </div>
  );
}
