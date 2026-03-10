import { useTranslation } from 'react-i18next';
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Simple redirect component for /join/:code -> /room/:code
 * This allows QR codes to use /join/CODE format
 */
export default function JoinRedirect() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      navigate(`/room/${code.toUpperCase()}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [code, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "#888",
      }}
    >
      {t("joinRedirect.redirecting", "Redirecionando...")}
    </div>
  );
}
