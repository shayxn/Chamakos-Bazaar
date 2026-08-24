import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Loader2, MessageCircle, PackageOpen, Plus, RefreshCw, Send, ShoppingBag, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const SOURCES = [
  { value: "", label: "Approved sources" },
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
  sourceUrl: string | null;
  videoUrl: string | null;
  shipsToUaeVerified: boolean;
  hidden: boolean;
  collection: string | null;
  categoryName: string | null;
  createdAt: string;
  savedAt: string | null;
  addedAt: string | null;
  commentCount: number;
  state: "hidden" | "available";
};

type FeedResponse = { items: FeedItem[]; nextCursor: number | null; hasMore: boolean };
type FeedComment = { id: number; authorName: string; body: string; createdAt: string };

function ProductMedia({ videoUrl, active, muted }: { videoUrl: string | null; active: boolean; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => {});
    else video.pause();
  }, [active]);
  if (!videoUrl || failed) {
    return <div className="absolute inset-0 grid place-items-center bg-[#08080a] text-center"><p className="text-xs font-bold text-white/45">This verified product video is temporarily unavailable.</p></div>;
  }
  return (
    <div className="absolute inset-0 flex justify-center bg-black">
      <video ref={videoRef} src={videoUrl} className="h-full w-auto max-w-full object-cover" muted={muted} loop playsInline preload={active ? "auto" : "metadata"} onError={() => setFailed(true)} />
    </div>
  );
}

