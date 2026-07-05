import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isGlass = theme === "liquid-glass";

  return (
    <div className="fixed top-20 left-4 z-[60]">
      <motion.div
        initial={false}
        animate={isGlass ? "glass" : "dark"}
        className="flex items-center rounded-full p-[3px] gap-[3px] select-none"
        style={{
          background: isGlass
            ? "rgba(255,255,255,0.38)"
            : "rgba(18,18,18,0.82)",
          backdropFilter: isGlass ? "blur(32px) saturate(1.8)" : "blur(8px)",
          WebkitBackdropFilter: isGlass ? "blur(32px) saturate(1.8)" : "blur(8px)",
          border: isGlass
            ? "1px solid rgba(255,255,255,0.68)"
            : "1px solid rgba(255,255,255,0.1)",
          boxShadow: isGlass
            ? "0 4px 24px rgba(100,120,255,0.12), inset 0 1px 0 rgba(255,255,255,0.75)"
            : "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <Segment
          active={!isGlass}
          onClick={() => setTheme("default")}
          isGlass={isGlass}
          label="Chamak"
          icon={<DarkIcon />}
          activeColor={isGlass ? undefined : "#ff6600"}
        />
        <Segment
          active={isGlass}
          onClick={() => setTheme("liquid-glass")}
          isGlass={isGlass}
          label="Glass"
          icon={<GlassIcon />}
          activeColor={isGlass ? "#007AFF" : undefined}
        />
      </motion.div>
    </div>
  );
}

function Segment({
  active,
  onClick,
  isGlass,
  label,
  icon,
  activeColor,
}: {
  active: boolean;
  onClick: () => void;
  isGlass: boolean;
  label: string;
  icon: React.ReactNode;
  activeColor?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.16em] transition-colors duration-200"
      style={{
        background: active
          ? isGlass
            ? "rgba(255,255,255,0.75)"
            : "rgba(255,102,0,0.18)"
          : "transparent",
        color: active
          ? (activeColor || (isGlass ? "#007AFF" : "#ff6600"))
          : isGlass
            ? "rgba(60,70,110,0.55)"
            : "rgba(255,255,255,0.38)",
        boxShadow: active
          ? isGlass
            ? "0 2px 12px rgba(0,122,255,0.12), inset 0 1px 0 rgba(255,255,255,0.9)"
            : "0 2px 10px rgba(255,102,0,0.2)"
          : "none",
      }}
    >
      <span className="shrink-0" style={{ opacity: active ? 1 : 0.6 }}>
        {icon}
      </span>
      <span>{label}</span>
    </motion.button>
  );
}

function DarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GlassIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
