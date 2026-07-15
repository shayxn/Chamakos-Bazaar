import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Users, Package, BarChart3, Calendar, RefreshCw, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

type ReportData = {
  summary: {
    allTime: { revenue: number; orders: number };
    today:   { revenue: number; orders: number };
    week:    { revenue: number; orders: number };
    month:   { revenue: number; orders: number };
  };
  bestProducts: { name: string; qty: number; revenue: number }[];
  topCustomers: { name: string; email: string; orders: number; spent: number }[];
  dailySales:   { day: string; revenue: number; orders: number }[];
  statusBreakdown: { status: string; count: number }[];
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20   text-blue-400   border-blue-500/30",
  shipped:   "bg-purple-500/20 text-purple-400  border-purple-500/30",
  delivered: "bg-green-500/20  text-green-400   border-green-500/30",
  cancelled: "bg-red-500/20    text-red-400     border-red-500/30",
};

function StatCard({ label, value, sub, icon: Icon, accent = "text-primary" }:
  { label: string; value: string; sub?: string; icon: React.ElementType; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="bg-card border border-border rounded-xl p-5 relative overflow-hidden"
    >
      <div className="absolute -right-2 -top-2 opacity-[0.04]">
        <Icon className="w-20 h-20" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p className={`text-3xl font-black font-mono ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function SalesReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "allTime">("month");
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    fetch(`${BASE}/api/sales/reports`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
      />
      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Loading reports…</p>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-muted-foreground font-bold">Failed to load reports</p>
      <button onClick={load} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary border border-primary/30 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );

  const s = data.summary[period];
  const maxRevenue = Math.max(...data.dailySales.map(d => d.revenue), 1);
  const maxOrders  = Math.max(...data.dailySales.map(d => d.orders), 1);

  const periodLabel = { today: "Today", week: "This Week", month: "This Month", allTime: "All Time" }[period];

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Sales Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Revenue, orders, and performance analytics</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-primary px-3 py-2 rounded-lg transition-all">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 flex-wrap p-1 bg-white/3 rounded-xl w-fit border border-white/6">
        {(["today", "week", "month", "allTime"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`relative px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
              period === p ? "text-black" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {period === p && (
              <motion.span layoutId="period-bg" className="absolute inset-0 rounded-lg fire-gradient"
                transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <span className="relative z-10">
              {p === "allTime" ? "All Time" : p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </span>
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <AnimatePresence mode="wait">
        <motion.div key={period} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={`Revenue (${periodLabel})`} value={`AED ${s.revenue.toFixed(0)}`}
            sub={`${s.orders} order${s.orders !== 1 ? "s" : ""}`} icon={DollarSign} />
          <StatCard label="Orders" value={String(s.orders)} icon={ShoppingBag} accent="text-blue-400" />
          <StatCard label="All-Time Revenue" value={`AED ${data.summary.allTime.revenue.toFixed(0)}`}
            icon={TrendingUp} accent="text-green-400" />
          <StatCard label="All-Time Orders" value={String(data.summary.allTime.orders)} icon={BarChart3} accent="text-purple-400" />
        </motion.div>
      </AnimatePresence>

      {/* Daily Revenue Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-primary" /> Daily Revenue — Last 30 Days
        </h3>
        {data.dailySales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <BarChart3 className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No sales data yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Y-axis hints */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
              <span className="text-[9px] text-muted-foreground/40 font-mono">AED {Math.round(maxRevenue)}</span>
              <span className="text-[9px] text-muted-foreground/40 font-mono">0</span>
            </div>
            <div className="ml-14 overflow-x-auto">
              <div className="flex items-end gap-1.5 h-36 min-w-[400px]">
                {data.dailySales.map((d, i) => {
                  const h = Math.max(4, (d.revenue / maxRevenue) * 120);
                  const isHovered = hoveredDay === i;
                  return (
                    <div key={d.day} className="flex flex-col items-center gap-1 flex-1 group cursor-pointer"
                      onMouseEnter={() => setHoveredDay(i)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {isHovered && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold whitespace-nowrap pointer-events-none z-10">
                          <span className="text-primary">AED {d.revenue.toFixed(0)}</span>
                          <span className="text-muted-foreground ml-1">· {d.orders} orders</span>
                        </div>
                      )}
                      <div className="relative w-full flex flex-col items-center">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: h }}
                          transition={{ duration: 0.5, delay: i * 0.015, ease: EASE }}
                          className={`w-full rounded-sm transition-colors ${isHovered ? "bg-primary" : "bg-primary/60"}`}
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground/40 rotate-45 origin-left whitespace-nowrap mt-1">
                        {d.day.slice(5)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Best Products + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-black uppercase tracking-wider text-sm">Best-Selling Products</h3>
          </div>
          {data.bestProducts.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No data yet</div>
          ) : (
            <div className="divide-y divide-border">
              {data.bestProducts.map((p, i) => {
                const pct = data.bestProducts[0]?.revenue > 0 ? (p.revenue / data.bestProducts[0].revenue) * 100 : 0;
                return (
                  <div key={i} className="px-5 py-3 flex items-center gap-3 group hover:bg-white/2 transition-colors">
                    <span className={`text-xs font-black w-5 shrink-0 ${i === 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {i === 0 ? "🏆" : `#${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      <div className="h-1 mt-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}
                          className="h-full bg-primary/60 rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-sm text-primary">AED {p.revenue.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">{p.qty} sold</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h3 className="font-black uppercase tracking-wider text-sm">Top Customers</h3>
          </div>
          {data.topCustomers.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No data yet</div>
          ) : (
            <div className="divide-y divide-border">
              {data.topCustomers.map((c, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/2 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                    i === 0 ? "bg-yellow-400/20 text-yellow-400" : "bg-white/5 text-muted-foreground"
                  }`}>
                    {c.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{c.name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-black text-sm text-primary">AED {c.spent.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h3 className="font-black uppercase tracking-wider text-sm">Order Status Breakdown</h3>
        </div>
        {data.statusBreakdown.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No orders yet</div>
        ) : (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.statusBreakdown.map(s => {
              const total = data.statusBreakdown.reduce((acc, x) => acc + x.count, 0);
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.status} className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl border ${STATUS_COLORS[s.status] ?? "bg-white/5 text-muted-foreground border-white/10"}`}>
                  <span className="font-black text-2xl font-mono">{s.count}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-80">{s.status}</span>
                  <span className="text-[10px] opacity-60">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
