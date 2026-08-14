import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/lib/motion-noop";
import {
  Bell, BellRing, BellOff, Check, X, Loader2, Send,
  ShoppingBag, Search, UserPlus, ShoppingCart, CreditCard, Wifi
} from "lucide-react";
import { useAdminPushNotifications } from "@/hooks/use-admin-notifications";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

interface NotifSettings {
  notif_new_orders: boolean;
  notif_searches: boolean;
  notif_new_visitors: boolean;
  notif_cart_adds: boolean;
  notif_checkout: boolean;
  notif_new_accounts: boolean;
}

const EVENT_DEFS = [
  {
    key: "notif_new_orders" as keyof NotifSettings,
    label: "New Orders",
    description: "Receive a push notification every time a customer completes an order.",
    icon: ShoppingBag,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    defaultOn: true,
  },
  {
    key: "notif_new_visitors" as keyof NotifSettings,
    label: "New Visitors",
    description: "Receive a notification when a new customer opens FirstPick.",
    icon: Wifi,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    defaultOn: false,
  },
  {
    key: "notif_searches" as keyof NotifSettings,
    label: "Customer Searches",
    description: "Receive a notification when a customer searches the site (max once per 10 min per session).",
    icon: Search,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    defaultOn: false,
  },
  {
    key: "notif_cart_adds" as keyof NotifSettings,
    label: "Add to Cart",
    description: "Receive a notification when a customer adds a product to their cart.",
    icon: ShoppingCart,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    defaultOn: false,
  },
  {
    key: "notif_checkout" as keyof NotifSettings,
    label: "Checkout Started",
    description: "Receive a notification when a customer reaches the checkout page.",
    icon: CreditCard,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    defaultOn: false,
  },
  {
    key: "notif_new_accounts" as keyof NotifSettings,
    label: "New Accounts",
    description: "Receive a notification when a new customer account is created.",
    icon: UserPlus,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/30",
    defaultOn: false,
  },
] as const;

