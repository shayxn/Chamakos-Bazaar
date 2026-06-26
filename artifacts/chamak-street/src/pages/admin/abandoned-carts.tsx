import { useState, useEffect } from "react";
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

  const load = () => {
    fetch(`${BASE}/api/abandoned-carts`, { credentials: "include" })
      .then(r => r.json()).then((d: { carts: AbandonedCart[]; stats: Stats }) => {
        setCarts(d.carts);
        setStats(d.stats);
      }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
        <p className="text-muted-foreground font-mono text-sm">Carts with contact info captured at checkout</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Abandoned</p>
          <p className="text-3xl font-black font-mono text-primary">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">With Contact Info</p>
          <p className="text-3xl font-black font-mono text-green-400">{stats.withEmail}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Lost Revenue</p>
          <p className="text-3xl font-black font-mono text-red-400">AED {stats.totalValue.toFixed(0)}</p>
        </div>
      </div>

      <div className="bg-card border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-yellow-400">How Abandoned Carts Are Tracked</p>
          <p className="text-xs text-muted-foreground mt-1">When customers start filling in their details at checkout (name, phone), their cart is automatically tracked here. You can follow up manually via WhatsApp.</p>
        </div>
      </div>

      {carts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">No abandoned carts tracked yet</p>
          <p className="text-xs text-muted-foreground mt-2">Carts appear here when customers start checkout but don't complete it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map(c => {
            let cartItems: { name: string; qty: number; price: number }[] = [];
            try { if (c.cartData) cartItems = JSON.parse(c.cartData); } catch {}
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {c.hasActiveCart && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-orange-400 bg-orange-500/10 border-orange-500/30">
                          Cart Still Active
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.updatedAt).toLocaleDateString()} {new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {c.customerName && <p className="font-black">{c.customerName}</p>}
                    <div className="flex flex-wrap gap-3 mt-1">
                      {c.customerPhone && (
                        <a href={`https://wa.me/${c.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-green-400 hover:underline font-bold">
                          <Phone className="h-3.5 w-3.5" /> {c.customerPhone}
                        </a>
                      )}
                      {c.customerEmail && (
                        <a href={`mailto:${c.customerEmail}`} className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline font-bold">
                          <Mail className="h-3.5 w-3.5" /> {c.customerEmail}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.totalValue != null && (
                      <p className="font-mono font-black text-lg text-primary">AED {c.totalValue.toFixed(0)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{c.itemCount} item{c.itemCount !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <div className="bg-muted/40 rounded-lg p-3 mb-3 text-xs space-y-1">
                    {cartItems.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                        <span className="font-mono font-bold">AED {(item.price * item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => markRecovered(c.id)} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Recovered
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(c.id)} className="text-xs text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
