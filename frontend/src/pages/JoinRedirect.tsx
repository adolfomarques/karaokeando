import { useTranslation } from 'react-i18next';
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function JoinRedirect() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (code) {
        navigate(`/room/${code.toUpperCase()}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, navigate]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-card" style={{ padding: "40px 60px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
        <Logo width={200} />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "10px", height: "10px", background: "#FF0080", borderRadius: "50%", boxShadow: "0 0 10px #FF0080", animation: "pulse 1.5s infinite" }} />
          <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600", letterSpacing: "1px" }}>
            {t("joinRedirect.redirecting", "REDIRECIONANDO...")}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
