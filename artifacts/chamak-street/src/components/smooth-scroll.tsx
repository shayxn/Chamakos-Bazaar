import { useEffect, useRef } from "react";

// Native scrolling preserves touch momentum, browser gestures, and focus scrolling.
export function useSmoothScroll() {}

export function ScrollProgressBar() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return <div ref={bar} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[9999] h-0.5 w-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />;
}
