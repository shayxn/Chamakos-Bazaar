import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, ShoppingBag, Clock, Star, Gamepad2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import gtaPoster from "@assets/IMG_0051_1782471586956.jpeg";
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
    const timings = [
      1400,   // 0→1: R* fades, sunset appears
      3000,   // 1→2: skyline appears
      5200,   // 2→3: cover panels reveal
      8200,   // 3→4: GRAND THEFT AUTO text
      11500,  // 4→5: VI neon logo
      14000,  // 5→6: 2025 / call to action
      17000,  // 6→complete
    ];
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
    if (audioRef.current) {
      audioRef.current.volume = 0.65;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const sunsetGradient = phase >= 1;
  const skylineVisible = phase >= 2;
  const posterVisible = phase >= 3;
  const titleVisible = phase >= 4;
  const viVisible = phase >= 5;
  const ctaVisible = phase >= 6;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black select-none">
      <audio ref={audioRef} src={gtaMusic} loop preload="auto" />

      {/* Controls */}
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

      {/* === PHASE 0: R* LOGO === */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div key="rstar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center bg-black">
            <motion.div animate={{ opacity: [0, 1, 1, 0.8] }} transition={{ duration: 1.4, times: [0, 0.3, 0.7, 1] }}>
              <RockstarLogo />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PHASE 1+: SUNSET SKY === */}
      <AnimatePresence>
        {sunsetGradient && (
          <motion.div key="sky" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, #1a0033 0%, #4a0080 15%, #c0006a 35%, #ff3060 52%, #ff7820 68%, #ffc060 80%, #ffe08a 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* === PHASE 2+: NEON SKYLINE === */}
      <AnimatePresence>
        {skylineVisible && (
          <motion.div key="skyline" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE }}>
            <NeonSkyline />
            <PalmTree x="5%" />
            <PalmTree x="12%" scale={-1} />
            <PalmTree x="78%" />
            <PalmTree x="88%" scale={-1} />
            <PalmTree x="93%" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PHASE 2+: SCAN LINES OVERLAY === */}
      {sunsetGradient && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)" }} />
      )}

      {/* === PHASE 3+: POSTER PANELS === */}
      <AnimatePresence>
        {posterVisible && (
          <motion.div key="poster" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {/* Cinematic black bars */}
            <div className="absolute top-0 left-0 right-0 h-[12%] bg-black z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black z-10" />

            {/* Main poster reveal — wipe from left */}
            <motion.div className="absolute inset-0 overflow-hidden"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.2, ease: [0.86, 0, 0.07, 1] }}>
              <img src={gtaPoster} alt="GTA VI" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(180,0,100,0.35) 0%,rgba(0,180,220,0.25) 100%)" }} />
            </motion.div>

            {/* Glitch flash lines */}
            {[0, 0.15, 0.3].map((delay, i) => (
              <motion.div key={i} className="absolute left-0 right-0 h-px bg-white/60 z-20"
                style={{ top: `${28 + i * 18}%` }}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0, 0.8, 0], scaleX: [0, 1, 1] }}
                transition={{ delay: delay + 0.4, duration: 0.25 }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PHASE 4+: GRAND THEFT AUTO TEXT === */}
      <AnimatePresence>
        {titleVisible && (
          <motion.div key="title-text" className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

            {/* Darken poster */}
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />

            {/* GRAND THEFT AUTO — letters drop in */}
            <div className="relative flex flex-wrap justify-center gap-x-[0.18em] overflow-hidden mb-2">
              {LETTERS_GTA.map((char, i) => (
                <motion.span key={i}
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-white font-black"
                  style={{
                    fontSize: "clamp(1.1rem, 4vw, 3rem)",
                    letterSpacing: "0.18em",
                    fontFamily: "Impact, Arial Black, sans-serif",
                    textShadow: "0 0 20px rgba(255,80,160,0.7), 0 0 40px rgba(255,80,160,0.3)",
                  }}>
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </div>

            {/* VI neon (inline for phase 4 before the big VI appears) */}
            {!viVisible && (
              <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: LETTERS_GTA.length * 0.04 + 0.3, duration: 0.7, ease: EASE }}
                style={{
                  fontSize: "clamp(5rem, 20vw, 14rem)",
                  fontFamily: "Impact, Arial Black, sans-serif",
                  fontWeight: 900,
                  lineHeight: 1,
                  background: "linear-gradient(135deg,#ff3ca0 0%,#bf00ff 40%,#00e5ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 30px rgba(255,60,160,0.6)) drop-shadow(0 0 60px rgba(0,229,255,0.4))",
                }}>
                VI
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PHASE 5+: BIG VI NEON REVEAL === */}
      <AnimatePresence>
        {viVisible && (
          <motion.div key="vi-big" className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(180,0,100,0.25) 0%, rgba(0,0,0,0.8) 70%)" }} />

            {/* Pulsing ring */}
            <motion.div className="absolute rounded-full border-2 border-pink-500/30"
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              style={{ width: 300, height: 300 }} />
            <motion.div className="absolute rounded-full border border-cyan-400/20"
              animate={{ scale: [1, 3], opacity: [0.4, 0] }}
              transition={{ duration: 2, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
              style={{ width: 200, height: 200 }} />

            {/* GRAND THEFT AUTO small */}
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-white font-black uppercase tracking-[0.4em] mb-1 relative z-10"
              style={{ fontSize: "clamp(0.55rem, 2vw, 1.1rem)", textShadow: "0 0 10px rgba(255,80,160,0.5)" }}>
              Grand Theft Auto
            </motion.p>

            {/* VI */}
            <motion.div className="relative z-10"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: "clamp(6rem, 28vw, 18rem)",
                fontFamily: "Impact, Arial Black, sans-serif",
                fontWeight: 900,
                lineHeight: 1,
                background: "linear-gradient(135deg,#ff3ca0 0%,#bf00ff 40%,#00e5ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 40px rgba(255,60,160,0.8)) drop-shadow(0 0 80px rgba(0,229,255,0.5))",
              }}>
              VI
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PHASE 6+: CTA === */}
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
              style={{ boxShadow: "0 0 40px rgba(255,60,160,0.5), 0 0 80px rgba(0,229,255,0.2)" }}>
              Enter the Experience
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/games/${id}`)
      .then((r) => r.json())
      .then((data) => { setGame(data as Game); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!game) return;
    if (!game.animationEnabled || !isGtaGame(game)) setAnimPhase("reveal");
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

  const handlePreOrder = () => {
    setOrdered(true);
    toast({ title: "Pre-Order Received!", description: `Your pre-order for ${game?.name} has been received. We'll contact you via WhatsApp.` });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-black uppercase">Game not found</p>
          <Link href="/games"><button className="mt-4 px-4 py-2 border rounded text-sm">← Back to Games</button></Link>
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

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {isGta && game.animationEnabled && (
        <audio ref={audioRef} src={gtaMusic} loop preload="auto" />
      )}

      {/* Hero */}
      <div className="relative min-h-screen flex items-end overflow-hidden">
        {/* Background: GTA poster for GTA game, else cover image */}
        {isGta ? (
          <img src={gtaPoster} alt={game.name}
            className="absolute inset-0 w-full h-full object-cover opacity-55" />
        ) : game.coverImage ? (
          <img src={game.coverImage} alt={game.name}
            className="absolute inset-0 w-full h-full object-cover opacity-55" />
        ) : null}

        {/* Gradients */}
        {isGta ? (
          <>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.95) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at bottom center, rgba(180,0,100,0.12) 0%, transparent 60%)" }} />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          </>
        )}

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
          <Link href="/games">
            <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-bold">
              <ArrowLeft className="h-4 w-4" /> Games
            </button>
          </Link>
          {isGta && game.animationEnabled && (
            <button onClick={() => setMuted(!muted)}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-16 md:pb-24">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
            <div className="flex items-center gap-3 mb-4">
              {game.platform && (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 border border-white/20 px-2 py-0.5 rounded-sm">{game.platform}</span>
              )}
              {game.genre && (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{game.genre}</span>
              )}
            </div>

            {isGta ? (
              <div className="mb-6">
                <p className="text-white/50 font-black uppercase tracking-[0.3em] text-xs mb-1">Grand Theft Auto</p>
                <div style={{
                  fontSize: "clamp(5rem, 18vw, 12rem)", fontFamily: "Impact, Arial Black, sans-serif",
                  fontWeight: 900, lineHeight: 1,
                  background: "linear-gradient(135deg,#ff3ca0 0%,#bf00ff 40%,#00e5ff 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(255,60,160,0.5))",
                }}>VI</div>
              </div>
            ) : (
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">{game.name}</h1>
            )}

            {game.description && (
              <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed mb-8">{game.description}</p>
            )}

            {game.isPreOrder && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }} className="space-y-5">
                <div className="flex flex-wrap items-center gap-6">
                  {game.preOrderDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">Release Date</p>
                        <p className="text-white font-black text-sm">{game.preOrderDate}</p>
                      </div>
                    </div>
                  )}
                  {game.preOrderPrice != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">Price</p>
                      <p className="text-2xl font-black font-mono" style={isGta ? {
                        background: "linear-gradient(135deg,#ff3ca0,#00e5ff)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                      } : { color: "rgb(var(--primary))" }}>
                        AED {game.preOrderPrice.toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />)}
                    <span className="text-xs text-white/40 ml-1">Highest Rated</span>
                  </div>
                </div>

                {game.preOrderNote && (
                  <p className="text-white/50 text-xs max-w-md leading-relaxed border-l-2 pl-3" style={isGta ? { borderColor: "rgba(255,60,160,0.5)" } : { borderColor: "rgba(var(--primary),0.4)" }}>
                    {game.preOrderNote}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 items-center">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={handlePreOrder} disabled={ordered}
                    className="flex items-center gap-3 px-8 py-4 font-black uppercase tracking-widest text-sm rounded-sm transition-all"
                    style={ordered ? { background: "#22c55e", color: "black" } : isGta ? {
                      background: "linear-gradient(135deg,#ff3ca0,#bf00ff,#00e5ff)",
                      color: "white",
                      boxShadow: "0 0 30px rgba(255,60,160,0.5), 0 0 60px rgba(0,229,255,0.2)"
                    } : { background: "rgb(var(--primary))", color: "black" }}>
                    <ShoppingBag className="h-5 w-5" />
                    {ordered ? "Pre-Order Received!" : (game.preOrderButtonText || "Pre-Order Now")}
                  </motion.button>

                  <a href={`https://wa.me/971521142341?text=I want to pre-order ${encodeURIComponent(game.name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-4 border border-white/20 text-white font-bold uppercase tracking-wider text-sm hover:border-white/40 transition-colors rounded-sm">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-5 w-5 text-white/30" />
          </motion.div>
        </motion.div>
      </div>

      {game.description && (
        <div className="bg-black border-t border-white/5 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-white/90">About the Game</h2>
              <p className="text-white/60 text-base leading-relaxed">{game.description}</p>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
