/* @refresh reset */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Monitor, Smartphone, Tablet, Clock, Globe, RefreshCw, Trash2,
  Users, Activity, TrendingUp, X, Wifi, WifiOff, Search, ShoppingCart,
  CreditCard, CheckCircle, LogIn, Eye, ArrowRight, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Types ────────────────────────────────────────────────────────────────────
interface ActivityEvent {
  type: "visit" | "page" | "search" | "cart" | "checkout" | "order" | "login" | "logout" | string;
  label: string;
  ts: number;
}

interface VisitorSession {
  id: number;
  session_id: string;
  device_type: string | null;
  device_os: string | null;
  browser: string | null;
  screen_width: number | null;
  screen_height: number | null;
  referrer: string | null;
  entry_page: string | null;
  events: string | null;
  duration_seconds: number | null;
  first_seen_at: string;
  last_seen_at: string;
  // Enhanced
  current_page: string | null;
  search_terms: string | null;
  cart_count: number | null;
  cart_value: string | null;
  is_logged_in: boolean | null;
  customer_email: string | null;
  checkout_started: boolean | null;
  order_completed: string | null;
  activity_log: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function DeviceIcon({ type }: { type: string | null }) {
  if (type === "mobile") return <Smartphone className="h-4 w-4 text-orange-400" />;
  if (type === "tablet") return <Tablet className="h-4 w-4 text-blue-400" />;
  return <Monitor className="h-4 w-4 text-green-400" />;
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
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isOnline(lastSeenAt: string) {
  return Date.now() - new Date(lastSeenAt).getTime() < 3 * 60_000; // 3 min
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getActivityIcon(type: string) {
  switch (type) {
    case "visit":    return <Globe className="h-3 w-3 text-primary" />;
    case "page":     return <Eye className="h-3 w-3 text-blue-400" />;
    case "search":   return <Search className="h-3 w-3 text-yellow-400" />;
    case "cart":     return <ShoppingCart className="h-3 w-3 text-green-400" />;
    case "checkout": return <CreditCard className="h-3 w-3 text-purple-400" />;
    case "order":    return <CheckCircle className="h-3 w-3 text-primary" />;
    case "login":    return <LogIn className="h-3 w-3 text-cyan-400" />;
    default:         return <Activity className="h-3 w-3 text-white/30" />;
  }
}

function parseJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminVisitors() {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, mobile: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorSession | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "mobile" | "desktop" | "active">("all");
  const [sseStatus, setSseStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/visitor-sessions?limit=200`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
        setStats(data.stats ?? { total: 0, today: 0, mobile: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── SSE real-time updates ───────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

    const es = new EventSource(`${BASE}/api/visitor-sessions/stream`, { withCredentials: true });
    sseRef.current = es;
    setSseStatus("connecting");

    es.onopen = () => setSseStatus("connected");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected") { setSseStatus("connected"); return; }
        if (data.type === "session_update" && data.session) {
          const s: VisitorSession = data.session;
          setSessions(prev => {
            const idx = prev.findIndex(x => x.id === s.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = s;
              return next.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
            }
            return [s, ...prev].sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
          });
          setStats(prev => ({ ...prev, total: Math.max(prev.total, 1) }));
          // Update selected panel too
          setSelected(prev => prev?.id === s.id ? s : prev);
        }
        if (data.type === "session_delete" && data.id) {
          setSessions(prev => prev.filter(x => x.id !== data.id));
          setSelected(prev => prev?.id === data.id ? null : prev);
        }
      } catch {}
    };

    es.onerror = () => {
      setSseStatus("disconnected");
      es.close();
      sseRef.current = null;
      reconnectTimer.current = setTimeout(connectSSE, 5000);
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      sseRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connectSSE]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteSession = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/visitor-sessions/${id}`, { method: "DELETE", credentials: "include" });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } finally { setDeletingId(null); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeCount = sessions.filter(s => isOnline(s.last_seen_at)).length;

  const filteredSessions = sessions.filter(s => {
    if (filter === "mobile")  return s.device_type === "mobile";
    if (filter === "desktop") return s.device_type === "desktop" || !s.device_type;
    if (filter === "active")  return isOnline(s.last_seen_at);
    return true;
  });

  const activityLog = selected
    ? parseJson<ActivityEvent[]>(selected.activity_log, []).slice().reverse()
    : [];
  const searchTerms = selected
    ? parseJson<string[]>(selected.search_terms, [])
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
            Live Customers
            <AnimatePresence mode="wait">
              {sseStatus === "connected" ? (
                <motion.span key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/25 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </motion.span>
              ) : (
                <motion.span key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 px-2 py-0.5 rounded-full">
                  {sseStatus === "connecting" ? "Connecting…" : "Reconnecting…"}
                </motion.span>
              )}
            </AnimatePresence>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time visitor sessions with live activity tracking.</p>
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
          { label: "Total Sessions", value: stats.total, icon: Users, color: "text-primary",    bg: "bg-primary/8" },
          { label: "Last 24h",       value: stats.today, icon: Clock, color: "text-green-400",  bg: "bg-green-400/8" },
          { label: "Online Now",     value: activeCount, icon: Wifi,  color: "text-blue-400",   bg: "bg-blue-400/8" },
          { label: "Mobile",         value: stats.mobile, icon: Smartphone, color: "text-orange-400", bg: "bg-orange-400/8" },
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
            {f === "all" ? `All (${sessions.length})` : f === "active" ? `Online (${activeCount})` : f}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 items-start flex-col lg:flex-row">

        {/* Sessions list */}
        <div className={`${selected ? "lg:w-80 xl:w-96" : "flex-1"} min-w-0 rounded-xl border border-white/8 overflow-hidden transition-all`}
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Sessions ({filteredSessions.length})
            </p>
            <p className="text-[10px] text-muted-foreground/50">Click to inspect</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
              <p className="text-xs text-muted-foreground/50">Sessions appear automatically when customers visit FirstPick.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[70vh]">
              <AnimatePresence mode="popLayout">
                {filteredSessions.map((s, i) => {
                  const online = isOnline(s.last_seen_at);
                  const isSelected = selected?.id === s.id;
                  const searches = parseJson<string[]>(s.search_terms, []);
                  return (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i < 10 ? i * 0.03 : 0, ease: EASE }}
                      onClick={() => setSelected(isSelected ? null : s)}
                      className={`flex items-start gap-3 px-4 py-3.5 border-b border-white/5 cursor-pointer transition-all relative ${
                        isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-white/3"
                      }`}
                    >
                      {/* Online dot */}
                      <div className="relative shrink-0 mt-0.5">
                        <DeviceIcon type={s.device_type} />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${online ? "bg-green-400" : "bg-white/20"}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row: OS + time */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate">
                            {s.device_os ?? s.device_type ?? "Unknown"} · {s.browser ?? "—"}
                          </span>
                          <span className={`text-[10px] shrink-0 ${online ? "text-green-400" : "text-muted-foreground/50"}`}>
                            {online ? "Online" : timeAgo(s.last_seen_at)}
                          </span>
                        </div>

                        {/* Current page */}
                        {s.current_page && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate flex items-center gap-1">
                            <Eye className="h-2.5 w-2.5 shrink-0" />
                            {s.current_page}
                          </p>
                        )}

                        {/* Extra chips */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {s.is_logged_in && (
                            <span className="text-[9px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <LogIn className="h-2 w-2" /> {s.customer_email ? s.customer_email.split("@")[0] : "Logged in"}
                            </span>
                          )}
                          {(s.cart_count ?? 0) > 0 && (
                            <span className="text-[9px] bg-green-400/10 text-green-400 border border-green-400/25 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <ShoppingCart className="h-2 w-2" /> {s.cart_count} · AED {Number(s.cart_value ?? 0).toFixed(0)}
                            </span>
                          )}
                          {s.checkout_started && (
                            <span className="text-[9px] bg-purple-400/10 text-purple-400 border border-purple-400/25 px-1.5 py-0.5 rounded font-bold">
                              Checkout
                            </span>
                          )}
                          {s.order_completed && (
                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-bold">
                              ✓ {s.order_completed}
                            </span>
                          )}
                          {searches[0] && (
                            <span className="text-[9px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 px-1.5 py-0.5 rounded font-bold truncate max-w-[80px]">
                              🔍 {searches[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete + chevron */}
                      <div className="flex items-center gap-1 shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                          onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                          disabled={deletingId === s.id}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          aria-label="Delete session"
                        >
                          <Trash2 className="h-3 w-3" />
                        </motion.button>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/30 transition-transform ${isSelected ? "rotate-90 text-primary" : ""}`} />
                      </div>
                    </motion.div>
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
              key={selected.id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ ease: EASE, duration: 0.3 }}
              className="flex-1 min-w-0 rounded-xl border border-white/10 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <DeviceIcon type={selected.device_type} />
                  <div>
                    <p className="text-sm font-black">{selected.device_os ?? "Unknown"} · {selected.browser ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selected.screen_width && selected.screen_height ? `${selected.screen_width}×${selected.screen_height} · ` : ""}
                      Session {selected.session_id.slice(0, 12)}…
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOnline(selected.last_seen_at) ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60">Last seen {timeAgo(selected.last_seen_at)}</span>
                  )}
                  <button onClick={() => setSelected(null)}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground/40 hover:text-foreground rounded-lg hover:bg-white/5 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">

                {/* Status chips */}
                <div className="flex flex-wrap gap-2">
                  {selected.is_logged_in ? (
                    <span className="flex items-center gap-1.5 text-xs bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 px-3 py-1.5 rounded-full font-bold">
                      <LogIn className="h-3 w-3" /> {selected.customer_email ?? "Logged in"}
                    </span>
                  ) : (
                    <span className="text-xs bg-white/5 text-muted-foreground border border-white/10 px-3 py-1.5 rounded-full font-bold">Guest</span>
                  )}
                  {(selected.cart_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5 text-xs bg-green-400/10 text-green-400 border border-green-400/25 px-3 py-1.5 rounded-full font-bold">
                      <ShoppingCart className="h-3 w-3" /> {selected.cart_count} items · AED {Number(selected.cart_value ?? 0).toFixed(0)}
                    </span>
                  )}
                  {selected.checkout_started && (
                    <span className="flex items-center gap-1.5 text-xs bg-purple-400/10 text-purple-400 border border-purple-400/25 px-3 py-1.5 rounded-full font-bold">
                      <CreditCard className="h-3 w-3" /> Checkout started
                    </span>
                  )}
                  {selected.order_completed && (
                    <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/25 px-3 py-1.5 rounded-full font-bold">
                      <CheckCircle className="h-3 w-3" /> {selected.order_completed}
                    </span>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Current Page", value: selected.current_page ?? "Unknown" },
                    { label: "Entry Page", value: selected.entry_page ?? "—" },
                    { label: "Duration", value: formatDuration(selected.duration_seconds) },
                    { label: "Session Start", value: new Date(selected.first_seen_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
                    { label: "Referrer", value: selected.referrer ? selected.referrer.replace(/^https?:\/\//, "").slice(0, 30) : "Direct" },
                    { label: "Screen", value: selected.screen_width ? `${selected.screen_width}×${selected.screen_height}` : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-3 border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">{label}</p>
                      <p className="text-xs font-bold truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent searches */}
                {searchTerms.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                      <Search className="h-3 w-3" /> Recent Searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {searchTerms.map((q, i) => (
                        <span key={i} className="text-[11px] bg-yellow-400/8 text-yellow-400 border border-yellow-400/20 px-2.5 py-1 rounded-lg font-bold">
                          "{q}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
                    <Activity className="h-3 w-3" /> Activity Timeline
                  </p>
                  {activityLog.length === 0 ? (
                    <p className="text-xs text-muted-foreground/40 italic">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-0">
                      {activityLog.slice(0, 40).map((ev, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                          {/* Timeline line */}
                          {i < activityLog.length - 1 && (
                            <div className="absolute left-[11px] top-5 bottom-0 w-px bg-white/6" />
                          )}
                          <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {getActivityIcon(ev.type)}
                          </div>
                          <div className="flex-1 min-w-0 pb-3">
                            <p className="text-[11px] text-white/80 leading-snug">{ev.label}</p>
                            <p className="text-[9px] text-muted-foreground/50 mt-0.5">{formatTime(ev.ts)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
