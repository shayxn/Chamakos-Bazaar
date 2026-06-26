import React, { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, ShoppingBag, ChevronDown, X, Check, Menu } from "lucide-react";
import gtaPoster from "@assets/IMG_0051_1782471586956.jpeg";
import gtaBoxArt from "@assets/IMG_0054_1782472985504.jpeg";
import gtaPackaging from "@assets/IMG_0055_1782472977785.jpeg";
import gtaMusic from "@assets/GTA_6_-_Official_Main_Theme_Music_1782459811057.mp3";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;
const GTA_GAME_ID = 1;

type Game = {
  id: number; name: string; description: string | null;
  coverImage: string | null; videoUrl: string | null; musicUrl: string | null;
  platform: string | null; genre: string | null; isPreOrder: boolean;
  preOrderDate: string | null; preOrderPrice: number | null;
  preOrderNote: string | null; preOrderButtonText: string | null;
  isActive: boolean; animationEnabled: boolean;
};

function isGtaGame(game: Game) {
  return game.name.toLowerCase().includes("grand theft auto") ||
    game.name.toLowerCase().includes("gta") || game.id === GTA_GAME_ID;
}

const LETTERS_GTA = "GRAND THEFT AUTO".split("");

function RockstarLogo() {
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 fill-white" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="black" />
      <text x="50" y="68" textAnchor="middle" fontSize="52" fontWeight="900" fontFamily="serif" fill="white">R★</text>
    </svg>
  );
}

function PalmTree({ x, scale = 1, opacity = 1 }: { x: string; scale?: number; opacity?: number }) {
  return (
    <div className="absolute bottom-0" style={{ left: x, transform: `scaleX(${scale})`, opacity }}>
      <svg viewBox="0 0 60 120" width="60" height="120" fill="#0a0a12">
        <rect x="27" y="50" width="6" height="70" />
        <ellipse cx="30" cy="45" rx="22" ry="10" transform="rotate(-20 30 45)" />
        <ellipse cx="30" cy="42" rx="20" ry="9" transform="rotate(15 30 42)" />
        <ellipse cx="30" cy="40" rx="18" ry="9" transform="rotate(-35 30 40)" />
        <ellipse cx="30" cy="38" rx="16" ry="8" transform="rotate(30 30 38)" />
        <ellipse cx="30" cy="36" rx="14" ry="8" transform="rotate(0 30 36)" />
      </svg>
    </div>
  );
}

function NeonSkyline() {
  const buildings = [
    { w: 40, h: 160, x: 0 }, { w: 30, h: 110, x: 42 }, { w: 50, h: 200, x: 74 },
    { w: 35, h: 140, x: 126 }, { w: 25, h: 90, x: 163 }, { w: 60, h: 220, x: 190 },
    { w: 40, h: 170, x: 252 }, { w: 30, h: 120, x: 294 }, { w: 45, h: 180, x: 326 },
    { w: 55, h: 240, x: 373 }, { w: 35, h: 130, x: 430 }, { w: 50, h: 190, x: 467 },
    { w: 40, h: 155, x: 519 }, { w: 28, h: 100, x: 561 }, { w: 65, h: 230, x: 591 },
    { w: 38, h: 145, x: 658 }, { w: 30, h: 108, x: 698 }, { w: 48, h: 185, x: 730 },
    { w: 42, h: 160, x: 780 }, { w: 25, h: 95, x: 824 }, { w: 55, h: 210, x: 851 },
    { w: 35, h: 135, x: 908 }, { w: 45, h: 170, x: 945 }, { w: 60, h: 220, x: 992 },
    { w: 30, h: 110, x: 1054 }, { w: 40, h: 155, x: 1086 }, { w: 50, h: 195, x: 1128 },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ height: 280 }}>
      <svg viewBox="0 0 1280 280" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
        {buildings.map((b, i) => (
          <rect key={i} x={b.x} y={280 - b.h} width={b.w} height={b.h}
            fill={i % 5 === 0 ? "#1a0a2e" : i % 3 === 0 ? "#0a0a1e" : "#050512"} />
        ))}
        {buildings.filter((_, i) => i % 4 === 0).map((b, i) => (
          <rect key={`w${i}`} x={b.x + 8} y={280 - b.h + 15} width={6} height={8}
            fill="#ff69d4" opacity={0.9} />
        ))}
        {buildings.filter((_, i) => i % 3 === 1).map((b, i) => (
          <rect key={`c${i}`} x={b.x + 15} y={280 - b.h + 10} width={6} height={8}
            fill="#00e5ff" opacity={0.8} />
        ))}
      </svg>
    </div>
  );
}

