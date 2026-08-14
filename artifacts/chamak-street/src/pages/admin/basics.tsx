/* @refresh reset */
import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Edit, Trash2, Upload, Image as ImageIcon, CheckCircle, XCircle,
  X, Calendar, Package, EyeOff, Star, Flame, Tag, DollarSign, Layers,
  ChevronDown, ChevronUp, Sparkles, ShieldCheck, AlertTriangle
} from "lucide-react";
import type { Product, ProductInput } from "@workspace/api-client-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { getPrimaryProductMedia, parseProductMedia, serializeProductMedia, type ProductMedia } from "@/lib/product-media";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;
const BASICS_QUERY_KEY = ["admin", "basics", "all"];

/* ── Upload helper ── */
type CloudinarySignature = { apiKey: string; folder: string; signature: string; timestamp: string; uploadUrl: string; };

async function uploadMedia(file: File): Promise<ProductMedia> {
  const signatureRes = await fetch(`${BASE}/api/uploads/sign`, { method: "POST", credentials: "include" });
  if (signatureRes.ok) {
    const sig = await signatureRes.json() as CloudinarySignature;
    const form = new FormData();
    form.append("file", file); form.append("api_key", sig.apiKey);
    form.append("timestamp", sig.timestamp); form.append("folder", sig.folder); form.append("signature", sig.signature);
    const up = await fetch(sig.uploadUrl, { method: "POST", body: form });
    if (!up.ok) throw new Error("Cloudinary upload failed");
    const d = await up.json() as { secure_url?: string; resource_type?: string };
    if (!d.secure_url) throw new Error("Missing URL");
    return { url: d.secure_url, type: d.resource_type === "video" || file.type.startsWith("video/") ? "video" : "image" };
  }
  if (signatureRes.status !== 404) throw new Error("Signing failed");
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch(`${BASE}/api/uploads`, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  const d = await res.json() as { url: string; type?: "image" | "video" };
  return { url: d.url, type: d.type === "video" ? "video" : "image" };
}

type BasicsProduct = Product & {
  isPreOrder?: boolean; preOrderLabel?: string | null; preOrderDate?: string | null; preOrderNote?: string | null;
  sellingFast?: boolean; spotlight?: boolean; hidden?: boolean; publishAt?: string | null; unpublishAt?: string | null;
  collection?: string | null;
};

type ProductFormData = ProductInput & {
  isPreOrder?: boolean; preOrderLabel?: string | null; preOrderDate?: string | null; preOrderNote?: string | null;
  sellingFast?: boolean; spotlight?: boolean; hidden?: boolean; publishAt?: string | null; unpublishAt?: string | null;
  collection?: string;
};

const BULK_ACTIONS = [
  { value: "hide", label: "Hide Selected" }, { value: "show", label: "Show Selected" },
  { value: "feature", label: "Mark as Featured" }, { value: "unfeature", label: "Remove from Featured" },
  { value: "preorder", label: "Enable Pre-Order" }, { value: "unpreorder", label: "Disable Pre-Order" },
  { value: "delete", label: "Delete Selected" },
];

/* ── Animated Toggle ── */
function Toggle({ checked, onChange, color = "#ff6600" }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      animate={{ backgroundColor: checked ? color : "rgba(255,255,255,0.1)" }}
      transition={{ duration: 0.2 }}
      className="relative inline-flex w-11 h-6 rounded-full shrink-0 focus:outline-none"
      style={{ boxShadow: checked ? `0 0 10px ${color}55` : undefined }}
    >
      <motion.span
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
      />
    </motion.button>
  );
}

/* ── Pill Badge Toggle ── */
function PillToggle({ checked, onChange, label, icon: Icon, color }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; icon: React.ElementType; color: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      animate={{
        backgroundColor: checked ? `${color}20` : "rgba(255,255,255,0.04)",
        borderColor: checked ? `${color}60` : "rgba(255,255,255,0.1)",
        color: checked ? color : "rgba(255,255,255,0.45)",
      }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
      <motion.div
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color }}
      />
    </motion.button>
  );
}

