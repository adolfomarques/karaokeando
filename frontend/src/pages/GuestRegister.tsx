import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGoogleLogin } from '@react-oauth/google';

export default function GuestRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { registerGuest, loginWithGoogle } = useAuth();

  // Get redirect info from query params OR location state
  const roomCode =
    searchParams.get("redirect") ||
    (location.state as any)?.roomCode ||
    null;
  const redirectTo = roomCode ? `/room/${roomCode}` : (location.state as any)?.redirectTo || "/";

  const [name, setName] = useState(() => {
    return localStorage.getItem("karaokefactory_name") || "";
  });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError(t("guestReg.phoneRequired", "Please provide your phone number"));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError(t("guestReg.invalidPhone", "Invalid phone number (minimum 10 digits)"));
      return;
    }

    setLoading(true);

    const result = await registerGuest(name, email, phone);
    setLoading(false);

    if (result.success) {
      // Save name for convenience
      localStorage.setItem("karaokefactory_name", name);

      // Redirect to intended destination
      if (roomCode) {
        // Salvar última sala para acesso rápido
        localStorage.setItem("karaokefactory_last_room", roomCode);
        navigate(`/room/${roomCode}`);
      } else {
        navigate(redirectTo);
      }
    } else {
      setError(result.error || t("guestReg.registerError", "Error registering"));
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const result = await loginWithGoogle(tokenResponse.access_token);
        if (result.success) {
          navigate(redirectTo);
        } else {
          setError(result.error || "Google login error");
        }
      } catch {
        setError("Error authenticating via Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Failed to open Google popup.");
    }
  });

  return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 32 }}>
        {roomCode
          ? t("guestReg.enterRoomWithCode", `Tell us who you are to join room ${roomCode}`, { code: roomCode })
          : t("guestReg.enterData", "Tell us who you are to continue")}
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
            {t("guestReg.yourName", "Your Name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("guestReg.namePlaceholder", "How do you want to be called?")}
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
            {t("guestReg.phone", "Phone")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
            required
            style={{ marginBottom: 24 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginBottom: 24 }}
          >
            {loading
              ? t("guestReg.entering", "Entering...")
              : roomCode
              ? t("guestReg.enterRoomBtn", "Join Room")
              : t("common.continue", "Continue")}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <div style={{ flex: 1, borderBottom: "1px solid #333" }}></div>
          <span style={{ padding: "0 10px", color: "#666", fontSize: "0.85rem", textTransform: "uppercase" }}>{t("guestReg.or", "OR")}</span>
          <div style={{ flex: 1, borderBottom: "1px solid #333" }}></div>
        </div>

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
          {t("guestReg.googleBtn", "Sign in with Google")}
        </button>

        <p style={{ textAlign: "center", marginBottom: 12 }}>
          <a
            href="/login"
            onClick={e => {
              e.preventDefault();
              navigate("/login", { state: { redirectTo, roomCode } });
            }}
            style={{ color: "#007bff", fontWeight: 600 }}
          >
            {t("guestReg.loginBtn", "Login with email")}
          </a>
        </p>

        <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
          <Link
            to="/register"
            state={{ redirectTo, roomCode }}
            style={{ color: "#4CAF50", fontWeight: 600 }}
          >
            {t("guestReg.createHostBtn", "Create Host account")}
          </Link>
        </p>
      </div>
    </div>
  );
}
