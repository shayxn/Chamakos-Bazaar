import { useListProducts, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence, useMotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Zap, Star, ShoppingBag } from "lucide-react";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
const GTA6_IMG_1 = "https://www.rockstargames.com/VI/_next/static/media/Vice_City_04.06evqutgh7624.jpg";
const GTA6_IMG_2 = "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg";
const RS_JASON   = "https://www.rockstargames.com/VI/_next/static/media/Jason_Duval_01.07m377xeb6jhq.jpg";
const RS_LUCIA   = "https://www.rockstargames.com/VI/_next/static/media/Lucia_Caminos_04.04kb_~4ubn3wn.jpg";
import { PageTransition, RevealSection, RevealList, revealItem } from "@/components/page-transition";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { useSettings } from "@/lib/use-settings";
import { TrustSection } from "@/components/trust-section";
import { TiktokSection } from "@/components/tiktok-section";
import { ReviewsSection } from "@/components/reviews-section";
import { EventHomepageBanner } from "@/components/event-homepage-banner";
import { SpotlightBanner } from "@/components/spotlight-banner";
import { ScrollFloatObject } from "@/components/scroll-float-object";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── 3D Tilt Card ── */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const rafRef = useRef<number | null>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width - 0.5) * 16;
      const y = ((clientY - rect.top) / rect.height - 0.5) * -16;
      setTilt({ x, y });
    });
  }, []);

  const handleMouseLeave = useCallback(() => { setTilt({ x: 0, y: 0 }); setIsHovered(false); }, []);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateY: tilt.x, rotateX: tilt.y }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      style={{ transformStyle: "preserve-3d", perspective: 1100 }}
      className={className}
      data-hovered={isHovered}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated stat counter ── */
