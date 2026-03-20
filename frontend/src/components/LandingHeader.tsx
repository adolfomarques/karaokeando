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
      background: "rgba(10, 10, 10, 0.92)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      zIndex: 1000,
    }}>
      {/* Use the same .container class as the page content for perfect alignment */}
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
      }}>
        {/* Logo Section */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", flexShrink: 0 }}>
          <img
            src="/am-logo.png"
            alt="Logo AM"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
          />
          <span style={{
            color: "#fff",
            fontWeight: "700",
            fontSize: "1rem",
            letterSpacing: "-0.3px",
            whiteSpace: "nowrap"
          }}>
            Adolfo Marques
          </span>
        </Link>

        {/* Right Section: Terms + Language side by side */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          marginLeft: "auto"
        }}>
          <Link
            to="/terms"
            style={{
              color: "#aaa",
              textDecoration: "none",
              fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
              fontWeight: "600",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#aaa";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            {t("landing.terms.title", "Terms")}
          </Link>
          <div style={{ position: "relative", zIndex: 1100 }}>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