export default function AdminProductFeed() {
  const { toast } = useToast();
  const [source, setSource] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [addedOnly, setAddedOnly] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reviewItem, setReviewItem] = useState<FeedItem | null>(null);
  const [profit, setProfit] = useState("20");
  const [sellingPrice, setSellingPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleRefs = useRef<Record<number, HTMLElement | null>>({});

  const load = useCallback(async (reset: boolean) => {
    const cursor = reset ? null : nextCursor;
    if (!reset && (!cursor || loadingMore)) return;
    if (reset) {
      setLoading(true);
      setActiveId(null);
    } else {
      setLoadingMore(true);
    }
    try {
       const params = new URLSearchParams({ limit: "24" });
      if (source) params.set("source", source);
      if (savedOnly) params.set("saved", "true");
      if (addedOnly) params.set("added", "true");
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
  }, [source, savedOnly, addedOnly, nextCursor, loadingMore, toast]);

  useEffect(() => {
    void load(true);
    scrollRef.current?.scrollTo({ top: 0 });
  // A fresh request is intentional when either server-side filter changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, savedOnly, addedOnly]);

  useEffect(() => {
    if (items.length && !activeId) setActiveId(items[0].id);
  }, [items, activeId]);

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
    if (!node) return;
    const center = node.getBoundingClientRect().top + node.clientHeight / 2;
    let nearest: { id: number; distance: number } | null = null;
    for (const item of items) {
      const article = articleRefs.current[item.id];
      if (!article) continue;
      const rect = article.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - center);
      if (!nearest || distance < nearest.distance) nearest = { id: item.id, distance };
    }
    if (nearest) setActiveId(nearest.id);
    if (hasMore && !loadingMore && node.scrollTop + node.clientHeight >= node.scrollHeight - 840) void load(false);
  };

  const refreshFromSupplier = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${BASE}/api/import/sync-approved`, { method: "POST", credentials: "include" });
      const data = await res.json() as { error?: string; stealstreetwear?: { imported: number; updated: number; total: number } };
      if (!res.ok) throw new Error(data.error ?? "Supplier sync failed");
      await load(true);
      const sync = data.stealstreetwear;
      toast({ title: "Product Shorts refreshed", description: sync ? `${sync.total} supplier products checked for real video media.` : undefined });
    } catch (error) {
      toast({ title: "Could not refresh supplier shorts", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const openReview = (item: FeedItem) => {
    if (!item.sourceUrl || item.supplierPrice === null) {
      toast({ title: "Source details needed", description: "Sync this source again once its verified product URL and source price are available.", variant: "destructive" });
      return;
    }
    const suggested = Math.max(20, Math.min(100, Math.round((item.price - item.supplierPrice) * 100) / 100));
    setProfit(String(suggested));
    setSellingPrice((item.supplierPrice + suggested).toFixed(2));
    setReviewItem(item);
  };

  const openComments = async (item: FeedItem) => {
    setCommentsFor(item);
    setComments([]);
    setCommentsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/product-feed/${item.id}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load comments");
      setComments(await res.json() as FeedComment[]);
    } catch (error) {
      toast({ title: "Comments unavailable", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setCommentsLoading(false);
    }
  };

  const postComment = async () => {
    if (!commentsFor || !commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch(`${BASE}/api/admin/product-feed/${commentsFor.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const comment = await res.json() as FeedComment & { error?: string };
      if (!res.ok) throw new Error(comment.error ?? "Could not post comment");
      setComments((current) => [...current, comment]);
      setCommentText("");
      setItems((current) => current.map((item) => item.id === commentsFor.id ? { ...item, commentCount: item.commentCount + 1 } : item));
      setCommentsFor((current) => current ? { ...current, commentCount: current.commentCount + 1 } : current);
    } catch (error) {
      toast({ title: "Could not post comment", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setPostingComment(false);
    }
  };

  const addFromReview = async () => {
    if (!reviewItem) return;
    setAdding(true);
    try {
      const res = await fetch(`${BASE}/api/admin/product-feed/${reviewItem.id}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ suggestedProfit: Number(profit), sellingPrice: Number(sellingPrice) }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add product from feed");
      setItems((current) => addedOnly
        ? current.map((item) => item.id === reviewItem.id ? { ...item, addedAt: new Date().toISOString() } : item)
        : current.filter((item) => item.id !== reviewItem.id));
      setReviewItem(null);
      toast({ title: "Added to FirstPick review", description: "The original source URL, pricing snapshot, and verified UAE-delivery state were saved." });
    } catch (error) {
      toast({ title: "Could not add product", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden text-white">
      <header className="shrink-0 px-4 sm:px-6 py-3 border-b border-white/10" style={{ background: "rgba(7,7,10,0.82)", backdropFilter: "blur(32px)" }}>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-primary"><Sparkles className="h-3 w-3" /> Discovery</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight">Product Shorts</h1>
            <p className="mt-1 text-xs text-white/50">Fresh supplier media · real product shorts only · UAE delivery verified.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refreshFromSupplier()} disabled={loading || syncing} className="border-white/15 bg-white/5 hover:bg-white/10">
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${(loading || syncing) ? "animate-spin" : ""}`} /> {syncing ? "Checking sources" : "Refresh"}
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
            onClick={() => { setSavedOnly((current) => !current); setAddedOnly(false); }}
            className={`shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${savedOnly ? "bg-amber-400 text-black" : "bg-white/5 border border-white/10 text-white/55 hover:text-white"}`}
            style={{ touchAction: "manipulation" }}
          >
            <Bookmark className="h-3 w-3" /> Saved
          </button>
          <button
            onClick={() => { setAddedOnly((current) => !current); setSavedOnly(false); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${addedOnly ? "bg-emerald-400 text-black" : "bg-white/5 border border-white/10 text-white/55 hover:text-white"}`}
            style={{ touchAction: "manipulation" }}
          >
            <ShoppingBag className="h-3 w-3" /> Added
          </button>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scroll-smooth">
        {loading ? (
          <div className="h-full min-h-[44dvh] flex flex-col items-center justify-center gap-3 text-white/45">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <p className="text-xs font-bold">Loading verified product shorts…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full min-h-[44dvh] flex flex-col items-center justify-center p-6 text-center">
            <PackageOpen className="h-12 w-12 text-white/20 mb-4" />
            <h2 className="font-black">No verified product shorts yet</h2>
            <p className="mt-2 max-w-sm text-sm text-white/45">Supplier sync is checking for real product video media. Image-only or UAE-delivery-unverified products stay out of this feed.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.article
                key={item.id}
                ref={(node) => { articleRefs.current[item.id] = node; }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="snap-start relative h-[calc(100dvh-142px)] min-h-[520px] sm:min-h-[650px] flex items-end overflow-hidden border-b border-white/10 bg-black"
              >
                <ProductMedia videoUrl={item.videoUrl} active={activeId === item.id} muted={muted} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.02)_34%,rgba(0,0,0,0.92)_100%)] pointer-events-none" />
                <button onClick={() => setMuted((current) => !current)} aria-label={muted ? "Turn sound on" : "Mute video"} className="absolute z-20 top-4 right-4 w-10 h-10 rounded-full bg-black/45 border border-white/20 backdrop-blur-xl flex items-center justify-center" style={{ touchAction: "manipulation" }}>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <motion.button
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => openReview(item)}
                  disabled={!item.sourceUrl || item.supplierPrice === null}
                  className="absolute z-20 left-3 sm:left-7 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full border border-yellow-100/70 bg-gradient-to-r from-primary to-amber-300 px-4 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_30px_rgba(255,102,0,0.55)] disabled:opacity-40"
                  style={{ touchAction: "manipulation" }}
                >
                  <motion.span animate={{ rotate: [0, 12, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}><Plus className="h-4 w-4" /></motion.span>
                  Add This
                </motion.button>
                <div className="absolute z-20 right-3 sm:right-7 bottom-[max(7.3rem,env(safe-area-inset-bottom))] flex flex-col gap-4">
                  <button onClick={() => void toggleSaved(item)} disabled={savingId === item.id} aria-label={item.savedAt ? "Remove from saved products" : "Save product"} className="flex flex-col items-center gap-1 text-white" style={{ touchAction: "manipulation" }}>
                    <span className={`grid h-12 w-12 place-items-center rounded-full border backdrop-blur-xl ${item.savedAt ? "bg-amber-400 text-black border-amber-100" : "bg-black/45 border-white/25"}`}>{savingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : item.savedAt ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</span>
                    <span className="text-[10px] font-black uppercase">Save</span>
                  </button>
                  <button onClick={() => void openComments(item)} aria-label="Open comments" className="flex flex-col items-center gap-1 text-white" style={{ touchAction: "manipulation" }}>
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur-xl"><MessageCircle className="h-5 w-5" /></span>
                    <span className="text-[10px] font-black">{item.commentCount}</span>
                  </button>
                </div>
                <div className="relative z-10 w-full max-w-4xl px-4 sm:px-8 pr-20 sm:pr-28 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-emerald-400/15 border border-emerald-200/30 text-emerald-100 backdrop-blur-xl">Verified UAE delivery</span>
                    <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-black/45 border border-white/20 backdrop-blur-xl">{item.importSource ?? "Supplier"}</span>
                  </div>
                  <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight leading-none text-balance">{item.name}</h2>
                  {item.description && <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 line-clamp-2">{item.description}</p>}
                  <p className="mt-3 text-xl font-mono font-black text-primary">AED {item.price.toFixed(2)}</p>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Link href="/admin/products"><Button size="sm" className="fire-gradient border-none font-black"><ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Inventory</Button></Link>
                    {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="border-white/20 bg-black/30 hover:bg-white/10"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Source</Button></a>}
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
        {loadingMore && <div className="py-7 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        {!hasMore && items.length > 0 && <div className="py-5 text-center text-[10px] uppercase tracking-[0.22em] font-black text-white/25"><ChevronDown className="inline h-3 w-3 mr-1" /> End of verified feed</div>}
      </div>
      <AnimatePresence>
        {reviewItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-6" onMouseDown={() => !adding && setReviewItem(null)}>
            <motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()} className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/15 p-5 sm:p-6" style={{ background: "rgba(12,12,16,0.97)", backdropFilter: "blur(32px)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-black tracking-[0.2em] uppercase text-primary">Feed review</p><h2 className="mt-1 text-xl font-black">{reviewItem.name}</h2></div>
                <button onClick={() => setReviewItem(null)} disabled={adding} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl p-3 bg-white/5 border border-white/10"><p className="text-[9px] uppercase tracking-widest font-black text-white/45">Original price</p><p className="mt-1 font-mono font-bold">AED {reviewItem.supplierPrice?.toFixed(2)}</p></div>
                <div className="rounded-2xl p-3 bg-white/5 border border-white/10"><p className="text-[9px] uppercase tracking-widest font-black text-white/45">Supplier delivery</p><p className="mt-1 font-bold text-emerald-300">UAE verified</p></div>
              </div>
              <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-white/45">Suggested FirstPick profit (AED 20–100)</label>
              <input type="number" min="20" max="100" step="1" value={profit} onChange={(event) => setProfit(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-mono text-sm outline-none focus:border-primary" />
              <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-white/45">FirstPick selling price</label>
              <input type="number" min="0.01" step="0.01" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-mono text-sm outline-none focus:border-primary" />
              <a href={reviewItem.sourceUrl ?? "#"} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Open verified source product</a>
              <p className="mt-3 text-xs leading-relaxed text-white/50">Adding saves this real source URL, price snapshot, and verified UAE-delivery state for your admin account. It is removed from your default feed.</p>
              <Button onClick={() => void addFromReview()} disabled={adding || Number(profit) < 20 || Number(profit) > 100 || Number(sellingPrice) <= 0} className="mt-5 w-full fire-gradient border-none font-black">{adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Confirm Add This</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {commentsFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-6" onMouseDown={() => setCommentsFor(null)}>
            <motion.section initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()} className="flex w-full sm:max-w-lg max-h-[82dvh] min-h-[420px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/15" style={{ background: "rgba(13,13,17,0.98)", backdropFilter: "blur(32px)" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Team discussion</p><h2 className="mt-1 truncate font-black">{commentsFor.name}</h2></div>
                <button onClick={() => setCommentsFor(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5"><X className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {commentsLoading ? <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : comments.length === 0 ? (
                  <div className="grid h-full place-items-center text-center"><MessageCircle className="mb-3 h-9 w-9 text-white/20" /><p className="text-sm font-bold text-white/60">No comments yet</p><p className="mt-1 text-xs text-white/35">Start the team discussion about this product short.</p></div>
                ) : (
                  <div className="space-y-4">{comments.map((comment) => <div key={comment.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-primary">{comment.authorName}</p><time className="text-[10px] text-white/35">{new Date(comment.createdAt).toLocaleString()}</time></div><p className="mt-1.5 text-sm leading-relaxed text-white/80">{comment.body}</p></div>)}</div>
                )}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void postComment(); }} className="flex shrink-0 gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={500} placeholder="Write a comment…" className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none placeholder:text-white/30 focus:border-primary" />
                <button type="submit" disabled={!commentText.trim() || postingComment} aria-label="Post comment" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-black disabled:opacity-45" style={{ touchAction: "manipulation" }}>{postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}