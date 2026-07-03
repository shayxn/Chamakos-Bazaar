import { useGetStoreStats, getGetStoreStatsQueryKey } from "@workspace/api-client-react";
import { Package, ShoppingBag, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  shipped: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  delivered: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
  sub?: string;
  href?: string;
}) {
  const card = (
    <motion.div
      whileHover={href ? { y: -2, boxShadow: "0 8px 32px rgba(255,102,0,0.12)" } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`bg-card border rounded-xl p-6 relative overflow-hidden transition-colors ${accent === "danger" ? "border-destructive/40" : "border-border hover:border-primary/30"}`}
    >
      <div className="absolute -right-4 -top-4 opacity-[0.04]">
        <Icon className="w-28 h-28" />
      </div>
      <p className={`text-xs font-black uppercase tracking-widest mb-3 ${accent === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`text-4xl font-black font-mono ${accent === "danger" ? "text-destructive" : accent === "primary" ? "text-primary" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-2 font-mono">{sub}</p>}
      {href && (
        <div className="absolute bottom-4 right-4 text-primary/40 group-hover:text-primary transition-colors">
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
  if (href) return <Link href={href} className="group block">{card}</Link>;
  return card;
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
      <div className="h-3 w-24 bg-muted rounded mb-4" />
      <div className="h-10 w-32 bg-muted rounded" />
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
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">Command Center</h1>
        <p className="text-muted-foreground font-mono text-sm">Real-time store performance</p>
      </div>

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
            />
            <StatCard
              label="Total Orders"
              value={stats.totalOrders}
              icon={ShoppingBag}
              href="/admin/orders"
            />
            <StatCard
              label="Products"
              value={stats.totalProducts}
              icon={Package}
              href="/admin/products"
            />
            <StatCard
              label="Pending Orders"
              value={stats.pendingOrders || pendingCount || 0}
              icon={AlertTriangle}
              accent={(stats.pendingOrders || pendingCount) > 0 ? "danger" : undefined}
              sub={(stats.pendingOrders || pendingCount) > 0 ? "Needs attention" : "All caught up"}
              href="/admin/orders"
            />
          </>
        ) : null}
      </div>

      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Processing", value: processingCount, icon: Clock, color: "text-blue-400" },
            { label: "Delivered", value: orders.filter((o: any) => o.status === "delivered").length, icon: CheckCircle2, color: "text-green-400" },
            { label: "Cancelled", value: orders.filter((o: any) => o.status === "cancelled").length, icon: XCircle, color: "text-red-400" },
            { label: "Low Stock Items", value: stats.lowStockProducts.length, icon: TrendingUp, color: "text-orange-400" },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
              <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
              <div>
                <p className="text-lg font-black font-mono">{item.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-black uppercase tracking-wider text-sm">Recent Orders</h3>
            <Link href="/admin/orders" className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-75 transition-opacity flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {orders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              orders.slice(0, 7).map((order: any) => (
                <Link key={order.id} href="/admin/orders">
                  <div className="px-6 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold font-mono text-sm">#{order.id}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground border-border"}`}>
                        {order.status}
                      </span>
                      <span className="font-mono font-bold text-sm text-primary whitespace-nowrap">
                        AED {Number(order.total).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Low Stock
            </h3>
            <Link href="/admin/products" className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-75 transition-opacity">
              Manage
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {!stats || stats.lowStockProducts.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Inventory is healthy</p>
              </div>
            ) : (
              stats.lowStockProducts.slice(0, 6).map((product) => {
                const media = getPrimaryProductMedia(product.imageUrl);
                return (
                  <Link key={product.id} href="/admin/products">
                    <div className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="w-9 h-9 bg-muted rounded-lg overflow-hidden shrink-0 border border-border">
                        {media ? (
                          media.type === "video" ? (
                            <video src={media.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <img src={media.url} className="w-full h-full object-cover" alt="" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs line-clamp-1">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.categoryName || "Uncategorized"}</p>
                      </div>
                      <span className={`font-mono font-black text-xs px-2 py-1 rounded border shrink-0 ${
                        product.stock === 0
                          ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : "bg-orange-500/15 text-orange-400 border-orange-500/30"
                      }`}>
                        {product.stock === 0 ? "Out" : `${product.stock} left`}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/products", label: "Manage Products", icon: Package, desc: "Add, edit, or remove products" },
          { href: "/admin/orders", label: "View All Orders", icon: ShoppingBag, desc: "Process and update order status" },
          { href: "/admin/sales-reports", label: "Sales Reports", icon: TrendingUp, desc: "Revenue analytics & insights" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <motion.div
              whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(255,102,0,0.14)" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-card border border-border hover:border-primary/30 rounded-xl p-5 flex items-center gap-4 cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <item.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm uppercase tracking-wide group-hover:text-primary transition-colors">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 ml-auto shrink-0 transition-colors" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
