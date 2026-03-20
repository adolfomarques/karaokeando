import React, { useEffect, useState, useRef } from 'react';

/**
 * Hook to apply subtle parallax movement based on mouse position
 */
export const useParallax = (intensity: number = 20) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const x = (clientX / innerWidth - 0.5) * intensity;
      const y = (clientY / innerHeight - 0.5) * intensity;
      
      setOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [intensity]);

  return { 
    ref, 
    style: { 
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      transition: 'transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)'
    } 
  };
};

/**
 * Global Background with animated blobs
 */
export const LiquidBackground: React.FC = () => {
  return (
    <div className="liquid-bg">
      <div className="liquid-blob blob-1" />
      <div className="liquid-blob blob-2" />
      <div className="liquid-blob" style={{
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(255,255,255,0.05), transparent)',
        top: '40%',
        left: '50%',
        animation: 'blob-float 20s infinite alternate-reverse ease-in-out'
      }} />
    </div>
  );
};

/**
 * Wrapper for glass containers.
 * @param intensity Parallax intensity (0 for none)
 */
export const GlassContainer: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode, className?: string, intensity?: number }> = ({ 
  children, 
  className = "", 
  intensity = 15,
  style,
  ...props
}) => {
  const parallax = useParallax(intensity);
  
  // Only apply parallax if intensity > 0
  const combinedStyle = intensity > 0 
    ? { ...style, ...parallax.style } 
    : style;

  return (
    <div 
      className={`card ${className}`} 
      style={combinedStyle}
      {...props}
    >
      {children}
    </div>
  );
};
