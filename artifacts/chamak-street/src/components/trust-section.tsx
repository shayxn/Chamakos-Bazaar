import { useSettings } from "@/lib/use-settings";
import { Truck, Tag, RotateCcw, Star } from "lucide-react";

const DEFAULT_CARDS = [
  {
    Icon: Truck,
    title: "Fast Shipping!",
    desc: "Order Today, Receive In 1-2 Days",
  },
  {
    Icon: Tag,
    title: "Superior Quality Products",
    desc: "We Tested 100+ Replicas To Find The Best Of The Best. Now We Ship It To You!",
  },
  {
    Icon: RotateCcw,
    title: "100% Money Back Guarantee",
    desc: "If Product Comes Damaged, Or Missing. We Will Refund You!",
  },
  {
    Icon: Star,
    title: "5.0 Customer Reviews",
    desc: "Customer Satisfaction Is Our #1 Priority We Will Answer Any Questions, And Give Order Updates!",
  },
];

export function TrustSection() {
  const settings = useSettings();

  const cards = [1, 2, 3, 4].map((n, i) => ({
    n,
    Icon: DEFAULT_CARDS[i].Icon,
    title: settings[`trust_${n}_title`] || DEFAULT_CARDS[i].title,
    desc: settings[`trust_${n}_desc`] || DEFAULT_CARDS[i].desc,
    visible: settings[`trust_${n}_visible`] !== "false",
  })).filter((c) => c.visible);

  if (cards.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="border border-white/25 rounded-xl overflow-hidden bg-black">
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {cards.map((card, i) => {
              const Icon = card.Icon;
              return (
                <div
                  key={card.n}
                  className={`flex flex-col items-center text-center p-7 gap-3
                    ${i > 0 ? "border-t sm:border-t-0 sm:border-l border-white/15" : ""}
                    ${i === 2 && cards.length === 4 ? "sm:border-t lg:border-t-0" : ""}
                  `}
                >
                  <div className="mb-1">
                    <Icon className="w-9 h-9 stroke-[1.5] text-indigo-400" />
                  </div>
                  <h3 className="text-[13px] font-bold text-indigo-400 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[12px] text-white/65 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
