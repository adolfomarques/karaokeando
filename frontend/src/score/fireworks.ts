// Port of `pikaraoke/static/fireworks.js`, adapted to a canvas element.

type EffectType = 'fireworks' | 'confetti' | 'stars' | 'fountain' | 'rings';

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
};

export function launchCelebration(canvas: HTMLCanvasElement, score: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Particle[] = [];
  const effectPool: EffectType[] = ['fireworks', 'confetti', 'stars', 'fountain', 'rings'];
  const selectedEffect = effectPool[Math.floor(Math.random() * effectPool.length)];

  const addParticle = (x: number, y: number, type: EffectType) => {
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;

    if (type === 'fireworks' || type === 'stars') {
      for (let i = 0; i < 50; i++) {
        const pAngle = Math.random() * 2 * Math.PI;
        const pSpeed = Math.random() * 5 + 1;
        particles.push({
          x, y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: Math.random() * 4 + 2,
          color,
          type,
          life: 1.0,
          gravity: 0.05
        });
      }
    } else if (type === 'confetti') {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        radius: Math.random() * 5 + 3,
        color,
        type,
        life: 1.0,
        gravity: 0.02
      });
    } else if (type === 'fountain') {
      particles.push({
        x: x || (Math.random() > 0.5 ? 0 : canvas.width),
        y: canvas.height,
        vx: (x === 0 ? 1 : -1) * (Math.random() * 10 + 5),
        vy: - (Math.random() * 10 + 15),
        radius: Math.random() * 5 + 2,
        color,
        type,
        life: 1.0,
        gravity: 0.4
      });
    } else if (type === 'rings') {
      particles.push({
        x, y,
        vx: 0, vy: 0,
        radius: 5,
        color,
        type,
        life: 1.0,
        gravity: 0
      });
    }
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.type === 'rings') {
        p.radius += 8;
        p.life -= 0.02;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * p.life;
        ctx.stroke();
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        if (p.type === 'stars') {
           // Draw a simple star
           p.radius *= 0.96;
           ctx.fillStyle = p.color;
           ctx.beginPath();
           for(let j=0; j<5; j++) {
             ctx.lineTo(p.x + p.radius * Math.cos(j * 1.5 * Math.PI), p.y + p.radius * Math.sin(j * 1.5 * Math.PI));
           }
           ctx.fill();
        } else {
           p.radius *= p.type === 'confetti' ? 0.99 : 0.96;
           ctx.beginPath();
           ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
           ctx.fillStyle = p.color;
           ctx.fill();
        }
      }

      if (p.radius < 0.5 || p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    }
  };

  const showDuration = 5000;
  const startTime = Date.now();
  let intensity = score < 60 ? 500 : 200;

  const launch = () => {
    if (Date.now() - startTime > showDuration) return;

    if (selectedEffect === 'fireworks' || selectedEffect === 'stars' || selectedEffect === 'rings') {
      addParticle(Math.random() * canvas.width, Math.random() * canvas.height * 0.7, selectedEffect);
    } else if (selectedEffect === 'fountain') {
      addParticle(0, canvas.height, 'fountain');
      addParticle(canvas.width, canvas.height, 'fountain');
    } else {
      for(let i=0; i<5; i++) addParticle(0, 0, 'confetti');
    }

    setTimeout(launch, intensity + Math.random() * 300);
  };

  launch();
  animate();
}

// Backward compatibility (optional, but good for safety)
export function launchFireworkShow(canvas: HTMLCanvasElement, score: number) {
  launchCelebration(canvas, score);
}
