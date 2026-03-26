import { useTranslation } from "react-i18next";

export default function Logo({ width = 336, style = {} }: { width?: number | string; style?: React.CSSProperties }) {
  const { t } = useTranslation();
  return (
    <div 
      className="logo-wrapper"
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 12, 
        marginTop: 4,
        animation: 'fadeInLogo 1.2s ease-out forwards',
        ...style 
      }}
    >
      <style>{`
        @keyframes fadeInLogo {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 15px rgba(255, 0, 128, 0.4)); opacity: 0.95; }
          50% { filter: drop-shadow(0 0 25px rgba(255, 0, 128, 0.65)); opacity: 1; }
          100% { filter: drop-shadow(0 0 15px rgba(255, 0, 128, 0.4)); opacity: 0.95; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          20%, 100% { transform: translateX(200%) skewX(-20deg); }
        }

        .logo-inner-container {
          position: relative;
          display: inline-block;
          transition: transform 0.3s ease-in-out;
          cursor: pointer;
        }

        .shimmer-mask {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          -webkit-mask-image: url('/logo.png');
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-image: url('/logo.png');
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          z-index: 3;
        }

        .shimmer-mask::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent
          );
          transform: skewX(-20deg);
          animation: shimmer 6s infinite ease-in-out;
        }
      `}</style>
      <div 
        className="logo-inner-container" 
        style={{ width, maxWidth: '100%' }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <img
          src="/logo.png"
          alt={t("home.title", "KARAOKE FACTORY")}
          style={{ 
            width: '100%', 
            height: 'auto', 
            objectFit: 'contain',
            animation: 'pulseGlow 4s infinite ease-in-out',
            display: 'block',
            position: 'relative',
            zIndex: 2,
          }}
        />
        <div className="shimmer-mask"></div>
      </div>
    </div>
  );
}
