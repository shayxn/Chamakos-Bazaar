import { useState, useRef, useEffect, useCallback } from "react";
import { useDeleteOrder, useListOrders, useUpdateOrderStatus, useUpdateOrder, useAddTrackingEvent, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderStatusUpdateStatus } from "@workspace/api-client-react";
import {
  MapPin, MessageCircle, Package, Trash2, WalletCards, ChevronDown, ChevronUp,
  Plus, Truck, Clock, Copy, Download, X, Eye, Share2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { playCashSound } from "@/hooks/use-admin-notifications";

const STATUS_COLORS: Record<string, string> = {
  pending:          "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  confirmed:        "bg-blue-500/10 text-blue-400 border-blue-500/30",
  packed:           "bg-purple-500/10 text-purple-400 border-purple-500/30",
  preparing:        "bg-purple-500/10 text-purple-400 border-purple-500/30",
  shipped:          "bg-primary/10 text-primary border-primary/30",
  out_for_delivery: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  delivered:        "bg-green-500/10 text-green-400 border-green-500/30",
  cancelled:        "bg-destructive/10 text-destructive border-destructive/30",
};

const ALL_STATUSES = ["pending", "confirmed", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled"] as const;

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

/* ─── Receipt Generator ─── */
async function generateReceiptDataUrl(order: Order): Promise<string> {
  const W = 620;
  const itemH = order.items.length * 32 + 20;
  const H = Math.max(720, 600 + itemH);
  const PAD = 40;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Orange header stripe
  ctx.fillStyle = "#ff6600";
  ctx.fillRect(0, 0, W, 64);

  // Header title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Courier New', Courier, monospace";
  ctx.fillText("CHAMAK STREET", PAD, 40);

  ctx.font = "12px 'Courier New', Courier, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("ORDER RECEIPT", W - PAD - 110, 40);

  // Order number + date
  let y = 95;
  ctx.fillStyle = "#111111";
  ctx.font = "bold 20px 'Courier New', Courier, monospace";
  ctx.fillText(order.orderNumber ?? `#${order.id}`, PAD, y);

  ctx.fillStyle = "#666666";
  ctx.font = "12px 'Courier New', Courier, monospace";
  const dateStr = new Date(order.createdAt).toLocaleString("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dateW = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, W - PAD - dateW, y);

  // Thin separator
  y += 16;
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();

  // Customer section
  y += 22;
  ctx.fillStyle = "#ff6600";
  ctx.font = "bold 9px 'Courier New', Courier, monospace";
  ctx.fillText("CUSTOMER INFORMATION", PAD, y);

  y += 18;
  ctx.fillStyle = "#111111";
  ctx.font = "bold 15px 'Courier New', Courier, monospace";
  ctx.fillText(order.customerName, PAD, y);

  y += 20;
  ctx.fillStyle = "#444444";
  ctx.font = "13px 'Courier New', Courier, monospace";
  ctx.fillText(order.customerPhone ?? "No phone number", PAD, y);

  y += 18;
  const addr = order.customerAddress ?? "No address provided";
  const words = addr.split(" ");
  let line = "";
  const maxW = W - PAD * 2;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), PAD, y);
      line = word + " ";
      y += 18;
    } else {
      line = test;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), PAD, y);
    y += 18;
  }

  y += 4;
  ctx.fillStyle = "#888888";
  ctx.font = "11px 'Courier New', Courier, monospace";
  ctx.fillText(
    `Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : (order.paymentMethod ?? "Unknown")}`,
    PAD,
    y
  );

  // Items section
  y += 26;
  ctx.strokeStyle = "#eeeeee";
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();

  y += 20;
  ctx.fillStyle = "#ff6600";
  ctx.font = "bold 9px 'Courier New', Courier, monospace";
  ctx.fillText("ORDERED ITEMS", PAD, y);
  ctx.fillText("QTY", 400, y);
  ctx.fillText("PRICE", 480, y);

  y += 12;
  ctx.strokeStyle = "#eeeeee";
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();

  for (const item of order.items) {
    y += 26;
    ctx.fillStyle = "#111111";
    ctx.font = "13px 'Courier New', Courier, monospace";

    const rawName = `${item.productName}${item.size ? ` (${item.size})` : ""}`;
    let displayName = rawName;
    const maxItemW = 340;
    while (ctx.measureText(displayName + "…").width > maxItemW && displayName.length > 5) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== rawName) displayName += "…";
    ctx.fillText(displayName, PAD, y);

    ctx.fillStyle = "#555555";
    ctx.fillText(`×${item.quantity}`, 405, y);

    ctx.fillStyle = "#ff6600";
    ctx.font = "bold 13px 'Courier New', Courier, monospace";
    ctx.fillText(`AED ${(item.price * item.quantity).toFixed(2)}`, 455, y);

    ctx.strokeStyle = "#f7f7f7";
    ctx.beginPath();
    ctx.moveTo(PAD, y + 8);
    ctx.lineTo(W - PAD, y + 8);
    ctx.stroke();
  }

  // Total
  y += 20;
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.lineWidth = 1;

  y += 32;
  ctx.fillStyle = "#888888";
  ctx.font = "11px 'Courier New', Courier, monospace";
  ctx.fillText("TOTAL AMOUNT", PAD, y);

  ctx.fillStyle = "#ff6600";
  ctx.font = "bold 26px 'Courier New', Courier, monospace";
  const totalStr = `AED ${order.total.toFixed(2)}`;
  const totalW = ctx.measureText(totalStr).width;
  ctx.fillText(totalStr, W - PAD - totalW, y);

  // Logo in bottom right
  try {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(img, W - PAD - 100, H - 68, 100, 50);
        ctx.globalAlpha = 1;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = "/chamak-logo.png";
    });
  } catch { /* ignore */ }

  // Footer
  y = H - 24;
  ctx.strokeStyle = "#eeeeee";
  ctx.beginPath();
  ctx.moveTo(PAD, y - 8);
  ctx.lineTo(W - PAD, y - 8);
  ctx.stroke();
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "10px 'Courier New', Courier, monospace";
  ctx.fillText("Thank you for shopping with Chamak Street", PAD, y);

  return canvas.toDataURL("image/png");
}

