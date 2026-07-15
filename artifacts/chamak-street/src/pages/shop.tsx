import { useEffect, useState, useMemo } from "react";
import { useListProducts, useListCategories, getListProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Link, useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "@/lib/motion-noop";
import { Eye } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { QuickViewModal } from "@/components/quick-view-modal";
import { EventProductBadge } from "@/components/event-product-badge";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.18 } },
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
  exit: {},
};

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

  const [localSearch, setLocalSearch] = useState("");
  const debouncedSearch = useDebouncedValue(localSearch.trim(), 300);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey(), staleTime: 5 * 60_000 }
  });

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(urlCatId ? { categoryId: urlCatId } : {}),
  };

  const { data: rawProducts, isLoading } = useListProducts(queryParams, {
    query: { queryKey: getListProductsQueryKey(queryParams), staleTime: 2 * 60_000 }
  });

  const products = useMemo(() => {
    if (!rawProducts) return rawProducts;
    if (isNewest) {
      return [...rawProducts].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return rawProducts;
  }, [rawProducts, isNewest]);

  const allCategories = [
    { id: undefined as number | undefined, name: "All", href: "/shop" },
    ...(categories ?? []).map((c) => ({ id: c.id, name: c.name, href: `/shop?cat=${c.id}` })),
    { id: -1, name: "Latest Arrivals", href: "/shop?new=1" },
  ];

  const activeCatId = isNewest ? -1 : urlCatId;

  return (
    <PageTransition>
      <div className="min-h-screen bg-black">
        {/* Filter bar */}
        <div className="border-b border-white/8 bg-black">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {allCategories.map((cat) => {
                const isActive = cat.id === activeCatId || (cat.id === undefined && activeCatId === undefined);
                return (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className={`text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded border transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white border-primary"
                        : "text-white/50 border-white/12 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <input
                type="text"
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                data-testid="input-search"
                className="bg-transparent border border-white/15 rounded text-white text-xs placeholder:text-white/30 px-3 py-1.5 outline-none focus:border-white/40 w-36 transition-all"
              />
              <span className="text-white/30 text-xs font-bold tabular-nums shrink-0">
                {products?.length ?? 0} products
              </span>
            </div>
          </div>
        </div>

        {/* Active label */}
        {(isNewest || urlCatId !== undefined) && (
          <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-0">
            <h2 className="text-lg font-black uppercase tracking-widest text-white/80">
              {isNewest
                ? "Latest Arrivals"
                : categories?.find((c) => c.id === urlCatId)?.name ?? ""}
            </h2>
          </div>
        )}

        {/* Product grid */}
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <div key={n} className="animate-pulse">
                  <div className="aspect-square bg-white/5 rounded-lg mb-3" />
                  <div className="h-3 bg-white/5 w-1/3 mb-2 rounded" />
                  <div className="h-4 bg-white/5 w-2/3 mb-1.5 rounded" />
                  <div className="h-4 bg-white/5 w-1/4 rounded" />
                </div>
              ))}
            </div>
          ) : products?.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-2xl font-black uppercase tracking-wider text-white mb-3">No products found</h3>
              <p className="text-white/40 mb-8">Try adjusting your filters or search term.</p>
              <Link href="/shop">
                <button className="text-[11px] font-black uppercase tracking-widest text-white/60 border border-white/20 hover:border-primary hover:text-primary px-6 py-2.5 rounded transition-all">
                  Clear Filters
                </button>
              </Link>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${urlCatId}-${isNewest}-${debouncedSearch}`}
                variants={gridVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
              >
                {products?.map((product) => {
                  const primaryMedia = getPrimaryProductMedia(product.imageUrl);
                  return (
                    <motion.div key={product.id} variants={cardVariants} layout>
                      <Link href={`/product/${product.id}`}>
                        <div
                          className="group cursor-pointer"
                          data-testid={`card-product-${product.id}`}
                        >
                          {/* Image */}
                          <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-white/5 border border-white/8 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_0_20px_rgba(255,102,0,0.18)]">
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
                                <img
                                  src={primaryMedia.url}
                                  alt={product.name}
                                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-mono">No Image</div>
                            )}

                            {/* Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              <EventProductBadge />
                              {product.featured && (
                                <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm">Featured</span>
                              )}
                              {product.sellingFast && (
                                <span className="bg-orange-500 text-black text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm">🔥 Hot</span>
                              )}
                              {product.rep ? (
                                <span className="bg-black/80 text-white border border-white/20 text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm">REP</span>
                              ) : (
                                <span className="bg-green-500/90 text-black text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm">Original</span>
                              )}
                            </div>

                            {product.stock <= 5 && product.stock > 0 && (
                              <div className="absolute bottom-2 left-2">
                                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm">Low Stock</span>
                              </div>
                            )}
                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="bg-black text-white text-xs font-black px-4 py-2 uppercase tracking-widest border border-white/20">Sold Out</span>
                              </div>
                            )}

                            {/* Quick view on hover */}
                            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-black/90 py-2 flex items-center justify-center">
                              <button
                                onClick={(e) => { e.preventDefault(); setQuickViewId(product.id); }}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-primary transition-colors"
                              >
                                <Eye className="h-3 w-3" /> Quick View
                              </button>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="px-0.5">
                            <p className="text-[9px] text-white/35 uppercase tracking-[0.22em] font-bold mb-1">{product.categoryName || "Streetwear"}</p>
                            <h3 className="font-black text-white text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-1.5">{product.name}</h3>
                            <p className="font-black text-primary text-sm tabular-nums">AED {product.price.toFixed(2)}</p>
                          </div>
                        </div>
                      </Link>
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
