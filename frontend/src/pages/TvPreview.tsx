import { useState, useEffect } from "react";
import Logo from "../components/Logo";

// Mock data to demonstrate both Empty Queue and Active Playing states
const MOCK_ROOM = "3BBEP2";
const MOCK_JOIN_URL = `https://karaokefactory.org/join/${MOCK_ROOM}`;
const MOCK_QR = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(MOCK_JOIN_URL)}&bgcolor=ffffff&color=0a0a0a&margin=1`;

const MOCK_SOLO_RANKING = [
  { rank: 1, name: "Mariana Silva", score: 96, song: "Como Nossos Pais", badge: "🥇" },
  { rank: 2, name: "Thiago Rocha", score: 92, song: "Evidências", badge: "🥈" },
  { rank: 3, name: "Camila Duarte", score: 88, song: "Amor I Love You", badge: "🥉" },
  { rank: 4, name: "Felipe Costa", score: 84, song: "Tempo Perdido", badge: "4º" },
  { rank: 5, name: "Beatriz Lima", score: 79, song: "Malandragem", badge: "5º" },
];

const MOCK_DUET_RANKING = [
  { rank: 1, names: ["Mariana", "Thiago"], score: 95, song: "Evidências (Dupla)", badge: "👑" },
  { rank: 2, names: ["Camila", "Felipe"], score: 91, song: "Águas de Março", badge: "🥈" },
  { rank: 3, names: ["Beatriz", "Lucas"], score: 86, song: "Faroeste Caboclo", badge: "🥉" },
];

const MOCK_QUEUE = [
  { id: "1", title: "Chitãozinho & Xororó - Evidências", singer: "Thiago & Mariana", time: "Próximo" },
  { id: "2", title: "Legião Urbana - Pais e Filhos", singer: "Felipe Costa", time: "Em 4 min" },
  { id: "3", title: "Anitta - Envolver", singer: "Camila Duarte", time: "Em 8 min" },
];

export default function TvPreview() {
  const [selectedConcept, setSelectedConcept] = useState<"electric" | "electric_banner" | "cyber" | "arcade">("electric");
  const [hasActiveSong, setHasActiveSong] = useState(false);
  const [rankingTab, setRankingTab] = useState<"solo" | "duet">("solo");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050507", color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL SWITCHER (Interactive Prototype Controls)
      ───────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "rgba(10, 10, 14, 0.96)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "10px 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "800", color: "#FF0080" }}>
            🎨 PREVIEW DO TELÃO
          </span>
          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: "12px", color: "rgba(255,255,255,0.7)" }}>
            Alinhamento Perfeito & Polish
          </span>
        </div>

        {/* Concept Selector Tabs */}
        <div style={{ display: "flex", gap: "6px", background: "rgba(255, 255, 255, 0.05)", padding: "4px", borderRadius: "30px" }}>
          <button
            type="button"
            onClick={() => setSelectedConcept("electric")}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              background: selectedConcept === "electric" ? "linear-gradient(135deg, #FF0080, #FF4D6D)" : "transparent",
              color: "#fff",
              border: "none",
              boxShadow: selectedConcept === "electric" ? "0 4px 15px rgba(255,0,128,0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            ⚡ 1. Electric Stage (Central Majestoso)
          </button>
          <button
            type="button"
            onClick={() => setSelectedConcept("electric_banner")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              background: selectedConcept === "electric_banner" ? "linear-gradient(135deg, #FF0080, #FF4D6D)" : "transparent",
              color: "#fff",
              border: "none",
              boxShadow: selectedConcept === "electric_banner" ? "0 4px 15px rgba(255,0,128,0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            ⚡ 1B. Electric (Header Panorâmico)
          </button>
          <button
            type="button"
            onClick={() => setSelectedConcept("cyber")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              background: selectedConcept === "cyber" ? "#ffffff" : "transparent",
              color: selectedConcept === "cyber" ? "#000000" : "#ffffff",
              border: "none",
              boxShadow: selectedConcept === "cyber" ? "0 4px 15px rgba(255,255,255,0.3)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            🍸 2. Cyber Lounge (VIP)
          </button>
          <button
            type="button"
            onClick={() => setSelectedConcept("arcade")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              background: selectedConcept === "arcade" ? "linear-gradient(135deg, #facc15, #eab308)" : "transparent",
              color: selectedConcept === "arcade" ? "#000" : "#fff",
              border: "none",
              boxShadow: selectedConcept === "arcade" ? "0 4px 15px rgba(250,204,21,0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            🕹️ 3. Arcade Neo-Retro (HUD)
          </button>
        </div>

        {/* State Toggle + Fullscreen */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setHasActiveSong(!hasActiveSong)}
            style={{
              padding: "7px 14px",
              borderRadius: "12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              background: hasActiveSong ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.08)",
              color: hasActiveSong ? "#10b981" : "rgba(255, 255, 255, 0.85)",
              border: hasActiveSong ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            {hasActiveSong ? "▶ Tocando Música" : "⏸ Fila Vazia"} (Alternar Estado)
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: "7px 12px",
              borderRadius: "12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
            title="Ver em Tela Cheia (16:9 de TV)"
          >
            ⛶ Tela Cheia
          </button>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          CONCEPT RENDER AREA (Simulates TV 16:9 Display)
      ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selectedConcept === "electric" && (
          <ConceptElectricPolished
            hasActiveSong={hasActiveSong}
            rankingTab={rankingTab}
            setRankingTab={setRankingTab}
            currentTime={currentTime}
          />
        )}

        {selectedConcept === "electric_banner" && (
          <ConceptElectricBanner
            hasActiveSong={hasActiveSong}
            rankingTab={rankingTab}
            setRankingTab={setRankingTab}
            currentTime={currentTime}
          />
        )}

        {selectedConcept === "cyber" && (
          <ConceptCyber
            hasActiveSong={hasActiveSong}
            rankingTab={rankingTab}
            setRankingTab={setRankingTab}
            currentTime={currentTime}
          />
        )}

        {selectedConcept === "arcade" && (
          <ConceptArcade
            hasActiveSong={hasActiveSong}
            rankingTab={rankingTab}
            setRankingTab={setRankingTab}
            currentTime={currentTime}
          />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PROPOSTA 1 (POLIDA): "ELECTRIC STAGE" COM ALINHAMENTO CENTRAL PERFEITO
// ═════════════════════════════════════════════════════════════════════
function ConceptElectricPolished({
  hasActiveSong,
  rankingTab,
  setRankingTab,
  currentTime,
}: {
  hasActiveSong: boolean;
  rankingTab: "solo" | "duet";
  setRankingTab: (t: "solo" | "duet") => void;
  currentTime: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "24px 36px 18px 36px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "radial-gradient(circle at 50% 0%, rgba(255, 0, 128, 0.2) 0%, transparent 65%), radial-gradient(circle at 85% 90%, rgba(250, 204, 21, 0.06) 0%, transparent 45%), #070709",
        minHeight: "calc(100vh - 65px)",
        boxSizing: "border-box",
      }}
    >
      {/* ── 1. HEADER COM GRID 3 COLUNAS MATEMATICAMENTE CENTRALIZADO (1fr auto 1fr) ── */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "12px 28px",
          background: "rgba(14, 14, 18, 0.82)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRadius: "28px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          marginBottom: "24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Coluna Esquerda: Sair + Status de Transmissão */}
        <div style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.75)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "#FF0080" }}>⏻</span> Sair da TV
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            Telão Ativo
          </div>
        </div>

        {/* Coluna Central: LOGO MAJESTOSO NO CENTRO EXATO + CÓDIGO DA SALA EMBAIXO */}
        <div style={{ justifySelf: "center", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Logo width={220} style={{ marginBottom: "6px", marginTop: 0 }} />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "linear-gradient(135deg, rgba(255, 0, 128, 0.2), rgba(255, 0, 128, 0.05))",
              border: "1px solid rgba(255, 0, 128, 0.45)",
              borderRadius: "999px",
              padding: "5px 20px",
              boxShadow: "0 0 20px rgba(255, 0, 128, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            }}
          >
            <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "2px", color: "#FF0080", textTransform: "uppercase" }}>
              CÓDIGO DA SALA
            </span>
            <span style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "3px", color: "#FFFFFF", fontFamily: "monospace" }}>
              {MOCK_ROOM}
            </span>
          </div>
        </div>

        {/* Coluna Direita: Cantores Online + Relógio Digital */}
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "8px 16px",
              borderRadius: "20px",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>6 Cantores na Sala</span>
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "1.15rem",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "1px",
            }}
          >
            {currentTime}
          </div>
        </div>
      </header>

      {/* ── 2. MAIN STAGE SPLIT RIGOROSAMENTE ALINHADO (1.45fr Palco / 1fr Lateral) ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: "24px", minHeight: "520px" }}>
        {/* LADO ESQUERDO: PALCO PRINCIPAL (ARENA) */}
        <div
          style={{
            background: "rgba(14, 14, 18, 0.8)",
            backdropFilter: "blur(24px)",
            borderRadius: "28px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {hasActiveSong ? (
            /* ACTIVE PLAYING VIEW */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {/* Header do Palco */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ background: "#FF0080", color: "#fff", fontSize: "0.75rem", fontWeight: 900, padding: "5px 12px", borderRadius: "10px", letterSpacing: "1.5px" }}>
                    ● NO PALCO AGORA
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>🎤 Thiago & Mariana</span>
                </div>
                <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>2:45 / 4:18</div>
              </div>

              {/* Moldura Cinematográfica 16:9 */}
              <div
                style={{
                  flex: 1,
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #0e0d16, #161522)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  boxShadow: "0 0 50px rgba(255, 0, 128, 0.25)",
                  overflow: "hidden",
                  minHeight: "300px",
                }}
              >
                <div style={{ fontSize: "3.2rem", marginBottom: "8px", filter: "drop-shadow(0 0 15px rgba(255,0,128,0.5))" }}>🎬</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#fff", textAlign: "center", padding: "0 20px" }}>
                  Chitãozinho & Xororó - Evidências
                </div>
                <div style={{ fontSize: "0.95rem", color: "#facc15", marginTop: "6px", fontWeight: 700 }}>
                  Letra de Karaokê Sincronizada
                </div>
                {/* Linha de progresso da música */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", background: "rgba(255,255,255,0.1)" }}>
                  <div style={{ width: "65%", height: "100%", background: "linear-gradient(90deg, #FF0080, #facc15)" }} />
                </div>
              </div>

              {/* Barra Inferior da Próxima Música */}
              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "rgba(255,255,255,0.04)",
                  padding: "12px 18px",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#facc15", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                  A Seguir:
                </span>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                  Legião Urbana - Pais e Filhos
                </span>
                <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", marginLeft: "auto" }}>
                  Cantor: Felipe Costa
                </span>
              </div>
            </div>
          ) : (
            /* EMPTY QUEUE: ALINHAMENTO CENTRAL PERFEITO COM CALL TO ACTION */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "30px 20px" }}>
              {/* Concentric Microphone Halo */}
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255, 0, 128, 0.25) 0%, transparent 70%)",
                  border: "1.5px solid rgba(255, 0, 128, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  marginBottom: "20px",
                  boxShadow: "0 0 35px rgba(255, 0, 128, 0.3)",
                }}
              >
                🎤
              </div>

              {/* Soundwave Equalizer Animado */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "48px", marginBottom: "20px" }}>
                {[30, 60, 85, 45, 95, 65, 80, 50, 70, 40, 85, 30].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      width: "5px",
                      height: `${h}%`,
                      borderRadius: "6px",
                      background: i % 2 === 0 ? "linear-gradient(180deg, #FF0080, #facc15)" : "linear-gradient(180deg, #10b981, #06b6d4)",
                    }}
                  />
                ))}
              </div>

              <h2 style={{ fontSize: "2.3rem", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 10px 0", color: "#FFFFFF" }}>
                O Palco Está Livre!
              </h2>
              <p style={{ fontSize: "1.1rem", color: "rgba(255, 255, 255, 0.7)", maxWidth: "440px", lineHeight: 1.5, margin: "0 0 28px 0" }}>
                Aproxime seu celular no QR Code ao lado para escolher sua música e ser a próxima estrela.
              </p>

              {/* Steps Horizontais com Alinhamento Concêntrico */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  background: "rgba(255,255,255,0.05)",
                  padding: "12px 28px",
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#FF0080", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.75rem" }}>1</span>
                  Aponte a Câmera
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#FF0080", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.75rem" }}>2</span>
                  Escolha a Música
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#FF0080", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.75rem" }}>3</span>
                  Cante no Palco!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: HALL DA FAMA + QR PASS DOCK */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
          {/* CARD 1: HALL DA FAMA */}
          <div
            style={{
              flex: 1,
              background: "rgba(14, 14, 18, 0.8)",
              backdropFilter: "blur(24px)",
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            {/* Header com Alinhamento Perfeito */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.35rem" }}>🏆</span>
                <span style={{ fontSize: "1.15rem", fontWeight: 900, letterSpacing: "1px", color: "#FFFFFF" }}>
                  HALL DA FAMA
                </span>
              </div>

              {/* Segmented Buttons */}
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.06)", padding: "3px", borderRadius: "16px" }}>
                <button
                  type="button"
                  onClick={() => setRankingTab("solo")}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "12px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: rankingTab === "solo" ? "#FF0080" : "transparent",
                    color: "#fff",
                    border: "none",
                    boxShadow: rankingTab === "solo" ? "0 2px 10px rgba(255,0,128,0.4)" : "none",
                  }}
                >
                  Solo
                </button>
                <button
                  type="button"
                  onClick={() => setRankingTab("duet")}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "12px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: rankingTab === "duet" ? "#FF0080" : "transparent",
                    color: "#fff",
                    border: "none",
                    boxShadow: rankingTab === "duet" ? "0 2px 10px rgba(255,0,128,0.4)" : "none",
                  }}
                >
                  Duplas
                </button>
              </div>
            </div>

            {/* Lista com Alinhamento em 3 Colunas Fixas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1 }}>
              {(rankingTab === "solo" ? MOCK_SOLO_RANKING : MOCK_DUET_RANKING).map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "16px",
                    background: idx === 0 ? "linear-gradient(135deg, rgba(250, 204, 21, 0.16), rgba(250, 204, 21, 0.04))" : "rgba(255, 255, 255, 0.03)",
                    border: idx === 0 ? "1px solid rgba(250, 204, 21, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <span style={{ fontSize: idx < 3 ? "1.25rem" : "0.9rem", fontWeight: 900, width: "32px", textAlign: "center", color: idx === 0 ? "#facc15" : "rgba(255,255,255,0.7)" }}>
                    {entry.badge}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {"names" in entry ? entry.names.join(" & ") : entry.name}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "rgba(255, 255, 255, 0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.song}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "60px" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: 900, color: idx === 0 ? "#facc15" : "#FF0080", letterSpacing: "-0.02em" }}>
                      {entry.score}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block" }}>pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 2: INTEGRATED QR PASS DOCK COM ENCAIXE EXATO */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))",
              backdropFilter: "blur(20px)",
              borderRadius: "24px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ background: "#fff", padding: "6px", borderRadius: "16px", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
              <img src={MOCK_QR} alt="QR Code" style={{ width: "90px", height: "90px", display: "block", borderRadius: "10px" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#FF0080", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                ENTRE PELO CELULAR
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", marginTop: "3px" }}>
                Aponte a câmera para cantar
              </div>
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>
                Acesse <strong>karaokefactory.org</strong> com a sala <strong style={{ color: "#FF0080" }}>{MOCK_ROOM}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FOOTER ── */}
      <footer style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.4)", padding: "0 10px" }}>
        <span>KARAOKE FACTORY • LIVE STAGE EXPERIENCE</span>
        <span>SISTEMA DE PONTUAÇÃO AO VIVO • ALTA PRECISÃO</span>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PROPOSTA 1B: "ELECTRIC STAGE" VARIANTE HEADER PANORÂMICO
// ═════════════════════════════════════════════════════════════════════
function ConceptElectricBanner({
  hasActiveSong,
  rankingTab,
  setRankingTab,
  currentTime,
}: {
  hasActiveSong: boolean;
  rankingTab: "solo" | "duet";
  setRankingTab: (t: "solo" | "duet") => void;
  currentTime: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "24px 36px 18px 36px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "radial-gradient(circle at 50% 0%, rgba(255, 0, 128, 0.16) 0%, transparent 60%), #070709",
        minHeight: "calc(100vh - 65px)",
      }}
    >
      {/* ── HEADER PANORÂMICO SLIM ── */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "16px 28px",
          background: "rgba(14, 14, 18, 0.82)",
          backdropFilter: "blur(28px)",
          borderRadius: "28px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.7)",
          marginBottom: "24px",
        }}
      >
        {/* Esquerda: Código da Sala em Destaque */}
        <div style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 0, 128, 0.15)",
              border: "1px solid rgba(255, 0, 128, 0.4)",
              borderRadius: "16px",
              padding: "6px 16px",
            }}
          >
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#FF0080", letterSpacing: "1px" }}>SALA</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: "2px" }}>{MOCK_ROOM}</span>
          </div>
          <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 700 }}>● Conectado</span>
        </div>

        {/* Centro: LOGO Majestoso perfeitamente no centro sem nada ao lado */}
        <div style={{ justifySelf: "center", display: "flex", justifyContent: "center" }}>
          <Logo width={240} style={{ margin: 0 }} />
        </div>

        {/* Direita: Cantores + Hora */}
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ padding: "6px 14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)", fontSize: "0.82rem", fontWeight: 700 }}>
            👥 6 Cantores
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "1px" }}>
            {currentTime}
          </div>
        </div>
      </header>

      {/* Mesma arena polida */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: "24px", minHeight: "520px" }}>
        <div
          style={{
            background: "rgba(14, 14, 18, 0.8)",
            backdropFilter: "blur(24px)",
            borderRadius: "28px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {hasActiveSong ? (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🎬</div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>Evidências - Chitãozinho & Xororó</h3>
              <p style={{ color: "#facc15", fontWeight: 700 }}>Thiago & Mariana no Microfone</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🎤</div>
              <h2 style={{ fontSize: "2.3rem", fontWeight: 900, color: "#fff", margin: "0 0 10px 0" }}>O Palco Está Livre!</h2>
              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.7)", maxWidth: "440px", margin: "0 auto 24px auto" }}>
                Escaneie o QR Code ao lado para escolher sua música e cantar.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ flex: 1, background: "rgba(14, 14, 18, 0.8)", backdropFilter: "blur(24px)", borderRadius: "28px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 900 }}>🏆 HALL DA FAMA</span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button type="button" onClick={() => setRankingTab("solo")} style={{ padding: "4px 12px", borderRadius: "10px", background: rankingTab === "solo" ? "#FF0080" : "transparent", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Solo</button>
                <button type="button" onClick={() => setRankingTab("duet")} style={{ padding: "4px 12px", borderRadius: "10px", background: rankingTab === "duet" ? "#FF0080" : "transparent", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Duplas</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(rankingTab === "solo" ? MOCK_SOLO_RANKING.slice(0, 4) : MOCK_DUET_RANKING).map((entry, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: "12px", background: "rgba(255,255,255,0.03)" }}>
                  <span>{entry.badge} {"names" in entry ? entry.names.join(" & ") : entry.name}</span>
                  <span style={{ fontWeight: 900, color: "#facc15" }}>{entry.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "18px" }}>
            <img src={MOCK_QR} alt="QR" style={{ width: "85px", height: "85px", background: "#fff", padding: "4px", borderRadius: "12px" }} />
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#FF0080" }}>ENTRE PELO CELULAR</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>Aponte a câmera para cantar</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Sala: <strong>{MOCK_ROOM}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
        <span>KARAOKE FACTORY</span>
        <span>SHOW AO VIVO</span>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PROPOSTA 2: "CYBER LOUNGE VIP" (Estética Tóquio / Vidro Minimalista)
// ═════════════════════════════════════════════════════════════════════
function ConceptCyber({
  hasActiveSong,
  rankingTab,
  setRankingTab,
  currentTime,
}: {
  hasActiveSong: boolean;
  rankingTab: "solo" | "duet";
  setRankingTab: (t: "solo" | "duet") => void;
  currentTime: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "28px 36px 20px 36px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "radial-gradient(circle at 80% 90%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.04) 0%, transparent 40%), #050508",
        minHeight: "calc(100vh - 65px)",
      }}
    >
      {/* ── HEADER MINIMALISTA ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Logo width={160} style={{ marginBottom: 0 }} />
          <div style={{ height: "24px", width: "1px", background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: "0.85rem", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
            TOKYO PRIVATE LOUNGE
          </span>
        </div>

        {/* Floating Room Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "30px", padding: "6px 18px" }}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>SALA</span>
          <span style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "2px", color: "#fff" }}>{MOCK_ROOM}</span>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 700 }}>Ao Vivo</span>
        </div>

        <div style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "2px", color: "#fff" }}>
          {currentTime}
        </div>
      </header>

      {/* ── ASYMMETRIC GRID (65% Main Canvas / 35% VIP Pass & Leaderboard) ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "28px" }}>
        {/* LEFT CARD: CINEMATIC ARENA */}
        <div
          style={{
            background: "rgba(18, 18, 24, 0.6)",
            backdropFilter: "blur(30px)",
            borderRadius: "32px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 30px 60px rgba(0, 0, 0, 0.6)",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {hasActiveSong ? (
            /* ACTIVE PLAYING */
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", color: "#10b981", fontWeight: 800 }}>
                    ● TOCANDO AGORA
                  </span>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "4px 0 0 0", color: "#fff" }}>
                    Chitãozinho & Xororó - Evidências
                  </h3>
                </div>
                <div style={{ padding: "6px 14px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", fontSize: "0.85rem", fontWeight: 700 }}>
                  🎤 Thiago & Mariana
                </div>
              </div>

              {/* Video container */}
              <div
                style={{
                  flex: 1,
                  minHeight: "260px",
                  borderRadius: "22px",
                  background: "#0a0a0f",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📺</div>
                  <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)" }}>Reproduzindo Vídeo Oficial do Karaokê</div>
                </div>
              </div>

              {/* Queue Tray */}
              <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {MOCK_QUEUE.map((item, idx) => (
                  <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>{item.time}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{item.singer}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* EMPTY QUEUE: VIP LOUNGE CALL TO ACTION */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px" }}>
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255, 0, 128, 0.25) 0%, transparent 70%)",
                  border: "1px solid rgba(255, 0, 128, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.4rem",
                  marginBottom: "24px",
                  boxShadow: "0 0 30px rgba(255,0,128,0.25)",
                }}
              >
                🎙️
              </div>
              <h2 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0 0 12px 0", color: "#fff", letterSpacing: "-0.01em" }}>
                Sua Vez no Palco VIP
              </h2>
              <p style={{ fontSize: "1.05rem", color: "rgba(255, 255, 255, 0.65)", maxWidth: "460px", lineHeight: 1.6, margin: "0 0 28px 0" }}>
                A lista está livre. Conecte seu dispositivo agora e garanta a primeira canção da rodada.
              </p>
              <div style={{ fontSize: "0.85rem", letterSpacing: "1px", color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>
                ✦ Toque para cantar • Mais de 50.000 faixas disponíveis
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: VIP PASS + RANKING */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* VIP PASS CARD */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))",
              backdropFilter: "blur(24px)",
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "22px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ background: "#ffffff", padding: "8px", borderRadius: "18px", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
              <img src={MOCK_QR} alt="QR" style={{ width: "95px", height: "95px", display: "block", borderRadius: "10px" }} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "2px", color: "#10b981", textTransform: "uppercase" }}>
                CONEXÃO VIP
              </span>
              <h4 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "4px 0 6px 0", color: "#fff" }}>
                Escaneie com a Câmera
              </h4>
              <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
                Sem app. Abre direto no navegador do seu smartphone.
              </p>
            </div>
          </div>

          {/* RANKING PANEL */}
          <div
            style={{
              flex: 1,
              background: "rgba(18, 18, 24, 0.6)",
              backdropFilter: "blur(30px)",
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "#fff" }}>
                Classificação
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setRankingTab("solo")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    background: rankingTab === "solo" ? "#fff" : "transparent",
                    color: rankingTab === "solo" ? "#000" : "rgba(255,255,255,0.7)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Solo
                </button>
                <button
                  type="button"
                  onClick={() => setRankingTab("duet")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    background: rankingTab === "duet" ? "#fff" : "transparent",
                    color: rankingTab === "duet" ? "#000" : "rgba(255,255,255,0.7)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Duplas
                </button>
              </div>
            </div>

            {/* List with clean score bar indicator */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(rankingTab === "solo" ? MOCK_SOLO_RANKING.slice(0, 4) : MOCK_DUET_RANKING).map((item, idx) => (
                <div key={idx} style={{ padding: "8px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
                      {idx + 1}. {"names" in item ? item.names.join(" & ") : item.name}
                    </span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: idx === 0 ? "#facc15" : "#fff" }}>
                      {item.score} pts
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: "4px", width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }}>
                    <div style={{ height: "100%", width: `${item.score}%`, background: idx === 0 ? "#facc15" : "#10b981", borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: "16px", textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
        KARAOKE FACTORY VIP SUITE • CONTROLE INTEGRADO
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PROPOSTA 3: "ARCADE NEO-RETRO" (Gamificado / High-Score & Beat)
// ═════════════════════════════════════════════════════════════════════
function ConceptArcade({
  hasActiveSong,
  rankingTab,
  setRankingTab,
  currentTime,
}: {
  hasActiveSong: boolean;
  rankingTab: "solo" | "duet";
  setRankingTab: (t: "solo" | "duet") => void;
  currentTime: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "24px 32px 16px 32px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "radial-gradient(circle at 50% 50%, #0d0c1d 0%, #05040a 100%)",
        minHeight: "calc(100vh - 65px)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── ARCADE HUD TOP MARQUEE ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "2px solid #FF0080",
          boxShadow: "0 0 20px rgba(255, 0, 128, 0.4), inset 0 0 15px rgba(255, 0, 128, 0.2)",
          padding: "12px 24px",
          borderRadius: "16px",
          background: "rgba(10, 10, 15, 0.9)",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "1.6rem" }}>🕹️</span>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#facc15", letterSpacing: "2px" }}>
              INSERT COIN / SCAN TO PLAY
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", letterSpacing: "1px" }}>
              STAGE ARENA: <span style={{ color: "#FF0080" }}>{MOCK_ROOM}</span>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>VIBE DA SALA</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#10b981" }}>98% 🔥</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>PLAYERS</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#facc15" }}>8 ATIVOS</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>HORA</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff" }}>{currentTime}</div>
          </div>
        </div>
      </header>

      {/* ── ARCADE BATTLE GRID ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
        {/* LEFT ARENA */}
        <div
          style={{
            border: "1px solid rgba(255, 0, 128, 0.3)",
            boxShadow: "0 0 25px rgba(255, 0, 128, 0.15)",
            borderRadius: "20px",
            background: "rgba(15, 12, 24, 0.8)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {hasActiveSong ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ background: "#FF0080", color: "#fff", fontWeight: 900, fontSize: "0.8rem", padding: "4px 12px", borderRadius: "8px" }}>
                  PLAYER 1 ON STAGE
                </span>
                <span style={{ color: "#facc15", fontWeight: 800 }}>COMBO x3 ACTIVE</span>
              </div>
              <div style={{ flex: 1, minHeight: "260px", background: "#000", borderRadius: "14px", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.8rem" }}>⚡</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff" }}>Evidências - Chitãozinho & Xororó</div>
                  <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "4px" }}>Score Multiplier x1.5</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>👾</div>
              <h2 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#facc15", letterSpacing: "1px", margin: "0 0 10px 0" }}>
                READY PLAYER ONE?
              </h2>
              <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)", maxWidth: "420px", margin: "0 0 24px 0" }}>
                Escaneie o código e escolha a sua música para abrir o ranking da noite!
              </p>
              <div style={{ padding: "8px 18px", borderRadius: "10px", background: "rgba(255,0,128,0.2)", border: "1px solid #FF0080", color: "#FF0080", fontWeight: 800 }}>
                PRESS START: SCAN QR CODE
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: ARCADE HIGH-SCORE BOARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* HIGH SCORE TABLE */}
          <div
            style={{
              flex: 1,
              border: "1px solid rgba(250, 204, 21, 0.4)",
              boxShadow: "0 0 25px rgba(250, 204, 21, 0.15)",
              borderRadius: "20px",
              background: "rgba(18, 16, 10, 0.85)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>🏆</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#facc15", letterSpacing: "1px" }}>
                  TOP HIGH SCORES
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setRankingTab("solo")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    background: rankingTab === "solo" ? "#facc15" : "transparent",
                    color: rankingTab === "solo" ? "#000" : "#facc15",
                    border: "1px solid #facc15",
                    cursor: "pointer",
                  }}
                >
                  SOLO
                </button>
                <button
                  type="button"
                  onClick={() => setRankingTab("duet")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    background: rankingTab === "duet" ? "#facc15" : "transparent",
                    color: rankingTab === "duet" ? "#000" : "#facc15",
                    border: "1px solid #facc15",
                    cursor: "pointer",
                  }}
                >
                  DUO
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(rankingTab === "solo" ? MOCK_SOLO_RANKING : MOCK_DUET_RANKING).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: idx === 0 ? "rgba(250, 204, 21, 0.15)" : "rgba(255,255,255,0.03)",
                    border: idx === 0 ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 900, color: idx === 0 ? "#facc15" : "#FF0080", fontSize: "0.95rem" }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>
                      {"names" in item ? item.names.join(" & ") : item.name}
                    </span>
                  </div>
                  <span style={{ fontSize: "1.1rem", fontWeight: 900, color: idx === 0 ? "#facc15" : "#10b981" }}>
                    {item.score} PTS
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ARCADE SCAN POD */}
          <div
            style={{
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "20px",
              padding: "16px 20px",
              background: "rgba(10, 20, 16, 0.8)",
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >
            <div style={{ background: "#fff", padding: "6px", borderRadius: "12px" }}>
              <img src={MOCK_QR} alt="QR" style={{ width: "75px", height: "75px", display: "block" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#10b981", letterSpacing: "1.5px" }}>
                SCAN TO JOIN MATCH
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                Conecte seu controle/celular
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
        <span>KARAOKE ARCADE EDITION</span>
        <span>CREDIT 00 • FREE PLAY</span>
      </footer>
    </div>
  );
}
