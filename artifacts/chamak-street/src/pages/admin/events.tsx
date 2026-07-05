import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Zap, Clock, Edit3, CheckCircle, XCircle,
  Calendar, Copy, Eye, EyeOff, ArrowUp, ArrowDown, Flame,
  Image, Bell, Globe, Tag, Timer, Palette, Layout, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type Event = {
  id: number; name: string; type: string;
  bannerText: string | null; bannerSubtext: string | null;
  bannerColor: string | null; textColor: string | null; accentColor: string | null;
  logoUrl: string | null; backgroundImageUrl: string | null; badgeText: string | null;
  countdownEnabled: boolean;
  startAt: string | null; endAt: string | null;
  homepageEnabled: boolean; homepageTitle: string | null; homepageSubtitle: string | null;
  ctaText: string | null; ctaUrl: string | null;
  popupEnabled: boolean; popupText: string | null; popupImageUrl: string | null;
  discountPercent: string | null;
  priority: number;
  config: Record<string, unknown> | null;
  isActive: boolean; createdAt: string;
};

const PRESETS = [
  { type: "flash_sale", label: "⚡ Flash Sale", color: "#cc2200", badge: "FLASH SALE", banner: "FLASH SALE — Limited Time!", subtext: "Ends soon" },

  { type: "ramadan", label: "🌙 Ramadan", color: "#8B6914", badge: "Ramadan Special", banner: "Ramadan Kareem — Special Offers", subtext: "Blessed discounts all month" },
  { type: "eid", label: "🌟 Eid", color: "#B8860B", badge: "Eid Sale", banner: "EID MUBARAK — Eid Sale is Live!", subtext: "Celebrate with style" },
  { type: "black_friday", label: "🛍️ Black Friday", color: "#111111", badge: "BLACK FRIDAY", banner: "BLACK FRIDAY — Biggest Sale of the Year", subtext: "Today only" },
  { type: "cyber_monday", label: "💻 Cyber Monday", color: "#0055cc", badge: "CYBER MONDAY", banner: "CYBER MONDAY DEALS ARE LIVE", subtext: "Shop the best deals" },
  { type: "uae_national_day", label: "🇦🇪 UAE National Day", color: "#006B3C", badge: "National Day", banner: "Happy UAE National Day 🇦🇪", subtext: "Celebrating 53 years" },
  { type: "collection_drop", label: "🔥 Collection Drop", color: "#ff4400", badge: "NEW DROP", banner: "NEW COLLECTION JUST DROPPED", subtext: "Shop the latest arrivals" },
  { type: "back_to_school", label: "📚 Back to School", color: "#ff6600", badge: "BACK TO SCHOOL", banner: "BACK TO SCHOOL SALE", subtext: "Look fresh this semester" },
  { type: "summer_sale", label: "☀️ Summer Sale", color: "#ff8c00", badge: "SUMMER SALE", banner: "SUMMER SALE IS HERE", subtext: "Hot drops, cool prices" },
  { type: "winter_sale", label: "❄️ Winter Sale", color: "#2255cc", badge: "WINTER SALE", banner: "WINTER SALE — New season", subtext: "Warm up your wardrobe" },
  { type: "custom", label: "✨ Custom", color: "#ff6600", badge: "", banner: "", subtext: "" },
];

const EVENT_SECTIONS = [
  { id: "basics", label: "Basics", icon: Zap },
  { id: "visuals", label: "Visuals", icon: Palette },
  { id: "banner", label: "Banner", icon: Megaphone },
  { id: "homepage", label: "Homepage", icon: Layout },
  { id: "popup", label: "Pop-up", icon: Bell },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "products", label: "Products", icon: Tag },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-1.5">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground/60 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors" />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-green-500" : "bg-muted border border-border"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent shrink-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/60" />
        <div className="w-8 h-8 rounded-lg border border-border shrink-0" style={{ backgroundColor: value }} />
      </div>
    </Field>
  );
}

function DateTimeInput({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const local = value ? new Date(value).toISOString().slice(0, 16) : "";
  return (
    <Field label={label}>
      <input type="datetime-local" value={local}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60" />
      {value && <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(value).toLocaleString()}</p>}
    </Field>
  );
}

