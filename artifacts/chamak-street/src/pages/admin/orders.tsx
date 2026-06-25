import { useState } from "react";
import { useDeleteOrder, useListOrders, useUpdateOrderStatus, useUpdateOrder, useAddTrackingEvent, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderStatusUpdateStatus } from "@workspace/api-client-react";
import { MapPin, MessageCircle, Package, Trash2, WalletCards, ChevronDown, ChevronUp, Plus, Truck, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  packed: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  shipped: "bg-primary/10 text-primary border-primary/30",
  out_for_delivery: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  delivered: "bg-green-500/10 text-green-400 border-green-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const ALL_STATUSES = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"] as const;

type Order = {
  id: number;
  orderNumber?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  status: string;
  total: number;
  paymentMethod?: string | null;
  courierName?: string | null;
  estimatedDelivery?: string | null;
  trackingNote?: string | null;
  hasPreOrder?: boolean | null;
  createdAt: string;
  items: { id: number; productName: string; quantity: number; price: number; size?: string | null; isPreOrder?: boolean | null }[];
};

export default function AdminOrders() {
  const { data: orders, isLoading } = useListOrders({ query: { queryKey: getListOrdersQueryKey() } });
  const updateStatus = useUpdateOrderStatus();
  const updateOrder = useUpdateOrder();
  const addTrackingEvent = useAddTrackingEvent();
  const deleteOrder = useDeleteOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [trackingNote, setTrackingNote] = useState<Record<number, string>>({});
  const [courierName, setCourierName] = useState<Record<number, string>>({});
  const [estimatedDelivery, setEstimatedDelivery] = useState<Record<number, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });

  const handleStatusChange = (id: number, status: OrderStatusUpdateStatus) => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => { invalidate(); toast({ title: `Order updated to ${status}` }); },
        onError: () => toast({ title: "Error updating status", variant: "destructive" }),
      }
    );
  };

  const handleSaveOrderDetails = (order: Order) => {
    const data: Record<string, unknown> = {};
    if (courierName[order.id] !== undefined) data.courierName = courierName[order.id];
    if (estimatedDelivery[order.id] !== undefined) data.estimatedDelivery = estimatedDelivery[order.id];
    if (Object.keys(data).length === 0) return;
    updateOrder.mutate(
      { id: order.id, data: data as Parameters<typeof updateOrder.mutate>[0]["data"] },
      { onSuccess: () => { invalidate(); toast({ title: "Shipping details saved" }); } }
    );
  };

  const handleAddTrackingEvent = (orderId: number, status: string) => {
    const note = trackingNote[orderId] || "";
    addTrackingEvent.mutate(
      { id: orderId, data: { status, note } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Tracking update added" });
          setTrackingNote((prev) => ({ ...prev, [orderId]: "" }));
        },
        onError: () => toast({ title: "Error adding tracking event", variant: "destructive" }),
      }
    );
  };

  const handleDeleteOrder = (id: number, orderNumber: string) => {
    if (!confirm(`Delete order ${orderNumber}? This cannot be undone.`)) return;
    deleteOrder.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Order deleted" }); } });
  };

  const filteredOrders = (orders as Order[] | undefined)?.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        (o.orderNumber ?? "").toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        (o.customerPhone ?? "").includes(search)
      );
    }
    return true;
  });

  if (isLoading) return (
    <div className="py-20 text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading orders...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Orders</h1>
        <p className="text-muted-foreground text-sm">Manage, fulfill, and track customer orders.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, phone, or CHM number..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-64 h-9"
        />
        <div className="flex gap-2 flex-wrap">
          {["all", ...ALL_STATUSES].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredOrders?.map((order) => (
          <motion.div key={order.id} layout className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="p-5 flex flex-wrap items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <span className="font-mono font-black text-primary text-lg">{order.orderNumber ?? `#${order.id}`}</span>
                  {order.hasPreOrder && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">Pre-Order</span>
                  )}
                  <button onClick={() => navigator.clipboard.writeText(order.orderNumber ?? `#${order.id}`).then(() => toast({ title: "Copied!" }))}
                    className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="font-black text-sm">{order.customerName}</p>
                {order.customerPhone && (
                  <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#25D366] hover:underline">
                    <MessageCircle className="h-3 w-3" /> {order.customerPhone}
                  </a>
                )}
                {order.customerAddress && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 text-primary" /> {order.customerAddress}
                  </p>
                )}
              </div>

              <div className="flex-1 flex items-start gap-4 flex-wrap justify-end">
                <div className="text-right">
                  <p className="font-mono font-black text-xl text-primary">AED {order.total.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-AE")}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <WalletCards className="h-3 w-3" /> {order.paymentMethod === "cod" ? "Cash on Delivery" : (order.paymentMethod ?? "Unknown")}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Select
                    defaultValue={order.status}
                    onValueChange={(val) => handleStatusChange(order.id, val as OrderStatusUpdateStatus)}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className={`h-8 w-44 text-xs font-bold uppercase tracking-wide border ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs uppercase font-bold">
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="text-xs h-8 hover:text-primary">
                      {expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Details
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id, order.orderNumber ?? `#${order.id}`)}
                      className="h-8 w-8 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === order.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-border/40"
                >
                  <div className="p-5 space-y-5">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Order Items</p>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-sm py-2 border-b border-border/30 last:border-0">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-bold">{item.quantity}×</span>
                            <span className="flex-1">{item.productName}{item.size ? ` (${item.size})` : ""}</span>
                            {item.isPreOrder && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-black">Pre-Order</span>}
                            <span className="font-mono font-bold text-primary">AED {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label-xs mb-1.5 flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Courier Name</label>
                        <Input
                          placeholder={order.courierName ?? "e.g. Aramex, DHL..."}
                          defaultValue={order.courierName ?? ""}
                          onChange={(e) => setCourierName((p) => ({ ...p, [order.id]: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="label-xs mb-1.5 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Estimated Delivery</label>
                        <Input
                          placeholder={order.estimatedDelivery ?? "e.g. 2-3 business days"}
                          defaultValue={order.estimatedDelivery ?? ""}
                          onChange={(e) => setEstimatedDelivery((p) => ({ ...p, [order.id]: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleSaveOrderDetails(order)} className="fire-gradient border-none font-black uppercase tracking-wide">
                      Save Shipping Details
                    </Button>

                    {/* Add Tracking Event */}
                    <div className="pt-2">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Add Tracking Update</p>
                      <div className="flex gap-3 flex-wrap">
                        <Input
                          placeholder="Note for customer (optional)..."
                          value={trackingNote[order.id] ?? ""}
                          onChange={(e) => setTrackingNote((p) => ({ ...p, [order.id]: e.target.value }))}
                          className="flex-1 min-w-48 h-9"
                        />
                        <div className="flex gap-2 flex-wrap">
                          {(["packed", "shipped", "out_for_delivery", "delivered"] as const).map((s) => (
                            <Button key={s} size="sm" variant="outline"
                              onClick={() => handleAddTrackingEvent(order.id, s)}
                              disabled={addTrackingEvent.isPending}
                              className="text-xs font-black uppercase tracking-wide h-9"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {s.replace(/_/g, " ")}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {filteredOrders?.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            No orders {filterStatus !== "all" ? `with status "${filterStatus.replace(/_/g, " ")}"` : "yet"}.
          </div>
        )}
      </div>
    </div>
  );
}
