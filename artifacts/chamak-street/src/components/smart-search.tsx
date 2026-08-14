import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, Sparkles, ArrowRight, Clock, TrendingUp, Tag, Package } from "lucide-react";
import { Link } from "wouter";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { trackSearch } from "@/lib/use-visitor-tracking";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;
const RECENT_KEY = "chamak_recent_searches";
const MAX_RECENT = 6;

type Product = {
  id: number; name: string; price: string;
  imageUrl: string | null; imageUrls: string | null;
  categoryId: number | null; categoryName: string | null; stock: number;
};

/* ── Helpers ── */
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function addRecent(q: string) {
  if (!q.trim()) return;
  const list = [q, ...getRecent().filter(r => r !== q)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
}
function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/25 text-primary rounded-sm px-0.5 not-italic">{part}</mark>
        ) : part
      )}
    </>
  );
}


export function SmartSearch({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecent(getRecent());
    fetch(`${BASE}/api/products`)
      .then((r) => r.json())
      .then((data: Product[]) => setAllProducts(data))
      .catch(() => {});
  }, []);

  // Dynamic categories from loaded products — used as "Browse" chips in empty state
  const browseTerms = useMemo(() => {
    const cats = [...new Set(allProducts.map(p => p.categoryName).filter(Boolean) as string[])];
    return cats.slice(0, 10);
  }, [allProducts]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSelectedIdx(-1); return; }
    setLoading(true);
    setSelectedIdx(-1);
    const t = setTimeout(() => {
      // Split multi-word queries ("black hoodie" → ["black", "hoodie"])
      const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

      const scored = allProducts
        .map((p) => {
          const name = p.name.toLowerCase();
          const cat = (p.categoryName ?? "").toLowerCase();
          const desc = ((p as any).description ?? "").toLowerCase();

          // Every word must match somewhere (name OR category OR description)
          const allMatch = words.every(w =>
            name.includes(w) || cat.includes(w) || desc.includes(w)
          );
          if (!allMatch) return { p, score: -1 };

          let score = 0;
          const primary = words[0];

          // Name scoring — highest weight
          if (name === query.toLowerCase())    score += 120;
          else if (name.startsWith(primary))   score += 90;
          else if (name.includes(primary))     score += 60;

          // Bonus for each additional matched word in name
          words.forEach(w => { if (name.includes(w)) score += 10; });

          // Category scoring
          if (cat === primary)                 score += 55;
          else if (cat.startsWith(primary))    score += 40;
          else if (cat.includes(primary))      score += 20;

          // Description match (lower weight)
          if (desc.includes(primary))          score += 8;

          // Boosts
          if ((p as any).featured && score > 0)   score += 6;
          if (p.stock > 0)                         score += 3;

          return { p, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(x => x.p);

      setResults(scored);
      setLoading(false);
    }, 100);
    return () => clearTimeout(t);
  }, [query, allProducts]);

  // Track search after user pauses typing (1.5s debounce)
  useEffect(() => {
    if (query.trim().length < 3) return;
    const t = setTimeout(() => trackSearch(query.trim()), 1500);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = useCallback((productId: number) => {
    addRecent(query);
    setRecent(getRecent());
    onClose?.();
  }, [query, onClose]);

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleClearRecent = () => {
    clearRecent();
    setRecent([]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && selectedIdx >= 0 && results[selectedIdx]) {
        handleSelect(results[selectedIdx].id);
        window.location.href = `/product/${results[selectedIdx].id}`;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, selectedIdx, handleSelect]);

  // Scroll selected into view
  useEffect(() => {
    if (selectedIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[selectedIdx] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const isEmpty = !query.trim();

  return (
    <div className="flex flex-col" style={{ maxHeight: "82vh" }}>
      {/* ── Search input ── */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <motion.div
          animate={loading ? { rotate: 360 } : { rotate: 0 }}
          transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        >
          {loading
            ? <Loader2 className="h-5 w-5 text-primary shrink-0" />
            : <Search className="h-5 w-5 text-white/40 shrink-0" />
          }
        </motion.div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, styles, brands…"
          className="flex-1 min-w-0 bg-transparent text-white placeholder-white/25 text-lg outline-none font-semibold"
        />
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-white/20 px-1.5 py-0.5 rounded border border-white/10 font-mono">ESC</kbd>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            /* ── Empty state: Recent + Trending ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 py-5 space-y-6"
            >
              {/* Recent searches */}
              {recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Recent
                    </p>
                    <button onClick={handleClearRecent} className="text-[10px] text-white/25 hover:text-white/50 transition-colors font-bold">
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <motion.button
                        key={r}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleRecentClick(r)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25 transition-all"
                      >
                        <Clock className="h-3 w-3 shrink-0" /> {r}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Browse by category */}
              {browseTerms.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Browse by Category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {browseTerms.map((term, i) => (
                      <motion.button
                        key={term}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, ease: EASE }}
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,102,0,0.12)" }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleTrendingClick(term)}
                        className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-primary px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/40 transition-all"
                      >
                        <TrendingUp className="h-3 w-3 shrink-0 text-primary/50" /> {term}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3 flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Quick Links
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "All Products", href: "/shop", icon: Package },
                    { label: "Latest Arrivals", href: "/shop?new=1", icon: Sparkles },
                  ].map(({ label, href, icon: Icon }) => (
                    <Link key={href} href={href} onClick={onClose}>
                      <motion.div
                        whileHover={{ scale: 1.02, borderColor: "rgba(255,102,0,0.4)" }}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/8 text-sm font-semibold text-white/50 hover:text-white cursor-pointer transition-colors"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        <Icon className="h-4 w-4 text-primary/60 shrink-0" />
                        {label}
                        <ArrowRight className="h-3 w-3 ml-auto opacity-40" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : results.length === 0 && !loading ? (
            /* ── No results ── */
            <motion.div
              key="noresults"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 py-12 text-center"
            >
              <div className="w-14 h-14 rounded-full border border-white/8 flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,102,0,0.06)" }}>
                <Search className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-white/50 font-semibold">No results for</p>
              <p className="text-white font-black text-lg mt-1">"{query}"</p>
              <p className="text-white/30 text-sm mt-2">Try a different keyword or browse all products</p>
              <Link href="/shop" onClick={onClose}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary border border-primary/30 px-5 py-2 rounded-full hover:bg-primary/10 transition-colors"
                >
                  Browse All <ArrowRight className="h-3 w-3" />
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            /* ── Results ── */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/25 border-b border-white/5">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              <div ref={listRef}>
                {results.map((p, i) => {
                  const media = getPrimaryProductMedia(p.imageUrl);
                  const isSelected = i === selectedIdx;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, ease: EASE, duration: 0.3 }}
                    >
                      <Link
                        href={`/product/${p.id}`}
                        onClick={() => handleSelect(p.id)}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-all group cursor-pointer ${
                          isSelected ? "bg-primary/10" : "hover:bg-white/4"
                        }`}
                      >
                        {/* Image */}
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10"
                          style={{ background: "rgba(255,255,255,0.04)" }}>
                          {media ? (
                            <img src={media.url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-white/20" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate leading-tight">
                            <HighlightMatch text={p.name} query={query} />
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {p.categoryName && (
                              <span className="text-primary/60 font-semibold">
                                <HighlightMatch text={p.categoryName} query={query} />
                                {" · "}
                              </span>
                            )}
                            AED {Number(p.price).toFixed(2)}
                            {p.stock === 0 && <span className="text-red-400/60 ml-2">Out of stock</span>}
                          </p>
                        </div>

                        {/* Arrow */}
                        <motion.div
                          animate={isSelected ? { x: 0, opacity: 1 } : { x: -4, opacity: 0 }}
                          className="text-primary shrink-0"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* View all in shop */}
              <Link href={`/shop?search=${encodeURIComponent(query)}`} onClick={() => { addRecent(query); onClose?.(); }}>
                <motion.div
                  whileHover={{ backgroundColor: "rgba(255,102,0,0.07)" }}
                  className="flex items-center gap-3 px-5 py-3.5 border-t border-white/6 cursor-pointer transition-colors"
                >
                  <div className="w-14 h-14 rounded-lg shrink-0 border border-primary/20 flex items-center justify-center"
                    style={{ background: "rgba(255,102,0,0.06)" }}>
                    <ArrowRight className="h-5 w-5 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-primary font-bold text-sm truncate">View all results for "{query}"</p>
                    <p className="text-white/30 text-xs">Browse the full shop</p>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SmartSearchModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
        aria-label="Search (⌘K)"
      >
        <Search className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
        <kbd className="hidden md:flex items-center text-[9px] font-bold text-white/20 px-1.5 py-0.5 rounded border border-white/10 font-mono tracking-widest leading-none">
          ⌘K
        </kbd>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[100]"
              style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -16 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="fixed top-[8vh] left-1/2 -translate-x-1/2 z-[101] w-full overflow-hidden"
              style={{
                maxWidth: "min(680px, 94vw)",
                background: "rgba(6,6,6,0.82)",
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 24,
                boxShadow: "0 32px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 0.5px rgba(255,102,0,0.10)",
              }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,102,0,0.6), rgba(255,204,0,0.4), transparent)" }} />

              <SmartSearch onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
