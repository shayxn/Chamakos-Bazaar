import { useGetCart, useUpdateCartItem, useRemoveCartItem, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";

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
          <div key={n} className="h-28 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-40 text-center max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/30 mb-8" />
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Cart is Empty</h1>
            <p className="text-muted-foreground mb-10 text-lg">Looks like you haven't added any heat yet.</p>
            <Link href="/shop">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="w-full font-black uppercase tracking-widest fire-gradient border-none h-14">
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Your Cart
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60, scale: 0.95, transition: { duration: 0.25 } }}
                  className="flex gap-5 p-4 bg-card border border-border rounded-lg relative pr-14 hover:border-primary/30 transition-colors"
                  data-testid={`cart-item-${item.id}`}
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-muted rounded-md overflow-hidden border border-border/50">
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover mix-blend-lighten" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">No Img</div>
                    )}
                  </div>

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
                      {/* Quantity controls */}
                      <div className="flex items-center h-9 border border-border rounded-sm bg-background overflow-hidden">
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          disabled={updateItem.isPending}
                        >
                          <Minus className="h-3 w-3" />
                        </motion.button>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={item.quantity}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.12 }}
                            className="w-8 text-center font-black font-mono text-sm"
                          >
                            {item.quantity}
                          </motion.div>
                        </AnimatePresence>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          disabled={updateItem.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </motion.button>
                      </div>
                      <motion.div
                        key={item.price * item.quantity}
                        initial={{ scale: 1.15, color: "#ff6600" }}
                        animate={{ scale: 1, color: "#ff6600" }}
                        className="font-mono font-black text-lg text-primary"
                      >
                        AED {(item.price * item.quantity).toFixed(2)}
                      </motion.div>
                    </div>
                  </div>

                  {/* Remove */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemove(item.id)}
                    disabled={removeItem.isPending}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                    aria-label="Remove item"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              className="bg-card border border-border rounded-lg p-6 sticky top-24"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                  <motion.span
                    key={cart.total}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-mono text-3xl font-black text-primary"
                  >
                    AED {(cart.total + 25).toFixed(2)}
                  </motion.span>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  className="w-full h-14 font-black uppercase tracking-widest flex items-center justify-center gap-2 fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.5)] transition-all"
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
