import { useState } from "react";
import { useListProducts, useListCategories, getListProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Shop() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  
  const queryParams = { 
    ...(search ? { search } : {}), 
    ...(categoryId ? { categoryId } : {}) 
  };
  
  const { data: products, isLoading } = useListProducts(queryParams, { 
    query: { queryKey: getListProductsQueryKey(queryParams) } 
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">The Shop</h1>
          <p className="text-muted-foreground mt-2">Latest drops and street essentials.</p>
        </div>
        
        <div className="w-full md:w-auto flex gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-9 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          <div>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider mb-4 border-b border-border pb-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => setCategoryId(undefined)}
                className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${!categoryId ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"}`}
              >
                All Categories
              </button>
              {categories?.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${categoryId === cat.id ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(n => (
                <div key={n} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                  <div className="h-4 bg-muted w-2/3 mb-2 rounded"></div>
                  <div className="h-4 bg-muted w-1/3 rounded"></div>
                </div>
              ))}
            </div>
          ) : products?.length === 0 ? (
            <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
              <h3 className="text-xl font-bold uppercase tracking-wider mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
              <Button 
                variant="outline" 
                className="mt-6 uppercase font-bold tracking-wider"
                onClick={() => { setSearch(""); setCategoryId(undefined); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products?.map((product, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={product.id} 
                  className="group"
                >
                  <Link href={`/product/${product.id}`}>
                    <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-card border border-border">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono">
                          No Image
                        </div>
                      )}
                      {product.stock <= 5 && product.stock > 0 && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 uppercase tracking-wider rounded-sm">Low Stock</span>
                        </div>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[2px]">
                          <span className="bg-background text-foreground text-sm font-bold px-4 py-2 uppercase tracking-widest border border-border shadow-xl">Sold Out</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">{product.categoryName}</p>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                      <p className="font-mono text-primary font-bold">${product.price.toFixed(2)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
