import type { GlobalStoreContext } from "@workspace/api-client-react";

type Listener = () => void;
let ctx: GlobalStoreContext | null = null;
const listeners = new Set<Listener>();

export function setStoreContext(next: GlobalStoreContext | null) {
  ctx = next;
  listeners.forEach((l) => l());
}
export function subscribeStore(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
export function getStoreContext() { return ctx; }

/** Active conversion, or null when the shopper is in AED / rates are unavailable. */
export function getActiveRate(): { currency: string; rate: number } | null {
  if (!ctx || !ctx.enabled || ctx.country.code === "AE" || ctx.country.currency === "AED") return null;
  const rate = ctx.fx.available ? ctx.fx.rates[ctx.country.currency] : undefined;
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  return { currency: ctx.country.currency, rate };
}

export function formatAED(amount: number): string {
  return `AED ${Number(amount || 0).toFixed(2)}`;
}

/** Customer-facing price. Charges always settle in AED. */
export function formatPrice(amount: number): string {
  const a = getActiveRate();
  if (!a) return formatAED(amount);
  try {
    return `\u2248 ${new Intl.NumberFormat("en", { style: "currency", currency: a.currency }).format(Number(amount || 0) * a.rate)}`;
  } catch { return formatAED(amount); }
}
