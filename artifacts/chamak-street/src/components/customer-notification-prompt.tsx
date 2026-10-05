import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing, X } from "lucide-react";
import { useGetMe, getGetMeQueryKey, useGetCustomerNotificationPreferences, getGetCustomerNotificationPreferencesQueryKey } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const COOLDOWN_KEY = "imaginate_notif_not_now_until";
const COOLDOWN_MS = 7 * 24 * 3600 * 1000;
export const OPEN_NOTIFICATION_SETTINGS = "imaginate:open-notification-settings";

type Prefs = { marketingEnabled: boolean; orderUpdatesEnabled: boolean };
const booted = () => !!(window as Window & { __imaginateBooted?: boolean }).__imaginateBooted;

function b64(key: string) {
  const pad = "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? (await navigator.serviceWorker.register(`${BASE}/sw.js`));
}
async function postSubscription(sub: PushSubscription, prefs: Prefs) {
  const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const r = await fetch(`${BASE}/api/customer-notifications/subscribe`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, consent: true, marketingEnabled: prefs.marketingEnabled, orderUpdatesEnabled: prefs.orderUpdatesEnabled }),
  });
  if (!r.ok) throw new Error(await backendMessage(r, "Your subscription could not be saved. Please try again."));
}
async function backendMessage(r: Response, fallback: string) {
  try { const j = (await r.json()) as { error?: string; message?: string }; return j.error || j.message || fallback; } catch { return fallback; }
}

