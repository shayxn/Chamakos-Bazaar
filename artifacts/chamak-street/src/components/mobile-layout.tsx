import { Link, useLocation } from "wouter";
import { Home, Grid3X3, ShoppingBag, User, MessageCircle } from "lucide-react";
import { SunToggle } from "./sun-toggle";
import { useState } from "react";
import { getGetCartQueryKey, getGetMeQueryKey, useGetCart, useGetMe } from "@workspace/api-client-react";
import { useSettings } from "@/lib/use-settings";
import { AnnouncementBanner } from "./announcement-banner";
import { SmartSearchModal } from "./smart-search";
import { useCartFly } from "./cart-fly-context";
import { motion, AnimatePresence } from "@/lib/motion-noop";

const TAB_ITEMS = [
  { href: "/",              label: "Home",  Icon: Home },
  { href: "/shop",          label: "Shop",  Icon: Grid3X3 },
  { href: "/cart",          label: "Cart",  Icon: ShoppingBag },
  { href: "/account",       label: "Account", Icon: User },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const settings = useSettings();
  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), staleTime: 2 * 60_000 } });
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 5 * 60_000 } });
  const { cartBounceKey } = useCartFly();

  const cartCount = cart?.items.reduce((a, i) => a + i.quantity, 0) || 0;

  const rawLogoUrl = settings.logo_url || "";
  const logoUrl = (!rawLogoUrl || rawLogoUrl === "/chamak-logo.png") ? "/chamak-logo-transparent.png" : rawLogoUrl;
  const logoHeight = Math.min(Number(settings.logo_height ?? 44) || 44, 50);

  const isCartActive = location === "/cart";

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 w-full" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,102,0,0.18)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          {/* Search */}
          <SmartSearchModal />

          {/* Logo centered */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <img
              src={logoUrl}
              alt="Chamak Street"
              style={{ height: `${logoHeight}px`, width: "auto", objectFit: "contain" }}
            />
          </Link>

          {/* Cart + Sun toggle */}
          <div className="flex items-center gap-1">
            <Link href="/cart">
              <motion.div
                key={`cart-bounce-${cartBounceKey}`}
                animate={cartBounceKey > 0 ? { scale: [1, 1.4, 0.85, 1.18, 1] } : undefined}
                transition={{ duration: 0.45 }}
                className="relative p-2"
              >
                <ShoppingBag className="h-6 w-6 text-white" />
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
              </motion.div>
            </Link>
            <SunToggle />
          </div>
        </div>

        <AnnouncementBanner />
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* ── WhatsApp floating button (above tab bar) ── */}
      {settings.whatsapp_visible !== "false" && settings.whatsapp_number && (
        <a
          href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(settings.whatsapp_message || "Hello! I'm interested in one of your products.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-4 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] text-white transition-transform active:scale-90"
          style={{ backgroundColor: settings.whatsapp_color || "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}

      {/* ── Bottom Tab Bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,102,0,0.25)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {TAB_ITEMS.map(({ href, label, Icon }) => {
          const isCart = href === "/cart";
          const isActive = href === "/" ? location === "/" : location.startsWith(href);

          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative group">
              <span
                className="relative flex items-center justify-center"
                style={{ color: isActive ? "#ff6600" : "rgba(255,255,255,0.45)" }}
              >
                <Icon className="h-5 w-5 transition-colors duration-200" />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-primary text-[9px] font-bold flex items-center justify-center text-primary-foreground border border-black">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-[0.08em] transition-colors duration-200"
                style={{ color: isActive ? "#ff6600" : "rgba(255,255,255,0.35)" }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #ff6600, #ffcc00)" }}
                />
              )}
            </Link>
          );
        })}

        {/* Admin quick tab if admin user */}
        {user?.isAdmin && (
          <Link href="/admin" className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative group">
            <span style={{ color: location.startsWith("/admin") ? "#ff6600" : "rgba(255,255,255,0.45)" }}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </span>
            <span
              className="text-[10px] font-black uppercase tracking-[0.08em]"
              style={{ color: location.startsWith("/admin") ? "#ff6600" : "rgba(255,255,255,0.35)" }}
            >
              Admin
            </span>
            {location.startsWith("/admin") && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg,#ff6600,#ffcc00)" }} />
            )}
          </Link>
        )}
      </nav>
    </div>
  );
}
