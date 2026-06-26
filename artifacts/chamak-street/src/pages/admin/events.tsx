import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Zap, Clock, Edit3, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type Event = {
  id: number; name: string; type: string;
  bannerText: string | null; bannerSubtext: string | null;
  bannerColor: string | null; discountPercent: string | null;
  startAt: string | null; endAt: string | null;
  isActive: boolean; createdAt: string;
};

const EVENT_PRESETS = [
  { type: "flash_sale", label: "⚡ Flash Sale", color: "#ff3300", banner: "FLASH SALE — Limited Time!", subtext: "Shop now before it ends" },
  { type: "gta_launch", label: "🎮 GTA VI Launch", color: "#bf00ff", banner: "GTA VI IS LIVE — Pre-Order Now", subtext: "Secure your copy today" },
  { type: "ramadan", label: "🌙 Ramadan", color: "#b8860b", banner: "Ramadan Kareem — Special Offers", subtext: "Blessed discounts all month" },
  { type: "eid", label: "🌙 Eid Sale", color: "#d4af37", banner: "EID MUBARAK — Eid Sale is Live!", subtext: "Celebrate with style" },
  { type: "black_friday", label: "🛍️ Black Friday", color: "#111111", banner: "BLACK FRIDAY — Biggest Sale of the Year", subtext: "Limited time only" },
  { type: "cyber_monday", label: "💻 Cyber Monday", color: "#0066ff", banner: "CYBER MONDAY DEALS ARE LIVE", subtext: "Shop the best deals online" },
  { type: "uae_national_day", label: "🇦🇪 UAE National Day", color: "#00732f", banner: "Happy UAE National Day 🇦🇪", subtext: "Celebrating 53 years of pride" },
  { type: "back_to_school", label: "📚 Back to School", color: "#ff6600", banner: "BACK TO SCHOOL SALE", subtext: "Look fresh this semester" },
  { type: "summer_sale", label: "☀️ Summer Sale", color: "#ff8c00", banner: "SUMMER SALE IS HERE", subtext: "Hot drops, cool prices" },
  { type: "winter_sale", label: "❄️ Winter Sale", color: "#4169e1", banner: "WINTER SALE — Warm up your wardrobe", subtext: "New season, new style" },
  { type: "custom", label: "✨ Custom Event", color: "#ff6600", banner: "Special Offer", subtext: "" },
];

