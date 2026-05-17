import { useState } from "react";
import { useListProducts, useListCategories, getListProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { PageTransition } from "@/components/page-transition";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

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
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-14">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">The Shop</h1>
            <p className="text-muted-foreground mt-2 text-lg">Latest drops and street essentials.</p>
          </motion.div>

          <motion.div
            className="w-full md:w-auto"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-card border-border h-11 focus:border-primary transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Filters Sidebar */}
          <motion.aside
            className="w-full md:w-56 shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 font-black uppercase tracking-wider mb-5 border-b border-border pb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
            </div>

            <div className="space-y-1.5">
              <motion.button
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
                onClick={() => setCategoryId(undefined)}
                className={`block w-full text-left px-3 py-2.5 text-sm rounded-md font-bold transition-colors ${!categoryId ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                data-testid="filter-all"
              >
                All Categories
              </motion.button>
              {categories?.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  onClick={() => setCategoryId(cat.id)}
                  className={`block w-full text-left px-3 py-2.5 text-sm rounded-md font-bold transition-colors ${categoryId === cat.id ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  data-testid={`filter-category-${cat.id}`}
                >
                  {cat.name}
                </motion.button>
              ))}
            </div>
          </motion.aside>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <motion.div key={n} variants={cardVariants} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-4" />
                    <div className="h-3 bg-muted w-1/3 mb-3 rounded" />
                    <div className="h-5 bg-muted w-2/3 mb-2 rounded" />
                    <div className="h-5 bg-muted w-1/4 rounded" />
                  </motion.div>
                ))}
              </motion.div>
            ) : products?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-card border border-dashed border-border rounded-lg"
              >
                <h3 className="text-2xl font-black uppercase tracking-wider mb-3">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
                <Button
                  variant="outline"
                  className="mt-8 uppercase font-bold tracking-wider border-primary/30 hover:border-primary"
                  onClick={() => { setSearch(""); setCategoryId(undefined); }}
                >
                  Clear Filters
                </Button>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${categoryId}-${search}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {products?.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={cardVariants}
                      layout
                    >
                      <Link href={`/product/${product.id}`}>
                        <motion.div
                          className="group cursor-pointer"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          data-testid={`card-product-${product.id}`}
                        >
                          <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-card border border-border group-hover:border-primary/40 transition-colors duration-300">
                            {product.imageUrl ? (
                              <motion.img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover object-center"
                                whileHover={{ scale: 1.07 }}
                                transition={{ duration: 0.45 }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono text-sm">
                                No Image
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {product.stock <= 5 && product.stock > 0 && (
                              <div className="absolute top-2 left-2">
                                <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">Low Stock</span>
                              </div>
                            )}
                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="bg-background text-foreground text-sm font-black px-4 py-2 uppercase tracking-widest border border-border shadow-xl">Sold Out</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 px-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{product.categoryName}</p>
                            <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                            <p className="font-mono text-primary font-bold text-lg">AED {product.price.toFixed(2)}</p>
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
