import { useState, useEffect } from "react";
import { useGetAllSettings, useBulkUpsertSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Globe, Flame, Type, Image, Star, Video, Truck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SETTING_DEFAULTS } from "@/lib/use-settings";

type SettingsMap = Record<string, string>;

const TABS = [
  { id: "hero", label: "Hero Section", icon: Flame },
  { id: "logo", label: "Logo Blending", icon: Image },
  { id: "trust", label: "Trust Cards", icon: Star },
  { id: "sections", label: "Sections", icon: Video },
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

        {activeTab === "hero" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Hero Section</h2>
            <SettingInput label="Hero Image URL" settingKey="hero_image" settings={settings} onChange={onChange} placeholder="/chamako-hero.png" />
            {settings.hero_image && (
              <div className="rounded-xl overflow-hidden h-36 border border-border/40">
                <img src={settings.hero_image} alt="Hero preview" className="w-full h-full object-cover object-center" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <SettingInput label="Logo Image URL" settingKey="logo_url" settings={settings} onChange={onChange} placeholder="/chamak-logo.png" />

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
                  src={settings.logo_url || "/chamak-logo.png"}
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
              <SettingInput label="TikTok Handle" settingKey="contact_tiktok" settings={settings} onChange={onChange} placeholder="@chamakstreet" />
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-5">
            <h2 className="font-black uppercase tracking-wider text-primary mb-6">Shipping Info</h2>
            <SettingInput label="Shipping Info Text" settingKey="shipping_text" settings={settings} onChange={onChange} multiline />
            <SettingInput label="About Us Text" settingKey="about_text" settings={settings} onChange={onChange} multiline />
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
