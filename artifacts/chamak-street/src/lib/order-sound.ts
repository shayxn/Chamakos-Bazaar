import { useSyncExternalStore } from "react";
const PREF = "imaginate_order_sound";
let unlocked = false;
let ctx: AudioContext | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const announced = new Set<string>();
// Shared across tabs of the same browser so two admin tabs do not double-ring.
const CH = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("imaginate-order-sound") : null;
CH?.addEventListener("message", (e) => { if (e.data?.id) announced.add(String(e.data.id)); });

export const soundEnabled = () => { try { return localStorage.getItem(PREF) !== "off"; } catch { return true; } };
export function setSoundEnabled(on: boolean) { try { localStorage.setItem(PREF, on ? "on" : "off"); } catch { /* ignore */ } if (on) void unlockAudio(); emit(); }

export async function unlockAudio() {
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return;
  ctx = ctx ?? new C();
  try { await ctx.resume(); } catch { /* ignore */ }
  unlocked = ctx.state === "running";
  emit();
}
if (typeof window !== "undefined") {
  const once = () => { void unlockAudio(); if (unlocked) { window.removeEventListener("pointerdown", once); window.removeEventListener("keydown", once); } };
  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("keydown", once);
}

function chaChing(c: AudioContext) {
  const t = c.currentTime;
  const tone = (f: number, start: number, dur: number, type: OscillatorType, vol: number) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t + start); g.gain.exponentialRampToValueAtTime(vol, t + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur); o.start(t + start); o.stop(t + start + dur + 0.02);
  };
  tone(1318, 0, 0.18, "triangle", 0.25); // cha
  tone(2637, 0.14, 0.9, "sine", 0.3); // ching
  tone(3951, 0.14, 0.6, "sine", 0.12);
}

/** Plays once per order id, only after audio is unlocked and sound is enabled. */
export function announceNewOrder(orderId: string | number): boolean {
  const key = String(orderId);
  if (announced.has(key)) return false;
  announced.add(key);
  CH?.postMessage({ id: key });
  if (!soundEnabled() || !unlocked || !ctx || ctx.state !== "running") return false;
  chaChing(ctx);
  return true;
}

export function useOrderSound() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => `${unlocked}|${soundEnabled()}`);
}
