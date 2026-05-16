import { Link, useLocation } from "wouter";
import { useGetCart, useGetMe } from "@workspace/api-client-react";
import { useUser, useClerk, Show } from "@clerk/react";
import { ChamakLogo } from "./chamak-logo";
import { ShoppingCart, User, Menu, X, LogOut, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: cart } = useGetCart({ query: { queryKey: ["cart"] } });

  // Admin session auth (cookie-session based)
  const { data: adminUser } = useGetMe({ query: { queryKey: ["me"], retry: false } });

  // Clerk auth (regular users)
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut } = useClerk();

  const cartCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
  ];

  if (adminUser?.isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin" });
  }

  // Display name priority: admin session > Clerk user
  const displayName = adminUser
    ? `@${adminUser.username}`
    : clerkUser
      ? clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] || "User"
      : null;

  const isLoggedIn = !!adminUser || !!clerkUser;

  const handleSignOut = () => {
    if (adminUser) {
      // admin uses cookie-session logout
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
        window.location.href = "/";
      });
    } else {
      signOut({ redirectUrl: "/" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <motion.header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-border/40 bg-background/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(255,102,0,0.08)]"
            : "bg-transparent"
        }`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 z-50">
            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
              <ChamakLogo size="sm" animate={true} />
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-bold uppercase tracking-widest transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.label}
                {location === link.href && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ff6600] to-[#ffcc00] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden md:flex items-center gap-3 z-50">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-medium">{displayName}</span>
                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" className="hover:text-primary transition-colors">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              clerkLoaded && (
                <div className="flex items-center gap-2">
                  <Link href="/sign-in">
                    <Button variant="ghost" size="sm" className="font-bold uppercase tracking-wider text-xs hover:text-primary">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button size="sm" className="font-bold uppercase tracking-wider text-xs fire-gradient border-none px-4">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )
            )}

            <Link href="/cart" className="relative group">
              <Button variant="ghost" size="icon" className="group-hover:text-primary transition-colors">
                <ShoppingCart className="h-5 w-5" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground border border-background"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </Link>
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-2 md:hidden z-50">
            <Link href="/cart" className="relative group">
              <Button variant="ghost" size="icon" className="group-hover:text-primary transition-colors">
                <ShoppingCart className="h-5 w-5" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground border border-background"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <AnimatePresence mode="wait" initial={false}>
                {isMenuOpen ? (
                  <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="h-6 w-6" />
                  </motion.span>
                ) : (
                  <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="h-6 w-6" />
                  </motion.span>
                )}
              </AnimatePresence>
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
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden border-b border-border bg-background/95 backdrop-blur-xl overflow-hidden"
            >
              <nav className="flex flex-col p-6 gap-5">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`text-2xl font-black uppercase tracking-wider ${location === link.href ? "text-primary" : "text-foreground"}`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="h-px bg-border w-full my-2" />
                {isLoggedIn ? (
                  <>
                    <div className="text-muted-foreground text-sm">Signed in as {displayName}</div>
                    <Button variant="outline" className="justify-start w-full" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/sign-in" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start">
                        <User className="h-4 w-4 mr-2" /> Sign In
                      </Button>
                    </Link>
                    <Link href="/sign-up" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full justify-start fire-gradient border-none">
                        <UserPlus className="h-4 w-4 mr-2" /> Create Account
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border mt-20 py-12 bg-card">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <ChamakLogo size="sm" animate={false} className="mb-4 opacity-70" />
            <p className="text-muted-foreground text-sm max-w-sm">
              Premium streetwear for those who walk their own path.
              Bold designs, unmatched swagger.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <Show when="signed-out">
                <li><Link href="/sign-in" className="hover:text-primary transition-colors">Sign In</Link></li>
                <li><Link href="/sign-up" className="hover:text-primary transition-colors">Create Account</Link></li>
              </Show>
              <Show when="signed-in">
                <li><button onClick={() => signOut({ redirectUrl: "/" })} className="hover:text-primary transition-colors text-left">Sign Out</button></li>
              </Show>
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
