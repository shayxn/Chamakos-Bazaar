import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { PageTransition } from "@/components/page-transition";

const RS = "https://www.rockstargames.com/VI/_next/static/media/";
const IMG = {
  ult1:      RS + "ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg",
  ult2:      RS + "ULTIMATE_EDITION_02.0q-6.nrtf~jj0.jpg",
  cheetah1:  RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg",
  cheetah2:  RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_02.0rkrlsu_dg~ww.jpg",
  cheetah3:  RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_03.0v3_dryhtjarc.jpg",
  cheetah4:  RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_04.0caq_y0_f1rvt.jpg",
  weapons:   RS + "ULTIMATE_EDITION_WEAPON_VARIANTS_01.12licq0_o7mb5.jpg",
  revolvers: RS + "ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.0~3pdc~~sing4.jpg",
  style1:    RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_01.0.u1gt~99yzks.jpg",
  style2:    RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_02.0c-r4s-x7srt5.jpg",
  style3:    RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_03.08.sic8sgqk4u.jpg",
  style4:    RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_04.1572kk.expq-n.jpg",
  style5:    RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_05.0img~prrjg.bc.jpg",
  safe1:     RS + "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_01.0wv6pw3t-mky3.jpg",
  safe2:     RS + "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_02.0-2n5rm9n8.rq.jpg",
  retro:     RS + "ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg",
  squalo:    RS + "ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg",
  jason1:    RS + "Jason_Duval_01.07m377xeb6jhq.jpg",
  lucia1:    RS + "Lucia_Caminos_01.0a7yqvewctkfp.jpg",
  lucia4:    RS + "Lucia_Caminos_04.04kb_~4ubn3wn.jpg",
  vc1:       RS + "Vice_City_01.135x56yoeu.6t.jpg",
};

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";
const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];

function AnimatedTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function RevealImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <motion.div
      className={`overflow-hidden rounded-2xl ${className ?? ""}`}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.85, ease: EASE }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" loading="lazy" />
    </motion.div>
  );
}

function PinkBlueGradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
    >
      {children}
    </span>
  );
}

function NeonBadge({ children, color = PINK }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="text-[9px] font-black uppercase tracking-[0.35em] px-3 py-1 rounded-full"
      style={{ color, border: `1px solid ${color}50`, background: `${color}12` }}
    >
      {children}
    </span>
  );
}

const PACK_ITEMS = [
  {
    id: "style",
    tag: "Apparel",
    title: "Vice City Style Pack",
    subtitle: "Jason & Lucia — 1980s Edition",
    desc: "Step back into Leonida's neon-soaked past. The Vice City Style Pack outfits Jason and Lucia in authentic 1980s Vice City fashion — bold prints, pastel linens, gold chains, and sun-bleached denim straight from when the neon burned brightest.",
    images: [IMG.style1, IMG.style2, IMG.style3, IMG.style4, IMG.style5],
    color: PINK,
    icon: "👗",
  },
  {
    id: "cheetah",
    tag: "Vehicle",
    title: "Grotti Cheetah Classic",
    subtitle: "Italian Engineering, Vintage Soul",
    desc: "The legendary Grotti Cheetah — reborn in its most iconic form. This vintage 1980s supercar features the original flat-nose profile, mid-engine V8 growl, and a hand-painted livery that screams old Vice City money. It lives in your garage from day one.",
    images: [IMG.cheetah1, IMG.cheetah2, IMG.cheetah3, IMG.cheetah4],
    color: CYAN,
    icon: "🚗",
  },
  {
    id: "weapons",
    tag: "Arsenal",
    title: "Weapon Variants Pack",
    subtitle: "Hawk & Little Morgan Revolvers",
    desc: "Two signature revolvers with engraved chrome and pearl grips — the Hawk & Little Morgan Revolvers are the most iconic sidearms in Leonida's criminal underworld. Plus a full suite of period-correct weapons, all finished in vintage chrome and matte gold.",
    images: [IMG.revolvers, IMG.weapons],
    color: "#ffd060",
    icon: "🔫",
  },
  {
    id: "vehicles",
    tag: "Lifestyle",
    title: "Safehouse Vehicles",
    subtitle: "Retro Build + Squalo Speedboat",
    desc: "Your safehouse comes pre-loaded with a Vapid Ganado in full retro body kit — a lifted, chromed-out 4x4 that turns heads on every Leonida highway. Park it next to your private Squalo speedboat and own the ocean as much as the streets.",
    images: [IMG.safe1, IMG.retro, IMG.squalo, IMG.safe2],
    color: "#7c3aed",
    icon: "🛥️",
  },
];

