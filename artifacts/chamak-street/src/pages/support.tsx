import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { PageTransition } from "@/components/page-transition";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const WHATSAPP_NUMBER = "971501234567"; // Will be replaced by admin setting

export default function SupportPage() {
  const [agentVisible, setAgentVisible] = useState(true);
  const [phone, setPhone] = useState(WHATSAPP_NUMBER);

  useEffect(() => {
    // Load support WhatsApp number from settings
    fetch(`${BASE}/api/settings`, { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: Record<string, string>) => { if (d.support_whatsapp) setPhone(d.support_whatsapp.replace(/\D/g, "")); })
      .catch(() => {});

    // Hide agent after 2s, then redirect
    const t1 = setTimeout(() => setAgentVisible(false), 2000);
    const t2 = setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I need help with my FirstPick order.")}`, "_blank");
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent("Hi! I need help with my FirstPick order.")}`;

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <AnimatePresence>
          {agentVisible && (
            <motion.div initial={{ opacity: 0, scale: 0.7, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -30 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mb-8">
              {/* Support agent character */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="relative mx-auto w-40 h-40">
                {/* Body */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#1a1a2e] to-[#16213e] border border-primary/20 flex flex-col items-center justify-center overflow-hidden">
                  {/* Head */}
                  <div className="relative mb-1">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#f5c5a3] to-[#e8a882] flex items-center justify-center relative">
                      {/* Headphones */}
                      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full">
                        <path d="M8 30 Q8 12 32 12 Q56 12 56 30" stroke="#222" strokeWidth="4" fill="none" />
                        <rect x="4" y="28" width="10" height="16" rx="4" fill="#333" />
                        <rect x="50" y="28" width="10" height="16" rx="4" fill="#333" />
                        {/* Mic */}
                        <path d="M57 40 Q60 44 56 46" stroke="#ff6600" strokeWidth="2.5" fill="none" />
                      </svg>
                      {/* Face */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex gap-3 mb-1">
                          <div className="w-2 h-2 rounded-full bg-[#333]" />
                          <div className="w-2 h-2 rounded-full bg-[#333]" />
                        </div>
                        <div className="w-5 h-1 rounded-full bg-[#c07060]" />
                      </div>
                    </div>
                  </div>
                  {/* Suit/Badge */}
                  <div className="w-10 h-6 rounded bg-[#1a3a5c] flex items-center justify-center border border-primary/30">
                    <span className="text-[8px] font-black text-primary">FP STAFF</span>
                  </div>
                  {/* Animated pulse rings */}
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-2xl border border-primary/30 pointer-events-none" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!agentVisible && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#25D366]/20 flex items-center justify-center mx-auto border border-[#25D366]/30">
              <MessageCircle className="h-8 w-8 text-[#25D366]" />
            </div>
            <p className="font-black text-xl">Opening WhatsApp…</p>
            <p className="text-muted-foreground text-sm">Our support team is ready to help you.</p>
            <a href={waLink}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-black rounded-xl font-black text-sm hover:opacity-90 transition-opacity">
              <MessageCircle className="h-4 w-4" /> Open WhatsApp
            </a>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
