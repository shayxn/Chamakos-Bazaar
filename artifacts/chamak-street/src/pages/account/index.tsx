/* @refresh reset */
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Package, MapPin, Lock, LogOut, CheckCircle, Plus, Trash2, ChevronDown, Truck, Zap, Clock, ShoppingBag, ArrowRight, Bell, BellOff, Smartphone, X } from "lucide-react";
import { Link, useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type OrderItem = { productName: string; quantity: number; price: number; size?: string | null };
type Customer = { id: number; name: string; email: string; phone: string | null; createdAt: string };
type Order = { id: number; orderNumber: string; status: string; total: number; createdAt: string; customerAddress?: string; deliveryMethod?: string | null; items?: OrderItem[] };
type Address = { id: number; label: string; address: string; isDefault: boolean };

export const AccountContext = createContext<{ customer: Customer | null; reload: () => void }>({ customer: null, reload: () => {} });

// ── Notification onboarding card ──────────────────────────────────────────────
function NotificationOnboarding({ customer }: { customer: Customer }) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("fp_notif_dismissed") === "1");
  const [subscribing, setSubscribing] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [step, setStep] = useState<"home-screen" | "notify">("home-screen");

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    const installed = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    setIsInstalled(!!installed);
    if (installed || !ios) setStep("notify");
  }, []);

  const subscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      // Get VAPID key
      const vapidRes = await fetch(`${BASE}/api/push/vapid-public-key`, { credentials: "include" });
      if (!vapidRes.ok) return;
      const { publicKey } = await vapidRes.json() as { publicKey: string };

      // Subscribe via service worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };

      // Save subscription with customer identity
      await fetch(`${BASE}/api/push/customer-subscribe`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth, customerPhone: customer.phone ?? undefined, customerEmail: customer.email }),
      });

      // Send welcome notification via service worker
      const reg2 = await navigator.serviceWorker.ready;
      reg2.showNotification("FirstPick 🔔", {
        body: "Notifications are on!\nWe'll keep you updated on your orders, deliveries, exclusive drops, and important FirstPick updates.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    } catch { } finally { setSubscribing(false); }
  }, [customer]);

  if (dismissed || permission === "denied") return null;
  if (permission === "granted") return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
        className="mb-5 rounded-2xl border border-primary/20 overflow-hidden relative"
        style={{ background: "rgba(255,102,0,0.05)", backdropFilter: "blur(20px)" }}>
        <button onClick={() => { setDismissed(true); localStorage.setItem("fp_notif_dismissed", "1"); }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-white transition-colors z-10">
          <X className="h-4 w-4" />
        </button>

        {/* Step 1: Add to Home Screen (iOS only, not installed) */}
        {isIOS && !isInstalled && step === "home-screen" && (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-black text-sm">Add FirstPick to your Home Screen</p>
                <p className="text-xs text-muted-foreground mt-0.5">For the best experience and order notifications, add us to your home screen first.</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { n: "1", t: 'Tap the Share button (⬆️) at the bottom of Safari' },
                { n: "2", t: 'Scroll down and tap "Add to Home Screen"' },
                { n: "3", t: 'Tap "Add" in the top right corner' },
                { n: "4", t: 'Open FirstPick from your Home Screen' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                  <p className="text-xs text-muted-foreground">{s.t}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("notify")}
              className="text-xs font-bold text-primary hover:opacity-70 transition-opacity">
              I've already added it →
            </button>
          </div>
        )}

        {/* Step 2: Enable notifications */}
        {(step === "notify" || !isIOS || isInstalled) && step !== "home-screen" && (
          <div className="p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-primary animate-bounce" />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm mb-0.5">Enable Order Notifications</p>
              <p className="text-xs text-muted-foreground mb-3">Get notified when your order is shipped, out for delivery, and more.</p>
              <button onClick={subscribe} disabled={subscribing}
                className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                {subscribing ? "Setting up…" : "Enable Notifications"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Helper: VAPID base64 → Uint8Array ──────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { cls: string; label: string; dot: string }> = {
  pending:          { cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",  label: "Pending",          dot: "#facc15" },
  confirmed:        { cls: "text-blue-400 bg-blue-500/10 border-blue-500/30",        label: "Confirmed",        dot: "#60a5fa" },
  preparing:        { cls: "text-purple-400 bg-purple-500/10 border-purple-500/30",  label: "Preparing",        dot: "#c084fc" },
  packed:           { cls: "text-purple-400 bg-purple-500/10 border-purple-500/30",  label: "Packed",           dot: "#c084fc" },
  shipped:          { cls: "text-primary bg-primary/10 border-primary/30",           label: "Shipped",          dot: "#ff6600" },
  out_for_delivery: { cls: "text-orange-400 bg-orange-500/10 border-orange-500/30",  label: "Out for Delivery", dot: "#fb923c" },
  delivered:        { cls: "text-green-400 bg-green-500/10 border-green-500/30",     label: "Delivered",        dot: "#4ade80" },
  cancelled:        { cls: "text-red-400 bg-red-500/10 border-red-500/30",           label: "Cancelled",        dot: "#f87171" },
};
const getStatus = (s: string) => STATUS_STYLE[s] ?? { cls: "text-muted-foreground bg-muted border-border", label: s, dot: "#888" };

const DELIVERY_ICON: Record<string, React.ElementType> = {
  priority: Zap,
  express: Clock,
  standard: Truck,
};

// ── Single order card ─────────────────────────────────────────────────────────
function OrderCard({ o, i }: { o: Order; i: number }) {
  const [expanded, setExpanded] = useState(false);
  const st = getStatus(o.status);
  const DelivIcon = DELIVERY_ICON[o.deliveryMethod ?? ""] ?? Truck;
  const items = o.items ?? [];
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, type: "spring", stiffness: 380, damping: 32 }}
      className="rounded-2xl overflow-hidden border border-white/10"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* ── Order header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/6 flex flex-wrap items-start gap-x-4 gap-y-2 justify-between">
        <div>
          <p className="font-mono font-black text-primary text-base tracking-wide">#{o.orderNumber ?? o.id}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {new Date(o.createdAt).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {o.deliveryMethod && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-white/10 rounded-full px-2 py-0.5">
              <DelivIcon className="h-2.5 w-2.5" />
              {o.deliveryMethod === "priority" ? "Priority" : o.deliveryMethod === "express" ? "Express" : "Standard"}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${st.cls}`}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.dot }} />
            {st.label}
          </span>
        </div>
      </div>

      {/* ── Item previews ── */}
      {items.length > 0 && (
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Thumbnails */}
          <div className="flex -space-x-2">
            {items.slice(0, 4).map((item, idx) => (
              <div key={idx} className="w-12 h-12 rounded-lg border border-white/12 bg-white/5 overflow-hidden shrink-0 flex items-center justify-center"
                style={{ zIndex: items.length - idx }}>
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
            {items.length > 4 && (
              <div className="w-12 h-12 rounded-lg border border-white/12 bg-white/5 flex items-center justify-center text-[10px] font-black text-muted-foreground">
                +{items.length - 4}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{items[0]?.productName}</p>
            {itemCount > 1 && <p className="text-xs text-muted-foreground">+{itemCount - 1} more item{itemCount - 1 !== 1 ? "s" : ""}</p>}
          </div>
          <p className="font-mono font-black text-primary shrink-0">AED {o.total.toFixed(2)}</p>
        </div>
      )}

      {/* No items fallback */}
      {items.length === 0 && (
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Order total</p>
          <p className="font-mono font-black text-primary">AED {o.total.toFixed(2)}</p>
        </div>
      )}

      {/* ── Expand: full item list ── */}
      <AnimatePresence>
        {expanded && items.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/6"
          >
            <div className="px-4 py-3 space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 overflow-hidden shrink-0">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground m-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                    {item.size && <p className="text-[10px] text-muted-foreground">Size: {item.size}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-black text-primary">AED {(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ── */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-3 flex-wrap border-t border-white/6">
        {items.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide items" : `See ${items.length} item${items.length !== 1 ? "s" : ""}`}
          </button>
        )}
        <div className="ml-auto flex gap-3">
          <Link href={`/order/${o.id}`}>
            <button className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:opacity-80 transition-opacity">
              <Truck className="h-3.5 w-3.5" /> Track Order
            </button>
          </Link>
          <Link href={`/receipt/${o.id}`}>
            <button className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors">
              Receipt <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Orders list ───────────────────────────────────────────────────────────────
function OrdersList({ orders }: { orders: Order[] }) {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">Order History</p>
        {orders.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}>
          <Package className="h-14 w-14 text-muted-foreground mx-auto mb-5 opacity-20" />
          <p className="text-muted-foreground font-black uppercase tracking-wider text-sm mb-1">No orders yet</p>
          <p className="text-muted-foreground/60 text-xs mb-6">Your orders will appear here after your first purchase.</p>
          <Link href="/shop">
            <button className="px-6 py-2.5 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-xl hover:opacity-90 transition-opacity">
              Shop Now
            </button>
          </Link>
        </div>
      ) : (
        orders.map((o, i) => <OrderCard key={o.id} o={o} i={i} />)
      )}
    </motion.div>
  );
}
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const load = () => {
    fetch(`${BASE}/api/customers/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setCustomer).catch(() => setCustomer(null));
  };
  useEffect(() => { load(); }, []);
  return <AccountContext.Provider value={{ customer, reload: load }}>{children}</AccountContext.Provider>;
}

function Tab({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${active ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        <Icon className="h-4 w-4" /> {label}
      </div>
    </Link>
  );
}

export default function AccountPage() {
  const { customer, reload } = useAccount();
  const [location] = useLocation();
  const [tab, setTab] = useState<"profile" | "orders" | "addresses" | "password">("profile");

  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [addrForm, setAddrForm] = useState({ label: "Home", address: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (customer) setProfile({ name: customer.name, phone: customer.phone ?? "" });
  }, [customer]);

  useEffect(() => {
    if (tab === "orders") {
      fetch(`${BASE}/api/customers/orders`, { credentials: "include" }).then(r => r.json()).then(setOrders);
    }
    if (tab === "addresses") {
      fetch(`${BASE}/api/customers/addresses`, { credentials: "include" }).then(r => r.json()).then(setAddresses);
    }
  }, [tab]);

  const saveProfile = async () => {
    setSaving(true); setMsg("");
    const res = await fetch(`${BASE}/api/customers/me`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profile.name, phone: profile.phone || undefined }),
    });
    if (res.ok) { reload(); setMsg("Profile updated!"); }
    else setMsg("Failed to update.");
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setMsg("Passwords don't match"); return; }
    setSaving(true); setMsg("");
    const res = await fetch(`${BASE}/api/customers/change-password`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (res.ok) { setPwForm({ current: "", next: "", confirm: "" }); setMsg("Password changed!"); }
    else setMsg(data.error ?? "Failed.");
    setSaving(false);
  };

  const addAddress = async () => {
    if (!addrForm.address) return;
    await fetch(`${BASE}/api/customers/addresses`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addrForm),
    });
    setAddrForm({ label: "Home", address: "", isDefault: false });
    fetch(`${BASE}/api/customers/addresses`, { credentials: "include" }).then(r => r.json()).then(setAddresses);
  };

  const deleteAddress = async (id: number) => {
    await fetch(`${BASE}/api/customers/addresses/${id}`, { method: "DELETE", credentials: "include" });
    setAddresses(a => a.filter(x => x.id !== id));
  };

  const logout = async () => {
    await fetch(`${BASE}/api/customers/logout`, { method: "POST", credentials: "include" });
    reload();
    window.location.href = BASE + "/";
  };

  if (!customer) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <User className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-30" />
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">My Account</h2>
        <p className="text-muted-foreground mb-8">Sign in to view your orders, manage addresses, and more.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/account/login"><button className="px-6 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-xl">Sign In</button></Link>
          <Link href="/account/register"><button className="px-6 py-3 border border-border font-black uppercase tracking-widest text-sm rounded-xl text-muted-foreground hover:text-foreground transition-colors">Register</button></Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">My Account</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back, {customer.name}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-muted-foreground hover:text-destructive text-sm font-bold uppercase tracking-wider transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="space-y-1">
            {([["profile", User, "Profile"], ["orders", Package, "My Orders"], ["addresses", MapPin, "Addresses"], ["password", Lock, "Password"]] as const).map(([t, Icon, label]) => (
              <button key={t} onClick={() => { setTab(t); setMsg(""); }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left ${tab === t ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="h-4 w-4 shrink-0" /> {label}
              </button>
            ))}
          </aside>

          <div className="md:col-span-3">
            <NotificationOnboarding customer={customer} />
            {msg && <div className="mb-4 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-sm font-bold text-primary flex items-center gap-2"><CheckCircle className="h-4 w-4" />{msg}</div>}

            {tab === "profile" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Profile Information</h2>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</label>
                  <input value={customer.email} disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone</label>
                  <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60" placeholder="+971 50..." />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </motion.div>
            )}

            {tab === "orders" && (
              <OrdersList orders={orders} />
            )}

            {tab === "addresses" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Saved Addresses</h2>
                {addresses.map(a => (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black uppercase tracking-widest">{a.label}</span>
                        {a.isDefault && <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">Default</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.address}</p>
                    </div>
                    <button onClick={() => deleteAddress(a.id)} className="text-destructive hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add New Address</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (Home, Work...)"
                      className="flex-1 min-w-[140px] px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60" />
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer shrink-0">
                      <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm(f => ({ ...f, isDefault: e.target.checked }))} />
                      Set as default
                    </label>
                  </div>
                  <textarea rows={2} value={addrForm.address} onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address..."
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 resize-none" />
                  <button onClick={addAddress} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-lg hover:opacity-90">
                    <Plus className="h-3.5 w-3.5" /> Add Address
                  </button>
                </div>
              </motion.div>
            )}

            {tab === "password" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-4">Change Password</h2>
                {(["current", "next", "confirm"] as const).map((k) => (
                  <div key={k} className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {k === "current" ? "Current Password" : k === "next" ? "New Password" : "Confirm New Password"}
                    </label>
                    <input type="password" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                ))}
                <button onClick={changePassword} disabled={saving}
                  className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
