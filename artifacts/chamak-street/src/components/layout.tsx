import { Link, useLocation } from "wouter";
import { getGetCartQueryKey, getGetMeQueryKey, useGetCart, useGetMe, useLogout } from "@workspace/api-client-react";
import { ShoppingCart, User, Menu, X, LogOut, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/use-settings";
import { ChamakLogo } from "./chamak-logo";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const settings = useSettings();
  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), staleTime: 2 * 60_000 } });
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 5 * 60_000 } });
  const logout = useLogout();

  const cartCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/order-tracking", label: "Order Tracking" },
  ];

  if (user?.isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin" });
  }

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => { window.location.reload(); } });
  };

  const rawLogoUrl = settings.logo_url || "";
  const logoUrl = (!rawLogoUrl || rawLogoUrl === "/chamak-logo.png") ? "/chamak-logo-transparent.png" : rawLogoUrl;
  const useCustomLogo = true;
  const logoHeight = Number(settings.logo_height ?? 56) || 56;
  const logoBgColor = settings.logo_bg_color || "transparent";
  const logoOpacity = Number(settings.logo_opacity ?? 1) || 1;
  const logoBlur = Number(settings.logo_blur ?? 0) || 0;
  const logoBlendMode = settings.logo_blend_mode || "normal";
  const logoPadding = Number(settings.logo_padding ?? 0) || 0;
  const logoBorderRadius = Number(settings.logo_border_radius ?? 0) || 0;
  const logoBrightness = Number(settings.logo_brightness ?? 1) || 1;
  const logoContrast = Number(settings.logo_contrast ?? 1) || 1;

  const logoSize: "sm" | "md" | "lg" = logoHeight <= 40 ? "sm" : logoHeight <= 70 ? "md" : "lg";

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
              {useCustomLogo ? (
                <img
                  src={logoUrl}
                  alt="Chamak Street"
                  style={{
                    height: `${logoHeight}px`,
                    width: "auto",
                    objectFit: "contain",
                    backgroundColor: logoBgColor,
                    opacity: logoOpacity,
                    filter: `blur(${logoBlur}px) brightness(${logoBrightness}) contrast(${logoContrast})`,
                    mixBlendMode: logoBlendMode as React.CSSProperties["mixBlendMode"],
                    padding: `${logoPadding}px`,
                    borderRadius: `${logoBorderRadius}px`,
                  }}
                />
              ) : (
                <div style={{ opacity: logoOpacity }}>
                  <ChamakLogo size={logoSize} animate />
                </div>
              )}
            </motion.div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
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

          <div className="flex items-center gap-4 z-50">
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-muted-foreground">@{user.username}</span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:text-primary transition-colors">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="icon" className="hover:text-primary transition-colors">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
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

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
                      className={`text-2xl font-black uppercase tracking-wider flex items-center gap-3 ${location === link.href ? "text-primary" : "text-foreground"}`}
                    >
                      {link.href === "/order-tracking" && <MapPin className="h-5 w-5" />}
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="h-px bg-border w-full my-2" />
                {user ? (
                  <>
                    <div className="text-muted-foreground text-sm">Signed in as @{user.username}</div>
                    <Button variant="outline" className="justify-start w-full" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" /> Admin Login
                    </Button>
                  </Link>
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
            {useCustomLogo ? (
              <img
                src={logoUrl}
                alt="Chamak Street"
                style={{
                  height: "40px",
                  width: "auto",
                  objectFit: "contain",
                  backgroundColor: logoBgColor,
                  opacity: 0.7,
                  filter: `brightness(${logoBrightness}) contrast(${logoContrast})`,
                  mixBlendMode: logoBlendMode as React.CSSProperties["mixBlendMode"],
                  padding: `${logoPadding}px`,
                  borderRadius: `${logoBorderRadius}px`,
                  marginBottom: "16px",
                }}
              />
            ) : (
              <div style={{ opacity: 0.7, marginBottom: "16px" }}>
                <ChamakLogo size="sm" animate={false} />
              </div>
            )}
            <p className="text-muted-foreground text-sm max-w-sm">
              {settings.footer_description || "Premium streetwear for those who walk their own path."}
            </p>
            <div className="flex gap-4 mt-4">
              {settings.contact_instagram && (
                <a href={`https://instagram.com/${settings.contact_instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest font-bold">
                  Instagram
                </a>
              )}
              {settings.contact_tiktok && (
                <a href={`https://tiktok.com/@${settings.contact_tiktok.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest font-bold">
                  TikTok
                </a>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link href="/order-tracking" className="hover:text-primary transition-colors">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
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
