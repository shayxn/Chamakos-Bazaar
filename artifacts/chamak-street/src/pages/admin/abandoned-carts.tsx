import { useState, useEffect, useRef } from "react";
import { ShoppingCart, CheckCircle, Trash2, Phone, Mail, DollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AbandonedCart = {
  id: number; sessionId: string; customerName: string | null; customerPhone: string | null;
  customerEmail: string | null; cartData: string | null; totalValue: number | null;
  itemCount: number; recovered: boolean; hasActiveCart: boolean; updatedAt: string; createdAt: string;
};
type Stats = { total: number; withEmail: number; totalValue: number };

export default function AbandonedCarts() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, withEmail: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = () => {
    const controller = new AbortController();
    fetch(`${BASE}/api/abandoned-carts`, { credentials: "include", signal: controller.signal })
      .then(r => r.json()).then((d: { carts: AbandonedCart[]; stats: Stats }) => {
        if (!mountedRef.current) return;
        setCarts(d.carts);
        setStats(d.stats);
      }).catch(() => {}).finally(() => { if (mountedRef.current) setLoading(false); });
    return controller;
  };

  useEffect(() => {
    const ctrl = load();
    return () => ctrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markRecovered = async (id: number) => {
    await fetch(`${BASE}/api/abandoned-carts/${id}/recover`, { method: "POST", credentials: "include" });
    toast({ title: "Marked as recovered" });
    load();
  };

  const dismiss = async (id: number) => {
    await fetch(`${BASE}/api/abandoned-carts/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Dismissed" });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
          <ShoppingCart className="h-7 w-7 text-primary" /> Abandoned Cart Recovery
        </h1>
        <p className="text-muted-foreground font-mono text-sm">{stats.total} total · {stats.withEmail} with email</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary/60" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Carts</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Mail className="h-8 w-8 text-blue-500/60" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">With Email</p>
            <p className="text-2xl font-black">{stats.withEmail}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-green-500/60" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Value</p>
            <p className="text-2xl font-black">AED {stats.totalValue?.toFixed(0) ?? 0}</p>
          </div>
        </div>
      </div>

      {carts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">No abandoned carts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map(c => (
            <div key={c.id} className={`bg-card border rounded-xl p-4 ${c.recovered ? "border-green-500/20 opacity-60" : "border-border"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {c.recovered && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-green-400 bg-green-500/10 border-green-500/30">
                        Recovered
                      </span>
                    )}
                    {!c.recovered && c.hasActiveCart && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-yellow-400 bg-yellow-500/10 border-yellow-500/30">
                        Active
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-bold text-sm">{c.customerName || "Unknown Customer"}</p>
                  {c.customerEmail && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{c.customerEmail}</p>
                  )}
                  {c.customerPhone && (
                    <a href={`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-400 flex items-center gap-1 hover:text-green-300">
                      <Phone className="h-3 w-3" />{c.customerPhone}
                    </a>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-black text-primary">{c.itemCount} item{c.itemCount !== 1 ? "s" : ""}</span>
                    {c.totalValue != null && <span className="text-xs text-muted-foreground">AED {c.totalValue.toFixed(2)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!c.recovered && (
                    <Button size="sm" onClick={() => markRecovered(c.id)} className="text-xs bg-green-600 hover:bg-green-700 text-white h-8">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Recover
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => dismiss(c.id)} className="text-destructive h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
