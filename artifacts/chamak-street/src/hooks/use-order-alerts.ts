import { useEffect, useRef } from "react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { announceNewOrder } from "@/lib/order-sound";
import { useToast } from "@/hooks/use-toast";

export const ORDERS_REFRESH_EVENT = "imaginate:orders-refresh";

/** COD is a purchase on placement. Ziina only when paymentStatus is exactly "paid". Never inferred from fulfilment status. */
function isPurchase(o: { paymentMethod?: string | null; paymentStatus?: string | null; status: string }) {
  if (o.status === "cancelled") return false;
  const pm = (o.paymentMethod ?? "").toLowerCase();
  if (pm.includes("ziina")) return o.paymentStatus === "paid";
  return pm === "" || pm.includes("cod") || pm.includes("cash");
}

/** Mounted once in AdminLayout (all Admin screens). Baseline = eligible purchases already present on first load / reconnect. */
export function useOrderAlerts(enabled: boolean) {
  const { toast } = useToast();
  const q = useListOrders({ query: { queryKey: getListOrdersQueryKey(), enabled, refetchInterval: 15_000, refetchOnReconnect: true } });
  const known = useRef<Set<number> | null>(null);
  const seen = useRef(new Set<number>());
  const rebase = useRef(false);
  const refetchRef = useRef(q.refetch);
  refetchRef.current = q.refetch;
  useEffect(() => {
    const online = () => { rebase.current = true; };
    const refresh = () => { void refetchRef.current(); };
    window.addEventListener("online", online);
    window.addEventListener(ORDERS_REFRESH_EVENT, refresh);
    return () => { window.removeEventListener("online", online); window.removeEventListener(ORDERS_REFRESH_EVENT, refresh); };
  }, []);
  useEffect(() => {
    const list = q.data;
    if (!list) return;
    const eligible = list.filter(isPurchase);
    if (known.current === null || rebase.current) {
      const set = known.current ?? new Set<number>();
      eligible.forEach((o) => set.add(o.id));
      known.current = set;
      list.forEach(o=>seen.current.add(o.id));
      rebase.current = false;
      return;
    }
    let n = 0;
    for (const o of eligible) {
      if (known.current.has(o.id)) continue;
      known.current.add(o.id);
      // Re-opening an existing cancelled COD order is not a new purchase.
      if (seen.current.has(o.id) && !(o.paymentMethod??"").toLowerCase().includes("ziina")) continue;
      announceNewOrder(o.id);
      n++;
    }
    list.forEach(o=>seen.current.add(o.id));
    if (n) toast({ title: "New order received", description: `${n} new order${n > 1 ? "s" : ""} confirmed.` });
  }, [q.data, toast]);
}
