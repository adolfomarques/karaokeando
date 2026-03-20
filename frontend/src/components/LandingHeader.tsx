import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";

export default function LandingHeader() {
  const { t } = useTranslation();

  return (
    <header style={{
      position: "sticky",
      top: 0,
      left: 0,
      right: 0,
      width: "100%",
      background: "rgba(10, 10, 10, 0.75)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
      zIndex: 1000,
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        gap: "12px",
      }}>
        {/* Left: Logo/Brand */}
        <Link to="/" style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
          flexShrink: 0,
        }}>
          <img
            src="/am-logo.png"
            alt="Logo AM"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
          <span style={{
            color: "#fff",
            fontWeight: "700",
            fontSize: "0.95rem",
            letterSpacing: "-0.3px",
            whiteSpace: "nowrap",
          }}>
            Adolfo Marques
          </span>
        </Link>

        {/* Right: Terms + Language */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}>
          <Link
            to="/terms"
            style={{
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              fontSize: "clamp(0.72rem, 2vw, 0.82rem)",
              fontWeight: "500",
              whiteSpace: "nowrap",
              padding: "5px 10px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.07)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.10)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            }}
          >
            {t("landing.terms.title", "Terms")}
          </Link>

          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
