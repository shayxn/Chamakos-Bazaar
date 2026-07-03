import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "wouter";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { getPrimaryProductMedia } from "@/lib/product-media";

const SPRING = { stiffness: 60, damping: 22 };

export function ScrollFloatObject() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  /* ── fetch featured products ── */
  const { data: products } = useListProducts(
    { featured: true },
    { query: { queryKey: [...getListProductsQueryKey({ featured: true }), "float-bg"], staleTime: 60_000 } }
  );

  const spotlight = products?.find((p) => p.spotlight) ?? products?.[0];
  const bgProducts = products?.filter((p) => p.id !== spotlight?.id).slice(0, 6) ?? [];

  const spotlightMedia = getPrimaryProductMedia(spotlight?.imageUrl ?? null);

  /* ── scroll-driven values ── */
  const rawY     = useTransform(scrollYProgress, [0.05, 0.35, 0.75, 1], [140, 0,  -30, -120]);
  const rawScale = useTransform(scrollYProgress, [0.05, 0.3,  0.7,  1], [0.6, 1,   1,   0.8]);
  const rawOp    = useTransform(scrollYProgress, [0.05, 0.2,  0.75, 1], [0,   1,   1,   0]);
  const rawRY    = useTransform(scrollYProgress, [0.05, 0.85],           [0, 540]);

  const prodY    = useSpring(rawY,     SPRING);
  const prodScale = useSpring(rawScale, SPRING);
  const prodRY   = useSpring(rawRY,    SPRING);

  /* bg card parallax */
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);

  /* background text scroll */
  const textX1 = useTransform(scrollYProgress, [0, 1], ["0%",  "-25%"]);
  const textX2 = useTransform(scrollYProgress, [0, 1], ["0%",  "25%"]);

  /* label fade */
  const labelOp = useTransform(scrollYProgress, [0.25, 0.38, 0.72, 0.85], [0, 1, 1, 0]);

  if (!spotlight) return null;

  /* background card positions (scattered around center) */
  const positions: Array<{ top: string; left?: string; right?: string; deg: number }> = [
    { top: "8%",  left: "4%",  deg: -8  },
    { top: "6%",  right: "5%", deg:  6  },
    { top: "38%", left: "2%",  deg: -5  },
    { top: "40%", right: "3%", deg:  9  },
    { top: "70%", left: "6%",  deg:  4  },
    { top: "68%", right: "6%", deg: -7  },
  ];

  return (
    <div
      ref={sectionRef}
      className="relative w-full pointer-events-none"
      style={{ height: "280vh" }}
      aria-hidden="true"
    >
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ── Dark gradient base ── */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, #0a0400 0%, #110800 40%, #0a0400 100%)",
          }}
        />

        {/* ── Radial orange center glow ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(ellipse 55% 55% at 50% 52%, rgba(255,102,0,0.22) 0%, transparent 70%)",
          }}
        />

        {/* ── Scrolling background text row 1 ── */}
        <div className="absolute inset-0 flex flex-col justify-center overflow-hidden pointer-events-none select-none">
          <motion.div
            className="whitespace-nowrap font-black uppercase leading-none mb-2"
            style={{
              fontSize: "clamp(5rem, 14vw, 13rem)",
              color: "rgba(255,102,0,0.06)",
              letterSpacing: "-0.02em",
              x: textX1,
            }}
          >
            CHAMAK&nbsp;STREET&nbsp;·&nbsp;NEW&nbsp;DROP&nbsp;·&nbsp;CHAMAK&nbsp;STREET&nbsp;·&nbsp;NEW&nbsp;DROP
          </motion.div>
          <motion.div
            className="whitespace-nowrap font-black uppercase leading-none"
            style={{
              fontSize: "clamp(5rem, 14vw, 13rem)",
              color: "rgba(255,102,0,0.06)",
              letterSpacing: "-0.02em",
              x: textX2,
            }}
          >
            DUBAI&nbsp;DRIP&nbsp;·&nbsp;STAY&nbsp;CHAMAK&nbsp;·&nbsp;DUBAI&nbsp;DRIP&nbsp;·&nbsp;STAY&nbsp;CHAMAK
          </motion.div>
        </div>

        {/* ── Background featured product cards ── */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }}>
          {bgProducts.map((product, i) => {
            const media = getPrimaryProductMedia(product.imageUrl ?? null);
            const pos = positions[i] ?? positions[0];
            return (
              <div
                key={product.id}
                className="absolute w-28 md:w-36 overflow-hidden rounded-xl border border-white/5"
                style={{
                  top: pos.top,
                  left: pos.left,
                  right: pos.right,
                  transform: `rotate(${pos.deg}deg)`,
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(2px)",
                }}
              >
                {media ? (
                  <img
                    src={media.url}
                    alt={product.name}
                    className="w-full aspect-square object-cover opacity-30"
                  />
                ) : (
                  <div className="w-full aspect-square bg-white/5" />
                )}
                <div className="px-2 py-1.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 truncate">{product.name}</p>
                  <p className="text-[10px] font-black text-primary/30">AED {Number(product.price).toFixed(0)}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Spotlight product: spinning 3D center ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ perspective: "1100px" }}
        >
          <motion.div
            style={{ y: prodY, scale: prodScale, opacity: rawOp }}
            className="relative flex flex-col items-center"
          >
            {/* Product spin wrapper */}
            <motion.div
              style={{
                rotateY: prodRY,
                transformStyle: "preserve-3d",
              }}
            >
              {spotlightMedia?.type === "video" ? (
                <video
                  src={spotlightMedia.url}
                  className="h-[58vh] w-auto object-contain"
                  style={{
                    filter: "drop-shadow(0 0 60px rgba(255,102,0,0.7)) drop-shadow(0 40px 60px rgba(0,0,0,0.85))",
                  }}
                  muted
                  playsInline
                  autoPlay
                  loop
                />
              ) : spotlightMedia ? (
                <img
                  src={spotlightMedia.url}
                  alt={spotlight.name}
                  className="h-[58vh] w-auto object-contain select-none"
                  draggable={false}
                  style={{
                    filter: "drop-shadow(0 0 60px rgba(255,102,0,0.7)) drop-shadow(0 40px 60px rgba(0,0,0,0.85))",
                  }}
                />
              ) : (
                <div className="h-[58vh] w-64 bg-primary/10 rounded-2xl" />
              )}
            </motion.div>

            {/* Ground glow shadow */}
            <motion.div
              animate={{ scaleX: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
              style={{
                width: "48%",
                height: 22,
                background: "radial-gradient(ellipse, rgba(255,102,0,0.65) 0%, transparent 75%)",
                filter: "blur(12px)",
              }}
            />
          </motion.div>

          {/* Product label that fades in at peak */}
          <motion.div
            style={{ opacity: labelOp }}
            className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-center pointer-events-auto"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-1">
              {spotlight.spotlight ? "★ Spotlight" : "Featured Drop"}
            </p>
            <p className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3">
              {spotlight.name}
            </p>
            <p className="text-lg font-black mb-4"
              style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              AED {Number(spotlight.price).toFixed(2)}
            </p>
            <Link href={`/product/${spotlight.id}`}>
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 8px 36px rgba(255,102,0,0.55)" }}
                whileTap={{ scale: 0.96 }}
                className="px-7 py-3 rounded-full font-black uppercase tracking-widest text-sm text-white"
                style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)" }}
              >
                Shop Now
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Edge vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(4,4,4,0.85) 100%)",
          }}
        />
      </div>
    </div>
  );
}
