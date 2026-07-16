import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const API = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Brand = {
  name: string;
  domain: string;
  bg: string;
  svgLogo: React.ReactNode;
};

const BRANDS: Brand[] = [
  {
    name: "Supreme",
    domain: "supremenewyork.com",
    bg: "#FF0000",
    svgLogo: (
      <svg viewBox="0 0 200 80" className="w-4/5 h-4/5">
        <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="38" fontWeight="900" fontStyle="italic"
          fontFamily="'Futura', 'Arial Black', Arial">Supreme</text>
      </svg>
    ),
  },
  {
    name: "Off-White",
    domain: "off---white.com",
    bg: "#000000",
    svgLogo: (
      <svg viewBox="0 0 200 100" className="w-4/5 h-4/5">
        <text x="50%" y="38%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="15" fontWeight="900" fontFamily="Arial, sans-serif"
          letterSpacing="4">OFF-WHITE™</text>
        <line x1="40" y1="56" x2="160" y2="56" stroke="white" strokeWidth="1" opacity="0.4" />
        <text x="50%" y="74%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8" fontWeight="400" fontFamily="Arial, sans-serif"
          letterSpacing="3" opacity="0.5">c/o VIRGIL ABLOH™</text>
      </svg>
    ),
  },
  {
    name: "Chrome Hearts",
    domain: "chromehearts.com",
    bg: "#0d0d0d",
    svgLogo: (
      <svg viewBox="0 0 100 100" className="w-3/5 h-3/5">
        <path d="M44 4 L56 4 L56 44 L96 44 L96 56 L56 56 L56 96 L44 96 L44 56 L4 56 L4 44 L44 44 Z"
          fill="white" />
      </svg>
    ),
  },
  {
    name: "Corteiz",
    domain: "crtz.xyz",
    bg: "#111111",
    svgLogo: (
      <svg viewBox="0 0 200 120" className="w-4/5 h-4/5">
        <circle cx="100" cy="52" r="32" fill="none" stroke="white" strokeWidth="3.5" />
        <circle cx="100" cy="52" r="21" fill="none" stroke="white" strokeWidth="1.5" opacity="0.45" />
        <line x1="100" y1="20" x2="100" y2="84" stroke="white" strokeWidth="3.5" />
        <line x1="68" y1="52" x2="132" y2="52" stroke="white" strokeWidth="3.5" />
        <text x="50%" y="91%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="13" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="5">CORTEIZ</text>
      </svg>
    ),
  },
  {
    name: "Trapstar",
    domain: "trapstarldn.com",
    bg: "#0a0a0a",
    svgLogo: (
      <svg viewBox="0 0 200 100" className="w-4/5 h-4/5">
        <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="24" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2">TRAPSTAR</text>
        <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="400" fontFamily="Arial"
          letterSpacing="5" opacity="0.4">IT'S A SECRET</text>
      </svg>
    ),
  },
  {
    name: "Fear of God",
    domain: "fearofgod.com",
    bg: "#1a1a1a",
    svgLogo: (
      <svg viewBox="0 0 200 100" className="w-4/5 h-4/5">
        <text x="50%" y="34%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="6">FEAR OF</text>
        <line x1="24" y1="50" x2="176" y2="50" stroke="white" strokeWidth="0.6" opacity="0.25" />
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="6">GOD</text>
      </svg>
    ),
  },
  {
    name: "Balenciaga",
    domain: "balenciaga.com",
    bg: "#0a0a0a",
    svgLogo: (
      <svg viewBox="0 0 260 60" className="w-full h-3/5">
        <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="13" fontWeight="300" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          letterSpacing="5">BALENCIAGA</text>
        <line x1="18" y1="52" x2="242" y2="52" stroke="white" strokeWidth="0.5" opacity="0.3" />
      </svg>
    ),
  },
  {
    name: "Stone Island",
    domain: "stoneisland.com",
    bg: "#1c1c1c",
    svgLogo: (
      <svg viewBox="0 0 100 100" className="w-3/5 h-3/5">
        <circle cx="50" cy="50" r="42" stroke="white" strokeWidth="3" fill="none" />
        <line x1="50" y1="8" x2="50" y2="20" stroke="white" strokeWidth="3" />
        <line x1="50" y1="80" x2="50" y2="92" stroke="white" strokeWidth="3" />
        <line x1="8" y1="50" x2="20" y2="50" stroke="white" strokeWidth="3" />
        <line x1="80" y1="50" x2="92" y2="50" stroke="white" strokeWidth="3" />
        <line x1="21" y1="21" x2="29" y2="29" stroke="white" strokeWidth="2" />
        <line x1="71" y1="71" x2="79" y2="79" stroke="white" strokeWidth="2" />
        <line x1="79" y1="21" x2="71" y2="29" stroke="white" strokeWidth="2" />
        <line x1="29" y1="71" x2="21" y2="79" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="50" r="18" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="50" cy="50" r="4" fill="white" />
        <line x1="50" y1="32" x2="50" y2="38" stroke="white" strokeWidth="1.5" />
        <line x1="50" y1="62" x2="50" y2="68" stroke="white" strokeWidth="1.5" />
        <line x1="32" y1="50" x2="38" y2="50" stroke="white" strokeWidth="1.5" />
        <line x1="62" y1="50" x2="68" y2="50" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: "Moncler",
    domain: "moncler.com",
    bg: "#002366",
    svgLogo: (
      <svg viewBox="0 0 200 90" className="w-4/5 h-4/5">
        <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="20" fontWeight="900" fontFamily="Arial Black, 'Helvetica Neue', Arial"
          letterSpacing="5">MONCLER</text>
        <line x1="26" y1="57" x2="174" y2="57" stroke="white" strokeWidth="0.7" opacity="0.4" />
        <text x="50%" y="75%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="300" fontFamily="Arial"
          letterSpacing="6" opacity="0.6">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Dior",
    domain: "dior.com",
    bg: "#111111",
    svgLogo: (
      <svg viewBox="0 0 200 90" className="w-4/5 h-4/5">
        <text x="50%" y="30%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="7">CHRISTIAN</text>
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="32" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="8">DIOR</text>
      </svg>
    ),
  },
  {
    name: "Louis Vuitton",
    domain: "louisvuitton.com",
    bg: "#7a5c2e",
    svgLogo: (
      <svg viewBox="0 0 200 110" className="w-4/5 h-4/5">
        <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="46" fontWeight="400" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="2">LV</text>
        <line x1="24" y1="72" x2="176" y2="72" stroke="white" strokeWidth="0.6" opacity="0.5" />
        <text x="50%" y="86%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="4.5" opacity="0.8">LOUIS VUITTON</text>
      </svg>
    ),
  },
  {
    name: "Gucci",
    domain: "gucci.com",
    bg: "#0f1f0f",
    svgLogo: (
      <svg viewBox="0 0 140 100" className="w-3/4 h-3/4">
        <text x="50%" y="18%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="5.5">GUCCI</text>
        <path d="M45 70 a22 22 0 1 1 22 0" stroke="white" strokeWidth="4.5" fill="none" />
        <path d="M73 70 a22 22 0 1 0 22 0" stroke="white" strokeWidth="4.5" fill="none" />
        <line x1="56" y1="70" x2="84" y2="70" stroke="white" strokeWidth="4.5" />
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
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <>{brand.svgLogo}</>;
  }

  return (
    <img
      src={`${API}/api/brand-logo/${brand.domain}`}
      alt={brand.name}
      className="w-3/5 h-3/5 object-contain drop-shadow-lg"
      style={{ filter: "brightness(0) invert(1)" }}
      onError={() => setFailed(true)}
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