function GtaCinematicAnimation({ onComplete, muted, onToggleMute }: {
  onComplete: () => void; muted: boolean; onToggleMute: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const timings = [1400, 3000, 5200, 8200, 11500, 14000, 17000];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timings.forEach((ms, i) => {
      const t = setTimeout(() => {
        if (i < timings.length - 1) setPhase(i + 1);
        else onComplete();
      }, ms);
      timeouts.push(t);
    });
    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.volume = 0.65; audioRef.current.play().catch(() => {}); }
  }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  const sunsetGradient = phase >= 1;
  const skylineVisible = phase >= 2;
  const posterVisible = phase >= 3;
  const titleVisible = phase >= 4;
  const viVisible = phase >= 5;
  const ctaVisible = phase >= 6;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black select-none">
      <audio ref={audioRef} src={gtaMusic} loop preload="auto" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="absolute top-6 left-6 z-50">
        <Link href="/games">
          <button className="flex items-center gap-2 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </Link>
      </motion.div>
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        onClick={onToggleMute}
        className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </motion.button>
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4 }}
        onClick={onComplete}
        className="absolute bottom-8 right-8 z-50 text-white/40 hover:text-white text-xs font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
        Skip <ChevronDown className="h-3 w-3 -rotate-90" />
      </motion.button>

      <AnimatePresence>
        {phase === 0 && (
          <motion.div key="rstar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.6 }} className="absolute inset-0 flex items-center justify-center bg-black">
            <motion.div animate={{ opacity: [0, 1, 1, 0.8] }} transition={{ duration: 1.4, times: [0, 0.3, 0.7, 1] }}>
              <RockstarLogo />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sunsetGradient && (
          <motion.div key="sky" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,#1a0033 0%,#4a0080 15%,#c0006a 35%,#ff3060 52%,#ff7820 68%,#ffc060 80%,#ffe08a 100%)" }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {skylineVisible && (
          <motion.div key="skyline" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE }}>
            <NeonSkyline />
            <PalmTree x="5%" /><PalmTree x="12%" scale={-1} /><PalmTree x="78%" />
            <PalmTree x="88%" scale={-1} /><PalmTree x="93%" />
          </motion.div>
        )}
      </AnimatePresence>

      {sunsetGradient && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)" }} />
      )}

      <AnimatePresence>
        {posterVisible && (
          <motion.div key="poster" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="absolute top-0 left-0 right-0 h-[12%] bg-black z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black z-10" />
            <motion.div className="absolute inset-0 overflow-hidden"
              initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.2, ease: [0.86, 0, 0.07, 1] }}>
              <img src={gtaPoster} alt="GTA VI" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(180,0,100,0.35) 0%,rgba(0,180,220,0.25) 100%)" }} />
            </motion.div>
            {[0, 0.15, 0.3].map((delay, i) => (
              <motion.div key={i} className="absolute left-0 right-0 h-px bg-white/60 z-20"
                style={{ top: `${28 + i * 18}%` }}
                initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: [0, 0.8, 0], scaleX: [0, 1, 1] }}
                transition={{ delay: delay + 0.4, duration: 0.25 }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {titleVisible && (
          <motion.div key="title-text" className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
            <div className="relative flex flex-wrap justify-center gap-x-[0.18em] overflow-hidden mb-2">
              {LETTERS_GTA.map((char, i) => (
                <motion.span key={i} initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-white font-black"
                  style={{ fontSize: "clamp(1.1rem,4vw,3rem)", letterSpacing: "0.18em", fontFamily: "Impact, Arial Black, sans-serif", textShadow: "0 0 20px rgba(255,80,160,0.7), 0 0 40px rgba(255,80,160,0.3)" }}>
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </div>
            {!viVisible && (
              <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: LETTERS_GTA.length * 0.04 + 0.3, duration: 0.7, ease: EASE }}
                style={{ fontSize: "clamp(5rem,20vw,14rem)", fontFamily: "Impact, Arial Black, sans-serif", fontWeight: 900, lineHeight: 1, background: "linear-gradient(135deg,#ff3ca0 0%,#bf00ff 40%,#00e5ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 30px rgba(255,60,160,0.6)) drop-shadow(0 0 60px rgba(0,229,255,0.4))" }}>
                VI
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viVisible && (
          <motion.div key="vi-big" className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center,rgba(180,0,100,0.25) 0%,rgba(0,0,0,0.8) 70%)" }} />
            <motion.div className="absolute rounded-full border-2 border-pink-500/30"
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              style={{ width: 300, height: 300 }} />
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-white font-black uppercase tracking-[0.4em] mb-1 relative z-10"
              style={{ fontSize: "clamp(0.55rem,2vw,1.1rem)", textShadow: "0 0 10px rgba(255,80,160,0.5)" }}>
              Grand Theft Auto
            </motion.p>
            <motion.div className="relative z-10" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: "clamp(6rem,28vw,18rem)", fontFamily: "Impact, Arial Black, sans-serif", fontWeight: 900, lineHeight: 1, background: "linear-gradient(135deg,#ff3ca0 0%,#bf00ff 40%,#00e5ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 40px rgba(255,60,160,0.8)) drop-shadow(0 0 80px rgba(0,229,255,0.5))" }}>
              VI
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctaVisible && (
          <motion.div key="cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
            <motion.p animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}
              className="text-white/80 text-xs font-black uppercase tracking-[0.4em]">
              Pre-Order Now · AED 299
            </motion.p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              className="px-10 py-4 font-black uppercase tracking-widest text-sm text-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-sm"
              style={{ boxShadow: "0 0 40px rgba(255,60,160,0.5),0 0 80px rgba(0,229,255,0.2)" }}>
              Enter the Experience
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GtaViLogoSvg({ width = 160 }: { width?: number }) {
  const h = Math.round(width * 0.9);
  return (
    <svg viewBox="0 0 200 180" width={width} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="vgrad" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#7060e8" />
          <stop offset="38%" stopColor="#e040a0" />
          <stop offset="72%" stopColor="#e86820" />
          <stop offset="100%" stopColor="#f0a800" />
        </linearGradient>
      </defs>
      {/* V shape */}
      <polygon points="0,0 100,165 200,0 175,0 100,130 25,0" fill="url(#vgrad)" />
      {/* grand */}
      <text x="52" y="48" textAnchor="middle" fontSize="18" fill="white" fontWeight="900"
        fontFamily="Impact, Arial Black, sans-serif" letterSpacing="1">grand</text>
      {/* theft */}
      <text x="100" y="76" textAnchor="middle" fontSize="18" fill="white" fontWeight="900"
        fontFamily="Impact, Arial Black, sans-serif" letterSpacing="1">theft</text>
      {/* auto */}
      <text x="100" y="175" textAnchor="middle" fontSize="14" fill="white" fontWeight="900"
        fontFamily="Impact, Arial Black, sans-serif" letterSpacing="3">auto</text>
    </svg>
  );
}

function VisitLeonidaLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="18" fill="white" />
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 20 + Math.cos(rad) * 11;
          const y1 = 20 + Math.sin(rad) * 11;
          const x2 = 20 + Math.cos(rad) * (i % 3 === 0 ? 18 : 15);
          const y2 = 20 + Math.sin(rad) * (i % 3 === 0 ? 18 : 15);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0a3020" strokeWidth="1.5" />;
        })}
        <circle cx="20" cy="20" r="6" fill="#0a3020" />
      </svg>
      <span className="font-black text-white uppercase tracking-wider" style={{ fontSize: size * 0.45 }}>
        Visit<br />Leonida
      </span>
    </div>
  );
}