function EventModal({ event, onClose, onSave }: { event: Partial<Event> | null; onClose: () => void; onSave: (data: Partial<Event>) => void }) {
  const [form, setForm] = useState<Partial<Event>>(event ?? { type: "custom", bannerColor: "#ff6600", textColor: "#ffffff", accentColor: "#ffffff", isActive: false, countdownEnabled: false, homepageEnabled: false, popupEnabled: false, priority: 0 });
  const [section, setSection] = useState("basics");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Event>(key: K, val: Event[K]) => setForm((f) => ({ ...f, [key]: val }));

  const applyPreset = (p: typeof PRESETS[0]) => {
    setForm((f) => ({
      ...f, type: p.type, bannerColor: p.color,
      bannerText: p.banner, bannerSubtext: p.subtext,
      badgeText: p.badge, name: f.name || p.label,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const color = form.bannerColor || "#ff6600";
  const textColor = form.textColor || "#ffffff";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ ease: EASE, duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-t-3xl sm:rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
              {event?.id ? "Editing Event" : "New Event"}
            </p>
            <h2 className="font-black text-lg uppercase tracking-tight">{form.name || "Untitled Event"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Live status preview */}
            <div className="h-7 px-3 rounded-full flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
              style={{ backgroundColor: `${color}18`, color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {form.isActive ? "Active" : "Draft"}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Section nav */}
        <div className="flex gap-1 px-4 py-3 border-b border-border overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
          {EVENT_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all ${section === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {section === "basics" && (
            <>
              <Field label="Event Type">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.type} onClick={() => applyPreset(p)}
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${form.type === p.type ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/40"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Event Name">
                <TextInput value={form.name ?? ""} onChange={(v) => set("name", v)} placeholder="e.g. Summer Flash Sale 2026" />
              </Field>

              <Field label="Discount % (optional)" hint="Leave blank for no discount badge">
                <TextInput value={form.discountPercent ?? ""} onChange={(v) => set("discountPercent", v || null as unknown as string)} placeholder="e.g. 25" />
              </Field>

              <Field label="Priority" hint="Lower number = higher priority when events overlap">
                <TextInput value={String(form.priority ?? 0)} onChange={(v) => set("priority", Number(v) as unknown as number)} type="number" />
              </Field>

              <div className="flex flex-wrap gap-4">
                <Toggle value={form.isActive ?? false} onChange={(v) => set("isActive", v)} label="Active" />
                <Toggle value={form.homepageEnabled ?? false} onChange={(v) => set("homepageEnabled", v)} label="Homepage takeover" />
                <Toggle value={form.popupEnabled ?? false} onChange={(v) => set("popupEnabled", v)} label="Show popup" />
                <Toggle value={form.countdownEnabled ?? false} onChange={(v) => set("countdownEnabled", v)} label="Countdown timer" />
              </div>
            </>
          )}

          {section === "visuals" && (
            <>
              <ColorInput value={form.bannerColor ?? "#ff6600"} onChange={(v) => set("bannerColor", v)} label="Primary / Banner Color" />
              <ColorInput value={form.textColor ?? "#ffffff"} onChange={(v) => set("textColor", v)} label="Text Color" />
              <ColorInput value={form.accentColor ?? "#ffffff"} onChange={(v) => set("accentColor", v)} label="Accent / Button Color" />

              <Field label="Event Logo URL" hint="Small logo shown in the banner and popup">
                <TextInput value={form.logoUrl ?? ""} onChange={(v) => set("logoUrl", v || null as unknown as string)} placeholder="https://..." />
                {form.logoUrl && <img src={form.logoUrl} className="h-8 mt-2 object-contain" alt="logo" />}
              </Field>

              <Field label="Background Image URL" hint="Used behind the banner and homepage takeover">
                <TextInput value={form.backgroundImageUrl ?? ""} onChange={(v) => set("backgroundImageUrl", v || null as unknown as string)} placeholder="https://..." />
                {form.backgroundImageUrl && (
                  <div className="h-16 mt-2 rounded-lg overflow-hidden border border-border">
                    <img src={form.backgroundImageUrl} className="w-full h-full object-cover" alt="bg" />
                  </div>
                )}
              </Field>

              <Field label="Product Badge Text" hint="Shown on product cards during the event">
                <TextInput value={form.badgeText ?? ""} onChange={(v) => set("badgeText", v || null as unknown as string)} placeholder="e.g. SALE · EID OFFER · NEW DROP" />
              </Field>

              {/* Badge preview */}
              {form.badgeText && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Badge preview:</span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm"
                    style={{ backgroundColor: form.bannerColor ?? "#ff6600", color: form.textColor ?? "#ffffff" }}>
                    {form.badgeText}
                  </span>
                </div>
              )}
            </>
          )}

          {section === "banner" && (
            <>
              <Field label="Banner Headline">
                <TextInput value={form.bannerText ?? ""} onChange={(v) => set("bannerText", v || null as unknown as string)} placeholder="e.g. FLASH SALE — 30% OFF EVERYTHING!" />
              </Field>
              <Field label="Banner Subtext">
                <TextInput value={form.bannerSubtext ?? ""} onChange={(v) => set("bannerSubtext", v || null as unknown as string)} placeholder="e.g. Ends midnight tonight" />
              </Field>
              <Field label="CTA Button Text">
                <TextInput value={form.ctaText ?? ""} onChange={(v) => set("ctaText", v || null as unknown as string)} placeholder="e.g. Shop Now" />
              </Field>
              <Field label="CTA Button URL">
                <TextInput value={form.ctaUrl ?? ""} onChange={(v) => set("ctaUrl", v || null as unknown as string)} placeholder="e.g. /shop" />
              </Field>

              {/* Live banner preview */}
              {(form.bannerText || form.name) && (
                <Field label="Banner Preview">
                  <div className="rounded-xl overflow-hidden border border-border">
                    <div className="px-6 py-3 flex items-center justify-center gap-3 flex-wrap text-sm"
                      style={{
                        backgroundColor: color,
                        backgroundImage: form.backgroundImageUrl ? `linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url(${form.backgroundImageUrl})` : undefined,
                        backgroundSize: "cover",
                      }}>
                      <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: textColor }} />
                      <span className="font-black uppercase tracking-widest text-xs" style={{ color: textColor }}>{form.bannerText || form.name}</span>
                      {form.discountPercent && <span className="font-black text-xs px-2 py-0.5 rounded-sm" style={{ backgroundColor: `${form.accentColor ?? "#fff"}22`, color: form.accentColor ?? "#fff", border: `1px solid ${form.accentColor ?? "#fff"}44` }}>{form.discountPercent}% OFF</span>}
                      {form.ctaText && <span className="text-xs font-black px-2 py-0.5 rounded-sm" style={{ backgroundColor: form.accentColor ?? "#fff", color: color }}>{form.ctaText}</span>}
                    </div>
                  </div>
                </Field>
              )}
            </>
          )}

          {section === "homepage" && (
            <>
              <Toggle value={form.homepageEnabled ?? false} onChange={(v) => set("homepageEnabled", v)} label="Enable homepage takeover banner" />

              <Field label="Headline" hint="Large title shown on the homepage banner">
                <TextInput value={form.homepageTitle ?? ""} onChange={(v) => set("homepageTitle", v || null as unknown as string)} placeholder="e.g. SUMMER SALE IS HERE" />
              </Field>
              <Field label="Subtitle">
                <TextInput value={form.homepageSubtitle ?? ""} onChange={(v) => set("homepageSubtitle", v || null as unknown as string)} placeholder="e.g. Up to 50% off selected items" />
              </Field>

              {/* Homepage preview */}
              {(form.homepageTitle || form.bannerText) && (
                <Field label="Homepage Banner Preview">
                  <div className="rounded-xl overflow-hidden border border-border p-5"
                    style={{ backgroundColor: color, backgroundImage: form.backgroundImageUrl ? `linear-gradient(135deg, ${color}ee, ${color}88), url(${form.backgroundImageUrl})` : undefined, backgroundSize: "cover" }}>
                    <p className="text-xs font-black uppercase tracking-[0.25em] mb-1 opacity-70" style={{ color: form.accentColor ?? "#fff" }}>{form.name}</p>
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-1" style={{ color: textColor }}>{form.homepageTitle || form.bannerText}</h3>
                    {form.homepageSubtitle && <p className="text-xs opacity-70" style={{ color: textColor }}>{form.homepageSubtitle}</p>}
                    {form.discountPercent && <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black" style={{ backgroundColor: `${form.accentColor ?? "#fff"}22`, color: form.accentColor ?? "#fff" }}>{form.discountPercent}% OFF — Limited Time</div>}
                    {form.ctaText && <div className="mt-3 inline-block px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest" style={{ backgroundColor: form.accentColor ?? "#fff", color }}>{form.ctaText} →</div>}
                  </div>
                </Field>
              )}
            </>
          )}

          {section === "popup" && (
            <>
              <Toggle value={form.popupEnabled ?? false} onChange={(v) => set("popupEnabled", v)} label="Show popup when event is active" />

              <Field label="Popup Message">
                <textarea value={form.popupText ?? ""} onChange={(e) => set("popupText", e.target.value || null as unknown as string)}
                  placeholder="e.g. Don't miss our biggest sale! 30% off all streetwear this weekend only."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 resize-none" />
              </Field>

              <Field label="Popup Image URL" hint="Optional image shown at the top of the popup">
                <TextInput value={form.popupImageUrl ?? ""} onChange={(v) => set("popupImageUrl", v || null as unknown as string)} placeholder="https://..." />
                {form.popupImageUrl && (
                  <div className="h-24 mt-2 rounded-lg overflow-hidden border border-border">
                    <img src={form.popupImageUrl} className="w-full h-full object-cover" alt="popup" />
                  </div>
                )}
              </Field>
            </>
          )}

          {section === "schedule" && (
            <>
              <Toggle value={form.countdownEnabled ?? false} onChange={(v) => set("countdownEnabled", v)} label="Show countdown timer" />
              <DateTimeInput value={form.startAt ?? null} onChange={(v) => set("startAt", v as string)} label="Start Date & Time" />
              <DateTimeInput value={form.endAt ?? null} onChange={(v) => set("endAt", v as string)} label="End Date & Time" />

              {form.startAt && form.endAt && (
                <div className="p-3 bg-muted/50 border border-border/50 rounded-xl text-xs text-muted-foreground">
                  <p className="font-bold mb-1">Auto-schedule summary:</p>
                  <p>• Event <strong className="text-foreground">activates</strong> on {new Date(form.startAt).toLocaleString()}</p>
                  <p>• Event <strong className="text-foreground">ends</strong> on {new Date(form.endAt).toLocaleString()}</p>
                  <p className="mt-1 text-primary/70">All changes revert automatically when the end date is reached.</p>
                </div>
              )}
            </>
          )}

          {section === "products" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Specify comma-separated product IDs and category IDs to highlight during this event.</p>

              <Field label="Featured Product IDs" hint="Comma-separated IDs, e.g. 1,2,5,12">
                <TextInput
                  value={((form.config as Record<string, unknown>)?.featuredProductIds as string[] | undefined)?.join(", ") ?? ""}
                  onChange={(v) => set("config", { ...(form.config ?? {}), featuredProductIds: v.split(",").map((s) => s.trim()).filter(Boolean) } as Record<string, unknown>)}
                  placeholder="1, 4, 7, 12"
                />
              </Field>

              <Field label="Featured Category IDs" hint="Comma-separated IDs, e.g. 1,3">
                <TextInput
                  value={((form.config as Record<string, unknown>)?.featuredCategoryIds as string[] | undefined)?.join(", ") ?? ""}
                  onChange={(v) => set("config", { ...(form.config ?? {}), featuredCategoryIds: v.split(",").map((s) => s.trim()).filter(Boolean) } as Record<string, unknown>)}
                  placeholder="2, 5"
                />
              </Field>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground">
                <p className="font-bold text-primary mb-1">How this works:</p>
                <p>Products and categories you list here will be highlighted with a special border and event badge when the event is active. Set the badge text in the Visuals tab.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 fire-gradient font-black uppercase tracking-widest"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : event?.id ? "Save Changes" : "Create Event"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function EventStatusBadge({ event }: { event: Event }) {
  const now = new Date();
  const started = !event.startAt || new Date(event.startAt) <= now;
  const ended = event.endAt && new Date(event.endAt) < now;
  const isLive = event.isActive && started && !ended;
  const isScheduled = event.isActive && !started;

  if (ended) return <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 bg-muted px-2 py-0.5 rounded-sm">Expired</span>;
  if (isLive) return <span className="text-[10px] font-black uppercase tracking-wider text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-sm flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Live</span>;
  if (isScheduled) return <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-sm">Scheduled</span>;
  return <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">Inactive</span>;
}

function EventCard({ event, onToggle, onDelete, onEdit, onDuplicate, onMoveUp, onMoveDown }: {
  event: Event; onToggle: () => void; onDelete: () => void; onEdit: () => void;
  onDuplicate: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const color = event.bannerColor ?? "#ff6600";

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ ease: EASE }}
      className="rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: event.isActive ? `${color}40` : undefined }}>

      {/* Color accent top bar */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <div className="p-4 bg-card">
        <div className="flex items-start gap-3">
          {/* Priority reorder */}
          <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
            <button onClick={onMoveUp} className="w-6 h-5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowUp className="h-3 w-3" />
            </button>
            <button onClick={onMoveDown} className="w-6 h-5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-black text-sm uppercase tracking-wide">{event.name}</h3>
              <EventStatusBadge event={event} />
              {event.discountPercent && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-sm" style={{ color, backgroundColor: `${color}18` }}>
                  {event.discountPercent}% OFF
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground/70 mb-2 truncate">{event.bannerText || "No banner text set"}</p>

            <div className="flex flex-wrap items-center gap-2">
              {event.homepageEnabled && <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-sm font-bold"><Layout className="h-2.5 w-2.5" />Homepage</span>}
              {event.popupEnabled && <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-sm font-bold"><Bell className="h-2.5 w-2.5" />Popup</span>}
              {event.countdownEnabled && <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-sm font-bold"><Timer className="h-2.5 w-2.5" />Countdown</span>}
              {event.badgeText && <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-sm font-bold"><Tag className="h-2.5 w-2.5" />{event.badgeText}</span>}
              {event.startAt && <span className="text-[10px] text-muted-foreground/50">{new Date(event.startAt).toLocaleDateString()} →</span>}
              {event.endAt && <span className="text-[10px] text-muted-foreground/50">{new Date(event.endAt).toLocaleDateString()}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onToggle} title={event.isActive ? "Deactivate" : "Activate"}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${event.isActive ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : "bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
              {event.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            </button>
            <button onClick={onDuplicate} title="Duplicate" className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState<Partial<Event> | null | false>(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    fetch(`${BASE}/api/events`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setEvents(d as Event[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (event: Event) => {
    await fetch(`${BASE}/api/events/${event.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !event.isActive }) });
    load();
    toast({ title: event.isActive ? "Event deactivated" : "Event activated!" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event permanently?")) return;
    await fetch(`${BASE}/api/events/${id}`, { method: "DELETE", credentials: "include" });
    load();
    toast({ title: "Event deleted" });
  };

  const handleDuplicate = async (id: number) => {
    await fetch(`${BASE}/api/events/${id}/duplicate`, { method: "POST", credentials: "include" });
    load();
    toast({ title: "Event duplicated!" });
  };

  const handleSave = async (data: Partial<Event>) => {
    const isNew = !data.id;
    const method = isNew ? "POST" : "PATCH";
    const url = isNew ? `${BASE}/api/events` : `${BASE}/api/events/${data.id}`;
    await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setEditEvent(false);
    load();
    toast({ title: isNew ? "Event created!" : "Event saved!" });
  };

  const handleMoveUp = async (event: Event, index: number) => {
    if (index === 0) return;
    const other = events[index - 1];
    await Promise.all([
      fetch(`${BASE}/api/events/${event.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: other.priority }) }),
      fetch(`${BASE}/api/events/${other.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: event.priority }) }),
    ]);
    load();
  };

  const handleMoveDown = async (event: Event, index: number) => {
    if (index >= events.length - 1) return;
    const other = events[index + 1];
    await Promise.all([
      fetch(`${BASE}/api/events/${event.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: other.priority }) }),
      fetch(`${BASE}/api/events/${other.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: event.priority }) }),
    ]);
    load();
  };

  const liveCount = events.filter((e) => {
    const now = new Date();
    return e.isActive && (!e.startAt || new Date(e.startAt) <= now) && (!e.endAt || new Date(e.endAt) > now);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Event Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create events that automatically transform your store — banners, popups, countdowns, badges and homepage takeovers.
            {liveCount > 0 && <span className="text-green-400 font-bold ml-2">● {liveCount} live</span>}
          </p>
        </div>
        <Button onClick={() => setEditEvent({})} className="fire-gradient font-black uppercase tracking-widest shrink-0">
          <Plus className="h-4 w-4 mr-2" /> New Event
        </Button>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Megaphone, label: "Banner", desc: "Slim top bar across entire site" },
          { icon: Layout, label: "Homepage", desc: "Full-width takeover on home page" },
          { icon: Bell, label: "Pop-up", desc: "Session popup with image & CTA" },
          { icon: Tag, label: "Badge", desc: "Label all products during event" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="font-black text-xs uppercase tracking-wider">{label}</p>
            <p className="text-[11px] text-muted-foreground/70 leading-tight">{desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Zap className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-black uppercase text-muted-foreground">No events yet</p>
          <p className="text-sm text-muted-foreground/50 mt-1 mb-6">Create your first event — it will automatically activate on the scheduled date</p>
          <Button className="fire-gradient font-black" onClick={() => setEditEvent({})}>
            <Plus className="h-4 w-4 mr-2" /> Create First Event
          </Button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {events.map((e, i) => (
              <EventCard key={e.id} event={e}
                onToggle={() => handleToggle(e)}
                onDelete={() => handleDelete(e.id)}
                onEdit={() => setEditEvent(e)}
                onDuplicate={() => handleDuplicate(e.id)}
                onMoveUp={() => handleMoveUp(e, i)}
                onMoveDown={() => handleMoveDown(e, i)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {editEvent !== false && (
          <EventModal event={editEvent} onClose={() => setEditEvent(false)} onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  );
}
