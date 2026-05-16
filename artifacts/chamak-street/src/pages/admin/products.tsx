import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Product, ProductInput } from "@workspace/api-client-react/generated/api.schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminProducts() {
  const { data: products, isLoading } = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const { data: categories } = useListCategories({ query: { queryKey: ["categories"] } });
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    price: 0,
    stock: 0,
    imageUrl: "",
    description: "",
    sizes: "",
    featured: false,
    categoryId: undefined
  });

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      sizes: product.sizes || "",
      featured: product.featured,
      categoryId: product.categoryId || undefined
    });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      name: "", price: 0, stock: 10, imageUrl: "", description: "", sizes: "S, M, L, XL", featured: false, categoryId: categories?.[0]?.id
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProduct.mutate(
        { id: editingId, data: formData },
        { 
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            setIsDialogOpen(false);
          }
        }
      );
    } else {
      createProduct.mutate(
        { data: formData },
        { 
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            setIsDialogOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to drop this item?")) {
      deleteProduct.mutate(
        { id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }) }
      );
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
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                  <select 
                    value={formData.categoryId || ""} 
                    onChange={e => setFormData({...formData, categoryId: parseInt(e.target.value) || undefined})}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">Select Category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price ($)</label>
                  <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required className="bg-background font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock</label>
                  <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} required className="bg-background font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Image URL</label>
                  <Input value={formData.imageUrl || ""} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="bg-background font-mono text-xs" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sizes (comma separated)</label>
                  <Input value={formData.sizes || ""} onChange={e => setFormData({...formData, sizes: e.target.value})} className="bg-background font-mono" placeholder="S, M, L, XL" />
                </div>
                <div className="flex items-center space-x-2 col-span-2 mt-2">
                  <input type="checkbox" id="featured" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4" />
                  <label htmlFor="featured" className="text-sm font-bold uppercase tracking-wider">Featured Product</label>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" className="font-bold uppercase tracking-wider bg-primary hover:bg-primary/90">
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
                <img src={product.imageUrl} className="w-full h-full object-cover mix-blend-lighten" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs text-muted-foreground">No Img</div>
              )}
              {product.featured && <div className="absolute top-2 left-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest px-2 py-1">Featured</div>}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-widest">{product.categoryName}</p>
                  <h3 className="font-bold leading-tight line-clamp-1">{product.name}</h3>
                </div>
                <p className="font-mono font-bold text-primary">${product.price.toFixed(2)}</p>
              </div>
              <div className="mt-auto pt-4 flex justify-between items-center border-t border-border/50">
                <div className={`font-mono text-xs font-bold px-2 py-1 rounded ${product.stock > 10 ? 'bg-secondary text-foreground' : product.stock > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-destructive/20 text-destructive'}`}>
                  Stock: {product.stock}
                </div>
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
