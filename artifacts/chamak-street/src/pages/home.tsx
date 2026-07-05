import { useListProducts, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Zap, Star, ShoppingBag } from "lucide-react";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

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

/* ── Stat item ── */
function StatItem({ value, suffix, label, color = "#ff6600" }: { value: number; suffix: string; label: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: EASE }}
      className="flex flex-col items-center gap-2 px-6 py-6 relative"
    >
      <span
        className="text-5xl md:text-6xl font-black tabular-nums leading-none"
        style={{ color, textShadow: `0 0 40px ${color}44` }}
      >
        {value}{suffix}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
    </motion.div>
  );
}

/* ── Quote word reveal ── */
function GlitchWord({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <motion.span
      ref={ref}
      className="inline-block"
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {text}
    </motion.span>
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
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-1 h-1 rotate-45 bg-primary/50" />
          <div className="w-1.5 h-1.5 rotate-45 bg-primary/70" />
          <div className="w-1 h-1 rotate-45 bg-primary/50" />
        </div>
      )}
    </div>
  );
}


export default function Home() {
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
          className="relative min-h-screen w-full flex items-center overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >

          {/* ── Full-bleed carousel images ── */}
          <AnimatePresence mode="sync">
            {/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(heroImages[slideIdx]) ? (
              <motion.video
                key={slideIdx}
                src={heroImages[slideIdx]}
                className="absolute inset-0 w-full h-full object-cover object-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                autoPlay
                loop
                playsInline
              />
            ) : (
              <motion.img
                key={slideIdx}
                src={heroImages[slideIdx]}
                alt="Chamak Street"
                className="absolute inset-0 w-full h-full object-cover object-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                loading="eager"
              />
            )}
          </AnimatePresence>

          {/* Subtle bottom fade into page */}
          <div className="absolute inset-x-0 bottom-0 h-40 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, hsl(var(--background)) 5%, transparent)" }} />

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
        <section className="py-20 overflow-hidden relative">
          <div className="container mx-auto px-4 relative z-10">
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
          <section className="py-28 bg-card/50 border-y border-border/40 overflow-hidden relative">
            <div className="container px-4 mx-auto relative z-10">
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
                            className="absolute -inset-[10%] w-[120%] h-[120%] object-cover transition-transform duration-700 group-hover:scale-105"
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
                    <Button size="lg" className="font-black uppercase tracking-widest btn-cta h-14 px-12 shadow-[0_0_40px_rgba(255,102,0,0.45)] text-base md:text-lg">
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
