import { useGetCart, useUpdateCartItem, useRemoveCartItem, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, ArrowLeft, Truck, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Cart() {
  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

  const handleUpdateQuantity = (id: number, current: number, delta: number) => {
    const next = current + delta;
    if (next < 1) return;
    setPendingItemId(id);
    updateItem.mutate({ id, data: { quantity: next } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }); setPendingItemId(null); },
      onError: () => { setPendingItemId(null); toast({ title: "Could not update quantity", description: "Please try again.", variant: "destructive" }); },
    });
  };

  const handleRemove = (id: number) => {
    setRemovingItemId(id);
    removeItem.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }); setRemovingItemId(null); },
      onError: () => { setRemovingItemId(null); toast({ title: "Could not remove item", description: "Please try again.", variant: "destructive" }); },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 space-y-6">
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: n * 0.08, ease: EASE }}
            className="h-28 bg-muted rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!cart || (cart?.items ?? []).length === 0) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-36 text-center max-w-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="space-y-6"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto"
            >
              <ShoppingBag className="h-9 w-9 text-white/25" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Cart is Empty</h1>
              <p className="text-white/40 text-sm">You haven't added any heat yet.</p>
            </div>
            <Link href="/shop">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <Button size="lg" className="w-full font-black uppercase tracking-widest fire-gradient border-none h-13 shadow-[0_0_24px_rgba(255,102,0,0.35)]">
                  Browse the Shop <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/" className="block text-xs text-white/30 hover:text-white/60 transition-colors font-bold uppercase tracking-widest mt-6">
              ← Back to Home
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  const subtotal = cart.total;

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-10 max-w-6xl">

        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter">Your Cart</h1>
            <p className="text-white/40 text-sm mt-1">{cart.items.length} item{cart.items.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href="/shop">
            <motion.button
              whileHover={{ x: -3 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="hidden sm:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors border border-white/10 hover:border-white/25 px-4 py-2.5 rounded-full"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
            </motion.button>
          </Link>
        </motion.div>

        {/* Delivery notice */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: EASE }}
          className="mb-6 p-4 rounded-xl glass-liquid flex items-center gap-3"
        >
          <Truck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-white/70">
            Delivery from <span className="text-primary font-black">AED 20</span> · Choose your speed at checkout
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence initial={false}>
              {cart.items.map((item, i) => {
                const primaryMedia = getPrimaryProductMedia(item.productImageUrl);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -60, scale: 0.94, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }}
                    className="flex gap-4 p-4 glass rounded-2xl relative group hover:border-primary/25 transition-all duration-300 glass-shimmer"
                    data-testid={`cart-item-${item.id}`}
                  >
                    {/* Thumbnail */}
                    <Link href={`/product/${item.productId}`} className="shrink-0">
                      <motion.div
                        className="w-22 h-22 sm:w-26 sm:h-26 bg-muted rounded-lg overflow-hidden border border-border/50"
                        whileHover={{ scale: 1.04 }}
                        transition={{ type: "spring", stiffness: 320, damping: 24 }}
                        style={{ width: 88, height: 88 }}
                      >
                        {primaryMedia ? (
                          primaryMedia.type === "video" ? (
                            <video src={primaryMedia.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <img src={primaryMedia.url} alt={item.productName} className="w-full h-full object-cover hover:scale-110 transition-transform duration-400" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">—</div>
                        )}
                      </motion.div>
                    </Link>

                    {/* Info */}
                    <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0 pr-8">
                      <div>
                        <Link href={`/product/${item.productId}`} className="font-black text-sm hover:text-primary transition-colors line-clamp-2 uppercase tracking-wide">
                          {item.productName}
                        </Link>
                        {item.size && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Size: <span className="font-bold text-white/70 bg-white/8 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{item.size}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-3">
                        {/* Qty controls */}
                        <div className="flex items-center h-11 glass-qty rounded-xl overflow-hidden">
                          <motion.button
                            whileTap={{ scale: 0.75 }}
                            whileHover={{ backgroundColor: "rgba(255,102,0,0.1)" }}
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                            className="w-11 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                            disabled={pendingItemId === item.id}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </motion.button>
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={item.quantity}
                              initial={{ opacity: 0, y: -5, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.8 }}
                              transition={{ duration: 0.14, ease: EASE }}
                              className="w-8 text-center font-black font-mono text-sm"
                            >
                              {item.quantity}
                            </motion.div>
                          </AnimatePresence>
                          <motion.button
                            whileTap={{ scale: 0.75 }}
                            whileHover={{ backgroundColor: "rgba(255,102,0,0.1)" }}
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                            className="w-11 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                            disabled={pendingItemId === item.id}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </motion.button>
                        </div>

                        <motion.div
                          key={`${item.id}-${item.quantity}`}
                          initial={{ scale: 1.18, color: "#ffcc00" }}
                          animate={{ scale: 1, color: "#ff6600" }}
                          transition={{ duration: 0.28, ease: EASE }}
                          className="font-mono font-black text-base text-primary"
                        >
                          AED {(item.price * item.quantity).toFixed(2)}
                        </motion.div>
                      </div>
                    </div>

                    {/* Remove — 44×44 touch target */}
                    <motion.button
                      whileHover={{ scale: 1.15, color: "#ef4444" }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 420, damping: 20 }}
                      onClick={() => handleRemove(item.id)}
                      disabled={removingItemId === item.id}
                      className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-muted-foreground/60 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      aria-label="Remove item"
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Continue shopping link */}
            <Link href="/shop">
              <motion.button
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors mt-2 pt-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
              </motion.button>
            </Link>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <motion.div
              className="glass rounded-2xl p-6 sticky top-[130px] glass-shimmer"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.55, ease: EASE }}
            >
              <h2 className="text-lg font-black uppercase tracking-wider mb-5 pb-4 border-b border-white/10">Order Summary</h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-bold">AED {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-bold text-white/50">At checkout</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-end">
                  <span className="font-black uppercase tracking-wider text-sm">Subtotal</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={subtotal}
                      initial={{ opacity: 0, y: -8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.26, ease: EASE }}
                      className="font-mono text-2xl font-black text-primary"
                    >
                      AED {subtotal.toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02, filter: "brightness(1.08)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <Button
                  size="lg"
                  className="w-full h-13 font-black uppercase tracking-widest flex items-center justify-center gap-2 fire-gradient border-none shadow-[0_0_24px_rgba(255,102,0,0.35)] hover:shadow-[0_0_48px_rgba(255,102,0,0.55)] transition-shadow duration-300"
                  onClick={() => setLocation("/checkout")}
                  data-testid="button-checkout"
                >
                  Secure Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>

              {/* Trust badges */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { icon: Shield, label: "Secure Pay" },
                  { icon: Truck, label: "Fast Ship" },
                  { icon: Zap, label: "COD Avail." },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl glass-sm">
                    <Icon className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/30">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
