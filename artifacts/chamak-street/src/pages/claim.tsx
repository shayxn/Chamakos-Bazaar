import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { Gift, Check, ArrowRight, Lock } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { PageTransition } from "@/components/page-transition";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface GiftCardInfo {
  id: number; amount: number; status: string;
  recipientName: string | null; senderName: string | null;
  message: string | null; claimedAt: string | null;
  ownerCustomerId: number | null;
}

export default function ClaimPage() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { toast } = useToast();

  const [card, setCard]       = useState<GiftCardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const token = params?.token;
    if (!token) { setError("Invalid link"); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/gift-cards/claim/${token}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Gift not found"); return; }
        setCard(data);
        if (data.claimedAt && data.ownerCustomerId) setClaimed(true);
      } catch { setError("Network error"); }
      finally { setLoading(false); }
    })();
  }, [params?.token]);

  const handleClaim = async () => {
    if (!me) { setLocation(`/account/login?redirect=/claim/${params?.token}`); return; }
    setClaiming(true);
    try {
      const res = await fetch(`${BASE}/api/gift-cards/claim/${params?.token}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "Claim failed", variant: "destructive" }); return; }
      setClaimed(true);
      setCard(data);
      toast({ title: "Gift card claimed! 🎁", description: `AED ${card?.amount} added to your account.` });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setClaiming(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="text-xl font-black mb-2">Gift Not Found</h2>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <button onClick={() => setLocation("/")}
            className="px-6 py-3 rounded-xl border border-white/20 text-sm font-bold hover:bg-white/5 transition-colors">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-white/8 py-12 px-4 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48"
              style={{ background: "radial-gradient(ellipse, rgba(255,102,0,0.15) 0%, transparent 70%)", filter: "blur(20px)" }} />
          </div>
          <div className="relative">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="text-6xl mb-4">🎁</motion.div>
            <h1 className="text-2xl sm:text-3xl font-black">
              You've Got a <span className="text-primary">FirstPick Gift!</span>
            </h1>
            {card?.senderName && (
              <p className="text-white/50 text-sm mt-2">
                <span className="text-primary font-bold">{card.senderName}</span> just sent you a gift card
              </p>
            )}
            {!card?.senderName && (
              <p className="text-white/40 text-sm mt-2">Someone just sent you a gift card. Your next pick is on them!</p>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          {/* Card preview */}
          {card && (
            <GiftCardVisual
              amount={card.amount}
              code={claimed ? (card as any).code : undefined}
              balance={card.amount}
              recipientName={card.recipientName ?? undefined}
              senderName={card.senderName ?? undefined}
              message={card.message ?? undefined}
              preview={!claimed}
            />
          )}

          {/* Message */}
          {card?.message && (
            <div className="rounded-xl border border-white/10 p-4"
              style={{ background: "rgba(255,102,0,0.04)", borderColor: "rgba(255,102,0,0.15)" }}>
              <div className="text-xs font-bold uppercase tracking-widest text-primary/50 mb-1">Personal Message</div>
              <p className="text-white/70 text-sm italic">"{card.message}"</p>
              {card.senderName && <p className="text-xs text-white/30 mt-2">— {card.senderName}</p>}
            </div>
          )}

          {/* Gift value */}
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">Gift Value</div>
            <div className="text-5xl font-black"
              style={{ background: "linear-gradient(135deg, #ff6600, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AED {card?.amount}
            </div>
            <div className="text-xs text-white/30 mt-1">Add to your FirstPick account and shop anything</div>
          </div>

          {/* CTA */}
          {claimed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-green-400"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Check className="w-4 h-4" /> Gift card claimed and added to your account!
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setLocation("/shop")}
                style={{ touchAction: "manipulation" }}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wide text-white flex items-center justify-center gap-2"
                // @ts-ignore
                style={{ touchAction: "manipulation", background: "linear-gradient(135deg, #ff6600, #ffaa00)", boxShadow: "0 8px 32px rgba(255,102,0,0.3)" }}>
                Shop Now <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          ) : (
            <div className="space-y-3">
              {!me && (
                <div className="flex items-center gap-2 text-xs text-white/40 justify-center">
                  <Lock className="w-3.5 h-3.5" />
                  Sign in or create an account to claim this gift
                </div>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleClaim} disabled={claiming}
                style={{ touchAction: "manipulation" }}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wide text-white flex items-center justify-center gap-2 disabled:opacity-60"
                // @ts-ignore
                style={{ touchAction: "manipulation", background: "linear-gradient(135deg, #ff6600, #ffaa00)", boxShadow: "0 8px 32px rgba(255,102,0,0.3)" }}>
                {claiming ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><Gift className="w-4 h-4" /> {me ? "Claim Gift Card" : "Sign In to Claim"}</>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
