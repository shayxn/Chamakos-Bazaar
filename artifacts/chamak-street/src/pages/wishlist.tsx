import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Trash2, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";
import { PageTransition } from "@/components/page-transition";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type WishlistItem = {
  productId: number; id: number; name: string; price: number;
  imageUrl: string | null; stock: number; isPreOrder: boolean; sizes: string | null;
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/wishlist`, { credentials: "include" });
      if (res.ok) setItems(await res.json() as WishlistItem[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const removeItem = async (productId: number) => {
    setRemoving(productId);
    try {
      await fetch(`${BASE}/api/wishlist/${productId}`, { method: "DELETE", credentials: "include" });
      setItems(prev => prev.filter(i => i.productId !== productId));
      toast({ title: "Removed from wishlist" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    } finally { setRemoving(null); }
  };

  const addToCart = async (item: WishlistItem) => {
    setAddingToCart(item.productId);
    try {
      const res = await fetch(`${BASE}/api/cart`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.id, quantity: 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: `${item.name} added to cart!` });
    } catch {
      toast({ title: "Could not add to cart", variant: "destructive" });
    } finally { setAddingToCart(null); }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          className="flex items-center gap-3 mb-10"
          initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}
        >
          <Heart className="h-6 w-6 text-rose-400 fill-rose-400" />
          <h1 className="text-3xl font-black uppercase tracking-tighter">My Wishlist</h1>
          {items.length > 0 && (
            <span className="ml-2 text-sm font-bold text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 space-y-5"
          >
            <motion.div animate={{ scale: [1, 1.12, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <Heart className="h-16 w-16 mx-auto text-rose-400/30" />
            </motion.div>
            <p className="font-black uppercase tracking-widest text-lg text-white/60">Your wishlist is empty</p>
            <p className="text-muted-foreground text-sm">Heart products you love while browsing the shop</p>
            <Link href="/shop">
              <Button className="fire-gradient border-none font-black uppercase tracking-wider gap-2 mt-2">
                Browse Shop <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: EASE }}
                  className="group rounded-2xl overflow-hidden glass border border-white/10 hover:border-primary/30 transition-colors relative"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    disabled={removing === item.productId}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/60 hover:text-rose-400 hover:border-rose-400/40 transition-colors"
                  >
                    {removing === item.productId ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-3.5 h-3.5 border border-white/40 border-t-white/80 rounded-full" />
                    ) : <Trash2 className="h-3.5 w-3.5" />}
                  </button>

                  {/* Image */}
                  <Link href={`/product/${item.id}`}>
                    <div className="aspect-[4/5] overflow-hidden bg-muted">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-muted">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <Link href={`/product/${item.id}`}>
                      <p className="font-black text-sm uppercase tracking-wide line-clamp-2 hover:text-primary transition-colors">{item.name}</p>
                    </Link>
                    <p className="font-mono font-black text-primary">AED {item.price.toFixed(0)}</p>

                    {item.stock === 0 && !item.isPreOrder ? (
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Out of Stock</p>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(item)}
                        disabled={addingToCart === item.productId}
                        className="w-full fire-gradient border-none font-black uppercase tracking-wider text-xs gap-2"
                      >
                        {addingToCart === item.productId ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full" />
                        ) : <ShoppingCart className="h-3.5 w-3.5" />}
                        {addingToCart === item.productId ? "Adding…" : "Add to Cart"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
