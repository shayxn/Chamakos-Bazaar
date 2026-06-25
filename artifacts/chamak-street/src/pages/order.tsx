import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, ArrowRight, Package, Copy, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { useState } from "react";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [copied, setCopied] = useState(false);

  const { data: order, isLoading } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id) }
  });

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"
        />
      </div>
    );
  }

  if (!order) return <div className="p-20 text-center font-black text-xl uppercase">Order not found</div>;

  const isPreOrder = order.hasPreOrder || order.items?.some((i) => i.isPreOrder);

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <div className="flex justify-center mb-10">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="relative h-24 w-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center"
            >
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 gradient-text">
            Order Confirmed!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Thanks for your order, <span className="font-black text-foreground">{order.customerName}</span>.
            {isPreOrder ? " This is a pre-order — your items will ship on the estimated date." : " Your order is on its way."}
          </p>
        </motion.div>

        {/* ORDER NUMBER HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-6 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,102,0,0.15), transparent 70%)" }} />
          <p className="text-xs uppercase tracking-[0.3em] font-black text-primary/80 mb-2 text-center">Your Order Number</p>
          <div className="flex items-center justify-center gap-3">
            <p className="font-mono font-black text-4xl text-primary">{order.orderNumber ?? `#${order.id}`}</p>
            <motion.button
              onClick={copyOrderNumber}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors"
              title="Copy order number"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-primary" />}
            </motion.button>
          </div>
          <div className="mt-4 p-3 bg-background/50 rounded-lg border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">⚠️ Save this number!</strong> You'll need it to track your order on the{" "}
              <Link href="/order-tracking" className="text-primary hover:underline font-bold">Order Tracking</Link> page.
            </p>
          </div>
        </motion.div>

        {isPreOrder && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3"
          >
            <Package className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-yellow-300 uppercase tracking-wider mb-1">Pre-Order Notice</p>
              <p className="text-xs text-muted-foreground">
                Your order contains pre-order items. These will ship on the estimated date provided. We'll update your order status once shipping begins.
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-8 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 fire-gradient" />

          <div className="flex justify-between items-center border-b border-border pb-5 mb-5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-sm">
                {order.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-1">Total</p>
              <p className="font-mono font-black text-2xl text-primary">AED {order.total.toFixed(2)}</p>
            </div>
          </div>

          {order.customerPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <span className="text-primary font-bold">📱</span>
              <span>WhatsApp: <strong className="text-foreground">{order.customerPhone}</strong></span>
            </div>
          )}
          {order.customerAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-5">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{order.customerAddress}</span>
            </div>
          )}

          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex justify-between items-center text-sm py-2 border-b border-border/40 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase">
                    <span className="text-muted-foreground font-mono mr-2">{item.quantity}x</span>
                    {item.productName}
                    {item.size ? ` (${item.size})` : ""}
                  </span>
                  {item.isPreOrder && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-black uppercase">Pre</span>
                  )}
                </div>
                <span className="font-mono font-bold text-primary">AED {(item.price * item.quantity).toFixed(2)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Link href="/order-tracking">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="outline" className="font-black uppercase tracking-widest h-14 px-8 border-border hover:border-primary/50">
                <Search className="mr-2 h-5 w-5" /> Track Order
              </Button>
            </motion.div>
          </Link>
          <Link href="/shop">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="font-black uppercase tracking-widest h-14 px-10 fire-gradient border-none shadow-[0_0_25px_rgba(255,102,0,0.35)]">
                Keep Shopping <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </PageTransition>
  );
}
