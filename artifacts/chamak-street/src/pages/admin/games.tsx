import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Gamepad2, Video, Music, Eye, EyeOff, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Game = {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  videoUrl: string | null;
  musicUrl: string | null;
  trailerUrl: string | null;
  platform: string | null;
  genre: string | null;
  isPreOrder: boolean;
  preOrderDate: string | null;
  preOrderPrice: number | null;
  preOrderNote: string | null;
  preOrderButtonText: string | null;
  isActive: boolean;
  animationEnabled: boolean;
  displayOrder: number;
};

type GameForm = Omit<Game, "id">;

const defaultForm: GameForm = {
  name: "",
  description: "",
  coverImage: "",
  videoUrl: "",
  musicUrl: "",
  trailerUrl: "",
  platform: "PS5 / Xbox Series X / PC",
  genre: "Action",
  isPreOrder: true,
  preOrderDate: "",
  preOrderPrice: null,
  preOrderNote: "",
  preOrderButtonText: "Pre-Order Now",
  isActive: true,
  animationEnabled: true,
  displayOrder: 0,
};

async function apiRequest(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function AdminGames() {
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GameForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchGames = async () => {
    try {
      const data = await apiRequest("/games/all") as Game[];
      setGames(data);
    } catch {
      toast({ title: "Failed to load games", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGames(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (game: Game) => {
    setEditingId(game.id);
    setForm({
      name: game.name,
      description: game.description ?? "",
      coverImage: game.coverImage ?? "",
      videoUrl: game.videoUrl ?? "",
      musicUrl: game.musicUrl ?? "",
      trailerUrl: game.trailerUrl ?? "",
      platform: game.platform ?? "",
      genre: game.genre ?? "",
      isPreOrder: game.isPreOrder,
      preOrderDate: game.preOrderDate ?? "",
      preOrderPrice: game.preOrderPrice,
      preOrderNote: game.preOrderNote ?? "",
      preOrderButtonText: game.preOrderButtonText ?? "Pre-Order Now",
      isActive: game.isActive,
      animationEnabled: game.animationEnabled,
      displayOrder: game.displayOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Game name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        coverImage: form.coverImage || null,
        videoUrl: form.videoUrl || null,
        musicUrl: form.musicUrl || null,
        trailerUrl: form.trailerUrl || null,
        platform: form.platform || null,
        genre: form.genre || null,
        preOrderDate: form.preOrderDate || null,
        preOrderNote: form.preOrderNote || null,
        preOrderButtonText: form.preOrderButtonText || null,
      };
      if (editingId) {
        await apiRequest(`/games/${editingId}`, "PATCH", payload);
        toast({ title: "Game updated successfully" });
      } else {
        await apiRequest("/games", "POST", payload);
        toast({ title: "Game created successfully" });
      }
      setDialogOpen(false);
      fetchGames();
    } catch {
      toast({ title: "Failed to save game", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/games/${id}`, "DELETE");
      toast({ title: "Game deleted" });
      fetchGames();
    } catch {
      toast({ title: "Failed to delete game", variant: "destructive" });
    }
  };

  const toggleField = async (id: number, field: "isActive" | "animationEnabled", current: boolean) => {
    try {
      await apiRequest(`/games/${id}`, "PATCH", { [field]: !current });
      fetchGames();
    } catch {
      toast({ title: "Failed to update game", variant: "destructive" });
    }
  };

  const setF = (key: keyof GameForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Games</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage game listings, pre-orders, and animations.</p>
        </div>
        <Button onClick={openNew} className="fire-gradient border-none font-bold uppercase tracking-wider gap-2">
          <Plus className="h-4 w-4" /> Add Game
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm flex items-start gap-3">
        <Video className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p>
          The <strong>Grand Theft Auto VI</strong> game uses the built-in video animation and music assets.
          For new games, paste a video URL or music URL in the fields below. The animation plays when a customer
          first opens a game page — you can turn it off per-game.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
          <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-black uppercase tracking-wider text-muted-foreground text-sm">No games yet</p>
          <Button onClick={openNew} variant="outline" className="mt-4 font-bold uppercase tracking-wider gap-2">
            <Plus className="h-4 w-4" /> Add First Game
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game) => (
            <motion.div
              key={game.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-xl overflow-hidden flex flex-col group hover:border-primary/30 transition-colors"
            >
              <div className="relative aspect-video bg-muted overflow-hidden">
                {game.coverImage ? (
                  <img src={game.coverImage} alt={game.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                    <Gamepad2 className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {game.isPreOrder && (
                    <span className="bg-primary text-black text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">Pre-Order</span>
                  )}
                  {!game.isActive && (
                    <span className="bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">Hidden</span>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {game.animationEnabled && (
                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <Play className="h-2.5 w-2.5" />Anim
                    </span>
                  )}
                  {game.musicUrl && (
                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <Music className="h-2.5 w-2.5" />Music
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{game.platform}</p>
                  <h3 className="font-black text-sm leading-tight">{game.name}</h3>
                  {game.preOrderPrice != null && (
                    <p className="font-mono font-bold text-primary text-sm mt-1">AED {game.preOrderPrice.toFixed(2)}</p>
                  )}
                  {game.preOrderDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">{game.preOrderDate}</p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleField(game.id, "isActive", game.isActive)}
                      className={`p-1.5 rounded-md text-xs transition-colors ${game.isActive ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted"}`}
                      title={game.isActive ? "Hide game" : "Show game"}
                    >
                      {game.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleField(game.id, "animationEnabled", game.animationEnabled)}
                      className={`p-1.5 rounded-md text-xs transition-colors ${game.animationEnabled ? "text-blue-400 hover:bg-blue-500/10" : "text-muted-foreground hover:bg-muted"}`}
                      title={game.animationEnabled ? "Disable animation" : "Enable animation"}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(game)} className="h-7 w-7 hover:text-primary">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id, game.name)} className="h-7 w-7 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-xl">
              {editingId ? "Edit Game" : "Add New Game"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="label-xs">Game Name</label>
                <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Grand Theft Auto VI" className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="label-xs">Platform</label>
                <Input value={form.platform ?? ""} onChange={e => setF("platform", e.target.value)} placeholder="PS5 / Xbox / PC" className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="label-xs">Genre</label>
                <Input value={form.genre ?? ""} onChange={e => setF("genre", e.target.value)} placeholder="Action, RPG..." className="bg-background" />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="label-xs">Description</label>
                <Textarea value={form.description ?? ""} onChange={e => setF("description", e.target.value)} placeholder="Game description..." className="bg-background min-h-[80px]" />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="label-xs">Cover Image URL</label>
                <Input value={form.coverImage ?? ""} onChange={e => setF("coverImage", e.target.value)} placeholder="https://..." className="bg-background font-mono text-xs" />
                {form.coverImage && (
                  <img src={form.coverImage} alt="Preview" className="h-24 w-auto rounded-lg object-cover border border-border/40" />
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <label className="label-xs flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-primary" /> Video URL (for animation page)
                </label>
                <Input value={form.videoUrl ?? ""} onChange={e => setF("videoUrl", e.target.value)} placeholder="Custom video URL (optional)" className="bg-background font-mono text-xs" />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="label-xs flex items-center gap-2">
                  <Music className="h-3.5 w-3.5 text-purple-400" /> Music URL (background music)
                </label>
                <Input value={form.musicUrl ?? ""} onChange={e => setF("musicUrl", e.target.value)} placeholder="Custom music URL (optional)" className="bg-background font-mono text-xs" />
              </div>

              {/* Toggles */}
              <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Pre-Order", key: "isPreOrder", desc: "Show as pre-order" },
                  { label: "Visible", key: "isActive", desc: "Show on website" },
                  { label: "Animation", key: "animationEnabled", desc: "Play video on open" },
                ].map(({ label, key, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setF(key as keyof GameForm, !form[key as keyof GameForm])}
                      className={`relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 ${form[key as keyof GameForm] ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key as keyof GameForm] ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pre-order fields */}
              <AnimatePresence>
                {form.isPreOrder && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="col-span-2 grid grid-cols-2 gap-3 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <label className="label-xs">Pre-Order Price (AED)</label>
                      <Input
                        type="number" step="0.01"
                        value={form.preOrderPrice ?? ""}
                        onChange={e => setF("preOrderPrice", e.target.value ? Number(e.target.value) : null)}
                        placeholder="299.00"
                        className="bg-background font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-xs">Release Date</label>
                      <Input value={form.preOrderDate ?? ""} onChange={e => setF("preOrderDate", e.target.value)} placeholder="e.g. 2025" className="bg-background" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="label-xs">Button Text</label>
                      <Input value={form.preOrderButtonText ?? ""} onChange={e => setF("preOrderButtonText", e.target.value)} placeholder="Pre-Order Now" className="bg-background" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="label-xs">Pre-Order Note</label>
                      <Input value={form.preOrderNote ?? ""} onChange={e => setF("preOrderNote", e.target.value)} placeholder="Limited availability. Order now to secure your copy." className="bg-background" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="label-xs">Display Order</label>
                <Input type="number" value={form.displayOrder} onChange={e => setF("displayOrder", Number(e.target.value))} className="bg-background font-mono" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="fire-gradient border-none font-bold uppercase tracking-wider">
                {saving ? "Saving…" : editingId ? "Save Changes" : "Create Game"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
