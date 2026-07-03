import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export function ScrollFloatObject() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 18,
    restDelta: 0.001,
  });

  const y = useTransform(smoothProgress, [0, 0.4, 0.7, 1], [120, -40, -80, -160]);
  const rotate = useTransform(smoothProgress, [0, 0.5, 1], [0, 360, 540]);
  const scale = useTransform(smoothProgress, [0, 0.25, 0.55, 0.8, 1], [0.6, 1.15, 1, 0.85, 0.7]);
  const x = useTransform(smoothProgress, [0, 0.3, 0.6, 1], [60, 0, -30, -60]);
  const opacity = useTransform(smoothProgress, [0, 0.08, 0.85, 1], [0, 1, 1, 0]);

  const glowOpacity = useTransform(smoothProgress, [0.2, 0.5, 0.8], [0, 0.7, 0]);
  const glowScale = useTransform(smoothProgress, [0.2, 0.5, 0.8], [0.5, 1.4, 0.5]);

  const labelOpacity = useTransform(smoothProgress, [0.15, 0.45], [0, 1]);
  const labelY = useTransform(smoothProgress, [0.15, 0.5], [10, 0]);

  const shadowOpacity = useTransform(smoothProgress, [0.3, 0.5, 0.7], [0, 0.6, 0]);
  const shadowScaleX = useTransform(smoothProgress, [0.3, 0.5, 0.7], [0.4, 1, 0.4]);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-visible pointer-events-none"
      style={{ height: "420px" }}
      aria-hidden="true"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-visible">
        <div className="relative flex items-center justify-center w-full">

          {/* Glow behind sneaker */}
          <motion.div
            className="absolute w-48 h-48 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,102,0,0.55) 0%, rgba(255,102,0,0) 70%)",
              filter: "blur(28px)",
              y,
              x,
              opacity: glowOpacity,
              scale: glowScale,
            }}
          />

          {/* Sneaker */}
          <motion.div
            style={{ y, x, scale, opacity }}
            className="relative"
          >
            <motion.img
              src="/product-sneakers.png"
              alt=""
              style={{ rotate }}
              className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_20px_50px_rgba(255,102,0,0.5)]"
            />

            {/* Ground shadow */}
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-5 rounded-full"
              style={{
                background: "radial-gradient(ellipse, rgba(255,102,0,0.4) 0%, transparent 70%)",
                filter: "blur(6px)",
                opacity: shadowOpacity,
                scaleX: shadowScaleX,
              }}
            />
          </motion.div>

          {/* Side label (desktop only) */}
          <motion.div
            style={{ opacity: labelOpacity, y: labelY }}
            className="absolute right-8 md:right-24 top-1/2 -translate-y-1/2 text-right hidden md:block"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">New Drop</p>
            <p className="text-2xl font-black uppercase tracking-tight text-white">Fresh Kicks</p>
            <p className="text-sm text-muted-foreground mt-1">Scroll to explore</p>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
