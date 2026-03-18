import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LandingHeader from "../components/LandingHeader";

export default function Terms() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#ccc",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      lineHeight: "1.6"
    }}>
      <LandingHeader />
      
      <div style={{
        maxWidth: "800px",
        margin: "60px auto",
        background: "#121212",
        padding: "40px",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            color: "#ff007f",
            marginBottom: "20px",
            padding: "0",
            fontSize: "0.9rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          ← {t("landing.terms.backToHome", "Back to Home")}
        </button>

        <h1 style={{ color: "#fff", fontSize: "2.5rem", marginBottom: "30px", fontWeight: "800" }}>
          {t("landing.terms.title", "Terms of Service")}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec1Title", "1. Acceptance of Terms")}
            </h2>
            <p>{t("landing.terms.sec1Content")}</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec2Title", "2. Description of Service")}
            </h2>
            <p>{t("landing.terms.sec2Content")}</p>
            <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
              <li>{t("landing.terms.sec2Item1")}</li>
              <li>{t("landing.terms.sec2Item2")}</li>
              <li>{t("landing.terms.sec2Item3")}</li>
              <li>{t("landing.terms.sec2Item4")}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec3Title", "3. User Conduct")}
            </h2>
            <p>{t("landing.terms.sec3Content")}</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec4Title", "4. YouTube API Services")}
            </h2>
            <p>{t("landing.terms.sec4Content")}</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec5Title", "5. Privacy & Data Collection")}
            </h2>
            <p>{t("landing.terms.sec5Content")}</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec6Title", "6. Intellectual Property")}
            </h2>
            <p>{t("landing.terms.sec6Content")}</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec7Title", "7. Disclaimer of Warranties")}
            </h2>
            <p>{t("landing.terms.sec7Content")}</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>
              {t("landing.terms.sec8Title", "8. Limitation of Liability")}
            </h2>
            <p>{t("landing.terms.sec8Content")}</p>
          </section>
        </div>

        <div style={{
          marginTop: "40px",
          paddingTop: "24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: "0.85rem",
          color: "#666"
        }}>
          {t("landing.terms.lastUpdated", "Last Updated: March 12, 2026")}
        </div>
      </div>
    </div>
  );
}
