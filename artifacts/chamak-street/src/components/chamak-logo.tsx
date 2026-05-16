import { motion } from "framer-motion";

interface ChamakLogoProps {
  className?: string;
  animate?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: { width: 120, height: 50 },
  md: { width: 180, height: 75 },
  lg: { width: 260, height: 108 },
  xl: { width: 380, height: 158 },
};

export function ChamakLogo({ className = "", animate = true, size = "md" }: ChamakLogoProps) {
  const { width, height } = sizes[size];

  const shimmer = animate ? {
    animate: { opacity: [0.7, 1, 0.7] },
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  } : {};

  const sparkleVariants = {
    animate: {
      scale: [0, 1, 0],
      opacity: [0, 1, 0],
      rotate: [0, 180, 360],
    },
  };

  return (
    <div className={className} style={{ width, height }}>
      <svg
        viewBox="0 0 380 158"
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Main fire gradient: orange → yellow */}
          <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4400" />
            <stop offset="35%" stopColor="#ff6600" />
            <stop offset="65%" stopColor="#ffaa00" />
            <stop offset="100%" stopColor="#ffcc00" />
          </linearGradient>

          {/* Vertical fire gradient for depth */}
          <linearGradient id="fireGradV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffcc00" />
            <stop offset="50%" stopColor="#ff6600" />
            <stop offset="100%" stopColor="#cc3300" />
          </linearGradient>

          {/* Combined gradient */}
          <linearGradient id="chamakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffdd00" />
            <stop offset="30%" stopColor="#ff9900" />
            <stop offset="60%" stopColor="#ff5500" />
            <stop offset="100%" stopColor="#ff2200" />
          </linearGradient>

          {/* Outline/stroke gradient */}
          <linearGradient id="outlineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a1000" />
            <stop offset="100%" stopColor="#1a0800" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow for CHAMAK text */}
          <filter id="strongGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow */}
          <filter id="shadow">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* ── CHAMAK text ── */}
        {/* Thick black outline layer */}
        <text
          x="190"
          y="88"
          textAnchor="middle"
          fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
          fontWeight="900"
          fontSize="88"
          fill="none"
          stroke="url(#outlineGrad)"
          strokeWidth="12"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ fontStyle: "italic", letterSpacing: "-2px" }}
        >
          Chamak
        </text>

        {/* White inner glow stroke */}
        <text
          x="190"
          y="88"
          textAnchor="middle"
          fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
          fontWeight="900"
          fontSize="88"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinejoin="round"
          style={{ fontStyle: "italic", letterSpacing: "-2px", opacity: 0.4 }}
        >
          Chamak
        </text>

        {/* Main CHAMAK fill */}
        <motion.text
          x="190"
          y="88"
          textAnchor="middle"
          fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
          fontWeight="900"
          fontSize="88"
          fill="url(#chamakGrad)"
          filter="url(#strongGlow)"
          style={{ fontStyle: "italic", letterSpacing: "-2px" }}
          {...shimmer}
        >
          Chamak
        </motion.text>

        {/* ── STREET text ── */}
        {/* Black outline */}
        <text
          x="192"
          y="116"
          textAnchor="middle"
          fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
          fontWeight="900"
          fontSize="28"
          fill="none"
          stroke="#1a0800"
          strokeWidth="5"
          strokeLinejoin="round"
          style={{ letterSpacing: "8px" }}
        >
          STREET
        </text>

        {/* STREET fill */}
        <text
          x="192"
          y="116"
          textAnchor="middle"
          fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
          fontWeight="900"
          fontSize="28"
          fill="url(#fireGrad)"
          filter="url(#glow)"
          style={{ letterSpacing: "8px" }}
        >
          STREET
        </text>

        {/* Underline beneath STREET */}
        <line x1="90" y1="122" x2="290" y2="122" stroke="url(#fireGrad)" strokeWidth="3" strokeLinecap="round" />
        <line x1="90" y1="126" x2="290" y2="126" stroke="url(#fireGrad)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />

        {/* ── Flame element top-right of K ── */}
        <g transform="translate(298, 10)" filter="url(#glow)">
          <path
            d="M8,22 C8,22 2,16 4,10 C4,10 6,14 8,12 C8,12 7,6 12,2 C12,2 10,8 13,10 C13,10 15,4 18,6 C18,6 14,12 17,14 C17,14 20,10 22,12 C22,12 22,20 16,24 C16,24 14,20 12,22 C12,22 10,18 8,22 Z"
            fill="url(#chamakGrad)"
            stroke="#1a0800"
            strokeWidth="1.5"
          />
        </g>

        {/* ── Sparkle stars ── */}
        {/* Top-left star */}
        <motion.g
          transform="translate(42, 18)"
          variants={sparkleVariants}
          animate="animate"
          transition={{ duration: 1.8, repeat: Infinity, delay: 0 }}
        >
          <path d="M0,-10 L2,-2 L10,0 L2,2 L0,10 L-2,2 L-10,0 L-2,-2 Z" fill="#ffcc00" filter="url(#glow)" />
          <path d="M0,-6 L1,-1 L6,0 L1,1 L0,6 L-1,1 L-6,0 L-1,-1 Z" fill="#fff" opacity="0.6" />
        </motion.g>

        {/* Small star top-left */}
        <motion.g
          transform="translate(22, 36)"
          variants={sparkleVariants}
          animate="animate"
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        >
          <path d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z" fill="#ffaa00" filter="url(#glow)" />
        </motion.g>

        {/* Top-right small sparkle */}
        <motion.g
          transform="translate(352, 22)"
          variants={sparkleVariants}
          animate="animate"
          transition={{ duration: 2.1, repeat: Infinity, delay: 0.7 }}
        >
          <path d="M0,-7 L1.5,-1.5 L7,0 L1.5,1.5 L0,7 L-1.5,1.5 L-7,0 L-1.5,-1.5 Z" fill="#ffcc00" filter="url(#glow)" />
        </motion.g>

        {/* Extra tiny dots */}
        <motion.circle
          cx="58" cy="40"
          r="3"
          fill="#ffcc00"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 1.1 }}
        />
        <motion.circle
          cx="330" cy="50"
          r="2"
          fill="#ffaa00"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 0.3 }}
        />
      </svg>
    </div>
  );
}