function GtaViRevealPage({ game, muted, onToggleMute, onPreOrder, audioRef }: {
  game: Game; muted: boolean; onToggleMute: () => void; onPreOrder: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}) {
  const [showPreOrderInNav, setShowPreOrderInNav] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowPreOrderInNav(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[#0c0d1a] text-white overflow-x-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {game.animationEnabled && <audio ref={audioRef} src={gtaMusic} loop preload="auto" />}

      {/* ── FIXED NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-white font-black text-xl tracking-tight" style={{ fontFamily: "Impact, Arial Black, sans-serif", letterSpacing: "-0.02em" }}>VI</span>
          <AnimatePresence>
            {showPreOrderInNav && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2">
                <span className="text-white/40 text-lg font-thin">|</span>
                <span className="text-white/70 text-sm font-medium">Only in Leonida</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {showPreOrderInNav && (
              <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onClick={onPreOrder}
                className="px-5 py-2 rounded-full font-bold text-sm text-white"
                style={{ background: "#e8405a" }}>
                Pre-Order Now
              </motion.button>
            )}
          </AnimatePresence>
          <button onClick={onToggleMute}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-white/70 transition-colors">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-4 z-50 bg-[#12142a] border border-white/10 rounded-xl p-4 min-w-[180px] shadow-2xl">
            <button onClick={() => setMenuOpen(false)} className="absolute top-3 right-3 text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-3 text-sm font-semibold pt-1">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Navigate</p>
              {["Story", "Characters", "Pre-Order", "Chamak Street"].map((item) => (
                <div key={item} className="text-white hover:text-[#e8405a] transition-colors cursor-pointer">{item}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          SECTION 1: ART MOSAIC HERO
      ══════════════════════════════════════════════ */}
      <section className="relative w-full bg-[#0a0a18]" style={{ minHeight: "100dvh" }}>
        {/* Mosaic grid */}
        <div className="absolute inset-0 grid" style={{
          gridTemplateColumns: "1fr 2fr 1.5fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 3,
          padding: "60px 0 0",
        }}>
          {/* Row 1 */}
          <div style={{ background: "linear-gradient(135deg,#1a1050 0%,#2a1570 50%,#4a08a0 100%)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 60%,rgba(120,0,200,0.5) 0%,transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "80%", height: "95%",
              backgroundImage: "linear-gradient(135deg,#3a1090,#6020b0,#2a0870)",
              backgroundSize: "cover", borderRadius: "8px 0 0 0" }}>
              <svg viewBox="0 0 120 200" style={{ width: "100%", height: "100%", opacity: 0.6 }}>
                <ellipse cx="60" cy="80" rx="40" ry="60" fill="#8040c0" opacity="0.7" />
                <ellipse cx="60" cy="80" rx="25" ry="45" fill="#c060e0" opacity="0.5" />
                <rect x="40" y="130" width="40" height="70" fill="#6030a0" opacity="0.8" />
                <ellipse cx="60" cy="70" rx="20" ry="18" fill="#e0a0ff" opacity="0.6" />
              </svg>
            </div>
          </div>
          <div style={{ position: "relative", overflow: "hidden", gridRow: "1 / 3", gridColumn: "2 / 3" }}>
            <img src={gtaPoster} alt="Jason & Lucia" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,transparent 30%)" }} />
          </div>
          <div style={{ background: "linear-gradient(135deg,#0a3060 0%,#0a5080 50%,#2080c0 100%)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <svg viewBox="0 0 200 180" style={{ width: "100%", height: "100%", opacity: 0.7 }}>
                <rect x="0" y="60" width="200" height="120" fill="#0a4070" />
                <ellipse cx="100" cy="100" rx="80" ry="40" fill="#0a80c0" opacity="0.6" />
                <path d="M0 80 Q50 40 100 60 Q150 80 200 50 L200 180 L0 180Z" fill="#0060a0" opacity="0.7" />
                <circle cx="150" cy="40" r="25" fill="#4090d0" opacity="0.5" />
                <rect x="60" y="20" width="80" height="5" fill="#80c0ff" rx="2" opacity="0.8" />
              </svg>
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg,#1a0a2a 0%,#3a1540 100%)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <svg viewBox="0 0 120 180" style={{ width: "100%", height: "100%", opacity: 0.7 }}>
                <rect x="20" y="20" width="80" height="160" fill="#4a1060" />
                <rect x="30" y="40" width="60" height="120" fill="#2a0840" />
                <circle cx="60" cy="30" r="15" fill="#c040e0" opacity="0.9" />
                <rect x="50" y="50" width="20" height="25" fill="#e060ff" opacity="0.6" />
                <line x1="0" y1="90" x2="120" y2="90" stroke="#ff40a0" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
          </div>
          {/* Row 2 */}
          <div style={{ background: "linear-gradient(135deg,#301010 0%,#601820 100%)", overflow: "hidden", position: "relative" }}>
            <img src={gtaBoxArt} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
          </div>
          <div style={{ background: "linear-gradient(135deg,#102820 0%,#204030 50%,#408040 100%)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <svg viewBox="0 0 180 160" style={{ width: "100%", height: "100%", opacity: 0.8 }}>
                <rect x="0" y="0" width="180" height="160" fill="#1a4020" />
                <path d="M0 60 Q45 30 90 50 Q135 70 180 40 L180 160 L0 160Z" fill="#2a6030" />
                <ellipse cx="90" cy="100" rx="70" ry="30" fill="#406040" opacity="0.6" />
                <circle cx="40" cy="40" r="20" fill="#60a050" opacity="0.7" />
                <circle cx="140" cy="60" r="15" fill="#50c040" opacity="0.5" />
              </svg>
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg,#201030 0%,#401860 100%)", overflow: "hidden", position: "relative" }}>
            <img src={gtaPackaging} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
          </div>
          <div style={{ background: "linear-gradient(135deg,#0a1828 0%,#183050 100%)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <svg viewBox="0 0 120 180" style={{ width: "100%", height: "100%", opacity: 0.8 }}>
                <rect x="0" y="0" width="120" height="180" fill="#101828" />
                <circle cx="60" cy="60" r="50" fill="#1a3060" opacity="0.8" />
                <circle cx="60" cy="60" r="35" fill="#204080" opacity="0.7" />
                <rect x="45" y="50" width="30" height="80" fill="#3060a0" opacity="0.8" rx="4" />
                <rect x="50" y="30" width="20" height="40" fill="#4080c0" opacity="0.6" rx="3" />
                <ellipse cx="60" cy="55" rx="15" ry="12" fill="#80b0e0" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>

        {/* GTA VI Logo Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: 60 }}>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
            style={{ filter: "drop-shadow(0 0 40px rgba(180,80,255,0.6)) drop-shadow(0 0 80px rgba(255,80,160,0.4))" }}>
            <GtaViLogoSvg width={Math.min(380, window.innerWidth * 0.5)} />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown className="h-6 w-6 text-white/40" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 2: JASON & LUCIA ON GREEN CAR (full bleed)
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ height: "100dvh" }}>
        <img src={gtaPoster} alt="Jason and Lucia" className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center 20%" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.1) 50%,rgba(0,0,0,0.4) 100%)" }} />
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3: VICE CITY AERIAL SUNSET
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ height: "100dvh" }}>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg,#2a1050 0%,#4a0878 15%,#8020a0 28%,#c04060 42%,#e07020 58%,#f0a030 72%,#f0c050 85%,#f0d060 100%)"
        }} />
        {/* City silhouette */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: "55%" }}>
          <svg viewBox="0 0 1400 400" preserveAspectRatio="xMidYMax slice" style={{ width: "100%", height: "100%" }}>
            <rect width="1400" height="400" fill="#0a0818" />
            {/* Buildings */}
            {[
              [0,280,60],[65,220,45],[112,300,50],[165,180,35],[202,320,70],[275,260,55],[333,200,40],
              [376,340,65],[444,230,48],[495,280,52],[550,180,38],[591,310,60],[654,250,45],[702,290,55],
              [760,200,42],[805,350,68],[876,240,50],[929,270,48],[980,190,36],[1019,320,62],[1084,260,55],
              [1142,200,40],[1185,290,58],[1246,230,45],[1294,310,52],[1349,180,38],
            ].map(([x, h, w], i) => (
              <rect key={i} x={x} y={400 - h} width={w} height={h}
                fill={i % 7 === 0 ? "#1a0830" : i % 5 === 0 ? "#140620" : i % 3 === 0 ? "#0e0418" : "#080214"} />
            ))}
            {/* Windows (lit) */}
            {[[120,60],[300,80],[500,50],[700,70],[900,55],[1100,75],[1300,60]].map(([x, y], i) => (
              <rect key={`w${i}`} x={x + 5} y={y} width={5} height={7} fill="#f0a020" opacity={0.8} />
            ))}
            {[[200,100],[400,90],[600,80],[800,95],[1000,85],[1200,100]].map(([x, y], i) => (
              <rect key={`b${i}`} x={x + 10} y={y} width={5} height={7} fill="#40c0ff" opacity={0.7} />
            ))}
            {/* Water reflection */}
            <rect x="0" y="300" width="1400" height="100" fill="#0a0410" opacity="0.8" />
            <path d="M0 310 Q350 305 700 312 Q1050 318 1400 310 L1400 400 L0 400Z" fill="#120820" opacity="0.9" />
          </svg>
        </div>
        {/* Helicopter silhouette */}
        <div className="absolute" style={{ left: "8%", top: "38%" }}>
          <svg viewBox="0 0 100 50" width="100" height="50" style={{ opacity: 0.7 }}>
            <ellipse cx="50" cy="30" rx="30" ry="12" fill="#0a0818" />
            <rect x="78" y="26" width="20" height="4" fill="#0a0818" rx="2" />
            <ellipse cx="50" cy="18" rx="45" ry="6" fill="#0a0818" opacity="0.9" />
            <rect x="48" y="40" width="4" height="8" fill="#0a0818" />
          </svg>
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,transparent 30%,rgba(0,0,0,0.3) 100%)" }} />
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 4: QUOTE / "ONLY IN LEONIDA"
      ══════════════════════════════════════════════ */}
      <section className="relative bg-[#0c0d20] flex flex-col items-center justify-center text-center px-6 py-32" style={{ minHeight: "100dvh" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }} className="flex flex-col items-center gap-10">
          <div style={{ filter: "drop-shadow(0 0 24px rgba(180,80,255,0.5))" }}>
            <GtaViLogoSvg width={120} />
          </div>
          <p className="font-black leading-tight max-w-3xl"
            style={{
              fontSize: "clamp(1.8rem,5vw,4rem)",
              color: "#e8405a",
              fontFamily: "Impact, Arial Black, sans-serif",
              textShadow: "0 0 40px rgba(232,64,90,0.3)",
            }}>
            When the sun fades and the neon glows, everyone has something to gain – and more to lose.
          </p>
        </motion.div>
        <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <ChevronDown className="h-5 w-5 text-[#e8405a]/60" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5: JASON STORY
      ══════════════════════════════════════════════ */}
      <section className="bg-[#0e0f22] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }} className="mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-3">Protagonist</p>
            <h2 className="font-black uppercase mb-1" style={{ color: "#e8405a", fontSize: "clamp(2.5rem,7vw,5.5rem)", fontFamily: "Impact, Arial Black, sans-serif", lineHeight: 1.05, letterSpacing: "-0.01em" }}>Jason</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}>
              <h3 className="font-black mb-6 leading-tight"
                style={{ color: "#e8405a", fontSize: "clamp(1.4rem,3.5vw,2.4rem)", fontFamily: "Impact, Arial Black, sans-serif" }}>
                All he wanted was an easy life, but things just keep getting harder.
              </h3>
              <p className="text-white/70 leading-relaxed text-base mb-6">
                Jason grew up around grifters and crooks. After a stint in the Army trying to shake off his troubled teens, he found himself in the Keys doing what he knows best, working for local drug runners. It might be time to try something new.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
              className="grid grid-cols-1 gap-3">
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "16/9" }}>
                <img src={gtaPoster} alt="Jason" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "50% 15%" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
                  <img src={gtaBoxArt} alt="Jason" className="w-full h-full" style={{ objectFit: "cover" }} />
                </div>
                <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
                  <img src={gtaPackaging} alt="Jason" className="w-full h-full" style={{ objectFit: "cover" }} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Jason & Lucia continuation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mt-16 pt-16 border-t border-white/5">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
              className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "4/3", gridColumn: "1/-1" }}>
                <img src={gtaPoster} alt="Jason" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "30% 60%" }} />
              </div>
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
                <img src={gtaBoxArt} alt="" className="w-full h-full" style={{ objectFit: "cover", filter: "hue-rotate(15deg) saturate(0.9)" }} />
              </div>
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
                <img src={gtaPackaging} alt="" className="w-full h-full" style={{ objectFit: "cover" }} />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}>
              <h3 className="font-black mb-6 leading-tight"
                style={{ color: "#e8405a", fontSize: "clamp(1.4rem,3.5vw,2.4rem)", fontFamily: "Impact, Arial Black, sans-serif" }}>
                Another day in paradise, right?
              </h3>
              <p className="text-white/70 leading-relaxed text-base">
                Meeting Lucia could be the best or worst thing to ever happen to him. Jason knows how he'd like it to turn out but right now, it's hard to tell.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6: LUCIA QUOTE (full bleed)
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ height: "100dvh" }}>
        <img src={gtaPoster} alt="Lucia" className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover", objectPosition: "70% center", filter: "brightness(0.6) saturate(1.2)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0.1) 40%,rgba(0,0,0,0.7) 80%,rgba(0,0,0,0.85) 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-20 md:px-16">
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-black uppercase"
            style={{
              fontSize: "clamp(1.4rem,4vw,3rem)",
              color: "#d4c870",
              fontFamily: "Impact, Arial Black, sans-serif",
              letterSpacing: "0.04em",
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
              fontStyle: "italic",
            }}>
            "The only thing that matters is who you know and what you got."
          </motion.p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 7: LUCIA STORY
      ══════════════════════════════════════════════ */}
      <section className="bg-[#0e0f22] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }} className="mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-3">Protagonist</p>
            <h2 className="font-black uppercase mb-1" style={{ color: "#e8405a", fontSize: "clamp(2.5rem,7vw,5.5rem)", fontFamily: "Impact, Arial Black, sans-serif", lineHeight: 1.05 }}>Lucia</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}>
              <h3 className="font-black mb-6 leading-tight"
                style={{ color: "#e8405a", fontSize: "clamp(1.4rem,3.5vw,2.4rem)", fontFamily: "Impact, Arial Black, sans-serif" }}>
                She's not here to play it safe. She's here to win.
              </h3>
              <p className="text-white/70 leading-relaxed text-base mb-4">
                Lucia grew up knowing the rules were made for other people. Smart, resourceful, and tired of waiting for opportunities that never come – she's going to make her own. Running into Jason might be the first thing to go right in a very long time.
              </p>
              <p className="text-white/60 leading-relaxed text-sm">
                She knows Leonida better than anyone. And she knows that in this city, reputation is everything.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
              className="overflow-hidden rounded-sm" style={{ aspectRatio: "3/4" }}>
              <img src={gtaPoster} alt="Lucia" className="w-full h-full"
                style={{ objectFit: "cover", objectPosition: "20% 30%" }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CHARACTER SECTION: DRE'QUAN PRIEST
      ══════════════════════════════════════════════ */}
      <CharacterSection
        name="Dre'Quan Priest"
        tagline="Only Raw... Records"
        description="Dre'Quan was always more of a hustler than a gangster. Even when he was dealing on the streets to make ends meet, breaking into music was the goal. Now he's made it – and he'll do whatever it takes to stay there."
        bg="linear-gradient(135deg,#0e0830 0%,#1a0c50 30%,#2a1080 55%,#1e0a60 80%,#0e0430 100%)"
        accentColor="#c0a0ff"
        nameColor="white"
        taglineColor="#c0a0ff"
        artContent={
          <div className="absolute inset-0">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1a0850 0%,#3020a0 50%,#8040d0 80%,#c060f0 100%)", opacity: 0.7 }} />
            <svg viewBox="0 0 400 600" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
              <defs>
                <linearGradient id="dq1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6040c0" />
                  <stop offset="100%" stopColor="#c060e0" />
                </linearGradient>
              </defs>
              <ellipse cx="200" cy="200" rx="120" ry="160" fill="url(#dq1)" opacity="0.8" />
              <ellipse cx="200" cy="160" rx="70" ry="80" fill="#d080f0" opacity="0.6" />
              <rect x="140" y="320" width="120" height="280" fill="#3020a0" opacity="0.9" rx="4" />
              <circle cx="200" cy="155" rx="55" ry="52" fill="#f0c0ff" opacity="0.5" />
              <rect x="165" y="300" width="70" height="30" fill="#c080ff" opacity="0.7" />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
              background: "linear-gradient(to top,rgba(14,8,48,1) 0%,transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: "15%", left: "10%", right: "10%", fontSize: "clamp(0.7rem,1.5vw,1rem)", color: "rgba(192,160,255,0.6)", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>
              Only Raw... Records
            </div>
          </div>
        }
        photos={[gtaBoxArt, gtaPackaging]}
      />

      {/* ══════════════════════════════════════════════
          CHARACTER SECTION: BOOBIE
      ══════════════════════════════════════════════ */}
      <CharacterSection
        name="Boobie"
        tagline="The Leonida Legend"
        description="A legend – and acts like it. One of the few to transform his time in the streets into a legitimate empire spanning real estate, a strip club, and a recording studio – Boobie's all smiles until it's time to talk business."
        bg="linear-gradient(135deg,#0a0418 0%,#1a0830 40%,#300a50 70%,#180428 100%)"
        accentColor="#ff80a0"
        nameColor="white"
        taglineColor="#ff80a0"
        artContent={
          <div className="absolute inset-0">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg,#0a0420 0%,#200840 40%,#3a0a60 70%,#500a40 100%)", opacity: 0.85 }} />
            <div style={{ position: "absolute", bottom: "20%", left: "50%", transform: "translateX(-50%)", width: "70%", height: "60%", background: "radial-gradient(ellipse,rgba(255,80,160,0.3) 0%,transparent 70%)" }} />
            <svg viewBox="0 0 400 600" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, opacity: 0.7 }}>
              <ellipse cx="200" cy="180" rx="110" ry="150" fill="#601080" />
              <ellipse cx="200" cy="150" rx="65" ry="75" fill="#c040a0" opacity="0.7" />
              <rect x="145" y="320" width="110" height="280" fill="#400870" opacity="0.9" rx="6" />
              <circle cx="200" cy="148" rx="52" ry="50" fill="#ff80c0" opacity="0.5" />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
              background: "linear-gradient(to top,rgba(10,4,24,1) 0%,transparent 100%)" }} />
          </div>
        }
        photos={[gtaBoxArt, gtaPackaging]}
        reversed
      />

      {/* ══════════════════════════════════════════════
          CHARACTER SECTION: REAL DIMEZ
      ══════════════════════════════════════════════ */}
      <CharacterSection
        name="Real Dimez"
        tagline="Viral videos. Viral hooks."
        description="Bae-Luxe and Roxy aka Real Dimez have been friends since high school – girls with more ambition, more hustle, and more presence than anyone ever gave them credit for. Now the whole world's watching."
        bg="linear-gradient(135deg,#041820 0%,#063040 30%,#0a4858 60%,#083040 100%)"
        accentColor="#40e0c0"
        nameColor="white"
        taglineColor="#40e0c0"
        artContent={
          <div className="absolute inset-0">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#042028 0%,#084060 40%,#106080 70%,#1a8080 100%)", opacity: 0.8 }} />
            <svg viewBox="0 0 400 600" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, opacity: 0.7 }}>
              <ellipse cx="150" cy="200" rx="90" ry="130" fill="#106060" />
              <ellipse cx="260" cy="220" rx="90" ry="130" fill="#108080" />
              <ellipse cx="150" cy="165" rx="55" ry="65" fill="#20c0a0" opacity="0.6" />
              <ellipse cx="260" cy="180" rx="55" ry="65" fill="#20e0c0" opacity="0.5" />
              <rect x="80" y="330" width="100" height="270" fill="#084040" opacity="0.9" />
              <rect x="220" y="350" width="100" height="250" fill="#086060" opacity="0.9" />
              <circle cx="150" cy="162" rx="48" ry="46" fill="#80f0d0" opacity="0.4" />
              <circle cx="260" cy="177" rx="48" ry="46" fill="#80f0e0" opacity="0.4" />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
              background: "linear-gradient(to top,rgba(4,24,32,1) 0%,transparent 100%)" }} />
          </div>
        }
        photos={[gtaBoxArt, gtaPackaging]}
      />

      {/* ══════════════════════════════════════════════
          CHARACTER SECTION: RAUL BAUTISTA
      ══════════════════════════════════════════════ */}
      <CharacterSection
        name="Raul Bautista"
        tagline="Experience counts."
        description="Confidence, charm, and cunning – Raul's a seasoned bank robber always on the hunt for talent ready to take the risks that bring the biggest rewards. He's been at this a long time, and he's still standing."
        bg="linear-gradient(135deg,#101a08 0%,#203010 40%,#304818 60%,#204010 100%)"
        accentColor="#c8d840"
        nameColor="#d4e050"
        taglineColor="#c8d840"
        artContent={
          <div className="absolute inset-0">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg,#101808 0%,#243818 40%,#3c6020 70%,#4a7828 100%)", opacity: 0.85 }} />
            <svg viewBox="0 0 400 600" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, opacity: 0.75 }}>
              <ellipse cx="200" cy="200" rx="120" ry="155" fill="#305020" />
              <ellipse cx="200" cy="165" rx="70" ry="80" fill="#50802a" opacity="0.8" />
              <rect x="140" y="335" width="120" height="265" fill="#204018" opacity="0.9" rx="4" />
              <circle cx="200" cy="162" rx="54" ry="52" fill="#80c040" opacity="0.5" />
              <rect x="155" y="315" width="90" height="28" fill="#608030" opacity="0.7" />
              {/* Mural/graffiti elements */}
              <path d="M20 200 Q60 160 100 200 Q140 240 180 200" stroke="#f0e840" strokeWidth="3" fill="none" opacity="0.4" />
              <circle cx="50" cy="250" r="30" fill="none" stroke="#e0c020" strokeWidth="2" opacity="0.3" />
              <path d="M300 100 Q340 80 380 120 Q350 160 310 140Z" fill="#d8b020" opacity="0.2" />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
              background: "linear-gradient(to top,rgba(16,26,8,1) 0%,transparent 100%)" }} />
          </div>
        }
        photos={[gtaBoxArt, gtaPackaging]}
        reversed
      />

      {/* ══════════════════════════════════════════════
          CHARACTER SECTION: BRIAN
      ══════════════════════════════════════════════ */}
      <CharacterSection
        name="Brian"
        tagline="More relaxing than a Mudslide at sunset."
        description="Brian's a classic drug runner from the golden age of smuggling in the Keys. Still moving product through his boat yard with his third wife, Lori, Brian's been around long enough to let others do his dirty work."
        bg="linear-gradient(135deg,#081828 0%,#0a2840 30%,#0c3850 60%,#0a2840 100%)"
        accentColor="#80c8e0"
        nameColor="white"
        taglineColor="#80c8e0"
        artContent={
          <div className="absolute inset-0">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg,#0a1e30 0%,#0e3048 40%,#104060 70%,#0c3050 100%)", opacity: 0.85 }} />
            <svg viewBox="0 0 400 600" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, opacity: 0.7 }}>
              {/* Water/dock background */}
              <rect x="0" y="300" width="400" height="300" fill="#082040" />
              <path d="M0 310 Q100 300 200 315 Q300 330 400 305 L400 600 L0 600Z" fill="#0a2848" />
              {/* Person silhouette */}
              <ellipse cx="200" cy="185" rx="100" ry="135" fill="#0e3858" />
              <ellipse cx="200" cy="155" rx="58" ry="68" fill="#1a5878" opacity="0.8" />
              <rect x="142" y="315" width="116" height="285" fill="#0c3050" opacity="0.9" rx="4" />
              <circle cx="200" cy="152" rx="50" ry="48" fill="#60a0c8" opacity="0.5" />
              {/* Boat dock elements */}
              <rect x="50" y="280" width="300" height="8" fill="#604830" opacity="0.7" rx="2" />
              <rect x="60" y="260" width="8" height="28" fill="#704830" opacity="0.7" />
              <rect x="332" y="260" width="8" height="28" fill="#704830" opacity="0.7" />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
              background: "linear-gradient(to top,rgba(8,24,40,1) 0%,transparent 100%)" }} />
          </div>
        }
        photos={[gtaBoxArt, gtaPackaging]}
      />

      {/* ══════════════════════════════════════════════
          VISIT LEONIDA PROMOTIONAL CARDS
      ══════════════════════════════════════════════ */}
      <section className="bg-[#0c0d1a] py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <VisitLeonidaCard
            location="Grassrivers"
            bg="linear-gradient(135deg,#0a1e0c 0%,#1a3814 30%,#2a5820 60%,#1e4818 100%)"
            scene={
              <svg viewBox="0 0 800 300" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                <rect width="800" height="300" fill="#1a3010" />
                <path d="M0 200 Q200 140 400 180 Q600 220 800 160 L800 300 L0 300Z" fill="#204018" />
                <path d="M0 220 Q200 170 400 200 Q600 230 800 185 L800 300 L0 300Z" fill="#183010" />
                {[50,120,200,300,350,450,550,620,700,750].map((x, i) => (
                  <path key={i} d={`M${x} ${220 - i * 8 % 40} Q${x + 15} ${160 - i * 5 % 30} ${x + 30} ${180 - i * 7 % 35}`}
                    stroke="#306020" strokeWidth="2" fill="none" opacity="0.8" />
                ))}
                <rect x="0" y="0" width="800" height="200" fill="url(#sky)" opacity="0.6" />
                <rect x="0" y="0" width="800" height="150" fill="#c0e0f8" opacity="0.15" />
              </svg>
            }
          />
          <VisitLeonidaCard
            location="Mount Kalaga"
            bg="linear-gradient(135deg,#081410 0%,#102018 30%,#183028 60%,#0e1c14 100%)"
            scene={
              <svg viewBox="0 0 800 300" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                <rect width="800" height="300" fill="#0e1e18" />
                <path d="M0 300 L200 80 L350 200 L500 40 L650 180 L800 100 L800 300Z" fill="#183020" />
                <path d="M0 300 L200 120 L350 220 L500 80 L650 200 L800 130 L800 300Z" fill="#102818" />
                {[80,180,300,400,500,620,720].map((x, i) => (
                  <ellipse key={i} cx={x} cy={280 - i * 8 % 40} rx={25 + i * 3 % 20} ry={35 + i * 5 % 30}
                    fill="#205030" opacity="0.8" />
                ))}
                <rect x="0" y="0" width="800" height="150" fill="#c8f0e0" opacity="0.1" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PRE-ORDER CTA SECTION
      ══════════════════════════════════════════════ */}
      <section className="bg-[#0a0b18] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">Available Now</p>
              <div className="mb-6" style={{ filter: "drop-shadow(0 0 24px rgba(180,80,255,0.4))" }}>
                <GtaViLogoSvg width={200} />
              </div>
              <p className="font-black uppercase text-white/80 text-sm tracking-widest mb-2">Grand Theft Auto VI</p>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-black font-mono"
                  style={{ background: "linear-gradient(135deg,#e8405a,#bf00ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  AED {game.preOrderPrice?.toFixed(2) ?? "299.00"}
                </span>
                {game.preOrderDate && (
                  <span className="text-white/40 text-sm font-bold">{game.preOrderDate}</span>
                )}
              </div>
              <div className="flex gap-3 mb-4">
                {["PS5", "Xbox Series X|S"].map((p) => (
                  <div key={p} className="px-4 py-2 rounded border border-white/20 text-white/70 text-xs font-bold uppercase tracking-wider">{p}</div>
                ))}
              </div>
              {game.preOrderNote && (
                <p className="text-white/40 text-xs leading-relaxed mb-6 border-l-2 border-[#e8405a]/30 pl-3">{game.preOrderNote}</p>
              )}
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={onPreOrder}
                className="w-full md:w-auto px-10 py-4 font-black uppercase tracking-widest text-sm text-white flex items-center justify-center gap-3 rounded-full"
                style={{ background: "#e8405a", boxShadow: "0 0 40px rgba(232,64,90,0.4)" }}>
                <ShoppingBag className="h-5 w-5" />
                {game.preOrderButtonText || "Pre-Order Now"}
              </motion.button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "3/4", gridRow: "1/3" }}>
                <img src={gtaBoxArt} alt="GTA VI PS5" className="w-full h-full" style={{ objectFit: "cover" }} />
              </div>
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "3/4" }}>
                <img src={gtaPackaging} alt="GTA VI" className="w-full h-full" style={{ objectFit: "cover" }} />
              </div>
              <div className="overflow-hidden rounded-sm" style={{ aspectRatio: "3/4" }}>
                <img src={gtaPoster} alt="GTA VI" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center 40%" }} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#060710] border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/games">
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4" /> All Games
            </button>
          </Link>
          <div style={{ filter: "drop-shadow(0 0 10px rgba(180,80,255,0.2))" }}>
            <GtaViLogoSvg width={80} />
          </div>
          <p className="text-white/20 text-xs text-center">
            © Chamak Street. Grand Theft Auto VI © Rockstar Games.
          </p>
        </div>
      </footer>
    </div>
  );
}