function StatItem({ value, suffix, label, color = "#ff6600" }: { value: number; suffix: string; label: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const start = performance.now();
    const duration = 1800;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: EASE }}
      className="flex flex-col items-center gap-2 px-6 py-6 relative group"
    >
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 50% 80%, ${color}12, transparent)` }}
      />
      <motion.span
        className="text-5xl md:text-6xl font-black tabular-nums leading-none"
        style={{ color, textShadow: `0 0 40px ${color}55` }}
        animate={isInView ? { textShadow: [`0 0 20px ${color}33`, `0 0 60px ${color}88`, `0 0 20px ${color}33`] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        {count}{suffix}
      </motion.span>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
    </motion.div>
  );
}

/* ── Letter-by-letter reveal for quote ── */
function GlitchWord({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [chars, setChars] = useState<string[]>([]);
  const chars_arr = text.split("");

  return (
    <span ref={ref} className="inline-block">
      {chars_arr.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: "60%", rotateX: 50 }}
          animate={isInView ? { opacity: 1, y: "0%", rotateX: 0 } : {}}
          transition={{ duration: 0.55, delay: delay + i * 0.03, ease: EASE }}
          style={{ transformOrigin: "bottom center" }}
        >
          {char === " " ? "\u00a0" : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ── Scroll-jacked "Only in Leonida" parallax reveal ── */
function LeonidaScrollReveal() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const bgScale    = useTransform(scrollYProgress, [0, 1], [1.0, 1.12]);
  const lineWidth  = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Title (0 → 15%, hold, fade at 90%)
  const titleOpacity  = useTransform(scrollYProgress, [0, 0.12, 0.85, 0.94], [0, 1, 1, 0]);
  const titleY        = useTransform(scrollYProgress, [0, 0.14], [64, 0]);
  const subtitleOp    = useTransform(scrollYProgress, [0.08, 0.22, 0.82, 0.92], [0, 1, 1, 0]);

  // Jason slides from RIGHT (18 → 44%)
  const jasonX        = useTransform(scrollYProgress, [0.18, 0.44], ["110%", "0%"]);
  const jasonOpacity  = useTransform(scrollYProgress, [0.18, 0.38, 0.75, 0.88], [0, 1, 1, 0]);

  // Jason bio text (36 → 52%)
  const jasonBioOp    = useTransform(scrollYProgress, [0.36, 0.52, 0.72, 0.86], [0, 1, 1, 0]);
  const jasonBioY     = useTransform(scrollYProgress, [0.36, 0.52], [36, 0]);

  // Lucia slides from LEFT (50 → 74%)
  const luciaX        = useTransform(scrollYProgress, [0.50, 0.74], ["-110%", "0%"]);
  const luciaOpacity  = useTransform(scrollYProgress, [0.50, 0.70, 0.93, 1], [0, 1, 1, 0]);

  // Lucia bio text (66 → 82%)
  const luciaBioOp    = useTransform(scrollYProgress, [0.66, 0.82], [0, 1]);
  const luciaBioY     = useTransform(scrollYProgress, [0.66, 0.82], [36, 0]);

  // CTA (82 → 95%)
  const ctaOpacity    = useTransform(scrollYProgress, [0.82, 0.95], [0, 1]);
  const ctaY          = useTransform(scrollYProgress, [0.82, 0.95], [28, 0]);

  // Scroll hint (only at the very start)
  const hintOpacity   = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  return (
    <div ref={wrapperRef} className="relative" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ── Background parallax ── */}
        <motion.div className="absolute inset-0" style={{ scale: bgScale }}>
          <img
            src={GTA6_IMG_1}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,7,28,0.8) 0%, rgba(7,7,28,0.2) 40%, rgba(7,7,28,0.7) 75%, rgba(7,7,28,0.98) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,45,156,0.07) 0%, transparent 65%)" }} />
        </motion.div>

        {/* ── Progress bar at top ── */}
        <div className="absolute top-0 left-0 right-0 h-[2px] z-30" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div className="h-full" style={{ width: lineWidth, background: "linear-gradient(90deg, #ff2d9c, #00d4ff)" }} />
        </div>

        {/* ── Centered title ── */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-none"
          style={{ opacity: titleOpacity, y: titleY }}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.55em] mb-5" style={{ color: "#00d4ff" }}>
            Grand Theft Auto VI · Leonida, USA
          </p>
          <h2
            className="font-black uppercase"
            style={{
              fontSize: "clamp(3.2rem, 11vw, 8.5rem)",
              letterSpacing: "-0.03em",
              lineHeight: 0.92,
              marginBottom: "1rem",
            }}
          >
            <span style={{ color: "white" }}>Only in</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #ff2d9c 30%, #00d4ff 70%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Leonida
            </span>
          </h2>
          <motion.p className="text-white/45 text-base md:text-lg max-w-sm" style={{ opacity: subtitleOp }}>
            Vice City, USA — the darkest side of the sunniest place in America.
          </motion.p>
        </motion.div>

        {/* ── Jason Duval — slides from right ── */}
        <motion.div
          className="absolute bottom-0 right-0 z-[15] pointer-events-none"
          style={{
            x: jasonX,
            opacity: jasonOpacity,
            width: "clamp(200px, 40vw, 560px)",
            height: "88%",
          }}
        >
          <img
            src={RS_JASON}
            alt="Jason Duval"
            className="absolute bottom-0 right-0 h-full w-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.8) 0%, transparent 40%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.65) 0%, transparent 28%)" }} />
        </motion.div>

        {/* ── Jason bio — appears on left ── */}
        <motion.div
          className="absolute left-6 sm:left-10 md:left-16 z-20"
          style={{
            opacity: jasonBioOp,
            y: jasonBioY,
            top: "50%",
            translateY: "-50%",
            maxWidth: "clamp(150px, 24vw, 270px)",
          }}
        >
          <p className="text-[8px] font-black uppercase tracking-[0.45em] mb-2" style={{ color: "#00d4ff" }}>Jason Duval</p>
          <h3
            className="font-black uppercase leading-none mb-3"
            style={{ fontSize: "clamp(1.6rem, 4.5vw, 3rem)", letterSpacing: "-0.02em", color: "white" }}
          >
            The Street<br />Legend
          </h3>
          <div className="h-px w-10 mb-3" style={{ background: "linear-gradient(to right, #00d4ff80, transparent)" }} />
          <p className="text-white/55 text-[13px] leading-relaxed">
            Loyal to those who matter. Lethal to those who don't. Built by Leonida, defined by its code.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff" }} />
            <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "rgba(0,212,255,0.55)" }}>
              Criminal · Loyal · Fearless
            </span>
          </div>
        </motion.div>

        {/* ── Lucia Caminos — slides from left ── */}
        <motion.div
          className="absolute bottom-0 left-0 z-[15] pointer-events-none"
          style={{
            x: luciaX,
            opacity: luciaOpacity,
            width: "clamp(200px, 40vw, 560px)",
            height: "88%",
          }}
        >
          <img
            src={RS_LUCIA}
            alt="Lucia Caminos"
            className="absolute bottom-0 left-0 h-full w-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to left, rgba(7,7,28,0.8) 0%, transparent 40%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.65) 0%, transparent 28%)" }} />
        </motion.div>

        {/* ── Lucia bio — appears on right ── */}
        <motion.div
          className="absolute right-6 sm:right-10 md:right-16 z-20 text-right"
          style={{
            opacity: luciaBioOp,
            y: luciaBioY,
            top: "50%",
            translateY: "-50%",
            maxWidth: "clamp(150px, 24vw, 270px)",
          }}
        >
          <p className="text-[8px] font-black uppercase tracking-[0.45em] mb-2" style={{ color: "#ff2d9c" }}>Lucia Caminos</p>
          <h3
            className="font-black uppercase leading-none mb-3"
            style={{ fontSize: "clamp(1.6rem, 4.5vw, 3rem)", letterSpacing: "-0.02em", color: "white" }}
          >
            Born to<br />Run
          </h3>
          <div className="h-px w-10 mb-3 ml-auto" style={{ background: "linear-gradient(to left, #ff2d9c80, transparent)" }} />
          <p className="text-white/55 text-[13px] leading-relaxed">
            Every scar tells a story. Every move is a message. Leonida made her — and she's making it pay.
          </p>
          <div className="mt-4 flex items-center gap-2 justify-end">
            <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "rgba(255,45,156,0.55)" }}>
              Survivor · Driven · Unstoppable
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff2d9c", boxShadow: "0 0 6px #ff2d9c" }} />
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          className="absolute bottom-10 left-1/2 z-30 text-center"
          style={{ opacity: ctaOpacity, y: ctaY, translateX: "-50%" }}
        >
          <Link href="/gta6">
            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.97 }}
              className="px-9 py-3.5 rounded-full font-black text-sm uppercase tracking-widest text-white"
              style={{
                background: "linear-gradient(135deg, #ff2d9c, #00d4ff)",
                boxShadow: "0 0 30px rgba(255,45,156,0.35)",
              }}
            >
              Explore Leonida ↗
            </motion.button>
          </Link>
        </motion.div>

        {/* ── Scroll hint (visible only at top) ── */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-20 flex flex-col items-center gap-1.5"
          style={{ opacity: hintOpacity, translateX: "-50%" }}
        >
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/30">Scroll to explore</p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-4 h-7 border border-white/15 rounded-full flex justify-center pt-1"
          >
            <motion.div
              animate={{ opacity: [1, 0], y: [0, 10] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-0.5 h-1.5 rounded-full"
              style={{ background: "#00d4ff" }}
            />
          </motion.div>
        </motion.div>

        {/* ── Floating neon particles ── */}
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none rounded-full z-10"
            style={{
              width: 2,
              height: 2,
              background: i % 2 === 0 ? "#ff2d9c" : "#00d4ff",
              boxShadow: `0 0 ${6 + i * 2}px ${i % 2 === 0 ? "#ff2d9c" : "#00d4ff"}`,
              left: `${10 + i * 12}%`,
              bottom: `${18 + (i % 4) * 9}%`,
            }}
            animate={{ y: [0, -(80 + i * 22), 0], opacity: [0, 0.85, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          />
        ))}

      </div>
    </div>
  );
}

function SectionDivider({ accent = true }: { accent?: boolean }) {
  return (
    <div className="relative flex items-center justify-center py-3 overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background: accent
            ? "linear-gradient(to right, transparent 5%, rgba(255,102,0,0.45) 35%, rgba(255,204,0,0.28) 65%, transparent 95%)"
            : "linear-gradient(to right, transparent 10%, rgba(255,255,255,0.05) 50%, transparent 90%)",
          transformOrigin: "center",
        }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      {accent && (
        <motion.div
          className="relative z-10 flex items-center gap-2"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-1 h-1 rotate-45 bg-primary/50" />
          <div className="w-1.5 h-1.5 rotate-45 bg-primary/70" />
          <div className="w-1 h-1 rotate-45 bg-primary/50" />
        </motion.div>
      )}
    </div>
  );
}

function GTA6ExploreCards() {
  const tilt1 = useRef<HTMLDivElement>(null);
  const tilt2 = useRef<HTMLDivElement>(null);

  const makeTiltHandlers = (ref: React.RefObject<HTMLDivElement>) => ({
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1000px) rotateY(${x * 7}deg) rotateX(${-y * 5}deg) scale(1.02)`;
    },
    onMouseLeave: () => { if (ref.current) ref.current.style.transform = ""; },
  });

  return (
    <section className="px-4 sm:px-6 mb-16">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 text-center"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">✦ Explore ✦</p>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight" style={{
          background: "linear-gradient(135deg, #ff2d9c, #00d4ff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Grand Theft Auto VI
        </h2>
      </motion.div>

      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Card 1 — Only in Leonida */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/gta6">
            <div
              ref={tilt1}
              {...makeTiltHandlers(tilt1)}
              className="relative overflow-hidden rounded-2xl cursor-pointer group"
              style={{
                minHeight: "280px",
                transition: "transform 0.15s ease",
                boxShadow: "0 0 60px rgba(255,45,156,0.15), 0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              <img src={GTA6_IMG_1} alt="Only in Leonida" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "center 20%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(7,7,28,0.9) 0%, rgba(7,7,28,0.5) 50%, rgba(7,7,28,0.1) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.85) 0%, transparent 55%)" }} />

              <div className="absolute inset-0 flex flex-col justify-end p-7 sm:p-10">
                <motion.span
                  className="text-[10px] font-black uppercase tracking-[0.35em] block mb-2"
                  style={{ color: "#00d4ff" }}
                >
                  People & Places
                </motion.span>
                <h3 className="font-black uppercase text-white leading-none mb-2" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                  Only in Leonida
                </h3>
                <p className="text-white/60 text-sm mb-5 max-w-xs">Vice City, USA. The darkest side of the sunniest place in America.</p>
                <motion.span
                  whileHover={{ x: 6 }}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors w-fit px-5 py-2.5 rounded-full"
                  style={{ border: "1px solid rgba(0,212,255,0.4)", background: "rgba(0,212,255,0.1)", backdropFilter: "blur(8px)" }}
                >
                  Explore More <ArrowRight className="h-3.5 w-3.5" />
                </motion.span>
              </div>

              {/* Hover border glow */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: "1.5px solid rgba(0,212,255,0.45)", boxShadow: "inset 0 0 40px rgba(0,212,255,0.08)" }} />
            </div>
          </Link>
        </motion.div>

        {/* Card 2 — Ultimate Edition / Vice City Pack */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/gta6/vintage-vice-city">
            <div
              ref={tilt2}
              {...makeTiltHandlers(tilt2)}
              className="relative overflow-hidden rounded-2xl cursor-pointer group"
              style={{
                minHeight: "280px",
                transition: "transform 0.15s ease",
                boxShadow: "0 0 60px rgba(255,208,96,0.12), 0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              <img src={GTA6_IMG_2} alt="GTA VI Editions" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "center 30%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(7,7,28,0.1) 0%, rgba(7,7,28,0.5) 50%, rgba(7,7,28,0.93) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.88) 0%, transparent 50%)" }} />

              <div className="absolute inset-0 flex flex-col justify-end items-end p-7 sm:p-10 text-right">
                <motion.span
                  className="text-[10px] font-black uppercase tracking-[0.35em] block mb-2"
                  style={{ color: "#ffd060" }}
                >
                  Pre-Order Bonuses
                </motion.span>
                <h3 className="font-black uppercase text-white leading-none mb-1" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)" }}>
                  Vintage
                </h3>
                <div className="font-black italic text-transparent leading-none mb-2" style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  WebkitTextStroke: "1.5px #ff2d9c",
                }}>
                  Vice City
                </div>
                <h3 className="font-black uppercase text-white leading-none mb-4" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)" }}>
                  Pack
                </h3>
                <p className="text-white/55 text-sm mb-5 max-w-[260px]">Pre-order to get unique benefits that flash back to when the neon burned brightest.</p>
                <motion.span
                  whileHover={{ x: -6 }}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors w-fit px-5 py-2.5 rounded-full"
                  style={{ border: "1px solid rgba(255,208,96,0.4)", background: "rgba(255,208,96,0.1)", backdropFilter: "blur(8px)" }}
                >
                  Learn More <ArrowRight className="h-3.5 w-3.5" />
                </motion.span>
              </div>

              {/* Hover border glow */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: "1.5px solid rgba(255,208,96,0.4)", boxShadow: "inset 0 0 40px rgba(255,208,96,0.08)" }} />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const rawY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const rawScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useSpring(rawY, { stiffness: 80, damping: 20 });
  const heroOpacity = useSpring(rawOpacity, { stiffness: 80, damping: 20 });
  const heroScale = useSpring(rawScale, { stiffness: 80, damping: 20 });

  const heroMouseX = useMotionValue(0);
  const heroMouseY = useMotionValue(0);
  const heroParallaxX = useSpring(useTransform(heroMouseX, [-1, 1], [-18, 18]), { stiffness: 60, damping: 18 });
  const heroParallaxY = useSpring(useTransform(heroMouseY, [-1, 1], [-8, 8]), { stiffness: 60, damping: 18 });

  const settings = useSettings();
  const { data: featuredProducts } = useListProducts(
    { featured: true },
    { query: { queryKey: getListProductsQueryKey({ featured: true }), staleTime: 2 * 60_000 } }
  );
  const { data: categories } = useListCategories({ query: { staleTime: 5 * 60_000, queryKey: ["categories", "nav"] } });

  const heroTitle = settings.hero_title || "Ignite the";
  const heroSubtitle = settings.hero_subtitle || "Streets.";
  const heroDescription = settings.hero_description || "Bold aesthetic. Unmatched drip. Dress like you own the block.";
  const heroCtaText = settings.hero_cta_text || "Shop Now";
  const HD = (typeof sessionStorage !== "undefined" && !sessionStorage.getItem("chamak_loaded")) ? 5.1 : 0.1;

  /* ── Hero images carousel ── */
  const heroImages = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(settings.hero_images || "[]");
      if (Array.isArray(parsed) && parsed.filter(Boolean).length > 0) return parsed.filter(Boolean);
    } catch {}
    return [settings.hero_image || "/chamako-hero.png"];
  }, [settings.hero_images, settings.hero_image]);

  const slideInterval = Math.max(2000, Number(settings.hero_slide_interval || 5000));
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToSlide = useCallback((idx: number) => {
    setSlideIdx(((idx % heroImages.length) + heroImages.length) % heroImages.length);
  }, [heroImages.length]);

  useEffect(() => {
    if (heroImages.length <= 1 || paused) return;
    slideTimerRef.current = setTimeout(() => {
      setSlideIdx((prev) => (prev + 1) % heroImages.length);
    }, slideInterval);
    return () => { if (slideTimerRef.current) clearTimeout(slideTimerRef.current); };
  }, [slideIdx, heroImages.length, slideInterval, paused]);

  const heroProduct = featuredProducts?.[0];
  const heroProductMedia = heroProduct ? getPrimaryProductMedia(heroProduct.imageUrl) : null;

  const categoryColors = [
    "from-orange-950/90 to-red-900/70",
    "from-yellow-950/90 to-orange-950/70",
    "from-red-950/90 to-orange-900/70",
    "from-purple-950/90 to-red-950/70",
    "from-blue-950/90 to-purple-950/70",
    "from-green-950/90 to-teal-950/70",
  ];
  const categoryIcons = [<Flame className="h-5 w-5" />, <Zap className="h-5 w-5" />, <Star className="h-5 w-5" />];

  return (
    <PageTransition>
      <div className="w-full">

        {/* ══════════════ HERO ══════════════ */}
        <section
          ref={heroRef}
          className="relative min-h-screen w-full flex items-center overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => { setPaused(false); heroMouseX.set(0); heroMouseY.set(0); }}
          onMouseMove={(e) => {
            const rect = heroRef.current?.getBoundingClientRect();
            if (!rect) return;
            heroMouseX.set((e.clientX - rect.left) / rect.width * 2 - 1);
            heroMouseY.set((e.clientY - rect.top) / rect.height * 2 - 1);
          }}
        >

          {/* ── Carousel background images (crossfade) ── */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY, scale: heroScale, x: heroParallaxX, rotateX: heroParallaxY }}>
            <AnimatePresence mode="sync">
              {/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(heroImages[slideIdx]) ? (
                <motion.video
                  key={slideIdx}
                  src={heroImages[slideIdx]}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 0.45, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <motion.img
                  key={slideIdx}
                  src={heroImages[slideIdx]}
                  alt="Chamak Street Hero"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 0.38, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  loading="eager"
                />
              )}
            </AnimatePresence>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)/0.75) 30%, transparent 65%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, hsl(var(--background)/0.99) 0%, hsl(var(--background)/0.7) 40%, transparent 70%)" }} />
          </motion.div>

          {/* Noise grain texture */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.028]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "180px 180px" }}
          />

          {/* Giant background "CS" text for depth — CSS animated (no RAF) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none flex items-center">
            <span
              className="absolute right-[-5%] font-black uppercase leading-none"
              style={{ fontSize: "clamp(15rem, 40vw, 55rem)", letterSpacing: "-0.06em", lineHeight: 0.85, animation: "csDrift 10s ease-in-out infinite" }}
            >
              CS
            </span>
          </div>

          {/* Dual orange ambient glows — CSS animated */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 50% 60% at 14% 60%, rgba(255,102,0,0.2), transparent)", animation: "glowDriftX 8s ease-in-out infinite" }}
          />
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 35% 50% at 85% 30%, rgba(255,80,0,0.14), transparent)", animation: "glowPulse 6s ease-in-out 2s infinite" }}
          />

          {/* Bottom vignette */}
          <div className="absolute inset-x-0 bottom-0 h-48 z-0 pointer-events-none" style={{ background: "linear-gradient(to top, hsl(var(--background)) 30%, transparent)" }} />

          {/* 18 floating embers — CSS animated (compositor thread, no RAF) */}
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="absolute z-0 pointer-events-none rounded-full"
              style={{
                width: 1.5 + (i % 4) * 1.2,
                height: 1.5 + (i % 4) * 1.2,
                left: `${4 + i * 5.2}%`,
                bottom: `${4 + (i % 6) * 6}%`,
                background: i % 3 === 0 ? "#ff6600" : i % 3 === 1 ? "#ffcc00" : "#ff4400",
                animation: `${i % 2 === 0 ? "emberRiseR" : "emberRiseL"} ${2.8 + i * 0.35}s ${i * 0.38}s ease-out infinite`,
                willChange: "transform, opacity",
              }}
            />
          ))}

          {/* Decorative horizontal lines */}
          <motion.div
            className="absolute left-0 z-0 pointer-events-none"
            style={{ top: "42%", height: "1px", background: "linear-gradient(to right, rgba(255,102,0,0.5), transparent)" }}
            initial={{ width: 0 }}
            animate={{ width: "42%" }}
            transition={{ duration: 1.4, delay: 0.6, ease: EASE }}
          />
          <motion.div
            className="absolute left-0 z-0 pointer-events-none"
            style={{ top: "calc(42% + 6px)", height: "1px", background: "linear-gradient(to right, rgba(255,102,0,0.18), transparent)" }}
            initial={{ width: 0 }}
            animate={{ width: "28%" }}
            transition={{ duration: 1.4, delay: 0.8, ease: EASE }}
          />

          {/* ── Hero content ── */}
          <motion.div className="container relative z-10 px-4 pt-24 pb-32" style={{ opacity: heroOpacity }}>
            <div className="flex items-center justify-between gap-12">
              <div className="max-w-2xl">

                {/* Badge with orbit */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.75, delay: HD, ease: EASE }}
                  className="inline-flex items-center gap-3 mb-10"
                >
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-sm border border-primary/50"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    />
                    <span className="relative inline-flex items-center gap-2 border border-primary/40 bg-primary/10 text-primary text-[11px] font-black uppercase tracking-[0.25em] px-4 py-2 rounded-sm">
                      <motion.span animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                        <Flame className="h-3 w-3" />
                      </motion.span>
                      New Drop — Chamak Collection
                    </span>
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 64 }}
                    transition={{ duration: 0.7, delay: HD + 0.5, ease: EASE }}
                    className="h-px"
                    style={{ background: "linear-gradient(to right, rgba(255,102,0,0.6), transparent)" }}
                  />
                </motion.div>

                {/* Title */}
                <div className="mb-2">
                  <div className="flex flex-wrap gap-x-5 text-[2.8rem] leading-none sm:text-6xl md:text-[6rem] lg:text-[7.5rem] font-black uppercase tracking-tight md:tracking-[-0.04em]">
                    {heroTitle.split(" ").map((word, wi) => (
                      <div key={wi} className="overflow-hidden">
                        <motion.span
                          className="inline-block"
                          initial={{ y: "110%", opacity: 0 }}
                          animate={{ y: "0%", opacity: 1 }}
                          transition={{ duration: 0.8, delay: HD + 0.1 + wi * 0.12, ease: EASE }}
                        >
                          {word}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtitle — gradient */}
                <div className="mb-10">
                  <div className="flex flex-wrap gap-x-5">
                    {heroSubtitle.split(" ").map((word, wi) => (
                      <div key={wi} className="overflow-hidden">
                        <motion.span
                          className="inline-block gradient-text text-[2.8rem] leading-none sm:text-6xl md:text-[6rem] lg:text-[7.5rem] font-black uppercase tracking-tight md:tracking-[-0.04em]"
                          initial={{ y: "110%", opacity: 0 }}
                          animate={{ y: "0%", opacity: 1 }}
                          transition={{ duration: 0.8, delay: HD + 0.25 + wi * 0.12, ease: EASE }}
                        >
                          {word}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: HD + 0.45, ease: EASE }}
                  className="text-base md:text-xl text-muted-foreground mb-12 max-w-md leading-relaxed"
                >
                  {heroDescription}
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: HD + 0.58, ease: EASE }}
                  className="flex gap-4 flex-wrap items-center"
                >
                  <Link href="/shop">
                    <motion.div
                      whileHover={{ scale: 1.06, filter: "brightness(1.15)" }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="inline-block"
                    >
                      <Button
                        size="lg"
                        className="text-base md:text-lg h-14 px-10 md:px-14 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_40px_rgba(255,102,0,0.6),0_0_0_1px_rgba(255,102,0,0.2)] hover:shadow-[0_0_70px_rgba(255,102,0,0.85)] transition-all duration-300"
                      >
                        {heroCtaText} <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/shop">
                    <motion.div
                      whileHover={{ scale: 1.04, x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Browse All
                      <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                        →
                      </motion.span>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Social proof strip */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: HD + 0.85, duration: 0.6 }}
                  className="flex items-center gap-4 mt-10"
                >
                  <div className="flex -space-x-2">
                    {["🧑🏾", "👩🏻", "🧑🏽", "👨🏿"].map((emoji, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-sm">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <motion.span key={i} className="text-primary text-xs" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}>★</motion.span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Trusted by <span className="text-foreground">2,000+</span> customers in UAE</p>
                  </div>
                </motion.div>
              </div>

              {/* ── Floating hero product (xl screens) ── */}
              {heroProductMedia && (
                <motion.div
                  className="hidden xl:block shrink-0 relative"
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1.0, delay: HD + 0.6, ease: EASE }}
                >
                  <motion.div
                    animate={{ y: [0, -18, 0], rotateY: [0, 4, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    style={{ perspective: 1200 }}
                    className="relative"
                  >
                    {/* Glow under product */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-8 rounded-full blur-2xl opacity-50" style={{ background: "rgba(255,102,0,0.4)" }} />

                    <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden border border-primary/20 shadow-[0_40px_100px_rgba(255,102,0,0.25),0_0_0_1px_rgba(255,102,0,0.1)]">
                      {heroProductMedia.type === "video" ? (
                        <video src={heroProductMedia.url} className="w-full h-full object-cover" muted playsInline loop autoPlay />
                      ) : (
                        <img src={heroProductMedia.url} alt={heroProduct?.name} className="w-full h-full object-cover" />
                      )}
                      {/* Shine overlay */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ x: ["-120%", "220%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                        style={{ background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.12) 50%, transparent 80%)", width: "60%" }}
                      />
                    </div>

                    {/* Product tag */}
                    <motion.div
                      className="absolute -bottom-4 -right-6 bg-card border border-border/80 rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-sm"
                      whileHover={{ scale: 1.05 }}
                    >
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Featured Drop</p>
                      <p className="font-black text-sm mt-0.5">{heroProduct?.name?.slice(0, 20)}{(heroProduct?.name?.length ?? 0) > 20 ? "…" : ""}</p>
                      <p className="font-mono text-primary font-black text-base">AED {heroProduct?.price?.toFixed(2)}</p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ── Slide dots + arrows ── */}
          {heroImages.length > 1 && (
            <motion.div
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: HD + 1.0 }}
            >
              {/* Arrows + dots row */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.15, backgroundColor: "rgba(255,102,0,0.2)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => goToSlide(slideIdx - 1)}
                  className="w-7 h-7 rounded-full border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.button>

                <div className="flex items-center gap-2">
                  {heroImages.map((_, i) => (
                    <motion.button
                      key={i}
                      onClick={() => goToSlide(i)}
                      animate={{
                        width: i === slideIdx ? 24 : 6,
                        backgroundColor: i === slideIdx ? "#ff6600" : "rgba(255,255,255,0.3)",
                        boxShadow: i === slideIdx ? "0 0 10px rgba(255,102,0,0.8)" : "none",
                      }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="h-1.5 rounded-full cursor-pointer"
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.15, backgroundColor: "rgba(255,102,0,0.2)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => goToSlide(slideIdx + 1)}
                  className="w-7 h-7 rounded-full border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.button>
              </div>

              {/* Progress bar for current slide */}
              <div className="w-32 h-px bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  key={slideIdx}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: slideInterval / 1000, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: HD + 1.1 }}
          >
            <motion.p
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="text-[9px] font-black uppercase tracking-[0.45em] text-muted-foreground/40"
            >Scroll</motion.p>
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-9 border border-muted-foreground/20 rounded-full flex justify-center pt-1.5"
            >
              <motion.div
                animate={{ opacity: [1, 0, 1], y: [0, 12, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="w-1 h-2 rounded-full bg-primary"
              />
            </motion.div>
          </motion.div>
        </section>

        {/* ── SPOTLIGHT BANNER ── */}
        <SpotlightBanner />

        {/* ══════════════ FEATURED PRODUCTS ══════════════ */}
        <section className="py-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <RevealSection className="mb-12">
              <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary/70 mb-2">Handpicked For You</p>
                  <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                    Heat <span className="gradient-text-animate">Check</span>
                  </h2>
                </div>
                <Link href="/shop" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity shrink-0">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </RevealSection>

            <RevealList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8" stagger={0.09}>
              {featuredProducts?.map((product, idx) => {
                const primaryMedia = getPrimaryProductMedia(product.imageUrl);
                return (
                  <motion.div key={product.id} variants={revealItem} style={{ perspective: 1100 }}>
                    <Link href={`/product/${product.id}`}>
                      <TiltCard className="group cursor-pointer">
                        <motion.div
                          className="relative aspect-[4/5] mb-4 overflow-hidden rounded-2xl bg-card border border-border/40 group-hover:border-primary/40 transition-colors duration-400"
                          whileHover={{ boxShadow: "0 36px 90px rgba(255,102,0,0.35), 0 0 0 1px rgba(255,102,0,0.18)" }}
                          transition={{ duration: 0.35 }}
                        >
                          {primaryMedia ? (
                            primaryMedia.type === "video" ? (
                              <video src={primaryMedia.url} className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-108" muted playsInline preload="metadata" />
                            ) : (
                              <motion.img
                                src={primaryMedia.url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                whileHover={{ scale: 1.08 }}
                                transition={{ duration: 0.6, ease: EASE }}
                                loading="lazy"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono text-sm">No Image</div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden rounded-2xl">
                            <motion.div
                              className="absolute top-0 bottom-0"
                              animate={{ x: ["-120%", "220%"] }}
                              transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
                              style={{ width: "50%", background: "linear-gradient(105deg, transparent 15%, rgba(255,160,0,0.22) 50%, transparent 85%)" }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-350" />
                          <div className="absolute top-3 right-3 text-[11px] font-black font-mono text-white/20 tracking-widest">
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                            {product.isPreOrder && (
                              <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm shadow-lg">Pre-Order</span>
                            )}
                            <motion.span
                              animate={{ boxShadow: ["0 0 0px rgba(255,102,0,0)", "0 0 16px rgba(255,102,0,0.95)", "0 0 0px rgba(255,102,0,0)"] }}
                              transition={{ duration: 2.8, repeat: Infinity, delay: idx * 0.4 }}
                              className="bg-primary text-primary-foreground text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm"
                            >
                              ★ Featured
                            </motion.span>
                            {product.sellingFast && (
                              <motion.span
                                animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
                                transition={{ duration: 1.0, repeat: Infinity }}
                                className="bg-orange-500 text-black text-[9px] font-black px-2 py-0.5 uppercase tracking-wider rounded-sm"
                              >
                                🔥 Hot
                              </motion.span>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4 z-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-350">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white bg-black/60 backdrop-blur-md px-5 py-1.5 rounded-full border border-white/12">
                              View Product →
                            </span>
                          </div>
                        </motion.div>
                        <div className="space-y-1.5 px-0.5">
                          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.25em]">{product.categoryName}</p>
                          <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors duration-200">{product.name}</h3>
                          <div className="flex items-center justify-between pt-1">
                            <p className="font-mono text-primary font-black text-lg">AED {product.price.toFixed(2)}</p>
                            <motion.div
                              className="h-7 w-7 rounded-full border border-primary/30 bg-primary/8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                              whileHover={{ scale: 1.3, backgroundColor: "rgba(255,102,0,0.25)" }}
                            >
                              <ArrowRight className="h-3 w-3 text-primary" />
                            </motion.div>
                          </div>
                        </div>
                      </TiltCard>
                    </Link>
                  </motion.div>
                );
              })}

              {(!featuredProducts || featuredProducts.length === 0) && (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  No featured products yet. <Link href="/shop" className="text-primary hover:underline">Check out the full shop.</Link>
                </div>
              )}
            </RevealList>
          </div>
        </section>

        {/* ── SCROLL FLOAT OBJECT ── */}
        <ScrollFloatObject />

        {/* ── EVENT HOMEPAGE BANNER ── */}
        <RevealSection amount={0.1} className="container mx-auto px-4 mt-6">
          <EventHomepageBanner />
        </RevealSection>

        {/* ══════════════ MARQUEE ══════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="fire-gradient py-4 overflow-hidden relative"
        >
          <motion.div
            animate={{ x: [0, -1600] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-10 whitespace-nowrap font-black uppercase tracking-[0.3em] text-black text-sm"
            style={{ width: "max-content" }}
          >
            {[...Array(12)].map((_, i) => (
              <span key={i} className="flex items-center gap-10">
                <span>Chamak Street</span>
                <Flame className="h-4 w-4 inline-block" />
                <span>New Drop</span>
                <span>★</span>
                <span>Stay Dripped</span>
                <Zap className="h-4 w-4 inline-block" />
                <span>Dubai Exclusive</span>
                <span>✦</span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── REVERSE MARQUEE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="bg-background border-y border-primary/15 py-3.5 overflow-hidden"
        >
          <motion.div
            animate={{ x: [-1600, 0] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-10 whitespace-nowrap font-black uppercase tracking-[0.28em] text-sm"
            style={{ width: "max-content" }}
          >
            {[...Array(12)].map((_, i) => (
              <span key={i} className="flex items-center gap-10 text-muted-foreground/50">
                <span className="gradient-text">Dubai Drip</span>
                <span>✦</span>
                <span>Limited Edition</span>
                <span className="gradient-text">✦</span>
                <span>Exclusive Drops</span>
                <span>✦</span>
                <span className="gradient-text">Street Culture</span>
                <span>✦</span>
                <span>Rep Nation</span>
                <span>✦</span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ══════════════ STATS STRIP ══════════════ */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="py-12 relative overflow-hidden border-y border-border/30"
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(255,102,0,0.12), transparent 60%)" }}
          />
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {[
                { value: 500, suffix: "+", label: "Products", color: "#ff6600" },
                { value: 3, suffix: "", label: "Top Brands", color: "#ffcc00" },
                { value: 100, suffix: "%", label: "Authentic Rep", color: "#ff9933" },
                { value: 1, suffix: " Day", label: "UAE Delivery", color: "#ff6600" },
              ].map((stat, i) => (
                <div key={i} className="relative">
                  {i > 0 && <div className="absolute left-0 top-4 bottom-4 w-px" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,102,0,0.2), transparent)" }} />}
                  <StatItem {...stat} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ══════════════ CATEGORIES ══════════════ */}
        {categories && categories.length > 0 && (
          <section className="py-28 bg-card/50 border-y border-border/40 overflow-hidden">
            <div className="container px-4 mx-auto">
              <RevealSection className="mb-16">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary/70 mb-2">Browse by Style</p>
                    <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter leading-none">The Essentials</h2>
                  </div>
                  <p className="text-muted-foreground text-lg max-w-xs">Build your uniform. Every piece, every fit.</p>
                </div>
              </RevealSection>

              <RevealList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.slice(0, 6).map((cat, i) => (
                  <motion.div key={cat.id} variants={revealItem}>
                    <Link href={`/shop?categoryId=${cat.id}`}>
                      <motion.div
                        whileHover={{ y: -8, scale: 1.018 }}
                        whileTap={{ scale: 0.975 }}
                        transition={{ type: "spring", stiffness: 340, damping: 24 }}
                        className="group relative h-80 overflow-hidden rounded-2xl cursor-pointer border border-white/5 shadow-xl hover:shadow-[0_28px_60px_rgba(255,102,0,0.2)] transition-shadow duration-500"
                      >
                        {cat.bannerImageUrl && (
                          <img
                            src={cat.bannerImageUrl}
                            alt={cat.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                            loading="lazy"
                          />
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors[i % categoryColors.length]} ${cat.bannerImageUrl ? "opacity-75" : "opacity-100"} group-hover:opacity-85 transition-opacity duration-400`} />

                        {/* Category number */}
                        <div className="absolute top-5 right-5 text-[11px] font-black font-mono text-white/25 tracking-widest">
                          {String(i + 1).padStart(2, "0")}
                        </div>

                        <div className="absolute inset-0 flex flex-col justify-end p-7">
                          <div className="w-11 h-11 rounded-full bg-primary/25 backdrop-blur-sm flex items-center justify-center text-primary mb-4 ring-1 ring-primary/20">
                            {cat.iconEmoji ? <span className="text-xl">{cat.iconEmoji}</span> : categoryIcons[i % categoryIcons.length]}
                          </div>
                          <h3 className="text-2xl font-black uppercase tracking-wide text-white drop-shadow-lg mb-1">{cat.name}</h3>
                          {cat.description && (
                            <p className="text-white/60 text-sm leading-snug mb-4">{cat.description}</p>
                          )}
                          <motion.div
                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/0 group-hover:text-white/80 transition-all duration-300"
                            initial={false}
                          >
                            <span>Shop Now</span>
                            <ArrowRight className="h-3.5 w-3.5 translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
                          </motion.div>
                        </div>

                        {/* Corner accent */}
                        <div className="absolute top-0 left-0 w-12 h-12 opacity-40">
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <path d="M0 48 L0 0 L48 0" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                          </svg>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </RevealList>
            </div>
          </section>
        )}

        {/* ── TRUST ── */}
        <TrustSection />

        <SectionDivider />

        {/* ── TIKTOK ── */}
        <TiktokSection />

        <SectionDivider />

        {/* ── REVIEWS ── */}
        <ReviewsSection />

        <SectionDivider accent={false} />

        {/* ══════════════ ONLY IN LEONIDA — PARALLAX SCROLL ══════════════ */}
        <LeonidaScrollReveal />

        <SectionDivider />

        {/* ══════════════ GTA VI EXPLORE CARDS ══════════════ */}
        <GTA6ExploreCards />

        <SectionDivider />

        {/* ══════════════ QUOTE BANNER ══════════════ */}
        <RevealSection amount={0.15} className="mx-4 mb-12">
          <section className="py-28 md:py-36 rounded-3xl overflow-hidden relative">
            {/* Multi-layer background */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,102,0,0.12) 0%, rgba(0,0,0,0) 50%, rgba(255,80,0,0.08) 100%)" }} />
            <div className="absolute inset-0 rounded-3xl border border-primary/20" />

            {/* Animated radial glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.06, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,102,0,0.15), transparent 65%)" }}
            />

            {/* Decorative top line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,102,0,0.5), transparent)" }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,102,0,0.5), transparent)" }} />

            <div className="container mx-auto px-4 text-center relative z-10">
              <motion.p
                className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 mb-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                ✦ The Chamak Mantra ✦
              </motion.p>

              <div className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight md:tracking-tighter leading-[0.92] mb-6 overflow-hidden">
                <div className="mb-2">
                  <GlitchWord text='"Stay Dripped.' delay={0.05} />
                </div>
                <div>
                  <GlitchWord text='Stay Dangerous."' delay={0.3} />
                </div>
              </div>

              <motion.p
                className="gradient-text text-lg md:text-2xl font-black uppercase tracking-[0.2em] mb-12"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                — Chamak Street, Dubai
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
                className="inline-block"
              >
                <Link href="/shop">
                  <motion.div
                    whileHover={{ scale: 1.07, filter: "brightness(1.12)" }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                    className="inline-block"
                  >
                    <Button size="lg" className="font-black uppercase tracking-widest fire-gradient border-none h-14 px-12 shadow-[0_0_40px_rgba(255,102,0,0.5)] hover:shadow-[0_0_70px_rgba(255,102,0,0.75)] transition-shadow duration-300 text-base md:text-lg">
                      Shop The Collection <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </section>
        </RevealSection>

      </div>
    </PageTransition>
  );
}
