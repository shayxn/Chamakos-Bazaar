import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, X, ShoppingBag, ChevronUp } from "lucide-react";
import leonidaMapImg from "@assets/904B9A86-2CF9-4B4E-BE6D-949D28E9CB2F_1783104370895.png";
import gta6BgImg from "@assets/9EFF3459-F0D5-4AC8-B59A-1BBBE911B19F_1783160642586.png";
import { useSettings } from "@/lib/use-settings";
import {
  AMBIENT_CSS, SwayingPalms, OceanWaves,
  FloatingParticles, NeonReflections, CharacterConnectionOverlay, CharacterFloatWrapper,
} from "@/components/ambient-effects";

const RS = "https://www.rockstargames.com/VI/_next/static/media/";

const IMG = {
  hero:          RS + "Vice_City_01.135x56yoeu.6t.jpg",
  jason1:        RS + "Jason_Duval_01.07m377xeb6jhq.jpg",
  jason2:        RS + "Jason_Duval_02.1486~7_v40cn..jpg",
  jason3:        RS + "Jason_Duval_03.0-1vum7x-3vtp.jpg",
  lucia1:        RS + "Lucia_Caminos_01.0a7yqvewctkfp.jpg",
  lucia2:        RS + "Lucia_Caminos_02.16n.5umvlu_48.jpg",
  lucia3:        RS + "Lucia_Caminos_03.14xgd2y_ymmeg.jpg",
  lucia4:        RS + "Lucia_Caminos_04.04kb_~4ubn3wn.jpg",
  vc2:           RS + "Vice_City_02.0c5.7qx17u9kl.jpg",
  vc3:           RS + "Vice_City_03.0nqz~lrqdmlze.jpg",
  vc4:           RS + "Vice_City_04.06evqutgh7624.jpg",
  vc5:           RS + "Vice_City_05.0~r~o0jzpp4a-.jpg",
  vc6:           RS + "Vice_City_06.0_tdmr3u9w84x.jpg",
  vc7:           RS + "Vice_City_07.0b3mhak4k78oh.jpg",
  vc8:           RS + "Vice_City_08.0bbg_xp4hqdvz.jpg",
  vc9:           RS + "Vice_City_09.0~ng.c8ack3fp.jpg",
  keys1:         RS + "Leonida_Keys_01.0zgz7tveur6y8.jpg",
  keys2:         RS + "Leonida_Keys_02.0~ptk-53gl0lq.jpg",
  keys3:         RS + "Leonida_Keys_03.0v_3~-9ceyixc.jpg",
  port1:         RS + "Port_Gellhorn_01.0fmisvza-5-cq.jpg",
  port2:         RS + "Port_Gellhorn_02.00e7cz6lwrup-.jpg",
  ambrosia1:     RS + "Ambrosia_01.0rqphs0gazkm..jpg",
  ambrosia2:     RS + "Ambrosia_02.0wtqs05ozl.ym.jpg",
  grass1:        RS + "Grassrivers_01.1096rw4lbjur_.jpg",
  kalaga1:       RS + "Mount_Kalaga_National_Park_01.0v5fl0f83hjv_.jpg",
  kalaga2:       RS + "Mount_Kalaga_National_Park_02.0f24dhopdprvx.jpg",
  ult1:          RS + "ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg",
  ult2:          RS + "ULTIMATE_EDITION_02.0q-6.nrtf~jj0.jpg",
  cheetah1:      RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg",
  cheetah2:      RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_02.0rkrlsu_dg~ww.jpg",
  cheetah3:      RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_03.0v3_dryhtjarc.jpg",
  cheetah4:      RS + "ULTIMATE_EDITION_GROTTI_CHEETAH_04.0caq_y0_f1rvt.jpg",
  weapons:       RS + "ULTIMATE_EDITION_WEAPON_VARIANTS_01.12licq0_o7mb5.jpg",
  revolvers1:    RS + "ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.0~3pdc~~sing4.jpg",
  style1:        RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_01.0.u1gt~99yzks.jpg",
  style2:        RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_02.0c-r4s-x7srt5.jpg",
  style3:        RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_03.08.sic8sgqk4u.jpg",
  style4:        RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_04.1572kk.expq-n.jpg",
  style5:        RS + "ULTIMATE_EDITION_VICE_CITY_STYLE_05.0img~prrjg.bc.jpg",
  safehouse1:    RS + "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_01.0wv6pw3t-mky3.jpg",
  safehouse2:    RS + "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_02.0-2n5rm9n8.rq.jpg",
  retro1:        RS + "ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg",
  squalo1:       RS + "ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg",
  stock1:        RS + "ULTIMATE_EDITION_STOCK_305_01.0vuq0m5_1j-17.jpg",
  buggy1:        RS + "ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg",
  efang1:        RS + "ULTIMATE_EDITION_ELECTRIC_FANG_01.04tsytu7qp2b-.jpg",
  salon1:        RS + "ULTIMATE_EDITION_SARAS_SALON_01.0gn7dwlvcgz17.jpg",
  rideout1:      RS + "ULTIMATE_EDITION_RIDEOUT_CUSTOMS_01.065-ms8~k8vbq.jpg",
};

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

