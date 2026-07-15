import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Brand = {
  name: string;
  domain: string;
  bg: string;
  svgLogo: React.ReactNode;
};

const BRANDS: Brand[] = [
  {
    name: "Chrome Hearts",
    domain: "chromehearts.com",
    bg: "#0a0a0a",
    svgLogo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-2/3 h-2/3">
        <rect x="44" y="8" width="12" height="84" fill="white" />
        <rect x="8" y="44" width="84" height="12" fill="white" />
        <rect x="32" y="32" width="8" height="8" fill="#0a0a0a" />
        <rect x="60" y="32" width="8" height="8" fill="#0a0a0a" />
        <rect x="32" y="60" width="8" height="8" fill="#0a0a0a" />
        <rect x="60" y="60" width="8" height="8" fill="#0a0a0a" />
      </svg>
    ),
  },
  {
    name: "Corteiz",
    domain: "crtz.xyz",
    bg: "#111111",
    svgLogo: (
      <svg viewBox="0 0 120 60" fill="none" className="w-4/5 h-4/5">
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="34" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2">CRTZ</text>
      </svg>
    ),
  },
  {
    name: "Trapstar",
    domain: "trapstarldn.com",
    bg: "#1a1a1a",
    svgLogo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-2/3 h-2/3">
        <polygon points="50,8 92,82 8,82" fill="none" stroke="white" strokeWidth="5" strokeLinejoin="round" />
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="13" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2">TRAP</text>
      </svg>
    ),
  },
  {
    name: "Fear of God",
    domain: "fearofgod.com",
    bg: "#1c1c1c",
    svgLogo: (
      <svg viewBox="0 0 120 80" fill="none" className="w-4/5 h-4/5">
        <text x="50%" y="35%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="11" fontWeight="400" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="5">FEAR OF</text>
        <line x1="10" y1="44" x2="110" y2="44" stroke="white" strokeWidth="0.7" opacity="0.3" />
        <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="11" fontWeight="400" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="5">GOD</text>
      </svg>
    ),
  },
  {
    name: "Off-White",
    domain: "off---white.com",
    bg: "#000000",
    svgLogo: (
      <svg viewBox="0 0 120 80" fill="none" className="w-4/5 h-4/5">
        <line x1="28" y1="72" x2="85" y2="8" stroke="white" strokeWidth="7" strokeLinecap="round" />
        <text x="50%" y="80%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9" fontWeight="900" fontFamily="Arial, sans-serif"
          letterSpacing="1.5">OFF-WHITE™</text>
      </svg>
    ),
  },
  {
    name: "Supreme",
    domain: "supremenewyork.com",
    bg: "#FF0000",
    svgLogo: (
      <svg viewBox="0 0 120 60" fill="none" className="w-4/5 h-4/5">
        <rect width="120" height="60" rx="4" fill="#FF0000" />
        <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="22" fontWeight="900" fontFamily="Futura, 'Arial Black', Arial"
          letterSpacing="0.5">Supreme</text>
      </svg>
    ),
  },
  {
    name: "Balenciaga",
    domain: "balenciaga.com",
    bg: "#0a0a0a",
    svgLogo: (
      <svg viewBox="0 0 140 60" fill="none" className="w-4/5 h-4/5">
        <text x="50%" y="38%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="11" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="3.5">BALENCIAGA</text>
        <line x1="14" y1="48" x2="126" y2="48" stroke="white" strokeWidth="0.6" opacity="0.4" />
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="5.5" opacity="0.55">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Stone Island",
    domain: "stoneisland.com",
    bg: "#1a1a1a",
    svgLogo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-3/5 h-3/5">
        <circle cx="50" cy="50" r="38" stroke="white" strokeWidth="3.5" fill="none" />
        <circle cx="50" cy="50" r="22" stroke="white" strokeWidth="2" fill="none" />
        <line x1="50" y1="12" x2="50" y2="28" stroke="white" strokeWidth="3.5" />
        <line x1="50" y1="72" x2="50" y2="88" stroke="white" strokeWidth="3.5" />
        <line x1="12" y1="50" x2="28" y2="50" stroke="white" strokeWidth="3.5" />
        <line x1="72" y1="50" x2="88" y2="50" stroke="white" strokeWidth="3.5" />
        <circle cx="50" cy="50" r="5" fill="white" />
      </svg>
    ),
  },
  {
    name: "Moncler",
    domain: "moncler.com",
    bg: "#1a3a6b",
    svgLogo: (
      <svg viewBox="0 0 140 70" fill="none" className="w-4/5 h-4/5">
        <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="13" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="3">MONCLER</text>
        <line x1="22" y1="52" x2="118" y2="52" stroke="white" strokeWidth="0.8" opacity="0.5" />
        <text x="50%" y="72%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="400" fontFamily="Arial"
          letterSpacing="5" opacity="0.65">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Dior",
    domain: "dior.com",
    bg: "#111111",
    svgLogo: (
      <svg viewBox="0 0 140 80" fill="none" className="w-4/5 h-4/5">
        <text x="50%" y="32%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="6">CHRISTIAN</text>
        <text x="50%" y="67%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="26" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="6">DIOR</text>
      </svg>
    ),
  },
  {
    name: "Louis Vuitton",
    domain: "louisvuitton.com",
    bg: "#8B6914",
    svgLogo: (
      <svg viewBox="0 0 120 90" fill="none" className="w-4/5 h-4/5">
        <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="36" fontWeight="400" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="1">LV</text>
        <line x1="18" y1="62" x2="102" y2="62" stroke="white" strokeWidth="0.7" opacity="0.6" />
        <text x="50%" y="80%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="3.5" opacity="0.85">LOUIS VUITTON</text>
      </svg>
    ),
  },
  {
    name: "Gucci",
    domain: "gucci.com",
    bg: "#1a2a14",
    svgLogo: (
      <svg viewBox="0 0 100 90" fill="none" className="w-3/4 h-3/4">
        <text x="50%" y="18%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8.5" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="4.5">GUCCI</text>
        <circle cx="36" cy="58" r="20" stroke="white" strokeWidth="4" fill="none" />
        <circle cx="64" cy="58" r="20" stroke="white" strokeWidth="4" fill="none" />
      </svg>
    ),
  },
];