function EventCard({ event, onToggle, onDelete, onEdit }: {
  event: Event;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const endDate = event.endAt ? new Date(event.endAt) : null;
  const isExpired = endDate ? endDate < new Date() : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ ease: EASE }}
      className={`rounded-xl border p-5 transition-all ${
        event.isActive && !isExpired
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-4 h-4 rounded-full mt-1 shrink-0" style={{ backgroundColor: event.bannerColor ?? "#ff6600" }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm uppercase tracking-wider truncate">{event.name}</h3>
              {isExpired ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/10 px-2 py-0.5 rounded-sm">Expired</span>
              ) : event.isActive ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Live
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">Inactive</span>
              )}
              {event.discountPercent && (
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{event.discountPercent}% OFF</span>
              )}
            </div>
            {event.bannerText && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{event.bannerText}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/60 font-medium flex-wrap">
              {event.startAt && (
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Start: {new Date(event.startAt).toLocaleDateString()}</span>
              )}
              {event.endAt && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />End: {new Date(event.endAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggle}
            title={event.isActive ? "Deactivate" : "Activate"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              event.isActive ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : "bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10"
            }`}
          >
            {event.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          </button>
          <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EventModal({ event, onClose, onSave }: {
  event: Partial<Event> | null;
  onClose: () => void;
  onSave: (data: Partial<Event>) => void;
}) {
  const [form, setForm] = useState<Partial<Event>>(event ?? { type: "custom", bannerColor: "#ff6600", isActive: false });
  const preset = EVENT_PRESETS.find((p) => p.type === form.type);

  const applyPreset = (p: typeof EVENT_PRESETS[0]) => {
    setForm((f) => ({ ...f, type: p.type, bannerColor: p.color, bannerText: p.banner, bannerSubtext: p.subtext, name: f.name || p.label }));
  };

  useEffect(() => {
    if (preset && !form.name) setForm((f) => ({ ...f, name: preset.label }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
      >
        <h2 className="font-black text-lg uppercase tracking-wider">{event?.id ? "Edit Event" : "New Event"}</h2>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 block">Event Type</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_PRESETS.map((p) => (
              <button key={p.type} onClick={() => applyPreset(p)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${form.type === p.type ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/40"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {[
          { key: "name", label: "Event Name", placeholder: "e.g. Summer Flash Sale" },
          { key: "bannerText", label: "Banner Headline", placeholder: "e.g. FLASH SALE — 30% OFF EVERYTHING!" },
          { key: "bannerSubtext", label: "Banner Subtext", placeholder: "e.g. Ends midnight tonight" },
          { key: "discountPercent", label: "Discount %", placeholder: "e.g. 30" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
            <input
              value={(form as Record<string, string>)[key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Banner Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.bannerColor ?? "#ff6600"}
              onChange={(e) => setForm((f) => ({ ...f, bannerColor: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
            <span className="text-sm text-muted-foreground font-mono">{form.bannerColor}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "startAt", label: "Start Date & Time" },
            { key: "endAt", label: "End Date & Time" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
              <input
                type="datetime-local"
                value={(form as Record<string, string>)[key] ? new Date((form as Record<string, string>)[key]).toISOString().slice(0, 16) : ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "left-6" : "left-0.5"}`} />
          </button>
          <span className="text-sm font-bold">{form.isActive ? "Active" : "Inactive"}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 fire-gradient font-black uppercase tracking-widest" onClick={() => onSave(form)}>
            {event?.id ? "Save Changes" : "Create Event"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState<Partial<Event> | null | false>(false);
  const { toast } = useToast();

  const load = () => {
    fetch(`${BASE}/api/events`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setEvents(d as Event[]); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (event: Event) => {
    await fetch(`${BASE}/api/events/${event.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !event.isActive }),
    });
    load();
    toast({ title: event.isActive ? "Event deactivated" : "Event activated!" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`${BASE}/api/events/${id}`, { method: "DELETE", credentials: "include" });
    load();
    toast({ title: "Event deleted" });
  };

  const handleSave = async (data: Partial<Event>) => {
    const method = data.id ? "PATCH" : "POST";
    const url = data.id ? `${BASE}/api/events/${data.id}` : `${BASE}/api/events`;
    await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditEvent(false);
    load();
    toast({ title: data.id ? "Event updated!" : "Event created!" });
  };

  const activeCount = events.filter((e) => e.isActive).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Activate events to show banners, countdowns, and promotions across the store.
            {activeCount > 0 && <span className="text-green-400 font-bold ml-2">● {activeCount} live event{activeCount > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Button onClick={() => setEditEvent({})} className="fire-gradient font-black uppercase tracking-widest shrink-0">
          <Plus className="h-4 w-4 mr-2" /> New Event
        </Button>
      </div>

      {/* Preview of active event banner */}
      {events.filter((e) => e.isActive).map((e) => (
        <div key={e.id} className="rounded-xl overflow-hidden border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2 bg-muted border-b border-border">Live Banner Preview</p>
          <div className="px-6 py-3 text-center font-black uppercase tracking-widest text-sm text-white flex items-center justify-center gap-3" style={{ backgroundColor: e.bannerColor ?? "#ff6600" }}>
            <Zap className="h-4 w-4" />
            {e.bannerText || e.name}
            {e.discountPercent && <span className="bg-white/20 px-2 py-0.5 rounded-sm text-xs">{e.discountPercent}% OFF</span>}
            {e.bannerSubtext && <span className="text-white/70 text-xs font-medium">{e.bannerSubtext}</span>}
          </div>
        </div>
      ))}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Zap className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
          <p className="font-black uppercase text-muted-foreground">No events yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create your first event to show banners and promotions</p>
          <Button className="mt-6 fire-gradient font-black" onClick={() => setEditEvent({})}>
            <Plus className="h-4 w-4 mr-2" /> Create First Event
          </Button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {events.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                onToggle={() => handleToggle(e)}
                onDelete={() => handleDelete(e.id)}
                onEdit={() => setEditEvent(e)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {editEvent !== false && (
        <EventModal
          event={editEvent}
          onClose={() => setEditEvent(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
