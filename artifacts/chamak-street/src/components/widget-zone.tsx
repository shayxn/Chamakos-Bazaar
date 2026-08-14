/* @refresh reset */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { usePwaMode } from "@/hooks/use-pwa-mode";
import { useAccount } from "@/pages/account/index";
import { OrderStatusWidget } from "./order-status-widget";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type WidgetType = "image" | "custom";
type Placement = "home" | "shop" | "account" | "order";
type Targeting = "everyone" | "signed_in" | "guests";
type GlassAmount = "none" | "light" | "medium" | "heavy";
type Layout = "stack" | "row" | "centered";
type Size = "sm" | "md" | "lg" | "full";
type Animation = "fade" | "slide" | "scale" | "none";

export interface Widget {
  id: number;
  type: WidgetType;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  icon: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  placement: Placement;
  displayOrder: number;
  isPublished: boolean;
  targeting: Targeting;
  background: string | null;
  accent: string | null;
  glassAmount: GlassAmount | null;
  layout: Layout | null;
  size: Size | null;
  borderRadius: number | null;
  animation: Animation | null;
  config: Record<string, unknown> | null;
}

// ─── Glass blur lookup ────────────────────────────────────────────────────────
const GLASS_BLUR: Record<GlassAmount, string> = {
  none:   "backdrop-blur-none",
  light:  "backdrop-blur-md",
  medium: "backdrop-blur-xl",
  heavy:  "backdrop-blur-3xl",
};

const GLASS_BG: Record<GlassAmount, string> = {
  none:   "",
  light:  "bg-black/30",
  medium: "bg-black/50",
  heavy:  "bg-black/70",
};

// ─── Size → max-width ────────────────────────────────────────────────────────
const SIZE_CLASS: Record<Size, string> = {
  sm:   "max-w-xs",
  md:   "max-w-sm",
  lg:   "max-w-md",
  full: "w-full",
};

// ─── Entrance animation variants ─────────────────────────────────────────────
const ANIM: Record<Animation, object> = {
  fade:  { initial: { opacity: 0 },           animate: { opacity: 1 },           exit: { opacity: 0 } },
  slide: { initial: { opacity: 0, y: 16 },    animate: { opacity: 1, y: 0 },     exit: { opacity: 0, y: -8 } },
  scale: { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } },
  none:  { initial: {}, animate: {}, exit: {} },
};