type Category = { name: string; icon: string; desc: string; };
const CATEGORIES: Category[] = [
  { name: "Shoes",       icon: "👟", desc: "Sneakers & kicks" },
  { name: "Wallets",     icon: "👛", desc: "Leather & designer" },
  { name: "Jackets",     icon: "🧥", desc: "Outerwear & bombers" },
  { name: "Hoodies",     icon: "🦺", desc: "Fleece & zip-ups" },
  { name: "T-Shirts",    icon: "👕", desc: "Graphic & oversized" },
  { name: "Caps",        icon: "🧢", desc: "Snapbacks & fitted" },
  { name: "Accessories", icon: "⌚", desc: "Belts, bags & more" },
  { name: "Pants",       icon: "👖", desc: "Cargo & relaxed fits" },
];

function BrandLogo({ brand }: { brand: Brand }) {
  const [useReal, setUseReal] = useState(true);

  if (!useReal) {
    return <>{brand.svgLogo}</>;
  }

  return (
    <img
      src={`https://logo.clearbit.com/${brand.domain}?size=160`}
      alt={brand.name}
      className="w-3/5 h-3/5 object-contain"
      style={{ filter: "brightness(0) invert(1)" }}
      onError={() => setUseReal(false)}
      loading="lazy"
    />
  );
}

export function BrandsSection() {
  return (
    <section className="py-20 border-t border-border/30">
      <div className="container mx-auto px-4">

        {/* ── Brands ── */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70 mb-2">Premium Selection</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Shop by Brand</h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {BRANDS.map((brand, i) => (
              <Link href={`/shop?search=${encodeURIComponent(brand.name)}`} key={brand.name}>
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: i * 0.04, ease: EASE }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex flex-col items-center gap-3 cursor-pointer"
                >
                  <div
                    className="w-full aspect-square rounded-2xl flex items-center justify-center overflow-hidden border border-white/8 group-hover:border-primary/50 transition-all duration-300 shadow-lg group-hover:shadow-[0_8px_28px_rgba(255,102,0,0.2)]"
                    style={{ backgroundColor: brand.bg }}
                  >
                    <BrandLogo brand={brand} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/45 group-hover:text-white/80 transition-colors text-center leading-tight">
                    {brand.name}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Categories ── */}
        <div>
          <div className="text-center mb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70 mb-2">Browse by Type</p>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Shop by Category</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link href={`/shop?search=${encodeURIComponent(cat.name)}`} key={cat.name}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }}
                  whileHover={{ y: -3 }}
                  className="group relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border/40 bg-card/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="text-4xl">{cat.icon}</div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest group-hover:text-primary transition-colors">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                  <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
