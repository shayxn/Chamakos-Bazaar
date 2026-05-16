import { useRoute, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: order, isLoading } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id) }
  });

  if (isLoading) return <div className="p-20 text-center">Loading...</div>;
  if (!order) return <div className="p-20 text-center">Order not found</div>;

  return (
    <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
      <div className="flex justify-center mb-8">
        <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
      </div>
      
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Order Confirmed</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Thanks for copping the heat, <span className="font-bold text-foreground">{order.customerName}</span>. 
        Your order is being processed.
      </p>

      <div className="bg-card border border-border rounded-lg p-8 text-left mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full fire-gradient"></div>
        <div className="flex justify-between items-end border-b border-border pb-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Order Number</p>
            <p className="font-mono font-bold text-xl">#{order.id.toString().padStart(6, '0')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Total</p>
            <p className="font-mono font-bold text-xl text-primary">${order.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span className="font-bold uppercase"><span className="text-muted-foreground font-mono mr-2">{item.quantity}x</span> {item.productName} {item.size ? `(${item.size})` : ''}</span>
              <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/">
        <Button size="lg" className="font-bold uppercase tracking-widest h-14 px-8">
          Return to Shop <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
