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
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <Link
            to="/terms"
            style={{
              color: "#666",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: "500",
              transition: "color 0.2s",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
          >
            {t("landing.terms", "Terms")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
