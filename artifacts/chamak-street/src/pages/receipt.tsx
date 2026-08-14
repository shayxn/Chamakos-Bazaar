/* @refresh reset */
import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Download, ArrowLeft, Printer } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const DELIVERY_LABEL: Record<string, string> = {
  standard: "Standard Delivery (2–4 days)",
  express: "Express Delivery (1–2 days)",
  priority: "FirstPick Priority (Same/Next Day)",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending Confirmation",
  confirmed: "Confirmed",
  preparing: "Preparing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-AE", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Receipt() {
  const [, params] = useRoute("/receipt/:id");
  const orderId = Number(params?.id);

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: {
      queryKey: getGetOrderQueryKey(orderId),
      enabled: !!orderId && !isNaN(orderId),
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-2xl font-black uppercase text-muted-foreground">Receipt unavailable</p>
        <p className="text-sm text-white/40 max-w-xs">This receipt could not be found or you don't have permission to view it.</p>
        <Link href="/account">
          <button className="text-sm font-bold text-primary hover:underline uppercase tracking-wider">← Back to Account</button>
        </Link>
      </div>
    );
  }

  const deliveryMethod = (order as any).deliveryMethod as string ?? "standard";
  const deliveryCharge = Number((order as any).deliveryCharge ?? 20);
  const tipAmount = Number((order as any).tip ?? 0);
  const itemsSubtotal = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
          }
          .print-area * { color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 16mm; size: A4; }
        }
      `}</style>

      {/* Page Shell */}
      <div className="min-h-screen py-8 px-4 no-print" style={{ background: "var(--background)" }}>
        {/* Action bar — hidden in print */}
        <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between no-print">
          <Link href="/account">
            <button className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </Link>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <Printer className="h-4 w-4" />
              Print
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide"
              style={{
                background: "linear-gradient(135deg, #ff6600, #ffaa00)",
                color: "#000",
                boxShadow: "0 4px 16px rgba(255,102,0,0.35)",
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </motion.button>
          </div>
        </div>

        {/* Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="max-w-2xl mx-auto rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}
        >
          <ReceiptContent
            order={order as any}
            deliveryMethod={deliveryMethod}
            deliveryCharge={deliveryCharge}
            tipAmount={tipAmount}
            itemsSubtotal={itemsSubtotal}
          />
        </motion.div>
      </div>

      {/* Print-only direct render */}
      <div className="hidden print:block print-area" style={{ background: "white" }}>
        <ReceiptContent
          order={order as any}
          deliveryMethod={deliveryMethod}
          deliveryCharge={deliveryCharge}
          tipAmount={tipAmount}
          itemsSubtotal={itemsSubtotal}
          printMode
        />
      </div>
    </>
  );
}

function ReceiptContent({
  order,
  deliveryMethod,
  deliveryCharge,
  tipAmount,
  itemsSubtotal,
  printMode = false,
}: {
  order: any;
  deliveryMethod: string;
  deliveryCharge: number;
  tipAmount: number;
  itemsSubtotal: number;
  printMode?: boolean;
}) {
  const textColor = printMode ? "#000" : "#fff";
  const mutedColor = printMode ? "#555" : "rgba(255,255,255,0.5)";
  const borderColor = printMode ? "#ddd" : "rgba(255,255,255,0.08)";
  const accentColor = "#ff6600";
  const bgCard = printMode ? "#f9f9f9" : "rgba(255,255,255,0.03)";

  return (
    <div className="print-area" style={{ color: textColor, fontFamily: "system-ui, -apple-system, sans-serif", padding: "40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", paddingBottom: "24px", borderBottom: `1px solid ${borderColor}` }}>
        <div>
          <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", color: accentColor }}>
            FIRSTPICK
          </div>
          <div style={{ fontSize: "11px", color: mutedColor, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "2px" }}>
            Dubai Streetwear
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: mutedColor, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Receipt</div>
          <div style={{ fontSize: "20px", fontWeight: 900, fontFamily: "monospace", marginTop: "4px", color: accentColor }}>
            {order.orderNumber ?? `#${order.id}`}
          </div>
          <div style={{ fontSize: "11px", color: mutedColor, marginTop: "4px" }}>{formatDate(order.createdAt)}</div>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: "28px" }}>
        <span style={{
          display: "inline-block",
          fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase",
          padding: "4px 12px", borderRadius: "9999px",
          background: order.status === "delivered" ? "rgba(74,222,128,0.15)" : "rgba(255,170,0,0.15)",
          color: order.status === "delivered" ? "#4ade80" : "#ffaa00",
          border: `1px solid ${order.status === "delivered" ? "rgba(74,222,128,0.4)" : "rgba(255,170,0,0.4)"}`,
        }}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Customer info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: mutedColor, marginBottom: "6px" }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>{order.customerName}</div>
          {order.customerPhone && <div style={{ fontSize: "13px", color: mutedColor, marginTop: "2px" }}>{order.customerPhone}</div>}
        </div>
        {order.customerAddress && (
          <div>
            <div style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: mutedColor, marginBottom: "6px" }}>Ship To</div>
            <div style={{ fontSize: "13px", lineHeight: "1.5", color: mutedColor }}>{order.customerAddress}</div>
          </div>
        )}
      </div>

      {/* Items table */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: mutedColor, marginBottom: "12px" }}>Items Ordered</div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 90px", gap: "8px", padding: "8px 0", borderBottom: `1px solid ${borderColor}`, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: mutedColor }}>
          <span>Product</span>
          <span style={{ textAlign: "center" }}>Qty</span>
          <span style={{ textAlign: "right" }}>Unit</span>
          <span style={{ textAlign: "right" }}>Total</span>
        </div>

        {/* Items */}
        {order.items?.map((item: any) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 90px", gap: "8px", padding: "10px 0", borderBottom: `1px solid ${borderColor}`, fontSize: "13px" }}>
            <div>
              <span style={{ fontWeight: 700 }}>{item.productName}</span>
              {item.size && <span style={{ marginLeft: "8px", fontSize: "11px", color: mutedColor, fontWeight: 600 }}>({item.size})</span>}
              {item.isPreOrder && <span style={{ marginLeft: "6px", fontSize: "9px", background: "rgba(255,200,0,0.15)", color: "#ffcc00", padding: "2px 6px", borderRadius: "4px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pre-Order</span>}
            </div>
            <div style={{ textAlign: "center", fontWeight: 700 }}>{item.quantity}</div>
            <div style={{ textAlign: "right", fontFamily: "monospace" }}>AED {Number(item.price).toFixed(2)}</div>
            <div style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>AED {(Number(item.price) * item.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Price breakdown */}
      <div style={{ background: bgCard, borderRadius: "12px", padding: "20px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
          <span style={{ color: mutedColor }}>Subtotal</span>
          <span style={{ fontFamily: "monospace", fontWeight: 700 }}>AED {itemsSubtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
          <span style={{ color: mutedColor }}>
            {deliveryMethod === "priority" ? "⚡ " : "🚚 "}{DELIVERY_LABEL[deliveryMethod] ?? "Delivery"}
          </span>
          <span style={{ fontFamily: "monospace", fontWeight: 700, color: accentColor }}>
            {deliveryCharge === 0 ? "FREE" : `AED ${deliveryCharge.toFixed(2)}`}
          </span>
        </div>
        {tipAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
            <span style={{ color: mutedColor }}>⭐ Tip (thank you!)</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>AED {tipAmount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "15px" }}>Grand Total</span>
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "22px", color: accentColor }}>
            AED {Number(order.total).toFixed(2)}
          </span>
        </div>
        <div style={{ marginTop: "8px", fontSize: "11px", color: mutedColor }}>
          Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod ?? "—"}
        </div>
      </div>

      {/* Estimated delivery */}
      {order.estimatedDelivery && (
        <div style={{ marginBottom: "24px", padding: "14px 18px", borderRadius: "10px", background: printMode ? "#fff3e8" : "rgba(255,102,0,0.06)", border: `1px solid ${printMode ? "#ffcc99" : "rgba(255,102,0,0.18)"}`, fontSize: "13px" }}>
          <span style={{ fontWeight: 700, color: accentColor }}>Estimated Delivery: </span>
          <span style={{ color: mutedColor }}>{order.estimatedDelivery}</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingTop: "24px", borderTop: `1px solid ${borderColor}`, textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: "13px", color: accentColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
          Thank you for shopping with FirstPick!
        </div>
        <div style={{ fontSize: "11px", color: mutedColor }}>
          Questions? Reach us on WhatsApp or Instagram @firstpick.ae
        </div>
        <div style={{ fontSize: "10px", color: mutedColor, marginTop: "16px", opacity: 0.6 }}>
          FirstPick · Dubai, UAE · Generated {new Date().toLocaleDateString("en-AE")}
        </div>
      </div>
    </div>
  );
}
