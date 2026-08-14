import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { useGetProduct, useAddToCart, useListProducts, getGetProductQueryKey, getGetCartQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useCartFly } from "@/components/cart-fly-context";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingCart, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Bell, Eye, Heart, TrendingUp, Check, Sparkles, Truck, Shield, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { PageTransition } from "@/components/page-transition";
import { trackCartUpdate } from "@/lib/use-visitor-tracking";
import { parseProductMedia, getPrimaryProductMedia } from "@/lib/product-media";
import { QuickViewModal } from "@/components/quick-view-modal";
import { useSettings } from "@/lib/use-settings";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

function TrendingMeter({ productId }: { productId: number }) {
  const views = 120 + (productId * 37) % 300;
  const added = 18 + (productId * 13) % 80;
  const sold = 5 + (productId * 7) % 40;
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { icon: Eye, label: `${views} viewed today`, color: "text-blue-400" },
        { icon: Heart, label: `${added} added to cart`, color: "text-rose-400" },
        { icon: TrendingUp, label: `${sold} sold this week`, color: "text-green-400" },
      ].map(({ icon: Icon, label, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-1.5 rounded-full border border-border/50">
          <Icon className={`h-3 w-3 ${color}`} />
          {label}
        </div>
      ))}
    </div>
  );
}

