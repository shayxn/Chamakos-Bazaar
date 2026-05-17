import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Zap, Star } from "lucide-react";
import { useRef } from "react";
import { PageTransition } from "@/components/page-transition";

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const { data: featuredProducts } = useListProducts(
    { featured: true },
    { query: { queryKey: getListProductsQueryKey({ featured: true }) } }
  );

  const categories = [
    { title: "Heavyweight Hoodies", sub: "Stay Warm, Stay Fresh", link: "/shop?categoryId=1", icon: <Flame className="h-5 w-5" />, bg: "from-orange-950/80 to-red-950/60" },
    { title: "Graphic Tees", sub: "Pure Street Energy", link: "/shop?categoryId=2", icon: <Zap className="h-5 w-5" />, bg: "from-yellow-950/80 to-orange-950/60" },
    { title: "Kicks & Headwear", sub: "Rep The Streets", link: "/shop?categoryId=3", icon: <Star className="h-5 w-5" />, bg: "from-red-950/80 to-orange-950/60" },
  ];

  return (
    <PageTransition>
      <div className="w-full">
        {/* ── HERO ── */}
        <section ref={heroRef} className="relative h-[90vh] w-full flex items-center overflow-hidden">
          {/* Background image with parallax */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
            <img
              src="/chamako-hero.png"
              alt="Chamako mascot in streetwear"
              className="w-full h-full object-cover object-center opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
          </motion.div>

          {/* Animated fire particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute z-0 rounded-full pointer-events-none"
              style={{
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
                left: `${15 + i * 12}%`,
                bottom: `${10 + (i % 3) * 8}%`,
                background: i % 2 === 0 ? "#ff6600" : "#ffcc00",
                boxShadow: `0 0 8px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
              }}
              animate={{
                y: [0, -(60 + i * 20), 0],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 2.5 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut",
              }}
            />
          ))}

          <motion.div className="container relative z-10 px-4" style={{ opacity: heroOpacity }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl"
            >
              {/* Tag line */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm mb-6"
              >
                <Flame className="h-3 w-3" />
                New Drop — Chamako Collection
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-[2.4rem] leading-[1] sm:text-5xl md:text-8xl font-black uppercase tracking-tight md:tracking-tighter mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  Ignite the
                </motion.span>
                <motion.span
                  className="gradient-text block"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  Streets.
                </motion.span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="text-base md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
              >
                Bold aesthetic. Unmatched drip. Dress like you own the block with the new Chamako collection.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.05 }}
                className="flex flex-wrap gap-4"
              >
                <Link href="/shop">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      size="lg"
                      className="text-base md:text-lg h-12 md:h-14 px-7 md:px-10 font-black uppercase tracking-widest fire-gradient border-none shadow-[0_0_30px_rgba(255,102,0,0.45)] hover:shadow-[0_0_45px_rgba(255,102,0,0.65)] transition-all duration-300"
                    >
                      Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2"
            >
              <motion.div
                animate={{ opacity: [1, 0, 1], y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1 h-1.5 rounded-full bg-primary"
              />
            </motion.div>
          </motion.div>
        </section>

        {/* ── MARQUEE STRIP ── */}
        <div className="fire-gradient py-3 overflow-hidden">
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-12 whitespace-nowrap text-black font-black uppercase text-sm tracking-[0.3em]"
            style={{ width: "max-content" }}
          >
            {[...Array(8)].map((_, i) => (
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
        </div>

        {/* ── CATEGORIES ── */}
        <section className="py-24 bg-card border-y border-border/50">
          <div className="container px-4 mx-auto">
            <AnimatedSection>
              <div className="mb-14">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">The Essentials</h2>
                <p className="text-muted-foreground mt-2 text-lg">Build your uniform.</p>
              </div>
            </AnimatedSection>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {categories.map((cat, i) => (
                <motion.div key={i} variants={cardVariants}>
                  <Link href={cat.link}>
                    <motion.div
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`group relative h-72 overflow-hidden bg-gradient-to-br ${cat.bg} rounded-lg cursor-pointer border border-border/30`}
                    >
                      {/* Animated glow on hover */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,102,0,0.15), transparent 70%)" }}
                      />
                      <div className="absolute inset-0 flex flex-col justify-end p-8">
                        <div className="h-12 w-12 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-black transition-all duration-300 group-hover:scale-110">
                          {cat.icon}
                        </div>
                        <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">{cat.sub}</p>
                        <div className="flex justify-between items-center">
                          <h3 className="text-2xl font-black uppercase tracking-wide">{cat.title}</h3>
                          <motion.div
                            className="h-10 w-10 rounded-full border border-primary/40 flex items-center justify-center text-primary"
                            whileHover={{ scale: 1.2, borderColor: "#ff6600" }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FEATURED PRODUCTS ── */}
        <section className="py-28">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <div className="flex justify-between items-end mb-14">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
                    Heat <span className="gradient-text">Check</span>
                  </h2>
                  <p className="text-muted-foreground mt-2">The hottest pieces right now.</p>
                </div>
                <Link href="/shop" className="text-primary font-bold hover:underline flex items-center gap-2 uppercase text-sm tracking-widest">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </AnimatedSection>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {featuredProducts?.map((product) => (
                <motion.div key={product.id} variants={cardVariants}>
                  <Link href={`/product/${product.id}`}>
                    <motion.div
                      className="group"
                      whileHover={{ y: -6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-card border border-border">
                        {product.imageUrl ? (
                          <motion.img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover object-center mix-blend-lighten"
                            whileHover={{ scale: 1.08 }}
                            transition={{ duration: 0.5 }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono text-sm">
                            No Image
                          </div>
                        )}
                        {/* Orange hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-2 left-2 flex gap-2">
                          <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">Featured</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{product.categoryName}</p>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                        <p className="font-mono text-primary font-bold text-lg">AED {product.price.toFixed(2)}</p>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}

              {(!featuredProducts || featuredProducts.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No featured products yet. Check out the full shop.
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── CHAMAKO QUOTE BANNER ── */}
        <AnimatedSection>
          <section className="py-24 mx-4 mb-10 rounded-2xl border border-primary/20 overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, rgba(255,102,0,0.08) 0%, rgba(0,0,0,0) 60%)" }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,102,0,0.1), transparent 70%)" }}
            />
            <div className="container mx-auto px-4 text-center">
              <p className="text-3xl sm:text-4xl md:text-7xl font-black uppercase tracking-tight md:tracking-tighter gradient-text leading-tight">
                "Stay Dripped.<br />Stay Dangerous."
              </p>
              <p className="text-muted-foreground mt-6 text-lg">— Chamako</p>
              <Link href="/shop">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block mt-10">
                  <Button size="lg" className="font-black uppercase tracking-widest fire-gradient border-none h-14 px-10 shadow-[0_0_30px_rgba(255,102,0,0.4)]">
                    Shop The Collection <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>
            </div>
          </section>
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
