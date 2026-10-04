import { Link, useLocation } from "wouter";
import { ShoppingBag, MessageCircle, Menu, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getGetCartQueryKey, getGetMeQueryKey, useGetCart, useGetMe } from "@workspace/api-client-react";
import { useSettings } from "@/lib/use-settings";
import { AnnouncementBanner } from "./announcement-banner";
import { SmartSearchModal } from "./smart-search";
import { useCartFly } from "./cart-fly-context";
import { motion, AnimatePresence } from "framer-motion";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const settings = useSettings();
  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), staleTime: 15_000 } });
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });
  const { cartBounceKey } = useCartFly();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = (cart?.items ?? []).reduce((a, i) => a + i.quantity, 0) || 0;

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#09080c]/90 backdrop-blur-xl">
        <div className="flex h-[62px] items-center justify-between px-4">
          <Link href="/" aria-label="IMAGINATE home" className="flex h-full items-center">
            <img src="/imaginate-logo.png" alt="IMAGINATE" className="h-[116px] w-[116px] object-contain" />
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/cart" aria-label={`Shopping bag${cartCount ? `, ${cartCount} items` : ""}`} className="relative grid h-11 w-11 place-items-center">
              <motion.span
                key={`cart-bounce-${cartBounceKey}`}
                animate={cartBounceKey > 0 ? { scale: [1, 1.25, 0.95, 1] } : undefined}
                transition={{ duration: 0.35 }}
              >
                <ShoppingBag className="h-5 w-5 text-white/75" strokeWidth={1.5} />
              </motion.span>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white"
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center text-white/80 hover:text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "close" : "menu"}
                  initial={{ opacity: 0, rotate: -20 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 20 }}
                  transition={{ duration: 0.12 }}
                >
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
        <AnnouncementBanner />
      </header>

      <main className="flex-1 overflow-x-hidden">{children}</main>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Main navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[#09080c] px-6 pb-10"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 18px)" }}
          >
            <div className="flex h-12 items-center justify-between">
              <Link href="/" onClick={() => setMenuOpen(false)} aria-label="IMAGINATE home">
                <img src="/imaginate-logo.png" alt="IMAGINATE" className="h-[108px] w-[108px] object-contain" />
              </Link>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/70">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-10 border-y border-white/10 py-5">
              <SmartSearchModal />
            </div>

            <div className="flex flex-1 flex-col justify-center py-10">
              {[
                { href: "/shop", label: "Shop all" },
                { href: "/shop?new=1", label: "New" },
                { href: "/shop?search=hoodie", label: "Hoodies" },
                { href: "/about", label: "About" },
                { href: "/account", label: "Account" },
                { href: "/support", label: "Support" },
              ].map((item, index) => (
                <motion.div key={item.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035, duration: 0.2 }}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center justify-between border-b border-white/[.07] py-4 text-[clamp(2rem,10vw,3.1rem)] font-medium uppercase leading-none tracking-[-.065em] text-white/90 transition-colors hover:text-[#c6b2f0]"
                  >
                    {item.label}
                    <ArrowRight className="h-5 w-5 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-[#c6b2f0]" />
                  </Link>
                </motion.div>
              ))}
              {user?.isAdmin && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="mt-7 inline-flex w-fit items-center gap-2 text-xs uppercase tracking-[.2em] text-white/50 hover:text-white">
                  Admin workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <p className="border-t border-white/10 pt-4 text-[9px] uppercase tracking-[.23em] text-white/35">IMAGINATE — UAE</p>
          </motion.nav>
        )}
      </AnimatePresence>

      {settings.whatsapp_visible !== "false" && settings.whatsapp_number && (
        <a
          href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(settings.whatsapp_message || "Hello! I'm interested in one of your products.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_4px_20px_rgba(37,211,102,0.4)] transition-transform active:scale-90"
          style={{ backgroundColor: settings.whatsapp_color || "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}

    </div>
  );
}
