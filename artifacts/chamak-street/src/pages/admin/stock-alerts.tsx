import { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle, Trash2, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Alert = {
  id: number; productId: number; phone: string;
  name: string | null; notified: boolean;
  createdAt: string; productName: string | null;
};

export default function AdminStockAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = () => {
    const controller = new AbortController();
    fetch(`${BASE}/api/stock-alerts`, { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (mountedRef.current) { setAlerts(d as Alert[]); setLoading(false); } })
      .catch(() => { if (mountedRef.current) setLoading(false); });
    return controller;
  };

  useEffect(() => {
    const ctrl = load();
    return () => ctrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markNotified = async (id: number) => {
    await fetch(`${BASE}/api/stock-alerts/${id}/notified`, { method: "PATCH", credentials: "include" });
    load();
    toast({ title: "Marked as notified" });
  };

  const deleteAlert = async (id: number) => {
    await fetch(`${BASE}/api/stock-alerts/${id}`, { method: "DELETE", credentials: "include" });
    load();
    toast({ title: "Alert removed" });
  };

  const pending = alerts.filter((a) => !a.notified);
  const done = alerts.filter((a) => a.notified);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Back in Stock Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customers who want to be notified when out-of-stock products return.
          {pending.length > 0 && <span className="text-primary font-bold ml-2">● {pending.length} pending</span>}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Bell className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
          <p className="font-black uppercase text-muted-foreground">No alerts yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Alerts appear when customers request stock notifications</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-primary mb-3">Pending ({pending.length})</h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {pending.map((a) => (
                    <motion.div key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-4 p-4 border border-primary/20 bg-primary/5 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{a.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">{a.productName || `Product #${a.productId}`}</p>
                        <a href={`https://wa.me/${a.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-0.5 font-medium">
                          <Phone className="h-3 w-3" /> {a.phone}
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground/60 shrink-0 hidden sm:block">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => markNotified(a.id)} title="Mark as notified"
                          className="w-8 h-8 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 flex items-center justify-center transition-colors">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteAlert(a.id)} title="Delete"
                          className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">Notified ({done.length})</h2>
              <div className="space-y-2">
                {done.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 p-4 border border-border bg-card rounded-xl opacity-60">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{a.name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{a.productName || `Product #${a.productId}`} · {a.phone}</p>
                    </div>
                    <button onClick={() => deleteAlert(a.id)}
                      className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
