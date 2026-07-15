import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, ArrowRight, Package, Copy, MapPin, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { useState, useEffect, useRef, useCallback } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Canvas confetti particle engine ── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number;
  rotation: number; rotationV: number;
  shape: "rect" | "circle" | "star";
  opacity: number; gravity: number;
}

const CONFETTI_COLORS = [
  "#ff6600", "#ffaa00", "#ffffff", "#ff9933",
  "#ffcc44", "#ff3300", "#ffe066", "#ffdd00",
];

function createParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 8 + Math.random() * 18;
  return {
    x: cx + (Math.random() - 0.5) * 120,
    y: cy + (Math.random() - 0.5) * 40,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 5 + Math.random() * 10,
    rotation: Math.random() * 360,
    rotationV: (Math.random() - 0.5) * 14,
    shape: (["rect", "circle", "star"] as const)[Math.floor(Math.random() * 3)],
    opacity: 1,
    gravity: 0.28 + Math.random() * 0.18,
  };
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const pts = 5;
  const outer = size / 2;
  const inner = outer * 0.4;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
             : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  const run = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.28;

    const particles: Particle[] = [];
    for (let i = 0; i < 220; i++) particles.push(createParticle(cx, cy));

    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.x  += p.vx; p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.992;
        p.rotation += p.rotationV;
        p.opacity -= frame > 90 ? 0.018 : 0.004;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.55);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, p.size);
        }
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

