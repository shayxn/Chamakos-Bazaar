import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -300, y: -300 });
  const cur = useRef({ x: -300, y: -300 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      cur.current.x += (pos.current.x - cur.current.x) * 0.10;
      cur.current.y += (pos.current.y - cur.current.y) * 0.10;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${cur.current.x - 200}px, ${cur.current.y - 200}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 pointer-events-none z-[2] hidden md:block"
      style={{
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,102,0,0.07) 0%, rgba(255,102,0,0.03) 40%, transparent 70%)",
        willChange: "transform",
      }}
    />
  );
}
