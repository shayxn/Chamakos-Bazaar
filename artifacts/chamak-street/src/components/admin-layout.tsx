import { useGetMe, useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import {
  FileText, LayoutDashboard, Package, ShoppingBag,
  ArrowLeft, Tag, Settings, Star, Video, Globe, Download, Search, X, Bell,
  TrendingUp
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
          placeholder="Search products, categories..."
          className="w-full pl-8 pr-8 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && debouncedQuery.length >= 2 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {!hasResults ? (
            <p className="text-xs text-muted-foreground px-4 py-3">No results for "{debouncedQuery}"</p>
          ) : (
            <>
              {(products?.slice(0, 5) ?? []).map((p) => (
                <Link key={p.id} href={`/admin/products`} onClick={() => { setQuery(""); setOpen(false); }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted cursor-pointer">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-7 h-7 rounded object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-muted border border-border shrink-0 flex items-center justify-center">
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
                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted cursor-pointer">
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Loading...</p>
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
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/products", label: "Products", icon: Package },
        { href: "/admin/categories", label: "Categories", icon: Tag },
        { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
        { href: "/admin/import", label: "Import Products", icon: Download },
        { href: "/admin/stock-alerts", label: "Stock Alerts", icon: Bell },
      ],
    },
    {
      label: "Analytics",
      links: [
        { href: "/admin/sales-reports", label: "Sales Reports", icon: TrendingUp },
      ],
    },
    {
      label: "Content",
      links: [
        { href: "/admin/site-settings", label: "Site Settings", icon: Settings },
        { href: "/admin/reviews", label: "Reviews", icon: Star },
        { href: "/admin/tiktok", label: "TikTok Videos", icon: Video },
        { href: "/admin/terms", label: "Pages & Legal", icon: FileText },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-black uppercase tracking-widest text-primary text-sm">Chamak Admin</h2>
          </div>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>

        <div className="px-4 pt-3 pb-2 flex gap-2">
          <Link href="/" className="flex-1">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs font-bold uppercase tracking-wider">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Store
            </Button>
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="px-2 text-muted-foreground" title="View Site">
              <Globe className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>

        <div className="pb-1">
          <GlobalSearch />
        </div>

        <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-5">
          {linkGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-black px-3 mb-2">{group.label}</p>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all cursor-pointer
                        ${isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {link.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
