import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export type ActiveEvent = {
  id: number; name: string; type: string;
  bannerText: string | null; bannerSubtext: string | null;
  bannerColor: string | null; textColor: string | null;
  accentColor: string | null; discountPercent: string | null;
  countdownEnabled: boolean;
  startAt: string | null; endAt: string | null;
  homepageEnabled: boolean;
  homepageTitle: string | null; homepageSubtitle: string | null;
  ctaText: string | null; ctaUrl: string | null;
  popupEnabled: boolean; popupText: string | null;
  popupImageUrl: string | null; backgroundImageUrl: string | null;
  logoUrl: string | null; badgeText: string | null;
  priority: number;
  config: Record<string, unknown> | null;
};

// Shared hook — other components import this
let _events: ActiveEvent[] = [];
let _listeners: Array<() => void> = [];
let _fetching = false;
let _lastFetch = 0;
const CACHE_MS = 30_000;

function notifyListeners() { _listeners.forEach((fn) => fn()); }

export async function refreshActiveEvents(force = false) {
  if (_fetching) return;
  if (!force && Date.now() - _lastFetch < CACHE_MS) return;
  _fetching = true;
  try {
    const r = await fetch(`${BASE}/api/events/active`);
    if (!r.ok) return;
    _events = await r.json() as ActiveEvent[];
    _lastFetch = Date.now();
    notifyListeners();
  } catch {} finally {
    _fetching = false;
  }
}

export function useActiveEvents(): ActiveEvent[] {
  const [events, setEvents] = useState<ActiveEvent[]>(_events);
  useEffect(() => {
    const fn = () => setEvents([..._events]);
    _listeners.push(fn);
    if (_events.length === 0) refreshActiveEvents();
    return () => { _listeners = _listeners.filter((l) => l !== fn); };
  }, []);
  return events;
}

function useCountdown(endAt: string | null, enabled: boolean) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!endAt || !enabled) return;
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, enabled]);
  return timeLeft;
}

function CountdownDisplay({ endAt, enabled, textColor }: { endAt: string | null; enabled: boolean; textColor: string }) {
  const t = useCountdown(endAt, enabled);
  if (!t) return null;
  const seg = (v: number, label: string) => (
    <span className="flex items-center gap-0.5 font-black font-mono" style={{ color: textColor }}>
      <span>{String(v).padStart(2, "0")}</span>
      <span className="text-[9px] uppercase tracking-widest opacity-70 ml-0.5">{label}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Clock className="h-3 w-3" style={{ color: textColor, opacity: 0.7 }} />
      {t.d > 0 && <>{seg(t.d, "d")}<span className="opacity-40" style={{ color: textColor }}>:</span></>}
      {seg(t.h, "h")}<span className="opacity-40" style={{ color: textColor }}>:</span>
      {seg(t.m, "m")}<span className="opacity-40" style={{ color: textColor }}>:</span>
      {seg(t.s, "s")}
    </div>
  );
}

function EventBannerInner({ event, onDismiss }: { event: ActiveEvent; onDismiss: () => void }) {
  const textColor = event.textColor || "#ffffff";

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: event.bannerColor || "#ff6600",
        backgroundImage: event.backgroundImageUrl
          ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(${event.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }} />

      <div className="relative flex items-center justify-center gap-3 px-10 py-2.5 flex-wrap">
        {event.logoUrl ? (
          <img src={event.logoUrl} alt={event.name} className="h-5 object-contain" />
        ) : (
          <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: textColor }} />
        )}

        <span className="font-black uppercase tracking-widest text-xs sm:text-sm" style={{ color: textColor }}>
          {event.bannerText || event.name}
        </span>

        {event.discountPercent && (
          <span className="font-black text-xs px-2 py-0.5 rounded-sm"
            style={{ backgroundColor: `${event.accentColor || "#fff"}22`, color: event.accentColor || "#fff", border: `1px solid ${event.accentColor || "#fff"}44` }}>
            {event.discountPercent}% OFF
          </span>
        )}

        {event.bannerSubtext && (
          <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.8 }}>{event.bannerSubtext}</span>
        )}

        {event.countdownEnabled && event.endAt && (
          <CountdownDisplay endAt={event.endAt} enabled={event.countdownEnabled} textColor={textColor} />
        )}

        {event.ctaText && event.ctaUrl && (
          <a href={event.ctaUrl}
            className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: event.accentColor || "#fff", color: event.bannerColor || "#000" }}>
            {event.ctaText}
          </a>
        )}

        <button onClick={onDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-60">
          <X className="h-4 w-4" style={{ color: textColor }} />
        </button>
      </div>
    </motion.div>
  );
}

export function EventBanner() {
  const events = useActiveEvents();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = events.filter((e) => !dismissed.has(e.id));

  return (
    <AnimatePresence>
      {visible.map((e) => (
        <EventBannerInner key={e.id} event={e} onDismiss={() => setDismissed((s) => new Set([...s, e.id]))} />
      ))}
    </AnimatePresence>
  );
}
