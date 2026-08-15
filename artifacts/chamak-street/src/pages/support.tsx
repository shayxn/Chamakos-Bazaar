import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, Mail, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { PageTransition } from "@/components/page-transition";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const FAQS = [
  { q: "How long does delivery take?", a: "Standard: 3–5 days · Express: 1–2 days · Priority: same-day or next-day within Dubai. You'll get a WhatsApp update when your order ships." },
  { q: "What payment methods do you accept?", a: "We accept Cash on Delivery (COD) for all orders. We're working on adding card payments soon." },
  { q: "Can I return or exchange an item?", a: "Yes! Items in original condition can be returned within 7 days of delivery. Message us on WhatsApp to start a return." },
  { q: "Are the products authentic / rep?", a: "All products are clearly labelled. Rep items are marked on the product page. We never misrepresent what you're buying." },
  { q: "I didn't receive my order. What do I do?", a: "Check your order status in My Account → My Orders. If it says delivered but you haven't received it, WhatsApp us right away with your order number." },
];

export default function SupportPage() {
  const [phone, setPhone] = useState("971501234567");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [agentPhase, setAgentPhase] = useState<"enter" | "idle" | "wave">("enter");
  const phoneRef = useRef("971501234567");

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: Record<string, string>) => {
        if (d.support_whatsapp) {
          const cleaned = d.support_whatsapp.replace(/\D/g, "");
          setPhone(cleaned);
          phoneRef.current = cleaned;
        }
      })
      .catch(() => {});
  }, []);

  // Agent animation cycle
  useEffect(() => {
    const t1 = setTimeout(() => setAgentPhase("idle"), 800);
    const t2 = setTimeout(() => setAgentPhase("wave"), 2500);
    const t3 = setTimeout(() => setAgentPhase("idle"), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent("Hi! I need help with my FirstPick order.")}`;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-lg mx-auto">

          {/* Agent hero */}
          <div className="flex flex-col items-center mb-10">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="relative mb-5">

              {/* Glow */}
              <div className="absolute inset-0 blur-2xl opacity-30 scale-150"
                style={{ background: "radial-gradient(circle, #ff6600, transparent)" }} />

              {/* Character body */}
              <motion.div
                animate={agentPhase === "enter" ? { scale: [0, 1.1, 1], opacity: [0, 1, 1] } : agentPhase === "wave" ? { rotate: [0, -5, 5, -3, 0] } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative w-36 h-36 rounded-3xl border border-primary/25 overflow-hidden"
                style={{ background: "linear-gradient(145deg, rgba(20,12,30,1) 0%, rgba(10,6,18,1) 100%)" }}>

                {/* Animated shimmer */}
                <motion.div animate={{ x: [-200, 200] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute inset-0 opacity-10"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,102,0,0.5), transparent)", width: "60%", pointerEvents: "none" }} />

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {/* Head */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden"
                      style={{ background: "linear-gradient(160deg, #f5c5a3 0%, #e8a882 100%)" }}>
                      {/* Headset */}
                      <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full">
                        <path d="M6 26 Q6 10 28 10 Q50 10 50 26" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                        <rect x="2" y="24" width="8" height="14" rx="4" fill="#222" />
                        <rect x="46" y="24" width="8" height="14" rx="4" fill="#222" />
                        <path d="M50 34 Q54 38 50 42" stroke="#ff6600" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      </svg>
                      {/* Face */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="flex gap-3 mb-1.5">
                          {[0,1].map(i => (
                            <motion.div key={i} animate={{ scaleY: [1, 0.1, 1] }} transition={{ repeat: Infinity, duration: 4, delay: i === 0 ? 0 : 0.1 }}
                              className="w-2 h-2 rounded-full bg-[#2a1a0e]" />
                          ))}
                        </div>
                        <div className="w-5 h-1.5 rounded-full bg-[#c07060]" />
                      </div>
                    </div>
                  </div>

                  {/* Badge */}
                  <motion.div animate={{ boxShadow: ["0 0 0px rgba(255,102,0,0)", "0 0 12px rgba(255,102,0,0.4)", "0 0 0px rgba(255,102,0,0)"] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="px-3 py-1 rounded-lg border border-primary/40"
                    style={{ background: "rgba(255,102,0,0.15)" }}>
                    <span className="text-[9px] font-black text-primary tracking-widest">FP SUPPORT</span>
                  </motion.div>
                </div>

                {/* Pulse rings */}
                {[0,1].map(i => (
                  <motion.div key={i} animate={{ scale: [1, 1.4], opacity: [0.25, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: i * 1 }}
                    className="absolute inset-0 rounded-3xl border border-primary/30 pointer-events-none" />
                ))}
              </motion.div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="text-2xl font-black text-center mb-1">Hey, need help? 👋</motion.h1>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="text-muted-foreground text-sm text-center">Our team is ready to help with orders, deliveries, and returns.</motion.p>
          </div>

          {/* Contact methods */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            className="grid grid-cols-1 gap-3 mb-8">

            {/* WhatsApp — primary */}
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <motion.div whileTap={{ scale: 0.97 }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#25D366]/30 transition-all hover:border-[#25D366]/60 cursor-pointer"
                style={{ background: "rgba(37,211,102,0.06)", backdropFilter: "blur(20px)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[#25D366]/30"
                  style={{ background: "rgba(37,211,102,0.15)" }}>
                  <MessageCircle className="h-6 w-6 text-[#25D366]" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Fastest response · Usually within minutes</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                  <span className="text-xs font-bold text-[#25D366]">Live</span>
                </div>
              </motion.div>
            </a>

            {/* Hours */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/8"
              style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-black text-sm">Support Hours</p>
                <p className="text-xs text-muted-foreground">Daily · 9 AM – 11 PM Dubai time</p>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Frequently Asked</p>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 + i * 0.06 }}
                  className="rounded-2xl border border-white/8 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                    <p className="font-bold text-sm pr-4">{faq.q}</p>
                    {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} className="overflow-hidden">
                        <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sticky WhatsApp CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
            className="mt-8 sticky bottom-4">
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <motion.button whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#25D366]/20 transition-all"
                style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}>
                <MessageCircle className="h-5 w-5" />
                Chat with FirstPick Support
              </motion.button>
            </a>
          </motion.div>

        </div>
      </div>
    </PageTransition>
  );
}