function SectionLabel({ children, accent = PINK }: { children: React.ReactNode; accent?: string }) {
  return (
    <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: accent }}>
      {children}
    </span>
  );
}

function Divider() {
  return <div className="w-16 h-px my-10 mx-auto opacity-25" style={{ background: `linear-gradient(to right, ${PINK}, ${CYAN})` }} />;
}

function GalleryGrid({ items }: { items: { src: string; label: string; accent?: string }[] }) {
  const [fullscreen, setFullscreen] = useState<number | null>(null);

  useEffect(() => {
    if (fullscreen === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(null);
      if (e.key === "ArrowRight") setFullscreen(p => p !== null ? (p + 1) % items.length : null);
      if (e.key === "ArrowLeft") setFullscreen(p => p !== null ? (p - 1 + items.length) % items.length : null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, items.length]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <RevealUp key={i} delay={i * 0.06}>
            <div
              className="relative overflow-hidden rounded-xl aspect-square group cursor-pointer"
              onClick={() => setFullscreen(i)}
            >
              <img src={item.src} alt={item.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: item.accent || PINK }}>{item.label}</p>
              </div>
              <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: `1px solid ${item.accent || PINK}44` }} />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5"><path d="M1 4V1h3M6 1h3v3M9 6v3H6M4 9H1V6" /></svg>
                </div>
              </div>
            </div>
          </RevealUp>
        ))}
      </div>

      <AnimatePresence>
        {fullscreen !== null && (
          <motion.div
            className="fixed inset-0 z-[300] bg-black/96 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreen(null)}
          >
            <motion.img
              key={fullscreen}
              src={items[fullscreen].src}
              alt={items[fullscreen].label}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: items[fullscreen].accent || PINK }}>
                {items[fullscreen].label}
              </span>
              <span className="text-white/30 text-xs ml-3">{fullscreen + 1} / {items.length}</span>
            </div>
            <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors" onClick={() => setFullscreen(null)}>
              <X className="h-4 w-4" />
            </button>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors" onClick={e => { e.stopPropagation(); setFullscreen(p => p !== null ? (p - 1 + items.length) % items.length : null); }}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors" onClick={e => { e.stopPropagation(); setFullscreen(p => p !== null ? (p + 1) % items.length : null); }}>
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const MAP_REGIONS = [
  { id: "vice-city",    name: "Vice City",     x: 30, y: 78, desc: "The neon-lit coastal metropolis at the heart of Leonida. Vice City pulses with energy, from Art Deco skyscrapers to sun-soaked beaches.",                               screens: ["hero","vc2","vc3","vc4"] as const,         accent: PINK },
  { id: "leonida-keys", name: "Leonida Keys",  x: 20, y: 91, desc: "A chain of tropical islands at the southern tip of the state. Crystal-clear waters, mangroves, and a world apart from the city.",                                    screens: ["keys1","keys2","keys3"] as const,          accent: GOLD },
  { id: "port-gellhorn",name: "Port Gellhorn", x: 72, y: 52, desc: "A working port city on the eastern coast. Industrial docks meet suburban sprawl in this gritty but vibrant community.",                                               screens: ["port1","port2"] as const,                 accent: CYAN },
  { id: "grassrivers",  name: "Grassrivers",   x: 46, y: 47, desc: "Fertile flatlands cut through by winding rivers. Agricultural heartland of Leonida, dotted with small towns and roadside diners.",                                    screens: ["grass1","vc6"] as const,                  accent: GOLD },
  { id: "mount-kalaga", name: "Mount Kalaga",  x: 37, y: 18, desc: "The crown of the Leonida wilderness. Soaring peaks, ancient forests, and breathtaking vistas that stretch to the horizon.",                                           screens: ["kalaga1","kalaga2"] as const,              accent: CYAN },
  { id: "ambrosia",     name: "Ambrosia",      x: 74, y: 73, desc: "A sun-drenched coastal suburb east of Vice City. Gated communities, yacht clubs, and the quieter side of Leonida wealth.",                                            screens: ["ambrosia1","ambrosia2"] as const,          accent: PINK },
  { id: "north-coast",  name: "North Coast",   x: 60, y:  5, desc: "Wild, rugged shoreline along the northern edge of Leonida. Fishing towns, sea stacks, and hidden coves for the adventurous.",                                        screens: ["vc8","vc9"] as const,                     accent: CYAN },
  { id: "redlands",     name: "Redlands",      x: 65, y: 63, desc: "Red-clay hills and scrubland east of the city. Where urban sprawl thins out and a rawer, less polished Leonida takes over.",                                         screens: ["vc7","vc5"] as const,                     accent: GOLD },
  { id: "lake-leonida", name: "Lake Leonida",  x: 57, y: 33, desc: "A vast freshwater lake surrounded by pines and marshland. A summer retreat for city dwellers and home to some of the state's best fishing.",                         screens: ["keys2","kalaga1"] as const,               accent: CYAN },
];

