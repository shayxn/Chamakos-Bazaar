import { motion } from "framer-motion";
import { Zap, ArrowRight, Clock } from "lucide-react";
import { useActiveEvents } from "./event-banner";
import { useState, useEffect } from "react";

function useCountdown(endAt: string | null, enabled: boolean) {
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!endAt || !enabled) return;
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setT(null); return; }
      setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, enabled]);
  return t;
}

function CountUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center min-w-[3.5rem]">
      <div className="text-2xl md:text-4xl font-black font-mono leading-none" style={{ color }}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[9px] uppercase tracking-[0.2em] opacity-60 mt-1" style={{ color }}>{label}</div>
    </div>
  );
}

export function EventHomepageBanner() {
  const events = useActiveEvents();
  const hp = events.find((e) => e.homepageEnabled);
  const countdown = useCountdown(hp?.endAt ?? null, hp?.countdownEnabled ?? false);

  if (!hp) return null;

  const color = hp.bannerColor || "#ff6600";
  const textColor = hp.textColor || "#ffffff";
  const accentColor = hp.accentColor || "#ffffff";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl mb-8"
      style={{
        background: color,
        backgroundImage: hp.backgroundImageUrl
          ? `linear-gradient(135deg, ${color}ee, ${color}88), url(${hp.backgroundImageUrl})`
          : `linear-gradient(135deg, ${color}, ${color}cc)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }} />

      <div className="relative z-10 px-6 py-8 md:py-12 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          {hp.logoUrl && (
            <img src={hp.logoUrl} alt={hp.name} className="h-10 mb-3 object-contain mx-auto md:mx-0" />
          )}
          <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
            <Zap className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: accentColor, opacity: 0.9 }}>{hp.name}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-2" style={{ color: textColor }}>
            {hp.homepageTitle || hp.bannerText || hp.name}
          </h2>
          {hp.homepageSubtitle && (
            <p className="text-sm md:text-base opacity-80 leading-relaxed max-w-md" style={{ color: textColor }}>
              {hp.homepageSubtitle}
            </p>
          )}
          {hp.discountPercent && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full font-black text-sm"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
              {hp.discountPercent}% OFF — Limited Time
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 shrink-0">
          {hp.countdownEnabled && countdown && (
            <div className="flex items-center gap-1">
              {countdown.d > 0 && (
                <><CountUnit value={countdown.d} label="Days" color={textColor} /><span className="text-2xl font-black mb-4 opacity-40" style={{ color: textColor }}>:</span></>
              )}
              <CountUnit value={countdown.h} label="Hours" color={textColor} />
              <span className="text-2xl font-black mb-4 opacity-40" style={{ color: textColor }}>:</span>
              <CountUnit value={countdown.m} label="Min" color={textColor} />
              <span className="text-2xl font-black mb-4 opacity-40" style={{ color: textColor }}>:</span>
              <CountUnit value={countdown.s} label="Sec" color={textColor} />
            </div>
          )}

          {hp.ctaText && hp.ctaUrl && (
            <motion.a
              href={hp.ctaUrl}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 rounded-sm font-black uppercase tracking-widest text-sm transition-all"
              style={{ backgroundColor: accentColor, color: color }}
            >
              {hp.ctaText} <ArrowRight className="h-4 w-4" />
            </motion.a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