function PackItemSection({ item, index }: { item: typeof PACK_ITEMS[0]; index: number }) {
  const [activeImg, setActiveImg] = useState(0);
  const reversed = index % 2 !== 0;

  return (
    <motion.section
      className="py-20 md:py-28 px-4 sm:px-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      <div className={`max-w-6xl mx-auto flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} gap-12 lg:gap-20 items-center`}>
        {/* Images */}
        <div className="w-full lg:w-1/2 space-y-4">
          <motion.div
            className="relative aspect-[16/10] rounded-3xl overflow-hidden"
            style={{ boxShadow: `0 40px 100px ${item.color}20, 0 0 0 1px ${item.color}20` }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImg}
                src={item.images[activeImg]}
                alt={item.title}
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5, ease: EASE }}
                loading="lazy"
              />
            </AnimatePresence>
            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${item.color}18, transparent 40%)` }} />
            {/* Badge */}
            <div className="absolute top-4 left-4">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] px-3 py-1.5 rounded-full"
                style={{ background: `${item.color}25`, color: item.color, border: `1px solid ${item.color}40`, backdropFilter: "blur(8px)" }}>
                {item.tag}
              </span>
            </div>
          </motion.div>
          {/* Thumbnail strip */}
          {item.images.length > 1 && (
            <div className="flex gap-2.5">
              {item.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="relative flex-1 aspect-[16/9] rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    border: `2px solid ${i === activeImg ? item.color : "rgba(255,255,255,0.1)"}`,
                    opacity: i === activeImg ? 1 : 0.5,
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text */}
        <div className={`w-full lg:w-1/2 ${reversed ? "lg:text-right" : ""}`}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: EASE }}
          >
            <div className={`flex items-center gap-3 mb-5 ${reversed ? "lg:justify-end" : ""}`}>
              <span className="text-2xl">{item.icon}</span>
              <NeonBadge color={item.color}>{item.tag}</NeonBadge>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase leading-none mb-3" style={{ letterSpacing: "-0.02em" }}>
              <span style={{ color: "white" }}>{item.title.split(" ")[0]} </span>
              <span style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}aa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {item.title.split(" ").slice(1).join(" ")}
              </span>
            </h2>
            <p className="text-sm font-black uppercase tracking-[0.2em] mb-6" style={{ color: `${item.color}80` }}>
              {item.subtitle}
            </p>
            <p className="text-base text-white/60 leading-relaxed mb-8 max-w-lg">
              {item.desc}
            </p>
            {/* Decorative line */}
            <div className={`flex items-center gap-4 ${reversed ? "lg:justify-end" : ""}`}>
              <div className="h-px w-12" style={{ background: `linear-gradient(${reversed ? "to left" : "to right"}, ${item.color}80, transparent)` }} />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: `${item.color}60` }}>
                Vintage Vice City Pack
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function AnimatedPinkCyanBg() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <motion.div
        className="absolute rounded-full"
        style={{ width: 800, height: 800, top: "10%", left: "-15%", background: `radial-gradient(circle, ${PINK}18 0%, transparent 65%)` }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 700, height: 700, bottom: "5%", right: "-10%", background: `radial-gradient(circle, ${CYAN}15 0%, transparent 65%)` }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}

export default function VintageViceCityPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  return (
    <PageTransition>
      <div style={{ background: "#07071c", minHeight: "100vh", color: "#fff" }}>

        {/* ── HERO ── */}
        <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
          {/* Parallax hero bg */}
          <motion.div className="absolute inset-0" style={{ y: heroY }}>
            <img src={IMG.ult1} alt="Vintage Vice City Pack" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,7,28,0.55) 0%, rgba(7,7,28,0.1) 50%, rgba(7,7,28,0.95) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,45,156,0.15) 0%, rgba(0,212,255,0.10) 100%)" }} />
          </motion.div>

          {/* Animated pink/cyan particles */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none rounded-full"
              style={{
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                background: i % 2 === 0 ? PINK : CYAN,
                boxShadow: `0 0 ${8 + i * 2}px ${i % 2 === 0 ? PINK : CYAN}`,
                left: `${5 + i * 7}%`,
                bottom: `${10 + (i % 5) * 10}%`,
              }}
              animate={{ y: [0, -(100 + i * 20), 0], opacity: [0, 0.9, 0] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
            />
          ))}

          <motion.div
            className="relative z-10 text-center px-4"
            style={{ opacity: heroOpacity }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="inline-block text-[10px] font-black uppercase tracking-[0.5em] px-4 py-2 rounded-full mb-8"
              style={{ background: `linear-gradient(135deg, ${PINK}20, ${CYAN}20)`, border: `1px solid ${PINK}40`, color: PINK }}
            >
              ✦ Grand Theft Auto VI — Pre-Order Bonus ✦
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
              className="text-5xl sm:text-7xl md:text-[100px] font-black uppercase leading-none mb-4"
              style={{ letterSpacing: "-0.03em" }}
            >
              <span style={{ color: "white" }}>Vintage</span>
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
              className="text-5xl sm:text-7xl md:text-[100px] font-black uppercase italic leading-none mb-4"
              style={{
                letterSpacing: "-0.03em",
                WebkitTextStroke: `2px ${PINK}`,
                WebkitTextFillColor: "transparent",
              }}
            >
              Vice City
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
              className="text-5xl sm:text-7xl md:text-[100px] font-black uppercase leading-none mb-10"
              style={{ letterSpacing: "-0.03em", color: "white" }}
            >
              Pack
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
              className="text-base md:text-lg text-white/60 max-w-md mx-auto mb-10"
            >
              Pre-order exclusive content that flashes back to when the neon burned brightest. Four packs. One era. All Vice City.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/gta6">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${PINK}60` }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-widest text-white"
                  style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}
                >
                  Pre-Order Now
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { const el = document.getElementById("pack-contents"); el?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-widest"
                style={{ border: `1px solid ${CYAN}50`, color: CYAN, background: `${CYAN}10` }}
              >
                See What's Included
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="h-5 w-5" style={{ color: `${PINK}70` }} />
          </motion.div>
        </section>

        {/* ── BACK LINK ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Link href="/gta6">
            <motion.span
              whileHover={{ x: -4 }}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer"
              style={{ color: `${CYAN}80` }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to GTA VI
            </motion.span>
          </Link>
        </div>

        {/* ── INTRO ── */}
        <section className="py-16 md:py-24 px-4 sm:px-6 relative overflow-hidden">
          <AnimatedPinkCyanBg />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <AnimatedTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-6" style={{ color: `${PINK}80` }}>
                ✦ Exclusive Pre-Order Content ✦
              </p>
              <h2 className="text-4xl md:text-6xl font-black uppercase leading-none mb-6" style={{ letterSpacing: "-0.02em" }}>
                When the <PinkBlueGradientText>Neon</PinkBlueGradientText>
                <br />Burned Brightest
              </h2>
              <p className="text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
                Four exclusive content packs that take you back to when Vice City was at its absolute peak — the fashion, the cars, the weapons, and the lifestyle of 1980s Leonida. Only available to those who pre-order Grand Theft Auto VI.
              </p>
            </AnimatedTitle>
          </div>
        </section>

        {/* ── OVERVIEW GRID ── */}
        <section className="py-4 px-4 sm:px-6 mb-8">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {PACK_ITEMS.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
                className="rounded-2xl p-4 text-center cursor-pointer group transition-all duration-200"
                style={{
                  background: `${item.color}08`,
                  border: `1px solid ${item.color}20`,
                }}
                whileHover={{ scale: 1.03, boxShadow: `0 12px 40px ${item.color}20` }}
                onClick={() => { document.getElementById(`section-${item.id}`)?.scrollIntoView({ behavior: "smooth" }); }}
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: item.color }}>{item.tag}</p>
                <p className="text-xs font-black uppercase leading-tight" style={{ color: "rgba(255,255,255,0.8)" }}>{item.title}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HERO SPLIT ── */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            <RevealImg src={IMG.ult2} alt="Vintage Vice City Pack" className="aspect-[4/3] md:aspect-auto md:row-span-1" />
            <div className="grid grid-rows-2 gap-6">
              <RevealImg src={IMG.lucia1} alt="Lucia Caminos" className="aspect-[16/9]" />
              <RevealImg src={IMG.jason1} alt="Jason Duval" className="aspect-[16/9]" />
            </div>
          </div>
        </section>

        {/* ── PACK ITEM SECTIONS ── */}
        <div id="pack-contents">
          {PACK_ITEMS.map((item, i) => (
            <div key={item.id} id={`section-${item.id}`}>
              {/* Section divider */}
              {i > 0 && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                  <div className="h-px" style={{ background: `linear-gradient(to right, transparent, ${item.color}30, transparent)` }} />
                </div>
              )}
              <PackItemSection item={item} index={i} />
            </div>
          ))}
        </div>

        {/* ── STYLE GALLERY ── */}
        <section className="py-20 md:py-28 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <AnimatedTitle>
              <div className="text-center mb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-3" style={{ color: `${PINK}80` }}>Gallery</p>
                <h2 className="text-3xl md:text-5xl font-black uppercase" style={{ letterSpacing: "-0.02em" }}>
                  <PinkBlueGradientText>The Full Look</PinkBlueGradientText>
                </h2>
              </div>
            </AnimatedTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[IMG.style1, IMG.style2, IMG.cheetah3, IMG.style3, IMG.retro, IMG.style4].map((src, i) => (
                <motion.div
                  key={i}
                  className="rounded-2xl overflow-hidden aspect-square"
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.6, ease: EASE }}
                  whileHover={{ scale: 1.03 }}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT'S INCLUDED LIST ── */}
        <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
          <AnimatedPinkCyanBg />
          <div className="max-w-3xl mx-auto relative z-10">
            <AnimatedTitle>
              <div className="text-center mb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-3" style={{ color: `${CYAN}80` }}>Included Content</p>
                <h2 className="text-3xl md:text-5xl font-black uppercase" style={{ letterSpacing: "-0.02em" }}>
                  Everything in the <PinkBlueGradientText>Pack</PinkBlueGradientText>
                </h2>
              </div>
            </AnimatedTitle>
            <div className="space-y-4">
              {[
                { icon: "👗", label: "Vice City Style Outfit Pack", sub: "5 exclusive 1980s outfits for Jason and Lucia", color: PINK },
                { icon: "🚗", label: "Grotti Cheetah Classic", sub: "Vintage 1980s Italian supercar for your garage", color: CYAN },
                { icon: "🔫", label: "Hawk & Little Morgan Revolvers", sub: "Engraved chrome revolvers — twin set", color: "#ffd060" },
                { icon: "🗡️", label: "Vintage Weapon Variants", sub: "Period-correct chrome & gold weapon finishes", color: "#ffd060" },
                { icon: "🏠", label: "Vice City Safehouse Access", sub: "A private safehouse stocked with period props", color: "#7c3aed" },
                { icon: "🚙", label: "Vapid Ganado Retro Build", sub: "Custom-lifted retro 4x4 with chrome trim", color: "#7c3aed" },
                { icon: "🛥️", label: "Squalo Speedboat", sub: "Private coastal speedboat docked at your safehouse", color: CYAN },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                  className="flex items-center gap-4 rounded-2xl p-4"
                  style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}
                  whileHover={{ x: 6 }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">{item.label}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{item.sub}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-28 px-4 text-center relative overflow-hidden">
          {/* Big glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${PINK}12 0%, transparent 60%)` }} />

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, ease: EASE }}
            className="relative z-10"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-6" style={{ color: `${PINK}80` }}>
              ✦ Limited to Pre-Orders ✦
            </p>
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-none mb-4" style={{ letterSpacing: "-0.02em" }}>
              <PinkBlueGradientText>Own the era.</PinkBlueGradientText>
            </h2>
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-none mb-8" style={{ letterSpacing: "-0.02em", color: "white" }}>
              Before it's gone.
            </h2>
            <p className="text-white/50 max-w-md mx-auto mb-12">
              The Vintage Vice City Pack is exclusively available to players who pre-order Grand Theft Auto VI. Don't miss your shot at the most iconic set of launch content ever assembled.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gta6">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: `0 0 60px ${PINK}60` }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-full font-black text-base uppercase tracking-widest text-white"
                  style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}
                >
                  Pre-Order GTA VI
                </motion.button>
              </Link>
              <Link href="/shop">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-full font-black text-base uppercase tracking-widest"
                  style={{ border: `1px solid rgba(255,255,255,0.2)`, color: "rgba(255,255,255,0.7)" }}
                >
                  Shop The Collection
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER NAV ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t" style={{ borderColor: `${PINK}20` }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/gta6">
              <motion.span
                whileHover={{ x: -4 }}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer"
                style={{ color: `${CYAN}80` }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to GTA VI
              </motion.span>
            </Link>
            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.15)" }}>
              Grand Theft Auto VI — Available Fall 2025
            </p>
            <Link href="/shop">
              <motion.span
                whileHover={{ x: 4 }}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer"
                style={{ color: `${PINK}80` }}
              >
                Shop Now <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            </Link>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
