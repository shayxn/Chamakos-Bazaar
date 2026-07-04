import { motion } from "framer-motion";
import { type ReactNode } from "react";

// NO filter:blur() — it forces rasterization every frame and kills compositor perf.
// Opacity + translateY only → GPU compositor path = buttery 60fps.
const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.42, ease: EASE_EXPO }}
    >
      {children}
    </motion.div>
  );
}

export function RevealSection({
  children,
  delay = 0,
  className = "",
  amount = 0.15,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.65, delay, ease: EASE_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealList({
  children,
  className = "",
  stagger = 0.1,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const revealItem = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_EXPO },
  },
};
