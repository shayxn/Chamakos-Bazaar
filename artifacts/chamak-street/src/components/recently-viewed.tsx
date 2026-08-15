import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const KEY = "fp_recently_viewed";
const MAX = 10;

export type RecentProduct = { id: number; name: string; price: number; imageUrl?: string | null; slug?: string | null };

export function trackRecentlyViewed(product: RecentProduct) {
  try {
    const existing: RecentProduct[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const filtered = existing.filter(p => p.id !== product.id);
    localStorage.setItem(KEY, JSON.stringify([product, ...filtered].slice(0, MAX)));
  } catch {}
}

export function getRecentlyViewed(): RecentProduct[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentProduct[]>([]);
  useEffect(() => { setItems(getRecentlyViewed()); }, []);
  if (items.length < 2) return null;
  return (
    <section className="px-4 py-6">
      <p className="font-black uppercase tracking-widest text-xs text-muted-foreground mb-4">Recently Viewed</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {items.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <Link href={`/product/${p.id}`}>
              <div className="w-28 shrink-0 rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-muted flex items-center justify-center text-2xl">👟</div>
                )}
                <div className="p-2">
                  <p className="text-[11px] font-bold truncate">{p.name}</p>
                  <p className="text-[11px] text-primary font-mono font-bold">AED {p.price.toFixed(0)}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
