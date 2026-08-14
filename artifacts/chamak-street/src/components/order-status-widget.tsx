/* @refresh reset */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, CheckCircle, Clock, Truck, MapPin, Star, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATUS_STEPS = [
  { key: "ordered",          label: "Ordered",          icon: ShoppingBag },
  { key: "confirmed",        label: "Confirmed",        icon: CheckCircle },
  { key: "preparing",        label: "Preparing",        icon: Clock },
  { key: "shipped",          label: "Shipped",          icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered",        label: "Delivered",        icon: Star },
] as const;

/** Map free-form admin status strings → progress step index (0-based) */
function statusToStep(status: string): number {
  const s = status.toLowerCase().trim();
  if (s === "delivered") return 5;
  if (s === "out_for_delivery" || s === "out for delivery" || s === "on the way") return 4;
  if (s === "shipped" || s === "dispatched" || s === "in transit") return 3;
  if (s === "preparing" || s === "processing" || s === "packing") return 2;
  if (s === "confirmed" || s === "approved" || s === "accepted") return 1;
  return 0; // pending / ordered
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  estimatedDelivery?: string | null;
  total: number;
  items: { productName: string; quantity: number }[];
}

export function OrderStatusWidget() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [noOrders, setNoOrders] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`${BASE}/api/orders/my-latest`, { credentials: "include" })
      .then(async (r) => {
        if (!mounted) return;
        if (r.status === 404 || r.status === 204) { setNoOrders(true); setLoading(false); return; }
        if (!r.ok) { setNoOrders(true); setLoading(false); return; }
        const data = await r.json();
        setOrder(data);
        setLoading(false);
      })
      .catch(() => { if (mounted) { setNoOrders(true); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const activeStep = order ? statusToStep(order.status) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl p-4"
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5)" }}>

      {/* Shimmer accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <Package className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">Recent Order</span>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 rounded-full bg-white/8 animate-pulse" style={{ width: `${70 - i * 15}%` }} />
            ))}
          </motion.div>
        )}

        {!loading && noOrders && (
          <motion.div key="empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-3">
            <ShoppingBag className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/50 mb-3">You Don't Have Any Orders Yet</p>
            <Link href={`${BASE}/shop`}>
              <button className="px-4 py-1.5 rounded-full bg-orange-500 text-black text-xs font-bold hover:bg-orange-400 transition-colors">
                Start Shopping
              </button>
            </Link>
          </motion.div>
        )}

        {!loading && order && (
          <motion.div key="order" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Order number + total */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{order.orderNumber}</span>
              <span className="text-xs text-white/40">AED {order.total.toFixed(0)}</span>
            </div>

            {/* Progress steps */}
            <div className="relative">
              {/* Track */}
              <div className="absolute top-3 left-3 right-3 h-0.5 bg-white/10 rounded-full" />
              {/* Fill */}
              <motion.div
                className="absolute top-3 left-3 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                initial={{ width: "0%" }}
                animate={{ width: `${(activeStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
              {/* Step dots */}
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= activeStep;
                  const active = idx === activeStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ minWidth: 0 }}>
                      <motion.div
                        animate={{ scale: active ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.6, delay: idx * 0.05, repeat: active ? Infinity : 0, repeatDelay: 2 }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500 ${
                          done
                            ? active
                              ? "bg-orange-500 ring-2 ring-orange-400/40 ring-offset-1 ring-offset-black"
                              : "bg-orange-500/80"
                            : "bg-white/10"
                        }`}>
                        <step.icon className={`w-3 h-3 ${done ? "text-black" : "text-white/30"}`} />
                      </motion.div>
                      <span className={`text-[9px] font-medium leading-tight text-center ${
                        active ? "text-orange-400" : done ? "text-white/60" : "text-white/25"
                      }`} style={{ maxWidth: 36, wordBreak: "break-word" }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estimated delivery */}
            {order.estimatedDelivery && (
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="text-xs text-white/50">Est. delivery: <span className="text-white/80">{order.estimatedDelivery}</span></span>
              </div>
            )}

            {/* Items summary */}
            {order.items.length > 0 && (
              <p className="text-xs text-white/35 truncate">
                {order.items[0].productName}{order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
              </p>
            )}

            <Link href={`${BASE}/order/${order.id}`}>
              <button className="w-full mt-1 py-1.5 rounded-xl text-xs font-semibold text-orange-400 border border-orange-500/25 hover:bg-orange-500/10 transition-colors">
                View Full Order →
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