// ─── Single rendered admin widget ────────────────────────────────────────────
export function AdminRenderedWidget({ widget: w, preview = false }: { widget: Widget; preview?: boolean }) {
  const glass = w.glassAmount ?? "medium";
  const layout = w.layout ?? "stack";
  const anim = w.animation ?? "fade";
  const radius = w.borderRadius ?? 16;
  const accent = w.accent ?? "#f97316";

  const contentFlex = layout === "row" ? "flex-row items-center gap-3" : layout === "centered" ? "flex-col items-center text-center" : "flex-col";

  const inner = (
    <div
      className={`relative overflow-hidden flex ${contentFlex} gap-2 p-4 w-full`}
      style={{
        borderRadius: radius,
        background: w.background ?? "#111",
        border: `1px solid ${accent}22`,
        boxShadow: `0 0 0 1px ${accent}10 inset, 0 8px 32px rgba(0,0,0,0.5)`,
      }}>

      {/* Shimmer line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />

      {w.type === "image" && w.imageUrl ? (
        <>
          <img src={w.imageUrl} alt={w.title ?? ""} className="w-full object-cover rounded-xl"
            style={{ borderRadius: Math.max(0, radius - 4), maxHeight: preview ? 80 : 180 }} />
          {(w.title || w.subtitle) && (
            <div className="flex-1 min-w-0">
              {w.title && <p className="font-bold text-white text-sm leading-tight truncate">{w.title}</p>}
              {w.subtitle && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: `${accent}cc` }}>{w.subtitle}</p>}
            </div>
          )}
        </>
      ) : w.type === "image" ? (
        <div className="flex items-center justify-center w-full h-16 rounded-xl bg-white/5">
          <ImageIcon className="w-6 h-6 text-white/20" />
        </div>
      ) : (
        <>
          {/* Icon */}
          {w.icon && (
            <div className="text-2xl shrink-0">{w.icon}</div>
          )}
          {/* Text */}
          <div className="flex-1 min-w-0">
            {w.title && (
              <p className="font-bold text-white leading-tight" style={{ fontSize: preview ? 12 : 14 }}>{w.title}</p>
            )}
            {w.subtitle && (
              <p style={{ color: `${accent}bb`, fontSize: preview ? 10 : 12 }} className="mt-0.5 line-clamp-3">{w.subtitle}</p>
            )}
          </div>
        </>
      )}

      {/* Button */}
      {w.buttonLabel && (
        <div className={`${layout === "centered" ? "w-full" : ""} mt-1 shrink-0`}>
          {preview ? (
            <div className="px-4 py-1.5 rounded-full text-xs font-bold text-center"
              style={{ background: accent, color: "#000" }}>
              {w.buttonLabel}
            </div>
          ) : w.buttonUrl ? (
            <Link href={w.buttonUrl}>
              <button className="px-4 py-1.5 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
                style={{ background: accent, color: "#000" }}>
                {w.buttonLabel}
              </button>
            </Link>
          ) : (
            <button className="px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: accent, color: "#000" }}>
              {w.buttonLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const { initial, animate, exit } = ANIM[anim] as { initial: object; animate: object; exit: object };

  return (
    <motion.div
      initial={initial} animate={animate} exit={exit}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={`${GLASS_BLUR[glass]} ${GLASS_BG[glass]} ${preview ? "w-full" : SIZE_CLASS[w.size ?? "md"]}`}
      style={{ borderRadius: radius }}>
      {inner}
    </motion.div>
  );
}

// ─── "Add to Home Screen" prompt ─────────────────────────────────────────────
function AddToHomePrompt({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 bg-black/40 backdrop-blur-md text-xs text-white/40">
        <Smartphone className="w-3.5 h-3.5 text-orange-400/60 shrink-0" />
        <span>Add FirstPick to your Home Screen to unlock widgets</span>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-orange-500/15 bg-black/50 backdrop-blur-xl p-5 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/25 to-transparent" />
      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
        <Smartphone className="w-5 h-5 text-orange-400" />
      </div>
      <p className="font-semibold text-sm text-white mb-1">Unlock FirstPick Widgets</p>
      <p className="text-xs text-white/40 leading-relaxed">
        Add FirstPick to your Home Screen to see your order status and exclusive widgets here.
      </p>
      <p className="mt-3 text-[10px] text-white/25">
        Safari → Share → Add to Home Screen
      </p>
    </motion.div>
  );
}

// ─── Public WidgetZone ────────────────────────────────────────────────────────
interface WidgetZoneProps {
  placement: Placement;
  /** Show the built-in Recent Order widget (home placement only) */
  showOrderWidget?: boolean;
  /** Use a compact non-PWA prompt instead of the full card */
  compactPrompt?: boolean;
  className?: string;
}

export function WidgetZone({
  placement,
  showOrderWidget = false,
  compactPrompt = false,
  className = "",
}: WidgetZoneProps) {
  const isPwa = usePwaMode();
  const { customer } = useAccount();
  const [adminWidgets, setAdminWidgets] = useState<Widget[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isPwa) { setLoaded(true); return; }
    fetch(`${BASE}/api/widgets/published?placement=${placement}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Widget[]) => {
        // Filter by targeting
        const visible = data.filter((w) => {
          if (w.targeting === "signed_in") return !!customer;
          if (w.targeting === "guests") return !customer;
          return true; // everyone
        });
        setAdminWidgets(visible);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isPwa, placement, customer]);

  // In PWA mode, check if there's anything to render
  const hasOrderWidget = isPwa && showOrderWidget;
  const hasAdminWidgets = isPwa && loaded && adminWidgets.length > 0;

  if (!isPwa) {
    // Only show the prompt if this placement specifically supports it
    if (!showOrderWidget && adminWidgets.length === 0 && !compactPrompt) return null;
    return (
      <div className={className}>
        <AddToHomePrompt compact={compactPrompt} />
      </div>
    );
  }

  if (!hasOrderWidget && !hasAdminWidgets) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence>
        {/* Built-in Recent Order widget */}
        {hasOrderWidget && (
          <motion.div key="order-widget"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
            <OrderStatusWidget />
          </motion.div>
        )}

        {/* Admin-created widgets */}
        {loaded && adminWidgets.map((w, i) => (
          <motion.div key={w.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: (hasOrderWidget ? 1 : 0) * 0.08 + i * 0.06, ease: [0.4, 0, 0.2, 1] }}>
            <AdminRenderedWidget widget={w} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