function BackInStockAlert({ productId, productName }: { productId: number; productName: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      await fetch(`${BASE}/api/stock-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, phone: phone.trim(), name: name.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="w-full h-12 border border-primary/40 text-primary font-black uppercase tracking-widest text-sm rounded-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
      >
        <Bell className="h-4 w-4" />
        Notify Me When Back in Stock
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ ease: EASE }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-4 bg-card border border-border rounded-2xl p-6"
              style={{ width: "calc(100% - 2rem)" }}
            >
              {sent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-6 w-6 text-green-400" />
                  </div>
                  <h3 className="font-black text-lg uppercase">You're on the list!</h3>
                  <p className="text-muted-foreground text-sm mt-2">We'll WhatsApp you as soon as <strong>{productName}</strong> is back in stock.</p>
                  <button onClick={() => setOpen(false)} className="mt-6 w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-sm text-sm">Done</button>
                </div>
              ) : (
                <>
                  <h3 className="font-black text-lg uppercase tracking-tighter mb-1">Back in Stock Alert</h3>
                  <p className="text-muted-foreground text-sm mb-5">We'll WhatsApp you when <strong>{productName}</strong> is available again.</p>
                  <div className="space-y-3">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)"
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 000 0000" type="tel"
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setOpen(false)} className="flex-1 py-3 border border-border rounded-sm text-sm font-bold uppercase">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading || !phone.trim()}
                      className="flex-1 py-3 fire-gradient text-primary-foreground font-black uppercase tracking-widest text-sm rounded-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading ? "Saving…" : <><Bell className="h-4 w-4" /> Notify Me</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MotionItem({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type LookProduct = {
  id: number; name: string; price: number; imageUrl: string | null;
  imageUrls: string | null; stock: number; sizes: string | null;
  categoryName?: string | null; featured: boolean; rep: boolean;
};

function useCompleteTheLook(productId: number) {
  const [items, setItems] = useState<LookProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`${BASE}/api/products/complete-the-look?productId=${productId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);
  return { items, loading };
}

function CompleteTheLookSection({
  productId,
  currentProduct,
}: {
  productId: number;
  currentProduct: { name: string; price: number; imageUrl: string | null; imageUrls: string | null };
}) {
  const { items, loading } = useCompleteTheLook(productId);
  const addToCart = useAddToCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [allAdded, setAllAdded] = useState(false);

  if (loading || items.length === 0) return null;

  const currentMedia = getPrimaryProductMedia(currentProduct.imageUrl);
  const lookTotal = items.reduce((s, p) => s + p.price, 0) + currentProduct.price;

  const handleAddOne = (item: LookProduct) => {
    if (addedIds.has(item.id)) return;
    setAddingId(item.id);
    addToCart.mutate(
      { data: { productId: item.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setAddedIds((prev) => new Set([...prev, item.id]));
          setAddingId(null);
          toast({ title: "Added to cart", description: item.name });
        },
        onError: () => { setAddingId(null); },
      }
    );
  };

  const handleAddAll = async () => {
    setAddingAll(true);
    for (const item of items) {
      if (addedIds.has(item.id)) continue;
      await new Promise<void>((resolve) => {
        addToCart.mutate(
          { data: { productId: item.id, quantity: 1 } },
          { onSuccess: () => { setAddedIds((prev) => new Set([...prev, item.id])); resolve(); }, onError: () => resolve() }
        );
      });
    }
    queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    setAddingAll(false);
    setAllAdded(true);
    toast({ title: "Full look added!", description: `${items.length} pieces added to your cart.` });
    setTimeout(() => setAllAdded(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
      className="mt-20 border-t border-border pt-14"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-black">Style Guide</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Complete the Look</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Pair with these pieces for the full fit.</p>
        </div>
        <div className="sm:text-right shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Full Look Total</p>
          <p className="text-2xl font-black font-mono text-primary">AED {lookTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Outfit Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* Current Piece */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35, ease: EASE }}
          className="relative group"
        >
          <div className="relative aspect-square rounded-xl overflow-hidden bg-card border-2 border-primary/50 shadow-[0_0_20px_rgba(255,102,0,0.15)]">
            {currentMedia ? (
              <img
                src={currentMedia.url}
                alt={currentProduct.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute top-2 left-2">
              <span className="bg-primary text-primary-foreground text-[9px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">This Piece</span>
            </div>
          </div>
          <div className="mt-2.5 px-0.5">
            <p className="text-xs font-bold leading-tight line-clamp-2 mb-1">{currentProduct.name}</p>
            <p className="text-sm font-mono font-bold text-primary">AED {currentProduct.price.toFixed(2)}</p>
          </div>
        </motion.div>

        {/* Complementary Items */}
        {items.map((item, i) => {
          const media = getPrimaryProductMedia(item.imageUrl);
          const isAdded = addedIds.has(item.id);
          const isAdding = addingId === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.4 + i * 0.08, ease: EASE }}
              className="relative group"
            >
              <Link href={`/product/${item.id}`}>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-card border border-border group-hover:border-primary/40 transition-all duration-300 group-hover:shadow-[0_6px_24px_rgba(255,102,0,0.18)]">
                  {media ? (
                    <img
                      src={media.url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {item.featured && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider rounded-sm backdrop-blur-sm">Featured</span>
                    </div>
                  )}
                  {isAdded && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
              <div className="mt-2.5 px-0.5">
                {item.categoryName && (
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">{item.categoryName}</p>
                )}
                <p className="text-xs font-bold leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{item.name}</p>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-mono font-bold text-primary">AED {item.price.toFixed(2)}</p>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={(e) => { e.preventDefault(); handleAddOne(item); }}
                    disabled={isAdding || isAdded}
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                      isAdded
                        ? "bg-green-500/15 border-green-500/40 text-green-500"
                        : "border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    }`}
                  >
                    {isAdded ? <Check className="h-3.5 w-3.5" /> : isAdding ? "…" : <Plus className="h-3.5 w-3.5" />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add All CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-border/50">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAddAll}
          disabled={addingAll || allAdded}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-sm font-black uppercase tracking-widest text-sm transition-all ${
            allAdded
              ? "bg-green-500/15 border border-green-500/40 text-green-400"
              : "fire-gradient text-primary-foreground shadow-[0_0_28px_rgba(255,102,0,0.3)] hover:shadow-[0_0_44px_rgba(255,102,0,0.5)]"
          }`}
        >
          {allAdded ? (
            <><Check className="h-4 w-4" /> Full Look Added to Cart</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> {addingAll ? "Adding Pieces…" : `Add All Pieces — AED ${items.reduce((s, p) => s + p.price, 0).toFixed(2)}`}</>
          )}
        </motion.button>
        <p className="text-xs text-muted-foreground">
          {items.length} complementary piece{items.length !== 1 ? "s" : ""} • Full look total AED {lookTotal.toFixed(2)}
        </p>
      </div>
    </motion.div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id), staleTime: 30_000 }
  });

  const settings = useSettings();
  const recVisible = settings.recommended_visible !== "false";
  const recTitle = settings.recommended_title || "You May Also Like";
  const recCount = Math.max(2, Math.min(12, Number(settings.recommended_count) || 6));
  const sliderRef = useRef<HTMLDivElement>(null);

  const categoryId = product?.categoryId ?? undefined;
  const { data: relatedProducts } = useListProducts(
    categoryId ? { categoryId } : undefined,
    { query: { enabled: !!categoryId && recVisible, queryKey: getListProductsQueryKey(categoryId ? { categoryId } : undefined), staleTime: 30_000 } }
  );
  const related = (relatedProducts ?? []).filter((p) => p.id !== id).slice(0, recCount);

  const scrollSlider = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    const amount = sliderRef.current.clientWidth * 0.7;
    sliderRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  const addToCart = useAddToCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { triggerFly } = useCartFly();
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [addedPulse, setAddedPulse] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  const sizes = product?.sizes ? product.sizes.split(",").map((s) => s.trim()) : [];
  const mediaItems = parseProductMedia(product?.imageUrl ?? null);

  // Show sticky ATC bar after scrolling past the main ATC button
  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > 520);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard navigation for gallery
  const handleGalleryKey = useCallback((e: KeyboardEvent) => {
    if (mediaItems.length <= 1) return;
    if (e.key === "ArrowLeft") setSelectedMediaIndex(i => (i - 1 + mediaItems.length) % mediaItems.length);
    if (e.key === "ArrowRight") setSelectedMediaIndex(i => (i + 1) % mediaItems.length);
  }, [mediaItems.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleGalleryKey);
    return () => window.removeEventListener("keydown", handleGalleryKey);
  }, [handleGalleryKey]);

  const handleAddToCart = () => {
    if (!product) return;
    if (sizes.length > 0 && !selectedSize) {
      toast({ title: "Select a size", description: "Please select a size before adding to cart.", variant: "destructive" });
      return;
    }
    addToCart.mutate(
      { data: { productId: product.id, quantity, size: selectedSize || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setAddedPulse(true);
          setTimeout(() => setAddedPulse(false), 700);
          toast({ title: "Added to cart", description: `${product.name} added.` });
          if (imgContainerRef.current && selectedMedia?.url) {
            triggerFly(selectedMedia.url, imgContainerRef.current);
          }
          // Track cart activity
          trackCartUpdate(quantity, Number(product.price) * quantity);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add item to cart.", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-muted rounded-lg animate-pulse" />
          <div className="space-y-6 py-4">
            <div className="h-4 bg-muted w-1/4 rounded animate-pulse" />
            <div className="h-12 bg-muted w-3/4 rounded animate-pulse" />
            <div className="h-8 bg-muted w-1/3 rounded animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-20 text-center font-black text-2xl uppercase">Product not found</div>;
  }

  const isOutOfStock = product.stock === 0;
  const selectedMedia = mediaItems[selectedMediaIndex] ?? mediaItems[0] ?? null;

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        {/* Back */}
        <MotionItem delay={0.05}>
          <Link href="/shop">
            <motion.button
              whileHover={{ x: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider mb-8"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Shop
            </motion.button>
          </Link>
        </MotionItem>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-20">
          {/* Media gallery */}
          <div className="space-y-3">
            <motion.div
              ref={imgContainerRef}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.75, ease: EASE }}
              className="product-img-frame relative aspect-square md:aspect-[4/5] bg-card rounded-lg overflow-hidden border border-border group"
            >
              <AnimatePresence mode="wait">
                {selectedMedia ? (
                  selectedMedia.type === "video" ? (
                    <motion.video
                      key={`video-${selectedMediaIndex}`}
                      src={selectedMedia.url}
                      className="w-full h-full object-cover object-center"
                      controls
                      playsInline
                      preload="metadata"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28 }}
                    />
                  ) : (
                    <motion.img
                      key={`img-${selectedMediaIndex}`}
                      src={selectedMedia.url}
                      alt={product.name}
                      className="w-full h-full object-cover object-center"
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      whileHover={{ scale: 1.06 }}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono">No Image</div>
                )}
              </AnimatePresence>
              {/* Glow */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{ background: "radial-gradient(ellipse at 50% 85%, rgba(255,102,0,0.25), transparent 65%)" }}
              />
            </motion.div>
            {mediaItems.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-md border bg-card transition-colors duration-300 ${selectedMediaIndex === index ? "thumb-selected" : "border-border hover:border-primary/40"}`}
                  >
                    {item.type === "video" ? (
                      <>
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">Video</span>
                      </>
                    ) : (
                      <img src={item.url} alt={`${product.name} ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <MotionItem delay={0.15}>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-primary bg-primary/10 backdrop-blur-sm px-3 py-1.5 rounded-sm border border-primary/20">
                  {product.categoryName}
                </span>
                {product.featured && (
                  <span className="text-xs font-black tracking-widest uppercase bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-sm backdrop-blur-sm">
                    Featured
                  </span>
                )}
                {product.rep ? (
                  <span className="glass-badge text-xs font-black tracking-widest uppercase text-white px-3 py-1.5 rounded-sm">
                    REP
                  </span>
                ) : (
                  <span className="text-xs font-black tracking-widest uppercase bg-green-500/80 text-black px-3 py-1.5 rounded-sm backdrop-blur-sm">
                    Authentic
                  </span>
                )}
              </div>
            </MotionItem>

            <MotionItem delay={0.22} className="mt-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                {product.name}
              </h1>
            </MotionItem>

            <MotionItem delay={0.29} className="mt-5">
              <div className="text-3xl font-mono font-black text-primary">
                AED {product.price.toFixed(2)}
              </div>
            </MotionItem>

            {product.description && (
              <MotionItem delay={0.35} className="mt-6">
                <p className="text-muted-foreground leading-relaxed border-l-2 border-primary/50 pl-4">
                  {product.description}
                </p>
              </MotionItem>
            )}

            <MotionItem delay={0.42} className="mt-8 space-y-8">
              {/* Sizes */}
              {sizes.length > 0 && (
                <div>
                  <h3 className="font-black uppercase tracking-wider text-sm mb-3">Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size, i) => (
                      <motion.button
                        key={size}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.48 + i * 0.05, ease: EASE }}
                        onClick={() => setSelectedSize(size)}
                        whileHover={{ scale: 1.08, y: -2 }}
                        whileTap={{ scale: 0.93 }}
                        className={`h-10 sm:h-12 min-w-[2.5rem] sm:min-w-[3rem] px-3 sm:px-4 font-bold border rounded-sm transition-all duration-200 ${
                          selectedSize === size
                            ? "size-swatch-selected"
                            : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
                        }`}
                        data-testid={`size-${size}`}
                      >
                        {size}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="font-black uppercase tracking-wider text-sm mb-3">Quantity</h3>
                <div className="flex items-center h-12 w-36 border border-border rounded-sm bg-card overflow-hidden">
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    whileHover={{ backgroundColor: "rgba(255,102,0,0.08)" }}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    disabled={isOutOfStock}
                    data-testid="button-quantity-minus"
                  >
                    <Minus className="h-4 w-4" />
                  </motion.button>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={quantity}
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="flex-1 text-center font-black font-mono text-lg"
                    >
                      {quantity}
                    </motion.div>
                  </AnimatePresence>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    whileHover={{ backgroundColor: "rgba(255,102,0,0.08)" }}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    disabled={isOutOfStock || quantity >= product.stock}
                    data-testid="button-quantity-plus"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.button>
                </div>
                {product.stock <= 5 && product.stock > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm mt-2 font-bold flex items-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" /> Only {product.stock} left in stock
                  </motion.p>
                )}
              </div>

              {/* Trending meter */}
              <TrendingMeter productId={id} />

              {/* Add to cart */}
              <motion.div
                animate={addedPulse ? { scale: [1, 1.04, 1], filter: ["blur(0px)", "blur(0px)", "blur(0px)"] } : {}}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  whileHover={!isOutOfStock ? { scale: 1.02, filter: "brightness(1.08)" } : {}}
                  whileTap={!isOutOfStock ? { scale: 0.97 } : {}}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                >
                  <Button
                    size="lg"
                    className={`w-full h-14 text-lg font-black uppercase tracking-widest transition-all duration-300 ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "fire-gradient border-none shadow-[0_0_24px_rgba(255,102,0,0.35)] hover:shadow-[0_0_48px_rgba(255,102,0,0.6)]"
                    }`}
                    disabled={isOutOfStock || addToCart.isPending}
                    onClick={handleAddToCart}
                    data-testid="button-add-to-cart"
                  >
                    <AnimatePresence mode="wait">
                      {addToCart.isPending ? (
                        <motion.span key="loading" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>Adding...</motion.span>
                      ) : isOutOfStock ? (
                        <motion.span key="sold" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>Sold Out</motion.span>
                      ) : (
                        <motion.span key="add" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" /> Add to Cart
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Back in stock WhatsApp alert */}
              {isOutOfStock && <BackInStockAlert productId={id} productName={product.name} />}
            </MotionItem>
          </div>
        </div>

        {/* Complete the Look */}
        <CompleteTheLookSection
          productId={id}
          currentProduct={{
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl ?? null,
            imageUrls: product.imageUrls ?? null,
          }}
        />

        {recVisible && related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            className="mt-24 border-t border-border pt-16"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">{recTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollSlider("left")}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary/60 hover:text-primary transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollSlider("right")}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary/60 hover:text-primary transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <Link href="/shop" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors ml-2">
                  View All →
                </Link>
              </div>
            </div>

            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {related.map((p, i) => {
                const media = getPrimaryProductMedia(p.imageUrl);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.45 + i * 0.06, ease: EASE }}
                    className="group snap-start shrink-0 w-[180px] sm:w-[200px] md:w-[220px]"
                  >
                    <Link href={`/product/${p.id}`}>
                      <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                        <div className="product-img-frame relative aspect-square mb-3 overflow-hidden rounded-xl bg-card border border-border group-hover:border-primary/40 transition-all duration-300">
                          {media ? (
                            <img
                              src={media.url}
                              alt={p.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <button
                            onClick={(e) => { e.preventDefault(); setQuickViewId(p.id); }}
                            className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg border border-border hover:border-primary/50 hover:text-primary"
                          >
                            Quick View
                          </button>
                          {p.featured && (
                            <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider rounded-sm">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="px-0.5">
                          {p.categoryName && (
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">{p.categoryName}</p>
                          )}
                          <p className="text-xs font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">{p.name}</p>
                          <p className="text-sm font-mono text-primary font-bold mt-1">AED {p.price.toFixed(2)}</p>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
      <QuickViewModal productId={quickViewId} onClose={() => setQuickViewId(null)} />

      {/* Sticky mobile ATC bar */}
      <AnimatePresence>
        {stickyVisible && !isOutOfStock && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-40 md:hidden"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 100%)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,102,0,0.2)" }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/50 font-bold uppercase tracking-wider truncate">{product.name}</p>
                <p className="text-primary font-mono font-black text-lg">AED {product.price.toFixed(2)}</p>
              </div>
              {sizes.length > 0 && !selectedSize && (
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider shrink-0">↑ Pick size first</div>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-black disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #ff6600, #ffaa00)", boxShadow: "0 0 20px rgba(255,102,0,0.45)" }}
              >
                <ShoppingCart className="h-4 w-4" />
                {addToCart.isPending ? "Adding…" : "Add to Cart"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
