import { Link, useLocation } from "wouter";
import { Home, Grid3X3, ShoppingBag, User, MessageCircle, Layers, Shield, Headphones } from "lucide-react";
import { useRef } from "react";
import { getGetCartQueryKey, getGetMeQueryKey, useGetCart, useGetMe } from "@workspace/api-client-react";
import { useSettings } from "@/lib/use-settings";
import { AnnouncementBanner } from "./announcement-banner";
import { SmartSearchModal } from "./smart-search";
import { useCartFly } from "./cart-fly-context";
import { motion, AnimatePresence } from "framer-motion";
import { ChamakLogo } from "./chamak-logo";

const TAB_ITEMS = [
  { href: "/",        label: "Home",    Icon: Home },
  { href: "/shop",    label: "Shop",    Icon: Grid3X3 },
  { href: "/basics",  label: "Basics",  Icon: Layers },
  { href: "/cart",    label: "Cart",    Icon: ShoppingBag },
  { href: "/account", label: "Account", Icon: User },
];

const TAB_PATHS = ["/", "/shop", "/basics", "/cart", "/account"];
const tabIdx = (loc: string) =>
  TAB_PATHS.findIndex(p => p === "/" ? loc === "/" : loc.startsWith(p));

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const settings = useSettings();
  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), staleTime: 15_000 } });
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });
  const { cartBounceKey } = useCartFly();

  const cartCount = (cart?.items ?? []).reduce((a, i) => a + i.quantity, 0) || 0;

  // Direction tracking for iOS-style lateral slide animations
  const prevLocRef = useRef(location);
  const dirRef = useRef(0);
  if (prevLocRef.current !== location) {
    const p = tabIdx(prevLocRef.current);
    const c = tabIdx(location);
    dirRef.current = p >= 0 && c >= 0 ? Math.sign(c - p) : c < 0 ? 1 : -1;
    prevLocRef.current = location;
  }
  const xIn = dirRef.current >= 0 ? 32 : -32;

  const rawLogoUrl = settings.logo_url || "";
  const logoUrl = (!rawLogoUrl || rawLogoUrl === "/chamak-logo.png" || rawLogoUrl === "/chamak-logo-transparent.png") ? "/firstpick-logo.svg" : rawLogoUrl;
  const logoHeight = Math.min(Number(settings.logo_height ?? 44) || 44, 50);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 w-full glass-nav border-b border-white/8">
        <div className="flex items-center justify-between px-4 h-14">
          <SmartSearchModal />

          {/* Logo — centered */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 max-w-[140px] flex items-center justify-center pointer-events-auto">
            {logoUrl === "/firstpick-logo.svg" ? (
              <ChamakLogo size="sm" />
            ) : (
              <img
                src={logoUrl}
                alt="FirstPick"
                style={{ height: `${logoHeight}px`, maxWidth: "140px", width: "auto", objectFit: "contain" }}
              />
            )}
          </Link>

          <div className="flex items-center gap-1">
            <Link href="/support">
              <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 600, damping: 28 }} className="p-2">
                <Headphones className="h-5 w-5 text-white/40 hover:text-white/70 transition-colors" />
              </motion.div>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin">
                <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 600, damping: 28 }} className="p-2">
                  <Shield className="h-5 w-5 text-primary/70 transition-colors" />
                </motion.div>
              </Link>
            )}
            <Link href="/cart">
              <motion.div
                key={`cart-bounce-${cartBounceKey}`}
                animate={cartBounceKey > 0 ? { scale: [1, 1.4, 0.85, 1.18, 1] } : undefined}
                transition={{ duration: 0.45 }}
                className="relative p-2"
              >
                <ShoppingBag className="h-6 w-6 text-white/70" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-white border border-black"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          </div>
        </div>

        <AnnouncementBanner />
      </header>

      {/* ── Page Content — iOS-style lateral spring transition ── */}
      <main className="flex-1 pb-24 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location}
            initial={{ opacity: 0, x: xIn, scale: 0.984 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: xIn * -0.25, scale: 0.992, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.55 }}
            style={{ willChange: "transform, opacity" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── WhatsApp floating button ── */}
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

      {/* ── Bottom Tab Bar — liquid glass + spring animations ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "rgba(4,4,4,0.78)",
          backdropFilter: "blur(72px) saturate(260%) brightness(1.04)",
          WebkitBackdropFilter: "blur(72px) saturate(260%) brightness(1.04)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 -1px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07), 0 -8px 32px rgba(0,0,0,0.55)",
        }}
      >
        {TAB_ITEMS.map(({ href, label, Icon }) => {
          const isCart = href === "/cart";
          const isActive = href === "/" ? location === "/" : location.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              {/* Active glow — CSS transition only, no Framer layout animations */}
              <span
                className="absolute inset-x-1 inset-y-0.5 rounded-xl pointer-events-none transition-opacity duration-150"
                style={{ background: "rgba(255,102,0,0.09)", opacity: isActive ? 1 : 0 }}
              />

              <motion.div
                className="relative flex flex-col items-center gap-0.5"
                whileTap={{ scale: 0.78 }}
                transition={{ type: "spring", stiffness: 800, damping: 32 }}
              >
                <span className="relative transition-colors duration-150" style={{ color: isActive ? "#ff6600" : "rgba(255,255,255,0.35)" }}>
                  <Icon className="h-5 w-5" />
                  {isCart && cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 26 }}
                      className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-primary text-[9px] font-bold flex items-center justify-center text-white border border-black"
                    >
                      {cartCount > 9 ? "9+" : cartCount}
                    </motion.span>
                  )}
                </span>
                <span
                  className="text-[10px] font-black uppercase tracking-[0.08em] transition-colors duration-150"
                  style={{ color: isActive ? "#ff6600" : "rgba(255,255,255,0.25)" }}
                >
                  {label}
                </span>
              </motion.div>

              {/* Active indicator dot — CSS transition only */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[2.5px] rounded-full bg-primary pointer-events-none transition-opacity duration-150"
                style={{ opacity: isActive ? 1 : 0 }}
              />
            </Link>
          );
        })}

        {user?.isAdmin && (
          <Link
            href="/admin"
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            <span
              className="absolute inset-x-1 inset-y-0.5 rounded-xl pointer-events-none transition-opacity duration-150"
              style={{ background: "rgba(255,102,0,0.09)", opacity: location.startsWith("/admin") ? 1 : 0 }}
            />
            <motion.div
              className="relative flex flex-col items-center gap-0.5"
              whileTap={{ scale: 0.78 }}
              transition={{ type: "spring", stiffness: 800, damping: 32 }}
            >
              <span className="transition-colors duration-150" style={{ color: location.startsWith("/admin") ? "#ff6600" : "rgba(255,255,255,0.35)" }}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-[0.08em] transition-colors duration-150"
                style={{ color: location.startsWith("/admin") ? "#ff6600" : "rgba(255,255,255,0.25)" }}
              >
                Admin
              </span>
            </motion.div>
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[2.5px] rounded-full bg-primary pointer-events-none transition-opacity duration-150"
              style={{ opacity: location.startsWith("/admin") ? 1 : 0 }}
            />
          </Link>
        )}
      </nav>
    </div>
  );
}
