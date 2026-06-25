import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Download, RefreshCw, CheckCircle2, AlertCircle, Package,
  ChevronDown, ChevronRight, Zap, Clock, Calendar, ToggleLeft,
  ToggleRight, Tag, TrendingUp, SkipForward,
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
    id: "stealstreetwear",
    label: "Steal Streetwear",
    domain: "stealstreetwear.com",
    color: "text-blue-400",
    dot: "bg-blue-400",
  },
] as const;

type SupplierId = typeof SUPPLIERS[number]["id"];

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
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

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/import/${supplier.id}/preview`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preview");
      const data = (await res.json()) as PreviewResult;
      setPreview(data);
    } catch {
      toast({ title: `Failed to fetch preview from ${supplier.domain}`, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/import/${supplier.id}`, { method: "POST", credentials: "include" });
      const data = (await res.json()) as ImportResult;
      if (!res.ok || data.error) throw new Error(data.error || "Import failed");
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
        stealstreetwear: ImportResult & { error?: string };
      };
      fetchStats();
      const totalNew = (data.fashioncage.imported ?? 0) + (data.stealstreetwear.imported ?? 0);
      const totalUpdated = (data.fashioncage.updated ?? 0) + (data.stealstreetwear.updated ?? 0);
      toast({
        title: "Sync All Complete",
        description: `${totalNew} new · ${totalUpdated} updated across both suppliers`,
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Product Importer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Auto-import & sync from{" "}
            <span className="text-orange-400 font-bold">fashioncage.me</span> and{" "}
            <span className="text-blue-400 font-bold">stealstreetwear.com</span>
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
            {!loadingStats && stats && (
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
            stats={stats ? stats[activeTab] : undefined}
            onRefreshStats={fetchStats}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
