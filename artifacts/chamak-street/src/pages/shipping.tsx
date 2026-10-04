import { PageTransition } from "@/components/page-transition";
import { Truck } from "lucide-react";
import { useSettings } from "@/lib/use-settings";

export default function Shipping() {
  const settings = useSettings();
  const standardFee = Number(settings.delivery_standard_price || 25);

  return (
    <PageTransition>
      <main className="min-h-[70vh] bg-[#111113] px-6 py-20 text-[#f4f2f7] sm:px-10 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-[10px] uppercase tracking-[.28em] text-[#bba4f4]">IMAGINATE / Delivery</p>
          <h1 className="text-[clamp(2.8rem,8vw,5.8rem)] font-medium uppercase leading-[.9] tracking-[-.07em]">Shipping<br /><span className="text-white/40">within the UAE.</span></h1>

          <div className="mt-12 border-y border-white/10 py-7">
            <div className="flex items-start gap-4">
              <Truck className="mt-1 h-5 w-5 shrink-0 text-[#bba4f4]" strokeWidth={1.5} />
              <div>
                <h2 className="text-sm font-medium uppercase tracking-[.16em]">Delivery options at checkout</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                  Delivery is currently available within the United Arab Emirates. The standard delivery fee is AED {Number.isFinite(standardFee) ? standardFee.toFixed(2) : "25.00"}. Any other available option and its price are shown before you place your order.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-7 max-w-xl text-xs leading-6 text-white/40">
            For questions about an existing order, use the Support page or the contact details shown there.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}