/* @refresh reset */
import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, ShoppingBag, MessageCircle, MapPin, Phone, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
const BASE=import.meta.env.BASE_URL?.replace(/\/$/,"")||"";
import { useSettings } from "@/lib/use-settings";

/* ── Confetti ────────────────────────────────────────────────────────────── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rotation: number; rotationV: number;
  shape: "rect" | "circle" | "star"; opacity: number; gravity: number;
}
const COLORS = ["#b79cff","#b79cff","#ffffff","#c4b5fd","#b79cff","#ddd6fe"];
function mkParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 8 + Math.random() * 18;
  return { x: cx + (Math.random() - 0.5) * 120, y: cy + (Math.random() - 0.5) * 40,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
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
function useConfetti(enabled:boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const run = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const cx = canvas.width / 2, cy = canvas.height * 0.2;
    const particles: Particle[] = [];
    for (let i = 0; i < 220; i++) particles.push(mkParticle(cx, cy));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue; alive = true;
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
        p.vx *= 0.992; p.rotation += p.rotationV;
        p.opacity -= frame > 90 ? 0.016 : 0.004;
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
    if(!enabled||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const t = setTimeout(run, 300);
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); };
  }, [run,enabled]);
  return canvasRef;
}

/* ── Delivery label map ─────────────────────────────────────────────────── */
const DELIVERY_LABEL: Record<string, string> = {
  standard: "Standard Delivery",
  express:  "Express Delivery",
  priority: "Priority Delivery",
};

