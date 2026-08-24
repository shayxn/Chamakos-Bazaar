import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { Check, Share2, Copy, ExternalLink, Gift, ArrowRight } from "lucide-react";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { PageTransition } from "@/components/page-transition";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface GiftCard {
  id: number; code: string; claimToken: string | null;
  amount: number; balance: number; status: string;
  forSelf: boolean; recipientName: string | null;
  senderName: string | null; message: string | null;
}

export default function GiftCardsCompletePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [card, setCard]       = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const claimUrl = card?.claimToken
    ? `${window.location.origin}${BASE}/claim/${card.claimToken}`
    : null;

  useEffect(() => {
    const id = params?.id;
    if (!id) { setError("Invalid link"); setLoading(false); return; }

    (async () => {
      try {
        const res = await fetch(`${BASE}/api/gift-cards/activate/${id}`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Activation failed"); return; }
        setCard(data);
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  const copyLink = () => {
    if (!claimUrl) return;
    navigator.clipboard.writeText(claimUrl).then(() => {
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with the recipient." });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareLink = () => {
    if (!claimUrl || !card) return;
    const text = `Hey! 🎁 I got you a FirstPick Gift Card worth AED ${card.amount}. Your next pick is on me — hope you find something you love.\n\n${claimUrl}`;
    if (navigator.share) {
      navigator.share({ title: "FirstPick Gift Card 🎁", text, url: claimUrl }).catch(() => {});
    } else {
      copyLink();
    }
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
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-black mb-2">Something went wrong</h2>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <button onClick={() => setLocation("/gift-cards")}
            className="px-6 py-3 rounded-xl border border-white/20 text-sm font-bold hover:bg-white/5 transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex flex-col">
        {/* Success header */}
        <div className="relative overflow-hidden border-b border-white/8 py-10 px-4 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48"
              style={{ background: "radial-gradient(ellipse, rgba(34,197,94,0.12) 0%, rgba(255,102,0,0.06) 50%, transparent 70%)", filter: "blur(20px)" }} />
          </div>
          <div className="relative">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 0 48px rgba(34,197,94,0.35)" }}>
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-black">
              {card?.forSelf ? "Your Gift Card Is Ready! 🎁" : "Gift Card Sent! 🎁"}
            </h1>
            <p className="text-white/40 text-sm mt-2">
              {card?.forSelf
                ? `AED ${card?.amount} has been added to your FirstPick account.`
                : `Share the link below so ${card?.recipientName || "they"} can claim their gift.`}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          {/* Gift card visual */}
          {card && (
            <GiftCardVisual
              amount={card.amount}
              code={card.code}
              balance={card.balance}
              recipientName={card.recipientName ?? undefined}
              senderName={card.senderName ?? undefined}
              message={card.message ?? undefined}
              claimUrl={claimUrl ?? undefined}
            />
          )}

          {/* Code display */}
          {card?.code && (
            <div className="rounded-xl border border-white/10 p-4 text-center"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">Your Gift Card Code</div>
              <div className="text-xl font-mono font-black text-white tracking-wider">{card.code}</div>
              <div className="text-xs text-white/30 mt-1">Use this at checkout to apply your balance</div>
            </div>
          )}

          {/* Share section for gifts */}
          {!card?.forSelf && claimUrl && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-white/40 text-center">Share This Gift</div>

              {/* Claim link */}
              <div className="flex gap-2 rounded-xl border border-white/10 p-3"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-1 text-xs text-white/40 font-mono truncate">{claimUrl}</div>
                <button onClick={copyLink}
                  className="shrink-0 text-primary/60 hover:text-primary transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <motion.button whileTap={{ scale: 0.97 }} onClick={shareLink}
                  style={{ touchAction: "manipulation" }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-sm font-bold hover:bg-white/5 transition-colors">
                  <Share2 className="w-4 h-4 text-primary" />
                  Share Gift 🎁
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={copyLink}
                  style={{ touchAction: "manipulation" }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-sm font-bold hover:bg-white/5 transition-colors">
                  <Copy className="w-4 h-4 text-primary" />
                  Copy Link
                </motion.button>
              </div>

              {/* WhatsApp share */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hey! 🎁 I got you a FirstPick Gift Card worth AED ${card?.amount}. Your next pick is on me — hope you find something you love.\n\n${claimUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-green-500/30 text-sm font-bold text-green-400 hover:bg-green-500/5 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setLocation("/account?tab=giftcards")}
              style={{ touchAction: "manipulation" }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-sm font-bold hover:bg-white/5 transition-colors">
              <Gift className="w-4 h-4 text-primary" />
              My Gift Cards
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setLocation("/shop")}
              style={{ touchAction: "manipulation" }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase"
              // @ts-ignore
              style={{ touchAction: "manipulation", background: "linear-gradient(135deg, #ff6600, #ffaa00)" }}>
              Shop Now <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
