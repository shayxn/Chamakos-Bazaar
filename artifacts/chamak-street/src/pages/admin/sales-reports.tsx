import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Users, Package, BarChart3, Calendar } from "lucide-react";

type ReportData = {
  summary: {
    allTime: { revenue: number; orders: number };
    today: { revenue: number; orders: number };
    week: { revenue: number; orders: number };
    month: { revenue: number; orders: number };
  };
  bestProducts: { name: string; qty: number; revenue: number }[];
  topCustomers: { name: string; email: string; orders: number; spent: number }[];
  dailySales: { day: string; revenue: number; orders: number }[];
  statusBreakdown: { status: string; count: number }[];
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ElementType; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
      <div className={`absolute -right-3 -top-3 opacity-5 ${accent ?? ""}`}>
        <Icon className="w-24 h-24" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-black font-mono text-primary">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function SalesReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "allTime">("month");

  useEffect(() => {
    fetch(`${BASE}/api/sales/reports`, { credentials: "include" })
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center text-muted-foreground">Failed to load reports.</div>;

  const s = data.summary[period];

  const maxRevenue = Math.max(...data.dailySales.map(d => d.revenue), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Sales Reports</h1>
        <p className="text-muted-foreground font-mono text-sm">Revenue, orders, and performance analytics</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["today", "week", "month", "allTime"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg border transition-all ${period === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            {p === "allTime" ? "All Time" : p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={`AED ${s.revenue.toFixed(0)}`} sub={period === "today" ? "today" : `this ${period}`} icon={DollarSign} />
        <StatCard label="Orders" value={String(s.orders)} icon={ShoppingBag} />
        <StatCard label="All-Time Revenue" value={`AED ${data.summary.allTime.revenue.toFixed(0)}`} icon={TrendingUp} />
        <StatCard label="All-Time Orders" value={String(data.summary.allTime.orders)} icon={BarChart3} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Daily Revenue — Last 30 Days
        </h3>
        {data.dailySales.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No sales data yet</p>
        ) : (
          <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
            {data.dailySales.map(d => (
              <div key={d.day} className="flex flex-col items-center gap-1 min-w-[20px] group" title={`${d.day}: AED ${d.revenue.toFixed(0)}`}>
                <div className="w-4 bg-primary/80 rounded-sm transition-all group-hover:bg-primary"
                  style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 112)}px` }} />
                <p className="text-[8px] text-muted-foreground rotate-45 origin-left whitespace-nowrap" style={{ marginTop: 2 }}>
                  {d.day.slice(5)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-black uppercase tracking-wider">Best-Selling Products</h3>
          </div>
          <div className="divide-y divide-border">
            {data.bestProducts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No data yet</p>
            ) : data.bestProducts.map((p, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-black text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <p className="font-bold text-sm truncate">{p.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-sm text-primary">AED {p.revenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{p.qty} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-black uppercase tracking-wider">Top Customers</h3>
          </div>
          <div className="divide-y divide-border">
            {data.topCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No data yet</p>
            ) : data.topCustomers.map((c, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-sm text-primary">AED {c.spent.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{c.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-black uppercase tracking-wider">Order Status Breakdown</h3>
        </div>
        <div className="p-5 flex flex-wrap gap-3">
          {data.statusBreakdown.map(s => (
            <div key={s.status} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border">
              <span className="font-black text-lg font-mono">{s.count}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
