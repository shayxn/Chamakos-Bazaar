import { Link } from "wouter";

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
      <svg viewBox="0 0 80 80" fill="none" className="w-12 h-12">
        <rect x="36" y="8" width="8" height="64" fill="white" />
        <rect x="8" y="36" width="64" height="8" fill="white" />
        <rect x="26" y="26" width="6" height="6" fill="#0a0a0a" />
        <rect x="48" y="26" width="6" height="6" fill="#0a0a0a" />
        <rect x="26" y="48" width="6" height="6" fill="#0a0a0a" />
        <rect x="48" y="48" width="6" height="6" fill="#0a0a0a" />
      </svg>
    ),
  },
  {
    name: "Corteiz",
    bg: "#111111",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="17" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="1">CRTZ</text>
      </svg>
    ),
  },
  {
    name: "Trapstar",
    bg: "#1a1a1a",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <polygon points="40,8 72,64 8,64" fill="none" stroke="white" strokeWidth="4" />
        <text x="50%" y="66%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="9" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2">TRAP</text>
      </svg>
    ),
  },
  {
    name: "Fear of God",
    bg: "#1c1c1c",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8" fontWeight="700" fontFamily="Georgia, serif"
          letterSpacing="3">FEAR OF</text>
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="8" fontWeight="700" fontFamily="Georgia, serif"
          letterSpacing="3">GOD</text>
      </svg>
    ),
  },
  {
    name: "Off-White",
    bg: "#000000",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <line x1="16" y1="64" x2="64" y2="16" stroke="white" strokeWidth="5" />
        <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="900" fontFamily="Arial, sans-serif"
          letterSpacing="1.5">OFF-WHITE</text>
      </svg>
    ),
  },
  {
    name: "Supreme",
    bg: "#FF0000",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <rect x="6" y="28" width="68" height="24" rx="2" fill="#FF0000" />
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="12" fontWeight="900" fontFamily="Futura, Arial Black, Arial"
          letterSpacing="0.5">Supreme</text>
      </svg>
    ),
  },
  {
    name: "Balenciaga",
    bg: "#0a0a0a",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="2">BALENCIAGA</text>
        <line x1="16" y1="48" x2="64" y2="48" stroke="white" strokeWidth="0.8" opacity="0.5" />
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="6" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="3" opacity="0.6">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Stone Island",
    bg: "#1a1a1a",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-12 h-12">
        <circle cx="40" cy="40" r="28" stroke="white" strokeWidth="3" fill="none" />
        <circle cx="40" cy="40" r="18" stroke="white" strokeWidth="1.5" fill="none" />
        <line x1="40" y1="12" x2="40" y2="22" stroke="white" strokeWidth="3" />
        <line x1="40" y1="58" x2="40" y2="68" stroke="white" strokeWidth="3" />
        <line x1="12" y1="40" x2="22" y2="40" stroke="white" strokeWidth="3" />
        <line x1="58" y1="40" x2="68" y2="40" stroke="white" strokeWidth="3" />
        <circle cx="40" cy="40" r="4" fill="white" />
      </svg>
    ),
  },
  {
    name: "Moncler",
    bg: "#1a3a6b",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7.5" fontWeight="900" fontFamily="Arial Black, Arial"
          letterSpacing="2">MONCLER</text>
        <line x1="20" y1="48" x2="60" y2="48" stroke="white" strokeWidth="1" opacity="0.6" />
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="5.5" fontWeight="400" fontFamily="Arial"
          letterSpacing="3" opacity="0.7">PARIS</text>
      </svg>
    ),
  },
  {
    name: "Dior",
    bg: "#111111",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="5">CHRISTIAN</text>
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="16" fontWeight="300" fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="4">DIOR</text>
      </svg>
    ),
  },
  {
    name: "Louis Vuitton",
    bg: "#8B6914",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="20" fontWeight="400" fontFamily="Georgia, serif"
          letterSpacing="1">LV</text>
        <line x1="18" y1="50" x2="62" y2="50" stroke="white" strokeWidth="0.8" opacity="0.7" />
        <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="5.5" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="2.5" opacity="0.85">LOUIS VUITTON</text>
      </svg>
    ),
  },
  {
    name: "Gucci",
    bg: "#1a2a14",
    logo: (
      <svg viewBox="0 0 80 80" fill="none" className="w-14 h-14">
        <circle cx="32" cy="42" r="14" stroke="white" strokeWidth="3" fill="none" />
        <circle cx="48" cy="42" r="14" stroke="white" strokeWidth="3" fill="none" />
        <text x="50%" y="26%" dominantBaseline="middle" textAnchor="middle"
          fill="white" fontSize="7" fontWeight="300" fontFamily="Georgia, serif"
          letterSpacing="3">GUCCI</text>
      </svg>
    ),
  },
];

const CATEGORIES = [
  { name: "Shoes", emoji: "👟" },
  { name: "Wallets", emoji: "👛" },
  { name: "Jackets", emoji: "🧥" },
  { name: "Hoodies", emoji: "🦺" },
  { name: "T-Shirts", emoji: "👕" },
  { name: "Caps", emoji: "🧢" },
  { name: "Accessories", emoji: "⌚" },
  { name: "Pants", emoji: "👖" },
];

export function BrandsSection() {
  return (
    <section className="py-20 border-t border-border/30">
      <div className="container mx-auto px-4">

        {/* ── Brands ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70 mb-2">Premium Selection</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Shop by Brand</h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {BRANDS.map((brand) => (
              <Link href={`/shop?q=${encodeURIComponent(brand.name)}`} key={brand.name}>
                <div className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-border/30 hover:border-primary/50 transition-all duration-300 cursor-pointer">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300"
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
          <div className="text-center mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70 mb-2">Browse by Type</p>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Shop by Category</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <Link href={`/shop?q=${encodeURIComponent(cat.name)}`} key={cat.name}>
                <div className="group flex items-center gap-2 px-5 py-3 rounded-full border border-border/40 bg-card/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-[12px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
