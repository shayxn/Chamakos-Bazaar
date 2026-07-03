import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "wouter";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { getPrimaryProductMedia } from "@/lib/product-media";

const SPRING = { stiffness: 70, damping: 22 };

export function ScrollFloatObject() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end start"],
  });

  const { data: products } = useListProducts(
    { featured: true },
    { query: { queryKey: [...getListProductsQueryKey({ featured: true }), "float-bg"], staleTime: 60_000 } }
  );

  const hero    = products?.find((p) => p.spotlight) ?? products?.[0];
  const bgCards = products?.filter((p) => p.id !== hero?.id).slice(0, 6) ?? [];

  const heroMedia = getPrimaryProductMedia(hero?.imageUrl ?? null);

  /* ── Scroll-driven values ── */
  const rawY     = useTransform(scrollYProgress, [0,    0.22, 0.72, 1  ], [80,  0,   -20, -90]);
  const rawScale = useTransform(scrollYProgress, [0,    0.2,  0.7,  1  ], [0.7, 1,    1,   0.82]);
  const rawOp    = useTransform(scrollYProgress, [0,    0.12, 0.72, 1  ], [0,   1,    1,    0]);

  const prodY     = useSpring(rawY,     SPRING);
  const prodScale = useSpring(rawScale, SPRING);

  /* background parallax */
  const bgY   = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const textX1 = useTransform(scrollYProgress, [0, 1], ["0%",  "-22%"]);
  const textX2 = useTransform(scrollYProgress, [0, 1], ["0%",   "22%"]);
  const labelOp = useTransform(scrollYProgress, [0.28, 0.42, 0.68, 0.82], [0, 1, 1, 0]);

  /* background card positions */
  const positions: Array<{ top: string; left?: string; right?: string; deg: number }> = [
    { top: "7%",  left: "3%",  deg: -9  },
    { top: "5%",  right: "4%", deg:  7  },
    { top: "39%", left: "1%",  deg: -5  },
    { top: "42%", right: "2%", deg:  10 },
    { top: "71%", left: "5%",  deg:  5  },
    { top: "69%", right: "5%", deg: -8  },
  ];

  return (
    <div
      ref={sectionRef}
      className="relative w-full"
      style={{ height: "260vh" }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* Dark warm base */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #080300 0%, #100700 50%, #080300 100%)" }} />

        {/* Center radial glow — always visible, pulses */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,102,0,0.25) 0%, transparent 68%)" }}
        />

        {/* Slow rotating ring glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{
            background: "conic-gradient(from 0deg, transparent 70%, rgba(255,102,0,0.12) 85%, transparent 100%)",
          }}
        />

        {/* Background text rows */}
        <div className="absolute inset-0 flex flex-col justify-center overflow-hidden pointer-events-none select-none">
          <motion.div
            className="whitespace-nowrap font-black uppercase leading-none mb-2"
            style={{ fontSize: "clamp(4.5rem, 13vw, 12rem)", color: "rgba(255,102,0,0.07)", letterSpacing: "-0.02em", x: textX1 }}
          >
            CHAMAK&nbsp;STREET&nbsp;·&nbsp;NEW&nbsp;DROP&nbsp;·&nbsp;CHAMAK&nbsp;STREET&nbsp;·&nbsp;NEW&nbsp;DROP
          </motion.div>
          <motion.div
            className="whitespace-nowrap font-black uppercase leading-none"
            style={{ fontSize: "clamp(4.5rem, 13vw, 12rem)", color: "rgba(255,102,0,0.07)", letterSpacing: "-0.02em", x: textX2 }}
          >
            DUBAI&nbsp;DRIP&nbsp;·&nbsp;STAY&nbsp;CHAMAK&nbsp;·&nbsp;DUBAI&nbsp;DRIP&nbsp;·&nbsp;STAY&nbsp;CHAMAK
          </motion.div>
        </div>

        {/* Background featured cards */}
        {bgCards.length > 0 && (
          <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }}>
            {bgCards.map((p, i) => {
              const m = getPrimaryProductMedia(p.imageUrl ?? null);
              const pos = positions[i] ?? positions[0];
              return (
                <div
                  key={p.id}
                  className="absolute w-24 md:w-32 overflow-hidden rounded-xl border border-white/6"
                  style={{
                    top: pos.top, left: pos.left, right: pos.right,
                    transform: `rotate(${pos.deg}deg)`,
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {m && <img src={m.url} alt={p.name} className="w-full aspect-square object-cover opacity-25" />}
                  <div className="px-2 py-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 truncate">{p.name}</p>
                    <p className="text-[9px] font-black text-primary/30">AED {Number(p.price).toFixed(0)}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── CENTER: spinning product ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ perspective: "1100px" }}>
          {hero && heroMedia ? (
            <motion.div
              style={{ y: prodY, scale: prodScale, opacity: rawOp }}
              className="relative flex flex-col items-center"
            >
              {/* Continuous Y-axis spin + scroll-driven tilt */}
              <motion.div
                animate={{ rotateY: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <img
                  src={heroMedia.url}
                  alt={hero.name}
                  className="h-[55vh] w-auto object-contain select-none"
                  draggable={false}
                  style={{
                    filter: "drop-shadow(0 0 70px rgba(255,102,0,0.75)) drop-shadow(0 40px 60px rgba(0,0,0,0.9))",
                  }}
                />
              </motion.div>

              {/* Ground glow */}
              <motion.div
                animate={{ scaleX: [1, 1.18, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                style={{
                  bottom: "-20px",
                  width: "50%",
                  height: 22,
                  background: "radial-gradient(ellipse, rgba(255,102,0,0.7) 0%, transparent 75%)",
                  filter: "blur(14px)",
                }}
              />

              {/* Label & CTA */}
              <motion.div style={{ opacity: labelOp }} className="absolute bottom-[-110px] left-1/2 -translate-x-1/2 text-center pointer-events-auto whitespace-nowrap">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-1">
                  {hero.spotlight ? "★ Spotlight" : "Featured Drop"}
                </p>
                <p className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-2">{hero.name}</p>
                <p className="text-lg font-black mb-3"
                  style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  AED {Number(hero.price).toFixed(2)}
                </p>
                <Link href={`/product/${hero.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.07, boxShadow: "0 8px 36px rgba(255,102,0,0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    className="px-7 py-3 rounded-full font-black uppercase tracking-widest text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)" }}
                  >
                    Shop Now
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            /* Loading skeleton */
            <div className="flex flex-col items-center gap-4 opacity-20">
              <div className="h-[40vh] w-64 rounded-2xl bg-primary/10 animate-pulse" />
              <div className="h-4 w-40 rounded bg-primary/10 animate-pulse" />
            </div>
          )}
        </div>

        {/* Edge vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(4,4,4,0.9) 100%)" }} />

        {/* Top & bottom fade */}
        <div className="absolute inset-x-0 top-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, #080300, transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, var(--background), transparent)" }} />
      </div>
    </div>
  );
}