/* ── Main component ─────────────────────────────────────────────────────── */
export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const orderId = Number(params?.id);
  const settings = useSettings();
  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { queryKey: getGetOrderQueryKey(orderId), enabled: !!orderId && !isNaN(orderId) },
  });
  const qc=useQueryClient();
  const online=order?.paymentMethod==="ziina";
  const verification=useQuery<{status:string;orderStatus:string}>({
    queryKey:["order-payment",orderId],enabled:online,
    queryFn:async()=>{const r=await fetch(`${BASE}/api/payments/${orderId}/status`,{credentials:"include"});const data=await r.json();if(!r.ok)throw new Error(data.error||"Payment verification unavailable.");return data;},
    retry:false,refetchInterval:q=>q.state.data?.status==="pending"?10000:false,
  });
  const confirmed=!online||verification.data?.status==="paid"&&verification.data.orderStatus!=="cancelled";
  const canvasRef=useConfetti(Boolean(order&&confirmed&&order.status!=="cancelled"));
  useEffect(()=>{if(online&&verification.data&&verification.data.status!=="pending")qc.invalidateQueries({queryKey:getGetOrderQueryKey(orderId)});},[verification.data?.status,online,orderId,qc]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-2xl font-black uppercase text-muted-foreground">Order not found</p>
        <Link href="/shop"><button className="text-primary font-bold hover:underline">← Back to Shop</button></Link>
      </div>
    );
  }
  if(online&&!confirmed){
    const terminal=["failed","canceled"].includes(verification.data?.status??"");
    return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-3xl font-black text-primary">{terminal?"Payment not completed":verification.data?.orderStatus==="cancelled"?"Order needs review":"Checking your payment"}</h1>
      <p className="text-white/70">{verification.isError?(verification.error as Error).message:terminal?"Your order is cancelled and its reserved stock has been released. No successful payment has been confirmed.":verification.data?.orderStatus==="cancelled"?"Payment was received, but this order requires support review.":"Your order will be confirmed only after the payment provider verifies the payment. A return link is not proof of payment."}</p>
      {!terminal&&<button className="rounded-full border border-primary px-5 py-3 text-sm" disabled={verification.isFetching} onClick={()=>verification.refetch()}>{verification.isFetching?"Checking…":"Check payment again"}</button>}
      <Link href="/support" className="text-primary">Contact support</Link><Link href="/shop" className="text-sm text-white/60">Back to shop</Link>
    </main>;
  }
  if(order.status==="cancelled")return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-5 text-center"><h1 className="text-3xl font-black text-primary">Order cancelled</h1><p className="text-white/70">This order has been cancelled. Contact support if you need help.</p><Link href="/support">Contact support</Link><Link href="/shop">Back to shop</Link></main>;

  const deliveryCharge = Number((order as any).deliveryCharge ?? 25);
  const tip           = Number((order as any).tip ?? 0);
  const subtotal      = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;
  const total         = Number(order.total);
  const deliveryMethod = (order as any).deliveryMethod ?? "standard";
  const orderNumber   = (order as any).orderNumber||`IMG-${order.id}`;
  const wa            = (settings.support_whatsapp ?? "").replace(/\D/g, "");
  const waText        = encodeURIComponent(
    `Hi IMAGINATE. I just placed an order and wanted to confirm.\n\nOrder: *#${orderNumber}*\nName: ${order.customerName}\nPhone: ${order.customerPhone}`
  );

  const SPRING = { type: "spring" as const, stiffness: 260, damping: 26 };

  return (
    <div className="relative min-h-screen py-8 px-4 overflow-x-hidden" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(183,156,255,0.06) 0%, transparent 70%)" }}>
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" aria-hidden />

      <div className="relative max-w-sm mx-auto space-y-4">

        {/* ── Hero tick ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.05 }}
          className="flex flex-col items-center pt-8 pb-4 text-center">
          {/* Circle with checkmark */}
          <div className="relative mb-6">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.2 }}
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #b79cff 0%, #b79cff 100%)",
                boxShadow: "0 0 60px rgba(183,156,255,0.45), 0 0 120px rgba(183,156,255,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}>
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 400, damping: 20 }}>
                <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
              </motion.div>
            </motion.div>
            {/* Ripple rings */}
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                className="absolute inset-0 rounded-full border border-primary/25"
                animate={{ scale: [1, 2.8 + i * 0.4], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, delay: 0.6 + i * 0.7 }} />
            ))}
          </div>

          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-4xl font-black uppercase tracking-tight leading-none">
            Order Placed,
          </motion.h1>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
            className="text-4xl font-black uppercase tracking-tight text-primary leading-none mt-1">
            Thanks! 🎉
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-muted-foreground text-sm mt-3">
            Track your order or contact support if you need help.
          </motion.p>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75 }}
            className="mt-2 px-3 py-1.5 rounded-lg border border-primary/30 font-mono font-black text-primary text-sm tracking-widest"
            style={{ background: "rgba(183,156,255,0.08)" }}>
            #{orderNumber}
          </motion.div>
        </motion.div>

        {/* ── Items ordered ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.6 }}
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.035)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>
          <div className="px-4 pt-4 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-3 h-3" /> Items Ordered
            </p>
            <div className="space-y-3.5">
              {order.items?.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.06 }}
                  className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate leading-snug">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                         Qty {item.quantity}{item.size ? ` · ${item.size}` : ""}{(item as any).color ? ` · ${(item as any).color}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono font-black text-sm shrink-0 text-primary">
                     AED {(item.price * item.quantity).toFixed(2)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="px-4 pb-4 mt-3 pt-3 border-t border-white/8 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">AED {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery</span>
              <span className="font-mono text-primary">AED {deliveryCharge.toFixed(2)}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tip</span>
                <span className="font-mono text-primary">AED {tip.toFixed(2)}</span>
              </div>
            )}
            {Number((order as any).discountAmount)>0&&<div className="flex justify-between text-primary"><span>Discount{(order as any).couponCode?` (${(order as any).couponCode})`:""}</span><span className="font-mono">− AED {Number((order as any).discountAmount).toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-base pt-2 border-t border-white/8">
              <span>Total</span>
              <span className="font-mono text-primary">AED {total.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Order info ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.72 }}
          className="rounded-2xl border border-white/10 p-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Info</p>
          {[
            { icon: User,       label: "Name",     value: order.customerName },
            { icon: Phone,      label: "Phone",    value: order.customerPhone },
            { icon: MapPin,     label: "Address",  value: (order as any).customerAddress },
            { icon: CheckCircle2, label: "Delivery", value: DELIVERY_LABEL[deliveryMethod] ?? deliveryMethod },
          ].map(({ icon: Icon, label, value }) => value && (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold leading-snug">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── CTAs ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.82 }}
          className="space-y-3 pb-8">
          {wa && (
            <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 8px 32px rgba(37,211,102,0.25)" }}>
              <MessageCircle className="w-4 h-4" />
              Contact on WhatsApp
            </a>
          )}
          <Link href="/shop">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wide border border-white/12 hover:border-white/25 hover:bg-white/5 transition-all"
              style={{ touchAction: "manipulation" }}>
              ← Go Back to Shop
            </motion.button>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
