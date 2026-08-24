import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Loader2, PackageOpen, RefreshCw, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { parseProductMedia } from "@/lib/product-media";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const SOURCES = [
  { value: "", label: "All imported" },
  { value: "fashioncage", label: "Fashioncage" },
  { value: "stylescape", label: "Stylescape" },
  { value: "stealstreetwear", label: "Steal Streetwear" },
];

type FeedItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  supplierPrice: number | null;
  imageUrl: string | null;
  imageUrls: string | null;
  stock: number;
  importSource: string | null;
  externalId: string | null;
  hidden: boolean;
  collection: string | null;
  categoryName: string | null;
  createdAt: string;
  savedAt: string | null;
  state: "hidden" | "available";
};

type FeedResponse = { items: FeedItem[]; nextCursor: number | null; hasMore: boolean };

function ProductMedia({ item }: { item: FeedItem }) {
  const media = parseProductMedia(item.imageUrls || item.imageUrl);
  const primary = media[0];
  if (!primary) {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,102,0,0.28),transparent_35%),linear-gradient(135deg,#16131a,#050507)]" />;
  }
  if (primary.type === "video") {
    return <video src={primary.url} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline preload="metadata" />;
  }
  return <img src={primary.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />;
}

export default function AdminProductFeed() {
  const { toast } = useToast();
  const [source, setSource] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset: boolean) => {
    const cursor = reset ? null : nextCursor;
    if (!reset && (!cursor || loadingMore)) return;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "8" });
      if (source) params.set("source", source);
      if (savedOnly) params.set("saved", "true");
      if (cursor) params.set("cursor", String(cursor));
      const res = await fetch(`${BASE}/api/admin/product-feed?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load imported products");
      const data = await res.json() as FeedResponse;
      setItems((current) => reset ? data.items : [...current, ...data.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      toast({ title: "Feed unavailable", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [source, savedOnly, nextCursor, loadingMore, toast]);

  useEffect(() => {
    void load(true);
    scrollRef.current?.scrollTo({ top: 0 });
  // A fresh request is intentional when either server-side filter changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, savedOnly]);

  const toggleSaved = async (item: FeedItem) => {
    setSavingId(item.id);
    try {
      const res = await fetch(`${BASE}/api/admin/product-feed/${item.id}/save`, {
        method: item.savedAt ? "DELETE" : "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not update saved products");
      if (savedOnly && item.savedAt) {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      } else {
        setItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, savedAt: item.savedAt ? null : new Date().toISOString() }
          : entry));
      }
    } catch (error) {
      toast({ title: "Could not save product", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node || !hasMore || loadingMore) return;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 840) void load(false);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden text-white">
      <header className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/10" style={{ background: "rgba(7,7,10,0.75)", backdropFilter: "blur(32px)" }}>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-primary"><Sparkles className="h-3 w-3" /> Discovery</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight">Product Feed</h1>
            <p className="mt-1 text-xs text-white/50">Live catalog records imported from your configured suppliers. No estimates or invented stock.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading} className="border-white/15 bg-white/5 hover:bg-white/10">
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {SOURCES.map((option) => (
            <button
              key={option.value}
              onClick={() => setSource(option.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${source === option.value ? "bg-primary text-white shadow-[0_0_18px_rgba(255,102,0,0.38)]" : "bg-white/5 border border-white/10 text-white/55 hover:text-white"}`}
              style={{ touchAction: "manipulation" }}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={() => setSavedOnly((current) => !current)}
            className={`shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${savedOnly ? "bg-amber-400 text-black" : "bg-white/5 border border-white/10 text-white/55 hover:text-white"}`}
            style={{ touchAction: "manipulation" }}
          >
            <Bookmark className="h-3 w-3" /> Saved
          </button>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scroll-smooth">
        {loading ? (
          <div className="h-full min-h-[44dvh] flex flex-col items-center justify-center gap-3 text-white/45">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <p className="text-xs font-bold">Loading verified catalog records…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full min-h-[44dvh] flex flex-col items-center justify-center p-6 text-center">
            <PackageOpen className="h-12 w-12 text-white/20 mb-4" />
            <h2 className="font-black">No matching imported products</h2>
            <p className="mt-2 max-w-sm text-sm text-white/45">Sync a supplier or change the filter to see product records here.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="snap-start relative min-h-[calc(100dvh-158px)] sm:min-h-[650px] flex items-end overflow-hidden border-b border-white/10"
              >
                <ProductMedia item={item} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.04)_34%,rgba(0,0,0,0.94)_100%)]" />
                <div className="relative z-10 w-full px-4 sm:px-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-28">
                  <div className="mx-auto max-w-3xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-black/45 border border-white/20 backdrop-blur-xl">{item.importSource ?? "Imported"}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border backdrop-blur-xl ${item.hidden ? "bg-red-500/20 border-red-300/30 text-red-100" : "bg-emerald-500/15 border-emerald-300/25 text-emerald-100"}`}>
                        {item.hidden ? "Hidden in catalog" : "Available in catalog"}
                      </span>
                      {item.categoryName && <span className="text-[10px] font-bold text-white/60">{item.categoryName}</span>}
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-none text-balance">{item.name}</h2>
                        {item.description && <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 line-clamp-3">{item.description}</p>}
                      </div>
                      <button
                        onClick={() => void toggleSaved(item)}
                        disabled={savingId === item.id}
                        className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border backdrop-blur-2xl transition-colors ${item.savedAt ? "bg-amber-400 text-black border-amber-200" : "bg-black/40 border-white/20 text-white hover:bg-white/15"}`}
                        aria-label={item.savedAt ? "Remove from saved products" : "Save product"}
                        style={{ touchAction: "manipulation" }}
                      >
                        {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.savedAt ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-2xl p-3 border border-white/10 bg-black/35 backdrop-blur-2xl"><p className="text-[9px] uppercase tracking-widest font-black text-white/45">Catalog price</p><p className="mt-1 font-mono font-black text-primary">AED {item.price.toFixed(2)}</p></div>
                      <div className="rounded-2xl p-3 border border-white/10 bg-black/35 backdrop-blur-2xl"><p className="text-[9px] uppercase tracking-widest font-black text-white/45">Source price</p><p className="mt-1 font-mono font-black">{item.supplierPrice === null ? "Not provided" : `AED ${item.supplierPrice.toFixed(2)}`}</p></div>
                      <div className="rounded-2xl p-3 border border-white/10 bg-black/35 backdrop-blur-2xl"><p className="text-[9px] uppercase tracking-widest font-black text-white/45">Catalog stock</p><p className="mt-1 font-mono font-black">{item.stock}</p></div>
                      <div className="rounded-2xl p-3 border border-white/10 bg-black/35 backdrop-blur-2xl"><p className="text-[9px] uppercase tracking-widest font-black text-white/45">External ID</p><p className="mt-1 font-mono font-black truncate">{item.externalId ?? "Not provided"}</p></div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Link href="/admin/products">
                        <Button size="sm" className="fire-gradient border-none font-black"><ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Manage catalog</Button>
                      </Link>
                      <Link href={`/product/${item.id}`}>
                        <Button size="sm" variant="outline" className="border-white/20 bg-black/30 hover:bg-white/10"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Customer view</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
        {loadingMore && <div className="py-7 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        {!hasMore && items.length > 0 && <div className="py-5 text-center text-[10px] uppercase tracking-[0.22em] font-black text-white/25"><ChevronDown className="inline h-3 w-3 mr-1" /> End of verified feed</div>}
      </div>
    </div>
  );
}