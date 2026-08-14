import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown,
  Image, Sliders, Save, X, Upload, Loader2, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AdminRenderedWidget } from "@/components/widget-zone";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type WidgetType = "image" | "custom";
type Placement = "home" | "shop" | "account" | "order";
type Targeting = "everyone" | "signed_in" | "guests";
type GlassAmount = "none" | "light" | "medium" | "heavy";
type Layout = "stack" | "row" | "centered";
type Size = "sm" | "md" | "lg" | "full";
type Animation = "fade" | "slide" | "scale" | "none";

interface Widget {
  id: number;
  type: WidgetType;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  icon: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  placement: Placement;
  displayOrder: number;
  isPublished: boolean;
  targeting: Targeting;
  background: string | null;
  accent: string | null;
  glassAmount: GlassAmount | null;
  layout: Layout | null;
  size: Size | null;
  borderRadius: number | null;
  animation: Animation | null;
  config: Record<string, unknown> | null;
}

const DEFAULT_FORM: Omit<Widget, "id" | "displayOrder" | "config"> = {
  type: "custom",
  title: "",
  subtitle: "",
  imageUrl: null,
  icon: "🔥",
  buttonLabel: "",
  buttonUrl: "",
  placement: "home",
  isPublished: false,
  targeting: "everyone",
  background: "#111111",
  accent: "#f97316",
  glassAmount: "medium",
  layout: "stack",
  size: "md",
  borderRadius: 16,
  animation: "fade",
};

