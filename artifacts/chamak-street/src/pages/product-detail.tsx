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

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) }
  });

  const addToCart = useAddToCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [addedPulse, setAddedPulse] = useState(false);

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
          setTimeout(() => setAddedPulse(false), 600);
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

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Link href="/shop">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider">
              <ArrowLeft className="h-4 w-4" /> Back to Shop
            </button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-square md:aspect-[4/5] bg-card rounded-lg overflow-hidden border border-border group"
          >
            {product.imageUrl ? (
              <motion.img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover object-center mix-blend-lighten"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6 }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono">
                No Image
              </div>
            )}
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(255,102,0,0.2), transparent 70%)" }}
            />
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center"
          >
            <motion.div className="mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <span className="text-xs font-black tracking-widest uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-sm">
                {product.categoryName}
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {product.name}
            </motion.h1>

            <motion.div
              className="text-3xl font-mono font-black text-primary mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              ${product.price.toFixed(2)}
            </motion.div>

            {product.description && (
              <motion.p
                className="text-muted-foreground leading-relaxed mb-8 border-l-2 border-primary/50 pl-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {product.description}
              </motion.p>
            )}

            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {/* Size selector */}
              {sizes.length > 0 && (
                <div>
                  <h3 className="font-black uppercase tracking-wider text-sm mb-3">Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <motion.button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className={`h-12 min-w-[3rem] px-4 font-bold border rounded-sm transition-all ${selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,102,0,0.35)]"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
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
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-50"
                    disabled={isOutOfStock}
                    data-testid="button-quantity-minus"
                  >
                    <Minus className="h-4 w-4" />
                  </motion.button>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={quantity}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 text-center font-black font-mono text-lg"
                    >
                      {quantity}
                    </motion.div>
                  </AnimatePresence>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-50"
                    disabled={isOutOfStock || quantity >= product.stock}
                    data-testid="button-quantity-plus"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.button>
                </div>
                {product.stock <= 5 && product.stock > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-destructive text-sm mt-2 font-bold flex items-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" /> Only {product.stock} left in stock
                  </motion.p>
                )}
              </div>

              {/* Add to cart */}
              <motion.div animate={addedPulse ? { scale: [1, 1.03, 1] } : {}}>
                <Button
                  size="lg"
                  className={`w-full h-14 text-lg font-black uppercase tracking-widest ${isOutOfStock ? "" : "fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.55)] transition-all duration-300"}`}
                  disabled={isOutOfStock || addToCart.isPending}
                  onClick={handleAddToCart}
                  data-testid="button-add-to-cart"
                >
                  <AnimatePresence mode="wait">
                    {addToCart.isPending ? (
                      <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Adding...</motion.span>
                    ) : isOutOfStock ? (
                      <motion.span key="sold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sold Out</motion.span>
                    ) : (
                      <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" /> Add to Cart
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
