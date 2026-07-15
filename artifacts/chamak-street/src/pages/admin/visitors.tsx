import { useState, useEffect, useCallback } from "react";
import { Monitor, Smartphone, Tablet, Clock, Globe, RefreshCw, Trash2, Users, Activity, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

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
  if (type === "mobile") return <Smartphone className="h-3.5 w-3.5 text-orange-400" />;
  if (type === "tablet") return <Tablet className="h-3.5 w-3.5 text-blue-400" />;
  return <Monitor className="h-3.5 w-3.5 text-green-400" />;
}

function formatDuration(secs: number | null) {
  if (!secs || secs < 1) return "< 1s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60), s = secs % 60;
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
  return `${Math.floor(h / 24)}d ago`;
}

function isActive(lastSeenAt: string) {
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60_000;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function AdminVisitors() {
  const [data, setData] = useState<{ sessions: VisitorSession[]; stats: { total: number; today: number; mobile: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorSession | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "mobile" | "desktop" | "active">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/visitor-sessions?limit=200`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteSession = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/visitor-sessions/${id}`, { method: "DELETE", credentials: "include" });
      setData(d => d ? { ...d, sessions: d.sessions.filter(s => s.id !== id) } : d);
      if (selected?.id === id) setSelected(null);
    } finally {
      setDeletingId(null);
    }
  };

  const events = selected?.events ? (() => { try { return JSON.parse(selected.events!); } catch { return []; } })() : [];

  const filteredSessions = (data?.sessions ?? []).filter(s => {
    if (filter === "mobile")  return s.deviceType === "mobile";
    if (filter === "desktop") return s.deviceType === "desktop" || !s.deviceType;
    if (filter === "active")  return isActive(s.lastSeenAt);
    return true;
  });

  const activeCount = (data?.sessions ?? []).filter(s => isActive(s.lastSeenAt)).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Visitors</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time visitor sessions and activity</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={load} disabled={loading}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-primary px-3 py-2 rounded-lg transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: data?.stats.total ?? 0,  icon: Users,      color: "text-primary",    bg: "bg-primary/8" },
          { label: "Last 24h",       value: data?.stats.today ?? 0,  icon: Clock,      color: "text-green-400",  bg: "bg-green-400/8" },
          { label: "Active Now",     value: activeCount,             icon: Activity,   color: "text-blue-400",   bg: "bg-blue-400/8" },
          { label: "Mobile",         value: data?.stats.mobile ?? 0, icon: Smartphone, color: "text-orange-400", bg: "bg-orange-400/8" },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: EASE }}
            className={`rounded-xl p-5 border border-white/8 ${bg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{label}</span>
            </div>
            <p className={`text-3xl font-black font-mono ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "mobile", "desktop"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg border transition-all ${
              filter === f ? "bg-primary text-black border-primary" : "border-white/10 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}>
            {f === "all" ? `All (${data?.sessions.length ?? 0})` : f === "active" ? `Active Now (${activeCount})` : f}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        {/* Sessions list */}
        <div className="flex-1 min-w-0 rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Sessions ({filteredSessions.length})
            </p>
            {filteredSessions.length > 0 && (
              <p className="text-[10px] text-muted-foreground/50">Click to inspect</p>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="text-xs text-muted-foreground font-bold">Loading…</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {filter !== "all" ? `No ${filter} sessions` : "No visitor sessions yet."}
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[580px] overflow-y-auto">
              <AnimatePresence>
                {filteredSessions.map((s, i) => {
                  const active = isActive(s.lastSeenAt);
                  const evCount = s.events ? (() => { try { return JSON.parse(s.events).length; } catch { return 0; } })() : 0;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setSelected(s)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors ${
                        selected?.id === s.id ? "bg-primary/8 border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <DeviceIcon type={s.deviceType} />
                        {active && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-black" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold truncate">
                            {s.deviceOs ?? "Unknown OS"} · {s.browser ?? "?"}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{timeAgo(s.lastSeenAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="truncate">{s.entryPage ?? "/"}</span>
                          <span className="shrink-0">⏱ {formatDuration(s.durationSeconds)}</span>
                          {evCount > 0 && <span className="shrink-0">{evCount} actions</span>}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Session detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="w-80 shrink-0 rounded-xl border border-white/8 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Session Detail</p>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.15, color: "#ef4444" }} whileTap={{ scale: 0.85 }}
                    onClick={() => deleteSession(selected.id)}
                    disabled={deletingId === selected.id}
                    className="text-muted-foreground/50 hover:text-red-400 transition-colors disabled:opacity-40 p-1 rounded"
                  >
                    {deletingId === selected.id
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </motion.button>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground/50 hover:text-foreground p-1 rounded transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {isActive(selected.lastSeenAt) && (
                    <div className="col-span-2 flex items-center gap-2 py-1.5 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-green-400">Active now</span>
                    </div>
                  )}
                  <InfoBox label="Device" value={`${selected.deviceType ?? "?"}`} />
                  <InfoBox label="OS" value={`${selected.deviceOs ?? "?"}`} />
                  <InfoBox label="Browser" value={selected.browser ?? "Unknown"} />
                  <InfoBox label="Screen" value={selected.screenWidth ? `${selected.screenWidth}×${selected.screenHeight}` : "?"} />
                  <InfoBox label="Duration" value={formatDuration(selected.durationSeconds)} />
                  <InfoBox label="Entry" value={selected.entryPage ?? "/"} />
                </div>
                <InfoBox label="Referrer" value={selected.referrer || "Direct"} />
                <InfoBox label="First seen" value={new Date(selected.firstSeenAt).toLocaleString()} />
                <InfoBox label="Last seen"  value={new Date(selected.lastSeenAt).toLocaleString()} />

                {events.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                      Actions ({events.length})
                    </p>
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {events.map((ev: any, i: number) => (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.025 }}
                          className="flex items-start gap-2 text-[10px] py-1 border-b border-white/4"
                        >
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            ev.type === "click" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                          }`}>{ev.type}</span>
                          <span className="text-muted-foreground flex-1 truncate">{ev.label}</span>
                          <span className="text-muted-foreground/40 shrink-0">{new Date(ev.ts).toLocaleTimeString()}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/2 rounded-lg px-3 py-2 border border-white/5">
      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70 mb-0.5">{label}</p>
      <p className="text-xs text-foreground break-all leading-snug">{value}</p>
    </div>
  );
}
