import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Download, RefreshCw, CheckCircle2, AlertCircle, Package,
  ChevronDown, ChevronRight, Zap, Clock, Calendar, ToggleLeft,
  ToggleRight, Tag, TrendingUp, SkipForward, Trash2, CloudOff,
  Store, Check, CircleDollarSign, Sparkles,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type PreviewProduct = {
  externalId: string;
  name: string;
  description: string | null;
  supplierPrice: number;
  sellingPrice: number;
  sizes: string | null;
  colors: string | null;
  stock: number;
  imageUrl: string | null;
  categoryName: string | null;
};

type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
};

type PreviewResult = {
  count: number;
  products: PreviewProduct[];
};

type SyncStats = {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastImportCount: number;
  lastUpdateCount: number;
  lastSkipCount: number;
  lastErrorMsg: string | null;
  autoSyncEnabled: boolean;
};

type AllStats = {
  fashioncage: SyncStats;
  stylescape: SyncStats;
  stealstreetwear: SyncStats;
};

const SUPPLIERS = [
  {
    id: "fashioncage",
    label: "Fashion Cage",
    domain: "fashioncage.me",
    color: "text-orange-400",
    dot: "bg-orange-400",
  },
  {
    id: "stylescape",
    label: "Stylescape",
    domain: "stylescape.me",
    color: "text-purple-400",
    dot: "bg-purple-400",
  },
  {
    id: "stealstreetwear",
    label: "Steal Streetwear",
    domain: "stealstreetwear.com",
    color: "text-blue-400",
    dot: "bg-blue-400",
  },
] as const;

type SupplierId = typeof SUPPLIERS[number]["id"];

type ImporterName = "firstpick" | "basics";
type QueueProduct = {
  id: number;
  importer: ImporterName;
  externalId: string;
  name: string;
  description: string | null;
  sourcePrice: number;
  profit: number;
  sellingPrice: number;
  imageUrl: string | null;
  sourceUrl: string | null;
  categoryName: string | null;
  stock: number;
  status: "staged" | "published";
  productId: number | null;
};
type ImporterState = {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  autoSyncEnabled: boolean;
  profit: number;
  stagedCount: number;
};
type ImporterStatus = {
  connected: boolean;
  source: string;
  marketplace: string;
  sourceMessage: string;
  shippingPrice: number;
  importers: Record<ImporterName, ImporterState>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
}

