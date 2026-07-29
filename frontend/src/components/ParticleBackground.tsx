import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  speedY: number;
  swaySpeed: number;
  swayAmount: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
  // Dynamic Super-Sparkle properties
  isSparkling: boolean;
  sparkleProgress: number; // 0 to 1
  sparkleDuration: number; // Duration multiplier
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      "rgba(255, 0, 128, ",   // Neon Pink
      "rgba(0, 209, 255, ",   // Electric Cyan
      "rgba(16, 185, 129, ",   // Emerald Glow
      "rgba(255, 215, 0, ",   // Champagne Gold
    ];

    // Determine particle count based on screen size (max 45 for performance lightness)
    const particleCount = Math.min(Math.floor((width * height) / 22000), 45);

    const particles: Particle[] = Array.from({ length: particleCount }, () => {
      const baseAlpha = Math.random() * 0.35 + 0.15;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1.2,
        baseAlpha,
        alpha: baseAlpha,
        speedY: Math.random() * 0.4 + 0.15,
        swaySpeed: Math.random() * 0.015 + 0.005,
        swayAmount: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        isSparkling: false,
        sparkleProgress: 0,
        sparkleDuration: Math.random() * 0.02 + 0.015,
      };
    });

    let time = 0;

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      time += 1;

      // Randomly pick a particle to perform a super-sparkle flare
      if (Math.random() < 0.012) {
        const candidate = particles[Math.floor(Math.random() * particles.length)];
        if (!candidate.isSparkling) {
          candidate.isSparkling = true;
          candidate.sparkleProgress = 0;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Movement
        p.y -= p.speedY;
        p.x += Math.sin(time * p.swaySpeed + p.pulsePhase) * p.swayAmount;

        // Reset if off top screen
        if (p.y < -15) {
          p.y = height + 15;
          p.x = Math.random() * width;
          p.isSparkling = false;
          p.sparkleProgress = 0;
        }

        // Base shimmer / Glow pulse
        p.alpha = p.baseAlpha + Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.12;

        let flareMultiplier = 1.0;
        let extraAlpha = 0;

        // Calculate Super Sparkle burst curve
        if (p.isSparkling) {
          p.sparkleProgress += p.sparkleDuration;
          if (p.sparkleProgress >= 1) {
            p.isSparkling = false;
            p.sparkleProgress = 0;
          } else {
            // Smooth bell curve (0 -> 1 -> 0)
            const bell = Math.sin(p.sparkleProgress * Math.PI);
            flareMultiplier = 1.0 + bell * 2.8;
            extraAlpha = bell * 0.65;
          }
        }

        const currentAlpha = Math.min(0.95, Math.max(0.05, p.alpha + extraAlpha));
        const currentRadius = p.radius * flareMultiplier;

        // 1. Draw glowing background aura
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 3);
        gradient.addColorStop(0, `${p.color}${currentAlpha})`);
        gradient.addColorStop(0.4, `${p.color}${currentAlpha * 0.45})`);
        gradient.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw intense star lens flare burst when sparkling strongly
        if (p.isSparkling && flareMultiplier > 1.8) {
          const sparkIntensity = Math.sin(p.sparkleProgress * Math.PI);
          const rayLength = currentRadius * 3.5 * sparkIntensity;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.9, sparkIntensity * 0.85)})`;
          ctx.lineWidth = 1.2;

          // Cross rays (+)
          ctx.beginPath();
          ctx.moveTo(-rayLength, 0);
          ctx.lineTo(rayLength, 0);
          ctx.moveTo(0, -rayLength);
          ctx.lineTo(0, rayLength);
          ctx.stroke();

          // Diagonal subtle rays (x)
          ctx.strokeStyle = `${p.color}${sparkIntensity * 0.5})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          const diag = rayLength * 0.6;
          ctx.moveTo(-diag, -diag);
          ctx.lineTo(diag, diag);
          ctx.moveTo(diag, -diag);
          ctx.lineTo(-diag, diag);
          ctx.stroke();

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.9,
      }}
    />
  );
}
