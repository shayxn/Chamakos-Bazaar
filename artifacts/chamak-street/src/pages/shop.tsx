import { useEffect, useState } from "react";
import { useListProducts, useListCategories, getListProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Eye } from "lucide-react";
import { PageTransition, RevealSection } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { QuickViewModal } from "@/components/quick-view-modal";
import { EventProductBadge } from "@/components/event-product-badge";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.95, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.55, ease: EASE } },
  exit: { opacity: 0, scale: 0.93, filter: "blur(3px)", transition: { duration: 0.22 } },
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  exit: {},
};

function SplitText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <div className="flex flex-wrap">
        {text.split("").map((char, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ y: "110%", opacity: 0, rotateX: 40 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.05 + i * 0.038, duration: 0.55, ease: EASE }}
            style={{ transformOrigin: "bottom center" }}
          >
            {char === " " ? "\u00a0" : char}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}

export default function Shop() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey(), staleTime: 5 * 60_000 } });

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId ? { categoryId } : {})
  };

  const { data: products, isLoading } = useListProducts(queryParams, {
    query: { queryKey: getListProductsQueryKey(queryParams), staleTime: 2 * 60_000 }
  });

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-14">
          <div>
            <SplitText text="The Shop" className="text-4xl md:text-6xl font-black uppercase tracking-tighter" />
            <motion.p
              className="text-muted-foreground mt-2 text-lg"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.5, ease: EASE }}
            >
              Latest drops and street essentials.
            </motion.p>
          </div>

          <motion.div
            className="w-full md:w-auto"
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          >
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-card border-border h-11 focus:border-primary transition-all duration-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Sidebar */}
          <motion.aside
            className="w-full md:w-56 shrink-0"
            initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
          >
            <div className="flex items-center gap-2 font-black uppercase tracking-wider mb-5 border-b border-border pb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
            </div>

            <div className="space-y-1.5">
              {[{ id: undefined as number | undefined, name: "All Categories" }, ...(categories ?? [])].map((cat, i) => (
                <motion.button
                  key={cat.id ?? "all"}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.05, ease: EASE, type: "spring", stiffness: 400, damping: 24 }}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCategoryId(cat.id)}
                  className={`block w-full text-left px-3 py-2.5 text-sm rounded-md font-bold transition-all duration-200 ${
                    categoryId === cat.id
                      ? "bg-primary/10 text-primary border-l-2 border-primary pl-2.5"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={cat.id ? `filter-category-${cat.id}` : "filter-all"}
                >
                  {cat.name}
                </motion.button>
              ))}
            </div>
          </motion.aside>

          {/* Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <motion.div
                    key={n}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: n * 0.07 }}
                    className="animate-pulse"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-4" />
                    <div className="h-3 bg-muted w-1/3 mb-3 rounded" />
                    <div className="h-5 bg-muted w-2/3 mb-2 rounded" />
                    <div className="h-5 bg-muted w-1/4 rounded" />
                  </motion.div>
                ))}
              </div>
            ) : products?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
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
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {products?.map((product) => {
                    const primaryMedia = getPrimaryProductMedia(product.imageUrl);
                    return (
                    <motion.div key={product.id} variants={cardVariants} layout>
                      <Link href={`/product/${product.id}`}>
                        <motion.div
                          className="group cursor-pointer"
                          whileHover={{ y: -7 }}
                          transition={{ type: "spring", stiffness: 300, damping: 22 }}
                          data-testid={`card-product-${product.id}`}
                        >
                          <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-card border border-border group-hover:border-primary/40 transition-all duration-300 group-hover:shadow-[0_20px_50px_rgba(255,102,0,0.2)]" style={{ transition: "box-shadow 0.45s ease, border-color 0.25s" }}>
                            {primaryMedia ? (
                              primaryMedia.type === "video" ? (
                                <video
                                  src={primaryMedia.url}
                                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                              <motion.img
                                src={primaryMedia.url}
                                alt={product.name}
                                className="w-full h-full object-cover object-center"
                                whileHover={{ scale: 1.09 }}
                                transition={{ duration: 0.5, ease: EASE }}
                              />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono text-sm">No Image</div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-350" />
                          <div className="shimmer-overlay absolute inset-0 w-full h-full pointer-events-none" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)", transform: "translateX(-150%)" }} />
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              <EventProductBadge />
                              {product.featured && (
                                <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">Featured</span>
                              )}
                              {product.sellingFast && (
                                <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">🔥 Selling Fast</span>
                              )}
                              {product.rep ? (
                                <span className="bg-black/85 text-white border border-white/20 text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">REP</span>
                              ) : (
                                <span className="bg-green-500/90 text-black text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">Original</span>
                              )}
                            </div>
                            {product.stock <= 5 && product.stock > 0 && (
                              <div className="absolute bottom-2 left-2">
                                <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">Low Stock</span>
                              </div>
                            )}
                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="bg-background text-foreground text-sm font-black px-4 py-2 uppercase tracking-widest border border-border shadow-xl">Sold Out</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5 px-0.5 pt-1">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.25em] font-bold">{product.categoryName || "Streetwear"}</p>
                            <h3 className="font-black text-sm leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-2">{product.name}</h3>
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <div className="flex items-baseline gap-1.5">
                                <p className="font-black text-primary text-base tabular-nums">AED {product.price.toFixed(2)}</p>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.06, backgroundColor: "rgba(255,102,0,0.15)" }}
                                whileTap={{ scale: 0.93 }}
                                onClick={(e) => { e.preventDefault(); setQuickViewId(product.id); }}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-2.5 py-1.5 rounded-full border border-border hover:border-primary/40 shrink-0"
                                style={{ backdropFilter: "blur(8px)" }}
                              >
                                <Eye className="h-3 w-3" /> Quick
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
      <QuickViewModal productId={quickViewId} onClose={() => setQuickViewId(null)} />
    </PageTransition>
  );
}
