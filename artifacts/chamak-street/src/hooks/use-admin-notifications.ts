import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function syncAdminChatSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const response = await fetch(`${BASE}/api/admin/chat/push-subscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Failed to enable chat notifications for this browser.");
  }
}

async function syncAdminDeviceSubscription(subscription: PushSubscription) {
  const response = await fetch(`${BASE}/api/push/subscribe`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint, keys: subscription.toJSON().keys }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Could not save this device's order notifications.");
  }
  await syncAdminChatSubscription(subscription);
}

export function playCashSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass() as AudioContext;
    const now = ctx.currentTime;

    // ── "CHA" — mechanical register key strike ─────────────────────────────
    // Low thump: simulates the key/lever hitting the register mechanism
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.type = "sine";
    thump.frequency.setValueAtTime(190, now);
    thump.frequency.exponentialRampToValueAtTime(55, now + 0.065);
    thumpGain.gain.setValueAtTime(0.55, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    thump.start(now);
    thump.stop(now + 0.065);

    // Clatter noise burst: mechanical rattle of the drawer mechanism
    const clatterBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.055), ctx.sampleRate);
    const clatterData = clatterBuf.getChannelData(0);
    for (let i = 0; i < clatterData.length; i++) clatterData[i] = Math.random() * 2 - 1;
    const clatter = ctx.createBufferSource();
    clatter.buffer = clatterBuf;
    const clatterFilter = ctx.createBiquadFilter();
    clatterFilter.type = "bandpass";
    clatterFilter.frequency.value = 900;
    clatterFilter.Q.value = 0.7;
    const clatterGain = ctx.createGain();
    clatter.connect(clatterFilter);
    clatterFilter.connect(clatterGain);
    clatterGain.connect(ctx.destination);
    clatterGain.gain.setValueAtTime(0.45, now);
    clatterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    clatter.start(now);
    clatter.stop(now + 0.055);

    // ── "CHING" — metallic bell ring, delayed 35 ms after the strike ───────
    // Primary bell: E7 (2637 Hz) — classic cash-register pitch
    const RING = now + 0.035;

    const bell1 = ctx.createOscillator();
    const bellGain1 = ctx.createGain();
    bell1.connect(bellGain1);
    bellGain1.connect(ctx.destination);
    bell1.type = "sine";
    bell1.frequency.setValueAtTime(2637, RING);
    bellGain1.gain.setValueAtTime(0, RING);
    bellGain1.gain.linearRampToValueAtTime(0.38, RING + 0.012);
    bellGain1.gain.exponentialRampToValueAtTime(0.001, RING + 1.5);
    bell1.start(RING);
    bell1.stop(RING + 1.5);

    // Second partial: slightly detuned to create the characteristic shimmer beating
    const bell2 = ctx.createOscillator();
    const bellGain2 = ctx.createGain();
    bell2.connect(bellGain2);
    bellGain2.connect(ctx.destination);
    bell2.type = "sine";
    bell2.frequency.setValueAtTime(2756, RING); // ~minor 3rd above — creates shimmer
    bellGain2.gain.setValueAtTime(0, RING);
    bellGain2.gain.linearRampToValueAtTime(0.24, RING + 0.012);
    bellGain2.gain.exponentialRampToValueAtTime(0.001, RING + 1.1);
    bell2.start(RING);
    bell2.stop(RING + 1.1);

    // Octave overtone: E8 (5274 Hz) — adds the bright "ting" brightness on attack
    const bell3 = ctx.createOscillator();
    const bellGain3 = ctx.createGain();
    bell3.connect(bellGain3);
    bellGain3.connect(ctx.destination);
    bell3.type = "triangle";
    bell3.frequency.setValueAtTime(5274, RING);
    bellGain3.gain.setValueAtTime(0, RING);
    bellGain3.gain.linearRampToValueAtTime(0.17, RING + 0.008);
    bellGain3.gain.exponentialRampToValueAtTime(0.001, RING + 0.5);
    bell3.start(RING);
    bell3.stop(RING + 0.5);
  } catch {
    /* ignore */
  }
}

// Returns an ArrayBuffer suitable for pushManager.subscribe applicationServerKey
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output.buffer;
}

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const swUrl = `${BASE}/sw.js`;
    // scope must not exceed the SW file's own directory — use BASE_URL (e.g. /<artifact-base>/ in dev, / in prod)
    const swScope = import.meta.env.BASE_URL || "/";
    const reg = await navigator.serviceWorker.register(swUrl, { scope: swScope });
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Notification setup timed out. Reload this page and try again.")), 15_000)),
    ]);
    return reg;
  } catch (err) {
    console.warn("[Push] SW registration failed:", err);
    return null;
  }
}

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";
const PUSH_OPT_OUT = "imaginate_admin_push_disabled";
function optedOut() { return localStorage.getItem(PUSH_OPT_OUT) === "true"; }

export function useAdminPushNotifications() {
  const [permission, setPermission] = useState<NotifPermission>(
    typeof Notification !== "undefined" ? (Notification.permission as NotifPermission) : "unsupported"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const subscribing = useRef<Promise<boolean> | null>(null);

  // Listen for SW messages (NEW_ORDER) to play the cash register sound
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NEW_ORDER") {
        // Never ring from the push payload: ask the order list, which knows COD vs paid Ziina.
        window.dispatchEvent(new Event("imaginate:orders-refresh"));
      }
      if (event.data?.type === "ADMIN_CHAT") window.dispatchEvent(new Event("imaginate:chat-refresh"));
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // Quick local check — reads browser PushManager without hitting the server
  // so the UI shows "Enabled" immediately on revisit instead of after async fetch
  useEffect(() => {
    const quickCheck = async () => {
      if (optedOut()) return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      try {
        const reg = await navigator.serviceWorker.getRegistration(`${BASE}/sw.js`);
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await syncAdminDeviceSubscription(sub);
          setSubscribed(true);
          setSubscribeError(null);
          swRegRef.current = reg;
        }
      } catch (error) {
        setSubscribed(false);
        setSubscribeError(error instanceof Error ? error.message : "Chat notifications need to be enabled again.");
      }
    };
    quickCheck();
  }, []);

  // Subscribe to push after permission is already granted (no dialog needed)
  const subscribeAfterGrant = useCallback(async (): Promise<boolean> => {
    if (optedOut()) { setSubscribed(false); return false; }
    if (subscribing.current) return subscribing.current;
    const operation = async () => { try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push is not available here. On iPhone or iPad, add IMAGINATE to the Home Screen and open it there.");
      }
      const res = await fetch(`${BASE}/api/push/vapid-key`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Notification setup failed (${res.status}).`);
      }
      const { publicKey } = (await res.json()) as { publicKey: string };

      const reg = await registerSW();
      if (!reg) throw new Error("Service worker could not be registered in this browser.");
      swRegRef.current = reg;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey),
        }));

      if (optedOut()) return false;
      await syncAdminDeviceSubscription(sub);
      if (optedOut()) return false;

      setSubscribed(true);
      setSubscribeError(null);
      return true;
    } catch (err: any) {
      setSubscribed(false);
      console.warn("[Push] Subscribe failed:", err);
      setSubscribeError(err?.message || "Unknown error — check browser console.");
      return false;
    }};
    subscribing.current = operation();
    try { return await subscribing.current; } finally { subscribing.current = null; }
  }, []);

  // Request browser permission and subscribe if granted
  const subscribe = useCallback(async (): Promise<NotifPermission> => {
    if (typeof Notification === "undefined") {
      setSubscribeError("This browser does not support push notifications.");
      return "unsupported";
    }
    try {
      localStorage.removeItem(PUSH_OPT_OUT);
      setSubscribeError(null);
      const perm = await Notification.requestPermission();
      setPermission(perm as NotifPermission);
      if (perm === "granted") {
        const ok = await subscribeAfterGrant();
        if (!ok) {
          // subscribeAfterGrant already set subscribeError
        } else {
          // Confirmation notification — fires immediately after permission granted
          try {
            await swRegRef.current?.showNotification("IMAGINATE Admin", {
              body: "Notifications are on. You'll receive real-time updates for new orders, customer activity, and important IMAGINATE alerts.",
              icon: `${BASE}/imaginate-icon-192.png`,
              tag: "fp-notifications-enabled",
            });
          } catch { /* ignore if service worker context blocks direct Notification */ }
        }
      } else if (perm === "denied") {
        setSubscribeError("Notifications were blocked. Open browser settings and allow notifications for this site.");
      }
      return perm as NotifPermission;
    } catch (err: any) {
      console.warn("[Push] requestPermission failed:", err);
      const msg = err?.message || String(err);
      setSubscribeError(
        msg.includes("secure origin")
          ? "Notifications require HTTPS."
          : "Could not request notification permission — is this running as a PWA?"
      );
      return "denied";
    }
  }, [subscribeAfterGrant]);

  const unsubscribe = useCallback(async () => {
    const previousOptOut = localStorage.getItem(PUSH_OPT_OUT);
    try {
      localStorage.setItem(PUSH_OPT_OUT, "true");
      if (subscribing.current) await subscribing.current;
      const reg =
        swRegRef.current ||
        (await navigator.serviceWorker?.getRegistration(`${BASE}/sw.js`));
      if (!reg) { setSubscribed(false); return; }
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setSubscribed(false); return; }
      await fetch(`${BASE}/api/push/subscribe`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).then(async response => {
        if (!response.ok) throw new Error("Could not remove this browser's notification subscription.");
      });
      await fetch(`${BASE}/api/admin/chat/push-subscribe`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).then(async response => {
        if (!response.ok) throw new Error("Could not remove this browser's chat notification subscription.");
      });
      await sub.unsubscribe();
      setSubscribed(false);
      setSubscribeError(null);
    } catch (err) {
      if (previousOptOut === null) localStorage.removeItem(PUSH_OPT_OUT);
      else localStorage.setItem(PUSH_OPT_OUT, previousOptOut);
      console.warn("[Push] Unsubscribe failed:", err);
      setSubscribeError(err instanceof Error ? err.message : "Could not disable this device's notifications.");
    }
  }, []);

  const sendTest = useCallback(async (): Promise<void> => {
    const reg =
      swRegRef.current ||
      (await navigator.serviceWorker?.getRegistration(`${BASE}/sw.js`));
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) throw new Error("Enable notifications in this browser before sending a test.");
    const res = await fetch(`${BASE}/api/push/test`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(data?.error || `Test notification failed (${res.status})`);
    }
  }, []);

  // Auto-subscribe silently if permission already granted (returning admins)
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      subscribeAfterGrant();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refresh = () => {
      if (typeof Notification === "undefined" || document.visibilityState === "hidden") return;
      setPermission(Notification.permission as NotifPermission);
      if (Notification.permission === "granted") void subscribeAfterGrant();
      else setSubscribed(false);
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("imaginate:push-config-saved", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("imaginate:push-config-saved", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [subscribeAfterGrant]);

  return { permission, subscribed, subscribeError, subscribe, subscribeAfterGrant, unsubscribe, sendTest };
}