/* ── Letter-by-letter text ── */
function SplitText({ text, className, delay = 0, stagger = 0.04 }: {
  text: string; className?: string; delay?: number; stagger?: number;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -28, rotateX: -40 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: delay + i * stagger, duration: 0.4, ease: EASE }}
          style={{ display: "inline-block", willChange: "transform" }}
        >
          {ch === " " ? "\u00a0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

/* ── Pulse rings ── */
function PulseRings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.8 + i * 0.6, opacity: 0 }}
          transition={{ duration: 1.4, delay: 0.1 + i * 0.26, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [flash, setFlash] = useState(false);

  const { data: order, isLoading } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id) }
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"
        />
        <p className="text-sm text-muted-foreground mt-4 font-bold uppercase tracking-widest">Loading your order…</p>
      </div>
    );
  }

  if (!order) return (
    <div className="p-20 text-center font-black text-xl uppercase text-muted-foreground">Order not found</div>
  );

  const isPreOrder = order.hasPreOrder || order.items?.some((i) => i.isPreOrder);

  return (
    <PageTransition>
      {/* ── Screen flash ── */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{ duration: 0.35, times: [0, 0.3, 1] }}
            className="fixed inset-0 z-[200] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,140,0,0.9), rgba(255,60,0,0.4), transparent 70%)" }}
          />
        )}
      </AnimatePresence>

      {/* ── Confetti canvas ── */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        style={{ mixBlendMode: "normal" }}
      />

      <div className="container mx-auto px-4 py-14 max-w-2xl relative">

        {/* ── Hero icon ── */}
        <div className="flex justify-center mb-8">
          <div className="relative flex items-center justify-center">
            <PulseRings />
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: [0, 1.35, 0.9, 1.08, 1], rotate: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: EASE }}
              className="relative z-10 h-28 w-28 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 40% 35%, rgba(255,160,0,0.25), rgba(255,80,0,0.08))",
                border: "2px solid rgba(255,102,0,0.45)",
                boxShadow: "0 0 60px rgba(255,102,0,0.45), 0 0 120px rgba(255,80,0,0.2)",
              }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(255,102,0,0.5)",
                    "0 0 70px rgba(255,150,0,0.8)",
                    "0 0 30px rgba(255,102,0,0.5)",
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="rounded-full p-3"
              >
                <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={1.5} />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="text-center mb-3">
          <div className="text-5xl sm:text-6xl font-black uppercase tracking-tighter leading-none mb-1"
            style={{ perspective: "600px" }}>
            <SplitText
              text="ORDER"
              delay={0.5}
              stagger={0.045}
              className="gradient-text block"
            />
            <SplitText
              text="CONFIRMED!"
              delay={0.72}
              stagger={0.04}
              className="gradient-text block"
            />
          </div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.5, ease: EASE }}
            className="text-base text-muted-foreground mt-3"
          >
            Thanks for the order,{" "}
            <span className="font-black text-foreground">{order.customerName}</span>. 🔥
            {isPreOrder
              ? " Pre-order locked in — ships on the estimated date."
              : " Your heat is on its way."}
          </motion.p>
        </div>

        {/* ── Achievement badge ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.55, type: "spring", stiffness: 320, damping: 18 }}
          className="flex justify-center mb-7"
        >
          <div
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-sm font-black uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, rgba(255,102,0,0.18), rgba(255,170,0,0.1))",
              border: "1px solid rgba(255,102,0,0.4)",
              boxShadow: "0 0 20px rgba(255,102,0,0.18)",
            }}
          >
            <motion.span
              animate={{ rotate: [0, 15, -10, 15, 0] }}
              transition={{ duration: 0.8, delay: 2, repeat: 2, repeatDelay: 4 }}
              style={{ display: "inline-block" }}
            >🏆</motion.span>
            <span className="text-primary">Chamak Street</span>
            <span className="text-white/50">·</span>
            <span className="text-white/80">Order placed</span>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-green-400 rounded-full"
            />
          </div>
        </motion.div>

        {/* ── ORDER NUMBER ── */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.75, duration: 0.5, ease: EASE }}
          className="rounded-2xl p-7 mb-5 relative overflow-hidden text-center"
          style={{
            background: "linear-gradient(135deg, rgba(255,102,0,0.14), rgba(255,80,0,0.06))",
            border: "2px solid rgba(255,102,0,0.35)",
            boxShadow: "0 4px 40px rgba(255,100,0,0.12)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,102,0,0.18), transparent 65%)" }} />
          <p className="text-[10px] uppercase tracking-[0.35em] font-black text-primary/80 mb-2">Your Order Number</p>
          <div className="flex items-center justify-center gap-3">
            <p className="font-mono font-black text-4xl sm:text-5xl text-primary">{order.orderNumber ?? `#${order.id}`}</p>
            <motion.button
              onClick={copyOrderNumber}
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
              className="p-2.5 rounded-xl border border-primary/30 hover:bg-primary/15 transition-colors"
              title="Copy order number"
            >
              <AnimatePresence mode="wait">
                {copied
                  ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </motion.div>
                  : <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Copy className="h-4 w-4 text-primary" />
                    </motion.div>
                }
              </AnimatePresence>
            </motion.button>
          </div>
          <motion.div
            className="mt-5 p-3 rounded-xl text-sm text-muted-foreground"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <strong className="text-foreground">⚠️ Save this!</strong> Use it to track your order on the{" "}
            <Link href="/order-tracking" className="text-primary hover:underline font-bold">Order Tracking</Link> page.
          </motion.div>
        </motion.div>

        {/* ── WhatsApp notice ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.45, ease: EASE }}
          className="flex items-center gap-3 p-4 rounded-xl mb-5"
          style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)" }}
        >
          <MessageCircle className="h-5 w-5 text-[#25D366] shrink-0" />
          <p className="text-sm text-[#25D366] font-bold">
            We'll WhatsApp you on <strong className="text-white">{order.customerPhone}</strong> to confirm your order shortly.
          </p>
        </motion.div>

        {/* ── Pre-order notice ── */}
        {isPreOrder && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.1 }}
            className="flex items-start gap-3 p-4 rounded-xl mb-5"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}
          >
            <Package className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-yellow-300 uppercase tracking-wider mb-1">Pre-Order Notice</p>
              <p className="text-xs text-muted-foreground">
                Your order contains pre-order items. These will ship on the estimated date. We'll update your status once shipping begins.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Order card ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.15, duration: 0.55, ease: EASE }}
          className="bg-card border border-border rounded-2xl overflow-hidden mb-7"
        >
          <div className="h-0.5 fire-gradient" />
          <div className="p-6">
            <div className="flex justify-between items-center border-b border-border pb-5 mb-5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-sm border border-primary/20">
                  {order.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-0.5">Total</p>
                <p className="font-mono font-black text-2xl text-primary">AED {order.total.toFixed(2)}</p>
              </div>
            </div>

            {order.customerPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2.5">
                <span className="text-primary">📱</span>
                <span>WhatsApp: <strong className="text-foreground">{order.customerPhone}</strong></span>
              </div>
            )}
            {order.customerAddress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{order.customerAddress}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {order.items?.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.3 + i * 0.08, ease: EASE }}
                  className="flex justify-between items-center text-sm py-2.5 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground font-mono text-xs shrink-0">{item.quantity}×</span>
                    <span className="font-bold uppercase truncate">{item.productName}{item.size ? ` (${item.size})` : ""}</span>
                    {item.isPreOrder && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-black uppercase shrink-0">Pre</span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-primary shrink-0 ml-3">AED {(item.price * item.quantity).toFixed(2)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.55, ease: EASE }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Link href="/order-tracking">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button size="lg" variant="outline"
                className="font-black uppercase tracking-widest h-14 px-8 border-border hover:border-primary/50">
                <Search className="mr-2 h-5 w-5" /> Track Order
              </Button>
            </motion.div>
          </Link>
          <Link href="/shop">
            <motion.div whileHover={{ scale: 1.04, filter: "brightness(1.08)" }} whileTap={{ scale: 0.96 }}>
              <Button size="lg"
                className="font-black uppercase tracking-widest h-14 px-10 fire-gradient border-none shadow-[0_0_28px_rgba(255,102,0,0.4)]">
                Keep Shopping <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>

      </div>
    </PageTransition>
  );
}
