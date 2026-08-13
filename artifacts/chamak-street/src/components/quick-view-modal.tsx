import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetProduct, useAddToCart, getGetCartQueryKey, getGetProductQueryKey } from "@workspace/api-client-react";
import { useCartFly } from "./cart-fly-context";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getPrimaryProductMedia } from "@/lib/product-media";

const EASE = [0.16, 1, 0.3, 1] as const;

interface QuickViewModalProps {
  productId: number | null;
  onClose: () => void;
}

export function QuickViewModal({ productId, onClose }: QuickViewModalProps) {
  const [selectedSize, setSelectedSize] = useState("");
  const [addedPulse, setAddedPulse] = useState(false);

  const { data: product, isLoading } = useGetProduct(productId ?? 0, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId ?? 0), staleTime: 30_000 },
  });

  const addToCart = useAddToCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { triggerFly } = useCartFly();
  const imgRef = useRef<HTMLDivElement>(null);

  const sizes = product?.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const primaryMedia = product ? getPrimaryProductMedia(product.imageUrl) : null;
  const isOutOfStock = !product || product.stock === 0;

  const handleAdd = () => {
    if (!product) return;
    if (sizes.length > 0 && !selectedSize) {
      toast({ title: "Select a size", description: "Please choose a size first.", variant: "destructive" });
      return;
    }
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1, size: selectedSize || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setAddedPulse(true);
          setTimeout(() => setAddedPulse(false), 700);
          toast({ title: "Added to cart", description: `${product.name} added.` });
          if (imgRef.current && primaryMedia?.url) {
            triggerFly(primaryMedia.url, imgRef.current);
          }
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {productId && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="glass-modal relative w-full max-w-2xl pointer-events-auto rounded-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto mx-2 sm:mx-4"
            >
              {isLoading || !product ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row">
                  <div ref={imgRef} className="product-img-frame relative w-full sm:w-64 aspect-square sm:aspect-auto sm:h-auto bg-muted shrink-0 overflow-hidden">
                    {primaryMedia ? (
                      primaryMedia.type === "video" ? (
                        <video src={primaryMedia.url} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                      ) : (
                        <img src={primaryMedia.url} alt={product.name} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-mono">No Image</div>
                    )}
                    {product.featured && (
                      <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">Featured</span>
                    )}
                  </div>

                  <div className="flex-1 p-6 flex flex-col gap-4">
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 sm:static sm:self-end text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div>
                      {product.categoryName && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{product.categoryName}</p>
                      )}
                      <h2 className="text-xl font-black uppercase tracking-tight leading-tight">{product.name}</h2>
                      <p className="text-2xl font-mono text-primary font-bold mt-2">AED {product.price.toFixed(2)}</p>
                    </div>

                    {product.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{product.description}</p>
                    )}

                    {sizes.length > 0 && (
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest mb-2">Size</p>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => setSelectedSize(s)}
                              className={`px-3 py-1.5 text-xs font-bold uppercase border rounded-md transition-all ${
                                selectedSize === s
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mt-auto">
                      <motion.div
                        animate={addedPulse ? { scale: [1, 1.04, 1] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <Button
                          size="lg"
                          className={`w-full font-black uppercase tracking-widest ${
                            isOutOfStock ? "opacity-50 cursor-not-allowed" : "fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.35)]"
                          }`}
                          disabled={isOutOfStock || addToCart.isPending}
                          onClick={handleAdd}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {isOutOfStock ? "Sold Out" : addToCart.isPending ? "Adding..." : "Add to Cart"}
                        </Button>
                      </motion.div>
                      <Link href={`/product/${product.id}`} onClick={onClose}>
                        <Button variant="outline" size="sm" className="w-full text-xs font-bold uppercase tracking-wider">
                          <ExternalLink className="h-3.5 w-3.5 mr-2" /> View Full Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
