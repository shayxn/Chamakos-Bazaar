import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export function playCashSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass() as AudioContext;

    const now = ctx.currentTime;

    // High "ching" oscillator
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(1500, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.45);
    gain1.gain.setValueAtTime(0.38, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Mid ring oscillator
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2200, now);
    osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
    gain2.gain.setValueAtTime(0.22, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.start(now);
    osc2.stop(now + 0.3);

    // Drawer "click" noise burst
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1200;
    const noiseGain = ctx.createGain();
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(0.18, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.start(now + 0.02);
    noise.stop(now + 0.1);
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
    const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
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
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setSubscribed(true);
          swRegRef.current = reg;
        }
      } catch { /* ignore */ }
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
        (await navigator.serviceWorker?.getRegistration("/sw.js"));
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await fetch(`${BASE}/api/push/subscribe`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setSubscribed(false);
      setSubscribeError(null);
    } catch (err) {
      console.warn("[Push] Unsubscribe failed:", err);
    }
  }, []);

  const sendTest = useCallback(async () => {
    await fetch(`${BASE}/api/push/test`, {
      method: "POST",
      credentials: "include",
    });
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
