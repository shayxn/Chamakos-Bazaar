import { useSyncExternalStore } from "react";
import { formatPrice, getStoreContext, subscribeStore } from "@/lib/currency";

export function useStoreContext() {
  return useSyncExternalStore(subscribeStore, getStoreContext, getStoreContext);
}

/** Subscribes to the country store so every price rerenders on country change. */
export function Price({ v }: { v: number }) {
  useStoreContext();
  return <>{formatPrice(v)}</>;
}
