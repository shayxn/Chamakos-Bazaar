import { useState } from "react";
import { useRoute } from "wouter";
import { useGetProduct, useAddToCart, useListProducts, getGetProductQueryKey, getGetCartQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingCart, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { PageTransition } from "@/components/page-transition";
import { parseProductMedia, getPrimaryProductMedia } from "@/lib/product-media";
import { QuickViewModal } from "@/components/quick-view-modal";
import { useSettings } from "@/lib/use-settings";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

function MotionItem({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id), staleTime: 2 * 60_000 }
  });

  const settings = useSettings();
  const recVisible = settings.recommended_visible !== "false";
  const recTitle = settings.recommended_title || "You May Also Like";
  const recCount = Math.max(2, Math.min(12, Number(settings.recommended_count) || 6));
  const sliderRef = useRef<HTMLDivElement>(null);

  const categoryId = product?.categoryId ?? undefined;
  const { data: relatedProducts } = useListProducts(
    categoryId ? { categoryId } : undefined,
    { query: { enabled: !!categoryId && recVisible, queryKey: getListProductsQueryKey(categoryId ? { categoryId } : undefined), staleTime: 2 * 60_000 } }
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

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [addedPulse, setAddedPulse] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);

  const sizes = product?.sizes ? product.sizes.split(",").map((s) => s.trim()) : [];

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
          toast({ title: "Added to Cart", description: `${quantity}x ${product.name} added.` });
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
  const mediaItems = parseProductMedia(product.imageUrl);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {/* Media gallery */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.75, ease: EASE }}
              className="relative aspect-square md:aspect-[4/5] bg-card rounded-lg overflow-hidden border border-border group"
            >
              {selectedMedia ? (
                selectedMedia.type === "video" ? (
                  <video
                    src={selectedMedia.url}
                    className="w-full h-full object-cover object-center"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <motion.img
                    src={selectedMedia.url}
                    alt={product.name}
                    className="w-full h-full object-cover object-center"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.65, ease: EASE }}
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono">No Image</div>
              )}
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
              <div className="grid grid-cols-5 gap-2">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded-md border bg-card ${selectedMediaIndex === index ? "border-primary" : "border-border"}`}
                  >
                    {item.type === "video" ? (
                      <>
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">Video</span>
                      </>
                    ) : (
                      <img src={item.url} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
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
                <span className="text-xs font-black tracking-widest uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-sm">
                  {product.categoryName}
                </span>
                {product.featured && (
                  <span className="text-xs font-black tracking-widest uppercase bg-primary text-primary-foreground px-3 py-1.5 rounded-sm">
                    Featured
                  </span>
                )}
                {product.rep ? (
                  <span className="text-xs font-black tracking-widest uppercase bg-black/85 text-white border border-white/20 px-3 py-1.5 rounded-sm">
                    REP
                  </span>
                ) : (
                  <span className="text-xs font-black tracking-widest uppercase bg-green-500/90 text-black px-3 py-1.5 rounded-sm">
                    Original
                  </span>
                )}
              </div>
            </MotionItem>

            <MotionItem delay={0.22} className="mt-4">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
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
                        className={`h-12 min-w-[3rem] px-4 font-bold border rounded-sm transition-all duration-200 ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_rgba(255,102,0,0.45)]"
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
            </MotionItem>
          </div>
        </div>

        {recVisible && related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            className="mt-24 border-t border-border pt-16"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] text-primary uppercase tracking-widest font-black mb-1">Curated for You</p>
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
                        <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-card border border-border group-hover:border-primary/40 transition-all duration-300 group-hover:shadow-[0_8px_28px_rgba(255,102,0,0.2)]">
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
    </PageTransition>
  );
}
