import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, CheckCircle2, AlertCircle, Package, ChevronDown, ChevronRight, Zap } from "lucide-react";

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
  total: number;
};

type PreviewResult = {
  count: number;
  products: PreviewProduct[];
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function AdminImport() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/import/fashioncage/preview`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preview");
      const data = await res.json() as PreviewResult;
      setPreview(data);
    } catch {
      toast({ title: "Failed to fetch preview", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/import/fashioncage`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json() as ImportResult;
      setResult(data);
      toast({ title: `Import complete! ${data.imported} new, ${data.updated} updated.` });
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const recalculatePrices = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`${BASE}/api/import/recalculate-prices`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Recalculation failed");
      const data = await res.json() as { updated: number };
      toast({ title: `Recalculated prices for ${data.updated} products.` });
    } catch {
      toast({ title: "Recalculation failed", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Product Importer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Auto-import products from <span className="text-primary font-bold">fashioncage.me</span> with calculated selling prices.
          </p>
        </div>
        <Button
          onClick={recalculatePrices}
          disabled={recalculating}
          variant="outline"
          className="font-black uppercase tracking-wider gap-2 border-primary/40 hover:border-primary shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
          Recalculate All Prices
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card border border-border/60 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px fire-gradient opacity-60" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
            <p className="label-xs mb-1">Pricing Formula</p>
            <p className="font-mono font-black text-primary text-sm">(Supplier Price + 25) × 1.3</p>
          </div>
          <div className="bg-muted/40 border border-border/40 rounded-xl p-4 text-center">
            <p className="label-xs mb-1">Source</p>
            <p className="font-black text-sm">fashioncage.me</p>
          </div>
          <div className="bg-muted/40 border border-border/40 rounded-xl p-4 text-center">
            <p className="label-xs mb-1">Products Found</p>
            <p className="font-black text-sm text-primary">{preview ? preview.count : "—"}</p>
          </div>
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
              className="mt-5 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-green-400 text-sm uppercase tracking-wider">Import Complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong className="text-foreground">{result.imported}</strong> new products added ·{" "}
                  <strong className="text-foreground">{result.updated}</strong> existing products updated ·{" "}
                  <strong className="text-foreground">{result.total}</strong> total processed
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
                Preview <span className="text-muted-foreground font-normal">({preview.products.length} of {preview.count})</span>
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
                  transition={{ delay: Math.min(i * 0.025, 0.5) }}
                  className="border-b border-border/40 last:border-0"
                >
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(expandedId === product.externalId ? null : product.externalId)}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{product.name}</p>
                      {product.categoryName && (
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{product.categoryName}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 mr-3">
                      <p className="font-mono font-black text-primary text-sm">AED {product.sellingPrice.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Cost: AED {product.supplierPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${product.stock > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
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
                            <p className="text-xs font-mono font-black">AED {product.supplierPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="label-xs mb-1">Selling Price</p>
                            <p className="text-xs font-mono font-black text-primary">AED {product.sellingPrice.toFixed(2)}</p>
                          </div>
                          {product.description && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="label-xs mb-1">Description</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
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
              Showing first {preview.products.length} of {preview.count} products. Click "Import All Products" to import everything.
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
            <p className="text-sm text-muted-foreground mt-1">fashioncage.me returned no products.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
