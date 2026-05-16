import { useGetStoreStats, getGetStoreStatsQueryKey } from "@workspace/api-client-react";
import { Package, ShoppingBag, DollarSign, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetStoreStats({ query: { queryKey: getGetStoreStatsQueryKey() } });

  if (isLoading) return <div>Loading dashboard...</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Command Center</h1>
        <p className="text-muted-foreground font-mono text-sm">Store overview & performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5">
            <DollarSign className="w-32 h-32" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Total Revenue</p>
          <p className="text-4xl font-black font-mono text-primary">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5">
            <ShoppingBag className="w-32 h-32" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Total Orders</p>
          <p className="text-4xl font-black font-mono">{stats.totalOrders}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5">
            <Package className="w-32 h-32" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Products</p>
          <p className="text-4xl font-black font-mono">{stats.totalProducts}</p>
        </div>

        <div className="bg-card border border-destructive/50 p-6 rounded-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-destructive">
            <AlertTriangle className="w-32 h-32" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-destructive mb-2">Pending Orders</p>
          <p className="text-4xl font-black font-mono text-destructive">{stats.pendingOrders || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="font-bold uppercase tracking-wider">Recent Orders</h3>
            <Link href="/admin/orders" className="text-primary text-sm font-bold hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentOrders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No recent orders</div>
            ) : (
              stats.recentOrders.map(order => (
                <div key={order.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-bold font-mono">#{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-primary">${order.total.toFixed(2)}</p>
                    <span className="text-xs uppercase tracking-wider bg-secondary px-2 py-1 rounded mt-1 inline-block">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="font-bold uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Low Stock Alerts
            </h3>
            <Link href="/admin/products" className="text-primary text-sm font-bold hover:underline">Manage Inventory</Link>
          </div>
          <div className="divide-y divide-border">
            {stats.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Inventory looks good.</div>
            ) : (
              stats.lowStockProducts.map(product => (
                <div key={product.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded overflow-hidden">
                      {product.imageUrl && <img src={product.imageUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{product.categoryName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-destructive px-2 py-1 bg-destructive/10 rounded border border-destructive/20">
                      {product.stock} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
