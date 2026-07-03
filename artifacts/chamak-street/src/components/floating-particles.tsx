import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: -999, y: -999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);

    function spawn(): Particle {
      const side = Math.random();
      let x: number, y: number;
      if (side < 0.5) {
        x = Math.random() * canvas!.width;
        y = canvas!.height + 10;
      } else {
        x = Math.random() < 0.5 ? -10 : canvas!.width + 10;
        y = Math.random() * canvas!.height;
      }
      const maxLife = 180 + Math.random() * 220;
      return {
        x, y,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(0.4 + Math.random() * 1.1),
        size: 1.2 + Math.random() * 2.8,
        opacity: 0,
        life: 0,
        maxLife,
        hue: 18 + Math.random() * 30, // orange to yellow
      };
    }

    for (let i = 0; i < 38; i++) {
      const p = spawn();
      p.life = Math.random() * p.maxLife;
      p.y = Math.random() * (canvas?.height ?? 800);
      particles.current.push(p);
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* spawn new particles occasionally */
      if (particles.current.length < 55 && Math.random() < 0.35) {
        particles.current.push(spawn());
      }

      particles.current = particles.current.filter((p) => {
        p.life++;
        if (p.life > p.maxLife) return false;

        const t = p.life / p.maxLife;
        /* fade in first 15%, full through 75%, fade out */
        if (t < 0.15) p.opacity = t / 0.15;
        else if (t < 0.75) p.opacity = 1;
        else p.opacity = 1 - (t - 0.75) / 0.25;

        /* drift toward mouse very subtly */
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 1) {
          p.vx += (dx / dist) * 0.018;
          p.vy += (dy / dist) * 0.018;
        }

        /* damping */
        p.vx *= 0.985;
        p.vy *= 0.985;

        p.x += p.vx;
        p.y += p.vy;

        /* draw glowing dot */
        const alpha = p.opacity * 0.72;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 62%, ${alpha})`);
        gradient.addColorStop(0.4, `hsla(${p.hue}, 100%, 55%, ${alpha * 0.55})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 45%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        /* bright core */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue + 20}, 100%, 80%, ${p.opacity * 0.9})`;
        ctx.fill();

        return true;
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