export default function AdminWidgets() {
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlacement, setFilterPlacement] = useState<Placement | "all">("all");
  const [editing, setEditing] = useState<Widget | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Widget, "id" | "displayOrder" | "config">>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/widgets`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setWidgets(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const startCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setCreating(true);
  };

  const startEdit = (w: Widget) => {
    setCreating(false);
    setEditing(w);
    setForm({
      type: w.type,
      title: w.title ?? "",
      subtitle: w.subtitle ?? "",
      imageUrl: w.imageUrl,
      icon: w.icon ?? "🔥",
      buttonLabel: w.buttonLabel ?? "",
      buttonUrl: w.buttonUrl ?? "",
      placement: w.placement,
      isPublished: w.isPublished,
      targeting: w.targeting,
      background: w.background ?? "#111111",
      accent: w.accent ?? "#f97316",
      glassAmount: (w.glassAmount as GlassAmount) ?? "medium",
      layout: (w.layout as Layout) ?? "stack",
      size: (w.size as Size) ?? "md",
      borderRadius: w.borderRadius ?? 16,
      animation: (w.animation as Animation) ?? "fade",
    });
  };

  const closePanel = () => { setEditing(null); setCreating(false); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, config: null };
      let res: Response;
      if (editing) {
        res = await fetch(`${BASE}/api/widgets/${editing.id}`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BASE}/api/widgets`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      toast({ title: editing ? "Widget updated" : "Widget created" });
      load();
      closePanel();
    } catch {
      toast({ title: "Error saving widget", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (w: Widget) => {
    const res = await fetch(`${BASE}/api/widgets/${w.id}/publish`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !w.isPublished }),
    });
    if (res.ok) {
      load();
      toast({ title: w.isPublished ? "Widget unpublished" : "Widget published" });
    }
  };

  const deleteWidget = async (id: number) => {
    if (!confirm("Delete this widget?")) return;
    await fetch(`${BASE}/api/widgets/${id}`, { method: "DELETE", credentials: "include" });
    load();
    if (editing?.id === id) closePanel();
    toast({ title: "Widget deleted" });
  };

  const move = async (w: Widget, dir: "up" | "down") => {
    const list = [...widgets].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = list.findIndex((x) => x.id === w.id);
    const swap = dir === "up" ? list[idx - 1] : list[idx + 1];
    if (!swap) return;
    const reordered = [
      { id: w.id, displayOrder: swap.displayOrder },
      { id: swap.id, displayOrder: w.displayOrder },
    ];
    await fetch(`${BASE}/api/widgets/reorder`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordered),
    });
    load();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`${BASE}/api/uploads`, { method: "POST", credentials: "include", body: fd });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterPlacement === "all"
    ? [...widgets].sort((a, b) => a.displayOrder - b.displayOrder)
    : [...widgets].filter((w) => w.placement === filterPlacement).sort((a, b) => a.displayOrder - b.displayOrder);

  const panelOpen = creating || !!editing;

  const placementLabel: Record<Placement, string> = { home: "Home", shop: "Shop", account: "Account", order: "Order Page" };
  const targetingLabel: Record<Targeting, string> = { everyone: "Everyone", signed_in: "Signed-in Customers", guests: "Guests" };

  const F = (key: keyof typeof form, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-orange-400" />
            <h1 className="text-2xl font-bold">Widgets</h1>
          </div>
          <p className="text-sm text-white/40">Create and manage customer-facing widgets for the FirstPick PWA</p>
        </div>
        <Button onClick={startCreate}
          className="bg-orange-500 hover:bg-orange-400 text-black font-bold gap-2">
          <Plus className="w-4 h-4" /> Create Widget
        </Button>
      </div>

      {/* Note about PWA-only */}
      <div className="mb-6 px-4 py-3 rounded-xl border border-orange-500/20 bg-orange-500/5 text-sm text-orange-300/70">
        💡 Widgets only appear when FirstPick is installed on a device's Home Screen (PWA mode). Visitors using a regular browser see an "Add to Home Screen" prompt instead.
      </div>

      <div className="flex gap-6 items-start">
        {/* Widget List */}
        <div className="flex-1 min-w-0">
          {/* Placement filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["all", "home", "shop", "account", "order"] as const).map((p) => (
              <button key={p} onClick={() => setFilterPlacement(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterPlacement === p
                    ? "bg-orange-500 text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                {p === "all" ? "All Placements" : placementLabel[p]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-white/30">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-12 text-center">
              <LayoutDashboard className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No widgets yet</p>
              <button onClick={startCreate} className="mt-3 text-orange-400 text-sm hover:text-orange-300">
                Create your first widget →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((w, idx) => (
                <motion.div key={w.id} layout
                  className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    editing?.id === w.id
                      ? "border-orange-500/40 bg-orange-500/5"
                      : "border-white/8 bg-white/3 hover:bg-white/5"
                  }`}
                  onClick={() => startEdit(w)}>

                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => move(w, "up")} disabled={idx === 0}
                      className="p-0.5 rounded text-white/30 hover:text-white disabled:opacity-20">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => move(w, "down")} disabled={idx === filtered.length - 1}
                      className="p-0.5 rounded text-white/30 hover:text-white disabled:opacity-20">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Type icon */}
                  <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                    {w.type === "image" ? (
                      <Image className="w-4 h-4 text-white/50" />
                    ) : (
                      <span className="text-sm">{w.icon || "🔥"}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{w.title || <span className="text-white/30 italic">Untitled</span>}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/35 uppercase tracking-wider">{placementLabel[w.placement]}</span>
                      <span className="text-white/15">·</span>
                      <span className="text-[10px] text-white/35">{targetingLabel[w.targeting]}</span>
                      <span className="text-white/15">·</span>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${w.type === "image" ? "text-blue-400/70" : "text-purple-400/70"}`}>
                        {w.type}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => togglePublish(w)}
                      className={`p-1.5 rounded-lg transition-colors ${w.isPublished ? "text-green-400 bg-green-400/10" : "text-white/25 bg-white/5 hover:bg-white/10"}`}
                      title={w.isPublished ? "Published — click to unpublish" : "Unpublished — click to publish"}>
                      {w.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteWidget(w.id)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit Panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-[380px] shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 space-y-4">
                {/* Panel header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base">{editing ? "Edit Widget" : "New Widget"}</h2>
                  <button onClick={closePanel} className="p-1 rounded-lg text-white/30 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Live Preview */}
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Live Preview</p>
                  <div className="rounded-xl overflow-hidden border border-white/8">
                    <AdminRenderedWidget widget={{ ...form, id: 0, displayOrder: 0, config: null } as Widget} preview />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Widget Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["image", Image, "Image"], ["custom", Sliders, "Custom"]] as const).map(([t, Icon, label]) => (
                      <button key={t} onClick={() => F("type", t)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${
                          form.type === t
                            ? "border-orange-500 bg-orange-500/10 text-orange-400"
                            : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8"
                        }`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Common fields */}
                <Field label="Title">
                  <Input value={form.title ?? ""} onChange={(e) => F("title", e.target.value)}
                    placeholder="Widget title" className="glass-input" />
                </Field>
                <Field label="Subtitle / Text">
                  <Input value={form.subtitle ?? ""} onChange={(e) => F("subtitle", e.target.value)}
                    placeholder="Short description" className="glass-input" />
                </Field>

                {form.type === "image" ? (
                  <Field label="Image">
                    {form.imageUrl && (
                      <img src={form.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    <Button onClick={() => fileRef.current?.click()} variant="outline"
                      className="w-full border-white/10 gap-2" disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading…" : form.imageUrl ? "Replace Image" : "Upload Image"}
                    </Button>
                  </Field>
                ) : (
                  <Field label="Icon (emoji)">
                    <Input value={form.icon ?? ""} onChange={(e) => F("icon", e.target.value)}
                      placeholder="🔥" className="glass-input" maxLength={4} />
                  </Field>
                )}

                {/* Button */}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Button Label">
                    <Input value={form.buttonLabel ?? ""} onChange={(e) => F("buttonLabel", e.target.value)}
                      placeholder="Shop Now" className="glass-input" />
                  </Field>
                  <Field label="Button URL">
                    <Input value={form.buttonUrl ?? ""} onChange={(e) => F("buttonUrl", e.target.value)}
                      placeholder="/shop" className="glass-input" />
                  </Field>
                </div>

                {/* Placement */}
                <Field label="Placement">
                  <select value={form.placement} onChange={(e) => F("placement", e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-orange-500">
                    <option value="home">Home</option>
                    <option value="shop">Shop</option>
                    <option value="account">Account</option>
                    <option value="order">Order Page</option>
                  </select>
                </Field>

                {/* Targeting */}
                <Field label="Show To">
                  <select value={form.targeting} onChange={(e) => F("targeting", e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-orange-500">
                    <option value="everyone">Everyone</option>
                    <option value="signed_in">Signed-in Customers</option>
                    <option value="guests">Guests Only</option>
                  </select>
                </Field>

                {/* Custom widget styling */}
                {form.type === "custom" && (
                  <>
                    <div className="border-t border-white/8 pt-3">
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Styling</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Background">
                            <div className="flex gap-2">
                              <input type="color" value={form.background ?? "#111111"}
                                onChange={(e) => F("background", e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                              <Input value={form.background ?? ""} onChange={(e) => F("background", e.target.value)}
                                className="glass-input flex-1" placeholder="#111111" />
                            </div>
                          </Field>
                          <Field label="Accent">
                            <div className="flex gap-2">
                              <input type="color" value={form.accent ?? "#f97316"}
                                onChange={(e) => F("accent", e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                              <Input value={form.accent ?? ""} onChange={(e) => F("accent", e.target.value)}
                                className="glass-input flex-1" placeholder="#f97316" />
                            </div>
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Glass">
                            <select value={form.glassAmount ?? "medium"} onChange={(e) => F("glassAmount", e.target.value)}
                              className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-orange-500">
                              <option value="none">None</option>
                              <option value="light">Light</option>
                              <option value="medium">Medium</option>
                              <option value="heavy">Heavy</option>
                            </select>
                          </Field>
                          <Field label="Layout">
                            <select value={form.layout ?? "stack"} onChange={(e) => F("layout", e.target.value)}
                              className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-orange-500">
                              <option value="stack">Stack</option>
                              <option value="row">Row</option>
                              <option value="centered">Centered</option>
                            </select>
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Size">
                            <select value={form.size ?? "md"} onChange={(e) => F("size", e.target.value)}
                              className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-orange-500">
                              <option value="sm">Small</option>
                              <option value="md">Medium</option>
                              <option value="lg">Large</option>
                              <option value="full">Full Width</option>
                            </select>
                          </Field>
                          <Field label="Corner Radius">
                            <div className="flex items-center gap-2">
                              <input type="range" min={0} max={32} value={form.borderRadius ?? 16}
                                onChange={(e) => F("borderRadius", Number(e.target.value))}
                                className="flex-1 accent-orange-500" />
                              <span className="text-xs text-white/40 w-6">{form.borderRadius ?? 16}</span>
                            </div>
                          </Field>
                        </div>

                        <Field label="Animation">
                          <select value={form.animation ?? "fade"} onChange={(e) => F("animation", e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-orange-500">
                            <option value="fade">Fade</option>
                            <option value="slide">Slide Up</option>
                            <option value="scale">Scale</option>
                            <option value="none">None</option>
                          </select>
                        </Field>
                      </div>
                    </div>
                  </>
                )}

                {/* Publish toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-white/8">
                  <div>
                    <p className="text-sm font-medium">Published</p>
                    <p className="text-xs text-white/35">Visible to customers</p>
                  </div>
                  <button onClick={() => F("isPublished", !form.isPublished)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${form.isPublished ? "bg-orange-500" : "bg-white/15"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.isPublished ? "left-5" : "left-1"}`} />
                  </button>
                </div>

                {/* Save */}
                <Button onClick={save} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save Changes" : "Create Widget"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
