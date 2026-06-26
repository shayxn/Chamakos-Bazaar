import { useState, useRef } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Upload, Image, CheckCircle, XCircle, X, Calendar, Package, ChevronDown, EyeOff, Eye } from "lucide-react";
import type { Product, ProductInput } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { getPrimaryProductMedia, parseProductMedia, serializeProductMedia, type ProductMedia } from "@/lib/product-media";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type CloudinarySignature = {
  apiKey: string; folder: string; signature: string; timestamp: string; uploadUrl: string;
};

async function uploadMedia(file: File): Promise<ProductMedia> {
  const signatureRes = await fetch(`${BASE}/api/uploads/sign`, { method: "POST", credentials: "include" });
  if (signatureRes.ok) {
    const signature = await signatureRes.json() as CloudinarySignature;
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("api_key", signature.apiKey);
    cloudinaryForm.append("timestamp", signature.timestamp);
    cloudinaryForm.append("folder", signature.folder);
    cloudinaryForm.append("signature", signature.signature);
    const uploadRes = await fetch(signature.uploadUrl, { method: "POST", body: cloudinaryForm });
    if (!uploadRes.ok) throw new Error("Cloudinary upload failed");
    const data = await uploadRes.json() as { secure_url?: string; resource_type?: string };
    if (!data.secure_url) throw new Error("Cloudinary upload response missing URL");
    return { url: data.secure_url, type: data.resource_type === "video" || file.type.startsWith("video/") ? "video" : "image" };
  }
  if (signatureRes.status !== 404) throw new Error("Upload signing failed");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/api/uploads`, { method: "POST", body: formData, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json() as { url: string; type?: "image" | "video" };
  return { url: data.url, type: data.type === "video" ? "video" : "image" };
}

type ProductFormData = ProductInput & {
  isPreOrder?: boolean;
  preOrderLabel?: string | null;
  preOrderDate?: string | null;
  preOrderNote?: string | null;
  sellingFast?: boolean;
  spotlight?: boolean;
  hidden?: boolean;
  publishAt?: string | null;
  unpublishAt?: string | null;
};

const BULK_ACTIONS = [
  { value: "hide", label: "Hide Selected" },
  { value: "show", label: "Show Selected" },
  { value: "feature", label: "Mark as Featured" },
  { value: "unfeature", label: "Remove from Featured" },
  { value: "preorder", label: "Enable Pre-Order" },
  { value: "unpreorder", label: "Disable Pre-Order" },
  { value: "delete", label: "Delete Selected" },
];

export default function AdminProducts() {
  const { data: products, isLoading } = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const { data: categories } = useListCategories({ query: { queryKey: ["categories"] } });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inStock, setInStock] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<ProductMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "", price: 0, stock: 100, imageUrl: "", description: "", sizes: "S, M, L, XL",
    featured: false, rep: false, categoryId: undefined,
    isPreOrder: false, preOrderLabel: "", preOrderDate: "", preOrderNote: "",
    sellingFast: false, spotlight: false, hidden: false, publishAt: null, unpublishAt: null,
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === products?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products?.map(p => p.id) ?? []));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === "delete" && !confirm(`Delete ${selectedIds.size} products? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${BASE}/api/products/bulk-action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: bulkAction }),
      });
      if (res.ok) {
        const data = await res.json() as { affected: number };
        toast({ title: `Done — ${data.affected} products updated` });
        setSelectedIds(new Set());
        setBulkAction("");
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      } else {
        toast({ title: "Bulk action failed", variant: "destructive" });
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    const isInStock = product.stock > 0;
    setInStock(isInStock);
    setMediaItems(parseProductMedia(product.imageUrl));
    setFormData({
      name: product.name,
      price: product.price,
      stock: isInStock ? 100 : 0,
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      sizes: product.sizes || "",
      featured: product.featured,
      rep: product.rep,
      categoryId: product.categoryId || undefined,
      isPreOrder: (product as ProductFormData).isPreOrder ?? false,
      preOrderLabel: (product as ProductFormData).preOrderLabel ?? "",
      preOrderDate: (product as ProductFormData).preOrderDate ?? "",
      preOrderNote: (product as ProductFormData).preOrderNote ?? "",
      sellingFast: (product as ProductFormData).sellingFast ?? false,
      spotlight: (product as ProductFormData).spotlight ?? false,
      hidden: (product as ProductFormData).hidden ?? false,
      publishAt: (product as ProductFormData).publishAt ?? null,
      unpublishAt: (product as ProductFormData).unpublishAt ?? null,
    });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setInStock(true);
    setMediaItems([]);
    setFormData({
      name: "", price: 0, stock: 100, imageUrl: "", description: "", sizes: "S, M, L, XL",
      featured: false, rep: false, categoryId: categories?.[0]?.id,
      isPreOrder: false, preOrderLabel: "", preOrderDate: "", preOrderNote: "",
      sellingFast: false, spotlight: false, hidden: false, publishAt: null, unpublishAt: null,
    });
    setIsDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ProductMedia[] = [];
      for (const file of files) { uploaded.push(await uploadMedia(file)); }
      setMediaItems((prev) => {
        const next = [...prev, ...uploaded];
        setFormData((current: ProductFormData) => ({ ...current, imageUrl: serializeProductMedia(next) }));
        return next;
      });
    } catch {
      alert("Media upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setFormData((current: ProductFormData) => ({ ...current, imageUrl: next.length > 0 ? serializeProductMedia(next) : "" }));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      imageUrl: mediaItems.length > 0 ? serializeProductMedia(mediaItems) : "",
      stock: inStock ? 100 : 0,
    };
    if (editingId) {
      updateProduct.mutate({ id: editingId, data: data as ProductInput }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); setIsDialogOpen(false); }
      });
    } else {
      createProduct.mutate({ data: data as ProductInput }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); setIsDialogOpen(false); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to drop this item?")) {
      deleteProduct.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }) });
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading inventory...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage products, stock, and pre-order items.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="font-bold uppercase tracking-wider fire-gradient border-none">
              <Plus className="mr-2 h-4 w-4" /> Drop New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-wider text-xl">
                {editingId ? "Edit Item" : "New Drop"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                  <select
                    value={formData.categoryId || ""}
                    onChange={e => setFormData({ ...formData, categoryId: parseInt(e.target.value) || undefined })}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (AED)</label>
                  <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} required className="bg-background font-mono" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Availability</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setInStock(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-md border-2 text-xs font-black uppercase tracking-wider transition-all ${inStock ? "border-green-500 bg-green-500/10 text-green-400" : "border-border text-muted-foreground"}`}>
                      <CheckCircle className="h-4 w-4" /> In Stock
                    </button>
                    <button type="button" onClick={() => setInStock(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-md border-2 text-xs font-black uppercase tracking-wider transition-all ${!inStock ? "border-red-500 bg-red-500/10 text-red-400" : "border-border text-muted-foreground"}`}>
                      <XCircle className="h-4 w-4" /> Sold Out
                    </button>
                  </div>
                </div>

                {/* Media Upload */}
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Media (up to 8)</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {mediaItems.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {mediaItems.map((item, index) => (
                          <div key={`${item.url}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted">
                            {item.type === "video" ? (
                              <>
                                <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-center text-[9px] font-black uppercase text-white">Video</span>
                              </>
                            ) : (
                              <img src={item.url} alt="Preview" className="h-full w-full object-cover" />
                            )}
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeMedia(index); }}
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white hover:bg-destructive">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                        {mediaItems.length < 8 && (
                          <div className="h-16 w-16 rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                            <Plus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center shrink-0">
                          <Image className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2">
                            <Upload className="h-4 w-4 text-primary" />
                            {uploading ? "Uploading..." : "Choose photos or videos"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, MP4, MOV — max 100MB each · up to 8 files</p>
                        </div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
                  </div>
                  {uploading && (
                    <p className="text-xs text-primary font-bold animate-pulse">Uploading media...</p>
                  )}
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <Textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-background min-h-[70px]" placeholder="Product description..." />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sizes (comma separated)</label>
                  <Input value={formData.sizes || ""} onChange={e => setFormData({ ...formData, sizes: e.target.value })} className="bg-background font-mono" placeholder="S, M, L, XL" />
                </div>

                {/* Pre-Order Section */}
                <div className="col-span-2 border border-border/50 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-yellow-400" />
                      Pre-Order Mode
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPreOrder: !formData.isPreOrder })}
                      className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${formData.isPreOrder ? "bg-yellow-500" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.isPreOrder ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {formData.isPreOrder && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Pre-Order Badge Label</label>
                        <Input value={formData.preOrderLabel ?? ""} onChange={e => setFormData({ ...formData, preOrderLabel: e.target.value })} placeholder="Pre-Order" className="bg-background h-9" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Expected Ship Date</label>
                        <Input value={formData.preOrderDate ?? ""} onChange={e => setFormData({ ...formData, preOrderDate: e.target.value })} placeholder="e.g. August 2025" className="bg-background h-9" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Pre-Order Note</label>
                        <Input value={formData.preOrderNote ?? ""} onChange={e => setFormData({ ...formData, preOrderNote: e.target.value })} placeholder="Ships when available. No charge until shipped." className="bg-background h-9" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Scheduled Publishing */}
                <div className="col-span-2 border border-border/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      Visibility & Scheduling
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={formData.hidden ?? false} onChange={e => setFormData({ ...formData, hidden: e.target.checked })}
                      className="rounded border-border bg-background h-4 w-4" />
                    Hidden (not visible to customers)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Publish At (optional)</label>
                      <Input type="datetime-local" value={formData.publishAt ? formData.publishAt.slice(0, 16) : ""}
                        onChange={e => setFormData({ ...formData, publishAt: e.target.value || null })}
                        className="bg-background h-9 text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-1">Auto-publish at this date/time</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Unpublish At (optional)</label>
                      <Input type="datetime-local" value={formData.unpublishAt ? formData.unpublishAt.slice(0, 16) : ""}
                        onChange={e => setFormData({ ...formData, unpublishAt: e.target.value || null })}
                        className="bg-background h-9 text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-1">Auto-hide at this date/time</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-2">
                  <label htmlFor="featured" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider cursor-pointer">
                    <input type="checkbox" id="featured" checked={formData.featured} onChange={e => setFormData({ ...formData, featured: e.target.checked })} className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4" />
                    Featured Product
                  </label>
                  <label htmlFor="sellingFast" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider cursor-pointer">
                    <input type="checkbox" id="sellingFast" checked={formData.sellingFast ?? false} onChange={e => setFormData({ ...formData, sellingFast: e.target.checked })} className="rounded border-border bg-background text-orange-500 focus:ring-orange-500 h-4 w-4" />
                    🔥 Selling Fast
                  </label>
                  <label htmlFor="spotlight" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider cursor-pointer col-span-1 sm:col-span-2">
                    <input type="checkbox" id="spotlight" checked={formData.spotlight ?? false} onChange={e => setFormData({ ...formData, spotlight: e.target.checked })} className="rounded border-border bg-background text-yellow-500 focus:ring-yellow-500 h-4 w-4" />
                    ⭐ Homepage Spotlight (only 1 product at a time)
                  </label>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Type</label>
                    <div className="grid grid-cols-2 border border-border rounded-sm overflow-hidden">
                      <button type="button" onClick={() => setFormData({ ...formData, rep: false })}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${!formData.rep ? "bg-green-500 text-black" : "bg-background text-muted-foreground"}`}>
                        Original
                      </button>
                      <button type="button" onClick={() => setFormData({ ...formData, rep: true })}
                        className={`px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${formData.rep ? "bg-[#111827] text-white" : "bg-background text-muted-foreground"}`}>
                        REP
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading || createProduct.isPending || updateProduct.isPending} className="font-bold uppercase tracking-wider fire-gradient border-none">
                  {editingId ? "Save Changes" : "Create Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
          <input type="checkbox" className="h-4 w-4"
            checked={selectedIds.size > 0 && selectedIds.size === products?.length}
            onChange={toggleAll} />
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}
        </label>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
              className="h-8 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none">
              <option value="">Bulk action...</option>
              {BULK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <Button size="sm" onClick={executeBulkAction} disabled={!bulkAction || bulkLoading}
              className={`text-xs font-black uppercase tracking-wider h-8 ${bulkAction === "delete" ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-primary text-primary-foreground"}`}>
              {bulkLoading ? "Working..." : "Apply"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs h-8 text-muted-foreground">
              Clear
            </Button>
          </div>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{products?.length ?? 0} items total</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products?.map(product => {
          const primaryMedia = getPrimaryProductMedia(product.imageUrl);
          const mediaCount = parseProductMedia(product.imageUrl).length;
          const isPreOrder = (product as ProductFormData).isPreOrder;
          const isHidden = (product as ProductFormData).hidden;
          const isSelected = selectedIds.has(product.id);
          return (
            <div key={product.id}
              onClick={() => toggleSelect(product.id)}
              className={`bg-card border rounded-xl overflow-hidden flex flex-col group hover:border-primary/30 transition-all cursor-pointer ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
              <div className="aspect-[4/3] bg-muted relative border-b border-border">
                {primaryMedia ? (
                  primaryMedia.type === "video" ? (
                    <video src={primaryMedia.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={primaryMedia.url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                {isHidden && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-black/80 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
                      <EyeOff className="h-3.5 w-3.5" /> Hidden
                    </div>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10">
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.featured && <div className="bg-primary text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">Featured</div>}
                  {isPreOrder && <div className="bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">Pre-Order</div>}
                  {(product as ProductFormData).sellingFast && <div className="bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">🔥 Selling Fast</div>}
                  {(product as ProductFormData).spotlight && <div className="bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">⭐ Spotlight</div>}
                  {product.rep ? (
                    <div className="bg-[#111827] text-white border border-white/20 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">REP</div>
                  ) : (
                    <div className="bg-green-500/90 text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">Original</div>
                  )}
                </div>
                {mediaCount > 1 && <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">{mediaCount} imgs</div>}
                {!isSelected && !isHidden && <div className={`absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${product.stock > 0 ? "bg-green-500/90 text-black" : "bg-red-500/90 text-white"}`}>
                  {product.stock > 0 ? "In Stock" : "Sold Out"}
                </div>}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-widest">{product.categoryName}</p>
                    <h3 className="font-bold leading-tight">{product.name}</h3>
                  </div>
                  <p className="font-mono font-bold text-primary shrink-0 ml-2">AED {product.price.toFixed(2)}</p>
                </div>
                <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-border/50">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(product); }} className="h-8 w-8 hover:text-primary">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="h-8 w-8 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
