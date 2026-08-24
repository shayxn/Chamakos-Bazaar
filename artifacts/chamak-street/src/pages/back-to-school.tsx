import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Grid2X2, LayoutGrid, Search, X } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { PageTransition } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type SortKey = "default" | "price-asc" | "price-desc" | "newest";

export default function BackToSchool() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("default");
  const [cols, setCols] = useState<2 | 4>(4);

  const { data: rawProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["back-to-school-products"],
    queryFn: async () => {
      const url = new URL(`${BASE}/api/products`, window.location.origin);
      url.searchParams.set("collection", "back_to_school");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Unable to load Back To School products");
      return res.json() as Promise<Product[]>;
    },
    staleTime: 30_000,
  });

  const products = useMemo(() => {
    const list = [...(rawProducts ?? [])].filter((product) => product.name.toLowerCase().includes(search.trim().toLowerCase()));
    if (sort === "price-asc") return list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return list.sort((a, b) => b.price - a.price);
    if (sort === "newest") return list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return list;
  }, [rawProducts, search, sort]);

  const gridCols = cols === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 14% 10%, rgba(255,193,7,0.24), transparent 28%), radial-gradient(circle at 83% 28%, rgba(255,102,0,0.24), transparent 34%), linear-gradient(115deg, #070707 24%, #17100a 100%)" }} />
          <motion.div
            aria-hidden="true"
            animate={{ x: ["-30%", "120%"] }}
            transition={{ duration: 6.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
            className="absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-yellow-200 to-transparent"
          />
          <div className="relative mx-auto max-w-[1440px] px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                <BookOpen className="h-3.5 w-3.5" /> FirstPick collection
              </div>
              <h1 className="mt-5 text-4xl font-black uppercase tracking-tighter sm:text-6xl">
                Back to <span style={{ background: "linear-gradient(135deg, #ffd54a, #ff7a00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>School</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
                School-ready essentials for Dubai. Backpacks, pencil cases, stationery, calculators and the useful things students reach for every day.
              </p>
              <Link href="/basics">
                <motion.span whileHover={{ x: 4 }} className="mt-6 inline-flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-300">
                  Shop low-cost Basics <ArrowRight className="h-3.5 w-3.5" />
                </motion.span>
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="sticky top-[56px] z-30 border-b border-white/10 bg-black/80 backdrop-blur-xl md:top-[109px]">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
            <div className="relative min-w-0 flex-1 sm:max-w-[250px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search school essentials…" className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-9 pr-8 text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:border-orange-400/50" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/35 hover:text-white"><X className="h-3 w-3" /></button>}
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-10 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-[11px] font-bold text-white/70 outline-none">
              <option value="default">Sort: Recommended</option>
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            <span className="ml-auto hidden text-xs font-bold tabular-nums text-white/30 sm:block">{isLoading ? "—" : `${products.length} items`}</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {([4, 2] as const).map((value) => <button key={value} onClick={() => setCols(value)} className={`flex h-10 w-10 items-center justify-center ${cols === value ? "bg-orange-500/20 text-orange-300" : "text-white/35 hover:text-white/60"}`} aria-label={`${value} columns`}>{value === 4 ? <LayoutGrid className="h-3.5 w-3.5" /> : <Grid2X2 className="h-3.5 w-3.5" />}</button>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
          {isLoading ? (
            <div className={`grid ${gridCols} gap-3 sm:gap-4`}>{Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[.78] animate-pulse rounded-xl bg-white/[0.05]" />)}</div>
          ) : products.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md py-24 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-orange-300/45" />
              <h2 className="mt-4 text-xl font-black uppercase tracking-wider">{search ? "No matching products" : "School collection loading"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{search ? "Try another keyword." : "New Back To School products are reviewed in the importer before they appear here."}</p>
              <Link href="/shop"><button className="mt-6 rounded-full border border-orange-400/35 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-orange-300 transition-colors hover:bg-orange-400/10">Browse main store</button></Link>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={`${search}-${sort}-${cols}`} initial="hidden" animate="show" exit="hidden" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }} className={`grid ${gridCols} gap-3 sm:gap-4`}>
                {products.map((product) => {
                  const media = getPrimaryProductMedia(product.imageUrl);
                  return (
                    <motion.div key={product.id} variants={{ hidden: { opacity: 0, y: 16, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE } } }}>
                      <Link href={`/product/${product.id}`} className="group block">
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-300 group-hover:border-orange-400/45 group-hover:shadow-[0_0_28px_rgba(255,102,0,0.17)]">
                          {media ? media.type === "video" ? <video src={media.url} muted playsInline preload="metadata" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <img src={media.url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <BookOpen className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/15" />}
                          <span className="absolute left-2 top-2 rounded-sm bg-yellow-300/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">School pick</span>
                          {product.stock === 0 && <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-[10px] font-black uppercase tracking-widest text-white">Sold out</span>}
                        </div>
                        <div className="px-1 pb-2 pt-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{product.categoryName || "School essential"}</p>
                          <h2 className="mt-1 line-clamp-2 text-xs font-black leading-snug text-white transition-colors group-hover:text-orange-300">{product.name}</h2>
                          <p className="mt-2 text-sm font-black tabular-nums text-orange-300">AED {product.price.toFixed(2)}</p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </div>
    </PageTransition>
  );
}