/* ─── Receipt Preview Modal ─── */
function ReceiptModal({
  dataUrl,
  orderNumber,
  onClose,
}: {
  dataUrl: string;
  orderNumber: string;
  onClose: () => void;
}) {
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const { toast } = useToast();

  const download = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `receipt-${orderNumber}.png`;
    a.click();
  };

  const copyToClipboard = async () => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast({ title: "Receipt copied to clipboard!" });
    } catch {
      toast({ title: "Copy not supported — please download instead", variant: "destructive" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#111" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="font-black uppercase tracking-widest text-sm text-white/80">
            Receipt — {orderNumber}
          </p>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <img
            src={dataUrl}
            alt="Order Receipt"
            className="w-full rounded-lg shadow-xl"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        <div
          className="flex gap-3 p-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Button onClick={download} className="flex-1 fire-gradient border-none font-black uppercase tracking-wide gap-2">
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
          <Button onClick={copyToClipboard} variant="outline" className="flex-1 gap-2 font-black uppercase tracking-wide">
            <Copy className="h-4 w-4" />
            Copy Image
          </Button>
        </div>
        <a ref={downloadRef} className="hidden" />
      </motion.div>
    </div>
  );
}

/* ─── Main Component ─── */
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
  const [receiptState, setReceiptState] = useState<Record<number, { loading?: boolean; dataUrl?: string }>>({});
  const [receiptModal, setReceiptModal] = useState<{ orderId: number; orderNumber: string; dataUrl: string } | null>(null);

  // Polling new order detection — plays cash sound when new orders arrive
  const lastCountRef = useRef<number | null>(null);
  useEffect(() => {
    const list = orders as Order[] | undefined;
    if (!list) return;
    const count = list.length;
    if (lastCountRef.current !== null && count > lastCountRef.current) {
      playCashSound();
      toast({
        title: "🛒 New order received!",
        description: `${count - lastCountRef.current} new order(s) placed.`,
      });
    }
    lastCountRef.current = count;
  }, [orders, toast]);

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

  const handleWhatsApp = useCallback((order: Order) => {
    const rawPhone = order.customerPhone ?? "";
    const phone = rawPhone.replace(/\D/g, "");
    if (!phone) {
      toast({ title: "No phone number found for this order", variant: "destructive" });
      return;
    }
    const message =
      `Hi ${order.customerName}! Thank you for ordering from Chamak Street. ` +
      `Please reply 'YES' to confirm your order. Once confirmed, we will begin preparing it.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  }, [toast]);

  const handleGenerateReceipt = useCallback(async (order: Order) => {
    setReceiptState((prev) => ({ ...prev, [order.id]: { loading: true } }));
    try {
      const dataUrl = await generateReceiptDataUrl(order);
      setReceiptState((prev) => ({ ...prev, [order.id]: { dataUrl } }));
      setReceiptModal({
        orderId: order.id,
        orderNumber: order.orderNumber ?? `#${order.id}`,
        dataUrl,
      });
    } catch {
      toast({ title: "Failed to generate receipt", variant: "destructive" });
      setReceiptState((prev) => ({ ...prev, [order.id]: {} }));
    }
  }, [toast]);

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
            {/* Order header row */}
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

            {/* Expanded details */}
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

                    {/* ─── WhatsApp + Receipt ─── */}
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)" }}
                    >
                      <p className="text-xs font-black uppercase tracking-widest text-[#25D366]">Customer Actions</p>
                      <div className="flex flex-wrap gap-3">
                        {/* WhatsApp Confirm Button */}
                        <button
                          onClick={() => handleWhatsApp(order)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: "linear-gradient(135deg, #25D366, #128C7E)",
                            color: "#ffffff",
                            boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Confirm Order via WhatsApp
                        </button>

                        {/* Receipt Button */}
                        <button
                          onClick={() => {
                            const existing = receiptState[order.id];
                            if (existing?.dataUrl) {
                              setReceiptModal({ orderId: order.id, orderNumber: order.orderNumber ?? `#${order.id}`, dataUrl: existing.dataUrl });
                            } else {
                              handleGenerateReceipt(order);
                            }
                          }}
                          disabled={receiptState[order.id]?.loading}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100"
                          style={{
                            background: "linear-gradient(135deg, #ff6600, #ffcc00)",
                            color: "#000000",
                            boxShadow: "0 4px 16px rgba(255,102,0,0.35)",
                          }}
                        >
                          {receiptState[order.id]?.loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              Generating…
                            </>
                          ) : receiptState[order.id]?.dataUrl ? (
                            <>
                              <Eye className="h-4 w-4" />
                              View Receipt
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Generate Receipt
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        WhatsApp will open with a pre-filled confirmation message. Download the receipt to attach to your message.
                      </p>
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

      {/* Receipt Modal */}
      <AnimatePresence>
        {receiptModal && (
          <ReceiptModal
            dataUrl={receiptModal.dataUrl}
            orderNumber={receiptModal.orderNumber}
            onClose={() => setReceiptModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
