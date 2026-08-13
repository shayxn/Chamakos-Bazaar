import { motion } from "framer-motion";

interface ChamakLogoProps {
  className?: string;
  animate?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: { width: 110, height: 36 },
  md: { width: 160, height: 52 },
  lg: { width: 230, height: 75 },
  xl: { width: 320, height: 104 },
};

export function ChamakLogo({ className = "", animate = true, size = "md" }: ChamakLogoProps) {
  const { width, height } = sizes[size];

  const shimmer = animate ? {
    animate: { opacity: [0.85, 1, 0.85] as number[] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  } : {};

  return (
    <div className={className} style={{ width, height, display: "flex", alignItems: "center" }}>
      <svg
        viewBox="0 0 320 104"
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="fpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f0f0f0" />
            <stop offset="100%" stopColor="#cccccc" />
          </linearGradient>
          <linearGradient id="fpAccent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6600" />
            <stop offset="100%" stopColor="#ffaa00" />
          </linearGradient>
          <filter id="fpGlow" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* FIRST */}
        <motion.text
          x="10"
          y="62"
          fontFamily="'Arial Black', 'Impact', sans-serif"
          fontWeight="900"
          fontSize="58"
          fill="url(#fpGrad)"
          filter="url(#fpGlow)"
          style={{ letterSpacing: "-1px" }}
          {...shimmer}
        >
          FIRST
        </motion.text>

        {/* PICK — accent color */}
        <motion.text
          x="183"
          y="62"
          fontFamily="'Arial Black', 'Impact', sans-serif"
          fontWeight="900"
          fontSize="58"
          fill="url(#fpAccent)"
          filter="url(#fpGlow)"
          style={{ letterSpacing: "-1px" }}
          {...(animate ? {
            animate: { opacity: [0.9, 1, 0.9] as number[] },
            transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const, delay: 0.4 },
          } : {})}
        >
          PICK
        </motion.text>

        {/* Thin accent underline */}
        <rect x="10" y="72" width="302" height="2" rx="1" fill="url(#fpAccent)" opacity="0.5" />

        {/* Dot between FIRST and PICK */}
        <motion.circle
          cx="178"
          cy="54"
          r="4"
          fill="url(#fpAccent)"
          {...(animate ? {
            animate: { opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] } as any,
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
          } : {})}
        />
      </svg>
    </div>
  );
}