export function CustomerNotificationPrompt() {
  const [location] = useLocation();
  const qc = useQueryClient();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });
  const [ready, setReady] = useState(booted);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ marketingEnabled: false, orderUpdatesEnabled: true });
  const lastFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const blocked = !!user?.isAdmin || /^\/(?:admin|login|maintenance)(?:\/|$)/.test(location);
  const automaticBlocked=blocked||/^\/(?:cart|checkout|order|receipt|account\/(?:login|register))(?:\/|$)/.test(location);
  const server = useGetCustomerNotificationPreferences({ query: { queryKey: getGetCustomerNotificationPreferencesQueryKey(), enabled: ready && !blocked, retry: false, staleTime: 60_000 } });
  const serverPrefs = server.data as (Prefs & { subscribed?: boolean }) | undefined;
  const subscribed = serverPrefs?.subscribed === true;

  useEffect(() => {
    if (ready) return;
    const on = () => setReady(true);
    if(booted())on();
    window.addEventListener("firstpick:boot-complete", on);
    return () => window.removeEventListener("firstpick:boot-complete", on);
  }, [ready]);

  // Only a real server subscription may overwrite the form; unsubscribed defaults must not clobber the opt-in defaults.
  useEffect(() => {
    if (serverPrefs?.subscribed === true) setPrefs({ marketingEnabled: !!serverPrefs.marketingEnabled, orderUpdatesEnabled: !!serverPrefs.orderUpdatesEnabled });
  }, [serverPrefs?.subscribed, serverPrefs?.marketingEnabled, serverPrefs?.orderUpdatesEnabled]);

  // Automatic first-time prompt, never blocking, never before boot, honours the 7-day cooldown.
  useEffect(() => {
    if (!ready || automaticBlocked || !server.isFetched || subscribed) return;
    let until = 0;
    try { until = Number(localStorage.getItem(COOLDOWN_KEY) || 0); } catch { /* ignore */ }
    if (Date.now() < until) return;
    if ("Notification" in window && Notification.permission === "denied") return;
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [ready, automaticBlocked, server.isFetched, subscribed,location]);
  useEffect(()=>{if(automaticBlocked&&!manual)setOpen(false);},[automaticBlocked,manual]);

  useEffect(() => {
    const on = () => { lastFocus.current = document.activeElement as HTMLElement | null; setManual(true); setOpen(true); };
    window.addEventListener(OPEN_NOTIFICATION_SETTINGS, on);
    return () => window.removeEventListener(OPEN_NOTIFICATION_SETTINGS, on);
  }, []);

  // On order routes re-associate an EXISTING customer subscription only. Requires the server to confirm
  // subscribed === true with loaded preferences; never creates a subscription or prompts.
  useEffect(() => {
    if (!ready || blocked || !/^\/order\//.test(location) || !server.isSuccess || serverPrefs?.subscribed !== true) return;
    if (!pushSupported() || Notification.permission !== "granted") return;
    const p = { marketingEnabled: !!serverPrefs.marketingEnabled, orderUpdatesEnabled: !!serverPrefs.orderUpdatesEnabled };
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) await postSubscription(sub, p);
      } catch { /* silent */ }
    })();
  }, [location, server.isSuccess, serverPrefs?.subscribed]); // eslint-disable-line react-hooks/exhaustive-deps

  const iosNeedsInstall = isIos() && !isStandalone();
  const supported = pushSupported() && !iosNeedsInstall;

  const close = useCallback((notNow: boolean) => {
    if (notNow && !manual) { try { localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS)); } catch { /* ignore */ } }
    setOpen(false); setManual(false); setMsg(null);
    lastFocus.current?.focus?.();
  }, [manual]);

  

  const editingExisting = subscribed;
  const noTopics = !prefs.marketingEnabled && !prefs.orderUpdatesEnabled;

  const savePrefs = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${BASE}/api/customer-notifications/preferences`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) });
      if (!r.ok) throw new Error(await backendMessage(r, "Preferences could not be saved."));
      await qc.invalidateQueries({ queryKey: getGetCustomerNotificationPreferencesQueryKey() });
      setMsg({ ok: true, text: "Preferences saved." });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  const allow = () => {
    if (editingExisting) { void savePrefs(); return; }
    if (noTopics) { setMsg({ ok: false, text: "Choose at least one type of notification." }); return; }
    // Permission must be requested synchronously inside the click handler (Safari keeps the user gesture only then).
    const permissionPromise = Notification.requestPermission();
    setBusy(true); setMsg(null);
    void (async () => {
      try {
        const perm = await permissionPromise;
        if (perm !== "granted") throw new Error("Notifications were not allowed in your browser settings.");
        const vr = await fetch(`${BASE}/api/push/vapid-public-key`, { credentials: "include" });
        if (!vr.ok) throw new Error(await backendMessage(vr, vr.status === 503 ? "Notifications are not configured on this store yet." : "Notifications are unavailable right now."));
        const { publicKey } = (await vr.json()) as { publicKey: string };
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) }));
        await postSubscription(sub, prefs);
        await qc.invalidateQueries({ queryKey: getGetCustomerNotificationPreferencesQueryKey() });
        setMsg({ ok: true, text: "Subscription saved on this device." });
        setTimeout(() => close(false), 1600);
      } catch (e) {
        setMsg({ ok: false, text: (e as Error).message || "Something went wrong." });
      } finally { setBusy(false); }
    })();
  };

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if(manual)el?.querySelector<HTMLElement>("input,button")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(true); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, close,manual]);

  if (!open || blocked) return null;
  const row = "flex items-start gap-3 text-left text-sm text-white/80";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 sm:justify-end sm:p-6" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <section ref={dialogRef} role="dialog" aria-modal="false" aria-labelledby="notif-title" aria-describedby="notif-desc" data-testid="dialog-customer-notifications" className="glass-modal pointer-events-auto w-full max-w-md rounded-3xl p-5 sm:p-6" style={{ animation: "stagger-up .4s cubic-bezier(.16,1,.3,1) both" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10"><BellRing className="h-5 w-5 text-primary" /></div>
          <button aria-label="Close" className="rounded-full p-1.5 text-white/60 hover:text-white" onClick={() => close(true)}><X className="h-4 w-4" /></button>
        </div>
        <h2 id="notif-title" className="mt-3 text-xl font-bold text-white">Want notifications?</h2>
        <p id="notif-desc" className="mt-2 text-sm leading-relaxed text-white/65">Get notified about your order status, shipping and delivery updates, new drops, restocks, pre-orders, exclusive releases, important store updates, and occasional Imaginate news.</p>
        <div className="mt-4 space-y-3">
          <label className={row}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#b79cff]" checked={prefs.orderUpdatesEnabled} onChange={(e) => setPrefs({ ...prefs, orderUpdatesEnabled: e.target.checked })} data-testid="checkbox-order-updates" /><span>Order updates<span className="block text-xs text-white/50">Status, shipping and delivery for your orders.</span></span></label>
          <label className={row}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#b79cff]" checked={prefs.marketingEnabled} onChange={(e) => setPrefs({ ...prefs, marketingEnabled: e.target.checked })} data-testid="checkbox-marketing" /><span>Drops, restocks and news<span className="block text-xs text-white/50">At most 5 per week. You can turn this off at any time.</span></span></label>
        </div>
        {!editingExisting && iosNeedsInstall && <p className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white/70">On iPhone and iPad, notifications work after you add Imaginate to your Home Screen: tap Share, then Add to Home Screen, and open it from there.</p>}
        {!editingExisting && !iosNeedsInstall && !pushSupported() && <p className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white/70">This browser does not support web notifications.</p>}
        <a href={`${BASE}/install`} target="_blank" rel="noreferrer" className="mt-3 block text-xs text-[#c4adff] underline underline-offset-4" data-testid="link-install-guide">How to install and allow notifications on iPhone and Android</a>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm ${msg.ok ? "text-primary" : "text-red-300"}`}>{msg.text}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button className="flex-1 rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-40" disabled={busy || (!editingExisting && !supported)} onClick={allow} data-testid="button-allow-notifications">{busy ? "Working" : editingExisting ? "SAVE PREFERENCES" : "ALLOW NOTIFICATIONS"}</button>
          <button className="flex-1 rounded-full border border-white/20 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white/80 hover:bg-white/10" onClick={() => close(true)} data-testid="button-not-now">{manual ? "CLOSE" : "NOT NOW"}</button>
        </div>
      </section>
    </div>
  );
}