function AmazonImporter() {
  const { toast } = useToast();
  const [active, setActive] = useState<ImporterName>("firstpick");
  const [status, setStatus] = useState<ImporterStatus | null>(null);
  const [queue, setQueue] = useState<QueueProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [profit, setProfit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bringing, setBringing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [statusRes, queueRes] = await Promise.all([
        fetch(`${BASE}/api/importer/status`, { credentials: "include", signal }),
        fetch(`${BASE}/api/importer/queue?importer=${active}`, { credentials: "include", signal }),
      ]);
      if (!statusRes.ok || !queueRes.ok) throw new Error("Unable to load importer data");
      const nextStatus = await statusRes.json() as ImporterStatus;
      const nextQueue = await queueRes.json() as QueueProduct[];
      setStatus(nextStatus);
      setQueue(nextQueue);
      setProfit(nextStatus.importers[active]?.profit ?? 25);
      setSelected(new Set());
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast({ title: "Importer unavailable", description: error instanceof Error ? error.message : "Try again shortly.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [active]);

  const activeState = status?.importers[active];
  const staged = queue.filter((product) => product.status === "staged");
  const allSelected = staged.length > 0 && staged.every((product) => selected.has(product.id));

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${BASE}/api/importer/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importer: active }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Amazon refresh failed");
      await load();
    } catch (error) {
      toast({ title: "Amazon refresh blocked", description: error instanceof Error ? error.message : "Connect Amazon first.", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/importer/config`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importer: active, profit, autoSyncEnabled: activeState?.autoSyncEnabled ?? true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "Could not save pricing");
      }
      setStatus(await res.json() as ImporterStatus);
      toast({ title: `${active === "basics" ? "Basics" : "FirstPick"} pricing saved`, description: `AED ${profit} profit plus AED 25 shipping.` });
    } catch (error) {
      toast({ title: "Could not save pricing", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoSync = async () => {
    if (!activeState) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/importer/config`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importer: active, profit: activeState.profit, autoSyncEnabled: !activeState.autoSyncEnabled }),
      });
      if (!res.ok) throw new Error("Could not update daily refresh");
      setStatus(await res.json() as ImporterStatus);
    } catch (error) {
      toast({ title: "Could not update daily refresh", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const bringToStore = async () => {
    const ids = selected.size > 0 ? [...selected] : staged.map((product) => product.id);
    if (ids.length === 0) {
      toast({ title: "Nothing staged", description: "Refresh Amazon first, then select products to bring into the store." });
      return;
    }
    setBringing(true);
    try {
      const res = await fetch(`${BASE}/api/importer/bring-to-store`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importer: active, ids }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; imported?: number };
      if (!res.ok) throw new Error(data.error || "Could not publish products");
      toast({ title: "Products brought to store", description: `${data.imported ?? 0} products are now available in ${active === "basics" ? "Basics" : "the Back To School or main"} collection.` });
      await load();
    } catch (error) {
      toast({ title: "Publish failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setBringing(false);
    }
  };

  const removeFromQueue = async (product: QueueProduct) => {
    const warning = product.status === "published"
      ? "This will hide the published product from customers. Continue?"
      : "Remove this staged product from the importer?";
    if (!window.confirm(warning)) return;
    setDeletingId(product.id);
    try {
      const res = await fetch(`${BASE}/api/importer/queue/${product.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast({ title: product.status === "published" ? "Product hidden" : "Staged product removed" });
      await load();
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-orange-500/25 p-5 sm:p-7"
        style={{ background: "radial-gradient(circle at 90% 0%, rgba(255,102,0,0.18), transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,102,0,0.03))" }}
      >
        <motion.div
          aria-hidden="true"
          animate={{ x: ["-10%", "110%"] }}
          transition={{ duration: 5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          className="absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-80"
        />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-orange-300 text-[10px] font-black uppercase tracking-[0.25em]">
              <Sparkles className="h-3.5 w-3.5" /> Product Importer
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tighter">Amazon.ae <span className="text-orange-400">drops</span></h1>
            <p className="mt-2 text-sm text-white/45">
              Review products before they go live. FirstPick is for the main store and school essentials; Basics is for lower-cost everyday items.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/45 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
            {status?.connected ? <Check className="h-4 w-4 text-emerald-400" /> : <CloudOff className="h-4 w-4 text-amber-300" />}
            <span>{status?.connected ? "Amazon connected" : "Amazon connection required"}</span>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 w-full sm:w-fit">
          {(["firstpick", "basics"] as const).map((name) => (
            <button
              key={name}
              onClick={() => setActive(name)}
              className={`flex-1 sm:flex-none rounded-lg px-4 py-2.5 text-left text-xs font-black uppercase tracking-widest transition-all ${active === name ? "bg-orange-500/15 text-orange-300 shadow-inner" : "text-white/35 hover:text-white/70"}`}
            >
              {name === "firstpick" ? "FirstPick Importer" : "Basics Importer"}
              <span className="ml-2 text-[10px] opacity-60">{status?.importers[name]?.stagedCount ?? 0}</span>
            </button>
          ))}
        </div>
        <Button
          onClick={refresh}
          disabled={refreshing || !status?.connected}
          variant="outline"
          className="gap-2 border-orange-500/30 font-black uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
          title={status?.sourceMessage}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh Amazon.ae"}
        </Button>
      </div>

      {!status?.connected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-black text-amber-200">Daily Amazon refresh is paused</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">{status?.sourceMessage ?? "Connect an authorized Amazon Selling Partner account before importing catalog data."}</p>
          </div>
        </motion.div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Staged to review" value={loading ? "—" : staged.length} icon={Package} className="border-orange-500/20 bg-orange-500/[0.04]" />
        <StatCard label="Last refresh" value={formatDate(activeState?.lastSyncAt ?? null)} icon={Clock} className="border-white/10 bg-white/[0.02]" />
        <StatCard label="Shipping added" value={`AED ${status?.shippingPrice ?? 25}`} icon={Store} className="border-white/10 bg-white/[0.02]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wider">{active === "firstpick" ? "FirstPick queue" : "Basics queue"}</p>
              <p className="mt-1 text-xs text-white/35">Select items or publish the full staged batch.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(allSelected ? new Set() : new Set(staged.map((product) => product.id)))} disabled={staged.length === 0} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white disabled:opacity-30">
                {allSelected ? "Clear selection" : "Select staged"}
              </button>
              <Button onClick={bringToStore} disabled={bringing || staged.length === 0} className="gap-2 fire-gradient border-none text-[10px] font-black uppercase tracking-widest">
                <Store className="h-3.5 w-3.5" /> {bringing ? "Publishing…" : "Bring to store"}
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>
          ) : queue.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Package className="mx-auto h-8 w-8 text-white/20" />
              <p className="mt-3 text-sm font-black uppercase tracking-wider text-white/60">Nothing staged yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/35">When Amazon access is connected, daily product candidates will appear here for review before publication.</p>
            </div>
          ) : (
            <div>
              {queue.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.025, 0.3) }} className="flex items-center gap-3 border-b border-white/[0.06] p-3 last:border-0 sm:p-4">
                  {product.status === "staged" && <input type="checkbox" checked={selected.has(product.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); event.target.checked ? next.add(product.id) : next.delete(product.id); return next; })} className="h-4 w-4 accent-orange-500" aria-label={`Select ${product.name}`} />}
                  {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-white/10 object-cover" loading="lazy" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]"><Package className="h-5 w-5 text-white/20" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white/85">{product.name}</p>
                    <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-white/30">{product.categoryName || (active === "basics" ? "Everyday basic" : "Back to School candidate")}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-mono text-xs font-black text-orange-300">AED {product.sellingPrice.toFixed(2)}</p>
                    <p className="font-mono text-[10px] text-white/30">Cost {product.sourcePrice.toFixed(2)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${product.status === "published" ? "bg-emerald-400/10 text-emerald-300" : "bg-orange-400/10 text-orange-300"}`}>{product.status}</span>
                  <button onClick={() => removeFromQueue(product)} disabled={deletingId === product.id} className="rounded-lg p-2 text-white/25 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50" aria-label={`Delete ${product.name}`}><Trash2 className="h-4 w-4" /></button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60"><CircleDollarSign className="h-4 w-4 text-orange-300" /> Pricing rules</div>
          <p className="mt-2 text-xs leading-relaxed text-white/35">Selling price adds the source cost, AED 25 delivery, and your profit.</p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/45"><span>Profit add-on</span><span className="font-mono text-orange-300">AED {profit}</span></div>
            <input type="range" min="20" max="100" step="1" value={profit} onChange={(event) => setProfit(Number(event.target.value))} className="w-full accent-orange-500" />
            <div className="mt-1 flex justify-between text-[10px] text-white/25"><span>AED 20</span><span>AED 100</span></div>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-[11px] text-white/50">
            <span className="text-white/30">Example:</span> 30 + 25 + {profit} = <span className="font-black text-orange-300">AED {30 + 25 + profit}</span>
          </div>
          <Button onClick={saveConfig} disabled={saving} variant="outline" className="mt-4 w-full border-orange-500/25 text-xs font-black uppercase tracking-widest">{saving ? "Saving…" : "Save pricing"}</Button>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <div><p className="text-xs font-bold text-white/70">Daily refresh</p><p className="mt-1 text-[10px] text-white/30">Next: {formatDate(activeState?.nextSyncAt ?? null)}</p></div>
            <button onClick={toggleAutoSync} disabled={saving} className={`relative h-6 w-11 rounded-full transition-colors ${activeState?.autoSyncEnabled ? "bg-emerald-500" : "bg-white/15"}`} aria-label="Toggle daily refresh"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${activeState?.autoSyncEnabled ? "translate-x-6" : "translate-x-1"}`} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon: Icon, className = "" }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; className?: string;
}) {
  return (
    <div className={`rounded-xl p-4 border text-center ${className}`}>
      <Icon className="h-4 w-4 mx-auto mb-2 opacity-60" />
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{label}</p>
      <p className="font-black text-sm font-mono">{value}</p>
    </div>
  );
}

function SupplierTab({
  supplier,
  stats,
  onRefreshStats,
}: {
  supplier: typeof SUPPLIERS[number];
  stats: SyncStats | undefined;
  onRefreshStats: () => void;
}) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/import/${supplier.id}/preview`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        toast({ title: "Not logged in as admin", description: "Please log in to the admin panel first.", variant: "destructive" });
        return;
      }
      if (res.status === 502 || res.status === 504) {
        toast({ title: `Cannot reach ${supplier.domain}`, description: "The supplier website is currently unreachable. Try again in a few minutes.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PreviewResult;
      setPreview(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: `Preview failed`, description: msg, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/import/${supplier.id}`, { method: "POST", credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        toast({ title: "Not logged in as admin", description: "Please log in first.", variant: "destructive" });
        return;
      }
      const data = (await res.json()) as ImportResult;
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      onRefreshStats();
      toast({
        title: `Import complete from ${supplier.domain}`,
        description: `${data.imported} new · ${data.updated} updated · ${data.total} total`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const deleteBySource = async () => {
    if (!confirm(`⚠️ Delete ALL products imported from ${supplier.domain}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/import/delete-by-source/${supplier.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { deleted: number };
      onRefreshStats();
      toast({ title: `Deleted ${data.deleted} products from ${supplier.domain}` });
    } catch {
      toast({ title: "Failed to delete products", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const toggleAutoSync = async () => {
    if (!stats) return;
    setTogglingAuto(true);
    try {
      await fetch(`${BASE}/api/import/toggle-autosync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier: supplier.id, enabled: !stats.autoSyncEnabled }),
      });
      onRefreshStats();
      toast({ title: `Auto-sync ${!stats.autoSyncEnabled ? "enabled" : "disabled"} for ${supplier.label}` });
    } catch {
      toast({ title: "Failed to toggle auto-sync", variant: "destructive" });
    } finally {
      setTogglingAuto(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Stats */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="New Products"
              value={stats.lastImportCount}
              icon={Download}
              className="bg-green-500/5 border-green-500/20"
            />
            <StatCard
              label="Updated"
              value={stats.lastUpdateCount}
              icon={TrendingUp}
              className="bg-blue-500/5 border-blue-500/20"
            />
            <StatCard
              label="Skipped"
              value={stats.lastSkipCount}
              icon={SkipForward}
              className="bg-muted/40 border-border/40"
            />
            <StatCard
              label="Pricing Formula"
              value="(Cost + 25) × 1.3"
              icon={Tag}
              className="bg-primary/5 border-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-muted/30 border border-border/40 rounded-xl p-4 flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Last Sync</p>
                <p className="text-xs font-bold">{formatDate(stats.lastSyncAt)}</p>
              </div>
            </div>
            <div className="bg-muted/30 border border-border/40 rounded-xl p-4 flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Next Sync</p>
                <p className="text-xs font-bold">{formatDate(stats.nextSyncAt)}</p>
              </div>
            </div>
            <div className="bg-muted/30 border border-border/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.autoSyncEnabled ? (
                  <ToggleRight className="h-5 w-5 text-green-400" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Auto-Sync</p>
                  <p className={`text-xs font-black ${stats.autoSyncEnabled ? "text-green-400" : "text-muted-foreground"}`}>
                    {stats.autoSyncEnabled ? "Daily" : "Off"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleAutoSync}
                disabled={togglingAuto}
                className={`relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 ${stats.autoSyncEnabled ? "bg-green-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${stats.autoSyncEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {stats.lastErrorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{stats.lastErrorMsg}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Import Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border/60 rounded-2xl p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px fire-gradient opacity-40" />

        <div className="flex flex-wrap gap-3 mb-4">
          <p className="text-xs text-muted-foreground flex-1 self-center">
            All imported products are automatically tagged as <span className="font-black text-foreground">REP</span>,
            set to <span className="font-black text-foreground">Featured</span>, and placed in the correct category.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={fetchPreview}
            disabled={loadingPreview}
            variant="outline"
            className="font-black uppercase tracking-wider gap-2"
          >
            <Package className={`h-4 w-4 ${loadingPreview ? "animate-pulse" : ""}`} />
            {loadingPreview ? "Fetching…" : "Preview Products"}
          </Button>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={runImport}
              disabled={importing}
              className="fire-gradient border-none font-black uppercase tracking-wider gap-2"
            >
              <Download className={`h-4 w-4 ${importing ? "animate-bounce" : ""}`} />
              {importing ? "Importing…" : "Import All Products"}
            </Button>
          </motion.div>

          <Button
            onClick={deleteBySource}
            disabled={deleting}
            variant="ghost"
            className="font-black uppercase tracking-wider gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete All from Supplier"}
          </Button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${result.error ? "bg-red-500/10 border border-red-500/30" : "bg-green-500/10 border border-green-500/30"}`}
            >
              {result.error ? (
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-black text-sm uppercase tracking-wider ${result.error ? "text-red-400" : "text-green-400"}`}>
                  {result.error ? "Import Failed" : "Import Complete"}
                </p>
                {result.error ? (
                  <p className="text-xs text-muted-foreground mt-1">{result.error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong className="text-foreground">{result.imported}</strong> new ·{" "}
                    <strong className="text-foreground">{result.updated}</strong> updated ·{" "}
                    <strong className="text-foreground">{result.total}</strong> total processed
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Product Preview List */}
      <AnimatePresence>
        {preview && preview.products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black uppercase tracking-wider text-sm">
                Preview{" "}
                <span className="text-muted-foreground font-normal">
                  ({preview.products.length} of {preview.count})
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Prices calculated automatically</span>
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {preview.products.map((product, i) => (
                <motion.div
                  key={product.externalId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="border-b border-border/40 last:border-0"
                >
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === product.externalId ? null : product.externalId)
                    }
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border/40"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{product.name}</p>
                      {product.categoryName && (
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                          {product.categoryName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-[#111827] text-white border border-white/10 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                        REP
                      </span>
                    </div>
                    <div className="text-right shrink-0 mr-3">
                      <p className="font-mono font-black text-primary text-sm">
                        AED {product.sellingPrice.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Cost: AED {product.supplierPrice.toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                        product.stock > 0
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {product.stock > 0 ? "In Stock" : "Out"}
                    </span>
                    {expandedId === product.externalId ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedId === product.externalId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 border-t border-border/30">
                          {product.sizes && (
                            <div>
                              <p className="label-xs mb-1">Sizes</p>
                              <p className="text-xs text-muted-foreground">{product.sizes}</p>
                            </div>
                          )}
                          {product.colors && (
                            <div>
                              <p className="label-xs mb-1">Colors</p>
                              <p className="text-xs text-muted-foreground">{product.colors}</p>
                            </div>
                          )}
                          <div>
                            <p className="label-xs mb-1">Supplier Price</p>
                            <p className="text-xs font-mono font-black">
                              AED {product.supplierPrice.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="label-xs mb-1">Selling Price</p>
                            <p className="text-xs font-mono font-black text-primary">
                              AED {product.sellingPrice.toFixed(2)}
                            </p>
                          </div>
                          {product.description && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="label-xs mb-1">Description</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Showing first {preview.products.length} of {preview.count} products. Click "Import All
              Products" to import everything.
            </p>
          </motion.div>
        )}

        {preview && preview.products.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center border border-border/40 rounded-xl"
          >
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-black uppercase tracking-wider text-sm">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">{supplier.domain} returned no products.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminImport() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SupplierId>("fashioncage");
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BASE}/api/import/stats`, { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AllStats;
        setStats(data);
      }
    } catch {
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch(`${BASE}/api/import/sync-all`, { method: "POST", credentials: "include" });
      const data = (await res.json()) as {
        fashioncage: ImportResult & { error?: string };
        stylescape: ImportResult & { error?: string };
        stealstreetwear: ImportResult & { error?: string };
      };
      fetchStats();
      const totalNew = (data.fashioncage.imported ?? 0) + (data.stylescape.imported ?? 0) + (data.stealstreetwear?.imported ?? 0);
      const totalUpdated = (data.fashioncage.updated ?? 0) + (data.stylescape.updated ?? 0) + (data.stealstreetwear?.updated ?? 0);
      toast({
        title: "Sync All Complete",
        description: `${totalNew} new · ${totalUpdated} updated`,
      });
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally {
      setSyncingAll(false);
    }
  };

  const recalculatePrices = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`${BASE}/api/import/recalculate-prices`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { updated: number };
      toast({ title: `Recalculated prices for ${data.updated} products.` });
    } catch {
      toast({ title: "Recalculation failed", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  const activeSupplier = SUPPLIERS.find((s) => s.id === activeTab)!;

  return (
    <div className="space-y-8">
      <AmazonImporter />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Existing Supplier Sync</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Keep the current supplier catalogues in sync from{" "}
            <span className="text-orange-400 font-bold">fashioncage.me</span>,{" "}
            <span className="text-blue-400 font-bold">stealstreetwear.com</span>, and{" "}
            <span className="text-purple-400 font-bold">reesdxb.store</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={syncAll}
            disabled={syncingAll}
            className="fire-gradient border-none font-black uppercase tracking-wider gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
            {syncingAll ? "Syncing…" : "Sync All Now"}
          </Button>
          <Button
            onClick={recalculatePrices}
            disabled={recalculating}
            variant="outline"
            className="font-black uppercase tracking-wider gap-2 border-primary/30 hover:border-primary shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
            Recalculate Prices
          </Button>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm"
      >
        <Tag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p>
          All imported products are automatically tagged as{" "}
          <span className="font-black text-foreground">REP</span>, set to{" "}
          <span className="font-black text-foreground">Featured</span>, and published immediately. You can
          remove the REP tag from any individual product in the Inventory manager.
        </p>
      </motion.div>

      {/* Supplier Tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 border border-border/40 rounded-xl w-fit">
        {SUPPLIERS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === s.id
                ? "bg-card shadow-sm text-foreground border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
            {!loadingStats && stats && stats[s.id] && (
              <span className={`text-[10px] font-mono ml-1 ${s.color}`}>
                {stats[s.id].lastSyncAt ? "synced" : "not synced"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <SupplierTab
            supplier={activeSupplier}
            stats={stats ? (stats[activeTab] ?? undefined) : undefined}
            onRefreshStats={fetchStats}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
