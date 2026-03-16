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
          ← {t("common.backToHome", "Back to Home")}
        </button>

        <h1 style={{ color: "#fff", fontSize: "2.5rem", marginBottom: "30px", fontWeight: "800" }}>
          {t("landing.terms", "Terms of Service")}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>1. Acceptance of Terms</h2>
            <p>By accessing or using KaraokeParty (the "Service"), you confirm that you have read, understood, and agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you are prohibited from using the Service. These terms apply to all visitors, users, and others who access or use the Service.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>2. Description of Service</h2>
            <p>KaraokeParty is a real-time collaborative karaoke platform that allows a host to create a party session and invite participants to join via a unique party code. The Service enables users to:</p>
            <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
              <li>Search and queue karaoke songs sourced from YouTube</li>
              <li>Participate in live karaoke sessions with other users</li>
              <li>Send real-time reactions and interact during sessions</li>
              <li>Manage a shared song queue collaboratively</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>3. User Conduct</h2>
            <p>You agree to use the Service in a lawful, respectful, and responsible manner. You must not use the Service to request, share, or promote content that is illegal, defamatory, obscene, hateful, or that infringes upon the intellectual property rights of others. We reserve the right to terminate access for any user who violates these conduct standards, without prior notice.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>4. YouTube API Services</h2>
            <p>This Service integrates with YouTube API Services to enable video search and playback. By using KaraokeParty, you also agree to be bound by YouTube's Terms of Service (https://www.youtube.com/t/terms) and Google's Privacy Policy (https://policies.google.com/privacy). We do not host, store, or distribute any video content. All media is streamed directly from YouTube's servers.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>5. Privacy & Data Collection</h2>
            <p>We are committed to protecting your privacy. The Service collects only the minimum data required for operation, including party session codes, song queue entries, and display names chosen by users. All session data is temporary and is automatically purged upon party termination. We do not collect personally identifiable information, and we do not sell, rent, or share any user data with third parties.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>6. Intellectual Property</h2>
            <p>All content, design elements, trademarks, and source code comprising the KaraokeParty platform are the exclusive property of their respective owners and are protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any part of the Service without express written permission.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>7. Disclaimer of Warranties</h2>
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "12px", fontWeight: "700" }}>8. Limitation of Liability</h2>
            <p>To the fullest extent permitted by applicable law, KaraokeParty and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, data, goodwill, or other intangible losses — arising out of or in connection with your use of, or inability to use, the Service, even if we have been advised of the possibility of such damages.</p>
          </section>
        </div>

        <div style={{
          marginTop: "40px",
          paddingTop: "24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: "0.85rem",
          color: "#666"
        }}>
          Last Updated: March 12, 2026
        </div>
      </div>
    </div>
  );
}
