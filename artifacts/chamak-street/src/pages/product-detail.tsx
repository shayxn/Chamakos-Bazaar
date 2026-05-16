import { useState } from "react";
import { useRoute } from "wouter";
import { useGetProduct, useAddToCart, getGetProductQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingCart, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

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
  
  const sizes = product?.sizes ? product.sizes.split(",").map(s => s.trim()) : [];

  const handleAddToCart = () => {
    if (!product) return;
    
    if (sizes.length > 0 && !selectedSize) {
      toast({
        title: "Select a size",
        description: "Please select a size before adding to cart.",
        variant: "destructive"
      });
      return;
    }
    
    addToCart.mutate(
      { data: { productId: product.id, quantity, size: selectedSize || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({
            title: "Added to Cart",
            description: `${quantity}x ${product.name} has been added to your cart.`,
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to add item to cart.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-20 text-center font-bold text-xl uppercase">Product not found</div>;
  }

  const isOutOfStock = product.stock === 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        {/* Product Images */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-square md:aspect-[4/5] bg-card rounded-lg overflow-hidden border border-border"
        >
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover object-center mix-blend-lighten"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono">
              No Image
            </div>
          )}
        </motion.div>

        {/* Product Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center"
        >
          <div className="mb-2">
            <span className="text-xs font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded-sm">
              {product.categoryName}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">
            {product.name}
          </h1>
          
          <div className="text-3xl font-mono font-bold text-primary mb-6">
            ${product.price.toFixed(2)}
          </div>
          
          {product.description && (
            <p className="text-muted-foreground leading-relaxed mb-8 border-l-2 border-primary/50 pl-4">
              {product.description}
            </p>
          )}
          
          <div className="space-y-8">
            {sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold uppercase tracking-wider text-sm">Size</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 min-w-[3rem] px-4 font-bold border rounded-sm transition-all ${
                        selectedSize === size 
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,102,0,0.3)]" 
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="font-bold uppercase tracking-wider text-sm mb-3">Quantity</h3>
              <div className="flex items-center h-12 w-32 border border-border rounded-sm bg-card">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  disabled={isOutOfStock}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center font-bold font-mono">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  disabled={isOutOfStock || quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {product.stock <= 5 && product.stock > 0 && (
                <p className="text-destructive text-sm mt-2 font-bold flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Only {product.stock} left in stock
                </p>
              )}
            </div>
            
            <Button 
              size="lg" 
              className={`w-full h-14 text-lg font-bold uppercase tracking-widest ${isOutOfStock ? "" : "fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_30px_rgba(255,102,0,0.5)] transition-all duration-300"}`}
              disabled={isOutOfStock || addToCart.isPending}
              onClick={handleAddToCart}
            >
              {addToCart.isPending ? "Adding..." : isOutOfStock ? "Sold Out" : (
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Add to Cart
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
