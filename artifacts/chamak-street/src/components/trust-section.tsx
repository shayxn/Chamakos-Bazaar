import { motion } from "framer-motion";
import { useSettings } from "@/lib/use-settings";
import { RevealList } from "./page-transition";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function TrustSection() {
  const settings = useSettings();

  const cards = [1, 2, 3, 4].map((n) => ({
    n,
    icon: settings[`trust_${n}_icon`] || ["🚚", "🏆", "📦", "⭐"][n - 1],
    title: settings[`trust_${n}_title`] || ["Fast UAE Shipping", "Premium Quality", "Secure Packaging", "5-Star Support"][n - 1],
    desc: settings[`trust_${n}_desc`] || ["", "", "", ""][n - 1],
    visible: settings[`trust_${n}_visible`] !== "false",
  })).filter((c) => c.visible);

  if (cards.length === 0) return null;

  return (
    <section className="py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-3">Why Chamak Street</p>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Built Different</h2>
        </motion.div>

        <RevealList className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cards.length === 4 ? "4" : "3"} gap-6`} stagger={0.1}>
          {cards.map((card) => (
            <motion.div key={card.n} variants={cardVariant}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative h-full p-7 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-colors duration-400 overflow-hidden cursor-default"
                style={{
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,102,0,0.08) 0%, transparent 60%)" }}
                />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="text-4xl mb-5 block leading-none">{card.icon}</div>
                <h3 className="text-lg font-black uppercase tracking-wide mb-3 group-hover:text-primary transition-colors duration-300">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </RevealList>
      </div>
    </section>
  );
}
