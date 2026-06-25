import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, XCircle, Info } from "lucide-react";

type TrackingEvent = { id: number; orderId: number; status: string; note: string | null; createdAt: string };
type OrderItem = { id: number; productId: number; productName: string; price: number; quantity: number; size: string | null; isPreOrder: boolean };
type TrackingResult = {
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  status: string;
  courierName: string | null;
  estimatedDelivery: string | null;
  total: number;
  trackingNote: string | null;
  createdAt: string;
  items: OrderItem[];
  events: TrackingEvent[];
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Package; color: string }> = {
  pending: { label: "Order Placed", icon: Clock, color: "text-yellow-400" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-400" },
  packed: { label: "Packed", icon: Package, color: "text-purple-400" },
  shipped: { label: "Shipped", icon: Truck, color: "text-primary" },
  out_for_delivery: { label: "Out for Delivery", icon: Truck, color: "text-primary" },
  delivered: { label: "Delivered", icon: CheckCircle2, color: "text-green-400" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-destructive" },
};

const TIMELINE_STEPS = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"];

function getStatusIndex(status: string) {
  return TIMELINE_STEPS.indexOf(status);
}

export default function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!orderNumber.trim() || !phone.trim()) {
      setError("Please enter both order number and phone number.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`,
        { credentials: "include" }
      );
      if (res.status === 404) {
        setError("Order not found. Please check your order number and phone number.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const data = await res.json() as TrackingResult;
      setResult(data);
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusIdx = result ? getStatusIndex(result.status) : -1;
  const statusCfg = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.pending) : null;

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-14"
        >
          <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-4">Chamak Street</p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
            Track Your <span className="gradient-text">Order</span>
          </h1>
          <p className="text-muted-foreground text-lg">Enter your order number and phone number to see your order status.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border/60 rounded-2xl p-8 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px fire-gradient opacity-60" />
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-2 block">Order Number</label>
              <Input
                placeholder="CHM-100284"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="h-12 bg-background border-border/60 focus-visible:ring-primary font-mono text-lg"
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-2 block">WhatsApp / Phone Number</label>
              <Input
                placeholder="+971 50 000 0000"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 bg-background border-border/60 focus-visible:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3"
                >
                  <Info className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleTrack}
                disabled={loading}
                className="w-full h-13 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.55)] transition-shadow"
                size="lg"
              >
                {loading ? (
                  <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                    Searching...
                  </motion.span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="h-5 w-5" /> Track Order
                  </span>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence>
          {result && statusCfg && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              {/* Header Card */}
              <div className="bg-card border border-border/60 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px fire-gradient" />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-1">Order Number</p>
                    <p className="font-mono font-black text-2xl text-primary">{result.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-1">Total</p>
                    <p className="font-mono font-black text-xl">AED {result.total.toFixed(2)}</p>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-black uppercase tracking-wider ${statusCfg.color} border-current/30 bg-current/10`}>
                  <statusCfg.icon className="h-4 w-4" />
                  {statusCfg.label}
                </div>

                {result.estimatedDelivery && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Estimated delivery: <strong className="text-foreground">{result.estimatedDelivery}</strong></span>
                  </div>
                )}
                {result.courierName && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>Courier: <strong className="text-foreground">{result.courierName}</strong></span>
                  </div>
                )}
                {result.customerAddress && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{result.customerAddress}</span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {result.status !== "cancelled" && (
                <div className="bg-card border border-border/60 rounded-2xl p-6">
                  <h3 className="text-sm font-black uppercase tracking-wider mb-6">Order Timeline</h3>
                  <div className="relative">
                    {TIMELINE_STEPS.map((step, i) => {
                      const cfg = STATUS_CONFIG[step];
                      const Icon = cfg.icon;
                      const isDone = i <= statusIdx;
                      const isCurrent = i === statusIdx;
                      return (
                        <div key={step} className="flex items-start gap-4 mb-5 last:mb-0">
                          <div className="relative flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isDone ? "border-primary bg-primary/20" : "border-border bg-card"}`}>
                              <Icon className={`h-3.5 w-3.5 ${isDone ? cfg.color : "text-muted-foreground/30"}`} />
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div className={`w-px h-5 mt-1 ${i < statusIdx ? "bg-primary/50" : "bg-border"}`} />
                            )}
                          </div>
                          <div className="pt-1">
                            <p className={`text-sm font-bold ${isDone ? "text-foreground" : "text-muted-foreground/40"}`}>
                              {cfg.label}
                              {isCurrent && <span className="ml-2 text-xs text-primary uppercase tracking-widest">← Current</span>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tracking Events */}
              {result.events.length > 0 && (
                <div className="bg-card border border-border/60 rounded-2xl p-6">
                  <h3 className="text-sm font-black uppercase tracking-wider mb-5">Tracking Updates</h3>
                  <div className="space-y-4">
                    {[...result.events].reverse().map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-start gap-4 py-3 border-b border-border/30 last:border-0"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold capitalize">{event.status.replace(/_/g, " ")}</p>
                          {event.note && <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>}
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {new Date(event.createdAt).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="bg-card border border-border/60 rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-wider mb-5">Items Ordered</h3>
                <div className="space-y-3">
                  {result.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-border/30 last:border-0">
                      <div>
                        <span className="font-bold">{item.productName}</span>
                        {item.size && <span className="text-muted-foreground ml-2">({item.size})</span>}
                        {item.isPreOrder && (
                          <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase">Pre-Order</span>
                        )}
                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-mono font-bold text-primary">AED {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
