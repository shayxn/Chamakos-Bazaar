import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Event = {
  id: number; name: string; type: string;
  bannerText: string | null; bannerSubtext: string | null;
  bannerColor: string | null; discountPercent: string | null;
  startAt: string | null; endAt: string | null;
};

function useCountdown(endAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!endAt) return;
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  return timeLeft;
}

function EventBannerInner({ event, onDismiss }: { event: Event; onDismiss: () => void }) {
  const countdown = useCountdown(event.endAt);
  const color = event.bannerColor || "#ff6600";

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: color }}
      className="relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }} />
      <div className="relative flex items-center justify-center gap-4 px-8 py-2.5 text-center flex-wrap">
        <Zap className="h-4 w-4 text-white shrink-0" />
        <span className="text-white font-black uppercase tracking-widest text-sm">
          {event.bannerText || event.name}
        </span>
        {event.discountPercent && (
          <span className="bg-white/20 text-white font-black text-xs px-2 py-0.5 rounded-sm">
            {event.discountPercent}% OFF
          </span>
        )}
        {event.bannerSubtext && (
          <span className="text-white/80 text-xs font-medium">{event.bannerSubtext}</span>
        )}
        {countdown && (
          <div className="flex items-center gap-1.5 text-white font-black text-xs">
            <Clock className="h-3 w-3" />
            {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
          </div>
        )}
        <button
          onClick={onDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function EventBanner() {
  const [events, setEvents] = useState<Event[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`${BASE}/api/events/active`)
      .then((r) => r.json())
      .then((data) => setEvents(data as Event[]))
      .catch(() => {});
  }, []);

  const visible = events.filter((e) => !dismissed.has(e.id));

  return (
    <AnimatePresence>
      {visible.map((e) => (
        <EventBannerInner key={e.id} event={e} onDismiss={() => setDismissed((s) => new Set([...s, e.id]))} />
      ))}
    </AnimatePresence>
  );
}
