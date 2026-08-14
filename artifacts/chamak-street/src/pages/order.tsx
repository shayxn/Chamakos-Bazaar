import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import {
  CheckCircle2, Package, Copy, MapPin, MessageCircle,
  Clock, Truck, Home, ShoppingBag, User, ArrowRight, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { useState, useEffect, useRef, useCallback } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Canvas confetti ── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rotation: number; rotationV: number;
  shape: "rect" | "circle" | "star"; opacity: number; gravity: number;
}
const CONFETTI_COLORS = ["#ff6600","#ffaa00","#ffffff","#ff9933","#ffcc44","#ff3300","#ffe066","#ffdd00"];
function createParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 8 + Math.random() * 18;
  return { x: cx + (Math.random() - 0.5) * 120, y: cy + (Math.random() - 0.5) * 40,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 5 + Math.random() * 10, rotation: Math.random() * 360,
    rotationV: (Math.random() - 0.5) * 14,
    shape: (["rect","circle","star"] as const)[Math.floor(Math.random() * 3)],
    opacity: 1, gravity: 0.28 + Math.random() * 0.18 };
}
function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const pts = 5, outer = size / 2, inner = outer * 0.4;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}
function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const run = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const cx = canvas.width / 2, cy = canvas.height * 0.22;
    const particles: Particle[] = [];
    for (let i = 0; i < 200; i++) particles.push(createParticle(cx, cy));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
        p.vx *= 0.992; p.rotation += p.rotationV;
        p.opacity -= frame > 90 ? 0.018 : 0.004;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.55);
        else if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2); ctx.fill(); }
        else drawStar(ctx, p.size);
        ctx.restore();
      }
      frame++;
      if (alive) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(run, 180);
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); };
  }, [active, run]);
  return canvasRef;
}

/* ── Tracking stages ── */
const STAGES = [
  { key: "pending",          label: "Order\nPlaced",     Icon: CheckCircle2 },
  { key: "confirmed",        label: "Confirmed",         Icon: Package },
  { key: "preparing",        label: "Preparing",         Icon: Clock },
  { key: "shipped",          label: "Shipped",           Icon: Truck },
  { key: "out_for_delivery", label: "Out for\nDelivery", Icon: Home },
  { key: "delivered",        label: "Delivered",         Icon: CheckCircle2 },
] as const;

const STATUS_TO_STAGE: Record<string, number> = {
  pending: 0, confirmed: 1,
  packed: 2, preparing: 2,
  shipped: 3, out_for_delivery: 4, delivered: 5,
};

