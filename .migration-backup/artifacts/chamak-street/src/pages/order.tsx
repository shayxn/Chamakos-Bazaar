import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: order, isLoading } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id) }
  });

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

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
        {/* Success icon with ring animation */}
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
        >
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 gradient-text">
            Order Confirmed
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            Thanks for copping the heat,{" "}
            <span className="font-black text-foreground">{order.customerName}</span>.
            Your order is on its way.
          </p>
        </motion.div>

        {/* Order card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card border border-border rounded-xl p-8 text-left mb-8 relative overflow-hidden"
        >
          {/* Fire accent bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 fire-gradient" />

          <div className="flex justify-between items-end border-b border-border pb-5 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-1">Order Number</p>
              <p className="font-mono font-black text-2xl">#{order.id.toString().padStart(6, "0")}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black mb-1">Total</p>
              <p className="font-mono font-black text-2xl text-primary">AED {order.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-5">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-sm">
              {order.status}
            </span>
          </div>

          <div className="space-y-3">
            {order.items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.08 }}
                className="flex justify-between items-center text-sm py-2 border-b border-border/40 last:border-0"
              >
                <span className="font-bold uppercase">
                  <span className="text-muted-foreground font-mono mr-2">{item.quantity}x</span>
                  {item.productName}
                  {item.size ? ` (${item.size})` : ""}
                </span>
                <span className="font-mono font-bold text-primary">AED {(item.price * item.quantity).toFixed(2)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
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
