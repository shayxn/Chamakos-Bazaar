import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import {
  FileText, LayoutDashboard, Package, ShoppingBag,
  ArrowLeft, Tag, Settings, Star, Video, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
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

        <div className="p-4 border-t border-border space-y-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs font-bold uppercase tracking-wider">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Store
            </Button>
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Globe className="h-3.5 w-3.5 mr-2" /> View Site
            </Button>
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
