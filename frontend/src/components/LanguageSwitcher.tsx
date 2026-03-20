import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language.startsWith("pt") ? "pt" : "en";

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "pt", label: "PT-BR", flag: "🇧🇷" },
  ];

  const activeColor = "#c6ff00"; // Usando o Acid Green do design Clubbing Brutalista

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#111",
          color: "#fff",
          border: isOpen ? `2px solid #007bff` : "2px solid #333",
          padding: "6px 14px",
          borderRadius: "24px",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: 700,
          transition: "all 0.2s",
          outline: "none",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>
          {languages.find((l) => l.code === currentLang)?.flag}
        </span>
        <span style={{ color: "#eee" }}>
          {languages.find((l) => l.code === currentLang)?.label}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            marginLeft: "2px",
            color: "#888",
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            background: "#1c1c1c",
            border: "1px solid #333",
            borderRadius: "14px",
            overflow: "hidden",
            width: "140px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
            animation: "fadeInDown 0.15s ease-out",
          }}
        >
          {languages.map((lng, index) => {
            const isActive = currentLang === lng.code;
            return (
              <button
                key={lng.code}
                onClick={() => changeLanguage(lng.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "12px 16px",
                  background: isActive ? "rgba(198, 255, 0, 0.05)" : "transparent",
                  border: "none",
                  borderBottom:
                    index === 0 ? "1px solid #333" : "none",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: isActive ? 700 : 600,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#2a2a2a";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.2rem" }}>{lng.flag}</span>
                  <span style={{ color: isActive ? activeColor : "#ccc" }}>
                    {lng.label}
                  </span>
                </div>
                {isActive && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={activeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
