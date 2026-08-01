type EffectType = 'fireworks' | 'confetti' | 'stars' | 'fountain' | 'rings' | 'glitter';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: EffectType;
  life: number;
  gravity: number;
  rot?: number;
  rotSpeed?: number;
  phase?: number;
};

const BRAND_COLORS = [
  "#FF0080",
  "#FF3399",
  "#FF66B2",
  "#CC0066",
  "#B983FF",
  "#8B5CF6",
  "#A855F7",
  "#FFD700",
  "#FFA500",
  "#FFFFFF",
];

const brandColor = () => BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];

export function launchCelebration(canvas: HTMLCanvasElement, score: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.scale(dpr, dpr);

  const W = window.innerWidth;
  const H = window.innerHeight;

  const particles: Particle[] = [];

  const allEffects: EffectType[] = ['fireworks', 'confetti', 'stars', 'fountain', 'rings', 'glitter'];
  // higher score unlocks more variety
  const maxEffects = score < 40 ? 3 : score < 60 ? 4 : score < 80 ? 5 : 6;
  const activeEffects = allEffects.slice(0, maxEffects);

  const addParticle = (x: number, y: number, type: EffectType) => {
    const color = brandColor();

    if (type === 'fireworks' || type === 'stars') {
      const count = type === 'stars' ? 30 : 60;
      for (let i = 0; i < count; i++) {
        const pAngle = Math.random() * 2 * Math.PI;
        const pSpeed = Math.random() * 6 + 2;
        particles.push({
          x, y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: Math.random() * 3 + 1.5,
          color,
          type,
          life: 1.0,
          gravity: 0.04,
        });
      }
    } else if (type === 'confetti') {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: Math.random() * W,
          y: -10,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 3 + 2,
          radius: Math.random() * 4 + 2,
          color: brandColor(),
          type,
          life: 1.0,
          gravity: 0.03,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
        });
      }
    } else if (type === 'fountain') {
      const side = x === 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: x || (side === 1 ? 0 : W),
          y: H - 10,
          vx: side * (Math.random() * 12 + 8),
          vy: -(Math.random() * 12 + 16),
          radius: Math.random() * 3 + 2,
          color: brandColor(),
          type,
          life: 1.0,
          gravity: 0.35,
        });
      }
    } else if (type === 'rings') {
      for (let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * 60;
        particles.push({
          x: x + offsetX,
          y: y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.5 - 0.3,
          radius: 4,
          color: brandColor(),
          type,
          life: 1.0,
          gravity: 0.01,
        });
      }
    } else if (type === 'glitter') {
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: Math.random() * 0.5 + 0.2,
          radius: Math.random() * 2 + 1,
          color: ["#FFD700", "#FFA500", "#FFFFFF", "#FF66B2"][Math.floor(Math.random() * 4)],
          type,
          life: 1.0,
          gravity: 0,
          phase: Math.random() * Math.PI * 2,
          rot: 0,
          rotSpeed: 0,
        });
      }
    }
  };

  const animate = () => {
    ctx.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.type === 'rings') {
        p.radius += 6;
        p.life -= 0.015;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * Math.max(0, p.life);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.type === 'stars') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.radius *= 0.97;
        p.vx *= 0.98;
        p.vy *= 0.98;
        const outerR = p.radius;
        const innerR = outerR * 0.4;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let j = 0; j < 10; j++) {
          const angle = (j * Math.PI) / 5 - Math.PI / 2;
          const r = j % 2 === 0 ? outerR : innerR;
          const px = p.x + r * Math.cos(angle);
          const py = p.y + r * Math.sin(angle);
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'confetti') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rot = (p.rot || 0) + (p.rotSpeed || 0.1);
        p.radius *= 0.997;
        const w = p.radius * 2;
        const h = p.radius * 1.2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.type === 'glitter') {
        p.x += p.vx;
        p.y += p.vy;
        p.phase = (p.phase || 0) + 0.04;
        p.radius *= 0.998;
        const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * Math.max(0, p.life);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.radius > 1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.globalAlpha = alpha * 0.5 * Math.max(0, p.life);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.radius *= 0.96;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      if (p.radius < 0.5 || p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    }
  };

  const showDuration = score < 40 ? 3000 : score < 60 ? 4000 : score < 80 ? 5000 : score < 100 ? 6000 : 7000;
  const startTime = Date.now();
  const intensity = score < 40 ? 500 : score < 60 ? 400 : score < 80 ? 250 : score < 100 ? 150 : 100;

  const launch = () => {
    if (Date.now() - startTime > showDuration) return;

    const effect = activeEffects[Math.floor(Math.random() * activeEffects.length)];

    if (effect === 'fireworks') {
      addParticle(Math.random() * W, Math.random() * H * 0.6 + H * 0.1, 'fireworks');
      if (score >= 60) addParticle(Math.random() * W, Math.random() * H * 0.6 + H * 0.1, 'fireworks');
    } else if (effect === 'stars') {
      addParticle(Math.random() * W, Math.random() * H * 0.6 + H * 0.1, 'stars');
    } else if (effect === 'rings') {
      addParticle(Math.random() * W, Math.random() * H * 0.5 + H * 0.1, 'rings');
    } else if (effect === 'fountain') {
      addParticle(0, H, 'fountain');
      addParticle(W, H, 'fountain');
    } else if (effect === 'glitter') {
      addParticle(0, 0, 'glitter');
    } else {
      for (let i = 0; i < 5; i++) addParticle(0, 0, 'confetti');
    }

    setTimeout(launch, intensity + Math.random() * 200);
  };

  launch();
  animate();
}

export function launchFireworkShow(canvas: HTMLCanvasElement, score: number) {
  launchCelebration(canvas, score);
}
