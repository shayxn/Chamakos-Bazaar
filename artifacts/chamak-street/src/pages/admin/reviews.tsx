import { useState } from "react";
import { useListReviews, useCreateReview, useUpdateReview, useDeleteReview } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit, Star, BadgeCheck, Pin, Eye, EyeOff, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: number; customerName: string; customerAvatar?: string | null;
  rating: number; body: string; imageUrls?: string | null;
  isVerified: boolean; isPinned: boolean; isVisible: boolean; displayOrder: number; createdAt: string;
};

const REVIEW_QUERY_KEY = "listReviews";

function ReviewForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<Review>;
  onSave: (data: Partial<Review>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<Partial<Review>>({
    customerName: "", rating: 5, body: "", customerAvatar: "",
    isVerified: false, isPinned: false, isVisible: true, displayOrder: 0, ...initial,
  });
  const set = (key: keyof Review, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-xs">Customer Name *</label>
          <Input value={form.customerName ?? ""} onChange={(e) => set("customerName", e.target.value)} placeholder="Ahmed K." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Avatar URL</label>
          <Input value={form.customerAvatar ?? ""} onChange={(e) => set("customerAvatar", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Rating (1-5)</label>
          <div className="flex gap-1 mt-1">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button" onClick={() => set("rating", s)} className={`p-1 ${s <= (form.rating ?? 5) ? "text-primary" : "text-muted-foreground/30"}`}>
                <Star className="h-5 w-5 fill-current" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label-xs">Display Order</label>
          <Input type="number" value={form.displayOrder ?? 0} onChange={(e) => set("displayOrder", Number(e.target.value))} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-xs">Review Text *</label>
          <Textarea value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} placeholder="Amazing quality, very fast delivery..." className="mt-1 min-h-[80px]" />
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        {[
          { key: "isVerified" as const, label: "Verified", icon: BadgeCheck },
          { key: "isPinned" as const, label: "Pinned", icon: Pin },
          { key: "isVisible" as const, label: "Visible", icon: Eye },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => set(key, !form[key])}
            className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors ${form[key] ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={isPending || !form.customerName || !form.body} className="fire-gradient border-none font-black">
          {isPending ? "Saving..." : <><Check className="h-4 w-4 mr-1" /> Save Review</>}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const { data: reviews, isLoading } = useListReviews({ query: { staleTime: 0, queryKey: ["admin", "reviews"] } });
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("Review") });

  const handleCreate = (data: Partial<Review>) => {
    createReview.mutate(
      { data: data as Parameters<typeof createReview.mutate>[0]["data"] },
      { onSuccess: () => { toast({ title: "Review created" }); invalidate(); setShowCreate(false); },
        onError: () => toast({ title: "Error", variant: "destructive" }) }
    );
  };

  const handleUpdate = (id: number, data: Partial<Review>) => {
    updateReview.mutate(
      { id, data: data as Parameters<typeof updateReview.mutate>[0]["data"] },
      { onSuccess: () => { toast({ title: "Review updated" }); invalidate(); setEditingId(null); },
        onError: () => toast({ title: "Error", variant: "destructive" }) }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this review?")) return;
    deleteReview.mutate({ id }, { onSuccess: () => { toast({ title: "Review deleted" }); invalidate(); } });
  };

  const toggle = (review: Review, key: "isVisible" | "isPinned") => {
    updateReview.mutate(
      { id: review.id, data: { [key]: !review[key] } as Parameters<typeof updateReview.mutate>[0]["data"] },
      { onSuccess: () => invalidate() }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Customer Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">Add and manage customer reviews shown on the homepage.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="fire-gradient border-none font-black uppercase">
          <Plus className="h-4 w-4 mr-2" /> Add Review
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-card border border-border/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px fire-gradient" />
            <h2 className="font-black uppercase mb-5 text-primary">New Review</h2>
            <ReviewForm onSave={handleCreate} onCancel={() => setShowCreate(false)} isPending={createReview.isPending} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading reviews...</div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground mb-4">No reviews yet.</p>
          <Button onClick={() => setShowCreate(true)} className="fire-gradient border-none font-black"><Plus className="h-4 w-4 mr-2" /> Add First Review</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews as Review[]).map((review) => (
            <motion.div key={review.id} layout className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-primary shrink-0 overflow-hidden">
                  {review.customerAvatar ? (
                    <img src={review.customerAvatar} alt={review.customerName} className="w-full h-full object-cover" />
                  ) : review.customerName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm">{review.customerName}</span>
                    {review.isVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    {review.isPinned && <Pin className="h-3.5 w-3.5 text-yellow-400" />}
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "text-primary fill-primary" : "text-muted-foreground/20"}`} />)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggle(review, "isPinned")} className={review.isPinned ? "text-yellow-400" : "text-muted-foreground"} title="Pin">
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggle(review, "isVisible")} className={review.isVisible ? "text-primary" : "text-muted-foreground"} title={review.isVisible ? "Hide" : "Show"}>
                    {review.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingId(editingId === review.id ? null : review.id)} className="hover:text-primary">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(review.id)} className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {editingId === review.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-border/40 p-6">
                    <ReviewForm
                      initial={review}
                      onSave={(data) => handleUpdate(review.id, data)}
                      onCancel={() => setEditingId(null)}
                      isPending={updateReview.isPending}
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