function LeonidaWorldMap() {
  const [active, setActive] = useState<string | null>(null);
  const region = MAP_REGIONS.find(r => r.id === active);
  const getScreens = (keys: readonly string[]) => keys.map(k => IMG[k as keyof typeof IMG]).filter(Boolean) as string[];

  return (
    <section className="relative py-16 overflow-hidden">
      <div className="container mx-auto px-6">
        <RevealUp className="text-center mb-10">
          <SectionLabel accent={GOLD}>Explore</SectionLabel>
          <h2 className="font-black uppercase text-white" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.95 }}>
            State of{" "}
            <span style={{ background: `linear-gradient(135deg, ${GOLD}, ${PINK})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Leonida</span>
          </h2>
          <p className="text-white/40 mt-3 text-sm font-mono tracking-wider">Tap any marker to explore · 9 regions · 12,607 km²</p>
        </RevealUp>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Map image + hotspots */}
          <RevealUp className="relative w-full lg:w-[460px] flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden" style={{ boxShadow: `0 0 100px ${GOLD}22, 0 40px 80px rgba(0,0,0,0.7)` }}>
              <img src={leonidaMapImg} alt="State of Leonida" className="w-full object-cover select-none" draggable={false} />
              {MAP_REGIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActive(active === r.id ? null : r.id)}
                  className="group absolute z-10"
                  style={{ left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%,-50%)" }}
                >
                  <motion.div
                    animate={{
                      scale: active === r.id ? [1,1.4,1] : [1,1.2,1],
                      boxShadow: active === r.id
                        ? [`0 0 0 0 ${r.accent}70`,`0 0 0 10px ${r.accent}30`,`0 0 0 0 ${r.accent}70`]
                        : [`0 0 0 0 ${r.accent}50`,`0 0 0 6px ${r.accent}20`,`0 0 0 0 ${r.accent}50`],
                    }}
                    transition={{ duration: active === r.id ? 1.2 : 2.2, repeat: Infinity }}
                    style={{ width: active === r.id ? 16 : 11, height: active === r.id ? 16 : 11, borderRadius: "50%", background: r.accent, border: active === r.id ? "2px solid white" : "none" }}
                  />
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -top-6 text-[8px] font-black uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded pointer-events-none"
                    style={{ color: r.accent, background: "rgba(7,7,28,0.9)", backdropFilter: "blur(4px)" }}
                  >{r.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-0.5">
              {MAP_REGIONS.map(r => (
                <button key={r.id} onClick={() => setActive(active === r.id ? null : r.id)}
                  className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded text-left transition-colors"
                  style={{ color: active === r.id ? r.accent : "rgba(255,255,255,0.3)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: r.accent, display: "inline-block", flexShrink: 0 }} />{r.name}
                </button>
              ))}
            </div>
          </RevealUp>

          {/* Info panel */}
          <div className="flex-1 w-full lg:max-w-lg" style={{ minHeight: 340 }}>
            <AnimatePresence mode="wait">
              {region ? (
                <motion.div key={region.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                  className="rounded-2xl p-6 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${region.accent}25` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div><SectionLabel accent={region.accent}>{region.name}</SectionLabel><div className="w-8 h-px mb-3" style={{ background: region.accent }} /></div>
                    <button onClick={() => setActive(null)} className="text-white/25 hover:text-white/60 transition-colors mt-1"><X className="h-4 w-4" /></button>
                  </div>
                  <p className="text-white/55 text-sm leading-relaxed mb-5">{region.desc}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getScreens(region.screens).slice(0, 4).map((src, i) => (
                      <div key={i} className="aspect-video overflow-hidden rounded-lg border border-white/5">
                        <img src={src} alt={region.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", minHeight: 340 }}>
                  <motion.div animate={{ scale: [1,1.06,1], opacity: [0.4,0.7,0.4] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-4">🗺️</motion.div>
                  <p className="text-white/35 text-sm leading-relaxed">Select a location on the map<br />to explore the State of Leonida</p>
                  <div className="mt-6 grid grid-cols-3 gap-1.5">
                    {MAP_REGIONS.map(r => (
                      <div key={r.id} className="text-[7px] font-black uppercase tracking-wider px-2 py-1 rounded-full text-center" style={{ background: `${r.accent}12`, color: `${r.accent}80` }}>{r.name}</div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PreOrderModalProps {
  onClose: () => void;
  whatsappNumber: string;
}
function PreOrderModal({ onClose, whatsappNumber }: PreOrderModalProps) {
  const [form, setForm] = useState({ name: "", phone: "", platform: "PS5" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const msg = `🎮 GTA VI Pre-Order — Chamak Street\n\nName: ${form.name}\nPhone: ${form.phone}\nPlatform: ${form.platform}\n\nI'd like to place a pre-order for the Chamak Street × GTA VI collection.`;
    const num = whatsappNumber.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    setTimeout(() => { setLoading(false); onClose(); }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(7,7,28,0.92)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#0d0d2e", border: `1.5px solid ${PINK}40`, boxShadow: `0 0 80px ${PINK}25, 0 30px 60px rgba(0,0,0,0.7)` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${PINK}, ${CYAN})` }} />

        <div className="p-8">
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>

          <SectionLabel accent={PINK}>Chamak Street × GTA VI</SectionLabel>
          <h2 className="font-black uppercase text-white text-2xl sm:text-3xl mb-1 leading-none">Pre-Order Now</h2>
          <p className="text-white/45 text-xs mb-6 leading-relaxed">Fill in your details — we'll reach out via WhatsApp to confirm.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-1.5">Your Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder:text-white/25 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.1)` }}
                onFocus={e => (e.target.style.borderColor = `${PINK}80`)}
                onBlur={e => (e.target.style.borderColor = `rgba(255,255,255,0.1)`)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-1.5">WhatsApp Number</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+971 50 000 0000"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder:text-white/25 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.1)` }}
                onFocus={e => (e.target.style.borderColor = `${CYAN}80`)}
                onBlur={e => (e.target.style.borderColor = `rgba(255,255,255,0.1)`)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-1.5">Platform</label>
              <div className="grid grid-cols-2 gap-3">
                {["PS5", "Xbox Series X"].map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => setForm(f => ({ ...f, platform: p }))}
                    className="py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    style={{
                      background: form.platform === p ? `linear-gradient(135deg, ${PINK}, ${CYAN})` : "rgba(255,255,255,0.06)",
                      color: form.platform === p ? "#fff" : "rgba(255,255,255,0.4)",
                      border: form.platform === p ? "1.5px solid transparent" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.03, boxShadow: `0 8px 40px ${PINK}55` }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm text-white transition-all mt-2 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}
            >
              <ShoppingBag className="h-4 w-4" />
              {loading ? "Opening WhatsApp…" : "Confirm Pre-Order via WhatsApp"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

function YoutubeBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <img
        src={gta6BgImg}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
    </div>
  );
}

export default function GTA6Page() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroScroll, [0, 1], ["0%", "35%"]);
  const heroOpacity = useTransform(heroScroll, [0, 0.6], [1, 0]);

  const settings = useSettings();
  const [showPreOrder, setShowPreOrder] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [charHover, setCharHover] = useState<"jason" | "lucia" | null>(null);
  const [cinematicMode, setCinematicMode] = useState(false);
  const cinematicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress: pageProgress } = useScroll();
  const progressScaleX = useSpring(pageProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const resetCinematic = useCallback(() => {
    setCinematicMode(false);
    if (cinematicTimerRef.current) clearTimeout(cinematicTimerRef.current);
    cinematicTimerRef.current = setTimeout(() => setCinematicMode(true), 4000);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const onScroll = () => {
      setShowBackTop(window.scrollY > 600);
      resetCinematic();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", resetCinematic, { passive: true });
    resetCinematic();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", resetCinematic);
      if (cinematicTimerRef.current) clearTimeout(cinematicTimerRef.current);
    };
  }, [resetCinematic]);

  return (
    <div style={{ background: "#07071c", minHeight: "100vh", color: "#fff" }}>
      <style>{AMBIENT_CSS}</style>

      {/* ── YOUTUBE VIDEO BACKGROUND ── */}
      <YoutubeBg />

      {/* ── CINEMATIC MODE OVERLAY ── */}
      <AnimatePresence>
        {cinematicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 pointer-events-none z-[1]"
            style={{
              boxShadow: "inset 0 0 120px rgba(0,0,0,0.55)",
              background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)",
            }}
          >
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[8px] font-black uppercase tracking-[0.45em] text-white/25"
              >
                Cinematic Mode
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCROLL PROGRESS BAR ── */}
      <motion.div
        style={{ scaleX: progressScaleX, transformOrigin: "left", background: `linear-gradient(to right, ${PINK}, ${CYAN})` }}
        className="fixed top-0 left-0 right-0 z-[200] h-[2px] origin-left pointer-events-none"
      />

      {/* ── BACK TO TOP ── */}
      <AnimatePresence>
        {showBackTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1, boxShadow: `0 8px 30px ${PINK}55` }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-6 z-[100] w-11 h-11 rounded-full flex items-center justify-center text-white shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

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

      {/* ── STICKY PRE-ORDER BUTTON (top-right) ── */}
      <div className="fixed top-20 right-6 z-50">
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.07, boxShadow: `0 8px 40px ${PINK}70` }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPreOrder(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black uppercase tracking-widest text-xs text-white transition-all"
          style={{
            background: `linear-gradient(135deg, ${PINK}, #b820ff)`,
            boxShadow: `0 4px 24px ${PINK}45`,
          }}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Pre-Order Now
        </motion.button>
      </div>

      {/* ── PRE-ORDER MODAL ── */}
      <AnimatePresence>
        {showPreOrder && (
          <PreOrderModal
            onClose={() => setShowPreOrder(false)}
            whatsappNumber={settings.whatsapp_number || "971"}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <img src={IMG.hero} alt="Vice City" className="w-full h-full object-cover object-top scale-110" style={{ opacity: 0.35 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,7,28,0.6) 0%, rgba(7,7,28,0.35) 50%, rgba(7,7,28,0.98) 100%)" }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${PINK}14 0%, transparent 70%)` }} />
        </motion.div>

        {[
          { top: "18%", left: "8%",  color: PINK,     size: 320, delay: 0,   dur: 5 },
          { top: "60%", right: "6%", color: CYAN,     size: 260, delay: 1.2, dur: 6 },
          { top: "35%", left: "58%", color: "#9b30ff", size: 220, delay: 0.6, dur: 7 },
        ].map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orb.size, height: orb.size,
              top: orb.top,
              left: (orb as { left?: string }).left,
              right: (orb as { right?: string }).right,
              background: orb.color, filter: "blur(80px)",
              animation: `orbPulse ${orb.dur}s ${orb.delay}s ease-in-out infinite`,
              willChange: "transform, opacity",
            }}
          />
        ))}

        <motion.div className="relative z-10 container mx-auto px-6 sm:px-12 pt-32 pb-24" style={{ opacity: heroOpacity }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: EASE }}>
            <SectionLabel>Rockstar Games · 2026</SectionLabel>
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
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
            className="max-w-2xl text-xl sm:text-2xl font-medium leading-relaxed mb-10"
            style={{ color: `${PINK}ee` }}
          >
            Jason and Lucia have always known the deck is stacked against them. When an easy score goes wrong,
            they find themselves on the darkest side of the sunniest place in America — forced to rely on each other
            more than ever if they want to make it out alive.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
        <SwayingPalms />
        <OceanWaves accent={CYAN} opacity={0.07} />
        <FloatingParticles count={6} />
        <NeonReflections />
      </section>

      {/* ══════════════════════════════════════
          SECTION 2 — CHARACTERS
      ══════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp className="text-center mb-16">
            <SectionLabel accent={CYAN}>Characters</SectionLabel>
            <h2 className="font-black uppercase text-white" style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)", lineHeight: 0.95 }}>
              Jason & Lucia
            </h2>
            <p className="text-white/50 mt-4 text-base sm:text-lg max-w-xl mx-auto">
              Two outlaws. One state. Countless ways to seize it all.
            </p>
          </RevealUp>

          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <RevealUp delay={0.1}>
                <CharacterFloatWrapper char="jason">
                  <div
                    className="relative overflow-hidden rounded-2xl group"
                    style={{ minHeight: "60vh" }}
                    onMouseEnter={() => setCharHover("jason")}
                    onMouseLeave={() => setCharHover(null)}
                  >
                    <img src={IMG.jason1} alt="Jason Duval" className="w-full h-full object-cover object-top absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(7,7,28,0.95) 0%, rgba(7,7,28,0.15) 60%)` }} />
                    <div className="absolute bottom-0 left-0 p-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 block" style={{ color: CYAN }}>Protagonist</span>
                      <h3 className="text-3xl sm:text-4xl font-black uppercase text-white">Jason Duval</h3>
                      <p className="text-white/55 text-sm mt-2 max-w-xs">The grifter. A man who thought he'd escaped his past — until the past caught up with him.</p>
                    </div>
                    <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ border: `1.5px solid ${CYAN}55` }} />
                    {charHover === "lucia" && (
                      <div className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500"
                        style={{ border: `1.5px solid ${CYAN}88`, boxShadow: `inset 0 0 40px ${CYAN}18` }} />
                    )}
                  </div>
                </CharacterFloatWrapper>
              </RevealUp>

              <RevealUp delay={0.15}>
                <CharacterFloatWrapper char="lucia">
                  <div
                    className="relative overflow-hidden rounded-2xl group"
                    style={{ minHeight: "60vh" }}
                    onMouseEnter={() => setCharHover("lucia")}
                    onMouseLeave={() => setCharHover(null)}
                  >
                    <img src={IMG.lucia1} alt="Lucia Caminos" className="w-full h-full object-cover object-top absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(7,7,28,0.95) 0%, rgba(7,7,28,0.15) 60%)` }} />
                    <div className="absolute bottom-0 left-0 p-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 block" style={{ color: PINK }}>Protagonist</span>
                      <h3 className="text-3xl sm:text-4xl font-black uppercase text-white">Lucia Caminos</h3>
                      <p className="text-white/55 text-sm mt-2 max-w-xs">The strategist. The one with the plan — until the plan fell apart.</p>
                    </div>
                    <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ border: `1.5px solid ${PINK}55` }} />
                    {charHover === "jason" && (
                      <div className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500"
                        style={{ border: `1.5px solid ${PINK}88`, boxShadow: `inset 0 0 40px ${PINK}18` }} />
                    )}
                  </div>
                </CharacterFloatWrapper>
              </RevealUp>
            </div>
            <CharacterConnectionOverlay hovered={charHover} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <RevealUp delay={0.2} className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-2xl group" style={{ minHeight: "38vh" }}>
                <img src={IMG.vc4} alt="Vice City" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(7,7,28,0.88) 30%, transparent 100%)" }} />
                <div className="absolute top-0 left-0 p-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: PINK }}>Setting</span>
                  <h4 className="text-2xl font-black uppercase text-white leading-tight">Only in<br />Leonida</h4>
                  <p className="text-white/60 text-xs mt-2 max-w-[220px]">The darkest side of the sunniest place in America. Vice City, USA.</p>
                </div>
              </div>
            </RevealUp>
            <RevealUp delay={0.25}>
              <div className="relative overflow-hidden rounded-2xl group" style={{ minHeight: "38vh" }}>
                <img src={IMG.ult1} alt="Ultimate Edition" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "center 20%" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.9) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: GOLD }}>Exclusive</span>
                  <h4 className="text-xl font-black uppercase text-white">Ultimate Edition</h4>
                </div>
              </div>
            </RevealUp>
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════
          SECTION 3 — TRAILER
      ══════════════════════════════════════ */}
      <section className="relative py-8 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp>
            <div
              className="relative overflow-hidden rounded-2xl group cursor-pointer"
              style={{ minHeight: "58vh", boxShadow: `0 0 80px ${CYAN}18, 0 30px 60px rgba(0,0,0,0.5)` }}
              onClick={() => setShowTrailer(true)}
            >
              <img src={IMG.lucia2} alt="Official Trailer" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
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
                <motion.div
                  whileHover={{ scale: 1.05, boxShadow: `0 8px 40px ${CYAN}55` }}
                  className="flex items-center gap-3 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm text-white w-fit transition-all"
                  style={{ background: `linear-gradient(135deg, ${CYAN}cc, ${PINK}cc)`, backdropFilter: "blur(8px)" }}
                >
                  <Play className="h-4 w-4 fill-white" /> Watch Trailer 2
                </motion.div>
              </div>

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

      {/* ── TRAILER MODAL ── */}
      <AnimatePresence>
        {showTrailer && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTrailer(false)}
          >
            <div className="absolute inset-0 bg-black/92 backdrop-blur-lg" />
            <motion.div
              className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl"
              style={{ aspectRatio: "16/9", boxShadow: `0 0 80px ${CYAN}22, 0 40px 80px rgba(0,0,0,0.8)` }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src="https://www.youtube-nocookie.com/embed/VQRLujxTm3c?autoplay=1&rel=0&modestbranding=1&color=white&iv_load_policy=3&fs=1&enablejsapi=1"
                title="Grand Theft Auto VI — Official Trailer 2"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                loading="eager"
                className="absolute inset-0 w-full h-full border-0 bg-black"
              />
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/80 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                aria-label="Close trailer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-4 pointer-events-none z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Grand Theft Auto VI · Official Trailer 2 · Rockstar Games</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Divider />

      {/* ══════════════════════════════════════
          SECTION 4 — VINTAGE VICE CITY PACK
      ══════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">

          {/* Pack Header */}
          <RevealUp className="mb-6">
            <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "72vh" }}>
              <img src={IMG.style1} alt="Vintage Vice City Pack" className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: "center 20%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.97) 0%, rgba(7,7,28,0.6) 42%, rgba(7,7,28,0.1) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.9) 0%, transparent 55%)" }} />

              <div className="absolute inset-0 flex flex-col justify-center p-10 sm:p-16 max-w-lg">
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 block" style={{ color: GOLD }}>Pre-Order Bonus</span>
                  <div className="mb-6">
                    <div className="font-black uppercase text-white leading-none" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>VINTAGE</div>
                    <div className="font-black italic text-transparent leading-none" style={{
                      fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
                      WebkitTextStroke: `2px ${PINK}`,
                      letterSpacing: "-0.02em",
                    }}>Vice City</div>
                    <div className="font-black uppercase text-white leading-none" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>PACK</div>
                  </div>
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8 max-w-xs">
                    Pre-order to unlock unique benefits that flash back to when the neon burned brightest.
                    A timeless sedan, decadent outfits, hairstyles, and an iconic weapon pattern.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: `0 8px 40px ${PINK}55` }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowPreOrder(true)}
                    className="flex items-center gap-2 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm text-white transition-all"
                    style={{ background: `linear-gradient(135deg, ${PINK}, #b820ff)` }}
                  >
                    Pre-Order Now <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </RevealUp>

          {/* Welcome Back to Vice City */}
          <RevealUp delay={0.1} className="mb-6">
            <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "60vh" }}>
              <img src={IMG.vc6} alt="Vice City" className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: "center 30%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to left, rgba(7,7,28,0.97) 0%, rgba(7,7,28,0.55) 45%, rgba(7,7,28,0.05) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.85) 0%, transparent 55%)" }} />
              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-sm text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: PINK }}>Pre-Order Bonus</span>
                  <h3 className="font-black uppercase text-white leading-tight mb-2" style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}>
                    WELCOME<br />BACK TO
                  </h3>
                  <div className="font-black italic text-transparent mb-6" style={{
                    fontSize: "clamp(2.5rem, 5vw, 4rem)",
                    WebkitTextStroke: `2px ${PINK}`,
                    lineHeight: 1,
                  }}>Vice City</div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Featuring a timeless '55 Vapid Stanier sedan and garage alongside Ocean Beach,
                    decadent outfits and hairstyles for both characters, and an iconic weapon pattern
                    that echoes the excess of the past.
                  </p>
                </div>
              </div>
            </div>
          </RevealUp>

          {/* '55 Vapid Stanier + Outfits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <RevealUp delay={0.1}>
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
                <img src={IMG.safehouse1} alt="55 Vapid Stanier" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.05) 0%, rgba(7,7,28,0.88) 100%)" }} />
                <div className="absolute inset-0 flex flex-col justify-center items-end p-8">
                  <div className="max-w-[220px] text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-2" style={{ color: PINK }}>Vehicle & Garage</span>
                    <h4 className="text-2xl sm:text-3xl font-black uppercase text-white leading-tight mb-3">'55 VAPID STANIER</h4>
                    <p className="text-white/55 text-xs leading-relaxed">
                      Cruise Shore Drive in this classic sedan. Features a weapon locker and secure place to deposit stolen goods.
                    </p>
                  </div>
                </div>
              </div>
            </RevealUp>
            <RevealUp delay={0.2}>
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
                <img src={IMG.style3} alt="Outfits and Hairstyles" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to left, rgba(7,7,28,0.92) 0%, rgba(7,7,28,0.2) 60%)" }} />
                <div className="absolute inset-0 flex flex-col justify-center items-end p-8">
                  <div className="max-w-[200px] text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-2" style={{ color: CYAN }}>Looks</span>
                    <h4 className="text-2xl font-black uppercase text-white leading-tight mb-3">OUTFITS &<br />HAIRSTYLES</h4>
                    <p className="text-white/55 text-xs leading-relaxed">
                      Dress for excess with the effortlessly chic linen suit in vintage pastel, styled for the decade of decadence.
                    </p>
                  </div>
                </div>
              </div>
            </RevealUp>
          </div>

          {/* Outfits detail + Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <RevealUp delay={0.05} className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] group">
                <img src={IMG.style4} alt="Outfits detail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
                <img src={IMG.lucia3} alt="Lucia character" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "center top" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.85) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: GOLD }}>Character</span>
                  <h5 className="text-lg font-black uppercase text-white">Lucia Caminos</h5>
                </div>
              </div>
            </RevealUp>
          </div>

          {/* Weapon Pattern */}
          <RevealUp delay={0.1} className="mb-6">
            <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "58vh" }}>
              <div className="absolute inset-0 grid grid-cols-2">
                <img src={IMG.style5} alt="Weapon Pattern character" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
                <img src={IMG.weapons} alt="Weapon Pattern" className="w-full h-full object-cover" style={{ objectPosition: "center 40%" }} />
              </div>
              <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(7,7,28,0.05) 0%, rgba(7,7,28,0.65) 45%, rgba(7,7,28,0.92) 100%)` }} />
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
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════
          SECTION 5 — ULTIMATE EDITION
      ══════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 100% 70% at 50% 50%, #9b30ff14 0%, transparent 70%)` }} />
        <div className="container mx-auto px-6 sm:px-12">
          <RevealUp className="mb-6">
            <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "75vh" }}>
              <img src={IMG.ult2} alt="Ultimate Edition" className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: "center 25%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to left, rgba(7,7,28,0.97) 0%, rgba(7,7,28,0.5) 50%, rgba(7,7,28,0.05) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.9) 0%, transparent 60%)" }} />
              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-md text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-4" style={{ color: GOLD }}>Exclusive Collection</span>
                  <h2 className="font-black uppercase text-white leading-none mb-6" style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
                    ULTIMATE<br />EDITION
                  </h2>
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-4">
                    Seize everything this massive world has to offer — an exclusive collection of
                    premium vehicles, weapons, apparel, and action around every corner.
                  </p>
                  <p className="text-white/45 text-sm leading-relaxed mb-8">
                    Ultimate Edition bonuses are threaded across all aspects of the story,
                    with new items uncovered behind each chapter.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: `0 8px 50px ${GOLD}55` }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowPreOrder(true)}
                    className="flex items-center gap-2 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all ml-auto"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, #ffaa00)`, color: "#07071c" }}
                  >
                    Pre-Order Now <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </RevealUp>

          {/* '95 Grotti Cheetah */}
          <RevealUp delay={0.1} className="mb-6">
            <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "60vh" }}>
              <img src={IMG.cheetah1} alt="95 Grotti Cheetah" className="w-full h-full object-cover absolute inset-0" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to left, rgba(7,7,28,0.95) 0%, rgba(7,7,28,0.45) 50%, rgba(7,7,28,0.05) 100%)" }} />
              <div className="absolute inset-0 flex flex-col justify-center items-end p-10 sm:p-16">
                <div className="max-w-[300px] text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] block mb-3" style={{ color: GOLD }}>Vehicle</span>
                  <h3 className="font-black uppercase text-white leading-tight mb-4" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}>
                    '95 GROTTI<br />CHEETAH
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Grotti's signature mid-'90s sports car and ode to Shore Drive —
                    complete with a minimalist, retro-futuristic livery.
                  </p>
                </div>
              </div>
            </div>
          </RevealUp>

          <RevealUp delay={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <div className="relative overflow-hidden rounded-2xl aspect-video group">
                <img src={IMG.cheetah2} alt="Cheetah detail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.7) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Exterior Detail</span>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl aspect-video group">
                <img src={IMG.cheetah3} alt="Cheetah motion" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.7) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>Grotti Cheetah</span>
                  <p className="text-white font-black text-sm uppercase">'95 Edition</p>
                </div>
              </div>
            </div>
          </RevealUp>

          {/* More Ultimate Edition vehicles */}
          <RevealUp delay={0.2}>
            <div className="mb-4">
              <SectionLabel accent={GOLD}>Ultimate Edition Vehicles</SectionLabel>
            </div>
            <GalleryGrid items={[
              { src: IMG.squalo1, label: "Squalo", accent: CYAN },
              { src: IMG.stock1, label: "Stock 305", accent: GOLD },
              { src: IMG.buggy1, label: "Vapid Buggy", accent: PINK },
              { src: IMG.efang1, label: "Electric Fang", accent: CYAN },
              { src: IMG.rideout1, label: "Rideout Customs", accent: GOLD },
              { src: IMG.retro1, label: "Vapid Ganado Retro", accent: PINK },
              { src: IMG.safehouse2, label: "Safehouse Vehicles", accent: CYAN },
              { src: IMG.cheetah4, label: "Grotti Cheetah", accent: GOLD },
            ]} />
          </RevealUp>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════
          SECTION 6 — MEDIA & ARTWORK
      ══════════════════════════════════════ */}
      <section className="relative py-16 overflow-hidden">
        <div className="container mx-auto px-6 sm:px-12">

          {/* Hero media card */}
          <RevealUp className="mb-10">
            <div className="relative overflow-hidden rounded-2xl group cursor-pointer"
              style={{ minHeight: "52vh", boxShadow: `0 0 60px ${PINK}15, 0 24px 60px rgba(0,0,0,0.5)` }}>
              <img src={IMG.vc8} alt="Media & Artwork" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "center 80%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,28,0.95) 0%, rgba(7,7,28,0.35) 55%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,7,28,0.75) 0%, transparent 55%)" }} />
              <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-14">
                <SectionLabel accent={CYAN}>Downloads</SectionLabel>
                <h2 className="font-black uppercase text-white mb-3" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.95 }}>
                  Media &<br />Artwork
                </h2>
                <p className="text-white/60 text-sm sm:text-base mb-6 max-w-sm">
                  Official screenshots, character art, and locations — straight from Rockstar Games.
                </p>
                <a href="https://www.rockstargames.com/VI/media/screenshots" target="_blank" rel="noopener noreferrer">
                  <motion.div
                    whileHover={{ x: 6 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs text-white border transition-all w-fit"
                    style={{ borderColor: `${CYAN}80`, background: `${CYAN}18`, backdropFilter: "blur(8px)" }}
                  >
                    View All 70 Screenshots <ArrowRight className="h-3.5 w-3.5" />
                  </motion.div>
                </a>
              </div>
              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: `1.5px solid ${CYAN}44` }} />
            </div>
          </RevealUp>

          {/* Characters grid */}
          <RevealUp delay={0.05} className="mb-4">
            <SectionLabel accent={PINK}>Character Art</SectionLabel>
          </RevealUp>
          <GalleryGrid items={[
            { src: IMG.jason1, label: "Jason Duval", accent: CYAN },
            { src: IMG.jason2, label: "Jason Duval 02", accent: CYAN },
            { src: IMG.jason3, label: "Jason Duval 03", accent: CYAN },
            { src: IMG.lucia1, label: "Lucia Caminos", accent: PINK },
            { src: IMG.lucia2, label: "Lucia Caminos 02", accent: PINK },
            { src: IMG.lucia4, label: "Lucia Caminos 04", accent: PINK },
            { src: IMG.ult1, label: "Ultimate Edition", accent: GOLD },
            { src: IMG.ult2, label: "Ultimate Edition 02", accent: GOLD },
          ]} />

          <div className="my-8" />

          {/* Locations grid */}
          <RevealUp delay={0.05} className="mb-4">
            <SectionLabel accent={CYAN}>Locations — State of Leonida</SectionLabel>
          </RevealUp>
          <GalleryGrid items={[
            { src: IMG.hero, label: "Vice City", accent: CYAN },
            { src: IMG.vc2, label: "Vice City 02", accent: CYAN },
            { src: IMG.vc3, label: "Vice City 03", accent: PINK },
            { src: IMG.vc5, label: "Vice City 05", accent: PINK },
            { src: IMG.vc7, label: "Vice City 07", accent: GOLD },
            { src: IMG.vc9, label: "Vice City 09", accent: CYAN },
            { src: IMG.keys1, label: "Leonida Keys", accent: GOLD },
            { src: IMG.keys2, label: "Leonida Keys 02", accent: GOLD },
            { src: IMG.keys3, label: "Leonida Keys 03", accent: CYAN },
            { src: IMG.port1, label: "Port Gellhorn", accent: PINK },
            { src: IMG.port2, label: "Port Gellhorn 02", accent: PINK },
            { src: IMG.ambrosia1, label: "Ambrosia", accent: GOLD },
            { src: IMG.ambrosia2, label: "Ambrosia 02", accent: GOLD },
            { src: IMG.grass1, label: "Grassrivers", accent: CYAN },
            { src: IMG.kalaga1, label: "Mt Kalaga Park", accent: CYAN },
            { src: IMG.kalaga2, label: "Mt Kalaga Park 02", accent: PINK },
          ]} />
        </div>
      </section>

      <Divider />

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
            <div className="flex flex-wrap items-center justify-center gap-4">
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
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 8px 40px #9b30ff55` }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPreOrder(true)}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm text-white border transition-all"
                style={{ borderColor: `${PINK}60`, background: `${PINK}12`, backdropFilter: "blur(8px)" }}
              >
                <ShoppingBag className="h-4 w-4" /> Pre-Order Now
              </motion.button>
            </div>
          </RevealUp>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION — INTERACTIVE WORLD MAP
      ══════════════════════════════════════ */}
      <Divider />
      <LeonidaWorldMap />

      <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${PINK}, ${CYAN}, transparent)` }} />
    </div>
  );
}
