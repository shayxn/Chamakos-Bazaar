import { useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";

import img384 from "@assets/IMG_0384_1783100301325.png";
import img385 from "@assets/IMG_0385_1783100301325.png";
import img386 from "@assets/IMG_0386_1783100301325.png";
import img387 from "@assets/IMG_0387_1783100301325.png";
import img388 from "@assets/IMG_0388_1783100301325.png";
import img389 from "@assets/IMG_0389_1783100301325.png";
import img390 from "@assets/IMG_0390_1783100301325.png";
import img391 from "@assets/IMG_0391_1783100301325.png";
import img392 from "@assets/IMG_0392_1783100301325.png";
import img393 from "@assets/IMG_0393_1783100301325.png";
import img394 from "@assets/IMG_0394_1783100301325.png";
import img395 from "@assets/IMG_0395_1783100301325.png";
import img396 from "@assets/IMG_0396_1783100301325.png";
import img397 from "@assets/IMG_0397_1783100301325.png";
import img398 from "@assets/IMG_0398_1783100301325.png";
import img399 from "@assets/IMG_0399_1783100301325.png";
import img400 from "@assets/IMG_0400_1783100301325.png";

const EASE = [0.16, 1, 0.3, 1] as const;
const PINK = "#ff2d9c";
const CYAN = "#00d4ff";
const GOLD = "#ffd060";

function RevealUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function RevealFade({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function ParallaxImage({ src, alt, speed = 0.12, className = "" }: { src: string; alt: string; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`]);
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.img src={src} alt={alt} style={{ y }} className="w-full h-full object-cover scale-110 will-change-transform" />
    </div>
  );
}

function CinematicCard({
  label, title, subtitle, image, button, href, accent = PINK, tall = false, reverse = false,
}: {
  label: string; title: string; subtitle: string; image: string; button: string;
  href?: string; accent?: string; tall?: boolean; reverse?: boolean;
}) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg) scale(1.02)`;
  };
  const handleMouseLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };
  const card = (
    <div
      ref={tiltRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl ${tall ? "min-h-[70vh]" : "min-h-[52vh]"} cursor-pointer group`}
      style={{ transition: "transform 0.15s ease", boxShadow: `0 0 60px ${accent}22, 0 24px 60px rgba(0,0,0,0.6)` }}
    >
      <div className="absolute inset-0">
        <img src={image} alt={title} className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" />
        <div className={`absolute inset-0`} style={{
          background: reverse
            ? `linear-gradient(to left, rgba(5,5,24,0.95) 0%, rgba(5,5,24,0.6) 45%, rgba(5,5,24,0.1) 100%)`
            : `linear-gradient(to right, rgba(5,5,24,0.93) 0%, rgba(5,5,24,0.55) 45%, rgba(5,5,24,0.05) 100%)`,
        }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,5,24,0.85) 0%, transparent 55%)" }} />
      </div>
      <div className={`absolute inset-0 flex flex-col justify-end p-8 sm:p-12 ${reverse ? "items-end text-right" : "items-start"}`}>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: accent }}>{label}</span>
        <h3 className="font-black uppercase text-white leading-none mb-3" style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}>{title}</h3>
        <p className="text-white/65 text-sm sm:text-base font-medium leading-relaxed mb-6 max-w-xs">{subtitle}</p>
        {href ? (
          <Link href={href}>
            <motion.button
              whileHover={{ x: reverse ? -6 : 6 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs text-white border transition-all"
              style={{ borderColor: `${accent}80`, background: `${accent}18`, backdropFilter: "blur(8px)" }}
            >
              {button} <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          </Link>
        ) : (
          <motion.button
            whileHover={{ x: reverse ? -6 : 6 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs text-white border transition-all"
            style={{ borderColor: `${accent}80`, background: `${accent}18`, backdropFilter: "blur(8px)" }}
          >
            {button} <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </div>
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ border: `1.5px solid ${accent}55`, boxShadow: `inset 0 0 40px ${accent}18` }}
      />
    </div>
  );
  return card;
}

function SectionLabel({ children, accent = PINK }: { children: React.ReactNode; accent?: string }) {
  return (
    <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: accent }}>
      {children}
    </span>
  );
}

function Divider() {
  return <div className="w-16 h-px my-8 mx-auto opacity-30" style={{ background: PINK }} />;
}

export default function GTA6Page() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroScroll, [0, 1], ["0%", "35%"]);
  const heroOpacity = useTransform(heroScroll, [0, 0.6], [1, 0]);

  return (
    <div style={{ background: "#07071c", minHeight: "100vh", color: "#fff" }}>

      {/* ── BACK BUTTON ── */}
      <div className="fixed top-20 left-6 z-50">
        <Link href="/">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-black uppercase tracking-widest text-xs text-white border border-white/20"
            style={{ backdropFilter: "blur(16px)", background: "rgba(7,7,28,0.7)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </motion.button>
        </Link>
      </div>

      {/* ══════════════════════════════════════
          SECTION 1 — HERO / STORY
      ══════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <img src={img398} alt="Vice City" className="w-full h-full object-cover object-top scale-110" style={{ opacity: 0.22 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,7,28,0.7) 0%, rgba(7,7,28,0.4) 50%, rgba(7,7,28,0.95) 100%)" }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${PINK}12 0%, transparent 70%)` }} />
        </motion.div>

        {/* Floating neon orbs */}
        {[
          { top: "20%", left: "10%", color: PINK, size: 300, delay: 0 },
          { top: "60%", right: "8%", color: CYAN, size: 250, delay: 1.2 },
          { top: "40%", left: "60%", color: "#9b30ff", size: 200, delay: 0.6 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: orb.delay }}
            style={{
              width: orb.size, height: orb.size,
              top: orb.top, left: (orb as { left?: string }).left, right: (orb as { right?: string }).right,
              background: orb.color, filter: "blur(80px)",
            }}
          />
        ))}

        <motion.div className="relative z-10 container mx-auto px-6 sm:px-12 pt-32 pb-24" style={{ opacity: heroOpacity }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: EASE }}
          >
            <SectionLabel>The World of GTA VI</SectionLabel>
            <h1
              className="font-black uppercase leading-none mb-8"
              style={{
                fontSize: "clamp(3.5rem, 10vw, 9rem)",
                background: `linear-gradient(135deg, #fff 0%, ${PINK} 50%, ${CYAN} 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              Vice City,<br />USA.
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
            className="max-w-2xl text-xl sm:text-2xl font-medium leading-relaxed mb-10"
            style={{ color: `${PINK}ee` }}
          >
            Jason and Lucia have always known the deck is stacked against them. But when an easy score goes wrong,
            they find themselves on the darkest side of the sunniest place in America, in the middle of a criminal conspiracy
            stretching across the state of Leonida — forced to rely on each other more than ever if they want to make it out alive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: EASE }}
            className="flex items-center gap-4"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: PINK }}
            />
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Scroll to Explore</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 2 — CHARACTERS
      ══════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp className="text-center mb-16">
            <SectionLabel accent={CYAN}>People & Places</SectionLabel>
            <h2 className="font-black uppercase text-white" style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)", lineHeight: 0.95 }}>
              Only in Leonida
            </h2>
            <p className="text-white/50 mt-4 text-base sm:text-lg max-w-xl mx-auto">
              Vice City, USA. The darkest side of the sunniest place in America.
            </p>
          </RevealUp>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevealUp delay={0.1}>
              <div className="relative overflow-hidden rounded-2xl aspect-[3/4] group">
                <img src={img385} alt="Characters" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(7,7,28,0.9) 0%, rgba(7,7,28,0.1) 60%)` }} />
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 block" style={{ color: CYAN }}>Main Characters</span>
                  <h3 className="text-3xl font-black uppercase text-white">Jason & Lucia</h3>
                  <p className="text-white/55 text-sm mt-2">Two outlaws forced to take on a world of corrupt elites and crime bosses.</p>
                </div>
                <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ border: `1.5px solid ${CYAN}55` }} />
              </div>
            </RevealUp>

            <div className="flex flex-col gap-6">
              <RevealUp delay={0.2}>
                <div className="relative overflow-hidden rounded-2xl aspect-video group">
                  <img src={img386} alt="Ultimate Edition Characters" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.88) 0%, transparent 60%)" }} />
                  <div className="absolute bottom-0 left-0 p-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: GOLD }}>Ultimate Edition</span>
                    <h4 className="text-xl font-black uppercase text-white">Seize the State</h4>
                  </div>
                </div>
              </RevealUp>
              <RevealUp delay={0.3}>
                <div className="relative overflow-hidden rounded-2xl aspect-video group">
                  <img src={img400} alt="Only in Leonida" className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(7,7,28,0.85) 30%, transparent 100%)" }} />
                  <div className="absolute top-0 left-0 p-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: PINK }}>People & Places</span>
                    <h4 className="text-2xl font-black uppercase text-white leading-tight">Only in<br />Leonida</h4>
                    <p className="text-white/60 text-xs mt-2 max-w-[200px]">Vice City, USA. The darkest side of the sunniest place in America.</p>
                    <motion.button
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-2 mt-4 text-xs font-black uppercase tracking-wider text-white/70 hover:text-white transition-colors"
                    >
                      Explore More <ArrowRight className="h-3 w-3" />
                    </motion.button>
                  </div>
                </div>
              </RevealUp>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 3 — VIDEOS / TRAILER
      ══════════════════════════════════════ */}
      <section className="relative py-8 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp>
            <div className="relative overflow-hidden rounded-2xl min-h-[58vh] group cursor-pointer"
              style={{ boxShadow: `0 0 80px ${CYAN}18, 0 30px 60px rgba(0,0,0,0.5)` }}>
              <img src={img399} alt="Trailer" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-103" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.92) 0%, rgba(7,7,28,0.4) 55%, rgba(7,7,28,0.05) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.7) 0%, transparent 50%)" }} />

              <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-14">
                <SectionLabel accent={CYAN}>Videos</SectionLabel>
                <h2 className="font-black uppercase text-white mb-3" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.95 }}>
                  Official Trailer
                </h2>
                <p className="text-white/60 text-sm sm:text-base mb-6 max-w-sm">
                  The biggest, most immersive evolution of the Grand Theft Auto series yet.
                </p>
                <a href="https://www.youtube.com/watch?v=QdBZExpgErs" target="_blank" rel="noopener noreferrer">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: `0 8px 40px ${CYAN}55` }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-3 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm text-white transition-all"
                    style={{ background: `linear-gradient(135deg, ${CYAN}cc, ${PINK}cc)`, backdropFilter: "blur(8px)" }}
                  >
                    <Play className="h-4 w-4 fill-white" /> Watch Now
                  </motion.button>
                </a>
              </div>

              {/* Animated play ring */}
              <div className="absolute inset-0 flex items-center justify-end pr-16 pointer-events-none">
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-28 h-28 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${CYAN}`, backdropFilter: "blur(4px)", background: `${CYAN}18` }}
                >
                  <Play className="h-10 w-10" style={{ color: CYAN }} />
                </motion.div>
              </div>

              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: `1.5px solid ${CYAN}44` }} />
            </div>
          </RevealUp>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 4 — VINTAGE VICE CITY PACK
      ══════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">

          {/* Pack Header */}
          <RevealUp className="mb-16">
            <div className="relative overflow-hidden rounded-2xl min-h-[70vh]">
              <img src={img397} alt="Vintage Vice City Pack" className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: "center 20%" }} />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to right, rgba(7,7,28,0.97) 0%, rgba(7,7,28,0.6) 40%, rgba(7,7,28,0.1) 100%)",
              }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.9) 0%, transparent 55%)" }} />

              {/* Noise texture */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
              }} />

              <div className="absolute inset-0 flex flex-col justify-center p-10 sm:p-16 max-w-lg">
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 block" style={{ color: GOLD }}>Pre-Order Bonuses</span>
                  <div className="mb-6">
                    <div className="font-black uppercase text-white leading-none" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
                      VINTAGE
                    </div>
                    <div className="font-black italic text-transparent leading-none" style={{
                      fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
                      WebkitTextStroke: `2px ${PINK}`,
                      fontStyle: "italic",
                      letterSpacing: "-0.02em",
                    }}>
                      Vice City
                    </div>
                    <div className="font-black uppercase text-white leading-none" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
                      PACK
                    </div>
                  </div>
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8 max-w-xs">
                    Pre-order to unlock unique benefits that flash back to when the neon burned brightest.
                    Featuring a timeless sedan, decadent outfits, hairstyles, and an iconic weapon pattern.
                  </p>
                  <Link href="/shop">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: `0 8px 40px ${PINK}55` }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm text-black transition-all"
                      style={{ background: `linear-gradient(135deg, ${PINK}, #ff7ac0)` }}
                    >
                      Pre-Order Now <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </RevealUp>

          {/* Welcome Back to Vice City */}
          <RevealUp delay={0.1} className="mb-12">
            <div className="relative overflow-hidden rounded-2xl min-h-[60vh]">
              <img src={img389} alt="Welcome Back to Vice City" className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: "center 30%" }} />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to left, rgba(7,7,28,0.97) 0%, rgba(7,7,28,0.55) 45%, rgba(7,7,28,0.05) 100%)",
              }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.85) 0%, transparent 55%)" }} />

              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-sm text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: PINK }}>Pre-Order Bonuses</span>
                  <h3 className="font-black uppercase text-white leading-tight mb-2" style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}>
                    WELCOME<br />BACK TO
                  </h3>
                  <div className="font-black italic text-transparent mb-6" style={{
                    fontSize: "clamp(2.5rem, 5vw, 4rem)",
                    WebkitTextStroke: `2px ${PINK}`,
                    lineHeight: 1,
                  }}>
                    Vice City
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Featuring a timeless '55 Vapid Stanier sedan and garage alongside Ocean Beach,
                    decadent outfits and hairstyles for both characters, and an iconic weapon pattern
                    that echoes the excess of the past.
                  </p>
                </div>
              </div>
            </div>
          </RevealUp>

          {/* '55 Vapid Stanier */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <RevealUp delay={0.1}>
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
                <img src={img390} alt="55 Vapid Stanier" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "center 70%" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.05) 0%, rgba(7,7,28,0.88) 100%)" }} />
                <div className="absolute inset-0 flex flex-col justify-center items-end p-8">
                  <div className="max-w-[220px] text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-2" style={{ color: PINK }}>Vehicle & Garage</span>
                    <h4 className="text-2xl sm:text-3xl font-black uppercase text-white leading-tight mb-3">'55 VAPID STANIER</h4>
                    <p className="text-white/55 text-xs leading-relaxed">
                      Cruise Shore Drive in this classic sedan and store it in the Shore Court personal garage.
                      Features a weapon locker and secure place to deposit stolen goods.
                    </p>
                  </div>
                </div>
              </div>
            </RevealUp>

            {/* Outfits & Hairstyles */}
            <RevealUp delay={0.2}>
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
                <img src={img392} alt="Outfits and Hairstyles" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to left, rgba(7,7,28,0.92) 0%, rgba(7,7,28,0.2) 60%)" }} />
                <div className="absolute inset-0 flex flex-col justify-center items-end p-8">
                  <div className="max-w-[200px] text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-2" style={{ color: CYAN }}>Looks</span>
                    <h4 className="text-2xl font-black uppercase text-white leading-tight mb-3">OUTFITS &<br />HAIRSTYLES</h4>
                    <p className="text-white/55 text-xs leading-relaxed">
                      Dress for excess with the effortlessly chic linen suit in vintage pastel,
                      complemented by the cut and coif of the decade of decadence.
                    </p>
                  </div>
                </div>
              </div>
            </RevealUp>
          </div>

          {/* Outfits details + Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <RevealUp delay={0.05} className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
                <img src={img393} alt="Outfits detail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.9) 0%, rgba(7,7,28,0.2) 55%)" }} />
                <div className="absolute inset-0 flex flex-col justify-center p-8 max-w-xs">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-2" style={{ color: PINK }}>Looks</span>
                  <h4 className="text-2xl font-black uppercase text-white leading-tight mb-3">OUTFITS &<br />HAIRSTYLES</h4>
                  <p className="text-white/55 text-xs leading-relaxed">
                    Show everyone the world is yours. Red sequin mini dress and iconic curls — the decade of decadence.
                  </p>
                </div>
              </div>
            </RevealUp>
            <RevealUp delay={0.15}>
              <div className="relative overflow-hidden rounded-2xl aspect-[3/4] group">
                <img src={img394} alt="Characters gallery" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.85) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: GOLD }}>Gallery</span>
                  <h5 className="text-lg font-black uppercase text-white">Characters</h5>
                </div>
              </div>
            </RevealUp>
          </div>

          {/* Weapon Pattern */}
          <RevealUp delay={0.1} className="mb-12">
            <div className="relative overflow-hidden rounded-2xl min-h-[60vh]">
              <div className="absolute inset-0 grid grid-cols-2">
                <img src={img395} alt="Weapon Pattern character" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
                <img src={img396} alt="Weapon Pattern" className="w-full h-full object-cover" style={{ objectPosition: "center 40%" }} />
              </div>
              <div className="absolute inset-0" style={{
                background: `linear-gradient(to right, rgba(7,7,28,0.08) 0%, rgba(7,7,28,0.65) 45%, rgba(7,7,28,0.92) 100%)`,
              }} />
              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-[280px] text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: PINK }}>Weapon Pattern</span>
                  <h3 className="font-black uppercase text-white leading-tight mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                    CHANNEL THE<br />ORIGINAL<br />KINGPIN
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Adorn most guns with a tropical pattern inspired by an iconic palm tree button-up.
                    A weapon skin that echoes the excess of the past.
                  </p>
                </div>
              </div>
            </div>
          </RevealUp>

          {/* Classic Cars Gallery */}
          <RevealUp delay={0.05}>
            <div className="mb-2">
              <SectionLabel accent={GOLD}>Gallery</SectionLabel>
              <h4 className="font-black uppercase text-white text-2xl mb-6">Media & Artwork</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="relative overflow-hidden rounded-xl aspect-square group">
                <img src={img391} alt="Classic car" className="w-full h-full object-cover object-top transition-transform duration-600 group-hover:scale-108" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${PINK}22` }} />
              </div>
              <div className="relative overflow-hidden rounded-xl aspect-square group">
                <img src={img388} alt="Car interior" className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-108" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${CYAN}22` }} />
              </div>
              <div className="relative overflow-hidden rounded-xl aspect-square group">
                <img src={img387} alt="Grotti Cheetah" className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-108" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${GOLD}22` }} />
              </div>
            </div>
          </RevealUp>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 5 — ULTIMATE EDITION
      ══════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 100% 70% at 50% 50%, #9b30ff14 0%, transparent 70%)` }} />

        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp className="mb-16">
            <div className="relative overflow-hidden rounded-2xl min-h-[75vh]">
              <img src={img386} alt="Ultimate Edition" className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: "center 25%" }} />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to left, rgba(7,7,28,0.97) 0%, rgba(7,7,28,0.5) 50%, rgba(7,7,28,0.05) 100%)",
              }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.9) 0%, transparent 60%)" }} />

              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-md text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-4" style={{ color: GOLD }}>Exclusive Collection</span>
                  <h2 className="font-black uppercase text-white leading-none mb-6" style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
                    ULTIMATE<br />EDITION
                  </h2>
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-4">
                    Welcome to Leonida, the state where anything goes. Seize everything this massive world
                    has to offer with the Grand Theft Auto VI: Ultimate Edition — an exclusive collection
                    of premium vehicles, weapons, apparel, and action around every corner.
                  </p>
                  <p className="text-white/50 text-sm leading-relaxed mb-8">
                    Ultimate Edition bonuses are threaded across all aspects of the story,
                    with new items uncovered behind each chapter.
                  </p>
                  <Link href="/shop">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: `0 8px 50px ${GOLD}55` }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all ml-auto"
                      style={{ background: `linear-gradient(135deg, ${GOLD}, #ffaa00)`, color: "#07071c" }}
                    >
                      Learn More <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </RevealUp>

          {/* '95 Grotti Cheetah */}
          <RevealUp delay={0.1} className="mb-12">
            <div className="relative overflow-hidden rounded-2xl min-h-[60vh]">
              <img src={img387} alt="95 Grotti Cheetah" className="w-full h-full object-cover absolute inset-0" />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to left, rgba(7,7,28,0.95) 0%, rgba(7,7,28,0.45) 50%, rgba(7,7,28,0.05) 100%)",
              }} />
              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-[300px] text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: GOLD }}>Vehicle</span>
                  <h3 className="font-black uppercase text-white leading-tight mb-4" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}>
                    '95 GROTTI<br />CHEETAH
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Grotti's signature mid-'90s sports car and ode to Shore Drive.
                    The '95 Grotti Cheetah is complete with a minimalist, retro-futuristic livery
                    and available to punctuate later-stage action.
                  </p>
                </div>
              </div>
            </div>
          </RevealUp>

          <RevealUp delay={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl aspect-video group">
                <img src={img388} alt="Grotti front" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.7) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Exterior</span>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl aspect-video group">
                <img src={img384} alt="Ultimate Edition card" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.7) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>Ultimate Edition</span>
                  <p className="text-white font-black text-sm uppercase">An Exclusive Collection</p>
                </div>
              </div>
            </div>
          </RevealUp>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 6 — MEDIA & ARTWORK
      ══════════════════════════════════════ */}
      <section className="relative py-16 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp>
            <div className="relative overflow-hidden rounded-2xl min-h-[52vh] group cursor-pointer"
              style={{ boxShadow: `0 0 60px ${PINK}15, 0 24px 60px rgba(0,0,0,0.5)` }}>
              <img src={img400} alt="Media & Artwork" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-103" style={{ objectPosition: "center 80%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.95) 0%, rgba(7,7,28,0.35) 55%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.75) 0%, transparent 55%)" }} />

              <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-14">
                <SectionLabel accent={CYAN}>Downloads</SectionLabel>
                <h2 className="font-black uppercase text-white mb-3" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.95 }}>
                  Media &<br />Artwork
                </h2>
                <p className="text-white/60 text-sm sm:text-base mb-6 max-w-sm">
                  Download and share official videos, screenshots, and more.
                </p>
                <motion.button
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs text-white border transition-all w-fit"
                  style={{ borderColor: `${CYAN}80`, background: `${CYAN}18`, backdropFilter: "blur(8px)" }}
                >
                  See All <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: `1.5px solid ${CYAN}44` }} />
            </div>
          </RevealUp>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 7 — SHOP CTA
      ══════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden text-center">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${PINK}10 0%, transparent 70%)` }} />
        <div className="container mx-auto px-6 relative z-10">
          <RevealUp>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] block mb-6" style={{ color: PINK }}>Chamak Street × GTA VI</span>
            <h2
              className="font-black uppercase leading-none mb-6"
              style={{
                fontSize: "clamp(2.5rem, 8vw, 7rem)",
                background: `linear-gradient(135deg, #fff 0%, ${PINK} 50%, ${CYAN} 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              Dress Like<br />a Legend.
            </h2>
            <p className="text-white/50 text-base sm:text-lg mb-10 max-w-md mx-auto">
              Vice City energy. Dubai precision. The collection drops soon.
            </p>
            <Link href="/shop">
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: `0 10px 60px ${PINK}55` }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm text-white transition-all"
                style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}
              >
                Shop The Collection <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </RevealUp>
        </div>
      </section>

      {/* Bottom glow line */}
      <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${PINK}, ${CYAN}, transparent)` }} />
    </div>
  );
}
