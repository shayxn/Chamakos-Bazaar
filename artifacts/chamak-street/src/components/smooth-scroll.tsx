import { useEffect, useState } from "react";
import Lenis from "lenis";

/**
 * Initialises Lenis smooth scroll with an inertia feel.
 * Call once at app root — runs a RAF loop for the lifetime of the component.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new (Lenis as any)({
      lerp: 0.085,           // interpolation speed — lower = more dreamy
      smoothWheel: true,
      touchMultiplier: 2,    // amplify touch so mobile doesn't feel sluggish
      infinite: false,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}

/**
 * Thin orange progress bar pinned to the very top of the viewport.
 * Tracks scroll progress across the full page height.
 */
export function ScrollProgressBar() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setPct(total > 0 ? Math.min(1, window.scrollY / total) : 0);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; update(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 h-[2px] z-[9999] pointer-events-none origin-left"
      style={{
        width: `${pct * 100}%`,
        background: "linear-gradient(90deg, #ff6600 0%, #ffaa00 100%)",
        boxShadow: "0 0 10px rgba(255,102,0,0.8)",
        transition: pct === 0 ? "none" : "width 60ms linear",
      }}
    />
  );
}
