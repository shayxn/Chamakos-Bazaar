/* @refresh reset */
import { type ReactNode, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useLocation } from "wouter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EASE_CURVE: any = [0.16, 1, 0.3, 1];

export function PageTransition({ children }: { children: ReactNode }) {
  // On mobile, MobileLayout handles route-level transitions.
  // PageTransition adds a lightweight content-reveal on desktop only.
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_CURVE } }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

const revealVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.975 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible: (delay: number = 0): any => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: EASE_CURVE,
      delay,
    },
  }),
};

export function RevealSection({
  children,
  className = "",
  delay = 0,
  amount = 0.12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount });
  return (
    <motion.div
      ref={ref}
      variants={revealVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={delay}
      className={className}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const revealItem: any = {
  hidden: { opacity: 0, y: 26, scale: 0.965 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: EASE_CURVE,
    },
  },
};

export function RevealList({
  children,
  className = "",
  stagger = 0.07,
  amount = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount });
  return (
    <motion.div
      ref={ref}
      variants={{ ...listVariants, visible: { transition: { staggerChildren: stagger, delayChildren: 0.04 } } }}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