/* ── Section wrapper ── */
function Section({ title, icon: Icon, children, accent = "rgba(255,255,255,0.08)", collapsible = false }:
  { title: string; icon: React.ElementType; children: React.ReactNode; accent?: string; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left ${collapsible ? "cursor-pointer hover:bg-white/3" : "cursor-default"}`}
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : undefined }}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-md shrink-0" style={{ background: accent }}>
          <Icon className="h-3.5 w-3.5 text-white/70" />
        </span>
        <span className="text-xs font-black uppercase tracking-widest text-white/60 flex-1">{title}</span>
        {collapsible && (open ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />)}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Field ── */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/25">{hint}</p>}
    </div>
  );
}

/* ── Size chip input ── */
function SizeChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const chips = value.split(",").map(s => s.trim()).filter(Boolean);
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim().toUpperCase();
    if (v && !chips.includes(v)) onChange([...chips, v].join(", "));
    setInput("");
  };
  const remove = (chip: string) => onChange(chips.filter(c => c !== chip).join(", "));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        <AnimatePresence>
          {chips.map(chip => (
            <motion.span
              key={chip}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 bg-white/8 border border-white/15 text-white/70 text-xs font-bold px-2.5 py-1 rounded-md"
            >
              {chip}
              <button type="button" onClick={() => remove(chip)} className="text-white/40 hover:text-white/80 transition-colors ml-0.5">
                <X className="h-2.5 w-2.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } if (e.key === ",") { e.preventDefault(); add(); } }}
          placeholder="Add size (e.g. XL) then press Enter"
          className="h-8 text-xs bg-white/5 border-white/10 font-mono"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 text-xs shrink-0 border-white/15">
          + Add
        </Button>
      </div>
      <p className="text-[10px] text-white/25">Press Enter or comma to add. Leave empty for one-size items.</p>
    </div>
  );
}

/* ── Media Upload Zone ── */
function MediaZone({ items, onChange, uploading, onUpload }: {
  items: ProductMedia[]; onChange: (items: ProductMedia[]) => void;
  uploading: boolean; onUpload: (files: File[]) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (files.length) await onUpload(files);
  }, [onUpload]);

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <motion.div
        animate={{ borderColor: dragging ? "rgba(255,102,0,0.7)" : uploading ? "rgba(255,102,0,0.4)" : "rgba(255,255,255,0.12)" }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 py-8 cursor-pointer transition-colors"
        style={{ background: dragging ? "rgba(255,102,0,0.06)" : uploading ? "rgba(255,102,0,0.04)" : "rgba(255,255,255,0.02)" }}
      >
        <motion.div
          animate={uploading ? { rotate: 360 } : { rotate: 0 }}
          transition={uploading ? { duration: 1.2, repeat: Infinity, ease: "linear" } : {}}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)" }}
        >
          {uploading ? <Upload className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary/60" />}
        </motion.div>
        <div className="text-center">
          <p className="text-sm font-bold text-white/60">
            {uploading ? "Uploading…" : dragging ? "Drop to upload" : "Drag & drop or click to browse"}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">JPG, PNG, WEBP, MP4, MOV — up to 8 files</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
          onChange={async e => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) await onUpload(files);
            e.target.value = "";
          }}
        />
      </motion.div>

      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={`${item.url}-${i}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5 group"
              >
                {i === 0 && (
                  <div className="absolute top-1 left-1 z-10 bg-primary text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                    Main
                  </div>
                )}
                {item.type === "video" ? (
                  <>
                    <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center text-[8px] font-black uppercase text-white py-0.5">Video</div>
                  </>
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
            {items.length < 8 && (
              <motion.div
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
              >
                <Plus className="h-5 w-5 text-white/20" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function AdminBasics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* Fetch only Basics products */
  const { data: products, isLoading } = useQuery<BasicsProduct[]>({
    queryKey: BASICS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/products?collection=basics`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 0,
  });

  const { data: categories } = useListCategories({ query: { queryKey: ["categories"] } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inStock, setInStock] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<ProductMedia[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "", price: 0, stock: 100, imageUrl: "", description: "", sizes: "",
    featured: false, rep: false, categoryId: undefined,
    isPreOrder: false, preOrderLabel: "", preOrderDate: "", preOrderNote: "",
    sellingFast: false, spotlight: false, hidden: false, publishAt: null, unpublishAt: null,
    collection: "basics",
  });

  const set = (partial: Partial<ProductFormData>) => setFormData(f => ({ ...f, ...partial }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: BASICS_QUERY_KEY });

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      const uploaded: ProductMedia[] = [];
      for (const file of files) uploaded.push(await uploadMedia(file));
      setMediaItems(prev => {
        const next = [...prev, ...uploaded];
        set({ imageUrl: serializeProductMedia(next) });
        return next;
      });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleMediaChange = (items: ProductMedia[]) => {
    setMediaItems(items);
    set({ imageUrl: items.length > 0 ? serializeProductMedia(items) : "" });
  };

  const openNew = () => {
    setEditingId(null); setInStock(true); setMediaItems([]);
    setFormData({
      name: "", price: 0, stock: 100, imageUrl: "", description: "", sizes: "S, M, L, XL",
      featured: false, rep: false, categoryId: categories?.[0]?.id,
      isPreOrder: false, preOrderLabel: "", preOrderDate: "", preOrderNote: "",
      sellingFast: false, spotlight: false, hidden: false, publishAt: null, unpublishAt: null,
      collection: "basics",
    });
    setSheetOpen(true);
  };

  const openEdit = (product: BasicsProduct) => {
    setEditingId(product.id);
    setInStock(product.stock > 0);
    setMediaItems(parseProductMedia(product.imageUrl));
    setFormData({
      name: product.name, price: product.price,
      stock: product.stock > 0 ? 100 : 0,
      imageUrl: product.imageUrl || "", description: product.description || "",
      sizes: product.sizes || "", featured: product.featured, rep: false,
      categoryId: product.categoryId || undefined,
      isPreOrder: product.isPreOrder ?? false,
      preOrderLabel: product.preOrderLabel ?? "",
      preOrderDate: product.preOrderDate ?? "",
      preOrderNote: product.preOrderNote ?? "",
      sellingFast: product.sellingFast ?? false,
      spotlight: product.spotlight ?? false,
      hidden: product.hidden ?? false,
      publishAt: product.publishAt ?? null,
      unpublishAt: product.unpublishAt ?? null,
      collection: "basics",
    });
    setSheetOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!formData.price || formData.price <= 0) { toast({ title: "Enter a valid price", variant: "destructive" }); return; }
    const data = {
      ...formData,
      imageUrl: mediaItems.length > 0 ? serializeProductMedia(mediaItems) : "",
      stock: inStock ? 100 : 0,
      collection: "basics",
    };
    const opts = {
      onSuccess: () => {
        invalidate();
        setSheetOpen(false);
        toast({ title: editingId ? "Product updated ✓" : "Product created ✓" });
      },
    };
    if (editingId) updateProduct.mutate({ id: editingId, data: data as ProductInput }, opts);
    else createProduct.mutate({ data: data as ProductInput }, opts);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteProduct.mutate({ id: pendingDeleteId }, {
      onSuccess: () => { invalidate(); toast({ title: "Product deleted" }); setPendingDeleteId(null); },
      onError: () => { setPendingDeleteId(null); }
    });
  };

  const handleSetSpotlight = (e: React.MouseEvent, product: BasicsProduct) => {
    e.stopPropagation();
    if (product.spotlight) return;
    updateProduct.mutate({ id: product.id, data: { ...product, spotlight: true, collection: "basics" } as ProductInput }, {
      onSuccess: () => { invalidate(); toast({ title: "⭐ Spotlight updated" }); }
    });
  };

  /* Delete all BASICS products (not the entire catalog) */
  const deleteAllBasics = async () => {
    setDeleteAllLoading(true);
    try {
      const ids = (products ?? []).map(p => p.id);
      if (ids.length > 0) {
        await fetch(`${BASE}/api/products/bulk-action`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action: "delete" }),
        });
      }
      invalidate();
      toast({ title: "All Basics products deleted" });
      setSelectedIds(new Set());
    } finally {
      setDeleteAllLoading(false);
      setDeleteAllConfirm(false);
    }
  };

  const toggleSelect = (id: number) => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(selectedIds.size === products?.length ? new Set() : new Set(products?.map(p => p.id) ?? []));

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === "delete") { setBulkDeleteConfirm(true); return; }
    setBulkLoading(true);
    try {
      const res = await fetch(`${BASE}/api/products/bulk-action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: bulkAction }),
      });
      if (res.ok) {
        const d = await res.json() as { affected: number };
        toast({ title: `${d.affected} products updated` });
        setSelectedIds(new Set()); setBulkAction("");
        invalidate();
      }
    } finally { setBulkLoading(false); }
  };

  const filteredProducts = (products ?? []).filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isPending = createProduct.isPending || updateProduct.isPending;

  if (isLoading) return (
    <div className="flex items-center justify-center py-32 gap-3">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
      <span className="text-muted-foreground text-sm font-bold">Loading Basics inventory…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter">FirstPick Basics</h1>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{ background: "rgba(255,102,0,0.1)", borderColor: "rgba(255,102,0,0.3)", color: "#ff6600" }}>
              Collection
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{products?.length ?? 0} products · Manage the Basics collection separately from main inventory</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {deleteAllConfirm ? (
            <>
              <Button variant="ghost" onClick={() => setDeleteAllConfirm(false)} className="text-xs font-bold h-9 text-muted-foreground" disabled={deleteAllLoading}>Cancel</Button>
              <Button onClick={deleteAllBasics} disabled={deleteAllLoading}
                className="font-bold uppercase tracking-wider h-9 bg-destructive hover:bg-destructive/90 text-white border-none">
                {deleteAllLoading ? "Deleting…" : `Yes, delete all ${products?.length ?? ""}`}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setDeleteAllConfirm(true)}
              className="font-bold uppercase tracking-wider h-9 border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
              disabled={!products?.length}>
              Delete All Basics
            </Button>
          )}
          <Button onClick={openNew} className="font-bold uppercase tracking-wider fire-gradient border-none">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Search + Bulk */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter Basics products…"
          className="h-9 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 outline-none focus:border-primary/50 transition-colors"
        />
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer ml-auto">
          <input type="checkbox" className="h-4 w-4 rounded"
            checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
            onChange={toggleAll} />
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
        </label>
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-2">
              <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                className="h-8 px-3 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none">
                <option value="">Bulk action…</option>
                {BULK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <Button size="sm" onClick={executeBulkAction} disabled={!bulkAction || bulkLoading}
                className={`text-xs font-black uppercase tracking-wider h-8 ${bulkAction === "delete" ? "bg-destructive text-white" : "bg-primary text-black"}`}>
                {bulkLoading ? "…" : "Apply"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs h-8 text-muted-foreground">✕</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredProducts.map((product, i) => {
            const primaryMedia = getPrimaryProductMedia(product.imageUrl);
            const mediaCount = parseProductMedia(product.imageUrl).length;
            const isHidden = product.hidden;
            const isSelected = selectedIds.has(product.id);
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: EASE }}
                onClick={() => toggleSelect(product.id)}
                className={`bg-card border rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-all duration-200 ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                }`}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-muted relative border-b border-border overflow-hidden">
                  {primaryMedia ? (
                    primaryMedia.type === "video"
                      ? <video src={primaryMedia.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted playsInline preload="metadata" />
                      : <img src={primaryMedia.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/20" /></div>
                  )}

                  {isHidden && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="flex items-center gap-2 bg-black/70 text-white/80 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/15">
                        <EyeOff className="h-3.5 w-3.5" /> Hidden
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10 shadow-lg">
                        <CheckCircle className="h-4 w-4 text-black" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className="bg-orange-500/90 text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">Basics</span>
                    {product.featured && <span className="bg-primary text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">Featured</span>}
                    {product.isPreOrder && <span className="bg-yellow-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">Pre-Order</span>}
                    {product.sellingFast && <span className="bg-orange-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">🔥 Hot</span>}
                    {product.spotlight && <span className="bg-yellow-400 text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">⭐ Spotlight</span>}
                  </div>

                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    {mediaCount > 1 && <span className="bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-sm">{mediaCount} imgs</span>}
                    {!isSelected && !isHidden && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${product.stock > 0 ? "bg-green-500/90 text-black" : "bg-red-500/90 text-white"}`}>
                        {product.stock > 0 ? "In Stock" : "Sold Out"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-widest mb-0.5">{product.categoryName || "—"}</p>
                      <h3 className="font-bold leading-tight truncate">{product.name}</h3>
                    </div>
                    <p className="font-mono font-bold text-primary text-sm shrink-0 ml-2">AED {product.price.toFixed(2)}</p>
                  </div>
                  <div className="mt-auto pt-3 flex items-center gap-2 border-t border-border/40">
                    <button
                      onClick={e => handleSetSpotlight(e, product)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border ${
                        product.spotlight
                          ? "bg-yellow-400/15 text-yellow-400 border-yellow-400/30 cursor-default"
                          : "bg-transparent text-muted-foreground border-transparent hover:bg-yellow-400/8 hover:text-yellow-400 hover:border-yellow-400/20"
                      }`}
                    >
                      <Star className={`h-3 w-3 ${product.spotlight ? "fill-yellow-400" : ""}`} />
                      {product.spotlight ? "Spotlight" : "Set"}
                    </button>
                    <div className="ml-auto flex gap-1">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={e => { e.stopPropagation(); openEdit(product); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Edit className="h-3.5 w-3.5" />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={e => { e.stopPropagation(); setPendingDeleteId(product.id); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-bold">{searchQuery ? `No Basics products matching "${searchQuery}"` : "No Basics products yet"}</p>
          <p className="text-xs mt-1 opacity-60">Products added here appear on the FirstPick Basics storefront</p>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {(pendingDeleteId !== null || bulkDeleteConfirm) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setPendingDeleteId(null); setBulkDeleteConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-white/12 rounded-2xl p-7 max-w-xs w-full mx-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-center font-black text-lg tracking-tight mb-1">
                {bulkDeleteConfirm ? `Delete ${selectedIds.size} products?` : "Delete product?"}
              </h3>
              <p className="text-center text-sm text-muted-foreground mb-6">
                {bulkDeleteConfirm
                  ? `This will permanently remove ${selectedIds.size} selected Basics product${selectedIds.size !== 1 ? "s" : ""}. This cannot be undone.`
                  : "This Basics product will be permanently removed. This cannot be undone."}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/12 text-white/60 hover:text-white"
                  onClick={() => { setPendingDeleteId(null); setBulkDeleteConfirm(false); }}>
                  Cancel
                </Button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  disabled={deleteProduct.isPending || bulkLoading}
                  onClick={async () => {
                    if (bulkDeleteConfirm) {
                      setBulkLoading(true);
                      try {
                        const res = await fetch(`${BASE}/api/products/bulk-action`, {
                          method: "POST", credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: Array.from(selectedIds), action: "delete" }),
                        });
                        if (res.ok) {
                          const d = await res.json() as { affected: number };
                          toast({ title: `${d.affected} Basics products deleted` });
                          setSelectedIds(new Set()); setBulkAction("");
                          invalidate();
                        }
                      } finally { setBulkLoading(false); setBulkDeleteConfirm(false); }
                    } else {
                      confirmDelete();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-black uppercase tracking-wider rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {(deleteProduct.isPending || bulkLoading) ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <><Trash2 className="h-4 w-4" /> Delete</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRODUCT FORM SHEET */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl flex flex-col p-0 gap-0 border-l border-white/8 [&>button]:hidden"
          style={{ background: "#0a0a0a" }}
        >
          {/* Fixed header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="font-black uppercase tracking-wider text-base">
                  {editingId ? "Edit Basics Product" : "New Basics Product"}
                </SheetTitle>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,102,0,0.15)", color: "#ff6600", border: "1px solid rgba(255,102,0,0.3)" }}>
                  Basics
                </span>
              </div>
              {formData.name && (
                <p className="text-xs text-white/40 mt-0.5 truncate max-w-[280px]">{formData.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSheetOpen(false)}
                className="text-xs border-white/15 text-white/60 hover:text-white">
                Cancel
              </Button>
              <motion.button
                form="basics-product-form"
                type="submit"
                disabled={uploading || isPending}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-black transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ff6600, #ffaa00)", boxShadow: "0 4px 16px rgba(255,102,0,0.35)" }}
              >
                {isPending ? (
                  <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block w-3 h-3 border-2 border-black/30 border-t-black rounded-full" /> Saving…</>
                ) : (
                  <><CheckCircle className="h-3.5 w-3.5" /> {editingId ? "Save Changes" : "Create Product"}</>
                )}
              </motion.button>
            </div>
          </div>

          {/* Scrollable body */}
          <form id="basics-product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Media */}
            <Section title="Product Media" icon={ImageIcon} accent="rgba(255,102,0,0.18)">
              <MediaZone items={mediaItems} onChange={handleMediaChange} uploading={uploading} onUpload={handleUpload} />
            </Section>

            {/* Basic Info */}
            <Section title="Basic Info" icon={Tag} accent="rgba(99,102,241,0.2)">
              <Field label="Product Name *">
                <Input
                  value={formData.name}
                  onChange={e => set({ name: e.target.value })}
                  placeholder="e.g. Classic White Tee"
                  required
                  className="bg-white/5 border-white/10 text-white font-bold placeholder-white/25"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={formData.categoryId || ""}
                    onChange={e => set({ categoryId: parseInt(e.target.value) || undefined })}
                    className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="">No category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description" hint={`${(formData.description || "").length}/500 characters`}>
                <Textarea
                  value={formData.description || ""}
                  onChange={e => set({ description: e.target.value })}
                  maxLength={500}
                  placeholder="Describe the product — material, fit, style…"
                  className="bg-white/5 border-white/10 text-white placeholder-white/25 min-h-[80px] resize-none"
                />
              </Field>
            </Section>

            {/* Pricing & Stock */}
            <Section title="Pricing & Stock" icon={DollarSign} accent="rgba(34,197,94,0.18)">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (AED) *">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">AED</span>
                    <Input
                      type="number" step="0.01" min="0"
                      value={formData.price || ""}
                      onChange={e => set({ price: parseFloat(e.target.value) || 0 })}
                      required
                      className="bg-white/5 border-white/10 text-white font-mono pl-12"
                    />
                  </div>
                </Field>
                <Field label="Availability">
                  <div className="flex h-10 items-center gap-3 px-3 rounded-md border border-white/10 bg-white/5">
                    <span className={`text-xs font-black uppercase tracking-wider transition-colors ${!inStock ? "text-red-400" : "text-white/30"}`}>Out</span>
                    <Toggle checked={inStock} onChange={setInStock} color="#22c55e" />
                    <span className={`text-xs font-black uppercase tracking-wider transition-colors ${inStock ? "text-green-400" : "text-white/30"}`}>In Stock</span>
                  </div>
                </Field>
              </div>
              <Field label="Sizes" hint="Leave empty for one-size items">
                <SizeChips value={formData.sizes || ""} onChange={v => set({ sizes: v })} />
              </Field>
            </Section>

            {/* Badges & Flags */}
            <Section title="Badges & Flags" icon={Sparkles} accent="rgba(251,191,36,0.18)">
              <div className="grid grid-cols-2 gap-2">
                <PillToggle checked={formData.featured ?? false} onChange={v => set({ featured: v })}
                  label="Featured" icon={Star} color="#ff6600" />
                <PillToggle checked={formData.sellingFast ?? false} onChange={v => set({ sellingFast: v })}
                  label="Selling Fast" icon={Flame} color="#f97316" />
                <PillToggle checked={formData.spotlight ?? false} onChange={v => set({ spotlight: v })}
                  label="Spotlight" icon={Sparkles} color="#facc15" />
                <PillToggle checked={formData.hidden ?? false} onChange={v => set({ hidden: v })}
                  label="Hidden" icon={EyeOff} color="#94a3b8" />
              </div>
            </Section>

            {/* Pre-Order — collapsible */}
            <Section title="Pre-Order" icon={Calendar} accent="rgba(234,179,8,0.18)" collapsible>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60 font-bold">Enable Pre-Order Mode</span>
                <Toggle checked={formData.isPreOrder ?? false} onChange={v => set({ isPreOrder: v })} color="#eab308" />
              </div>
              <AnimatePresence>
                {formData.isPreOrder && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Badge Label">
                          <Input value={formData.preOrderLabel ?? ""} onChange={e => set({ preOrderLabel: e.target.value })}
                            placeholder="Pre-Order" className="bg-white/5 border-white/10 text-white h-9 text-sm" />
                        </Field>
                        <Field label="Expected Ship Date">
                          <Input value={formData.preOrderDate ?? ""} onChange={e => set({ preOrderDate: e.target.value })}
                            placeholder="e.g. August 2025" className="bg-white/5 border-white/10 text-white h-9 text-sm" />
                        </Field>
                      </div>
                      <Field label="Pre-Order Note">
                        <Input value={formData.preOrderNote ?? ""} onChange={e => set({ preOrderNote: e.target.value })}
                          placeholder="Ships when available. No charge until shipped." className="bg-white/5 border-white/10 text-white h-9 text-sm" />
                      </Field>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>

            {/* Scheduling — collapsible */}
            <Section title="Scheduling" icon={Layers} accent="rgba(139,92,246,0.18)" collapsible>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Publish At (optional)" hint="Auto-publish at this date">
                  <Input type="datetime-local"
                    value={formData.publishAt ? formData.publishAt.slice(0, 16) : ""}
                    onChange={e => set({ publishAt: e.target.value || null })}
                    className="bg-white/5 border-white/10 text-white h-9 text-xs" />
                </Field>
                <Field label="Unpublish At (optional)" hint="Auto-hide at this date">
                  <Input type="datetime-local"
                    value={formData.unpublishAt ? formData.unpublishAt.slice(0, 16) : ""}
                    onChange={e => set({ unpublishAt: e.target.value || null })}
                    className="bg-white/5 border-white/10 text-white h-9 text-xs" />
                </Field>
              </div>
            </Section>

            <div className="h-4" />
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
