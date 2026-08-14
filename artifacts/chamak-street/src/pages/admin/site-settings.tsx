import { useState, useEffect, useRef } from "react";
import { useGetAllSettings, useBulkUpsertSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Globe, Flame, Type, Image, Star, Video, Truck, Eye, EyeOff, Upload, MessageCircle, Music2, Megaphone, Plus, Trash2, ChevronUp, ChevronDown, Images } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SETTING_DEFAULTS } from "@/lib/use-settings";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function uploadImageFile(file: File): Promise<string> {
  const signRes = await fetch(`${BASE}/api/uploads/sign`, { method: "POST", credentials: "include" });
  if (signRes.ok) {
    const sig = await signRes.json() as { apiKey: string; folder: string; signature: string; timestamp: string; uploadUrl: string };
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", sig.timestamp);
    form.append("folder", sig.folder);
    form.append("signature", sig.signature);
    const upRes = await fetch(sig.uploadUrl, { method: "POST", body: form });
    if (!upRes.ok) throw new Error("Cloudinary upload failed");
    const data = await upRes.json() as { secure_url?: string };
    if (!data.secure_url) throw new Error("No URL returned");
    return data.secure_url;
  }
  const form = new FormData();
  form.append("file", file);
  const upRes = await fetch(`${BASE}/api/uploads`, { method: "POST", body: form, credentials: "include" });
  if (!upRes.ok) throw new Error("Upload failed");
  const data = await upRes.json() as { url: string };
  return data.url;
}

type SettingsMap = Record<string, string>;

const TABS = [
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "hero", label: "Hero Section", icon: Flame },
  { id: "logo", label: "Logo Blending", icon: Image },
  { id: "trust", label: "Trust Cards", icon: Star },
  { id: "sections", label: "Sections", icon: Video },
  { id: "social", label: "Social Buttons", icon: MessageCircle },
  { id: "site", label: "Site Info", icon: Globe },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "content", label: "Content", icon: Type },
];

