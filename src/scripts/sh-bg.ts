// Full-screen Canvas ash & fog particle system for Silent Hill: Otherworld mode (z-0).
interface AshParticle {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  alpha: number;
}

export function initShBackground() {
  const canvas = document.getElementById('sh-ash-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let rafId: number | null = null;
  let active = false;
  let width = 0;
  let height = 0;
  const particles: AshParticle[] = [];
  const COUNT = 48;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const seedParticles = () => {
    particles.length = 0;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.9 + Math.random() * 2.1,
        vy: 0.32 + Math.random() * 0.78,
        vx: (Math.random() - 0.5) * 0.2,
        swayAmp: 0.25 + Math.random() * 0.55,
        swayFreq: 0.0008 + Math.random() * 0.0016,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.16 + Math.random() * 0.34,
      });
    }
  };

  const stop = () => {
    active = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, width, height);
  };

  const frame = (now: number) => {
    if (!active) return;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(now * p.swayFreq + p.phase) * p.swayAmp;

      if (p.y > height + 8) {
        p.y = -8;
        p.x = Math.random() * width;
      }
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;

      ctx.fillStyle = `rgba(228, 228, 231, ${p.alpha.toFixed(2)})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.r), Math.ceil(p.r));
    }

    rafId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (active) return;
    active = true;
    resize();
    if (particles.length === 0) seedParticles();
    rafId = requestAnimationFrame(frame);
  };

  window.addEventListener('resize', () => {
    if (active) resize();
  });

  window.addEventListener('otherworld-mode', (event: Event) => {
    const enabled = Boolean((event as CustomEvent<{ enabled: boolean }>).detail?.enabled);
    if (enabled) start();
    else stop();
  });
}
