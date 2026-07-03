import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "wouter";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { getPrimaryProductMedia } from "@/lib/product-media";

/* Silky spring — high damping means no bounce, just smooth deceleration */
const SPRING = { stiffness: 45, damping: 28, restDelta: 0.001 };
const SPRING_FAST = { stiffness: 80, damping: 32 };

export function ScrollFloatObject() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 90%", "end start"],
  });

  const { data: products } = useListProducts(
    { featured: true },
    { query: { queryKey: [...getListProductsQueryKey({ featured: true }), "float-bg"], staleTime: 60_000 } }
  );

  const hero    = products?.find((p) => p.spotlight) ?? products?.[0];
  const bgCards = products?.filter((p) => p.id !== hero?.id).slice(0, 6) ?? [];
  const heroMedia = getPrimaryProductMedia(hero?.imageUrl ?? null);

  /* ── Scroll-driven transforms ── */
  /* Product: eases in smoothly, holds, then glides out */
  const rawY     = useTransform(scrollYProgress, [0, 0.18, 0.78, 1], [120, 0, -10, -100]);
  const rawScale = useTransform(scrollYProgress, [0, 0.16, 0.75, 1], [0.65, 1, 1, 0.80]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.10, 0.75, 0.92], [0, 1, 1, 0]);

  /* Spring-smooth everything */
  const prodY       = useSpring(rawY, SPRING);
  const prodScale   = useSpring(rawScale, SPRING);
  const prodOpacity = useSpring(rawOpacity, SPRING_FAST);

  /* Background parallax — much subtler */
  const bgY    = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);
  const textX1 = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const textX2 = useTransform(scrollYProgress, [0, 1], ["0%",  "18%"]);

  /* Label fades in mid-scroll and out near the end */
  const rawLabelOp = useTransform(scrollYProgress, [0.30, 0.44, 0.70, 0.85], [0, 1, 1, 0]);
  const labelOp    = useSpring(rawLabelOp, SPRING_FAST);

  /* Shadow expands as product scales in */
  const shadowScale = useTransform(scrollYProgress, [0.10, 0.25], [0.4, 1]);

  /* Background card parallax (each card moves slightly differently) */
  const bgCard0Y = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const bgCard1Y = useTransform(scrollYProgress, [0, 1], ["0%", "-5%"]);

  const positions: Array<{ top: string; left?: string; right?: string; deg: number; yAnim: typeof bgCard0Y }> = [
    { top: "6%",  left: "2%",  deg: -8,  yAnim: bgCard0Y },
    { top: "4%",  right: "3%", deg:  6,  yAnim: bgCard1Y },
    { top: "38%", left: "0%",  deg: -4,  yAnim: bgCard0Y },
    { top: "40%", right: "1%", deg:  9,  yAnim: bgCard1Y },
    { top: "70%", left: "4%",  deg:  4,  yAnim: bgCard0Y },
    { top: "68%", right: "4%", deg: -7,  yAnim: bgCard1Y },
  ];

  return (
    <div ref={sectionRef} className="relative w-full" style={{ height: "280vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ── Warm dark base ── */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #060200 0%, #0f0600 50%, #060200 100%)" }} />

        {/* ── Animated ambient glow (always on) ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,102,0,0.22) 0%, transparent 68%)" }}
        />

        {/* ── Slowly rotating conic ring ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          style={{ background: "conic-gradient(from 0deg, transparent 68%, rgba(255,102,0,0.1) 82%, transparent 100%)" }}
        />

        {/* ── Secondary counter-rotating ring ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          style={{ background: "conic-gradient(from 180deg, transparent 72%, rgba(255,180,0,0.06) 85%, transparent 100%)" }}
        />

        {/* ── Giant background text ── */}
        <div className="absolute inset-0 flex flex-col justify-center overflow-hidden pointer-events-none select-none">
          <motion.div
            className="whitespace-nowrap font-black uppercase leading-none mb-3"
            style={{ fontSize: "clamp(4rem, 13vw, 11rem)", color: "rgba(255,102,0,0.055)", letterSpacing: "-0.02em", x: textX1 }}
          >
            CHAMAK&nbsp;STREET&nbsp;·&nbsp;NEW&nbsp;DROP&nbsp;·&nbsp;CHAMAK&nbsp;STREET&nbsp;·&nbsp;NEW&nbsp;DROP
          </motion.div>
          <motion.div
            className="whitespace-nowrap font-black uppercase leading-none"
            style={{ fontSize: "clamp(4rem, 13vw, 11rem)", color: "rgba(255,102,0,0.055)", letterSpacing: "-0.02em", x: textX2 }}
          >
            DUBAI&nbsp;DRIP&nbsp;·&nbsp;STAY&nbsp;CHAMAK&nbsp;·&nbsp;DUBAI&nbsp;DRIP&nbsp;·&nbsp;STAY&nbsp;CHAMAK
          </motion.div>
        </div>

        {/* ── Background cards (floating at different rates) ── */}
        {bgCards.length > 0 && bgCards.map((p, i) => {
          const m   = getPrimaryProductMedia(p.imageUrl ?? null);
          const pos = positions[i] ?? positions[0];
          return (
            <motion.div
              key={p.id}
              className="absolute w-20 md:w-28 overflow-hidden rounded-xl border border-white/5 pointer-events-none"
              style={{
                top: pos.top, left: pos.left, right: pos.right,
                rotate: pos.deg,
                y: pos.yAnim,
                background: "rgba(255,255,255,0.03)",
              }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: i * 0.1 }}
            >
              {m && <img src={m.url} alt={p.name} className="w-full aspect-square object-cover opacity-20" loading="lazy" />}
              <div className="px-2 py-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/15 truncate">{p.name}</p>
                <p className="text-[8px] font-black text-primary/25">AED {Number(p.price).toFixed(0)}</p>
              </div>
            </motion.div>
          );
        })}

        {/* ── CENTER: Product hero ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ perspective: "1200px" }}>
          {hero && heroMedia ? (
            <motion.div
              style={{ y: prodY, scale: prodScale, opacity: prodOpacity }}
              className="relative flex flex-col items-center"
            >
              {/* Product image — gentle weighted rock (no distracting full spin) */}
              <motion.div
                animate={{
                  rotateY: [-8, 8, -8],
                  rotateX: [2, -2, 2],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "mirror",
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Subtle Y float */}
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <img
                    src={heroMedia.url}
                    alt={hero.name}
                    className="h-[52vh] w-auto object-contain select-none"
                    draggable={false}
                    style={{
                      filter: "drop-shadow(0 0 80px rgba(255,102,0,0.7)) drop-shadow(0 50px 70px rgba(0,0,0,0.95))",
                    }}
                  />
                </motion.div>
              </motion.div>

              {/* Ground shadow — breathes in sync with float */}
              <motion.div
                animate={{ scaleX: [1, 1.22, 1], opacity: [0.45, 0.75, 0.45] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                style={{
                  scale: shadowScale,
                  bottom: "-28px",
                  width: "55%",
                  height: 24,
                  background: "radial-gradient(ellipse, rgba(255,102,0,0.7) 0%, transparent 75%)",
                  filter: "blur(16px)",
                }}
              />

              {/* Label & CTA */}
              <motion.div
                style={{ opacity: labelOp }}
                className="absolute bottom-[-120px] left-1/2 -translate-x-1/2 text-center pointer-events-auto whitespace-nowrap"
              >
                <motion.p
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[10px] font-black uppercase tracking-[0.38em] text-primary mb-1.5"
                >
                  {hero.spotlight ? "★ Spotlight Drop" : "★ Featured Drop"}
                </motion.p>
                <p className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2.5">{hero.name}</p>
                <p
                  className="text-xl font-black mb-4"
                  style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  AED {Number(hero.price).toFixed(2)}
                </p>
                <Link href={`/product/${hero.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(255,102,0,0.65)" }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className="px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)", boxShadow: "0 6px 28px rgba(255,102,0,0.5)" }}
                  >
                    Shop Now →
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4 opacity-15">
              <div className="h-[40vh] w-64 rounded-2xl bg-primary/8 animate-pulse" />
              <div className="h-4 w-40 rounded bg-primary/8 animate-pulse" />
            </div>
          )}
        </div>

        {/* ── Edge vignette ── */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 36%, rgba(4,2,0,0.92) 100%)" }} />

        {/* ── Top & bottom fades ── */}
        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to bottom, #060200, transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none" style={{ background: "linear-gradient(to top, var(--background), transparent)" }} />
      </div>
    </div>
  );
}
