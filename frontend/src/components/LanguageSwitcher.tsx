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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "pt", label: "PT", flag: "🇧🇷" },
  ];

  const active = languages.find(l => l.code === currentLang)!;

  return (
    <div ref={dropdownRef} style={{ position: "relative", zIndex: 1100 }}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(255,255,255,0.06)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.10)",
          padding: "5px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.82rem",
          fontWeight: 600,
          transition: "all 0.2s",
          backdropFilter: "blur(8px)",
          boxShadow: "none",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.10)";
          e.currentTarget.style.borderColor = "rgba(255,0,128,0.35)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
        }}
      >
        <span style={{ fontSize: "1rem" }}>{active.flag}</span>
        <span>{active.label}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "rgba(18,18,22,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "12px",
          overflow: "hidden",
          width: "120px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          animation: "fadeInDown 0.15s ease-out",
        }}>
          {languages.map((lng, index) => {
            const isActive = currentLang === lng.code;
            return (
              <button
                key={lng.code}
                onClick={() => changeLanguage(lng.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 14px",
                  background: isActive ? "rgba(255,0,128,0.12)" : "transparent",
                  border: "none",
                  borderBottom: index === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#FF0080" : "rgba(255,255,255,0.75)",
                  borderRadius: "0",
                  boxShadow: "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "1rem" }}>{lng.flag}</span>
                {lng.label}
                {isActive && (
                  <svg
                    width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="#FF0080" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ marginLeft: "auto" }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