export default function AdminNotificationSettings() {
  const { permission, subscribed, subscribeError, subscribe, unsubscribe, sendTest } = useAdminPushNotifications();
  const [settings, setSettings] = useState<NotifSettings>({
    notif_new_orders: true,
    notif_searches: false,
    notif_new_visitors: false,
    notif_cart_adds: false,
    notif_checkout: false,
    notif_new_accounts: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [subbing, setSubbing] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/visitor-sessions/notif-settings`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setSettings(s => ({ ...s, ...data })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof NotifSettings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/visitor-sessions/notif-settings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleSubscribe = async () => {
    setSubbing(true);
    await subscribe();
    setSubbing(false);
  };

  const handleUnsubscribe = async () => {
    setSubbing(true);
    await unsubscribe();
    setSubbing(false);
  };

  const handleTest = async () => {
    setTesting(true);
    await sendTest();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
    setTesting(false);
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // Running as installed PWA (added to Home Screen) — required for iOS web push
  const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const isIOSNonPWA = isIOS && !isPWA;

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
          <BellRing className="h-7 w-7 text-primary" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure real browser push notifications for admin events.
        </p>
      </motion.div>

      {/* Push enable card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, ease: EASE }}
        className="rounded-2xl border border-white/10 p-6 space-y-4"
        style={{ background: "rgba(255,255,255,0.025)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,102,0,0.12)" }}>
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-wider">Push Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {permission === "granted" && subscribed
                ? "Notifications are enabled on this device."
                : permission === "denied"
                ? "Notifications are blocked by your browser."
                : "Enable to receive real push notifications."}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            {permission === "granted" && subscribed
              ? <span className="flex items-center gap-1.5 text-xs font-black text-green-400 bg-green-400/10 border border-green-400/30 px-3 py-1.5 rounded-full whitespace-nowrap"><Check className="h-3 w-3" /> Enabled</span>
              : permission === "denied"
              ? <span className="flex items-center gap-1.5 text-xs font-black text-red-400 bg-red-400/10 border border-red-400/30 px-3 py-1.5 rounded-full whitespace-nowrap"><X className="h-3 w-3" /> Blocked</span>
              : <span className="text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1.5 rounded-full whitespace-nowrap">Not enabled</span>
            }
          </div>
        </div>

        {/* iOS non-PWA hint */}
        {isIOSNonPWA && permission !== "granted" && (
          <div className="rounded-xl p-4 text-xs leading-relaxed" style={{ background: "rgba(255,102,0,0.07)", border: "1px solid rgba(255,102,0,0.2)" }}>
            <p className="font-black text-primary mb-2">📱 iPhone / iPad — 3 quick steps</p>
            <ol className="text-white/70 space-y-1 list-none">
              <li><span className="text-primary font-black">1.</span> Tap the <strong className="text-white/90">Share</strong> button <span className="text-white/90">⎙</span> at the bottom of Safari</li>
              <li><span className="text-primary font-black">2.</span> Tap <strong className="text-white/90">"Add to Home Screen"</strong></li>
              <li><span className="text-primary font-black">3.</span> Open the <strong className="text-white/90">FirstPick</strong> icon from your Home Screen and come back to this page</li>
            </ol>
          </div>
        )}
        {/* iOS PWA — running as installed app, show normal flow */}
        {isIOS && isPWA && permission !== "granted" && (
          <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="text-green-400 font-black">✓ Running as Home Screen app — tap Enable below</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {permission === "granted" && subscribed ? (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleUnsubscribe} disabled={subbing}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-wider border border-white/10 hover:border-red-400/40 text-muted-foreground hover:text-red-400 px-4 py-2.5 rounded-xl transition-all"
              >
                {subbing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
                Disable on this device
              </motion.button>
            ) : permission === "denied" ? (
              <p className="text-xs text-muted-foreground">
                Open your browser settings and allow notifications for this site, then reload.
              </p>
            ) : isIOSNonPWA ? (
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                ↑ Follow the iPhone steps above first
              </p>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleSubscribe} disabled={subbing}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-black px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
              >
                {subbing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                {subbing ? "Enabling…" : "Enable Push Notifications"}
              </motion.button>
            )}

            {permission === "granted" && subscribed && (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleTest} disabled={testing}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-wider border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-primary px-4 py-2.5 rounded-xl transition-all"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : testSent ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Send className="h-3.5 w-3.5" />}
                {testSent ? "Test sent!" : "Send Test Notification"}
              </motion.button>
            )}
          </div>

          {/* Error feedback */}
          <AnimatePresence>
            {subscribeError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs text-red-300"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <X className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
                <span>{subscribeError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Event toggles */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ease: EASE }}
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)" }}
      >
        <div className="px-6 py-4 border-b border-white/8">
          <p className="font-black text-sm uppercase tracking-wider">Event Notifications</p>
          <p className="text-xs text-muted-foreground mt-0.5">Choose which events trigger a push notification.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {EVENT_DEFS.map((def, i) => {
              const enabled = settings[def.key];
              return (
                <motion.div
                  key={def.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.14 + i * 0.04, ease: EASE }}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${def.bg} border ${def.border}`}>
                    <def.icon className={`h-4 w-4 ${def.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{def.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(def.key)}
                    className={`relative shrink-0 w-11 h-6 rounded-full border transition-all duration-200 ${
                      enabled ? "bg-primary border-primary" : "bg-white/5 border-white/15"
                    }`}
                    aria-label={`Toggle ${def.label}`}
                  >
                    <motion.span
                      animate={{ x: enabled ? 20 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                      style={{ left: 2 }}
                    />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Save button */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex items-center gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={save} disabled={saving || loading}
          className="flex items-center gap-2 text-sm font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-black px-6 py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Saved!" : "Save Settings"}
        </motion.button>
        <AnimatePresence>
          {saved && (
            <motion.p
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="text-xs text-green-400 font-bold"
            >
              Settings saved successfully.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
