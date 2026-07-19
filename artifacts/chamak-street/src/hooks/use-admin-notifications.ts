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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(`${BASE}/sw.js`, {
      scope: "/",
    });
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
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [subscribed, setSubscribed] = useState(false);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Listen for SW messages (NEW_ORDER) to play sound
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

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === "undefined") return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotifPermission);
      if (perm !== "granted") return false;

      const res = await fetch(`${BASE}/api/push/vapid-key`, {
        credentials: "include",
      });
      if (!res.ok) return false;
      const { publicKey } = (await res.json()) as { publicKey: string };

      const reg = await registerSW();
      if (!reg) return false;
      swRegRef.current = reg;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const subJson = sub.toJSON();
      await fetch(`${BASE}/api/push/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.warn("[Push] Subscribe failed:", err);
      return false;
    }
  }, []);

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

  // Auto-subscribe if already granted
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      subscribe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { permission, subscribed, subscribe, unsubscribe, sendTest };
}
