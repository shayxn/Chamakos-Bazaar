import { useGetCart, useUpdateCartItem, useRemoveCartItem, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
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

  const handleUpdateQuantity = (id: number, current: number, delta: number) => {
    const next = current + delta;
    if (next < 1) return;
    updateItem.mutate({ id, data: { quantity: next } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() })
    });
  };

  const handleRemove = (id: number) => {
    removeItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() })
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
            className="h-28 bg-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-40 text-center max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/30 mb-8" />
            </motion.div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Cart is Empty</h1>
            <p className="text-muted-foreground mb-10 text-lg">Looks like you haven't added any heat yet.</p>
            <Link href="/shop">
              <motion.div
                whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <Button size="lg" className="w-full font-black uppercase tracking-widest fire-gradient border-none h-14 shadow-[0_0_24px_rgba(255,102,0,0.35)]">
                  Browse the Shop <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        <motion.h1
          className="text-5xl font-black uppercase tracking-tighter mb-12"
          initial={{ opacity: 0, y: -24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          Your Cart
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence initial={false}>
              {cart.items.map((item, i) => {
                const primaryMedia = getPrimaryProductMedia(item.productImageUrl);
                return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 28, scale: 0.96, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -80, scale: 0.92, filter: "blur(6px)", transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                  className="flex gap-5 p-4 bg-card border border-border rounded-lg relative pr-14 hover:border-primary/35 transition-colors duration-300"
                  data-testid={`cart-item-${item.id}`}
                >
                  {/* Thumbnail */}
                  <motion.div
                    className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-muted rounded-md overflow-hidden border border-border/50"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    {primaryMedia ? (
                      primaryMedia.type === "video" ? (
                        <video src={primaryMedia.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <img src={primaryMedia.url} alt={item.productName} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">No Img</div>
                    )}
                  </motion.div>

                  {/* Info */}
                  <div className="flex flex-col justify-between py-1 flex-1">
                    <div>
                      <Link href={`/product/${item.productId}`} className="font-black text-base hover:text-primary transition-colors line-clamp-2 uppercase tracking-wide">
                        {item.productName}
                      </Link>
                      {item.size && (
                        <p className="text-sm text-muted-foreground mt-1">Size: <span className="font-bold text-foreground">{item.size}</span></p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                      {/* Qty controls */}
                      <div className="flex items-center h-9 border border-border rounded-sm bg-background overflow-hidden">
                        <motion.button
                          whileTap={{ scale: 0.78 }}
                          whileHover={{ backgroundColor: "rgba(255,102,0,0.1)" }}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                          disabled={updateItem.isPending}
                        >
                          <Minus className="h-3 w-3" />
                        </motion.button>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={item.quantity}
                            initial={{ opacity: 0, y: -6, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.8 }}
                            transition={{ duration: 0.16, ease: EASE }}
                            className="w-8 text-center font-black font-mono text-sm"
                          >
                            {item.quantity}
                          </motion.div>
                        </AnimatePresence>
                        <motion.button
                          whileTap={{ scale: 0.78 }}
                          whileHover={{ backgroundColor: "rgba(255,102,0,0.1)" }}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                          disabled={updateItem.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </motion.button>
                      </div>
                      <motion.div
                        key={item.price * item.quantity}
                        initial={{ scale: 1.18, color: "#ffcc00" }}
                        animate={{ scale: 1, color: "#ff6600" }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="font-mono font-black text-lg text-primary"
                      >
                        AED {(item.price * item.quantity).toFixed(2)}
                      </motion.div>
                    </div>
                  </div>

                  {/* Remove */}
                  <motion.button
                    whileHover={{ scale: 1.25, color: "#ef4444" }}
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                    onClick={() => handleRemove(item.id)}
                    disabled={removeItem.isPending}
                    className="absolute top-4 right-4 text-muted-foreground transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                    aria-label="Remove item"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <motion.div
              className="bg-card border border-border rounded-lg p-6 sticky top-24"
              initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.22, duration: 0.6, ease: EASE }}
            >
              <h2 className="text-xl font-black uppercase tracking-wider mb-6 pb-4 border-b border-border">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-bold">AED {cart.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-mono font-bold text-primary">AED 25.00</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-8">
                <div className="flex justify-between items-end">
                  <span className="font-black uppercase tracking-wider">Total</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={cart.total}
                      initial={{ opacity: 0, y: -8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.28, ease: EASE }}
                      className="font-mono text-3xl font-black text-primary"
                    >
                      AED {(cart.total + 25).toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.03, filter: "brightness(1.08)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <Button
                  size="lg"
                  className="w-full h-14 font-black uppercase tracking-widest flex items-center justify-center gap-2 fire-gradient border-none shadow-[0_0_24px_rgba(255,102,0,0.35)] hover:shadow-[0_0_48px_rgba(255,102,0,0.58)] transition-shadow duration-300"
                  onClick={() => setLocation("/checkout")}
                  data-testid="button-checkout"
                >
                  Secure Checkout <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
