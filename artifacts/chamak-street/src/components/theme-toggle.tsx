import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isGlass = theme === "liquid-glass";

  return (
    <motion.div
      className="fixed bottom-6 left-6 z-[60] flex items-center rounded-full p-[3px] gap-[2px] select-none"
      animate={isGlass ? "glass" : "dark"}
      initial={false}
      style={{
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        background: isGlass
          ? "rgba(255,255,255,0.18)"
          : "rgba(12,12,12,0.65)",
        border: isGlass
          ? "1px solid rgba(255,255,255,0.38)"
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isGlass
          ? "0 4px 24px rgba(100,120,255,0.1), inset 0 1px 0 rgba(255,255,255,0.5)"
          : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <Segment
        active={!isGlass}
        onClick={() => setTheme("default")}
        isGlass={isGlass}
        label="Chamak"
        icon={<MoonIcon />}
        activeGlow={isGlass ? undefined : "rgba(255,102,0,0.25)"}
        activeColor={isGlass ? undefined : "#ff6600"}
      />
      <Segment
        active={isGlass}
        onClick={() => setTheme("liquid-glass")}
        isGlass={isGlass}
        label="Glass"
        icon={<StarIcon />}
        activeGlow={isGlass ? "rgba(0,122,255,0.2)" : undefined}
        activeColor={isGlass ? "#007AFF" : undefined}
      />
    </motion.div>
  );
}

function Segment({
  active,
  onClick,
  isGlass,
  label,
  icon,
  activeGlow,
  activeColor,
}: {
  active: boolean;
  onClick: () => void;
  isGlass: boolean;
  label: string;
  icon: React.ReactNode;
  activeGlow?: string;
  activeColor?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.91 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em]"
      style={{
        background: active
          ? isGlass
            ? "rgba(255,255,255,0.55)"
            : "rgba(255,102,0,0.15)"
          : "transparent",
        color: active
          ? (activeColor ?? (isGlass ? "#007AFF" : "#ff6600"))
          : isGlass
            ? "rgba(50,60,100,0.45)"
            : "rgba(255,255,255,0.3)",
        boxShadow: active && activeGlow
          ? `0 0 14px ${activeGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`
          : "none",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.55, transition: "opacity 0.2s" }}>
        {icon}
      </span>
      <span>{label}</span>
    </motion.button>
  );
}

function MoonIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
