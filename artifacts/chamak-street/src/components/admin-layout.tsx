import AdminNamePrompt from "@/components/admin-name-prompt";
import { useGetMe, useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import {
  FileText, LayoutDashboard, Package, ShoppingBag, Layers,
  ArrowLeft, Tag, Settings, Star, Video, Globe, Search, X,
  Zap, Users, BellRing, MessageCircle, Activity, Ticket, Smartphone
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
        regex.test(part) ? (
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
  const { data: user, isLoading } = useGetMe({ query: { retry: false, queryKey: ["auth", "me"] } });
  const { permission, subscribe } = useAdminPushNotifications();
  const { toast } = useToast();
  const [showDeniedBanner, setShowDeniedBanner] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<AdminDeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const isChat = location.endsWith("/admin/chat");

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

  const linkGroups = [
    {
      label: "Store",
      links: [
        { href: "/admin",               label: "Dashboard",      icon: LayoutDashboard },
        { href: "/admin/products",       label: "Products",       icon: Package },
        { href: "/admin/basics",         label: "FP Basics",      icon: Layers },
        { href: "/admin/categories",     label: "Categories",     icon: Tag },
        { href: "/admin/orders",         label: "Orders",         icon: ShoppingBag },
        { href: "/admin/coupons",        label: "Coupons",        icon: Ticket },
      ],
    },
    {
      label: "Analytics",
      links: [
        { href: "/admin/visitors",       label: "Live Customers", icon: Users },
        { href: "/admin/notifications",  label: "Notifications",  icon: BellRing },
        { href: "/admin/activity",       label: "Activity Log",   icon: Activity },
        { href: "/admin/chat",           label: "Chat",           icon: MessageCircle },
      ],
    },
    {
      label: "Content",
      links: [
        { href: "/admin/site-settings", label: "Site Settings",  icon: Settings },
        { href: "/admin/reviews",        label: "Reviews",        icon: Star },
        { href: "/admin/tiktok",         label: "TikTok Videos",  icon: Video },
        { href: "/admin/terms",          label: "Pages & Legal",  icon: FileText },
      ],
    },
  ];

  return (
    <div className={`${isChat ? "h-[100dvh] overflow-hidden" : "min-h-screen"} flex flex-col md:flex-row`} style={{ background: "transparent" }}>
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

      {/* ── Sidebar ── */}
      <aside
        className={`${isChat ? "hidden" : "w-full md:w-64 flex"} shrink-0 flex-col relative overflow-hidden glass-heavy`}
        style={{ minHeight: "100vh" }}
      >
        {/* Animated accent bar on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, #ff6600 25%, #ffcc00 50%, #ff4400 75%, transparent 100%)",
            backgroundSize: "100% 300%",
            animation: "adminAccentBar 4s linear infinite",
          }}
        />

        {/* Subtle background glow blob */}
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,102,0,0.06) 0%, transparent 70%)",
            animation: "orbPulse 6s ease-in-out infinite",
          }}
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="relative p-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5 mb-1">
            <motion.div
              whileHover={{ scale: 1.12, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="relative flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
              style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)", boxShadow: "0 2px 12px rgba(255,102,0,0.45)" }}
            >
              <Zap className="h-3.5 w-3.5 text-white" />
              <div className="absolute inset-0 rounded-lg opacity-50"
                style={{ border: "1px solid rgba(255,204,0,0.8)", animation: "statusDotPulse 2s ease-in-out infinite" }} />
            </motion.div>
            <span className="font-black uppercase tracking-[0.18em] text-sm gradient-text-animate">
              FirstPick Admin
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground pl-9">@{user.username}</p>
          <button
            type="button"
            onClick={() => setShowSessions(true)}
            className="mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", touchAction: "manipulation" }}
          >
            <Smartphone className="h-3.5 w-3.5 text-primary" /> Manage devices
          </button>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="px-3 pt-3 pb-2 flex gap-2"
        >
          <Link href="/" className="flex-1">
            <Button
              variant="outline" size="sm"
              className="w-full justify-start text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:border-orange-500/40 hover:text-primary"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Store
            </Button>
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost" size="sm"
              className="px-2 text-muted-foreground hover:text-primary transition-colors"
              title="View Site"
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
          </a>
        </motion.div>

        <div className="pb-1">
          <GlobalSearch />
        </div>

        {/* Nav — staggered entrance */}
        <motion.nav
          variants={sidebarVariants}
          initial="hidden"
          animate="show"
          className="flex-1 py-2 px-3 overflow-y-auto space-y-5"
        >
          {linkGroups.map((group, gi) => (
            <motion.div key={group.label} variants={linkVariants} custom={gi}>
              <p
                className="text-[9px] uppercase tracking-[0.28em] font-black px-3 mb-2"
                style={{ animation: "adminLabelColor 5s ease-in-out infinite" }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.links.map((link, li) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;
                  return (
                    <motion.div key={link.href} variants={linkVariants} custom={li}>
                      <Link href={link.href}>
                        <motion.div
                          whileHover={!isActive ? { x: 3, backgroundColor: "rgba(255,102,0,0.08)" } : {}}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[11px] tracking-wide cursor-pointer relative overflow-hidden ${
                            isActive ? "admin-active-pill text-white" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isActive && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                                animation: "adminShimmer 2.5s ease-in-out infinite",
                              }}
                            />
                          )}
                          <Icon className="h-3.5 w-3.5 shrink-0 relative z-10" />
                          <span className="relative z-10">{link.label}</span>
                          {isActive && (
                            <motion.div
                              layoutId="admin-active-dot"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shrink-0 relative z-10"
                              style={{ boxShadow: "0 0 6px white" }}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.nav>

        {/* Bottom badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="px-4 py-3 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* System Online */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)" }}>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "#ff6600" }}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400/70">System Online</span>
          </div>

          {/* Notification status */}
          <AnimatePresence>
            {permission === "granted" && (
              <motion.div
                key="alerts-on"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" style={{ boxShadow: "0 0 6px #4ade80" }} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/70">Alerts ON</span>
              </motion.div>
            )}
            {showDeniedBanner && (
              <NotificationDeniedBanner
                key="denied-banner"
                onDismiss={() => {
                  setShowDeniedBanner(false);
                  localStorage.setItem(NOTIF_KEY + "_denied_dismissed", "true");
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </aside>

      <AdminNamePrompt />

      {/* ── Main content — animated on route change ── */}
      {(() => {
        return (
          <main
            className={`flex-1 ${isChat ? "overflow-hidden flex flex-col min-h-0" : "overflow-auto"}`}
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                variants={contentVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className={isChat ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "p-6 md:p-8"}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        );
      })()}

    </div>
  );
}
