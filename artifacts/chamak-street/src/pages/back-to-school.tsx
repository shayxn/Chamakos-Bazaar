import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Award, Backpack, BookOpen, Calculator, Check, ChevronRight,
  Package, Pencil, Search, ShieldCheck, ShoppingBag, Truck, X,
} from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { PageTransition } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { useSettings } from "@/lib/use-settings";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;
const CATEGORY_ICONS = [Package, Backpack, Pencil, BookOpen, Calculator, ShoppingBag];

export default function BackToSchool() {
  const settings = useSettings();
  const isEnabled = settings.back_to_school_enabled !== "false";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Essentials");
  const [animationRun, setAnimationRun] = useState(0);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isEnabled) return;
    let started = false;
    const startAnimation = () => {
      if (started) return;
      started = true;
      setAnimationRun((current) => current + 1);
    };
    const hasSeenBoot = sessionStorage.getItem("firstpick_loaded");

    if (hasSeenBoot) {
      const timer = window.setTimeout(startAnimation, 500);
      return () => window.clearTimeout(timer);
    }

    window.addEventListener("firstpick:boot-complete", startAnimation, { once: true });
    const fallback = window.setTimeout(startAnimation, 4300);
    return () => {
      window.removeEventListener("firstpick:boot-complete", startAnimation);
      window.clearTimeout(fallback);
    };
  }, [isEnabled]);

  useEffect(() => {
    if (!animationRun) return;
    const timer = window.setTimeout(() => setAnimationRun(0), 2800);
    return () => window.clearTimeout(timer);
  }, [animationRun]);

  const { data: rawProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["back-to-school-products"],
    queryFn: async () => {
      const url = new URL(`${BASE}/api/products`, window.location.origin);
      url.searchParams.set("collection", "back_to_school");
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Unable to load Back To School products");
      return response.json() as Promise<Product[]>;
    },
    enabled: isEnabled,
    staleTime: 30_000,
  });

  const categories = useMemo(() => {
    const names = Array.from(new Set((rawProducts ?? []).map((product) => product.categoryName).filter(Boolean))) as string[];
    return ["All Essentials", ...names];
  }, [rawProducts]);

  const products = useMemo(() => (rawProducts ?? []).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = activeCategory === "All Essentials" || product.categoryName === activeCategory;
    return matchesSearch && matchesCategory;
  }), [rawProducts, search, activeCategory]);

  const heroProducts = (rawProducts ?? []).slice(0, 5);

  const addToCart = async (event: React.MouseEvent<HTMLButtonElement>, product: Product) => {
    event.preventDefault();
    event.stopPropagation();
    setAddingId(product.id);
    try {
      const response = await fetch(`${BASE}/api/cart/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (!response.ok) throw new Error("Could not add product");
      setAddedId(product.id);
      window.setTimeout(() => setAddedId(null), 1600);
    } finally {
      setAddingId(null);
    }
  };

  if (!isEnabled) {
    return (
      <PageTransition>
        <main className="flex min-h-[62vh] items-center justify-center bg-black px-5 text-center text-white">
          <div className="max-w-md">
            <Backpack className="mx-auto h-12 w-12 text-orange-300/60" />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">Seasonal collection</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tighter">Back to School is taking a break</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/45">The collection is currently hidden. Browse the full FirstPick store instead.</p>
            <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black">
              Shop all products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[#050505] pb-10 text-white">
        {typeof document !== "undefined" && createPortal(
          <>
            <style>{`
              @keyframes firstpickSchoolBackpack {
                0% { opacity: 0; transform: translateY(320px) scale(.68) rotate(-9deg); }
                26% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
                44% { opacity: 1; transform: translateY(0) scale(1.04) rotate(-5deg); }
                60% { opacity: 1; transform: translateY(0) scale(1.02) rotate(5deg); }
                75% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
                100% { opacity: 0; transform: translateY(-24px) scale(.9) rotate(0deg); }
              }
              @media (prefers-reduced-motion: reduce) {
                .firstpick-school-backpack {
                  animation: none !important;
                  opacity: 1 !important;
                  transform: none !important;
                }
              }
            `}</style>
            {animationRun > 0 && (
              <div
                data-testid="back-to-school-animation"
                role="status"
                aria-label="Backpack animation"
                className="pointer-events-none fixed inset-0 z-[10001] flex items-center justify-center overflow-hidden"
              >
                <div
                  className="firstpick-school-backpack relative flex h-40 w-40 flex-col items-center justify-center rounded-[2.2rem] border border-yellow-100/50 bg-gradient-to-br from-[#ff9e00] via-[#ff7a00] to-[#ffcf52] text-black shadow-[0_0_110px_rgba(255,145,0,0.62)]"
                  style={{ animation: "firstpickSchoolBackpack 2.6s cubic-bezier(.16,1,.3,1) forwards" }}
                >
                  <Backpack className="h-20 w-20" strokeWidth={1.5} />
                  <span className="mt-1 text-[9px] font-black uppercase tracking-[0.22em]">Ready to learn</span>
                </div>
              </div>
            )}
          </>,
          document.body
        )}

        <section className="mx-auto max-w-[1260px] px-3 pt-3 sm:px-5 sm:pt-5">
          <div className="relative min-h-[400px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#121212] sm:min-h-[455px]">
            <div className="absolute inset-0 opacity-80" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(115deg, #171717 0%, #101010 48%, #090909 100%)", backgroundSize: "15px 15px, 100% 100%" }} />
            <div className="absolute inset-y-0 left-0 w-[68%] bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
            <motion.div aria-hidden="true" animate={{ x: ["-20%", "130%"] }} transition={{ duration: 7, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }} className="absolute top-0 h-px w-1/4 bg-gradient-to-r from-transparent via-yellow-200 to-transparent" />

            <div className="relative grid min-h-[400px] grid-cols-1 items-center gap-4 p-7 sm:min-h-[455px] sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
              <div className="z-10 max-w-[520px]">
                <span className="inline-flex rounded-full border border-orange-300/35 bg-orange-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-orange-200">New season. New goals.</span>
                <h1 className="mt-5 text-[3.1rem] font-black uppercase leading-[0.82] tracking-[-0.07em] text-white sm:text-[5rem] lg:text-[5.6rem]">
                  Back to <span className="block text-[#ff9f0a]" style={{ textShadow: "0 3px 0 rgba(110,54,0,0.55)" }}>School</span>
                </h1>
                <p className="mt-5 max-w-sm text-sm font-medium text-white/75 sm:text-base">Essentials for the new school year — selected for students across the UAE.</p>
                <a href="#school-products" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#ffa313] px-5 py-3 text-xs font-black text-black shadow-[0_8px_22px_rgba(255,156,0,0.22)] transition-transform hover:scale-[1.03]" style={{ touchAction: "manipulation" }}>
                  Shop now <ArrowRight className="h-4 w-4" />
                </a>
                <div className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  <span className="h-1.5 w-5 rounded-full bg-[#ff9f0a]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                </div>
              </div>

              <div className="relative hidden min-h-[350px] lg:block">
                <div className="absolute left-[22%] top-[5%] h-[285px] w-[235px] rounded-[3.4rem] border border-white/10 bg-gradient-to-br from-neutral-500 via-neutral-800 to-black shadow-[0_28px_56px_rgba(0,0,0,0.7)]" />
                <Backpack className="absolute left-[26%] top-[18%] h-40 w-40 text-black/55" strokeWidth={0.65} />
                {heroProducts.slice(0, 4).map((product, index) => {
                  const media = getPrimaryProductMedia(product.imageUrl);
                  const layouts = [
                    "left-0 bottom-[20px] h-36 w-36",
                    "right-[8%] top-[26px] h-44 w-36",
                    "right-0 bottom-[8px] h-32 w-32",
                    "left-[38%] bottom-0 h-28 w-28",
                  ];
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 + index * 0.1, duration: 0.55, ease: EASE }} className={`absolute overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl ${layouts[index]}`}>
                      {media?.type === "image" ? <img src={media.url} alt="" className="h-full w-full object-cover" /> : <Package className="m-auto h-full w-10 text-white/20" />}
                    </motion.div>
                  );
                })}
                <span className="absolute right-4 top-0 rotate-6 rounded-sm bg-[#d6b15e] px-2 py-3 text-center text-[8px] font-black uppercase leading-tight text-black">Plan<br />Focus<br />Achieve</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex overflow-x-auto rounded-xl border border-white/10 bg-[#151515] p-1.5 scrollbar-none">
            {categories.map((category, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length];
              const active = activeCategory === category;
              return (
                <button key={category} onClick={() => setActiveCategory(category)} className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-[10px] font-bold transition-colors ${active ? "border border-orange-300/50 bg-orange-400/10 text-orange-200" : "text-white/55 hover:bg-white/[0.04] hover:text-white"}`} style={{ touchAction: "manipulation" }}>
                  <Icon className="h-3.5 w-3.5" /> {category}
                </button>
              );
            })}
            <Link href="/shop" className="flex min-w-[115px] items-center justify-center gap-1 px-3 text-[10px] font-bold text-white/60 hover:text-white">View all <ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
        </section>

        <section id="school-products" className="mx-auto max-w-[1260px] px-3 pt-8 sm:px-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffab1a]">Back to School picks</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Student Essentials</h2>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search essentials…" className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-8 text-xs text-white outline-none placeholder:text-white/30 focus:border-orange-300/45" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"><X className="h-3 w-3" /></button>}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-white/[0.05]" />)}</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-orange-300/45" />
              <p className="mt-3 text-sm font-bold text-white/70">No matching school essentials yet.</p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <AnimatePresence mode="popLayout">
                {products.map((product, index) => {
                  const media = getPrimaryProductMedia(product.imageUrl);
                  return (
                    <motion.article key={product.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: Math.min(index * 0.025, 0.22), duration: 0.32, ease: EASE }} className="group overflow-hidden rounded-xl border border-white/10 bg-[#151515] transition-colors hover:border-orange-300/40">
                      <Link href={`/product/${product.id}`} className="block">
                        <div className="relative aspect-square overflow-hidden bg-[#0b0b0b]">
                          {media?.type === "image" ? <img src={media.url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Package className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/15" />}
                          {product.stock === 0 && <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-[10px] font-black uppercase tracking-widest text-white">Sold out</span>}
                        </div>
                      </Link>
                      <div className="p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{product.categoryName || "School essential"}</p>
                        <Link href={`/product/${product.id}`}><h3 className="mt-1 line-clamp-2 min-h-[32px] text-[11px] font-bold leading-snug text-white group-hover:text-orange-200">{product.name}</h3></Link>
                        <p className="mt-2 text-sm font-black text-[#ffab1a]">AED {product.price.toFixed(0)}</p>
                        <button onClick={(event) => addToCart(event, product)} disabled={product.stock === 0 || addingId === product.id} className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-md border border-white/15 bg-white/[0.04] text-[9px] font-black uppercase tracking-wider text-white transition-colors hover:border-orange-300/40 hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-45" style={{ touchAction: "manipulation" }}>
                          {addedId === product.id ? <><Check className="h-3 w-3 text-green-300" /> Added</> : addingId === product.id ? "Adding…" : "Add to cart"}
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <section className="mx-auto max-w-[1260px] px-3 pt-6 sm:px-5">
          <div className="grid divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#161616] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              { icon: Truck, title: "Fast Delivery", detail: "Across UAE" },
              { icon: ShieldCheck, title: "UAE Ready", detail: "Verified shipping" },
              { icon: Award, title: "Useful Picks", detail: "For the school year" },
              { icon: Backpack, title: "Student Essentials", detail: "Chosen for you" },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-center gap-3 px-5 py-4">
                <Icon className="h-5 w-5 text-[#ffab1a]" />
                <div><p className="text-xs font-black text-white">{title}</p><p className="text-[10px] text-white/45">{detail}</p></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}