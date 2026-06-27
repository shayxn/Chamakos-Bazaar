import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { Star, ShoppingBag, Clock, ChevronRight } from "lucide-react";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { getPrimaryProductMedia } from "@/lib/product-media";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(targetDate: string | null | undefined) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, valid: false });
  useEffect(() => {
    if (!targetDate) return;
    const ts = new Date(targetDate).getTime();
    if (isNaN(ts)) return;
    const tick = () => {
      const diff = ts - Date.now();
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0, valid: false }); return; }
      setT({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        valid: true,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return t;
}

type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  isPreOrder?: boolean;
  preOrderDate?: string | null;
  preOrderLabel?: string | null;
  categoryName?: string | null;
  spotlight?: boolean;
};

export function SpotlightBanner() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  const { data: products } = useListProducts(
    { featured: true },
    { query: { queryKey: [...getListProductsQueryKey({ featured: true }), "spotlight-check"], staleTime: 60_000 } }
  );

  const spotlight = products?.find((p) => p.spotlight === true);

  const countdown = useCountdown(
    spotlight?.isPreOrder && spotlight?.preOrderDate ? spotlight.preOrderDate : null
  );

  if (!spotlight) return null;

  const media = getPrimaryProductMedia(spotlight.imageUrl);
  const imageUrl = media?.url || "";
  const hasCountdown = !!spotlight.isPreOrder && !!spotlight.preOrderDate && countdown.valid;

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full overflow-hidden"
      style={{ minHeight: "68vh", background: "#040404" }}
    >
      {/* Background image with parallax */}
      <motion.div className="absolute inset-0 z-0" style={{ y: imgY }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={spotlight.name}
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.28 }}
          />
        )}
        {/* Gradients */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(4,4,4,0.97) 0%, rgba(4,4,4,0.75) 45%, rgba(4,4,4,0.2) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,4,4,0.9) 0%, transparent 50%)" }} />
      </motion.div>

      {/* Ambient glow */}
      <motion.div
        className="absolute z-0 pointer-events-none"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          top: "20%", left: "-5%", width: "55%", height: "60%",
          background: "radial-gradient(ellipse, rgba(255,102,0,0.12) 0%, transparent 65%)",
        }}
      />

      {/* Floating orbs */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none z-0"
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3 + i * 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
          style={{
            width: 6 + i * 4,
            height: 6 + i * 4,
            left: `${12 + i * 8}%`,
            top: `${30 + i * 12}%`,
            background: "#ff6600",
            filter: "blur(2px)",
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex items-center min-h-[68vh] px-6 sm:px-12 lg:px-20">
        <div className="max-w-lg">
          {/* "Featured Product" badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: "rgba(255,102,0,0.15)",
              border: "1px solid rgba(255,102,0,0.4)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-[#ff6600] shrink-0"
            />
            <Star className="h-3.5 w-3.5 fill-[#ff6600] text-[#ff6600]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#ff9944]">
              Featured Product
            </span>
          </motion.div>

          {/* Category */}
          {spotlight.categoryName && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
              className="text-[11px] font-black uppercase tracking-[0.25em] text-white/35 mb-2"
            >
              {spotlight.categoryName}
            </motion.p>
          )}

          {/* Product name */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease: EASE }}
            className="font-black uppercase tracking-tight text-white leading-none mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            {spotlight.name}
          </motion.h2>

          {/* Price */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
            className="text-2xl font-black mb-6"
            style={{
              background: "linear-gradient(135deg, #ff6600, #ffcc00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AED {Number(spotlight.price).toFixed(2)}
          </motion.p>

          {/* Countdown */}
          {hasCountdown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-[#ff6600]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/45">
                  {spotlight.preOrderLabel || "Available In"}
                </span>
              </div>
              <div className="flex gap-3">
                {[
                  { label: "Days", value: countdown.days },
                  { label: "Hrs", value: countdown.hours },
                  { label: "Min", value: countdown.minutes },
                  { label: "Sec", value: countdown.seconds },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl text-white"
                      style={{
                        background: "rgba(255,102,0,0.12)",
                        border: "1px solid rgba(255,102,0,0.25)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {pad(value)}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: EASE }}
            className="flex items-center gap-3"
          >
            <Link href={`/product/${spotlight.id}`}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 8px 40px rgba(255,102,0,0.5)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm text-white transition-shadow"
                style={{ background: "linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)" }}
              >
                <ShoppingBag className="h-4 w-4" />
                Shop Now
              </motion.button>
            </Link>
            <Link href="/shop">
              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 text-white/45 hover:text-white/70 font-black uppercase tracking-widest text-xs transition-colors"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Right: large floating product image */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          className="absolute right-0 top-0 bottom-0 w-[48%] hidden md:flex items-center justify-center"
        >
          {imageUrl && (
            <div className="relative w-full h-full">
              <img
                src={imageUrl}
                alt={spotlight.name}
                className="absolute right-0 top-1/2 -translate-y-1/2 h-[90%] w-auto object-contain"
                style={{ filter: "drop-shadow(0 20px 60px rgba(255,102,0,0.3))" }}
              />
              {/* Edge glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 50% 70% at 70% 50%, rgba(255,102,0,0.08), transparent)" }}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, var(--background), transparent)" }} />
    </motion.section>
  );
}
