import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Shield, ShoppingBag, Zap, Gift } from "lucide-react";
import { useState, useEffect } from "react";

interface GiftCardVisualProps {
  amount: number;
  code?: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  balance?: number;
  claimUrl?: string;
  preview?: boolean;   // true = "??????" code, placeholder styling
  compact?: boolean;   // mini version for account page
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const VALID_YEARS = 2;

function validUntilDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + VALID_YEARS);
  return d.toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

export function GiftCardVisual({
  amount, code, recipientName, senderName, message,
  balance, claimUrl, preview = false, compact = false,
}: GiftCardVisualProps) {
  const [copied, setCopied] = useState(false);
  const displayCode = preview ? `FP-GIFT-??????` : (code ?? "FP-GIFT-XXXXXX");
  const displayBalance = balance !== undefined ? balance : amount;
  const validUntil = validUntilDate();

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyLink = () => {
    if (!claimUrl) return;
    navigator.clipboard.writeText(claimUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const qrData = claimUrl ?? `${typeof window !== "undefined" ? window.location.origin : ""}${BASE}/shop`;
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=88x88&color=ff8800&bgcolor=080508&data=${encodeURIComponent(qrData)}`;

  if (compact) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-white/10 p-4 flex gap-4 items-center"
        style={{ background: "linear-gradient(135deg, #0c0810 0%, #100d18 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, #ff6600 0%, transparent 70%)", filter: "blur(16px)" }} />
        </div>
        <div className="shrink-0">
          <div className="text-[10px] font-black uppercase tracking-widest">
            <span className="text-white">FIRST</span><span className="text-primary">PICK</span>
          </div>
          <div className="text-[8px] text-primary/60 font-bold uppercase tracking-widest mt-0.5">• GIFT CARD •</div>
        </div>
        <div className="flex-1">
          <div className="text-xl font-black">
            <span className="text-white/50 text-sm">AED </span>
            <motion.span
              key={displayBalance}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "linear-gradient(135deg, #ff6600, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {displayBalance.toFixed(0)}
            </motion.span>
          </div>
          {code && (
            <div className="text-[10px] font-mono text-white/40 mt-0.5">{code}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/30 uppercase font-bold">Balance</div>
          <div className="text-sm font-black text-primary">AED {displayBalance.toFixed(0)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full select-none" style={{ aspectRatio: "1.67 / 1", minHeight: 220 }}>
      {/* Card base */}
      <div className="absolute inset-0 rounded-[20px] overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(145deg, #0b0810 0%, #0f0c1a 40%, #08060f 100%)" }}>

        {/* Ambient glow — top-right */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,100,0,0.28) 0%, rgba(255,160,0,0.08) 45%, transparent 70%)", filter: "blur(2px)" }} />

        {/* Subtle shimmer line */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)" }} />

        {/* Bottom ambient */}
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,100,0,0.07) 0%, transparent 70%)", filter: "blur(20px)" }} />

        {/* ── CONTENT ── */}
        <div className="absolute inset-0 flex flex-col p-5 sm:p-6">

          {/* Row 1: Logo + Code */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-base sm:text-lg font-black uppercase tracking-tight leading-none">
                <span className="text-white">FIRST</span><span className="text-primary">PICK</span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5"
                style={{ color: "rgba(255,140,0,0.7)" }}>• GIFT CARD •</div>
            </div>

            {/* Code box */}
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-white/30 mb-1 text-right">GIFT CARD CODE ✦</div>
              <button
                onClick={copyCode}
                disabled={preview || !code}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono font-bold text-white/80 transition-all hover:bg-white/5 disabled:cursor-default"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
                <span className={preview ? "opacity-30" : ""}>{displayCode}</span>
                {code && (
                  <span className="shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Amount + Decorative */}
          <div className="flex items-center justify-between flex-1 my-2">
            <div>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,150,0,0.8)" }}>
                A GIFT FOR YOU ✦
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/50 text-sm sm:text-base font-black uppercase">AED</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={amount}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="text-4xl sm:text-5xl font-black leading-none"
                    style={{ background: "linear-gradient(135deg, #ff6600 0%, #ffaa00 50%, #ff8800 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {amount.toFixed(0)}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] mt-1 text-white/25">
                ONE CARD. ENDLESS PICKS.
              </div>
            </div>

            {/* Decorative FIRSTPICK rings */}
            <div className="relative flex items-center justify-center mr-2 sm:mr-4" style={{ width: 90, height: 90 }}>
              {[80, 62, 44].map((size, i) => (
                <motion.div key={size}
                  animate={{ scale: [1, 1.04, 1], opacity: [0.12, 0.22, 0.12] }}
                  transition={{ repeat: Infinity, duration: 2.5 + i * 0.4, ease: "easeInOut", delay: i * 0.3 }}
                  className="absolute rounded-full border"
                  style={{ width: size, height: size, borderColor: `rgba(255,${100 + i * 20},0,${0.3 - i * 0.08})` }} />
              ))}
              <div className="relative z-10 text-center">
                <div className="text-[11px] font-black leading-none">
                  <span style={{ color: "rgba(255,255,255,0.85)" }}>FIRST</span>
                </div>
                <div className="text-[11px] font-black leading-none -mt-0.5"
                  style={{ background: "linear-gradient(135deg,#ff6600,#ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  PICK
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: To/From + Balance + QR */}
          <div className="flex items-end gap-2 sm:gap-3">
            {/* To / From / Message */}
            <div className="flex-1 rounded-xl border p-2 sm:p-2.5 text-[9px] sm:text-[10px] leading-relaxed"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-start gap-1.5">
                <Gift className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  {recipientName ? (
                    <><div><span className="text-white/30 font-bold">TO: </span><span className="text-white/70">{recipientName}</span></div>
                    {senderName && <div><span className="text-white/30 font-bold">FROM: </span><span className="text-white/70">{senderName}</span></div>}
                    {message && <div className="text-primary/70 font-bold mt-0.5">"{message}"</div>}</>
                  ) : (
                    <><div className="text-white/20">TO: ——</div>
                    <div className="text-white/20">FROM: ——</div>
                    <div className="text-white/12 mt-0.5 italic">Personal message...</div></>
                  )}
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="shrink-0 text-center">
              <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">BALANCE</div>
              <div className="text-base sm:text-lg font-black"
                style={{ background: "linear-gradient(135deg, #ff6600, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                AED {displayBalance.toFixed(0)}
              </div>
              <div className="text-[7px] sm:text-[8px] font-bold uppercase text-white/25 mt-0.5">VALID UNTIL</div>
              <div className="text-[7px] sm:text-[8px] font-bold text-primary/60">{validUntil}</div>
            </div>

            {/* QR */}
            <div className="shrink-0 text-center">
              <div className="text-[8px] font-bold uppercase tracking-widest text-white/30 mb-1">SCAN TO SHOP</div>
              <div className="rounded-lg overflow-hidden border border-white/10"
                style={{ width: 48, height: 48, background: "rgba(8,5,8,0.9)" }}>
                <img src={qrUrl} alt="QR" className="w-full h-full object-cover opacity-90"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            </div>
          </div>

          {/* Row 4: Footer badges */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {[
              { icon: Shield, label: "100% SECURE" },
              { icon: ShoppingBag, label: "SHOP ANYTHING" },
              { icon: Zap, label: "FIRSTPICK PROMISE" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1 text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-white/20">
                <Icon className="w-2.5 h-2.5 text-primary/30" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