function SettingInput({
  label, settingKey, settings, onChange, type = "text", placeholder, multiline = false,
}: {
  label: string;
  settingKey: string;
  settings: SettingsMap;
  onChange: (key: string, val: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const val = settings[settingKey] ?? SETTING_DEFAULTS[settingKey] ?? "";
  return (
    <div>
      <label className="label-xs mb-1.5 block">{label}</label>
      {multiline ? (
        <Textarea value={val} onChange={(e) => onChange(settingKey, e.target.value)} placeholder={placeholder ?? SETTING_DEFAULTS[settingKey]} className="min-h-[80px]" />
      ) : (
        <Input type={type} value={val} onChange={(e) => onChange(settingKey, e.target.value)} placeholder={placeholder ?? SETTING_DEFAULTS[settingKey]} />
      )}
    </div>
  );
}

function ImageSettingInput({
  label, settingKey, settings, onChange,
}: {
  label: string;
  settingKey: string;
  settings: SettingsMap;
  onChange: (key: string, val: string) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const val = settings[settingKey] ?? SETTING_DEFAULTS[settingKey] ?? "";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      onChange(settingKey, url);
      toast({ title: "Image uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="label-xs mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => onChange(settingKey, e.target.value)} placeholder="https://... or upload from device" className="flex-1" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 gap-1.5 font-bold uppercase tracking-wide text-xs border-primary/40 hover:border-primary"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {val && (
        <div className="mt-2 rounded-lg overflow-hidden border border-border/40 h-24">
          <img src={val} alt="preview" className="w-full h-full object-cover object-center" />
        </div>
      )}
    </div>
  );
}

function VideoSettingInput({
  label, settingKey, settings, onChange,
}: {
  label: string;
  settingKey: string;
  settings: SettingsMap;
  onChange: (key: string, val: string) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const val = settings[settingKey] ?? "";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      onChange(settingKey, url);
      toast({ title: "Video uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="label-xs mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => onChange(settingKey, e.target.value)} placeholder="https://... or upload from device" className="flex-1" />
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 gap-1.5 font-bold uppercase tracking-wide text-xs border-primary/40 hover:border-primary"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      </div>
      {val && (
        <video
          src={val}
          muted
          playsInline
          preload="metadata"
          className="mt-2 w-full rounded-lg border border-border/40"
          style={{ maxHeight: 80, objectFit: "cover" }}
        />
      )}
    </div>
  );
}

function ToggleInput({
  label, settingKey, settings, onChange,
}: {
  label: string; settingKey: string; settings: SettingsMap; onChange: (key: string, val: string) => void;
}) {
  const val = settings[settingKey] !== "false";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <label className="text-sm font-bold">{label}</label>
      <button
        type="button"
        onClick={() => onChange(settingKey, val ? "false" : "true")}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${val ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function ColorInput({
  label, settingKey, settings, onChange,
}: {
  label: string; settingKey: string; settings: SettingsMap; onChange: (key: string, val: string) => void;
}) {
  const val = settings[settingKey] ?? SETTING_DEFAULTS[settingKey] ?? "#ff6600";
  return (
    <div>
      <label className="label-xs mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <Input type="color" value={val} onChange={(e) => onChange(settingKey, e.target.value)} className="w-14 h-9 p-1 cursor-pointer" />
        <Input value={val} onChange={(e) => onChange(settingKey, e.target.value)} placeholder={val} />
      </div>
    </div>
  );
}

function SliderInput({
  label, settingKey, settings, onChange, min, max, step,
}: {
  label: string; settingKey: string; settings: SettingsMap; onChange: (key: string, val: string) => void;
  min: number; max: number; step?: number;
}) {
  const val = Number(settings[settingKey] ?? SETTING_DEFAULTS[settingKey] ?? min);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="label-xs">{label}</label>
        <span className="text-xs font-mono text-primary">{val}</span>
      </div>
      <input type="range" min={min} max={max} step={step ?? 0.1} value={val}
        onChange={(e) => onChange(settingKey, e.target.value)}
        className="w-full accent-primary" />
    </div>
  );
}

function HeroImagesManager({ settings, onChange }: { settings: SettingsMap; onChange: (key: string, val: string) => void }) {
  const { toast } = useToast();
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getImages = (): string[] => {
    try {
      const parsed = JSON.parse(settings.hero_images || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    const fallback = settings.hero_image || SETTING_DEFAULTS.hero_image;
    return fallback ? [fallback] : [];
  };

  const setImages = (imgs: string[]) => {
    onChange("hero_images", JSON.stringify(imgs));
    if (imgs.length > 0) onChange("hero_image", imgs[0]);
  };

  const images = getImages();

  const handleUrlChange = (i: number, val: string) => {
    const next = [...images]; next[i] = val; setImages(next);
  };
  const handleAdd = () => setImages([...images, ""]);
  const handleRemove = (i: number) => { const next = images.filter((_, idx) => idx !== i); setImages(next.length > 0 ? next : [SETTING_DEFAULTS.hero_image]); };
  const handleMoveUp = (i: number) => { if (i === 0) return; const next = [...images]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setImages(next); };
  const handleMoveDown = (i: number) => { if (i === images.length - 1) return; const next = [...images]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; setImages(next); };

  const handleFile = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const url = await uploadImageFile(file);
      handleUrlChange(i, url);
      toast({ title: "Image uploaded!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    if (fileRefs.current[i]) fileRefs.current[i]!.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label-xs flex items-center gap-2"><Images className="h-3.5 w-3.5" /> Hero Images (Slideshow)</label>
        <span className="text-[10px] font-mono text-muted-foreground">{images.length} image{images.length !== 1 ? "s" : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">Add multiple images — the hero will automatically cycle through them. Drag order = slide order.</p>

      <div className="space-y-3">
        {images.map((url, i) => (
          <div key={i} className="border border-border/60 rounded-xl overflow-hidden bg-muted/20">
            <div className="flex items-center gap-2 p-3">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => handleMoveUp(i)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleMoveDown(i)} disabled={i === images.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-[10px] font-black font-mono text-muted-foreground/60 shrink-0 w-5">{String(i + 1).padStart(2, "0")}</span>
              <Input
                value={url}
                onChange={(e) => handleUrlChange(i, e.target.value)}
                placeholder="https://... or upload →"
                className="flex-1 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRefs.current[i]?.click()}
                className="shrink-0 gap-1 text-xs font-bold uppercase tracking-wide border-primary/30 hover:border-primary px-2.5">
                <Upload className="h-3 w-3" /> Upload
              </Button>
              <button onClick={() => handleRemove(i)} disabled={images.length === 1}
                className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-20 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <input ref={(el) => { fileRefs.current[i] = el; }} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFile(i, e)} />
            </div>
            {url && (
              <div className="h-20 border-t border-border/30 overflow-hidden relative">
                {/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) ? (
                  <>
                    <video src={url} className="w-full h-full object-cover object-center" muted playsInline preload="metadata" />
                    <span className="absolute top-1.5 right-2 text-[9px] font-black uppercase tracking-wider bg-black/60 text-white px-1.5 py-0.5 rounded">VIDEO</span>
                  </>
                ) : (
                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover object-center" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={handleAdd}
        className="w-full gap-2 border-dashed border-primary/30 hover:border-primary font-bold uppercase tracking-wide text-xs">
        <Plus className="h-3.5 w-3.5" /> Add Another Image
      </Button>

      {/* Default image quick-insert */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        <img src="/chamako-hero.png" alt="Default hero" className="w-16 h-10 object-cover rounded-lg shrink-0 border border-border/40" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide">Default Hero Image</p>
          <p className="text-[10px] text-muted-foreground truncate">/chamako-hero.png</p>
        </div>
        <Button type="button" variant="outline" size="sm"
          onClick={() => { if (!images.includes("/chamako-hero.png")) setImages([...images.filter(Boolean), "/chamako-hero.png"]); }}
          className="shrink-0 text-xs font-bold uppercase tracking-wide border-primary/30 hover:border-primary px-2.5">
          + Use
        </Button>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <label className="label-xs">Slide Interval (seconds)</label>
          <span className="text-xs font-mono text-primary">{Math.round(Number(settings.hero_slide_interval || 5000) / 1000)}s</span>
        </div>
        <input type="range" min={2000} max={12000} step={500}
          value={Number(settings.hero_slide_interval || 5000)}
          onChange={(e) => onChange("hero_slide_interval", e.target.value)}
          className="w-full accent-primary" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>2s</span><span>12s</span>
        </div>
      </div>
    </div>
  );
}

function TrustCardSettings({ n, settings, onChange }: { n: number; settings: SettingsMap; onChange: (key: string, val: string) => void }) {
  const [open, setOpen] = useState(false);
  const isVisible = settings[`trust_${n}_visible`] !== "false";
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer bg-muted/30" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{settings[`trust_${n}_icon`] || "⭐"}</span>
          <span className="font-bold text-sm">{settings[`trust_${n}_title`] || `Trust Card ${n}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onChange(`trust_${n}_visible`, isVisible ? "false" : "true"); }}
            className={`text-sm ${isVisible ? "text-primary" : "text-muted-foreground"}`}
          >
            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <span className="text-muted-foreground text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-border/40">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingInput label="Icon Emoji" settingKey={`trust_${n}_icon`} settings={settings} onChange={onChange} placeholder="🚚" />
              <SettingInput label="Title" settingKey={`trust_${n}_title`} settings={settings} onChange={onChange} />
              <div className="sm:col-span-2">
                <SettingInput label="Description" settingKey={`trust_${n}_desc`} settings={settings} onChange={onChange} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminSiteSettings() {
  const { data: dbSettings, isLoading } = useGetAllSettings({ query: { staleTime: 0, queryKey: ["admin", "site-settings"] } });
  const bulkUpsert = useBulkUpsertSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [activeTab, setActiveTab] = useState("hero");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (dbSettings) {
      setSettings({ ...SETTING_DEFAULTS, ...dbSettings });
      setHasChanges(false);
    }
  }, [dbSettings]);

  const onChange = (key: string, val: string) => {
    setSettings((s) => ({ ...s, [key]: val }));
    setHasChanges(true);
  };

  const handleSave = () => {
    bulkUpsert.mutate(
      { data: settings },
      {
        onSuccess: () => {
          toast({ title: "Settings saved!" });
          queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("Setting") });
          setHasChanges(false);
        },
        onError: () => toast({ title: "Error saving settings", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Site Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize every aspect of your store without touching code.</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSave}
            disabled={bulkUpsert.isPending || !hasChanges}
            className="fire-gradient border-none font-black uppercase tracking-wider gap-2 relative"
          >
            <Save className="h-4 w-4" />
            {bulkUpsert.isPending ? "Saving..." : "Save Changes"}
            {hasChanges && !bulkUpsert.isPending && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border border-background" />
            )}
          </Button>
        </motion.div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px fire-gradient opacity-60" />

        {activeTab === "announcement" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Announcement Banner</h2>
            <p className="text-sm text-muted-foreground -mt-4">Show a slim banner across the top of the site. Great for promotions, events, or shipping notices.</p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange("announcement_active", settings.announcement_active === "true" ? "false" : "true")}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.announcement_active === "true" ? "bg-green-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settings.announcement_active === "true" ? "left-6" : "left-0.5"}`} />
              </button>
              <span className="font-bold text-sm">{settings.announcement_active === "true" ? "Banner Active" : "Banner Hidden"}</span>
            </div>

            <SettingInput
              label="Banner Text"
              settingKey="announcement_text"
              settings={settings}
              onChange={onChange}
              placeholder="e.g. FREE SHIPPING on orders over AED 200 · Use code CHAMAK10 for 10% off"
            />
            <SettingInput
              label="Banner Link (optional)"
              settingKey="announcement_url"
              settings={settings}
              onChange={onChange}
              placeholder="e.g. /shop or https://wa.me/971521142341"
            />

            <div>
              <label className="label-xs mb-1.5 block">Banner Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.announcement_color ?? "#ff6600"}
                  onChange={(e) => onChange("announcement_color", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <span className="text-sm text-muted-foreground font-mono">{settings.announcement_color ?? "#ff6600"}</span>
              </div>
            </div>

            {/* Live preview */}
            {settings.announcement_text && (
              <div className="rounded-xl overflow-hidden border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2 bg-muted border-b border-border">Live Preview</p>
                <div
                  className="px-6 py-2.5 text-center text-white text-xs font-black uppercase tracking-widest"
                  style={{ backgroundColor: settings.announcement_color ?? "#ff6600" }}
                >
                  {settings.announcement_text}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "hero" && (
          <div className="space-y-6">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Hero Section</h2>
            <HeroImagesManager settings={settings} onChange={onChange} />
            <div className="border-t border-border/40 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingInput label="Hero Title Line 1" settingKey="hero_title" settings={settings} onChange={onChange} />
              <SettingInput label="Hero Title Line 2 (gradient)" settingKey="hero_subtitle" settings={settings} onChange={onChange} />
              <div className="sm:col-span-2">
                <SettingInput label="Hero Description" settingKey="hero_description" settings={settings} onChange={onChange} multiline />
              </div>
              <SettingInput label="CTA Button Text" settingKey="hero_cta_text" settings={settings} onChange={onChange} />
            </div>
          </div>
        )}

        {activeTab === "logo" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Logo Blending Tool</h2>
            <p className="text-sm text-muted-foreground">Adjust how your logo appears in the header without touching code.</p>
            <ImageSettingInput label="Custom Logo Image (leave empty to use the built-in animated SVG logo)" settingKey="logo_url" settings={settings} onChange={onChange} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SliderInput label="Height (px)" settingKey="logo_height" settings={settings} onChange={onChange} min={20} max={100} step={1} />
              <SliderInput label="Opacity" settingKey="logo_opacity" settings={settings} onChange={onChange} min={0} max={1} />
              <SliderInput label="Blur (px)" settingKey="logo_blur" settings={settings} onChange={onChange} min={0} max={20} step={0.5} />
              <SliderInput label="Padding (px)" settingKey="logo_padding" settings={settings} onChange={onChange} min={0} max={32} step={1} />
              <SliderInput label="Border Radius (px)" settingKey="logo_border_radius" settings={settings} onChange={onChange} min={0} max={50} step={1} />
              <SliderInput label="Brightness" settingKey="logo_brightness" settings={settings} onChange={onChange} min={0} max={3} />
              <SliderInput label="Contrast" settingKey="logo_contrast" settings={settings} onChange={onChange} min={0} max={3} />
            </div>

            <div>
              <label className="label-xs mb-1.5 block">Background Color</label>
              <div className="flex gap-2 flex-wrap">
                {["transparent", "#000000", "#ffffff", "#111111", "#1a1a2e"].map((c) => (
                  <button key={c} onClick={() => onChange("logo_bg_color", c)}
                    className={`w-9 h-9 rounded-lg border-2 transition-all ${settings.logo_bg_color === c ? "border-primary scale-110" : "border-border"}`}
                    style={{ background: c === "transparent" ? "repeating-conic-gradient(#888 0% 25%, transparent 0% 50%) 0 0 / 12px 12px" : c }}
                    title={c}
                  />
                ))}
                <ColorInput label="" settingKey="logo_bg_color" settings={settings} onChange={onChange} />
              </div>
            </div>

            <div>
              <label className="label-xs mb-2 block">CSS Blend Mode</label>
              <div className="flex flex-wrap gap-2">
                {["normal", "multiply", "screen", "overlay", "lighten", "darken", "color-dodge", "luminosity"].map((mode) => (
                  <button key={mode} onClick={() => onChange("logo_blend_mode", mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${settings.logo_blend_mode === mode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 p-4 bg-background rounded-xl border border-border/40">
              <p className="text-xs text-muted-foreground mb-3">Live Preview:</p>
              <div style={{ background: settings.logo_bg_color === "transparent" ? "transparent" : settings.logo_bg_color, display: "inline-block", padding: `${settings.logo_padding}px`, borderRadius: `${settings.logo_border_radius}px` }}>
                <img
                  src={settings.logo_url || "/firstpick-logo.svg"}
                  alt="Logo Preview"
                  style={{
                    height: `${settings.logo_height || 56}px`,
                    opacity: Number(settings.logo_opacity ?? 1),
                    filter: `blur(${settings.logo_blur || 0}px) brightness(${settings.logo_brightness || 1}) contrast(${settings.logo_contrast || 1})`,
                    mixBlendMode: (settings.logo_blend_mode || "normal") as React.CSSProperties["mixBlendMode"],
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "trust" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Trust Cards</h2>
            <p className="text-sm text-muted-foreground">These 4 glassmorphism cards appear below the featured products section.</p>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <TrustCardSettings key={n} n={n} settings={settings} onChange={onChange} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Homepage Sections</h2>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <h3 className="font-black uppercase tracking-wide text-sm">TikTok Section</h3>
                <ToggleInput label="Show TikTok Section" settingKey="tiktok_section_visible" settings={settings} onChange={onChange} />
                <SettingInput label="Section Title" settingKey="tiktok_section_title" settings={settings} onChange={onChange} />
              </div>
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <h3 className="font-black uppercase tracking-wide text-sm">Reviews Section</h3>
                <ToggleInput label="Show Reviews Section" settingKey="reviews_section_visible" settings={settings} onChange={onChange} />
                <SettingInput label="Section Title" settingKey="reviews_section_title" settings={settings} onChange={onChange} />
              </div>
              <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/40">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <h3 className="font-black uppercase tracking-wide text-sm">Middle Feature Video</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scroll-driven video shown in the center of the homepage — plays frame-by-frame as users scroll through it.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onChange("hero_middle_video", "")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${!settings.hero_middle_video ? "bg-primary text-primary-foreground border-primary" : "bg-muted/60 text-muted-foreground border-border hover:border-primary/40"}`}
                  >
                    ✓ Default
                  </button>
                  <button
                    onClick={() => { if (!settings.hero_middle_video) onChange("hero_middle_video", " "); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${settings.hero_middle_video?.trim() ? "bg-primary text-primary-foreground border-primary" : "bg-muted/60 text-muted-foreground border-border hover:border-primary/40"}`}
                  >
                    Custom Upload
                  </button>
                </div>
                {settings.hero_middle_video?.trim() && (
                  <VideoSettingInput label="Custom video URL or file" settingKey="hero_middle_video" settings={settings} onChange={onChange} />
                )}
                {!settings.hero_middle_video?.trim() && (
                  <p className="text-[11px] text-muted-foreground/60 italic">Using the built-in FirstPick video.</p>
                )}
              </div>

              <div className="p-4 bg-muted/30 rounded-xl space-y-3 border border-border/40">
                <h3 className="font-black uppercase tracking-wide text-sm">Recommended Products</h3>
                <p className="text-xs text-muted-foreground">Shown at the bottom of every product page — automatically picks similar products from the same category.</p>
                <ToggleInput label="Show Recommended Products" settingKey="recommended_visible" settings={settings} onChange={onChange} />
                <SettingInput label='Section Title (e.g. "You May Also Like")' settingKey="recommended_title" settings={settings} onChange={onChange} placeholder="You May Also Like" />
                <div>
                  <label className="label-xs mb-1.5 block">Number of Products to Show</label>
                  <select
                    value={settings["recommended_count"] || "6"}
                    onChange={(e) => onChange("recommended_count", e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
                  >
                    {[2, 3, 4, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={String(n)}>{n} products</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "social" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Social Buttons</h2>

            <div className="p-4 bg-muted/30 rounded-xl space-y-3 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <h3 className="font-black uppercase tracking-wide text-sm">WhatsApp Button</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">A floating WhatsApp button appears on every page so customers can contact you instantly.</p>
              <ToggleInput label="Show WhatsApp Button" settingKey="whatsapp_visible" settings={settings} onChange={onChange} />
              <SettingInput label="WhatsApp Number (with country code)" settingKey="whatsapp_number" settings={settings} onChange={onChange} placeholder="+971521142341" />
              <SettingInput label="Button Text" settingKey="whatsapp_text" settings={settings} onChange={onChange} placeholder="Chat with Us" />
              <SettingInput label="Pre-filled Message" settingKey="whatsapp_message" settings={settings} onChange={onChange} placeholder="Hello! I'm interested in one of your products." multiline />
              <div>
                <label className="label-xs mb-1.5 block">Button Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings["whatsapp_color"] || "#25D366"}
                    onChange={(e) => onChange("whatsapp_color", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{settings["whatsapp_color"] || "#25D366"}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl space-y-3 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Music2 className="h-4 w-4" />
                <h3 className="font-black uppercase tracking-wide text-sm">TikTok Button</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Shown in the footer, links to your TikTok profile.</p>
              <ToggleInput label="Show TikTok Button" settingKey="tiktok_btn_visible" settings={settings} onChange={onChange} />
              <SettingInput label="TikTok Handle" settingKey="contact_tiktok" settings={settings} onChange={onChange} placeholder="@firstpick" />
              <SettingInput label="Button Text" settingKey="tiktok_btn_text" settings={settings} onChange={onChange} placeholder="Follow on TikTok" />
              <div>
                <label className="label-xs mb-1.5 block">Button Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings["tiktok_btn_color"] || "#000000"}
                    onChange={(e) => onChange("tiktok_btn_color", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{settings["tiktok_btn_color"] || "#000000"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "site" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Site Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingInput label="Site Name" settingKey="site_name" settings={settings} onChange={onChange} />
              <SettingInput label="Site Tagline" settingKey="site_tagline" settings={settings} onChange={onChange} />
              <div className="sm:col-span-2">
                <SettingInput label="Footer Description" settingKey="footer_description" settings={settings} onChange={onChange} multiline />
              </div>
              <SettingInput label="Email" settingKey="contact_email" settings={settings} onChange={onChange} type="email" />
              <SettingInput label="WhatsApp / Phone" settingKey="contact_phone" settings={settings} onChange={onChange} />
              <SettingInput label="Instagram Handle" settingKey="contact_instagram" settings={settings} onChange={onChange} placeholder="@chamakstreet" />
              <SettingInput label="TikTok Handle" settingKey="contact_tiktok" settings={settings} onChange={onChange} placeholder="@firstpick" />
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-8">
            <div className="space-y-5">
              <h2 className="font-black uppercase tracking-wider text-primary">Delivery Pricing</h2>
              <p className="text-sm text-muted-foreground -mt-3">Set the delivery prices customers see at checkout. Leave blank to use defaults (Standard 20, Express 30, Priority 40).</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SettingInput label="Standard Delivery (AED)" settingKey="delivery_standard_price" settings={settings} onChange={onChange} placeholder="20" />
                <SettingInput label="Express Delivery (AED)" settingKey="delivery_express_price" settings={settings} onChange={onChange} placeholder="30" />
                <SettingInput label="Priority Delivery (AED)" settingKey="delivery_priority_price" settings={settings} onChange={onChange} placeholder="40" />
              </div>
            </div>
            <div className="border-t border-border/40 pt-6 space-y-5">
              <h2 className="font-black uppercase tracking-wider text-primary">Info Pages</h2>
              <SettingInput label="Shipping Info Text" settingKey="shipping_text" settings={settings} onChange={onChange} multiline />
              <SettingInput label="About Us Text" settingKey="about_text" settings={settings} onChange={onChange} multiline />
            </div>
          </div>
        )}

        {activeTab === "content" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Content & Legal</h2>
            <SettingInput label="Privacy Policy" settingKey="privacy_policy" settings={settings} onChange={onChange} multiline />
            <SettingInput label="FAQ" settingKey="faq_text" settings={settings} onChange={onChange} multiline />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSave}
            disabled={bulkUpsert.isPending || !hasChanges}
            size="lg"
            className="fire-gradient border-none font-black uppercase tracking-wider"
          >
            <Save className="h-4 w-4 mr-2" />
            {bulkUpsert.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
