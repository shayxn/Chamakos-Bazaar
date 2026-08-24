import { Link, useLocation } from "wouter";
import { getGetCartQueryKey, getGetMeQueryKey, useGetCart, useGetMe, useLogout, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { ShoppingCart, User, Search, LogOut, Settings, MessageCircle, Headphones } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
import { useSettings } from "@/lib/use-settings";
import { SmartSearchModal } from "./smart-search";
import { AnnouncementBanner } from "./announcement-banner";
import { useCartFly } from "./cart-fly-context";
import { BackToTop } from "./back-to-top";
import { ChamakLogo } from "./chamak-logo";
import { SystemStudioLayer } from "./system-studio-layer";


export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const settings = useSettings();
  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), staleTime: 15_000 } });
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey(), staleTime: 60_000 } });
  const logout = useLogout();

  const cartCount = (cart?.items ?? []).reduce((acc, item) => acc + item.quantity, 0) || 0;
  const { cartBounceKey } = useCartFly();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => { window.location.reload(); } });
  };

  const rawLogoUrl = settings.logo_url || "";
  const logoUrl = (!rawLogoUrl || rawLogoUrl === "/chamak-logo.png" || rawLogoUrl === "/chamak-logo-transparent.png") ? "/firstpick-logo.svg" : rawLogoUrl;
  const logoHeight = Number(settings.logo_height ?? 52) || 52;
  const logoBgColor = settings.logo_bg_color || "transparent";
  const logoOpacity = Number(settings.logo_opacity ?? 1) || 1;
  const logoBlur = Number(settings.logo_blur ?? 0) || 0;
  const logoBlendMode = settings.logo_blend_mode || "normal";
  const logoPadding = Number(settings.logo_padding ?? 0) || 0;
  const logoBorderRadius = Number(settings.logo_border_radius ?? 0) || 0;
  const logoBrightness = Number(settings.logo_brightness ?? 1) || 1;
  const logoContrast = Number(settings.logo_contrast ?? 1) || 1;

  const navCategories = [
    { href: "/shop", label: "All Products" },
    { href: "/back-to-school", label: "Back To School" },
    { href: "/basics", label: "FP Basics" },
    ...(categories ?? []).slice(0, 6).map((c) => ({ href: `/shop?cat=${c.id}`, label: c.name })),
    { href: "/shop?new=1", label: "Latest Arrivals" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden">
      <header
        className="sticky top-0 z-50 w-full glass-nav transition-all duration-300"
        style={{
          borderBottom: scrolled ? "1px solid rgba(255,102,0,0.18)" : "1px solid rgba(255,255,255,0.06)",
          boxShadow: scrolled ? "0 4px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)" : undefined,
        }}
      >
        {/* Row 1: Search | Logo (center) | User + Cart */}
        <div className="max-w-[1440px] mx-auto px-6 h-[68px] flex items-center">
          {/* Left: Search */}
          <div className="flex-1 flex items-center gap-1">
            <SmartSearchModal />
          </div>

          {/* Center: Logo — shrinks on scroll */}
          <Link href="/" className="flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ scale: scrolled ? 0.88 : 1 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {logoUrl === "/firstpick-logo.svg" ? (
                <ChamakLogo size="md" />
              ) : (
                <img
                  src={logoUrl}
                  alt="FirstPick"
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
              )}
            </motion.div>
          </Link>

          {/* Right: Admin + User + Cart */}
          <div className="flex-1 flex items-center justify-end gap-1 z-50">
            <Link href="/support" aria-label="Support">
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 transition-colors h-9 w-9" title="Support">
                <Headphones className="h-5 w-5" />
              </Button>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-[11px] font-black uppercase tracking-widest text-white/70 hover:text-primary transition-colors px-3">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Admin
                </Button>
              </Link>
            )}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-white/40">@{user.username}</span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-white/60 hover:text-white transition-colors h-9 w-9">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white transition-colors h-9 w-9">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link href="/cart" id="nav-cart-btn" className="relative group">
              <motion.div
                key={`cart-bounce-${cartBounceKey}`}
                animate={cartBounceKey > 0 ? { scale: [1, 1.4, 0.85, 1.18, 1] } : undefined}
                transition={{ duration: 0.45 }}
              >
                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white transition-colors h-9 w-9">
                  <ShoppingCart className="h-5 w-5" />
                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-white border border-black"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Row 2: Category nav */}
        <div className="hidden md:block border-t border-white/8">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex items-center justify-start md:justify-center gap-4 md:gap-8 h-10 overflow-x-auto scrollbar-none">
              {[...navCategories, { href: "/order-tracking", label: "Track Order" }].map((link) => {
                const isActive = link.href === "/shop"
                  ? location === "/shop" && !location.includes("?")
                  : location + (typeof window !== "undefined" ? window.location.search : "") === link.href ||
                    location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 whitespace-nowrap ${
                      isActive ? "text-primary" : "text-white/55 hover:text-white"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Announcement banner */}
        <AnnouncementBanner />
      </header>

      <main className="flex-1">
        {children}
        <SystemStudioLayer route={location} />
      </main>

      {/* Footer */}
      <footer className="relative mt-20 border-t border-white/[0.07]" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>

        {/* Trust row — staggered reveal */}
        <div className="border-b border-white/6">
          <div className="max-w-[1440px] mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🚚", title: "Fast Delivery", desc: "UAE-wide, 1-3 days" },
              { icon: "💳", title: "Cash on Delivery", desc: "Pay when it arrives" },
              { icon: "🔒", title: "Secure Orders", desc: "Your info is safe" },
              { icon: "✅", title: "100% Authentic", desc: "Genuine products only" },
            ].map(({ icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="flex items-center gap-3 group"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              >
                <motion.span
                  className="text-xl shrink-0"
                  whileInView={{ scale: [0.4, 1.25, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: i * 0.08 + 0.12, ease: EASE }}
                  whileHover={{ scale: 1.3, rotate: [0, -8, 8, 0] }}
                >
                  {icon}
                </motion.span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white/90 transition-colors duration-200">{title}</p>
                  <p className="text-[10px] text-white/30">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-8">
          <motion.div
            className="col-span-1 md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            {logoUrl === "/firstpick-logo.svg" ? (
              <div style={{ marginBottom: "14px", opacity: 0.65 }}>
                <ChamakLogo size="sm" />
              </div>
            ) : (
              <img
                src={logoUrl}
                alt="FirstPick"
                style={{
                  height: "38px",
                  width: "auto",
                  objectFit: "contain",
                  opacity: 0.65,
                  filter: `brightness(${logoBrightness}) contrast(${logoContrast})`,
                  marginBottom: "14px",
                }}
              />
            )}
            <p className="text-white/40 text-sm max-w-sm">
              {settings.footer_description || "Premium streetwear for those who walk their own path."}
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              {settings.contact_instagram && (
                <motion.a
                  href={`https://instagram.com/${settings.contact_instagram.replace("@", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded border border-white/10 hover:border-white/30"
                  whileHover={{ y: -2, scale: 1.04, borderColor: "rgba(255,255,255,0.35)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </motion.a>
              )}
              {settings.contact_tiktok && settings.tiktok_btn_visible !== "false" && (
                <motion.a
                  href={`https://tiktok.com/@${settings.contact_tiktok.replace("@", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded border border-white/10 hover:border-white/30"
                  whileHover={{ y: -2, scale: 1.04, borderColor: "rgba(255,255,255,0.35)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.27 8.27 0 004.84 1.54V6.76a4.85 4.85 0 01-1.08-.07z"/></svg>
                  TikTok
                </motion.a>
              )}
            </div>
          </motion.div>

          {/* Quick Links column (admin-configurable) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
          >
            <h4 className="font-black uppercase tracking-wider mb-4 text-xs text-white/80">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-white/40">
              {(settings.footer_links?.trim()
                ? settings.footer_links.split("\n").filter(l => l.includes("|")).map(l => {
                    const [label, href] = l.split("|").map(s => s.trim());
                    return { label, href };
                  })
                : [
                    { label: "All Products", href: "/shop" },
                    { label: "Track Order", href: "/order-tracking" },
                    { label: "Wishlist", href: "/wishlist" },
                    { label: "Support", href: "/support" },
                  ]
              ).map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-primary transition-colors duration-200 hover:translate-x-0.5 inline-block">{label}</Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Support column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: 0.25, ease: EASE }}
          >
            <h4 className="font-black uppercase tracking-wider mb-4 text-xs text-white/80">Support</h4>
            <ul className="space-y-2.5 text-sm text-white/40">
              <li><Link href="/account" className="hover:text-primary transition-colors duration-200 hover:translate-x-0.5 inline-block">My Account</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors duration-200 hover:translate-x-0.5 inline-block">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors duration-200 hover:translate-x-0.5 inline-block">Privacy Policy</Link></li>
              <li><Link href="/shipping" className="hover:text-primary transition-colors duration-200 hover:translate-x-0.5 inline-block">Shipping Info</Link></li>
            </ul>
          </motion.div>
        </div>
        <div className="max-w-[1440px] mx-auto px-6 pb-8 pt-6 border-t border-white/8 flex flex-wrap items-center justify-between gap-2 text-xs text-white/25">
          <span className="font-black tracking-widest uppercase text-white/40">FirstPick</span>
          <span className="text-right">{settings.footer_copyright || `© ${new Date().getFullYear()} All rights reserved. Authentic Products — Dubai`}</span>
        </div>
      </footer>

      <BackToTop />

      {settings.whatsapp_visible !== "false" && settings.whatsapp_number && (
        <motion.a
          href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(settings.whatsapp_message || "Hello! I'm interested in one of your products.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 text-white font-black text-sm uppercase tracking-wider px-4 py-3 rounded-full"
          style={{ backgroundColor: settings.whatsapp_color || "#25D366", boxShadow: "0 4px 20px rgba(37,211,102,0.35)" }}
          title={settings.whatsapp_text || "Chat with Us"}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 280, damping: 20 }}
          whileHover={{ scale: 1.08, boxShadow: "0 8px 32px rgba(37,211,102,0.50)" }}
          whileTap={{ scale: 0.93 }}
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
            transition={{ duration: 0.6, delay: 1.8, ease: "easeInOut" }}
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
          </motion.div>
          <span className="hidden sm:inline">{settings.whatsapp_text || "Chat with Us"}</span>
        </motion.a>
      )}
    </div>
  );
}