function CharacterSection({
  name, tagline, description, bg, accentColor, nameColor, taglineColor, artContent, photos, reversed = false,
}: {
  name: string; tagline: string; description: string;
  bg: string; accentColor: string; nameColor: string; taglineColor: string;
  artContent: React.ReactNode; photos: string[]; reversed?: boolean;
}) {
  return (
    <section className="relative overflow-hidden" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch ${reversed ? "md:[direction:rtl]" : ""}`}>
          {/* Art panel */}
          <motion.div initial={{ opacity: 0, x: reversed ? 30 : -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}
            className="relative overflow-hidden rounded-sm md:[direction:ltr]"
            style={{ minHeight: 420 }}>
            {artContent}
          </motion.div>
          {/* Text + photos */}
          <motion.div initial={{ opacity: 0, x: reversed ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="flex flex-col justify-center px-0 md:px-10 py-8 md:py-0 md:[direction:ltr]">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-3" style={{ color: accentColor + "80" }}>Character</p>
            <h2 className="font-black uppercase mb-2 leading-none"
              style={{ fontSize: "clamp(2rem,6vw,4.5rem)", color: nameColor, fontFamily: "Impact, Arial Black, sans-serif" }}>
              {name}
            </h2>
            <p className="font-bold mb-5 text-base" style={{ color: taglineColor }}>
              {tagline}
            </p>
            <p className="text-white/65 leading-relaxed text-sm mb-8">{description}</p>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
                  <img src={src} alt="" className="w-full h-full"
                    style={{ objectFit: "cover", filter: i === 1 ? "hue-rotate(20deg) saturate(0.9)" : undefined }} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function VisitLeonidaCard({ location, bg, scene }: { location: string; bg: string; scene: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.7, ease: EASE }}
      className="rounded-sm overflow-hidden border border-white/5"
      style={{ background: bg }}>
      <div className="relative" style={{ aspectRatio: "21/9" }}>
        {scene}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right,rgba(0,0,0,0.5) 0%,transparent 50%,rgba(0,0,0,0.3) 100%)" }} />
        <div className="absolute inset-0 flex items-center justify-between px-8 md:px-12">
          <VisitLeonidaLogo size={36} />
          <button className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors">
            Explore {location}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function GameDetail() {
  const [, params] = useRoute("/games/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [animPhase, setAnimPhase] = useState<"anim" | "reveal">("anim");
  const [ordered, setOrdered] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/games/${id}`)
      .then((r) => r.json())
      .then((data) => { setGame(data as Game); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!game) return;
    const isGta = isGtaGame(game);
    if (!game.animationEnabled || !isGta) setAnimPhase("reveal");
  }, [game]);

  useEffect(() => {
    if (animPhase === "reveal" && audioRef.current && game?.animationEnabled) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
    }
  }, [animPhase, game]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const [showPreOrderModal, setShowPreOrderModal] = useState(false);
  const [preOrderForm, setPreOrderForm] = useState({ name: "", phone: "", platform: "PS5" });
  const [preOrderDone, setPreOrderDone] = useState(false);
  const [preOrderLoading, setPreOrderLoading] = useState(false);

  const handlePreOrder = () => setShowPreOrderModal(true);

  const submitPreOrder = async () => {
    if (!preOrderForm.name.trim() || !preOrderForm.phone.trim()) return;
    setPreOrderLoading(true);
    try {
      const msg = `Hi! I'd like to pre-order ${game?.name} (${preOrderForm.platform}).\nName: ${preOrderForm.name}\nPhone: ${preOrderForm.phone}`;
      const waUrl = `https://wa.me/971521142341?text=${encodeURIComponent(msg)}`;
      setPreOrderDone(true);
      setOrdered(true);
      setTimeout(() => { window.open(waUrl, "_blank"); setShowPreOrderModal(false); }, 1200);
    } finally {
      setPreOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white font-black uppercase tracking-widest text-sm">Loading…</motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0c0d1a] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="font-black uppercase text-xl mb-4">Game not found</p>
          <Link href="/games"><button className="px-6 py-3 border border-white/20 rounded text-sm hover:border-white/40 transition-colors">← All Games</button></Link>
        </div>
      </div>
    );
  }

  const isGta = isGtaGame(game);
  const showAnim = game.animationEnabled && isGta && animPhase === "anim";

  if (showAnim) {
    return (
      <GtaCinematicAnimation
        onComplete={() => setAnimPhase("reveal")}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
      />
    );
  }

  if (isGta && animPhase === "reveal") {
    return (
      <>
        <GtaViRevealPage
          game={game}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onPreOrder={handlePreOrder}
          audioRef={audioRef}
        />

        {/* ── PRE-ORDER MODAL ── */}
        <AnimatePresence>
          {showPreOrderModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !preOrderLoading && setShowPreOrderModal(false)}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 24 }}
                transition={{ ease: EASE, duration: 0.45 }}
                className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 shadow-2xl">
                {preOrderDone ? (
                  <div className="text-center py-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#e8405a,#bf00ff)" }}>
                      <Check className="h-8 w-8 text-white" />
                    </motion.div>
                    <h3 className="text-white font-black text-xl uppercase tracking-tighter mb-2">Pre-Order Confirmed!</h3>
                    <p className="text-white/50 text-sm">Opening WhatsApp to complete your order…</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">Chamak Street</p>
                        <h3 className="text-white font-black text-lg uppercase tracking-tighter">Pre-Order GTA VI</h3>
                      </div>
                      <button onClick={() => setShowPreOrderModal(false)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3 mb-5">
                      <div>
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1.5">Your Name</label>
                        <input value={preOrderForm.name}
                          onChange={(e) => setPreOrderForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Ahmed Al Rashidi"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-white/20" />
                      </div>
                      <div>
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1.5">WhatsApp Number</label>
                        <input value={preOrderForm.phone}
                          onChange={(e) => setPreOrderForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="+971 50 000 0000" type="tel"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-white/20" />
                      </div>
                      <div>
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1.5">Platform</label>
                        <div className="flex gap-2">
                          {["PS5", "Xbox Series X|S"].map((p) => (
                            <button key={p} onClick={() => setPreOrderForm((f) => ({ ...f, platform: p }))}
                              className={`flex-1 py-2.5 text-sm font-black uppercase tracking-wider rounded-lg border transition-all ${
                                preOrderForm.platform === p ? "border-transparent text-white" : "border-white/10 text-white/40 hover:border-white/20"
                              }`}
                              style={preOrderForm.platform === p ? { background: "linear-gradient(135deg,#e8405a,#bf00ff)" } : {}}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {game.preOrderPrice != null && (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-white/30 text-[9px] font-black uppercase">Total</p>
                          <p className="text-white font-black font-mono text-lg">AED {game.preOrderPrice.toFixed(2)}</p>
                        </div>
                      )}
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={submitPreOrder}
                        disabled={preOrderLoading || !preOrderForm.name.trim() || !preOrderForm.phone.trim()}
                        className="flex-1 py-3 font-black uppercase tracking-widest text-sm text-white rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#e8405a,#bf00ff)" }}>
                        <ShoppingBag className="h-4 w-4" />
                        {preOrderLoading ? "Processing…" : "Complete Pre-Order"}
                      </motion.button>
                    </div>
                    <p className="text-white/20 text-[10px] text-center mt-3">
                      You'll be directed to WhatsApp to confirm your order with our team.
                    </p>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Non-GTA fallback
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative min-h-[60vh] flex items-end overflow-hidden">
        {game.coverImage && <img src={game.coverImage} alt={game.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/games"><button className="text-muted-foreground hover:text-foreground text-sm font-bold flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Games</button></Link>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">{game.name}</h1>
          {game.description && <p className="text-muted-foreground max-w-xl leading-relaxed mb-8">{game.description}</p>}
          {game.isPreOrder && (
            <button onClick={handlePreOrder}
              className="px-8 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded flex items-center gap-3">
              <ShoppingBag className="h-5 w-5" />
              {game.preOrderButtonText || "Pre-Order Now"} – AED {game.preOrderPrice?.toFixed(2)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
