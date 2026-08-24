/* @refresh reset */
import { useState, useEffect, useRef } from "react";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedInput } from "@/components/animated-input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Lock, ArrowRight, MessageCircle, Truck, X, Zap, Clock, Star, Tag, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { trackCheckout, trackOrder } from "@/lib/use-visitor-tracking";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Delivery options ─────────────────────────────────────────────────────────
type DeliveryOptionDef = {
  id: "standard" | "express" | "priority";
  label: string;
  detail: string;
  price: number;
  icon: typeof Truck;
  badge: string | null;
};

const BASE_DELIVERY_OPTIONS: DeliveryOptionDef[] = [
  { id: "standard", label: "Standard Delivery", detail: "2–4 business days", price: 20, icon: Truck, badge: null },
  { id: "express",  label: "Express Delivery",  detail: "1–2 business days", price: 30, icon: Clock, badge: null },
  { id: "priority", label: "FirstPick Priority", detail: "Same Day / Next Day", price: 40, icon: Zap, badge: "FASTEST" },
];

type DeliveryMethod = "standard" | "express" | "priority";
type TipOption = "none" | "5" | "10" | "custom";
type PaymentMethod = "cod" | "ziina";

// ── Checkout schema ──────────────────────────────────────────────────────────
const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z.string().min(7, "Enter a valid WhatsApp number"),
  customerAddress: z.string().min(5, "Address is required"),
});
type CheckoutValues = z.infer<typeof checkoutSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function postOrder(body: Record<string, unknown>): Promise<{ id: number; orderNumber?: string | null }> {
  const res = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { id: number; orderNumber?: string | null; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Order failed");
  return data;
}

async function createZiinaCheckout(
  values: CheckoutValues,
  deliveryMethod: DeliveryMethod,
  tip: number,
  couponCode?: string,
): Promise<string> {
  const res = await fetch(`${BASE}/api/payments/ziina-checkout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, deliveryMethod, tip, couponCode }),
  });
  const result = await res.json() as { redirectUrl?: string; error?: string };
  if (!res.ok || !result.redirectUrl) throw new Error(result.error ?? "Ziina payment link could not be created");
  return result.redirectUrl;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Checkout() {
  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [tipOption, setTipOption] = useState<TipOption>("none");
  const [customTipRaw, setCustomTipRaw] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirectingToZiina, setIsRedirectingToZiina] = useState(false);
  const [cartTracked, setCartTracked] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionDef[]>(BASE_DELIVERY_OPTIONS);
  const checkoutTracked = useRef(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponData, setCouponData] = useState<{ code: string; discountAmount: number; discountType: string; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCouponCode = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponError(null);
    try {
      const res = await fetch(`${BASE}/api/coupons/validate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), orderTotal: subtotal }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error ?? "Invalid coupon");
      setCouponData(data);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Invalid coupon code");
      setCouponData(null);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => { setCouponData(null); setCouponInput(""); setCouponError(null); };

  // Fetch admin-configured delivery prices with fallback to defaults
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${BASE}/api/settings`, { credentials: "include", signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error("settings fetch failed"); return r.json(); })
      .then((s: Record<string, string>) => {
        setDeliveryOptions(BASE_DELIVERY_OPTIONS.map((opt) => {
          const key = `delivery_${opt.id}_price`;
          const v = Number(s[key]);
          return (Number.isFinite(v) && v > 0) ? { ...opt, price: v } : opt;
        }));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackCheckout();
    }
  }, []);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", customerPhone: "", customerAddress: "" },
  });

  if (isLoading) return <div className="p-20 text-center font-bold uppercase">Loading...</div>;
  if (!cart || cart.items.length === 0) return <Redirect href="/cart" />;

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.total;
  const selectedDelivery = deliveryOptions.find((o) => o.id === deliveryMethod) ?? deliveryOptions[0]!;
  const deliveryCharge = selectedDelivery.price;
  const tipAmount =
    tipOption === "none" ? 0
    : tipOption === "custom" ? Math.max(0, parseFloat(customTipRaw) || 0)
    : parseInt(tipOption, 10);
  const discountAmount = couponData?.discountAmount ?? 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge + tipAmount - discountAmount);

  const trackAbandonedCart = (name: string, phone: string) => {
    if (cartTracked || !cart || cart.items.length === 0) return;
    const cartData = JSON.stringify(cart.items.map((i) => ({ name: i.productName, qty: i.quantity, price: i.price })));
    fetch(`${BASE}/api/abandoned-carts/track`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name, customerPhone: phone, cartData, totalValue: cart.total, itemCount: cart.items.length }),
    }).catch(() => {});
    setCartTracked(true);
  };

  const createStandardOrder = async (data: CheckoutValues) => {
    setPaymentError(null);
    setIsSubmitting(true);
    try {
      const order = await postOrder({
        ...data,
        couponCode: couponData?.code ?? undefined,
        paymentMethod: "cod",
        deliveryMethod,
        tip: tipAmount,
      });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      trackOrder(`FP${String(order.id).padStart(4, "0")}`);
      setLocation(`/order/${order.id}`);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Order failed");
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: CheckoutValues) => {
    if (busy) return; // prevent double-submit
    setPaymentError(null);
    if (paymentMethod === "ziina") {
      setIsRedirectingToZiina(true);
      try {
        const redirectUrl = await createZiinaCheckout(data, deliveryMethod, tipAmount, couponData?.code);
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        window.location.assign(redirectUrl);
      } catch (err) {
        setIsRedirectingToZiina(false);
        setPaymentError(err instanceof Error ? err.message : "Ziina payment failed to start");
      }
      return;
    }
    createStandardOrder(data);
  };

  const busy = isSubmitting || isRedirectingToZiina;

  return (
    <>
    <PageTransition>
      {/* WhatsApp Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative z-50 bg-[#25D366] text-black px-4 py-2.5 pr-12 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-center"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>Use a working WhatsApp number — we'll confirm your order on WhatsApp</span>
            <button onClick={() => setShowBanner(false)} className="absolute right-0 top-0 h-full w-12 flex items-center justify-center hover:opacity-70 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          className="flex items-center gap-3 mb-12"
          initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        >
          <Lock className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">Secure Checkout</h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* ── Left column: form ── */}
          <div className="space-y-8">
            <motion.h2
              className="text-lg font-black uppercase tracking-wider pb-2 border-b border-border"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            >
              Shipping Details
            </motion.h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Full Name</FormLabel>
                      <FormControl>
                        <AnimatedInput placeholder="John Doe" className="glass-input h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </motion.div>

                {/* Phone */}
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}>
                  <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground flex items-center gap-2">
                        <MessageCircle className="h-3 w-3 text-[#25D366]" /> WhatsApp Number
                      </FormLabel>
                      <FormControl>
                        <AnimatedInput
                          type="tel" placeholder="+971 50 000 0000" className="glass-input h-11"
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            const name = form.getValues("customerName");
                            if (name && e.target.value) trackAbandonedCart(name, e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </motion.div>

                {/* Address */}
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.29 }}>
                  <FormField control={form.control} name="customerAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Building, Street, Area, City, UAE" className="glass-input min-h-[90px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </motion.div>

                {/* ── Delivery Method ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="space-y-3">
                  <p className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Delivery Method</p>
                  <div className="space-y-2.5">
                    {deliveryOptions.map((opt) => {
                      const Icon = opt.icon;
                      const selected = deliveryMethod === opt.id;
                      const isPriority = opt.id === "priority";
                      const showGlow = selected && isPriority;

                      return (
                        <div key={opt.id} className="relative">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod(opt.id)}
                            className={`relative w-full flex items-center gap-3 p-4 text-left transition-all overflow-hidden ${
                              showGlow
                                ? "rounded-xl border-2 border-orange-500/50"
                                : selected
                                ? "rounded-xl border-2 border-primary glass"
                                : "rounded-xl border-2 border-border/40 glass-sm hover:border-primary/40"
                            }`}
                          >
                            {/* Shine on selected (non-priority) */}
                            {selected && !showGlow && (
                              <div className="absolute inset-0 pointer-events-none glass-shine" />
                            )}
                            {/* Priority — slow-drifting orange & yellow aurora inside the button */}
                            {showGlow && (
                              <>
                                {/* Dark base */}
                                <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(10,6,2,0.82)" }} />
                                {/* Orange blob — drifts left to right */}
                                <motion.div
                                  className="absolute inset-0 pointer-events-none"
                                  animate={{ x: ["0%", "35%", "5%", "0%"], y: ["0%", "20%", "-15%", "0%"] }}
                                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                                  style={{
                                    background: "radial-gradient(ellipse 90px 65px at 15% 55%, rgba(255,100,0,0.6), transparent 70%)",
                                    filter: "blur(6px)",
                                  }}
                                />
                                {/* Yellow blob — drifts right to left */}
                                <motion.div
                                  className="absolute inset-0 pointer-events-none"
                                  animate={{ x: ["0%", "-30%", "15%", "0%"], y: ["0%", "-20%", "30%", "0%"] }}
                                  transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                  style={{
                                    background: "radial-gradient(ellipse 80px 55px at 78% 45%, rgba(255,205,0,0.55), transparent 70%)",
                                    filter: "blur(8px)",
                                  }}
                                />
                                {/* Amber centre — slow drift */}
                                <motion.div
                                  className="absolute inset-0 pointer-events-none"
                                  animate={{ x: ["0%", "12%", "-8%", "0%"], y: ["0%", "-12%", "18%", "0%"], opacity: [0.3, 0.6, 0.3] }}
                                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                                  style={{
                                    background: "radial-gradient(ellipse 65px 45px at 50% 50%, rgba(255,155,0,0.5), transparent 70%)",
                                    filter: "blur(10px)",
                                  }}
                                />
                              </>
                            )}
                            <div className={`relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-muted-foreground"}`}>
                              {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <Icon className={`relative h-5 w-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="relative flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black uppercase tracking-wide text-sm">{opt.label}</p>
                                {opt.badge && (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(255,102,0,0.2)", color: "#ff6600", border: "1px solid rgba(255,102,0,0.4)" }}>
                                    ⚡ {opt.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{opt.detail}</p>
                            </div>
                            <div className={`relative font-mono font-black text-sm shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                              AED {opt.price}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* ── Tip ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43 }} className="space-y-3">
                  <div>
                    <p className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Add a Tip</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">100% goes to our packing team</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(["none", "5", "10", "custom"] as const).map((opt) => {
                      const label = opt === "none" ? "No Tip" : opt === "custom" ? "Custom" : `AED ${opt}`;
                      const selected = tipOption === opt;
                      return (
                        <button
                          key={opt} type="button"
                          onClick={() => setTipOption(opt)}
                          className={`py-2.5 rounded-xl border font-black text-xs uppercase tracking-wide transition-all ${
                            selected
                              ? "border-primary glass text-primary"
                              : "border-border/40 glass-sm text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {opt === "5" ? (
                            <span className="flex flex-col items-center gap-0.5">
                              <Star className="h-3 w-3" />
                              <span>AED 5</span>
                            </span>
                          ) : label}
                        </button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    {tipOption === "custom" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 glass-sm border border-border/40 rounded-xl px-3 py-2.5 mt-1">
                          <span className="text-xs font-bold text-muted-foreground">AED</span>
                          <input
                            type="number" min="1" max="500" step="1"
                            placeholder="Enter amount"
                            value={customTipRaw}
                            onChange={(e) => setCustomTipRaw(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-bold"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ── Payment Method ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }} className="space-y-3">
                  <p className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Payment Method</p>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button" onClick={() => setPaymentMethod("cod")}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === "cod" ? "border-primary glass" : "border-border/40 glass-sm hover:border-primary/40"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "cod" ? "border-primary" : "border-muted-foreground"}`}>
                        {paymentMethod === "cod" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <Truck className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-black uppercase tracking-wider text-sm">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                      </div>
                    </button>
                    <button
                      type="button" onClick={() => setPaymentMethod("ziina")}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === "ziina" ? "border-primary glass" : "border-border/40 glass-sm hover:border-primary/40"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "ziina" ? "border-primary" : "border-muted-foreground"}`}>
                        {paymentMethod === "ziina" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="bg-[#6C4CFF] text-white font-black text-xs px-2 py-1 rounded shrink-0">ziina</div>
                        <div>
                          <p className="font-black uppercase tracking-wider text-sm">Ziina Online Payment</p>
                          <p className="text-xs text-muted-foreground">Pay securely online through Ziina</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  {paymentError && (
                    <p className="text-xs font-bold text-destructive">{paymentError}</p>
                  )}
                </motion.div>

                {/* Submit */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.57 }} className="pt-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit" size="lg"
                      className="w-full h-14 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.55)] transition-all"
                      disabled={busy}
                    >
                      {busy ? (
                        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          {isRedirectingToZiina ? "Opening Ziina..." : "Processing..."}
                        </motion.span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Place Order · AED {grandTotal.toFixed(2)} <ArrowRight className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </Form>
          </div>

          {/* ── Right column: order summary ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.45 }}>
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-black uppercase tracking-wider mb-6 pb-4 border-b border-white/10">Order Summary</h2>

              {/* Cart items */}
              <div className="space-y-4 mb-6 max-h-[260px] overflow-y-auto pr-1 scrollbar-hide">
                {cart.items.map((item, i) => {
                  const primaryMedia = getPrimaryProductMedia(item.productImageUrl);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      className="flex justify-between items-start gap-4"
                    >
                      <div className="flex gap-3">
                        <div className="w-14 h-14 bg-muted rounded-lg border border-white/8 overflow-hidden shrink-0">
                          {primaryMedia && (
                            primaryMedia.type === "video" ? (
                              <video src={primaryMedia.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              <img src={primaryMedia.url} alt={item.productName} className="w-full h-full object-cover" />
                            )
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm uppercase leading-tight line-clamp-2">{item.productName}</h4>
                          <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}{item.size ? ` | Size: ${item.size}` : ""}</p>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-sm shrink-0">AED {(item.price * item.quantity).toFixed(2)}</div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Coupon input */}
              <div className="border-t border-white/10 pt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Promo Code</p>
                {couponData ? (
                  <div className="flex items-center justify-between glass-sm border border-green-500/30 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-green-400 tracking-widest">{couponData.code}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {couponData.discountType === "percent" ? `${couponData.discountValue}% off` : `AED ${couponData.discountValue.toFixed(0)} off`}
                        </p>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 glass-sm border border-border/40 rounded-xl px-3 h-10">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text" placeholder="Enter coupon code" value={couponInput}
                        onChange={e => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && applyCouponCode()}
                        className="flex-1 bg-transparent outline-none text-xs font-mono font-bold tracking-widest placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyCouponCode} disabled={couponLoading || !couponInput.trim()}
                      className="px-3 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                    >
                      {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive font-bold">{couponError}</p>}
              </div>

              {/* Price breakdown */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-bold">AED {subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {deliveryMethod === "priority" ? <Zap className="h-3 w-3 text-primary" /> : <Truck className="h-3 w-3" />}
                    {selectedDelivery.label}
                  </span>
                  <span className="font-mono font-bold text-primary">AED {deliveryCharge.toFixed(2)}</span>
                </div>

                {/* Coupon discount line */}
                <AnimatePresence>
                  {discountAmount > 0 && (
                    <motion.div
                      key="coupon-line"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3 text-green-400" /> Coupon <span className="text-green-400 font-mono font-bold text-xs">{couponData?.code}</span>
                      </span>
                      <span className="font-mono font-bold text-green-400">−AED {discountAmount.toFixed(2)}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {tipAmount > 0 && (
                    <motion.div
                      key="tip-line"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400" /> Tip
                      </span>
                      <span className="font-mono font-bold text-yellow-400">AED {tipAmount.toFixed(2)}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="border-t border-white/10 pt-3 flex justify-between items-end">
                  <span className="font-black uppercase tracking-wider">Total</span>
                  <motion.span
                    key={grandTotal}
                    initial={{ scale: 1.08, color: "#ff6600" }} animate={{ scale: 1, color: "#ff6600" }}
                    className="font-mono text-2xl font-black text-primary"
                  >
                    AED {grandTotal.toFixed(2)}
                  </motion.span>
                </div>

                {deliveryMethod === "priority" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-2.5 rounded-lg glass-orange"
                  >
                    <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-xs text-primary font-bold">Priority delivery — same day or next day!</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
    </>
  );
}
