import { useState, useRef } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Upload, Image, CheckCircle, XCircle } from "lucide-react";
import { Product, ProductInput } from "@workspace/api-client-react/generated/api.schemas";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: formData, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

export default function AdminProducts() {
  const { data: products, isLoading } = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const { data: categories } = useListCategories({ query: { queryKey: ["categories"] } });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inStock, setInStock] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductInput>({
    name: "", price: 0, stock: 100, imageUrl: "", description: "", sizes: "S, M, L, XL", featured: false, categoryId: undefined,
  });

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    const isInStock = product.stock > 0;
    setInStock(isInStock);
    setPreviewUrl(product.imageUrl || "");
    setFormData({
      name: product.name,
      price: product.price,
      stock: isInStock ? 100 : 0,
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      sizes: product.sizes || "",
      featured: product.featured,
      categoryId: product.categoryId || undefined,
    });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setInStock(true);
    setPreviewUrl("");
    setFormData({
      name: "", price: 0, stock: 100, imageUrl: "", description: "", sizes: "S, M, L, XL", featured: false, categoryId: categories?.[0]?.id,
    });
    setIsDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      setPreviewUrl(url);
    } catch {
      alert("Image upload failed. Try again.");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, stock: inStock ? 100 : 0 };
    if (editingId) {
      updateProduct.mutate({ id: editingId, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); setIsDialogOpen(false); }
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); setIsDialogOpen(false); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to drop this item?")) {
      deleteProduct.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }) });
    }
  };

  if (isLoading) return <div>Loading inventory...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Inventory</h1>
          <p className="text-muted-foreground font-mono text-sm">Manage products and stock</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="font-bold uppercase tracking-wider fire-gradient border-none">
              <Plus className="mr-2 h-4 w-4" /> Drop New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border border-border">
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
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">Select Category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (AED)</label>
                  <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} required className="bg-background font-mono" />
                </div>

                {/* In Stock / Sold Out Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Availability</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInStock(true)}
                      className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-md border-2 text-xs font-black uppercase tracking-wider transition-all ${inStock ? "border-green-500 bg-green-500/10 text-green-400" : "border-border text-muted-foreground hover:border-green-500/50"}`}
                    >
                      <CheckCircle className="h-4 w-4" /> In Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setInStock(false)}
                      className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-md border-2 text-xs font-black uppercase tracking-wider transition-all ${!inStock ? "border-red-500 bg-red-500/10 text-red-400" : "border-border text-muted-foreground hover:border-red-500/50"}`}
                    >
                      <XCircle className="h-4 w-4" /> Sold Out
                    </button>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Image</label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-4 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-md border border-border shrink-0" />
                    ) : (
                      <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center shrink-0">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        {uploading ? "Uploading..." : previewUrl ? "Change Photo" : "Choose from Photos"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — max 10MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sizes (comma separated)</label>
                  <Input value={formData.sizes || ""} onChange={e => setFormData({ ...formData, sizes: e.target.value })} className="bg-background font-mono" placeholder="S, M, L, XL" />
                </div>
                <div className="flex items-center space-x-2 col-span-2 mt-2">
                  <input type="checkbox" id="featured" checked={formData.featured} onChange={e => setFormData({ ...formData, featured: e.target.checked })} className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4" />
                  <label htmlFor="featured" className="text-sm font-bold uppercase tracking-wider">Featured Product</label>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={uploading} className="font-bold uppercase tracking-wider bg-primary hover:bg-primary/90">
                  {editingId ? "Save Changes" : "Create Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map(product => (
          <div key={product.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col group">
            <div className="aspect-[4/3] bg-muted relative border-b border-border">
              {product.imageUrl ? (
                <img src={product.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs text-muted-foreground">No Image</div>
              )}
              {product.featured && <div className="absolute top-2 left-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest px-2 py-1">Featured</div>}
              {/* Stock badge */}
              <div className={`absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest px-2 py-1 ${product.stock > 0 ? "bg-green-500/90 text-black" : "bg-red-500/90 text-white"}`}>
                {product.stock > 0 ? "In Stock" : "Sold Out"}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-widest">{product.categoryName}</p>
                  <h3 className="font-bold leading-tight line-clamp-1">{product.name}</h3>
                </div>
                <p className="font-mono font-bold text-primary shrink-0 ml-2">AED {product.price.toFixed(2)}</p>
              </div>
              <div className="mt-auto pt-4 flex justify-end items-center border-t border-border/50">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="h-8 w-8 hover:text-primary">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-8 w-8 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
