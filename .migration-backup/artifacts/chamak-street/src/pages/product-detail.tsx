import { useState } from "react";
import { useRoute } from "wouter";
import { useGetProduct, useAddToCart, getGetProductQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingCart, AlertCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { PageTransition } from "@/components/page-transition";
import { parseProductMedia } from "@/lib/product-media";

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

  const addToCart = useAddToCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [addedPulse, setAddedPulse] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

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
      </div>
    </PageTransition>
  );
}
