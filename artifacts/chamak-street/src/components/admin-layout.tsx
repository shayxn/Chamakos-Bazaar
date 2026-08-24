import AdminNamePrompt from "@/components/admin-name-prompt";
import { useGetMe, useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import {
  FileText, LayoutDashboard, Package, ShoppingBag, Layers,
  ArrowLeft, Tag, Settings, Star, Video, Globe, Search, X,
  Zap, Users, BellRing, MessageCircle, Activity, Ticket, Smartphone,
  Phone, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useAdminPushNotifications } from "@/hooks/use-admin-notifications";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const NOTIF_KEY = "firstpick_notif_asked";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
type AdminDeviceSession = {
  id: number;
  device: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
};

function NotificationDeniedBanner({ onDismiss }: { onDismiss: () => void }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMac = /macintosh/i.test(navigator.userAgent);

  let instructions = "Open your browser settings → find FirstPick → set Notifications to Allow.";
  if (isIOS) {
    instructions = "On iPhone/iPad: Open the Settings app → scroll to Safari → Advanced → Website Data, or add this site to your Home Screen first, then enable Notifications.";
  } else if (isSafari && isMac) {
    instructions = "In Safari: go to Safari menu → Settings → Websites → Notifications → find this site → set to Allow.";
  } else if (!isSafari) {
    instructions = "In Chrome/Edge: click the lock icon (🔒) in the address bar → Notifications → Allow.";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28 }}
      className="flex items-start gap-3 px-4 py-3 mx-4 mt-3 rounded-xl"
      style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
    >
      <BellRing className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wider text-red-400 mb-0.5">Notifications Blocked</p>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{instructions}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-white/20 hover:text-white/50 transition-colors mt-0.5">
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ? (
          <mark key={i} className="bg-primary/25 text-primary not-italic rounded-sm">{part}</mark>
        ) : part
      )}
    </>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const debouncedQuery = query.trim();

  const { data: products } = useListProducts(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined,
    { query: { enabled: debouncedQuery.length >= 2, staleTime: 10_000, queryKey: ["admin-search-products", debouncedQuery] } }
  );
  const { data: categories } = useListCategories({ query: { staleTime: 60_000, queryKey: ["admin-search-categories"] } });

  const filteredCategories = debouncedQuery.length >= 2
    ? (categories ?? []).filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];

  const allResults = [
    ...(products?.slice(0, 5) ?? []).map(p => ({ type: "product" as const, item: p })),
    ...filteredCategories.slice(0, 3).map(c => ({ type: "category" as const, item: c })),
  ];

  const hasResults = allResults.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)); }
      else if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, allResults.length]);

  return (
    <div ref={ref} className="relative px-3 mb-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelectedIdx(-1); }}
          onFocus={() => setOpen(true)}
          placeholder="Search products, categories…"
          className="w-full pl-8 pr-8 py-2 text-xs rounded-lg focus:outline-none transition-all duration-200 text-foreground placeholder:text-muted-foreground"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(255,102,0,0.65)")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onClick={() => { setQuery(""); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && debouncedQuery.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
            style={{ background: "rgba(12,12,12,0.97)", border: "1px solid rgba(255,102,0,0.2)", backdropFilter: "blur(12px)" }}
          >
            {!hasResults ? (
              <p className="text-xs text-muted-foreground px-4 py-3">No results for "{debouncedQuery}"</p>
            ) : (
              <>
                {allResults.map((r, i) => {
                  const isSelected = i === selectedIdx;
                  if (r.type === "product") {
                    const p = r.item as typeof products extends (infer T)[] | undefined ? T : never;
                    return (
                      <Link key={`p-${(p as {id:number}).id}`} href="/admin/products" onClick={() => { setQuery(""); setOpen(false); }}>
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-white/5"}`}
                        >
                          {(p as {imageUrl: string|null}).imageUrl ? (
                            <img src={(p as {imageUrl: string}).imageUrl} alt={(p as {name: string}).name} className="w-7 h-7 rounded object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                              <Package className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">
                              <HighlightMatch text={(p as {name:string}).name} query={debouncedQuery} />
                            </p>
                            <p className="text-[10px] text-muted-foreground">AED {Number((p as {price: number}).price).toFixed(2)}</p>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  } else {
                    const c = r.item as { id: number; name: string };
                    return (
                      <Link key={`c-${c.id}`} href="/admin/categories" onClick={() => { setQuery(""); setOpen(false); }}>
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-white/5"}`}
                        >
                          <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-bold">
                            <HighlightMatch text={c.name} query={debouncedQuery} />
                          </p>
                        </motion.div>
                      </Link>
                    );
                  }
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const sidebarVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const linkVariants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
};
const contentVariants = {
  initial: { opacity: 0, y: 14 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
  // Never hold navigation behind an exit animation. The next admin page must
  // render on the first tap, especially on mobile Safari.
  exit: { opacity: 0, y: -8, transition: { duration: 0 } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isCalls = search.includes("view=calls");
  const { data: user, isLoading } = useGetMe({ query: { retry: false, queryKey: ["auth", "me"] } });
  const { permission, subscribe } = useAdminPushNotifications();
  const { toast } = useToast();
  const [showDeniedBanner, setShowDeniedBanner] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<AdminDeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isChat = location.split("?")[0] === "/admin/chat";

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/admin/sessions`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load active devices");
      setSessions(await res.json() as AdminDeviceSession[]);
    } catch (error) {
      toast({ title: "Could not load devices", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (id: number) => {
    const res = await fetch(`${BASE}/api/auth/admin/sessions/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      toast({ title: "Could not sign out device", variant: "destructive" });
      return;
    }
    const result = await res.json() as { loggedOutCurrent?: boolean };
    if (result.loggedOutCurrent) {
      window.location.assign(`${BASE}/login`);
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== id));
    toast({ title: "Device signed out" });
  };

  const logoutOtherDevices = async () => {
    if (!window.confirm("Sign out every other active device? This device will stay signed in.")) return;
    const res = await fetch(`${BASE}/api/auth/admin/sessions/logout-others`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      toast({ title: "Could not sign out other devices", variant: "destructive" });
      return;
    }
    setSessions((current) => current.filter((session) => session.isCurrent));
    toast({ title: "Other devices signed out" });
  };

  // Show a friendly in-app pre-prompt before the browser's native dialog.
  useEffect(() => {
    if (!user?.isAdmin) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return; // hook auto-subscribes on mount
    if (Notification.permission === "denied") {
      // Already blocked — show the settings instructions banner
      if (!localStorage.getItem(NOTIF_KEY + "_denied_dismissed")) {
        setShowDeniedBanner(true);
      }
      return;
    }
    // permission === "default" and never asked yet
    if (localStorage.getItem(NOTIF_KEY)) return;
    // 800ms delay so the page finishes loading first, then show friendly modal
    const t = setTimeout(() => setShowNotifModal(true), 800);
    return () => clearTimeout(t);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.isAdmin) return;
    const key = `fp_admin_welcome_${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const timer = window.setTimeout(() => {
      toast({ title: `Welcome back, ${user.username}`, description: "Your FirstPick workspace is ready." });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [user?.id, user?.isAdmin, user?.username, toast]);

  useEffect(() => {
    if (showSessions) void loadSessions();
  }, [showSessions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative w-10 h-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              className="absolute inset-1.5 rounded-full border border-transparent border-t-yellow-400"
            />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Loading…</p>
        </motion.div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return <Redirect href="/login" />;
  }

  const allLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/basics", label: "FP Basics", icon: Layers },
    { href: "/admin/categories", label: "Categories", icon: Tag },
    { href: "/admin/visitors", label: "Live Customers", icon: Users },
    { href: "/admin/chat", label: "Chats", icon: MessageCircle },
    { href: "/admin/chat?view=calls", label: "Calls", icon: Phone },
    { href: "/admin/notifications", label: "Notifications", icon: BellRing },
    { href: "/admin/activity", label: "Activity Log", icon: Activity },
    { href: "/admin/coupons", label: "Coupons", icon: Ticket },
    { href: "/admin/site-settings", label: "Site Settings", icon: Settings },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/tiktok", label: "TikTok Videos", icon: Video },
    { href: "/admin/terms", label: "Pages & Legal", icon: FileText },
  ];

  return (
    <div className="h-[100dvh] overflow-hidden flex bg-[#000000] text-white">
      {/* ── Non-blocking notification prompt ── */}
      <AnimatePresence>
        {showNotifModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-4 bottom-4 sm:left-auto sm:right-4 sm:w-[22rem] z-[50]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-2xl p-4 space-y-4 text-left shadow-2xl"
              style={{ background: "rgba(10,10,10,0.98)", border: "1px solid rgba(255,102,0,0.22)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)" }}>
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="font-black uppercase tracking-wider text-sm">Order Alerts</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Get notified instantly when a new order comes in.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 fire-gradient border-none font-black uppercase tracking-wider"
                  onClick={async () => {
                    setShowNotifModal(false);
                    localStorage.setItem(NOTIF_KEY, "true");
                    const result = await subscribe();
                    if (result === "denied") setShowDeniedBanner(true);
                  }}
                >Allow</Button>
                <button
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white/60 transition-colors"
                  onClick={() => { setShowNotifModal(false); localStorage.setItem(NOTIF_KEY, "true"); }}
                >
                  No thanks
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSessions && (
          <motion.div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(14px)" }}
          >
            <motion.section
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10"
              style={{ background: "rgba(15,15,20,0.88)", backdropFilter: "blur(46px)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
              role="dialog"
              aria-modal="true"
              aria-label="Active admin devices"
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
                <div>
                  <p className="text-[10px] font-black tracking-[0.22em] uppercase text-primary">Account security</p>
                  <h2 className="mt-1 text-lg font-black">Active devices</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Only signed-in devices for this admin account are shown.</p>
                </div>
                <button onClick={() => setShowSessions(false)} className="p-2 rounded-full text-muted-foreground hover:text-white hover:bg-white/10" style={{ touchAction: "manipulation" }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[52dvh] overflow-y-auto p-3 space-y-2">
                {sessionsLoading ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Loading devices…</p>
                ) : sessions.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No active devices found.</p>
                ) : sessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-white/8 p-3.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.035)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0"><Smartphone className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold truncate">{session.device}</p>
                        {session.isCurrent && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">This device</span>}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground truncate">Last active {new Date(session.lastSeenAt).toLocaleString("en-AE")}</p>
                    </div>
                    {!session.isCurrent && (
                      <button onClick={() => void revokeSession(session.id)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-red-300 bg-red-500/10 hover:bg-red-500/20" style={{ touchAction: "manipulation" }}>
                        Sign out
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowSessions(false)}>Close</Button>
                <Button className="fire-gradient border-none font-black" onClick={() => void logoutOtherDevices()} disabled={sessionsLoading || sessions.length < 2}>
                  Sign out other devices
                </Button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile navigation: preserve every existing admin destination ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            className="fixed inset-0 z-[210] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close admin navigation"
              className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="relative flex h-full w-[18rem] max-w-[84vw] flex-col border-r border-[#1a1a1a] bg-[#0A0A0A] shadow-2xl"
              aria-label="Admin navigation"
            >
              <div className="flex items-center justify-between px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <div className="flex items-center gap-2.5">
                  <div className="text-orange-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2L4 14H13L11 22L21 10H12L14 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="leading-none">
                    <div className="text-sm font-bold tracking-wide text-white">FIRSTPICK</div>
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff6600]">Admin</div>
                  </div>
                </div>
                <button type="button" onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-[#161616] hover:text-white" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-3"><GlobalSearch /></div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                {allLinks.map((link) => {
                  const Icon = link.icon;
                  const active = link.href === "/admin/chat?view=calls"
                    ? isChat && isCalls
                    : link.href === "/admin/chat"
                      ? isChat && !isCalls
                      : location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <div
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium transition-colors ${active ? "bg-[#ff6600]/10 text-[#ff6600]" : "text-gray-400 hover:bg-[#111] hover:text-gray-200"}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{link.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <button type="button" onClick={() => { setMobileNavOpen(false); setShowSessions(true); }} className="m-4 flex items-center gap-3 rounded-xl border border-[#222] bg-[#111] px-3 py-3 text-left">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-500">{user.username.slice(0, 2).toUpperCase()}</span>
                <span><span className="block text-xs font-bold text-white">{user.username}</span><span className="block text-[10px] text-gray-500">Manage devices</span></span>
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex h-10 w-10 items-center justify-center rounded-xl border border-[#282828] bg-[#0f0f0f]/95 text-gray-300 shadow-xl backdrop-blur md:hidden"
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Sidebar ── */}
      <aside
        className="w-full md:w-60 flex-shrink-0 flex-col relative overflow-hidden bg-[#0A0A0A] border-r border-[#1a1a1a] hidden md:flex"
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="text-orange-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2L4 14H13L11 22L21 10H12L14 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="leading-none">
              <div className="text-white font-bold text-sm tracking-wide">FIRSTPICK</div>
              <div className="text-[#ff6600] text-[9px] font-bold tracking-[0.2em] uppercase mt-0.5">Admin</div>
            </div>
            <a href="/" target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-500 hover:text-white transition-colors">
              <Globe className="w-4 h-4" />
            </a>
          </div>

          <GlobalSearch />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-1">
          {allLinks.map((link) => {
            const Icon = link.icon;
            let isActive = false;
            if (link.href === "/admin/chat?view=calls") {
              isActive = isChat && isCalls;
            } else if (link.href === "/admin/chat") {
              isActive = isChat && !isCalls;
            } else {
              isActive = location === link.href;
            }

            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs tracking-wide cursor-pointer transition-colors ${
                    isActive ? "text-[#ff6600] bg-[#ff6600]/10" : "text-gray-400 hover:text-gray-200 hover:bg-[#111]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{link.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between cursor-pointer hover:bg-[#111] p-2 -mx-2 rounded-xl transition-colors" onClick={() => setShowSessions(true)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{user.username}</div>
                <div className="text-[10px] text-gray-500">Owner</div>
              </div>
            </div>
            <ArrowLeft className="w-3 h-3 text-gray-500 -rotate-90" />
          </div>
          
        </div>
      </aside>

      <AdminNamePrompt />

      {/* ── Main content ── */}
      <main className={`flex-1 flex flex-col min-h-0 min-w-0 bg-[#000000]`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location + (isCalls ? "-calls" : "")}
            variants={contentVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={isChat ? "flex-1 flex flex-col min-h-0 overflow-hidden p-2 md:p-4" : "p-6 md:p-8 flex-1 overflow-auto"}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
