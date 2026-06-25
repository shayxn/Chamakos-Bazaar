import { useState } from "react";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Category = {
  id: number; name: string; slug: string;
  bannerImageUrl?: string | null; thumbnailImageUrl?: string | null;
  iconEmoji?: string | null; description?: string | null; bgImageUrl?: string | null;
  accentColor?: string | null; displayOrder: number; isVisible: boolean;
};

function CategoryForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<Category>;
  onSave: (data: Partial<Category>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<Partial<Category>>({
    name: "", iconEmoji: "", description: "", bannerImageUrl: "",
    thumbnailImageUrl: "", bgImageUrl: "", accentColor: "#ff6600",
    displayOrder: 0, isVisible: true, ...initial,
  });

  const set = (key: keyof Category, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-xs">Category Name *</label>
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Hoodies" className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Icon Emoji</label>
          <Input value={form.iconEmoji ?? ""} onChange={(e) => set("iconEmoji", e.target.value)} placeholder="🧥" className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-xs">Description</label>
          <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Banner Image URL</label>
          <Input value={form.bannerImageUrl ?? ""} onChange={(e) => set("bannerImageUrl", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Thumbnail Image URL</label>
          <Input value={form.thumbnailImageUrl ?? ""} onChange={(e) => set("thumbnailImageUrl", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Background Image URL</label>
          <Input value={form.bgImageUrl ?? ""} onChange={(e) => set("bgImageUrl", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Accent Color</label>
          <div className="flex gap-2 mt-1">
            <Input type="color" value={form.accentColor ?? "#ff6600"} onChange={(e) => set("accentColor", e.target.value)} className="w-14 h-9 p-1 cursor-pointer" />
            <Input value={form.accentColor ?? ""} onChange={(e) => set("accentColor", e.target.value)} placeholder="#ff6600" />
          </div>
        </div>
        <div>
          <label className="label-xs">Display Order</label>
          <Input type="number" value={form.displayOrder ?? 0} onChange={(e) => set("displayOrder", Number(e.target.value))} className="mt-1" />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="label-xs">Visible</label>
          <button
            type="button"
            onClick={() => set("isVisible", !form.isVisible)}
            className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${form.isVisible ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isVisible ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {form.bannerImageUrl && (
        <div className="rounded-lg overflow-hidden h-28 w-full relative border border-border/40">
          <img src={form.bannerImageUrl} alt="Banner preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 text-[10px] font-black uppercase tracking-wider bg-black/60 text-white px-2 py-1 rounded">Banner Preview</div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={isPending || !form.name} className="fire-gradient border-none font-black">
          {isPending ? "Saving..." : <><Check className="h-4 w-4 mr-1" /> Save Category</>}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const { data: categories, isLoading } = useListCategories({ query: { staleTime: 0, queryKey: ["admin", "categories"] } });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("category") || String(q.queryKey[0]).includes("categor") });

  const handleCreate = (data: Partial<Category>) => {
    createCategory.mutate(
      { data: { name: data.name!, ...data } as Parameters<typeof createCategory.mutate>[0]["data"] },
      {
        onSuccess: () => { toast({ title: "Category created" }); invalidate(); setShowCreate(false); },
        onError: () => toast({ title: "Error creating category", variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (id: number, data: Partial<Category>) => {
    updateCategory.mutate(
      { id, data: data as Parameters<typeof updateCategory.mutate>[0]["data"] },
      {
        onSuccess: () => { toast({ title: "Category updated" }); invalidate(); setEditingId(null); },
        onError: () => toast({ title: "Error updating category", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Products in this category won't be deleted.`)) return;
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Category deleted" }); invalidate(); },
        onError: () => toast({ title: "Error deleting category", variant: "destructive" }),
      }
    );
  };

  const toggleVisible = (cat: Category) => {
    updateCategory.mutate(
      { id: cat.id, data: { isVisible: !cat.isVisible } as Parameters<typeof updateCategory.mutate>[0]["data"] },
      { onSuccess: () => invalidate() }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage product categories with custom banners, colors, and more.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="fire-gradient border-none font-black uppercase tracking-wider">
          <Plus className="h-4 w-4 mr-2" /> New Category
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border/60 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px fire-gradient" />
            <h2 className="font-black uppercase tracking-wider mb-5 text-primary">New Category</h2>
            <CategoryForm
              onSave={handleCreate}
              onCancel={() => setShowCreate(false)}
              isPending={createCategory.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading categories...</div>
      ) : !categories || categories.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground mb-4">No categories yet.</p>
          <Button onClick={() => setShowCreate(true)} className="fire-gradient border-none font-black">
            <Plus className="h-4 w-4 mr-2" /> Create First Category
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(categories as Category[]).map((cat) => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0" />

                {cat.thumbnailImageUrl ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border/40">
                    <img src={cat.thumbnailImageUrl} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0">
                    {cat.iconEmoji || "📂"}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black uppercase tracking-wide truncate">{cat.name}</h3>
                    {cat.accentColor && (
                      <div className="w-3 h-3 rounded-full border border-border/40 shrink-0" style={{ background: cat.accentColor }} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">/{cat.slug} · Order: {cat.displayOrder}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggleVisible(cat)} className={cat.isVisible ? "text-primary" : "text-muted-foreground"} title={cat.isVisible ? "Hide" : "Show"}>
                    {cat.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingId(editingId === cat.id ? null : cat.id)} className="hover:text-primary">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)} className="hover:text-primary">
                    {expandedId === cat.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id, cat.name)} className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {cat.bannerImageUrl && expandedId === cat.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 120, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/40"
                  >
                    <img src={cat.bannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
                  </motion.div>
                )}
                {editingId === cat.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-border/40 p-6"
                  >
                    <CategoryForm
                      initial={cat}
                      onSave={(data) => handleUpdate(cat.id, data)}
                      onCancel={() => setEditingId(null)}
                      isPending={updateCategory.isPending}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
