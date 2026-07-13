import { useState, useEffect } from "react";
import { Monitor, Smartphone, Tablet, Clock, MousePointer, Globe, RefreshCw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VisitorSession {
  id: number;
  sessionId: string;
  deviceType: string | null;
  deviceOs: string | null;
  browser: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  referrer: string | null;
  entryPage: string | null;
  events: string | null;
  durationSeconds: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "mobile") return <Smartphone className="h-4 w-4 text-orange-400" />;
  if (type === "tablet") return <Tablet className="h-4 w-4 text-blue-400" />;
  return <Monitor className="h-4 w-4 text-green-400" />;
}

function formatDuration(secs: number | null) {
  if (!secs) return "< 1s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const BASE = import.meta.env.BASE_URL ?? "/";

export default function AdminVisitors() {
  const [data, setData] = useState<{ sessions: VisitorSession[]; stats: { total: number; today: number; mobile: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorSession | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/visitor-sessions?limit=100`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteSession = async (id: number) => {
    await fetch(`${BASE}api/visitor-sessions/${id}`, { method: "DELETE", credentials: "include" });
    setData((d) => d ? { ...d, sessions: d.sessions.filter(s => s.id !== id) } : d);
    if (selected?.id === id) setSelected(null);
  };

  const events = selected?.events ? (() => { try { return JSON.parse(selected.events); } catch { return []; } })() : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider gradient-text-animate">Visitors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time visitor sessions and activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="gap-2 border-white/10 hover:border-orange-500/40 text-xs font-bold uppercase tracking-wider">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Sessions", value: data.stats.total, icon: Users, color: "text-orange-400" },
            { label: "Last 24h", value: data.stats.today, icon: Clock, color: "text-green-400" },
            { label: "Mobile", value: data.stats.mobile, icon: Smartphone, color: "text-blue-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4 border border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{label}</span>
              </div>
              <p className="text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* Sessions list */}
        <div className="flex-1 min-w-0 rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Sessions ({data?.sessions.length ?? 0})</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
            </div>
          ) : (data?.sessions.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No visitor sessions yet.</div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {data!.sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/4 transition-colors ${selected?.id === s.id ? "bg-orange-500/8 border-l-2 border-orange-500" : ""}`}
                >
                  <DeviceIcon type={s.deviceType} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold truncate">{s.deviceOs ?? "Unknown OS"} · {s.browser ?? "?"}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{timeAgo(s.lastSeenAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="truncate">{s.entryPage ?? "/"}</span>
                      <span className="shrink-0">⏱ {formatDuration(s.durationSeconds)}</span>
                      {s.events && (() => { try { const e = JSON.parse(s.events); return <span className="shrink-0">{e.length} actions</span>; } catch { return null; } })()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Session detail */}
        {selected && (
          <div className="w-80 shrink-0 rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Session Detail</p>
              <button onClick={() => deleteSession(selected.id)} className="text-red-400 hover:text-red-300 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              <Row label="Device" value={`${selected.deviceType ?? "?"} · ${selected.deviceOs ?? "?"}`} />
              <Row label="Browser" value={selected.browser ?? "Unknown"} />
              <Row label="Screen" value={selected.screenWidth ? `${selected.screenWidth}×${selected.screenHeight}` : "?"} />
              <Row label="Entry page" value={selected.entryPage ?? "/"} />
              <Row label="Referrer" value={selected.referrer || "Direct"} />
              <Row label="Duration" value={formatDuration(selected.durationSeconds)} />
              <Row label="First seen" value={new Date(selected.firstSeenAt).toLocaleString()} />
              <Row label="Last seen" value={new Date(selected.lastSeenAt).toLocaleString()} />

              {events.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Actions ({events.length})</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {events.map((ev: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-[10px]">
                        <span className={`shrink-0 px-1 py-0.5 rounded text-[9px] font-bold uppercase ${ev.type === "click" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                          {ev.type}
                        </span>
                        <span className="text-muted-foreground truncate flex-1">{ev.label}</span>
                        <span className="text-muted-foreground/50 shrink-0">{new Date(ev.ts).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground break-all mt-0.5">{value}</p>
    </div>
  );
}
