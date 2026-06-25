import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import { FileText, LayoutDashboard, Package, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  
  if (!user || !user.isAdmin) {
    return <Redirect href="/login" />;
  }

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/terms", label: "Terms", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-black uppercase tracking-widest text-primary">Chamak Admin</h2>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-md font-bold uppercase text-sm tracking-wider transition-colors cursor-pointer
                  ${isActive ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,102,0,0.2)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon className="h-5 w-5" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border space-y-4">
          <Link href="/">
            <Button variant="outline" className="w-full justify-start text-xs font-bold uppercase tracking-wider border-border">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Store
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
