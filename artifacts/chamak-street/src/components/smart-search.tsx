import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { getPrimaryProductMedia } from "@/lib/product-media";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type Product = {
  id: number; name: string; price: string;
  imageUrl: string | null; imageUrls: string | null;
  categoryId: number | null; stock: number;
};

const AI_SUGGESTIONS: Record<string, string[]> = {
  hoodie: ["hoodies", "sweatshirts", "streetwear tops"],
  jacket: ["jackets", "outerwear", "bomber"],
  sneaker: ["shoes", "kicks", "footwear"],
  shirt: ["tees", "tops", "graphic tees"],
  pants: ["trousers", "cargo", "streetwear bottoms"],
  cap: ["hats", "headwear", "snapback"],
};

function getAiSuggestion(query: string): string | null {
  const q = query.toLowerCase();
  for (const [k, v] of Object.entries(AI_SUGGESTIONS)) {
    if (q.includes(k)) return `Also try: ${v.join(", ")}`;
  }
  return null;
}

export function SmartSearch({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch(`${BASE}/api/products`)
      .then((r) => r.json())
      .then((data: Product[]) => setAllProducts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      const q = query.toLowerCase();
      const filtered = allProducts.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.imageUrl ?? "").toLowerCase().includes(q)
      ).slice(0, 8);
      setResults(filtered);
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
  }, [query, allProducts]);

  const aiSuggestion = query.length > 2 ? getAiSuggestion(query) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Input */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <Search className="h-5 w-5 text-white/40 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, styles, brands…"
          className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none font-medium"
        />
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
          {query && (
            <button onClick={() => setQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* AI suggestion */}
      <AnimatePresence>
        {aiSuggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 py-2 bg-primary/10 border-b border-primary/20"
          >
            <div className="flex items-center gap-2 text-xs text-primary/80 font-medium">
              <Sparkles className="h-3 w-3" />
              {aiSuggestion}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!query && (
          <div className="px-5 py-8 text-center text-white/30 text-sm">
            <Sparkles className="h-6 w-6 mx-auto mb-3 text-primary/40" />
            <p className="font-semibold">AI Smart Search</p>
            <p className="mt-1 text-xs">Type to search across all products</p>
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-white/5">
              {results.map((p, i) => {
                const media = getPrimaryProductMedia(p.imageUrl, p.imageUrls);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, ease: EASE }}
                  >
                    <Link href={`/product/${p.id}`}>
                      <a onClick={onClose} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors group">
                        <div className="w-12 h-12 rounded-sm overflow-hidden bg-white/5 shrink-0">
                          {media && (
                            <img src={media} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                          <p className="text-primary text-xs font-bold mt-0.5">
                            AED {Number(p.price).toFixed(2)}
                            {p.stock === 0 && <span className="text-white/30 ml-2">Out of stock</span>}
                          </p>
                        </div>
                        <div className="text-white/20 group-hover:text-white/50 transition-colors text-xs">→</div>
                      </a>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {query && !loading && results.length === 0 && (
          <div className="px-5 py-8 text-center text-white/30 text-sm">
            <p>No results for "<span className="text-white/50">{query}</span>"</p>
            <p className="mt-1 text-xs">Try a different keyword</p>
          </div>
        )}
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
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
        aria-label="Search"
      >
        <Search className="h-5 w-5 group-hover:text-primary transition-colors" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg bg-[#111] border border-white/10 rounded-lg overflow-hidden shadow-2xl"
              style={{ maxHeight: "70vh" }}
            >
              <SmartSearch onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
