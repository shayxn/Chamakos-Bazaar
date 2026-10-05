import { formatPrice } from "@/lib/currency";
import { Price } from "@/components/price";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRoute } from "wouter";
import { useGetProduct, useAddToCart, useListProducts, getGetProductQueryKey, getGetCartQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useCartFly } from "@/components/cart-fly-context";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingCart, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Bell, Heart, Check, Sparkles, Truck, Shield, RotateCcw, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { PageTransition } from "@/components/page-transition";
import { ContentSeo } from "@/components/content-seo";
import { trackCartUpdate } from "@/lib/use-visitor-tracking";
import { parseProductMedia, getPrimaryProductMedia } from "@/lib/product-media";
import { QuickViewModal } from "@/components/quick-view-modal";
import { useSettings } from "@/lib/use-settings";
import { trackRecentlyViewed } from "@/components/recently-viewed";
import { useWishlist } from "@/hooks/use-wishlist";
import { ProductPreorderDetails } from "@/components/product-preorder-details";
import { useActiveEvents } from "@/components/event-banner";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

function BackInStockAlert({ productId, productName }: { productId: number; productName: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE}/api/stock-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, phone: phone.trim(), name: name.trim() }),
      });
      if (!response.ok) throw new Error("Could not save stock alert");
      setSent(true);
    } catch {
      toast({ title: "Alert not saved", description: "Please try again.", variant: "destructive" });
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
      transition={{ duration: 0.2, delay: Math.min(delay, 0.08), ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type PVariant = { id: string; size: string; color: string; stock: number; price: number | null };

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
    const controller = new AbortController();
    setLoading(true);
    setItems([]);
    fetch(`${BASE}/api/products/complete-the-look?productId=${productId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
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
          <p className="text-2xl font-black font-mono text-primary"><Price v={lookTotal} /></p>
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
          <div className="relative aspect-square rounded-xl overflow-hidden bg-card border-2 border-primary/50 shadow-[0_0_20px_rgba(183,156,255,0.15)]">
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
            <p className="text-sm font-mono font-bold text-primary"><Price v={currentProduct.price} /></p>
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
                <div className="relative aspect-square rounded-xl overflow-hidden bg-card border border-border group-hover:border-primary/40 transition-all duration-300 group-hover:shadow-[0_6px_24px_rgba(183,156,255,0.18)]">
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
                  <p className="text-sm font-mono font-bold text-primary"><Price v={item.price} /></p>
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
              : "fire-gradient text-primary-foreground shadow-[0_0_28px_rgba(183,156,255,0.3)] hover:shadow-[0_0_44px_rgba(183,156,255,0.5)]"
          }`}
        >
          {allAdded ? (
            <><Check className="h-4 w-4" /> Full Look Added to Cart</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> {addingAll ? "Adding Pieces…" : `Add All Pieces — ${formatPrice(items.reduce((s, p) => s + p.price, 0))}`}</>
          )}
        </motion.button>
        <p className="text-xs text-muted-foreground">
          {items.length} complementary piece{items.length !== 1 ? "s" : ""} • Full look total <Price v={lookTotal} />
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
  const events = useActiveEvents();
  const recVisible = settings.recommended_visible !== "false";
  const recTitle = settings.recommended_title || "You May Also Like";
  const recCount = Math.max(2, Math.min(12, Number(settings.recommended_count) || 6));
  const sliderRef = useRef<HTMLDivElement>(null);

  const categoryId = product?.categoryId ?? undefined;
  const { data: relatedProducts } = useListProducts(
    categoryId ? { categoryId, limit: 13 } : undefined,
    { query: { enabled: !!categoryId && recVisible, queryKey: getListProductsQueryKey(categoryId ? { categoryId, limit: 13 } : undefined), staleTime: 30_000 } }
  );
  const related = (relatedProducts ?? []).filter((p,index,all) => p.id !== id&&all.findIndex(other=>other.id===p.id)===index).slice(0, recCount);

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
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [addedPulse, setAddedPulse] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  useEffect(() => {
    setQuantity(1);
    setSelectedSize("");
    setSelectedColor("");
    setSelectedMediaIndex(0);
    setScrolledPast(false);
  }, [id]);

  // Track recently viewed
  useEffect(() => {
    if (!product) return;
    trackRecentlyViewed({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl ?? null,
    });
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: product?.name ?? "", text: `Check out ${product?.name ?? ""} on IMAGINATE`, url }).catch(() => {});
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!" });
      } catch {
        toast({ title: "Could not copy link", description: "Copy the address from your browser.", variant: "destructive" });
      }
    }
  };

  const sizes = product?.sizes ? product.sizes.split(",").map((s) => s.trim()) : [];
  const ext = (product ?? {}) as unknown as {
    colors?: string | string[] | null; variants?: PVariant[] | string | null; compareAtPrice?: number | string | null;
    seoTitle?: string | null; seoDescription?: string | null; socialImage?: string | null;
  };
  const colors: string[] = Array.isArray(ext.colors) ? ext.colors : (ext.colors ? String(ext.colors).split(",").map(c => c.trim()).filter(Boolean) : []);
  const variants: PVariant[] = useMemo(() => {
    let v = ext.variants;
    if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = []; } }
    return Array.isArray(v) ? v : [];
  }, [ext.variants]);
  const matchedVariant = variants.find(v =>
    (sizes.length === 0 || (selectedSize && v.size === selectedSize) || !v.size) &&
    (colors.length === 0 || (selectedColor && v.color === selectedColor) || !v.color) &&
    (!!selectedSize || sizes.length === 0) && (!!selectedColor || colors.length === 0)) ?? null;
  const variantStock = matchedVariant ? matchedVariant.stock : null;
  const effectiveStock = variantStock ?? product?.stock ?? 0;
  const effPrice = matchedVariant && matchedVariant.price != null ? Number(matchedVariant.price) : (product?.price ?? 0);
  const compareAt = ext.compareAtPrice != null && ext.compareAtPrice !== "" ? Number(ext.compareAtPrice) : null;
  const showCompare = compareAt !== null && Number.isFinite(compareAt) && compareAt > effPrice;
  useEffect(() => {
    if (!product) return;
    const prevTitle = document.title;
    const touched: Array<{ el: HTMLMetaElement; prev: string | null; created: boolean }> = [];
    const setMeta = (attr: "name" | "property", key: string, val?: string | null) => {
      if (!val) return;
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      const created = !el;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      touched.push({ el, prev: el.getAttribute("content"), created });
      el.setAttribute("content", val);
    };
    if (ext.seoTitle) document.title = ext.seoTitle;
    setMeta("name", "description", ext.seoDescription);
    setMeta("property", "og:title", ext.seoTitle);
    setMeta("property", "og:description", ext.seoDescription);
    setMeta("property", "og:image", ext.socialImage);
    return () => {
      document.title = prevTitle;
      touched.reverse().forEach(t => { if (t.created) t.el.remove(); else if (t.prev !== null) t.el.setAttribute("content", t.prev); });
    };
  }, [product?.id, ext.seoTitle, ext.seoDescription, ext.socialImage]); // eslint-disable-line react-hooks/exhaustive-deps

  const mediaItems = useMemo(() => parseProductMedia(product?.imageUrl ?? null), [product?.imageUrl]);

  // Show sticky ATC bar once scrolled past the main button — RAF-throttled
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { setScrolledPast(window.scrollY > 480); ticking = false; });
    };
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
    if (!product || addToCart.isPending) return;
    if (sizes.length > 0 && !selectedSize) {
      toast({ title: "Select a size", description: "Please select a size before adding to cart.", variant: "destructive" });
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      toast({ title: "Select a colour", description: "Please select a colour before adding to cart.", variant: "destructive" });
      return;
    }
    if (variants.length > 0 && !matchedVariant) {
      toast({ title: "Combination unavailable", description: "Choose another size or colour.", variant: "destructive" });
      return;
    }
    if (matchedVariant && matchedVariant.stock <= 0 && !isPreOrder) {
      toast({ title: "Out of stock", description: "This option is sold out.", variant: "destructive" });
      return;
    }
    addToCart.mutate(
      { data: { productId: product.id, quantity, size: selectedSize || undefined, color: selectedColor || undefined, variantId: matchedVariant?.id } as never },
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
          <motion.div
            className="aspect-square rounded-2xl glass-skeleton"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16,1,0.3,1] }}
          />
          <motion.div
            className="space-y-5 py-4"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16,1,0.3,1] }}
          >
            <div className="h-4 glass-skeleton rounded-full w-1/4" />
            <div className="h-12 glass-skeleton rounded-xl w-3/4" style={{ animationDelay: "0.1s" }} />
            <div className="h-8 glass-skeleton rounded-full w-1/3" style={{ animationDelay: "0.2s" }} />
            <div className="h-20 glass-skeleton rounded-xl" style={{ animationDelay: "0.3s" }} />
            <div className="h-14 glass-skeleton rounded-full" style={{ animationDelay: "0.4s" }} />
            <div className="flex gap-2 mt-2">
              {[40, 32, 36, 28].map((w, i) => (
                <div key={i} className="h-8 glass-skeleton rounded-lg" style={{ width: `${w}px`, animationDelay: `${0.5 + i * 0.06}s` }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-20 text-center font-black text-2xl uppercase">Product not found</div>;
  }

  const isPreOrder = product.isPreOrder === true;
  const isOutOfStock = product.stock === 0 && !isPreOrder;
  const productEvent = events.find((event) => event.countdownEnabled && event.ctaUrl?.replace(/\/$/, "").endsWith(`/product/${id}`));
  const preorderDate = productEvent?.endAt || product.preOrderDate;
  // Sticky bar: only after scroll AND (no sizes OR size already chosen)
  const stickyVisible = scrolledPast && !isOutOfStock && (sizes.length === 0 || !!selectedSize) && (colors.length === 0 || !!selectedColor);
  const selectedMedia = mediaItems[selectedMediaIndex] ?? mediaItems[0] ?? null;

  return (
    <PageTransition>
      <ContentSeo title={(product as any).seoTitle||product.name} description={(product as any).seoDescription||product.description||undefined} image={(product as any).socialImage||product.imageUrl||undefined}
        product={{name:product.name,price:product.price,stock:product.stock}}/>
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
              <AnimatePresence mode="sync">
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
                style={{ background: "radial-gradient(ellipse at 50% 85%, rgba(183,156,255,0.25), transparent 65%)" }}
              />
            </motion.div>
            {mediaItems.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-xl glass-thumb transition-all duration-300 ${selectedMediaIndex === index ? "thumb-selected !border-primary/70 !shadow-[0_0_16px_rgba(183,156,255,0.30),inset_0_2px_0_rgba(183,156,255,0.18)]" : ""}`}
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
                <span className="text-xs font-black tracking-widest uppercase text-primary glass-orange px-3 py-1.5 rounded-lg">
                  {product.categoryName}
                </span>
                {product.featured && (
                  <span className="text-xs font-black tracking-widest uppercase bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-sm backdrop-blur-sm">Featured</span>
                )}
                {(product as any).bestSeller && (
                  <span className="text-xs font-black tracking-widest uppercase bg-primary/90 text-black px-3 py-1.5 rounded-sm backdrop-blur-sm">Best Seller</span>
                )}
                {(product as any).trending && (
                  <span className="text-xs font-black tracking-widest uppercase bg-cyan-400/90 text-black px-3 py-1.5 rounded-sm backdrop-blur-sm">Trending</span>
                )}
                {(product as any).newArrival && (
                  <span className="text-xs font-black tracking-widest uppercase bg-emerald-400/90 text-black px-3 py-1.5 rounded-sm backdrop-blur-sm">New Arrival</span>
                )}
                {(product as any).limitedEdition && (
                  <span className="text-xs font-black tracking-widest uppercase bg-purple-400/90 text-white px-3 py-1.5 rounded-sm backdrop-blur-sm">Limited Edition</span>
                )}
              </div>
            </MotionItem>

            <MotionItem delay={0.22} className="mt-4">
              <div className="flex items-start gap-3">
                <h1 className="flex-1 text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                  {product.name}
                </h1>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-2 rounded-xl border transition-all shrink-0 mt-1 ${wishlistIds.has(product.id) ? "bg-rose-500/15 border-rose-400/40" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                >
                  <Heart className={`h-4 w-4 transition-colors ${wishlistIds.has(product.id) ? "fill-rose-400 text-rose-400" : "text-muted-foreground"}`} />
                </button>
                <button onClick={handleShare} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shrink-0 mt-1">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </MotionItem>

            <MotionItem delay={0.29} className="mt-5">
              <div className="text-3xl font-mono font-black text-primary">
                <Price v={effPrice} />
                {showCompare && <span className="ml-3 text-lg text-muted-foreground line-through" data-testid="text-compare-at"><Price v={compareAt!} /></span>}
              </div>
              {variantStock !== null && !isPreOrder && (
                <p className={`mt-1 text-xs font-bold ${variantStock > 0 ? "text-white/60" : "text-red-400"}`} data-testid="text-variant-stock">
                  {variantStock > 0 ? (variantStock <= 5 ? `Only ${variantStock} left` : "In stock") : "Sold out"}
                </p>
              )}
            </MotionItem>

            {product.description && (
              <MotionItem delay={0.35} className="mt-6">
                <p className="text-muted-foreground leading-relaxed border-l-2 border-primary/50 pl-4">
                  {product.description}
                </p>
              </MotionItem>
            )}

            <MotionItem delay={0.42} className="mt-8 space-y-8">
              {/* Colours */}
              {colors.length > 0 && (
                <div className="mt-6" data-testid="color-selector">
                  <h3 className="font-black uppercase tracking-wider text-sm mb-3">Colour{selectedColor && <span className="ml-2 text-white/50 normal-case font-bold">{selectedColor}</span>}</h3>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => {
                      const out = variants.length > 0 && variants.filter(v => v.color === c && (!selectedSize || v.size === selectedSize)).every(v => v.stock <= 0);
                      return (
                        <button key={c} type="button" onClick={() => setSelectedColor(c)} aria-pressed={selectedColor === c}
                          className={`min-h-[44px] px-4 rounded-xl border text-sm font-bold transition-colors ${selectedColor === c ? "border-primary bg-primary/20 text-white" : "border-white/15 text-white/60 hover:text-white"} ${out && !isPreOrder ? "opacity-50 line-through" : ""}`}
                          data-testid={`color-${c}`}>{c}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {sizes.length > 0 && (
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="font-black uppercase tracking-wider text-sm">Size</h3>
                    {selectedSize && (
                      <motion.span
                        key={selectedSize}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        className="text-xs font-bold text-primary uppercase tracking-widest"
                      >
                        {selectedSize}
                      </motion.span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size, i) => (
                      <motion.button
                        key={size}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.32 + i * 0.04, type: "spring", stiffness: 420, damping: 28 }}
                        onClick={() => setSelectedSize(size)}
                        whileTap={{ scale: 0.91 }}
                        className="relative h-11 sm:h-12 min-w-[2.75rem] sm:min-w-[3.25rem] px-3 sm:px-4 font-bold text-sm focus:outline-none"
                        data-testid={`size-${size}`}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        {/* Sliding selection background */}
                        {selectedSize === size && (
                          <motion.span
                            layoutId="size-pill"
                            className="absolute inset-0 rounded-xl bg-primary"
                            transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                        style={{ borderRadius: 12, pointerEvents: "none" }}
                          />
                        )}
                        {/* Idle border */}
                        {selectedSize !== size && (
                          <span className="absolute inset-0 rounded-xl border border-white/[0.13] transition-colors duration-150 hover:border-primary/50" />
                        )}
                        <span
                          className={`relative z-10 transition-colors duration-150 ${
                            selectedSize === size ? "text-white" : "text-white/55 hover:text-white"
                          }`}
                        >
                          {size}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="font-black uppercase tracking-wider text-sm mb-3">Quantity</h3>
                <div className="flex items-center h-12 w-36 glass-qty rounded-xl overflow-hidden">
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    whileHover={{ backgroundColor: "rgba(183,156,255,0.08)" }}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    disabled={isOutOfStock}
                    data-testid="button-quantity-minus"
                  >
                    <Minus className="h-4 w-4" />
                  </motion.button>
                    <span className="flex-1 text-center font-black font-mono text-lg tabular-nums">
                      {quantity}
                    </span>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    whileHover={{ backgroundColor: "rgba(183,156,255,0.08)" }}
                    onClick={() => setQuantity((q) => Math.min(isPreOrder ? 99 : effectiveStock, q + 1))}
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    disabled={isOutOfStock || quantity >= (isPreOrder ? 99 : effectiveStock)}
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

              {isPreOrder && <ProductPreorderDetails date={preorderDate} note={product.preOrderNote} label={product.preOrderLabel} />}

              {/* Keep the purchase action visible below the pre-order details. */}
              <motion.div
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                style={{ pointerEvents: "auto" }}
              >
              <motion.div
                animate={addedPulse ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 0.35 }}
              >
                <motion.div
                  whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
                  whileTap={!isOutOfStock ? { scale: 0.96 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                >
                  <Button
                    size="lg"
                    className={`w-full h-14 text-lg font-black uppercase tracking-widest transition-all duration-300 ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "fire-gradient border-none hover:brightness-110"
                    }`}
                    disabled={isOutOfStock || addToCart.isPending}
                    onClick={handleAddToCart}
                    data-testid="button-add-to-cart"
                  >
                      {addToCart.isPending ? "Adding…" : isOutOfStock ? "Sold Out" : (
                        <span className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" /> {isPreOrder ? "Pre-order now" : "Add to Cart"}
                        </span>
                      )}
                  </Button>
                </motion.div>
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
                        <div className="product-img-frame relative aspect-square mb-3 overflow-hidden rounded-xl glass-card group-hover:shadow-[0_0_24px_rgba(183,156,255,0.22)] transition-all duration-300">
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
                          <p className="text-sm font-mono text-primary font-bold mt-1"><Price v={p.price} /></p>
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

      {/* Sticky mobile ATC bar — appears only after size is chosen + scrolled past main button */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.7 }}
            className="fixed inset-x-3 z-[49] md:hidden rounded-2xl overflow-hidden"
            style={{
              bottom: "72px",
              background: "rgba(8,8,8,0.82)",
              backdropFilter: "blur(56px) saturate(240%) brightness(1.05)",
              WebkitBackdropFilter: "blur(56px) saturate(240%) brightness(1.05)",
              border: "1px solid rgba(183,156,255,0.30)",
              boxShadow: "0 -2px 0 rgba(255,255,255,0.06) inset, 0 8px 48px rgba(0,0,0,0.72), 0 0 0 0.5px rgba(183,156,255,0.15)",
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">{product.name}</p>
                <p className="text-primary font-mono font-black text-base leading-tight"><Price v={effPrice} /></p>
                {selectedSize && (
                  <p className="text-[10px] text-white/35 font-bold mt-0.5">Size: {selectedSize}</p>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.03 }}
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-sm text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #b79cff, #6d28d9)" }}
              >
                <ShoppingCart className="h-4 w-4" />
                <AnimatePresence mode="wait">
                  <motion.span key={addToCart.isPending ? "adding" : "add"}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}>
                    {addToCart.isPending ? "Adding…" : isPreOrder ? "Pre-order now" : "Add to Cart"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
