import { Link } from "wouter";

const BRANDS = [
  { name: "Chrome Hearts", domain: "chromehearts.com", initials: "CH" },
  { name: "Corteiz", domain: "corteiz.com", initials: "CR" },
  { name: "Trapstar", domain: "trapstarlondon.com", initials: "TS" },
  { name: "Fear of God", domain: "fearofgod.com", initials: "FOG" },
  { name: "Off-White", domain: "off---white.com", initials: "OW" },
  { name: "Supreme", domain: "supremenewyork.com", initials: "SUP" },
  { name: "Balenciaga", domain: "balenciaga.com", initials: "BAL" },
  { name: "Stone Island", domain: "stoneisland.com", initials: "SI" },
  { name: "Moncler", domain: "moncler.com", initials: "MNC" },
  { name: "Dior", domain: "dior.com", initials: "CD" },
  { name: "Louis Vuitton", domain: "louisvuitton.com", initials: "LV" },
  { name: "Gucci", domain: "gucci.com", initials: "GG" },
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
                <div className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-border/30 bg-card/40 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 cursor-pointer">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={`https://logo.clearbit.com/${brand.domain}`}
                      alt={brand.name}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        const t = e.currentTarget;
                        t.style.display = "none";
                        const parent = t.parentElement;
                        if (parent) {
                          parent.style.background = "#111";
                          parent.innerHTML = `<span style="color:#ff6600;font-size:10px;font-weight:900;text-align:center;padding:2px;word-break:break-all">${brand.initials}</span>`;
                        }
                      }}
                    />
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
