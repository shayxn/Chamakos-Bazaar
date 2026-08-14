import { useEffect, useState, useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useListProducts, useListCategories, getListProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Link, useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, LayoutGrid, Grid2X2, SlidersHorizontal, X } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { QuickViewModal } from "@/components/quick-view-modal";
import { EventProductBadge } from "@/components/event-product-badge";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.16 } },
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
  exit: {},
};

type SortKey = "default" | "price-asc" | "price-desc" | "name-asc" | "newest";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);
  return debouncedValue;
}

export default function Shop() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const urlCatId = params.get("cat") ? Number(params.get("cat")) : undefined;
  const isNewest = params.get("new") === "1";

  const [localSearch, setLocalSearch] = useState(params.get("search") || "");
  const debouncedSearch = useDebouncedValue(localSearch.trim(), 300);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [cols, setCols] = useState<4 | 2>(4);
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey(), staleTime: 60_000 }
  });

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(urlCatId ? { categoryId: urlCatId } : {}),
  };

  const { data: rawProducts, isLoading } = useListProducts(queryParams, {
    query: { queryKey: getListProductsQueryKey(queryParams), staleTime: 30_000, placeholderData: keepPreviousData }
  });

  const products = useMemo(() => {
    if (!rawProducts) return rawProducts;
    let list = [...rawProducts];
    if (isNewest || sortKey === "newest") {
      list = list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else if (sortKey === "price-asc") {
      list = list.sort((a, b) => a.price - b.price);
    } else if (sortKey === "price-desc") {
      list = list.sort((a, b) => b.price - a.price);
    } else if (sortKey === "name-asc") {
      list = list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [rawProducts, isNewest, sortKey]);

  const allCategories = [
    { id: undefined as number | undefined, name: "All", href: "/shop" },
    ...(categories ?? []).map((c) => ({ id: c.id, name: c.name, href: `/shop?cat=${c.id}` })),
    { id: -1, name: "New Arrivals", href: "/shop?new=1" },
  ];

  const activeCatId = isNewest ? -1 : urlCatId;
  const activeLabel = isNewest ? "New Arrivals" : urlCatId ? categories?.find(c => c.id === urlCatId)?.name : "All Products";

  const hasActiveFilter = isNewest || urlCatId !== undefined || debouncedSearch;

  const gridCols = {
    2: "grid-cols-2",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  }[cols];

  return (
    <PageTransition>
      <div className="min-h-screen bg-black">

        {/* ── Sticky filter bar ── */}
        <div className="sticky top-[56px] md:top-[109px] z-30 border-b border-white/8 glass-nav">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">

            {/* Category pills row */}
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
              {allCategories.map((cat) => {
                const isActive = cat.id === activeCatId || (cat.id === undefined && activeCatId === undefined);
                return (
                  <Link key={cat.href} href={cat.href}>
                    <motion.div
                      whileTap={{ scale: 0.94 }}
                      className="relative shrink-0"
                    >
                      <span
                        className={`block text-[11px] font-black uppercase tracking-[0.14em] px-3.5 py-1.5 rounded-full border transition-colors duration-150 whitespace-nowrap ${
                          isActive
                            ? "bg-primary/15 text-primary border-primary/50"
                            : "text-white/45 border-white/10 hover:text-white/80 hover:border-white/25"
                        }`}
                      >
                        {cat.name}
                      </span>
                      {isActive && (
                        <motion.span
                          layoutId="cat-active-pill"
                          className="absolute inset-0 rounded-full border border-primary/50 bg-primary/15 -z-10"
                          transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2.5 border-t border-white/5 pt-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0 max-w-full sm:max-w-[220px]">
                <input
                  type="text"
                  placeholder="Search products…"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  data-testid="input-search"
                  className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder:text-white/30 px-3 py-2 outline-none focus:border-primary/50 focus:bg-white/7 transition-all pr-7"
                />
                <AnimatePresence>
                  {localSearch && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      onClick={() => setLocalSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort */}
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="h-11 px-2.5 text-[11px] font-bold bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="default">Sort: Default</option>
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name-asc">Name: A → Z</option>
              </select>

              {/* Count */}
              <span className="hidden sm:block text-white/30 text-xs font-bold tabular-nums ml-auto">
                {isLoading ? "—" : `${products?.length ?? 0} items`}
              </span>

              {/* Grid toggle */}
              <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
                {([4, 2] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setCols(n)}
                    className={`w-11 h-11 flex items-center justify-center transition-colors ${cols === n ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white/60"}`}
                    aria-label={n === 4 ? "4 columns" : "2 columns"}
                  >
                    {n === 4 ? <LayoutGrid className="h-3.5 w-3.5" /> : <Grid2X2 className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Active section label ── */}
        <AnimatePresence>
          {activeLabel && (
            <motion.div
              key={activeLabel}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-0 flex items-center justify-between"
            >
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-white">{activeLabel}</h2>
                {!isLoading && <p className="text-white/35 text-xs mt-0.5">{products?.length ?? 0} products</p>}
              </div>
              {hasActiveFilter && (
                <Link href="/shop">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear filters
                  </motion.button>
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Product grid ── */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
          {isLoading ? (
            <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
              {Array.from({ length: 10 }).map((_, n) => (
                <div key={n} className="animate-pulse">
                  <div className="aspect-square bg-white/5 rounded-xl mb-3" />
                  <div className="h-2.5 bg-white/5 w-1/3 mb-2 rounded-full" />
                  <div className="h-3.5 bg-white/5 w-2/3 mb-1.5 rounded-full" />
                  <div className="h-3.5 bg-white/5 w-1/4 rounded-full" />
                </div>
              ))}
            </div>
          ) : products?.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-28 max-w-xs mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
                <SlidersHorizontal className="h-7 w-7 text-white/20" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2">No results</h3>
              <p className="text-white/40 text-sm mb-7">
                {debouncedSearch ? `Nothing matched "${debouncedSearch}"` : "No products in this category yet."}
              </p>
              <Link href="/shop">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="text-[11px] font-black uppercase tracking-widest text-primary border border-primary/40 hover:bg-primary/10 px-6 py-2.5 rounded-full transition-colors"
                >
                  Browse All Products
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${urlCatId}-${isNewest}-${debouncedSearch}-${sortKey}-${cols}`}
                variants={gridVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className={`grid ${gridCols} gap-3 sm:gap-4`}
              >
                {products?.map((product) => {
                  const primaryMedia = getPrimaryProductMedia(product.imageUrl);
                  return (
                    <motion.div key={product.id} variants={cardVariants} layout>
                      <div className="group cursor-pointer" data-testid={`card-product-${product.id}`}>
                        {/* Image */}
                        <div className="relative aspect-square mb-3 overflow-hidden rounded-xl glass-card transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_0_28px_rgba(255,102,0,0.2)]">
                          <Link href={`/product/${product.id}`} className="block w-full h-full">
                            {primaryMedia ? (
                              primaryMedia.type === "video" ? (
                                <video
                                  src={primaryMedia.url}
                                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-106"
                                  muted playsInline preload="metadata"
                                />
                              ) : (
                                <img
                                  src={primaryMedia.url}
                                  alt={product.name}
                                  loading="lazy"
                                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-106"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/15 text-xs font-bold">No Image</div>
                            )}
                          </Link>

                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                            <EventProductBadge />
                            {product.featured && (
                              <span className="bg-primary/90 text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm backdrop-blur-sm">Featured</span>
                            )}
                            {product.sellingFast && (
                              <span className="bg-orange-500/90 text-black text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm backdrop-blur-sm">🔥 Hot</span>
                            )}
                          </div>

                          {/* Low stock / sold out */}
                          {product.stock <= 5 && product.stock > 0 && (
                            <div className="absolute bottom-2 left-2 pointer-events-none">
                              <span className="bg-red-600/90 text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm backdrop-blur-sm">Only {product.stock} left</span>
                            </div>
                          )}
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/65 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
                              <span className="bg-black/90 text-white text-xs font-black px-4 py-2 uppercase tracking-widest border border-white/20 rounded-sm">Sold Out</span>
                            </div>
                          )}

                          {/* Quick view — slides up on hover */}
                          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-black/85 backdrop-blur-sm py-2.5 flex items-center justify-center">
                            <button
                              onClick={(e) => { e.preventDefault(); setQuickViewId(product.id); }}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/75 hover:text-primary transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> Quick View
                            </button>
                          </div>
                        </div>

                        {/* Info */}
                        <Link href={`/product/${product.id}`}>
                          <div className="px-0.5 space-y-0.5">
                            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">{product.categoryName || "Streetwear"}</p>
                            <h3 className="font-black text-white text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">{product.name}</h3>
                            <div className="flex items-center justify-between pt-0.5">
                              <p className="font-black text-primary text-sm tabular-nums">AED {product.price.toFixed(2)}</p>
                              {product.sizes && (
                                <p className="text-[9px] text-white/25 font-bold hidden sm:block">
                                  {product.sizes.split(",").slice(0, 3).map(s => s.trim()).join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
      <QuickViewModal productId={quickViewId} onClose={() => setQuickViewId(null)} />
    </PageTransition>
  );
}
