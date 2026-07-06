import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

type Brand = {
  name: string;
  logo: React.ReactNode;
  bg: string;
};

const BRANDS: Brand[] = [
  {
    name: "Chrome Hearts",
    bg: "#0a0a0a",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full p-3">
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
    bg: "#111111",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="24" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="1">CRTZ</text>
      </svg>
    ),
  },
  {
    name: "Trapstar",
    bg: "#1a1a1a",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full p-2">
        <polygon points="50,10 90,80 10,80" fill="none" stroke="white" strokeWidth="5" />
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="12" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2">TRAP</text>
      </svg>
    ),
  },
  {
    name: "Fear of God",
    bg: "#1c1c1c",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="10" fontWeight="700" fontFamily="Georgia, serif"
          letterSpacing="4">FEAR OF</text>
        <text x="50%" y="60%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="10" fontWeight="700" fontFamily="Georgia, serif"
          letterSpacing="4">GOD</text>
      </svg>
    ),
  },
  {
    name: "Off-White",
    bg: "#000000",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <line x1="20" y1="75" x2="80" y2="20" stroke="white" strokeWidth="7" />
        <text x="50%" y="74%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="10" fontWeight="900" fontFamily="Arial, sans-serif"
          letterSpacing="1">OFF-WHITE</text>
      </svg>
    ),
  },
  {
    name: "Supreme",
    bg: "#FF0000",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <rect x="8" y="32" width="84" height="36" rx="3" fill="#FF0000" />
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="16" fontWeight="900" fontFamily="Futura, Arial Black, Arial"
          letterSpacing="0.5">Supreme</text>
      </svg>
    ),
  },
  {
    name: "Balenciaga",
    bg: "#0a0a0a",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9.5" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="2.5">BALENCIAGA</text>
        <line x1="20" y1="54" x2="80" y2="54" stroke="white" strokeWidth="0.8" opacity="0.5" />
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="4" opacity="0.6">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Stone Island",
    bg: "#1a1a1a",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full p-2">
        <circle cx="50" cy="50" r="36" stroke="white" strokeWidth="4" fill="none" />
        <circle cx="50" cy="50" r="22" stroke="white" strokeWidth="2" fill="none" />
        <line x1="50" y1="14" x2="50" y2="28" stroke="white" strokeWidth="4" />
        <line x1="50" y1="72" x2="50" y2="86" stroke="white" strokeWidth="4" />
        <line x1="14" y1="50" x2="28" y2="50" stroke="white" strokeWidth="4" />
        <line x1="72" y1="50" x2="86" y2="50" stroke="white" strokeWidth="4" />
        <circle cx="50" cy="50" r="5" fill="white" />
      </svg>
    ),
  },
  {
    name: "Moncler",
    bg: "#1a3a6b",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="10" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2.5">MONCLER</text>
        <line x1="22" y1="54" x2="78" y2="54" stroke="white" strokeWidth="1" opacity="0.6" />
        <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7" fontWeight="400" fontFamily="Arial"
          letterSpacing="4" opacity="0.7">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Dior",
    bg: "#111111",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <text x="50%" y="38%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8.5" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="5">CHRISTIAN</text>
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="22" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="5">DIOR</text>
      </svg>
    ),
  },
  {
    name: "Louis Vuitton",
    bg: "#8B6914",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="28" fontWeight="400" fontFamily="Georgia, serif"
          letterSpacing="1">LV</text>
        <line x1="22" y1="58" x2="78" y2="58" stroke="white" strokeWidth="0.8" opacity="0.7" />
        <text x="50%" y="74%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="3" opacity="0.85">LOUIS VUITTON</text>
      </svg>
    ),
  },
  {
    name: "Gucci",
    bg: "#1a2a14",
    logo: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full p-2">
        <circle cx="38" cy="55" r="18" stroke="white" strokeWidth="4" fill="none" />
        <circle cx="62" cy="55" r="18" stroke="white" strokeWidth="4" fill="none" />
        <text x="50%" y="26%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="4">GUCCI</text>
      </svg>
    ),
  },
];

type Category = {
  name: string;
  icon: string;
  desc: string;
};

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

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-5">
            {BRANDS.map((brand) => (
              <Link href={`/shop?q=${encodeURIComponent(brand.name)}`} key={brand.name}>
                <div className="group flex flex-col items-center gap-3 cursor-pointer">
                  <div
                    className="w-full aspect-square rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-primary/40 group-hover:scale-105 transition-all duration-300 shadow-lg"
                    style={{ backgroundColor: brand.bg }}
                  >
                    {brand.logo}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                    {brand.name}
                  </span>
                </div>
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
            {CATEGORIES.map((cat) => (
              <Link href={`/shop?q=${encodeURIComponent(cat.name)}`} key={cat.name}>
                <div className="group relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border/40 bg-card/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer overflow-hidden">
                  <div className="text-4xl">{cat.icon}</div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest group-hover:text-primary transition-colors">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                  <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
