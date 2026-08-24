import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, ChevronRight, Loader2, AlertCircle, User, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { PageTransition } from "@/components/page-transition";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const AMOUNTS = [50, 100, 200, 500];

export default function GiftCardsPage() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { toast } = useToast();

  const [amount, setAmount]         = useState(100);
  const [customAmount, setCustom]   = useState("");
  const [isCustom, setIsCustom]     = useState(false);
  const [forSelf, setForSelf]       = useState(true);
  const [recipientName, setRecipient] = useState("");
  const [senderName, setSender]     = useState("");
  const [message, setMessage]       = useState("");
  const [loading, setLoading]       = useState(false);

  // Pre-fill sender from account
  useEffect(() => {
    if (me?.name && !senderName) setSender(me.name);
  }, [me]);

  const displayAmount = isCustom
    ? (Number(customAmount) > 0 ? Number(customAmount) : 0)
    : amount;

  const handleBuy = async () => {
    if (!me) { setLocation("/account/login?redirect=/gift-cards"); return; }
    if (displayAmount < 10) { toast({ title: "Minimum amount is AED 10", variant: "destructive" }); return; }
    if (displayAmount > 10000) { toast({ title: "Maximum amount is AED 10,000", variant: "destructive" }); return; }
    if (!forSelf && !recipientName.trim()) { toast({ title: "Enter the recipient's name", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/gift-cards/purchase`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: displayAmount,
          forSelf,
          recipientName: forSelf ? "" : recipientName.trim(),
          senderName: senderName.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");
      window.location.href = data.redirectUrl;
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-black">
        {/* Hero header */}
        <div className="relative overflow-hidden border-b border-white/8 py-10 px-4">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40"
              style={{ background: "radial-gradient(ellipse, rgba(255,102,0,0.12) 0%, transparent 70%)", filter: "blur(20px)" }} />
          </div>
          <div className="relative max-w-5xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Digital Gift Card</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
              Give the Gift of <span className="text-primary">FirstPick</span>
            </h1>
            <p className="text-white/40 text-sm mt-2 max-w-md mx-auto">
              A premium digital gift card — instantly delivered, never expires on what matters.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

            {/* LEFT — Form */}
            <div className="space-y-6 order-2 lg:order-1">

              {/* Amount selector */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Select Amount</div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {AMOUNTS.map(a => (
                    <motion.button key={a} whileTap={{ scale: 0.95 }}
                      onClick={() => { setAmount(a); setIsCustom(false); }}
                      style={{ touchAction: "manipulation" }}
                      className={`py-3 rounded-xl text-sm font-black border transition-all ${
                        !isCustom && amount === a
                          ? "border-primary/60 text-primary"
                          : "border-white/10 text-white/50 hover:border-white/20"
                      }`}
                      style2={{ background: !isCustom && amount === a ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.03)" }}
                      // @ts-ignore
                      style={{ touchAction: "manipulation", background: !isCustom && amount === a ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.03)" }}>
                      {a}
                    </motion.button>
                  ))}
                </div>
                {/* Custom amount */}
                <div
                  onClick={() => setIsCustom(true)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 cursor-text transition-all ${
                    isCustom ? "border-primary/50" : "border-white/10 hover:border-white/20"
                  }`}
                  style={{ background: isCustom ? "rgba(255,102,0,0.05)" : "rgba(255,255,255,0.02)" }}>
                  <span className="text-white/40 text-sm font-bold">AED</span>
                  <input
                    className="flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder-white/25"
                    placeholder="Custom amount"
                    type="number"
                    min={10}
                    max={10000}
                    value={customAmount}
                    onFocus={() => setIsCustom(true)}
                    onChange={e => setCustom(e.target.value)}
                  />
                </div>
              </div>

              {/* For Me / For Someone Else */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Who Is This For?</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: true, label: "For Me", sub: "Add to my account" },
                    { value: false, label: "Gift 🎁", sub: "Send to someone" },
                  ].map(opt => (
                    <motion.button key={String(opt.value)} whileTap={{ scale: 0.97 }}
                      onClick={() => setForSelf(opt.value)}
                      style={{ touchAction: "manipulation" }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        forSelf === opt.value ? "border-primary/50" : "border-white/10 hover:border-white/20"
                      }`}
                      // @ts-ignore
                      style={{ touchAction: "manipulation", background: forSelf === opt.value ? "rgba(255,102,0,0.08)" : "rgba(255,255,255,0.02)" }}>
                      <div className={`text-sm font-black ${forSelf === opt.value ? "text-white" : "text-white/50"}`}>{opt.label}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{opt.sub}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recipient fields */}
              <AnimatePresence>
                {!forSelf && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Recipient Details</div>
                      <Input
                        placeholder="Recipient's name"
                        value={recipientName}
                        onChange={e => setRecipient(e.target.value)}
                        className="bg-white/3 border-white/10 focus:border-primary/50"
                      />
                    </div>
                    <Textarea
                      placeholder="Personal message (optional)..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={2}
                      className="bg-white/3 border-white/10 focus:border-primary/50 resize-none text-sm"
                    />
                    <Input
                      placeholder="Your name (shown on card)"
                      value={senderName}
                      onChange={e => setSender(e.target.value)}
                      className="bg-white/3 border-white/10 focus:border-primary/50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login notice or Buy button */}
              {!me ? (
                <div className="rounded-xl border border-white/10 p-4 text-center space-y-3"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-sm text-white/50">Sign in to purchase a FirstPick Gift Card</p>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setLocation("/account/login?redirect=/gift-cards")}
                    style={{ touchAction: "manipulation" }}
                    className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wide text-white"
                    // @ts-ignore
                    style={{ touchAction: "manipulation", background: "linear-gradient(135deg, #ff6600, #ffaa00)" }}>
                    Sign In to Buy
                  </motion.button>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleBuy} disabled={loading}
                  style={{ touchAction: "manipulation" }}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wide text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  // @ts-ignore
                  style={{ touchAction: "manipulation", background: "linear-gradient(135deg, #ff6600, #ffaa00)", boxShadow: "0 8px 32px rgba(255,102,0,0.3)" }}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Gift className="w-4 h-4" /> Buy Gift Card — AED {displayAmount > 0 ? displayAmount : "?"}</>
                  )}
                </motion.button>
              )}

              {/* Digital delivery note */}
              <div className="flex items-start gap-2 text-xs text-white/30">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/40" />
                <span>Digital delivery — no shipping required. Gift cards are activated instantly after payment. No cash on delivery.</span>
              </div>
            </div>

            {/* RIGHT — Live card preview */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-8">
              <div className="text-xs font-bold uppercase tracking-widest text-white/25 mb-3 text-center">Preview</div>
              <GiftCardVisual
                amount={displayAmount || 0}
                preview
                recipientName={!forSelf ? recipientName || undefined : undefined}
                senderName={senderName || undefined}
                message={message || undefined}
              />
              <div className="mt-3 text-center text-[10px] text-white/20">
                Your unique code and QR will appear after purchase
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
