import { type ReactNode, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useLocation } from "wouter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EASE_CURVE: any = [0.16, 1, 0.3, 1];

export function PageTransition({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.48, ease: EASE_CURVE } }}
        exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.22, ease: "easeIn" } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
