import { useListProducts, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Zap, Star } from "lucide-react";
import { useRef, useEffect, useState } from "react";
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

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const start = performance.now();
    const duration = 1600;
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
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex flex-col items-center gap-1 px-6 py-4"
    >
      <span className="text-4xl md:text-5xl font-black gradient-text-animate tabular-nums">
        {count}{suffix}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
    </motion.div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const rawY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const rawScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const heroY = useSpring(rawY, { stiffness: 80, damping: 20 });
  const heroOpacity = useSpring(rawOpacity, { stiffness: 80, damping: 20 });
  const heroScale = useSpring(rawScale, { stiffness: 80, damping: 20 });

  const settings = useSettings();

  const { data: featuredProducts } = useListProducts(
    { featured: true },
    { query: { queryKey: getListProductsQueryKey({ featured: true }), staleTime: 2 * 60_000 } }
  );

  const { data: categories } = useListCategories({ query: { staleTime: 5 * 60_000, queryKey: ["categories", "nav"] } });

  const heroImage = settings.hero_image || "/chamako-hero.png";
  const heroTitle = settings.hero_title || "Ignite the";
  const heroSubtitle = settings.hero_subtitle || "Streets.";
  const heroDescription = settings.hero_description || "Bold aesthetic. Unmatched drip. Dress like you own the block.";
  const heroCtaText = settings.hero_cta_text || "Shop Now";

  const categoryColors = [
    "from-orange-950/80 to-red-950/60",
    "from-yellow-950/80 to-orange-950/60",
    "from-red-950/80 to-orange-950/60",
    "from-purple-950/80 to-red-950/60",
    "from-blue-950/80 to-purple-950/60",
    "from-green-950/80 to-teal-950/60",
  ];

  const categoryIcons = [<Flame className="h-5 w-5" />, <Zap className="h-5 w-5" />, <Star className="h-5 w-5" />];

  return (
    <PageTransition>
      <div className="w-full">

        {/* ── HERO ── */}
        <section ref={heroRef} className="relative min-h-[92vh] w-full flex items-center overflow-hidden">
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY, scale: heroScale }}>
            <img
              src={heroImage}
              alt="Chamak Street Hero"
              className="w-full h-full object-cover object-center opacity-50"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
          </motion.div>

          <motion.div
            className="absolute inset-0 z-0 pointer-events-none"
            animate={{ opacity: [0.3, 0.55, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "radial-gradient(ellipse 60% 50% at 20% 60%, rgba(255,102,0,0.12), transparent)" }}
          />

          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute z-0 rounded-full pointer-events-none"
              style={{
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
                left: `${10 + i * 15}%`,
                bottom: `${8 + (i % 4) * 6}%`,
                background: i % 2 === 0 ? "#ff6600" : "#ffcc00",
                boxShadow: `0 0 10px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
              }}
              animate={{ y: [0, -(70 + i * 22), 0], opacity: [0, 0.9, 0] }}
              transition={{ duration: 2.8 + i * 0.35, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
            />
          ))}

          <motion.div className="container relative z-10 px-4" style={{ opacity: heroOpacity }}>
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
                className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm mb-7"
              >
                <Flame className="h-3 w-3" /> New Drop — Chamak Collection
              </motion.div>

              <div className="overflow-hidden mb-2">
                <motion.div
                  className="text-[2.4rem] leading-tight sm:text-5xl md:text-8xl font-black uppercase tracking-tight md:tracking-tighter"
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
                >
                  {heroTitle}
                </motion.div>
              </div>
              <div className="overflow-hidden mb-7">
                <motion.div
                  className="gradient-text text-[2.4rem] leading-tight sm:text-5xl md:text-8xl font-black uppercase tracking-tight md:tracking-tighter"
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.38, ease: EASE }}
                >
                  {heroSubtitle}
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.55, ease: EASE }}
                className="text-base md:text-xl text-muted-foreground mb-9 max-w-lg leading-relaxed"
              >
                {heroDescription}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.68, ease: EASE }}
                className="flex gap-4 flex-wrap"
              >
                <Link href="/shop">
                  <motion.div
                    whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="inline-block"
                  >
                    <Button
                      size="lg"
                      className="text-base md:text-lg h-12 md:h-14 px-7 md:px-10 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_30px_rgba(255,102,0,0.45)] hover:shadow-[0_0_55px_rgba(255,102,0,0.7)] transition-shadow duration-300"
                    >
                      {heroCtaText} <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/order-tracking">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="inline-block"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-base md:text-lg h-12 md:h-14 px-7 md:px-10 font-black uppercase tracking-widest border-border/60 hover:border-primary/50 transition-colors duration-300"
                    >
                      Track Order
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2"
            >
              <motion.div
                animate={{ opacity: [1, 0, 1], y: [0, 9, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="w-1 h-1.5 rounded-full bg-primary"
              />
            </motion.div>
          </motion.div>
        </section>

        {/* ── SCROLL FLOAT OBJECT ── */}
        <ScrollFloatObject />

        {/* ── SPOTLIGHT BANNER ── */}
        <SpotlightBanner />

        {/* ── EVENT HOMEPAGE BANNER ── */}
        <RevealSection amount={0.1} className="container mx-auto px-4 mt-6">
          <EventHomepageBanner />
        </RevealSection>

        {/* ── MARQUEE ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="fire-gradient py-3 overflow-hidden"
        >
          <motion.div
            animate={{ x: [0, -1400] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-12 whitespace-nowrap text-black font-black uppercase text-sm tracking-[0.3em]"
            style={{ width: "max-content" }}
          >
            {[...Array(10)].map((_, i) => (
              <span key={i} className="flex items-center gap-10">
                <span>Chamak Street</span>
                <Flame className="h-4 w-4 inline-block" />
                <span>New Drop</span>
                <span>★</span>
                <span>Stay Dripped</span>
                <Zap className="h-4 w-4 inline-block" />
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── REVERSE MARQUEE ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="bg-background border-y border-primary/20 py-3 overflow-hidden"
        >
          <motion.div
            animate={{ x: [-1400, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-12 whitespace-nowrap font-black uppercase text-sm tracking-[0.3em]"
            style={{ width: "max-content" }}
          >
            {[...Array(10)].map((_, i) => (
              <span key={i} className="flex items-center gap-10 text-muted-foreground">
                <span className="gradient-text">Dubai Drip</span>
                <span>✦</span>
                <span>Limited Edition</span>
                <span className="gradient-text">✦</span>
                <span>Exclusive Drops</span>
                <span>✦</span>
                <span className="gradient-text">Street Culture</span>
                <span>✦</span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── STATS COUNTER STRIP ── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="py-10 border-y border-border/30 bg-card/30 overflow-hidden"
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/30">
              <StatItem value={500} suffix="+" label="Products" />
              <StatItem value={3} suffix="" label="Brands" />
              <StatItem value={100} suffix="%" label="Authentic Rep" />
              <StatItem value={1} suffix=" Day" label="UAE Delivery" />
            </div>
          </div>
        </motion.section>

        {/* ── CATEGORIES (from DB) ── */}
        {categories && categories.length > 0 && (
          <section className="py-24 bg-card border-y border-border/50 overflow-hidden">
            <div className="container px-4 mx-auto">
              <RevealSection className="mb-14">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">The Essentials</h2>
                <p className="text-muted-foreground mt-2 text-lg">Build your uniform.</p>
              </RevealSection>

              <RevealList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.slice(0, 6).map((cat, i) => (
                  <motion.div key={cat.id} variants={revealItem}>
                    <Link href={`/shop?categoryId=${cat.id}`}>
                      <motion.div
                        whileHover={{ y: -10, scale: 1.025 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        className={`group relative h-72 overflow-hidden rounded-xl cursor-pointer border border-border/30 shadow-lg hover:shadow-[0_24px_48px_rgba(255,102,0,0.18)] transition-shadow duration-500`}
                        style={{
                          background: cat.bannerImageUrl
                            ? `linear-gradient(to bottom right, rgba(0,0,0,0.7), rgba(0,0,0,0.4))`
                            : `linear-gradient(to bottom right, var(--card), rgba(0,0,0,0.2))`,
                        }}
                      >
                        {cat.bannerImageUrl && (
                          <img
                            src={cat.bannerImageUrl}
                            alt={cat.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors[i % categoryColors.length]} ${cat.bannerImageUrl ? "opacity-70" : "opacity-100"}`} />
                        <div className="absolute inset-0 flex flex-col justify-end p-8">
                          <div className="h-12 w-12 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center text-primary mb-4 text-2xl">
                            {cat.iconEmoji || categoryIcons[i % categoryIcons.length]}
                          </div>
                          <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-wide text-white drop-shadow">{cat.name}</h3>
                            <motion.div
                              className="h-10 w-10 rounded-full border border-primary/40 flex items-center justify-center text-primary shrink-0"
                              whileHover={{ scale: 1.2, x: 4 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </motion.div>
                          </div>
                          {cat.description && (
                            <p className="text-white/70 text-sm mt-1">{cat.description}</p>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </RevealList>
            </div>
          </section>
        )}

        {/* ── FEATURED PRODUCTS ── */}
        <section className="py-28 overflow-hidden">
          <div className="container mx-auto px-4">
            <RevealSection className="mb-14">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
                    Heat <span className="gradient-text-animate">Check</span>
                  </h2>
                  <p className="text-muted-foreground mt-2">The hottest pieces right now.</p>
                </div>
                <Link href="/shop" className="text-primary font-bold hover:underline flex items-center gap-2 uppercase text-sm tracking-widest">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </RevealSection>

            <RevealList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" stagger={0.09}>
              {featuredProducts?.map((product, idx) => {
                const primaryMedia = getPrimaryProductMedia(product.imageUrl);
                return (
                  <motion.div key={product.id} variants={revealItem}>
                    <Link href={`/product/${product.id}`}>
                      <motion.div
                        className="group"
                        whileHover={{ y: -12, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl bg-card border border-border/60 group-hover:border-primary/60 transition-all duration-300 shadow-lg group-hover:shadow-[0_24px_60px_rgba(255,102,0,0.28)]">
                          {primaryMedia ? (
                            primaryMedia.type === "video" ? (
                              <video src={primaryMedia.url} className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-110" muted playsInline preload="metadata" />
                            ) : (
                              <motion.img
                                src={primaryMedia.url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                whileHover={{ scale: 1.12 }}
                                transition={{ duration: 0.5, ease: EASE }}
                                loading="lazy"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono text-sm">No Image</div>
                          )}

                          {/* Orange sweep shimmer on hover */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
                            <motion.div
                              className="absolute inset-0"
                              initial={false}
                              animate={{ x: ["-110%", "110%"] }}
                              transition={{ duration: 0.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.5 }}
                              style={{
                                background: "linear-gradient(105deg, transparent 20%, rgba(255,140,0,0.22) 50%, transparent 80%)",
                                width: "60%",
                              }}
                            />
                          </div>

                          {/* Bottom gradient on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {product.isPreOrder && (
                              <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm shadow-lg">Pre-Order</span>
                            )}
                            <motion.span
                              animate={{ boxShadow: ["0 0 0px rgba(255,102,0,0)", "0 0 12px rgba(255,102,0,0.9)", "0 0 0px rgba(255,102,0,0)"] }}
                              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }}
                              className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm"
                            >Featured</motion.span>
                            {product.sellingFast && (
                              <motion.span
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className="bg-orange-500 text-black text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm"
                              >🔥 Selling Fast</motion.span>
                            )}
                          </div>

                          {/* Quick-view label that slides up from bottom */}
                          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">View Product</span>
                          </div>
                        </div>

                        <div className="space-y-1 px-0.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{product.categoryName}</p>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors duration-200">{product.name}</h3>
                          <div className="flex items-center justify-between">
                            <motion.p
                              className="font-mono text-primary font-bold text-lg"
                              whileHover={{ scale: 1.05 }}
                            >AED {product.price.toFixed(2)}</motion.p>
                            <motion.div
                              className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              whileHover={{ scale: 1.2, backgroundColor: "rgba(255,102,0,0.25)" }}
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}

              {(!featuredProducts || featuredProducts.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No featured products yet. <Link href="/shop" className="text-primary hover:underline">Check out the full shop.</Link>
                </div>
              )}
            </RevealList>
          </div>
        </section>

        {/* ── TRUST SECTION ── */}
        <TrustSection />

        {/* ── TIKTOK ── */}
        <TiktokSection />

        {/* ── REVIEWS ── */}
        <ReviewsSection />

        {/* ── QUOTE BANNER ── */}
        <RevealSection amount={0.2} className="mx-4 mb-10">
          <section
            className="py-24 rounded-2xl border border-primary/20 overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, rgba(255,102,0,0.08) 0%, rgba(0,0,0,0) 60%)" }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.05, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,102,0,0.12), transparent 70%)" }}
            />
            <div className="container mx-auto px-4 text-center relative z-10">
              <RevealSection delay={0.1}>
                <p className="text-3xl sm:text-4xl md:text-7xl font-black uppercase tracking-tight md:tracking-tighter gradient-text leading-tight">
                  "Stay Dripped.<br />Stay Dangerous."
                </p>
                <p className="text-muted-foreground mt-6 text-lg">— Chamak Street</p>
              </RevealSection>
              <RevealSection delay={0.22}>
                <Link href="/shop">
                  <motion.div
                    whileHover={{ scale: 1.06, filter: "brightness(1.1)" }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className="inline-block mt-10"
                  >
                    <Button size="lg" className="font-black uppercase tracking-widest fire-gradient border-none h-14 px-10 shadow-[0_0_30px_rgba(255,102,0,0.4)] hover:shadow-[0_0_55px_rgba(255,102,0,0.65)] transition-shadow duration-300">
                      Shop The Collection <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              </RevealSection>
            </div>
          </section>
        </RevealSection>

      </div>
    </PageTransition>
  );
}
