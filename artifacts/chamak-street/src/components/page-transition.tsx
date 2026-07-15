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
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_CURVE } }}
        exit={{ opacity: 0, y: -10, transition: { duration: 0.22, ease: "easeIn" } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const revealVariants = {
  hidden: { opacity: 0, y: 32 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible: (delay: number = 0): any => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_CURVE, delay },
  }),
};

export function RevealSection({
  children,
  className = "",
  delay = 0,
  amount = 0.15,
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
    >
      {children}
    </motion.div>
  );
}

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const revealItem: any = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_CURVE } },
};

export function RevealList({
  children,
  className = "",
  stagger = 0.07,
  amount = 0.1,
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
      variants={{ ...listVariants, visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } } }}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}
