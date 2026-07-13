import { useGetMe, useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import {
  FileText, LayoutDashboard, Package, ShoppingBag,
  ArrowLeft, Tag, Settings, Star, Video, Globe, Download, Search, X, Bell,
  TrendingUp, ShoppingCart, Zap, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debouncedQuery = query.trim();

  const { data: products } = useListProducts(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined,
    { query: { enabled: debouncedQuery.length >= 2, staleTime: 10_000, queryKey: ["admin-search-products", debouncedQuery] } }
  );
  const { data: categories } = useListCategories({ query: { staleTime: 60_000, queryKey: ["admin-search-categories"] } });

  const filteredCategories = debouncedQuery.length >= 2
    ? (categories ?? []).filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];

  const hasResults = (products?.length ?? 0) > 0 || filteredCategories.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative px-3 mb-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search products, categories…"
          className="w-full pl-8 pr-8 py-2 text-xs rounded-lg focus:outline-none transition-all duration-200 text-foreground placeholder:text-muted-foreground"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,102,0,0.4)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(255,102,0,0.65)")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && debouncedQuery.length >= 2 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
          style={{ background: "rgba(12,12,12,0.97)", border: "1px solid rgba(255,102,0,0.2)", backdropFilter: "blur(12px)" }}>
          {!hasResults ? (
            <p className="text-xs text-muted-foreground px-4 py-3">No results for "{debouncedQuery}"</p>
          ) : (
            <>
              {(products?.slice(0, 5) ?? []).map((p) => (
                <Link key={p.id} href="/admin/products" onClick={() => { setQuery(""); setOpen(false); }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-7 h-7 rounded object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                        <Package className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">AED {p.price.toFixed(2)} · {p.categoryName ?? "No category"}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {filteredCategories.slice(0, 3).map((c) => (
                <Link key={c.id} href="/admin/categories" onClick={() => { setQuery(""); setOpen(false); }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors">
                    <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-xs font-bold">{c.name}</p>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false, queryKey: ["auth", "me"] } });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
            <div className="absolute inset-1.5 rounded-full border border-transparent border-t-yellow-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return <Redirect href="/login" />;
  }

  const linkGroups = [
    {
      label: "Store",
      links: [
        { href: "/admin",               label: "Dashboard",      icon: LayoutDashboard },
        { href: "/admin/products",       label: "Products",       icon: Package },
        { href: "/admin/categories",     label: "Categories",     icon: Tag },
        { href: "/admin/orders",         label: "Orders",         icon: ShoppingBag },
        { href: "/admin/import",         label: "Import Products",icon: Download },
        { href: "/admin/stock-alerts",   label: "Stock Alerts",   icon: Bell },
        { href: "/admin/abandoned-carts",label: "Abandoned Carts",icon: ShoppingCart },
      ],
    },
    {
      label: "Analytics",
      links: [
        { href: "/admin/sales-reports", label: "Sales Reports", icon: TrendingUp },
        { href: "/admin/visitors",      label: "Visitors",      icon: Users },
      ],
    },
    {
      label: "Content",
      links: [
        { href: "/admin/site-settings", label: "Site Settings",  icon: Settings },
        { href: "/admin/reviews",        label: "Reviews",        icon: Star },
        { href: "/admin/tiktok",         label: "TikTok Videos",  icon: Video },
        { href: "/admin/terms",          label: "Pages & Legal",  icon: FileText },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "transparent" }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-full md:w-64 shrink-0 flex flex-col relative overflow-hidden"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Animated accent bar on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, #ff6600 25%, #ffcc00 50%, #ff4400 75%, transparent 100%)",
            backgroundSize: "100% 300%",
            animation: "adminAccentBar 4s linear infinite",
          }}
        />

        {/* Subtle background glow blob */}
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,102,0,0.06) 0%, transparent 70%)",
            animation: "orbPulse 6s ease-in-out infinite",
          }}
        />

        {/* Header */}
        <div className="relative p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
              style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)", boxShadow: "0 2px 12px rgba(255,102,0,0.45)" }}>
              <Zap className="h-3.5 w-3.5 text-white" />
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-lg opacity-50"
                style={{ border: "1px solid rgba(255,204,0,0.8)", animation: "statusDotPulse 2s ease-in-out infinite" }} />
            </div>
            <span
              className="font-black uppercase tracking-[0.18em] text-sm gradient-text-animate"
            >
              Chamak Admin
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground pl-9">@{user.username}</p>
        </div>

        {/* Action buttons */}
        <div className="px-3 pt-3 pb-2 flex gap-2">
          <Link href="/" className="flex-1">
            <Button
              variant="outline" size="sm"
              className="w-full justify-start text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:border-orange-500/40 hover:text-primary"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Store
            </Button>
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost" size="sm"
              className="px-2 text-muted-foreground hover:text-primary transition-colors"
              title="View Site"
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>

        <div className="pb-1">
          <GlobalSearch />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-5">
          {linkGroups.map((group) => (
            <div key={group.label}>
              <p
                className="text-[9px] uppercase tracking-[0.28em] font-black px-3 mb-2"
                style={{ animation: "adminLabelColor 5s ease-in-out infinite" }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[11px] tracking-wide cursor-pointer transition-all duration-200 relative overflow-hidden ${
                          isActive ? "admin-active-pill text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                        style={!isActive ? {
                          background: "transparent",
                        } : undefined}
                        onMouseEnter={!isActive ? e => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,102,0,0.08)";
                          (e.currentTarget as HTMLElement).style.color = "rgba(255,200,100,0.9)";
                        } : undefined}
                        onMouseLeave={!isActive ? e => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "";
                        } : undefined}
                      >
                        {/* Shimmer on active */}
                        {isActive && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                              animation: "adminShimmer 2.5s ease-in-out infinite",
                            }}
                          />
                        )}
                        <Icon className="h-3.5 w-3.5 shrink-0 relative z-10" />
                        <span className="relative z-10">{link.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1 h-1 rounded-full bg-white/80 shrink-0 relative z-10"
                            style={{ boxShadow: "0 0 6px white" }} />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom badge */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0 admin-status-dot"
              style={{ background: "#ff6600" }} />
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400/70">System Online</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
