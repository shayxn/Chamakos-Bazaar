import { useGetStoreStats, getGetStoreStatsQueryKey } from "@workspace/api-client-react";
import { Package, ShoppingBag, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { getPrimaryProductMedia } from "@/lib/product-media";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:    { bg: "rgba(234,179,8,0.12)",   text: "#eab308", border: "rgba(234,179,8,0.3)" },
  processing: { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  shipped:    { bg: "rgba(168,85,247,0.12)",  text: "#c084fc", border: "rgba(168,85,247,0.3)" },
  delivered:  { bg: "rgba(34,197,94,0.12)",   text: "#4ade80", border: "rgba(34,197,94,0.3)" },
  cancelled:  { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)" },
};

const ACCENT = "#ff6600";
const ACCENT_GOLD = "#ffcc00";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  href,
  glowColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
  sub?: string;
  href?: string;
  glowColor?: string;
}) {
  const glow = glowColor ?? (accent === "primary" ? ACCENT : accent === "danger" ? "#ef4444" : "rgba(255,255,255,0.1)");
  const card = (
    <div
      className="admin-stat-card relative overflow-hidden rounded-2xl p-6 group cursor-default"
      style={{
        background: "linear-gradient(145deg, rgba(18,18,18,1) 0%, rgba(12,12,12,1) 100%)",
        border: `1px solid rgba(255,255,255,0.07)`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${glow}55`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${glow}22, 0 8px 32px ${glow}18`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
    >
      {/* Animated top highlight line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${glow}80, transparent)`,
          animation: `adminShimmer 3s ease-in-out infinite`,
        }}
      />

      {/* Ghost icon */}
      <div className="absolute -right-3 -top-3 opacity-[0.05] transition-opacity duration-300 group-hover:opacity-[0.09]">
        <Icon className="w-24 h-24" style={{ color: glow }} />
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-3 transition-colors duration-300"
        style={{ color: accent === "danger" ? "#ef4444" : "rgba(255,255,255,0.45)" }}>
        {label}
      </p>

      <p
        className="text-4xl font-black font-mono transition-all duration-300"
        style={{
          color: accent === "danger" ? "#ef4444" : accent === "primary" ? ACCENT : "white",
          ...(accent === "primary" ? { animation: "revenueGlow 3s ease-in-out infinite" } : {}),
        }}
      >
        {value}
      </p>

      {sub && (
        <p className="text-[11px] font-mono mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>
      )}

      {href && (
        <div className="absolute bottom-4 right-4 opacity-20 group-hover:opacity-60 transition-opacity duration-200">
          <ArrowRight className="h-4 w-4" style={{ color: glow }} />
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href} className="group block">{card}</Link>;
  return card;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 animate-pulse"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="h-2.5 w-20 rounded-full bg-white/8 mb-4" />
      <div className="h-9 w-28 rounded-lg bg-white/8" />
    </div>
  );
}

function MiniStatBadge({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = `${color}10`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color }} />
      <div>
        <p className="text-lg font-black font-mono" style={{ color }}>{value}</p>
        <p className="text-[9px] uppercase tracking-[0.2em] font-black" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetStoreStats({ query: { queryKey: getGetStoreStatsQueryKey() } });
  const orders = stats?.recentOrders ?? [];
  const pendingCount = orders.filter((o: any) => o.status === "pending").length;
  const processingCount = orders.filter((o: any) => o.status === "processing").length;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter gradient-text-animate">
            Command Center
          </h1>
        </div>
        <p className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Real-time store performance
        </p>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : stats ? (
          <>
            <StatCard
              label="Total Revenue"
              value={`AED ${(stats.totalRevenue ?? 0).toFixed(0)}`}
              icon={DollarSign}
              accent="primary"
              sub={`${stats.totalOrders} orders placed`}
              glowColor={ACCENT}
            />
            <StatCard
              label="Total Orders"
              value={stats.totalOrders}
              icon={ShoppingBag}
              href="/admin/orders"
              glowColor={ACCENT_GOLD}
            />
            <StatCard
              label="Products"
              value={stats.totalProducts}
              icon={Package}
              href="/admin/products"
              glowColor="#60a5fa"
            />
            <StatCard
              label="Pending Orders"
              value={stats.pendingOrders || pendingCount || 0}
              icon={AlertTriangle}
              accent={(stats.pendingOrders || pendingCount) > 0 ? "danger" : undefined}
              sub={(stats.pendingOrders || pendingCount) > 0 ? "Needs attention" : "All caught up"}
              href="/admin/orders"
              glowColor={(stats.pendingOrders || pendingCount) > 0 ? "#ef4444" : "#4ade80"}
            />
          </>
        ) : null}
      </div>

      {/* Mini stats row */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStatBadge label="Processing" value={processingCount} icon={Clock} color="#60a5fa" />
          <MiniStatBadge label="Delivered" value={orders.filter((o: any) => o.status === "delivered").length} icon={CheckCircle2} color="#4ade80" />
          <MiniStatBadge label="Cancelled" value={orders.filter((o: any) => o.status === "cancelled").length} icon={XCircle} color="#f87171" />
          <MiniStatBadge label="Low Stock" value={stats.lowStockProducts.length} icon={TrendingUp} color={ACCENT} />
        </div>
      )}

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent orders */}
        <div
          className="lg:col-span-3 rounded-2xl overflow-hidden"
          style={{ background: "rgba(12,12,12,1)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-black uppercase tracking-wider text-sm">Recent Orders</h3>
            <Link href="/admin/orders" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors duration-200"
              style={{ color: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT_GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = ACCENT)}>
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div>
            {orders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No orders yet</p>
              </div>
            ) : (
              orders.slice(0, 7).map((order: any, i: number) => {
                const sc = STATUS_COLORS[order.status] ?? { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" };
                return (
                  <Link key={order.id} href="/admin/orders">
                    <div
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer transition-all duration-150"
                      style={{ borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.2)" }}>
                          <ShoppingBag className="h-3 w-3" style={{ color: ACCENT }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold font-mono text-sm">#{order.id}</p>
                          <p className="text-xs truncate max-w-[160px]" style={{ color: "rgba(255,255,255,0.35)" }}>{order.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {order.status}
                        </span>
                        <span className="font-mono font-black text-sm" style={{ color: ACCENT }}>
                          AED {Number(order.total).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Low stock */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: "rgba(12,12,12,1)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />
              Low Stock
            </h3>
            <Link href="/admin/products" className="text-[10px] font-black uppercase tracking-widest transition-colors duration-200"
              style={{ color: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT_GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = ACCENT)}>
              Manage
            </Link>
          </div>
          <div>
            {!stats || stats.lowStockProducts.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(74,222,128,0.35)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Inventory is healthy</p>
              </div>
            ) : (
              stats.lowStockProducts.slice(0, 6).map((product, i) => {
                const media = getPrimaryProductMedia(product.imageUrl);
                const isOut = product.stock === 0;
                return (
                  <Link key={product.id} href="/admin/products">
                    <div
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-150"
                      style={{ borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
                        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                        {media ? (
                          media.type === "video" ? (
                            <video src={media.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <img src={media.url} className="w-full h-full object-cover" alt="" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs line-clamp-1">{product.name}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{product.categoryName || "Uncategorized"}</p>
                      </div>
                      <span
                        className="font-mono font-black text-[10px] px-2 py-1 rounded-full shrink-0"
                        style={{
                          background: isOut ? "rgba(239,68,68,0.12)" : "rgba(255,102,0,0.12)",
                          color: isOut ? "#f87171" : ACCENT,
                          border: `1px solid ${isOut ? "rgba(239,68,68,0.3)" : "rgba(255,102,0,0.3)"}`,
                        }}
                      >
                        {isOut ? "Out" : `${product.stock}`}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/products",      label: "Manage Products", icon: Package,     desc: "Add, edit, or remove products",         color: "#60a5fa" },
          { href: "/admin/orders",         label: "View All Orders", icon: ShoppingBag, desc: "Process and update order status",         color: ACCENT },
          { href: "/admin/sales-reports",  label: "Sales Reports",   icon: TrendingUp,  desc: "Revenue analytics & insights",           color: "#4ade80" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-200 group"
              style={{
                background: "rgba(12,12,12,1)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${item.color}40`;
                (e.currentTarget as HTMLElement).style.background = `${item.color}06`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${item.color}14`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.background = "rgba(12,12,12,1)";
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                <item.icon className="h-4.5 w-4.5 transition-colors" style={{ color: item.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm uppercase tracking-wide transition-colors duration-200 group-hover:text-white"
                  style={{ color: "rgba(255,255,255,0.8)" }}>
                  {item.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{item.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 transition-all duration-200 opacity-20 group-hover:opacity-70 group-hover:translate-x-0.5"
                style={{ color: item.color }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
