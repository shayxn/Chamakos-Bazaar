import { useGetCart, useCreateOrder, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Lock } from "lucide-react";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerAddress: z.string().min(10, "Full address is required"),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerAddress: "",
    },
  });

  if (isLoading) return <div className="p-20 text-center">Loading...</div>;
  if (!cart || cart.items.length === 0) return <Redirect href="/cart" />;

  const onSubmit = (data: CheckoutValues) => {
    createOrder.mutate(
      { data },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setLocation(`/order/${order.id}`);
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex items-center gap-3 mb-10">
        <Lock className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-black uppercase tracking-tighter">Secure Checkout</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider mb-6 pb-2 border-b border-border">Shipping Details</h2>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="bg-card border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" className="bg-card border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Shipping Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Street Ave, City, Country, Zip" className="bg-card border-border min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-6">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 font-bold uppercase tracking-widest fire-gradient border-none shadow-[0_0_15px_rgba(255,102,0,0.3)]"
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? "Processing..." : "Place Order"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div>
          <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6 pb-4 border-b border-border">Order Summary</h2>
            
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {cart.items.map(item => (
                <div key={item.id} className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded border border-border overflow-hidden shrink-0">
                      {item.productImageUrl && <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover mix-blend-lighten" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase leading-tight line-clamp-2">{item.productName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ''}</p>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-right shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-end">
                <span className="font-bold uppercase tracking-wider">Total</span>
                <span className="font-mono text-2xl font-bold text-primary">${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
