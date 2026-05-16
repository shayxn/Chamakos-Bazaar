import { Link, useLocation } from "wouter";
import { useGetCart, useGetMe, useLogout } from "@workspace/api-client-react";
import logoPath from "@assets/image_1778934887293.png";
import { ShoppingCart, User, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: cart } = useGetCart({ query: { queryKey: ["cart"] } });
  const { data: user } = useGetMe({ query: { queryKey: ["me"], retry: false } });
  const logout = useLogout();

  const cartCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
  ];

  if (user?.isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin" });
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.reload();
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 z-50">
            <img src={logoPath} alt="Chamak Street" className="h-8 object-contain" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-sm font-medium uppercase tracking-wider transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 z-50">
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-muted-foreground">@{user.username}</span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            
            <Link href="/cart" className="relative group">
              <Button variant="ghost" size="icon" className="group-hover:text-primary transition-colors">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground border border-background">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-border bg-background"
            >
              <nav className="flex flex-col p-4 gap-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-lg font-bold uppercase tracking-wider ${location === link.href ? "text-primary" : "text-foreground"}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-border w-full my-2" />
                {user ? (
                  <>
                    <div className="text-muted-foreground text-sm py-2">Signed in as @{user.username}</div>
                    <Button variant="outline" className="justify-start w-full" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" /> Login
                    </Button>
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border mt-20 py-12 bg-card">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <img src={logoPath} alt="Chamak Street" className="h-8 mb-4 object-contain grayscale opacity-50" />
            <p className="text-muted-foreground text-sm max-w-sm">
              Premium streetwear for those who walk their own path. 
              Bold designs, unmatched swagger.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop?category=new" className="hover:text-primary transition-colors">New Arrivals</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Returns & Exchanges</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Chamak Street. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
