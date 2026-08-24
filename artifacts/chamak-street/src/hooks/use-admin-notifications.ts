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
  if (!response.ok) throw new Error("Failed to enable chat notifications for this browser.");
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
    // scope must not exceed the SW file's own directory — use BASE_URL (e.g. /chamak-street/ in dev, / in prod)
    const swScope = import.meta.env.BASE_URL || "/";
    const reg = await navigator.serviceWorker.register(swUrl, { scope: swScope });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn("[Push] SW registration failed:", err);
    return null;
  }
}

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

export function useAdminPushNotifications() {
  const [permission, setPermission] = useState<NotifPermission>(
    typeof Notification !== "undefined" ? (Notification.permission as NotifPermission) : "unsupported"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Listen for SW messages (NEW_ORDER) to play the cash register sound
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NEW_ORDER") {
        playCashSound();
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // Quick local check — reads browser PushManager without hitting the server
  // so the UI shows "Enabled" immediately on revisit instead of after async fetch
  useEffect(() => {
    const quickCheck = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      try {
        const reg = await navigator.serviceWorker.getRegistration(`${BASE}/sw.js`);
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await syncAdminChatSubscription(sub);
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
    try {
      const res = await fetch(`${BASE}/api/push/vapid-key`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status} — are you logged in as admin?`);
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

      const subJson = sub.toJSON();
      const saveRes = await fetch(`${BASE}/api/push/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to save subscription on the server.");
      await syncAdminChatSubscription(sub);

      setSubscribed(true);
      setSubscribeError(null);
      return true;
    } catch (err: any) {
      console.warn("[Push] Subscribe failed:", err);
      setSubscribeError(err?.message || "Unknown error — check browser console.");
      return false;
    }
  }, []);

  // Request browser permission and subscribe if granted
  const subscribe = useCallback(async (): Promise<NotifPermission> => {
    if (typeof Notification === "undefined") {
      setSubscribeError("This browser does not support push notifications.");
      return "unsupported";
    }
    try {
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
            new Notification("FirstPick Admin 🔔", {
              body: "Notifications are on! You'll now receive real-time updates for new orders, customer activity, and important FirstPick alerts.",
              icon: "/favicon.ico",
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
    try {
      const reg =
        swRegRef.current ||
        (await navigator.serviceWorker?.getRegistration(`${BASE}/sw.js`));
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
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
      console.warn("[Push] Unsubscribe failed:", err);
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

  return { permission, subscribed, subscribeError, subscribe, subscribeAfterGrant, unsubscribe, sendTest };
}
