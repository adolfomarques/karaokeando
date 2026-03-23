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
      color: "rgba(255,255,255,0.7)",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      lineHeight: "1.7"
    }}>
      <LandingHeader />
      
      <div className="container" style={{ margin: "60px auto" }}>
        <div className="glass-card" style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "48px",
          borderRadius: "24px",
        }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,0,128,0.1)",
              color: "#FF0080",
              border: "1px solid rgba(255,0,128,0.2)",
              borderRadius: "12px",
              marginBottom: "32px",
              padding: "8px 16px",
              fontSize: "0.85rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "none",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,0,128,0.15)";
              e.currentTarget.style.borderColor = "rgba(255,0,128,0.3)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,0,128,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,0,128,0.2)";
            }}
          >
            ← {t("landing.terms.backToHome", "Back to Home")}
          </button>

          <h1 style={{ color: "#fff", fontSize: "clamp(2rem, 5vw, 2.8rem)", marginBottom: "32px", fontWeight: "900", letterSpacing: "-1px" }}>
            {t("landing.terms.title", "Terms of Service")}
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
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
              <ul style={{ paddingLeft: "20px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
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
            marginTop: "48px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.3)"
          }}>
            {t("landing.terms.lastUpdated", "Last Updated: March 20, 2026")}
          </div>
        </div>
      </div>
    </div>
  );
}
