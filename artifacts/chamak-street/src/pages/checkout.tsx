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
import { Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerAddress: z.string().min(10, "Full address is required"),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

const fieldVariants = {
  hidden: { opacity: 0, x: -15 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }),
};

export default function Checkout() {
  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", customerEmail: "", customerAddress: "" },
  });

  if (isLoading) return <div className="p-20 text-center font-bold uppercase">Loading...</div>;
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
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          className="flex items-center gap-3 mb-12"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Lock className="h-5 w-5 text-primary" />
          <h1 className="text-4xl font-black uppercase tracking-tighter">Secure Checkout</h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <motion.h2
              className="text-lg font-black uppercase tracking-wider mb-6 pb-2 border-b border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Shipping Details
            </motion.h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {(["customerName", "customerEmail", "customerAddress"] as const).map((name, i) => (
                  <motion.div key={name} custom={i} variants={fieldVariants} initial="hidden" animate="show">
                    <FormField
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">
                            {name === "customerName" ? "Full Name" : name === "customerEmail" ? "Email Address" : "Shipping Address"}
                          </FormLabel>
                          <FormControl>
                            {name === "customerAddress" ? (
                              <Textarea
                                placeholder="123 Street Ave, City, Country, Zip"
                                className="bg-card border-border min-h-[100px] focus-visible:ring-primary focus-visible:border-primary transition-colors"
                                {...field}
                                data-testid="input-address"
                              />
                            ) : (
                              <Input
                                type={name === "customerEmail" ? "email" : "text"}
                                placeholder={name === "customerName" ? "John Doe" : "john@example.com"}
                                className="bg-card border-border h-11 focus-visible:ring-primary focus-visible:border-primary transition-colors"
                                {...field}
                                data-testid={`input-${name}`}
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="pt-4"
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-14 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.55)] transition-all"
                      disabled={createOrder.isPending}
                      data-testid="button-place-order"
                    >
                      {createOrder.isPending ? (
                        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          Processing...
                        </motion.span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Place Order <ArrowRight className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </Form>
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-black uppercase tracking-wider mb-6 pb-4 border-b border-border">Order Summary</h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-1">
                {cart.items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex justify-between items-start gap-4"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 bg-muted rounded border border-border overflow-hidden shrink-0">
                        {item.productImageUrl && (
                          <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover mix-blend-lighten" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm uppercase leading-tight line-clamp-2">{item.productName}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Qty: {item.quantity}{item.size ? ` | Size: ${item.size}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm shrink-0">${(item.price * item.quantity).toFixed(2)}</div>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-end">
                  <span className="font-black uppercase tracking-wider">Total</span>
                  <span className="font-mono text-2xl font-black text-primary">${cart.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
