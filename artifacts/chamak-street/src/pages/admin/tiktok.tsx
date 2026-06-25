import { useState } from "react";
import { useListTiktokVideos, useCreateTiktokVideo, useUpdateTiktokVideo, useDeleteTiktokVideo } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, Eye, EyeOff, ExternalLink, X, Check, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TiktokVideo = {
  id: number; title?: string | null; embedUrl: string; thumbnailUrl?: string | null;
  displayOrder: number; isVisible: boolean; createdAt: string;
};

function VideoForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<TiktokVideo>;
  onSave: (data: Partial<TiktokVideo>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<Partial<TiktokVideo>>({
    embedUrl: "", title: "", thumbnailUrl: "", displayOrder: 0, isVisible: true, ...initial,
  });
  const set = (key: keyof TiktokVideo, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label-xs">TikTok URL / Embed URL *</label>
          <Input value={form.embedUrl ?? ""} onChange={(e) => set("embedUrl", e.target.value)} placeholder="https://www.tiktok.com/@username/video/..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">Paste the TikTok video URL or embed URL.</p>
        </div>
        <div>
          <label className="label-xs">Title (optional)</label>
          <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Our latest drop..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Thumbnail URL</label>
          <Input value={form.thumbnailUrl ?? ""} onChange={(e) => set("thumbnailUrl", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <label className="label-xs">Display Order</label>
          <Input type="number" value={form.displayOrder ?? 0} onChange={(e) => set("displayOrder", Number(e.target.value))} className="mt-1" />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="label-xs">Visible</label>
          <button type="button" onClick={() => set("isVisible", !form.isVisible)}
            className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${form.isVisible ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isVisible ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {form.thumbnailUrl && (
        <div className="w-32 rounded-xl overflow-hidden border border-border/40" style={{ aspectRatio: "9/16" }}>
          <img src={form.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={isPending || !form.embedUrl} className="fire-gradient border-none font-black">
          {isPending ? "Saving..." : <><Check className="h-4 w-4 mr-1" /> Save Video</>}
        </Button>
        <Button variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
      </div>
    </div>
  );
}

export default function AdminTiktok() {
  const { data: videos, isLoading } = useListTiktokVideos({ query: { staleTime: 0, queryKey: ["admin", "tiktok"] } });
  const createVideo = useCreateTiktokVideo();
  const updateVideo = useUpdateTiktokVideo();
  const deleteVideo = useDeleteTiktokVideo();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("Tiktok") });

  const handleCreate = (data: Partial<TiktokVideo>) => {
    createVideo.mutate(
      { data: data as Parameters<typeof createVideo.mutate>[0]["data"] },
      { onSuccess: () => { toast({ title: "Video added" }); invalidate(); setShowCreate(false); },
        onError: () => toast({ title: "Error", variant: "destructive" }) }
    );
  };

  const handleUpdate = (id: number, data: Partial<TiktokVideo>) => {
    updateVideo.mutate(
      { id, data: data as Parameters<typeof updateVideo.mutate>[0]["data"] },
      { onSuccess: () => { toast({ title: "Video updated" }); invalidate(); setEditingId(null); },
        onError: () => toast({ title: "Error", variant: "destructive" }) }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this video?")) return;
    deleteVideo.mutate({ id }, { onSuccess: () => { toast({ title: "Video deleted" }); invalidate(); } });
  };

  const toggleVisible = (v: TiktokVideo) => {
    updateVideo.mutate(
      { id: v.id, data: { isVisible: !v.isVisible } as Parameters<typeof updateVideo.mutate>[0]["data"] },
      { onSuccess: () => invalidate() }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">TikTok Videos</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage TikTok videos shown in the homepage carousel.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="fire-gradient border-none font-black uppercase">
          <Plus className="h-4 w-4 mr-2" /> Add Video
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-card border border-border/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px fire-gradient" />
            <h2 className="font-black uppercase mb-5 text-primary">Add TikTok Video</h2>
            <VideoForm onSave={handleCreate} onCancel={() => setShowCreate(false)} isPending={createVideo.isPending} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading videos...</div>
      ) : !videos || videos.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground mb-4">No TikTok videos added yet.</p>
          <Button onClick={() => setShowCreate(true)} className="fire-gradient border-none font-black"><Plus className="h-4 w-4 mr-2" /> Add First Video</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(videos as TiktokVideo[]).map((video) => (
            <motion.div key={video.id} layout className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="relative" style={{ aspectRatio: "9/16", maxHeight: "200px" }}>
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title ?? "Video"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => toggleVisible(video)} className={`p-1.5 rounded-lg backdrop-blur-sm ${video.isVisible ? "bg-primary/80 text-white" : "bg-black/50 text-white/50"}`}>
                    {video.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {video.title && <p className="font-bold text-sm truncate">{video.title}</p>}
                <p className="text-xs text-muted-foreground truncate">Order: {video.displayOrder}</p>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingId(editingId === video.id ? null : video.id)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => window.open(video.embedUrl, "_blank")} className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)} className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {editingId === video.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-border/40 p-4">
                    <VideoForm
                      initial={video}
                      onSave={(data) => handleUpdate(video.id, data)}
                      onCancel={() => setEditingId(null)}
                      isPending={updateVideo.isPending}
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
