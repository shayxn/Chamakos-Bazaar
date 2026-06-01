import { useState, useEffect } from "react";
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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Lock, ArrowRight, MessageCircle, Truck, CreditCard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";

const SHIPPING_FEE = 25;

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().min(7, "Enter a valid WhatsApp number"),
  customerAddress: z.string().min(5, "Address is required"),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

type PaymentMethod = "cod" | "apple_pay" | "ziina";

async function createZiinaPaymentIntent(orderId: number): Promise<string> {
  const response = await fetch("/api/payments/ziina-intent", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  const data = await response.json() as { redirectUrl?: string; error?: string };
  if (!response.ok || !data.redirectUrl) {
    throw new Error(data.error ?? "Ziina payment link could not be created");
  }

  return data.redirectUrl;
}

export default function Checkout() {
  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [showBanner, setShowBanner] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRedirectingToZiina, setIsRedirectingToZiina] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", customerEmail: "", customerAddress: "" },
  });

  if (isLoading) return <div className="p-20 text-center font-bold uppercase">Loading...</div>;
  if (!cart || cart.items.length === 0) return <Redirect href="/cart" />;

  const subtotal = cart.total;
  const grandTotal = subtotal + SHIPPING_FEE;

  const onSubmit = (data: CheckoutValues) => {
    setPaymentError(null);
    createOrder.mutate(
      { data },
      {
        onSuccess: async (order) => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          if (paymentMethod === "ziina") {
            setIsRedirectingToZiina(true);
            try {
              const redirectUrl = await createZiinaPaymentIntent(order.id);
              window.location.assign(redirectUrl);
            } catch (error) {
              setIsRedirectingToZiina(false);
              setPaymentError(error instanceof Error ? error.message : "Ziina payment failed to start");
            }
            return;
          }

          setLocation(`/order/${order.id}`);
        }
      }
    );
  };

  return (
    <PageTransition>
      {/* WhatsApp Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative z-50 bg-[#25D366] text-black px-4 py-3 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-wider"
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
            USE A WORKING WHATSAPP NUMBER — we'll contact you on WhatsApp to confirm your order
            <button onClick={() => setShowBanner(false)} className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="space-y-8">
            <motion.h2
              className="text-lg font-black uppercase tracking-wider pb-2 border-b border-border"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            >
              Shipping Details
            </motion.h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="bg-card border-border h-11 focus-visible:ring-primary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </motion.div>

                {/* WhatsApp Number */}
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}>
                  <FormField control={form.control} name="customerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground flex items-center gap-2">
                        <MessageCircle className="h-3 w-3 text-[#25D366]" />
                        WhatsApp Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+971 50 000 0000"
                          className="bg-card border-border h-11 focus-visible:ring-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </motion.div>

                {/* Address */}
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.29 }}>
                  <FormField control={form.control} name="customerAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Building, Street, Area, City, UAE"
                          className="bg-card border-border min-h-[90px] focus-visible:ring-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </motion.div>

                {/* Payment Method */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
                  className="space-y-3"
                >
                  <p className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Payment Method</p>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Cash on Delivery */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "cod" ? "border-primary" : "border-muted-foreground"}`}>
                        {paymentMethod === "cod" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <Truck className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-black uppercase tracking-wider text-sm">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                      </div>
                    </button>

                    {/* Apple Pay */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("apple_pay")}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === "apple_pay" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "apple_pay" ? "border-primary" : "border-muted-foreground"}`}>
                        {paymentMethod === "apple_pay" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <svg viewBox="0 0 814 1000" className="h-5 w-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-157.2-100.3C203.9 795.6 162 709.3 162 626.1c0-171.1 111.1-261.3 219.9-261.3 54.4 0 99.5 35.8 133.4 35.8 32.3 0 83.1-38.2 145.5-38.2 21.9 0 108.2 2 159.7 77.8z"/>
                          <path d="M568.3 63.9c-.6-4.9-.6-9.9-.6-14.8 0-63.3 33.2-127 74.3-168.8 42.2-43.2 115.5-73.3 175-73.3.6 4.9.6 9.9.6 14.8 0 63.9-33.2 127.3-74.3 168.8-41.5 43.2-115.1 73.3-175 73.3z"/>
                        </svg>
                        <div>
                          <p className="font-black uppercase tracking-wider text-sm">Apple Pay</p>
                          <p className="text-xs text-muted-foreground">Fast & secure</p>
                        </div>
                      </div>
                    </button>

                    {/* Ziina */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("ziina")}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === "ziina" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "ziina" ? "border-primary" : "border-muted-foreground"}`}>
                        {paymentMethod === "ziina" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="bg-[#6C4CFF] text-white font-black text-xs px-2 py-1 rounded shrink-0">ziina</div>
                        <div>
                          <p className="font-black uppercase tracking-wider text-sm">Ziina Online Payment</p>
                          <p className="text-xs text-muted-foreground">Pay securely by card, Apple Pay, or Google Pay</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  {paymentError && (
                    <p className="text-xs font-bold text-destructive">{paymentError}</p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
                  className="pt-2"
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-14 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.55)] transition-all"
                      disabled={createOrder.isPending || isRedirectingToZiina}
                    >
                      {createOrder.isPending || isRedirectingToZiina ? (
                        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          {isRedirectingToZiina ? "Opening Ziina..." : "Processing..."}
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
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.45 }}
          >
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-black uppercase tracking-wider mb-6 pb-4 border-b border-border">Order Summary</h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-1">
                {cart.items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex justify-between items-start gap-4"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 bg-muted rounded border border-border overflow-hidden shrink-0">
                        {item.productImageUrl && <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm uppercase leading-tight line-clamp-2">{item.productName}</h4>
                        <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}{item.size ? ` | Size: ${item.size}` : ""}</p>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm shrink-0">AED {(item.price * item.quantity).toFixed(2)}</div>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-bold">AED {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Shipping</span>
                  <span className="font-mono font-bold text-primary">AED {SHIPPING_FEE.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-end">
                  <span className="font-black uppercase tracking-wider">Total</span>
                  <span className="font-mono text-2xl font-black text-primary">AED {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
