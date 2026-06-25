import { PageTransition } from "@/components/page-transition";
import { Truck, Clock, MapPin, Package } from "lucide-react";

const shippingZones = [
  { zone: "Dubai", eta: "1–2 business days", fee: "AED 25" },
  { zone: "Abu Dhabi", eta: "2–3 business days", fee: "AED 25" },
  { zone: "Sharjah / Ajman", eta: "1–2 business days", fee: "AED 25" },
  { zone: "Other Emirates", eta: "3–5 business days", fee: "AED 25" },
];

export default function Shipping() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 gradient-text">Shipping & Delivery</h1>
        <p className="text-muted-foreground text-sm mb-10 uppercase tracking-widest font-bold">UAE Delivery Only</p>

        <div className="grid gap-4 mb-12 sm:grid-cols-2">
          {[
            { icon: Truck, title: "Free Delivery", desc: "On orders above AED 200" },
            { icon: Clock, title: "Fast Dispatch", desc: "Same-day for orders before 3 PM" },
            { icon: MapPin, title: "UAE Wide", desc: "All 7 Emirates covered" },
            { icon: Package, title: "Cash on Delivery", desc: "Pay when you receive" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-foreground mb-1">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-black uppercase tracking-wider mb-4">Delivery Zones</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-4 font-black uppercase tracking-widest text-xs text-muted-foreground">Zone</th>
                <th className="text-left p-4 font-black uppercase tracking-widest text-xs text-muted-foreground">Estimated Time</th>
                <th className="text-right p-4 font-black uppercase tracking-widest text-xs text-muted-foreground">Fee</th>
              </tr>
            </thead>
            <tbody>
              {shippingZones.map((z, i) => (
                <tr key={z.zone} className={i < shippingZones.length - 1 ? "border-b border-border/50" : ""}>
                  <td className="p-4 font-bold">{z.zone}</td>
                  <td className="p-4 text-muted-foreground">{z.eta}</td>
                  <td className="p-4 text-right font-mono font-black text-primary">{z.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
          <h3 className="font-black uppercase tracking-wider text-sm text-primary mb-2">Pre-Order Shipping</h3>
          <p className="text-sm text-muted-foreground">
            Pre-order items ship on their listed estimated date. You will receive a WhatsApp notification once your pre-order has been dispatched. Standard delivery fees apply.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
