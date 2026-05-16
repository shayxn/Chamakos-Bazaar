import { useGetCart, useUpdateCartItem, useRemoveCartItem, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Cart() {
  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleUpdateQuantity = (id: number, current: number, delta: number) => {
    const next = current + delta;
    if (next < 1) return;
    
    updateItem.mutate(
      { id, data: { quantity: next } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
    );
  };

  const handleRemove = (id: number) => {
    removeItem.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
    );
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-lg">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-6">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added any heat to your cart yet.</p>
        <Link href="/shop">
          <Button size="lg" className="w-full font-bold uppercase tracking-widest fire-gradient border-none">
            Browse the Shop
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-10">Your Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {cart.items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className="flex gap-6 p-4 bg-card border border-border rounded-lg relative pr-12"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-muted rounded-md overflow-hidden border border-border/50">
                  {item.productImageUrl ? (
                    <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover mix-blend-lighten" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">No Img</div>
                  )}
                </div>
                
                <div className="flex flex-col justify-between py-1 flex-1">
                  <div>
                    <Link href={`/product/${item.productId}`} className="font-bold text-lg hover:text-primary transition-colors line-clamp-2 uppercase tracking-wide">
                      {item.productName}
                    </Link>
                    {item.size && (
                      <p className="text-sm text-muted-foreground mt-1">Size: <span className="font-bold text-foreground">{item.size}</span></p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <div className="flex items-center h-10 border border-border rounded-sm bg-background">
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                        disabled={updateItem.isPending}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="w-8 text-center font-bold font-mono text-sm">
                        {item.quantity}
                      </div>
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                        disabled={updateItem.isPending}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="font-mono font-bold text-lg text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRemove(item.id)}
                  disabled={removeItem.isPending}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-2"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-black uppercase tracking-wider mb-6 pb-4 border-b border-border">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-bold">${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-mono font-bold">Calculated next</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="font-bold uppercase tracking-wider">Total</span>
                <span className="font-mono text-3xl font-bold text-primary">${cart.total.toFixed(2)}</span>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="w-full h-14 font-bold uppercase tracking-widest flex items-center justify-center gap-2 fire-gradient border-none shadow-[0_0_15px_rgba(255,102,0,0.3)] hover:shadow-[0_0_25px_rgba(255,102,0,0.5)] transition-all"
              onClick={() => setLocation("/checkout")}
            >
              Secure Checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
