import { Link, useLocation } from "wouter";
import { getGetCartQueryKey, getGetMeQueryKey, useGetCart, useGetMe, useLogout } from "@workspace/api-client-react";
import { ShoppingCart, User, Menu, X, LogOut, MapPin, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/use-settings";
import { ChamakLogo } from "./chamak-logo";
import { SmartSearchModal } from "./smart-search";
import { EventBanner } from "./event-banner";

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
    { href: "/games", label: "Games" },
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
      <EventBanner />
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
            <SmartSearchModal />
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
            <div className="flex flex-wrap gap-3 mt-4">
              {settings.contact_instagram && (
                <motion.a
                  href={`https://instagram.com/${settings.contact_instagram.replace("@", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-border/50 hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(255,102,0,0.15)]"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </motion.a>
              )}
              {settings.contact_tiktok && settings.tiktok_btn_visible !== "false" && (
                <motion.a
                  href={`https://tiktok.com/@${settings.contact_tiktok.replace("@", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.06, y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  style={{ backgroundColor: settings.tiktok_btn_color || "#000000" }}
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.27 8.27 0 004.84 1.54V6.76a4.85 4.85 0 01-1.08-.07z"/></svg>
                  {settings.tiktok_btn_text || "Follow on TikTok"}
                </motion.a>
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

      {settings.whatsapp_visible !== "false" && settings.whatsapp_number && (
        <motion.a
          href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(settings.whatsapp_message || "Hello! I'm interested in one of your products.")}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.08, y: -4, boxShadow: `0 12px 32px rgba(37,211,102,0.45)` }}
          whileTap={{ scale: 0.94 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 text-white font-black text-sm uppercase tracking-wider px-4 py-3 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.35)] transition-shadow"
          style={{ backgroundColor: settings.whatsapp_color || "#25D366" }}
          title={settings.whatsapp_text || "Chat with Us"}
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">{settings.whatsapp_text || "Chat with Us"}</span>
        </motion.a>
      )}
    </div>
  );
}
