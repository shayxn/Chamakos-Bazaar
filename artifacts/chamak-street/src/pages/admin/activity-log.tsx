import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type LogEntry = { id: number; admin_name: string; action: string; order_ref: string | null; details: string | null; created_at: string };

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/admin/activity-log`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: LogEntry[]) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Real-time updates
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${BASE}/api/admin/activity-log/stream`, { withCredentials: true });
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === "ACTIVITY") setLogs(prev => [d, ...prev].slice(0, 100));
        } catch {}
      };
    } catch {}

    return () => { es?.close(); };
  }, []);

  const getStatusColor = (action: string) => {
    if (action === "cancelled") return "text-red-400";
    if (action === "delayed") return "text-orange-400";
    if (action === "delivered") return "text-green-400";
    if (action === "shipped" || action === "out_for_delivery") return "text-primary";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-primary" />
        <h1 className="font-black text-xl uppercase tracking-widest">Activity Log</h1>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-4 rounded-xl border border-white/8 hover:border-white/15 transition-colors"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-black text-primary">
                {log.admin_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-bold">{log.admin_name}</span>
                  {" changed "}
                  {log.order_ref && <span className="font-mono text-primary">#{log.order_ref}</span>}
                  {" to "}
                  <span className={`font-black uppercase ${getStatusColor(log.action)}`}>{log.action.replace(/_/g, " ")}</span>
                </p>
                {log.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>}
              </div>
              <div className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {new Date(log.created_at).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
