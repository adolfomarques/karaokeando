import { useTranslation } from "react-i18next";

export default function Logo({ width = 280, style = {} }: { width?: number | string; style?: React.CSSProperties }) {
  const { t } = useTranslation();
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginBottom: 12, 
      marginTop: 4,
      animation: 'fadeInLogo 1.2s ease-out forwards',
      ...style 
    }}>
      <style>{`
        @keyframes fadeInLogo {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <img
        src="/logo.png"
        alt={t("home.title", "KARAOKE FACTORY")}
        style={{ 
          width, 
          maxWidth: '100%', 
          height: 'auto', 
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 15px rgba(255, 60, 200, 0.4))',
          transition: 'transform 0.3s ease-in-out',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      />
    </div>
  );
}