function TrackingTimeline({ status, events }: { status: string; events?: { status: string; createdAt: string }[] }) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;
  const cancelled = status === "cancelled";

  const getEventTime = (stageKey: string) => {
    const event = events?.find(e => e.status === stageKey || (stageKey === "preparing" && e.status === "packed"));
    if (!event) return null;
    return new Date(event.createdAt).toLocaleDateString("en-AE", { month: "short", day: "numeric" });
  };

  if (cancelled) {
    return (
      <div className="flex items-center justify-center gap-3 p-5 rounded-2xl"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-black uppercase tracking-wider text-red-400 text-sm">Order Cancelled</p>
          <p className="text-xs text-muted-foreground mt-0.5">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-start" style={{ minWidth: "100%" }}>
        {STAGES.map(({ key, label, Icon }, i) => {
          const completed = i <= currentStage;
          const isCurrent = i === currentStage;
          const date = getEventTime(key);
          return (
            <div key={key} className="flex-1 flex flex-col items-center relative" style={{ minWidth: 0 }}>
              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 z-0"
                  style={{
                    background: i < currentStage
                      ? "linear-gradient(90deg, #ff6600, #ff9900)"
                      : "rgba(255,255,255,0.1)",
                    transition: "background 0.6s ease",
                  }}
                />
              )}
              {/* Icon circle */}
              <motion.div
                initial={false}
                animate={completed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full mb-1.5"
                style={{
                  background: completed
                    ? isCurrent
                      ? "linear-gradient(135deg, #ff6600, #ff9900)"
                      : "rgba(255,102,0,0.2)"
                    : "rgba(255,255,255,0.06)",
                  border: completed ? "2px solid #ff6600" : "2px solid rgba(255,255,255,0.12)",
                  boxShadow: isCurrent ? "0 0 14px rgba(255,102,0,0.5)" : "none",
                  transition: "all 0.4s ease",
                }}
              >
                <Icon className="h-3.5 w-3.5"
                  style={{ color: completed ? (isCurrent ? "#fff" : "#ff8833") : "rgba(255,255,255,0.25)" }}
                />
              </motion.div>
              {/* Label */}
              <p className="text-center leading-tight"
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  color: completed ? (isCurrent ? "#ff8833" : "rgba(255,255,255,0.7)") : "rgba(255,255,255,0.25)",
                  whiteSpace: "pre-line",
                  transition: "color 0.4s ease",
                }}
              >
                {label}
              </p>
              {date && (
                <p style={{ fontSize: "8px", color: "rgba(255,102,0,0.7)", fontWeight: 700, marginTop: 1 }}>
                  {date}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── PulseRings ── */
function PulseRings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-primary/40"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.8 + i * 0.6, opacity: 0 }}
          transition={{ duration: 1.4, delay: 0.1 + i * 0.26, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Order Placed", confirmed: "Confirmed",
  packed: "Preparing", preparing: "Preparing",
  shipped: "Shipped", out_for_delivery: "Out for Delivery",
  delivered: "Delivered", cancelled: "Cancelled",
};

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [flash, setFlash] = useState(false);
  const [customerLoggedIn, setCustomerLoggedIn] = useState<null | boolean>(null);

  const { data: order, isLoading } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id), refetchInterval: 30_000 }
  });

  const canvasRef = useConfetti(celebrate);

  useEffect(() => {
    if (!order) return;
    setFlash(true);
    const t1 = setTimeout(() => setFlash(false), 350);
    const t2 = setTimeout(() => setCelebrate(true), 80);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Check if customer is logged in
  useEffect(() => {
    const baseUrl = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";
    fetch(`${baseUrl}/api/customers/me`, { credentials: "include" })
      .then(r => setCustomerLoggedIn(r.ok))
      .catch(() => setCustomerLoggedIn(false));
  }, []);

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground mt-4 font-bold uppercase tracking-widest">Loading your order…</p>
      </div>
    );
  }

  if (!order) return (
    <div className="p-20 text-center font-black text-xl uppercase text-muted-foreground">Order not found</div>
  );

  const trackingEvents = (order as any).trackingEvents as { status: string; createdAt: string }[] | undefined;
  const isPreOrder = order.hasPreOrder || order.items?.some((i) => i.isPreOrder);
  const subtotal = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;
  const shipping = order.total - subtotal > 0.1 ? order.total - subtotal : (subtotal >= 300 ? 0 : 25);
  const shippingFree = shipping === 0;

  return (
    <PageTransition>
      {/* Flash */}
      <AnimatePresence>
        {flash && (
          <motion.div key="flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }}
            transition={{ duration: 0.35, times: [0, 0.3, 1] }}
            className="fixed inset-0 z-[200] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,140,0,0.9), rgba(255,60,0,0.4), transparent 70%)" }}
          />
        )}
      </AnimatePresence>

      {/* Confetti */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />

      <div className="container mx-auto px-4 py-10 max-w-2xl relative">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="relative flex-shrink-0">
            <PulseRings />
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 0.9, 1.05, 1] }}
              transition={{ duration: 0.65, delay: 0.15, ease: EASE }}
              className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 40% 35%, rgba(255,160,0,0.3), rgba(255,80,0,0.1))",
                border: "2px solid rgba(255,102,0,0.5)",
                boxShadow: "0 0 40px rgba(255,102,0,0.4)",
              }}
            >
              <motion.div
                animate={{ boxShadow: ["0 0 20px rgba(255,102,0,0.4)", "0 0 50px rgba(255,150,0,0.7)", "0 0 20px rgba(255,102,0,0.4)"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="rounded-full p-1"
              >
                <CheckCircle2 className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </motion.div>
            </motion.div>
          </div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: EASE }}
              className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none"
            >
              <span className="gradient-text">Order placed,</span>
              <span className="text-white"> thanks!</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-sm text-muted-foreground mt-1"
            >
              We've received your order and it's now being processed.
            </motion.p>
          </div>
        </motion.div>

        {/* ── Order number + date ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.45, ease: EASE }}
          className="flex items-center justify-between p-4 rounded-xl mb-4"
          style={{
            background: "linear-gradient(135deg, rgba(255,102,0,0.12), rgba(255,80,0,0.05))",
            border: "1px solid rgba(255,102,0,0.3)",
          }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-primary/70 mb-0.5">Order Number</p>
            <div className="flex items-center gap-2">
              <p className="font-mono font-black text-xl text-primary">{order.orderNumber ?? `#${order.id}`}</p>
              <motion.button onClick={copyOrderNumber} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
                className="p-1.5 rounded-lg border border-primary/30 hover:bg-primary/15 transition-colors">
                <AnimatePresence mode="wait">
                  {copied
                    ? <motion.div key="ck" initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /></motion.div>
                    : <motion.div key="cp" initial={{ scale: 0 }} animate={{ scale: 1 }}><Copy className="h-3.5 w-3.5 text-primary" /></motion.div>}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-0.5">Placed on</p>
            <p className="text-sm font-bold text-foreground">
              {new Date(order.createdAt).toLocaleDateString("en-AE", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </motion.div>

        {/* ── Shipping to ── */}
        {order.customerAddress && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72, duration: 0.45, ease: EASE }}
            className="p-4 rounded-xl mb-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.2)" }}>
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-1">Shipping to</p>
                <p className="font-black text-sm text-foreground">{order.customerName}</p>
                <p className="text-sm text-muted-foreground leading-snug">{order.customerAddress}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Delivery tracking timeline ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.84, duration: 0.5, ease: EASE }}
          className="p-4 rounded-2xl mb-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-0.5">Delivery status</p>
              <p className="text-sm font-black text-primary">
                {STATUS_LABEL[order.status] ?? order.status}
              </p>
            </div>
            {order.estimatedDelivery && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-0.5">Estimated</p>
                <p className="text-sm font-bold text-yellow-400">{order.estimatedDelivery}</p>
              </div>
            )}
          </div>
          <TrackingTimeline status={order.status} events={trackingEvents} />

          <motion.div
            className="mt-4 p-3 rounded-xl text-xs text-muted-foreground flex items-center gap-2"
            style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.12)" }}
          >
            <span className="text-primary">✨</span>
            <span>Thank you for shopping with <strong className="text-foreground">FirstPick</strong>. We're getting your order ready.</span>
          </motion.div>
        </motion.div>

        {/* ── WhatsApp notice ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.96, duration: 0.4, ease: EASE }}
          className="flex items-center gap-3 p-4 rounded-xl mb-4"
          style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)" }}
        >
          <MessageCircle className="h-5 w-5 text-[#25D366] shrink-0" />
          <p className="text-sm text-[#25D366] font-bold">
            We'll WhatsApp you on <strong className="text-white">{order.customerPhone}</strong> to confirm your order shortly.
          </p>
        </motion.div>

        {/* ── Pre-order notice ── */}
        {isPreOrder && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex items-start gap-3 p-4 rounded-xl mb-4"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}
          >
            <Package className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-yellow-300 uppercase tracking-wider mb-1">Pre-Order Notice</p>
              <p className="text-xs text-muted-foreground">
                Your order contains pre-order items. These will ship on the estimated date.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Order items ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5, ease: EASE }}
          className="rounded-2xl overflow-hidden mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="p-4 border-b border-white/6">
            <p className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground">
              Order items ({order.items?.length ?? 0})
            </p>
          </div>
          <div className="divide-y divide-white/6">
            {order.items?.map((item, i) => (
              <motion.div key={item.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.15 + i * 0.06, ease: EASE }}
                className="flex items-center gap-3 p-4"
              >
                {/* Product icon */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.18)" }}>
                  <ShoppingBag className="h-4 w-4 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item.productName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.size && (
                      <span className="text-[10px] bg-white/8 text-muted-foreground px-2 py-0.5 rounded font-bold uppercase">
                        {item.size}
                      </span>
                    )}
                    {item.isPreOrder && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-black uppercase">Pre</span>
                    )}
                    <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                  </div>
                </div>
                <p className="font-mono font-bold text-sm text-primary shrink-0">
                  AED {(item.price * item.quantity).toFixed(2)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Order summary ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.45, ease: EASE }}
          className="rounded-2xl overflow-hidden mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="p-4 border-b border-white/6">
            <p className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground">Order summary</p>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({order.items?.length ?? 0} items)</span>
              <span className="font-bold">AED {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className={`font-bold ${shippingFree ? "text-green-400" : ""}`}>
                {shippingFree ? "FREE 🎉" : `AED ${shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-white/8 pt-2.5 flex justify-between">
              <span className="font-black uppercase tracking-wide">Total</span>
              <span className="font-mono font-black text-xl text-primary">AED {order.total.toFixed(2)}</span>
            </div>
            {shippingFree && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 }}
                className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.18)" }}
              >
                <span className="text-primary text-sm">✓</span>
                <p className="text-xs text-primary font-bold">
                  You saved AED 25 with Free Shipping!
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Guest sign-in / logged-in section ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 0.45, ease: EASE }}
          className="rounded-2xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {customerLoggedIn ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)" }}>
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-black text-sm">Signed in</p>
                  <p className="text-xs text-muted-foreground">View and track all your orders</p>
                </div>
              </div>
              <Link href="/account">
                <Button size="sm" variant="outline"
                  className="font-black uppercase tracking-wide text-xs border-primary/30 hover:border-primary/60 shrink-0">
                  My Orders
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-black text-sm">Keep track of your order</p>
                  <p className="text-xs text-muted-foreground">Sign in to follow delivery updates</p>
                </div>
              </div>
              <Link href="/account">
                <Button size="sm"
                  className="font-black uppercase tracking-wide text-xs fire-gradient border-none shrink-0">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </motion.div>

        {/* ── Need help ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45, duration: 0.4, ease: EASE }}
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="p-4 border-b border-white/6">
            <p className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground">Need help?</p>
          </div>
          <a href={`https://wa.me/${order.customerPhone?.replace(/\D/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-4 hover:bg-white/4 transition-colors border-b border-white/6">
            <span className="text-sm font-bold">Contact Support via WhatsApp</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </a>
          <Link href="/shop"
            className="flex items-center justify-between p-4 hover:bg-white/4 transition-colors">
            <span className="text-sm font-bold">Continue Shopping</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </motion.div>

        {/* ── Actions ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55, ease: EASE }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <Link href="/shop">
            <motion.div whileHover={{ scale: 1.04, filter: "brightness(1.08)" }} whileTap={{ scale: 0.96 }}>
              <Button size="lg"
                className="font-black uppercase tracking-widest h-14 px-8 fire-gradient border-none shadow-[0_0_28px_rgba(255,102,0,0.4)]">
                Keep Shopping <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>

      </div>
    </PageTransition>
  );
}
