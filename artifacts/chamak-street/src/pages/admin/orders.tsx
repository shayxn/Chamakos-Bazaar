import { useState } from "react";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatusUpdateStatus } from "@workspace/api-client-react/generated/api.schemas";
import { Mail, MapPin, MessageCircle, Package, WalletCards } from "lucide-react";

export default function AdminOrders() {
  const { data: orders, isLoading } = useListOrders({ query: { queryKey: getListOrdersQueryKey() } });
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();

  const handleStatusChange = (id: number, status: OrderStatusUpdateStatus) => {
    updateStatus.mutate(
      { id, data: { status } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }) }
    );
  };

  if (isLoading) return <div>Loading orders...</div>;

  const formatPaymentMethod = (method?: string | null) => {
    if (method === "ziina") return "Ziina";
    if (method === "cod") return "Cash on Delivery";
    return method || "Unknown";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Order Management</h1>
        <p className="text-muted-foreground font-mono text-sm">Fulfill and track customer orders</p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-widest bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground">Order ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Customer</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Contact</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Location</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Payment</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Total</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Items</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders?.map(order => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold">#{order.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{order.customerName}</p>
                    <p className="text-muted-foreground text-xs font-mono">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 min-w-48">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span className="break-all">{order.customerEmail || "No email"}</span>
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                        <span>{order.customerPhone || "No WhatsApp"}</span>
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-56">
                    <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                      <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{order.customerAddress || "No address"}</span>
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 rounded border border-border bg-background px-2.5 py-1 text-xs font-black uppercase tracking-wider">
                      <WalletCards className="h-3.5 w-3.5 text-primary" />
                      {formatPaymentMethod(order.paymentMethod)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-primary">
                    AED {order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 min-w-64">
                    <div className="space-y-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span>
                            <span className="font-bold text-foreground">{item.quantity}x</span> {item.productName}
                            {item.size ? ` (${item.size})` : ""} - AED {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Select 
                      defaultValue={order.status} 
                      onValueChange={(val) => handleStatusChange(order.id, val as OrderStatusUpdateStatus)}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className={`h-8 w-36 text-xs font-bold uppercase tracking-wider ${
                        order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                        order.status === 'processing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                        order.status === 'shipped' ? 'bg-primary/10 text-primary border-primary/30' :
                        order.status === 'delivered' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                        'bg-destructive/10 text-destructive border-destructive/30'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="text-xs uppercase font-bold text-yellow-500">Pending</SelectItem>
                        <SelectItem value="processing" className="text-xs uppercase font-bold text-blue-500">Processing</SelectItem>
                        <SelectItem value="shipped" className="text-xs uppercase font-bold text-primary">Shipped</SelectItem>
                        <SelectItem value="delivered" className="text-xs uppercase font-bold text-green-500">Delivered</SelectItem>
                        <SelectItem value="cancelled" className="text-xs uppercase font-bold text-destructive">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
