import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetLaunchState, getGetLaunchStateQueryKey } from "@workspace/api-client-react";

export type LaunchData = {
  enabled?: boolean; startsAt?: string; deadline?: string; headline?: string; text?: string; imageUrl?: string; videoUrl?: string;
};
const TZ = /(?:Z|[+-]\d{2}:\d{2})$/;
const parse = (v?: string) => (v && TZ.test(v) ? Date.parse(v) : NaN);
let sharedSync: { responseAt:number;serverTime:string;serverMs:number;monotonicMs:number }|undefined;

/** Share each response's monotonic anchor, so cached data cannot restart time on route remount. */
export function useLaunchClock() {
  const q = useGetLaunchState({ query: { queryKey: getGetLaunchStateQueryKey(), refetchInterval: 60_000, refetchOnWindowFocus: true, staleTime: 15_000, retry: 1 } as never });
  const state = q.data as { serverTime?: string; launch?: { title?: string; data?: LaunchData } | null; preOrderCount?: number } | undefined;
  const sync = useMemo(() => {
    const serverTime=state?.serverTime??"",serverMs=Date.parse(serverTime);
    if(!Number.isFinite(serverMs))return {serverMs:NaN,monotonicMs:performance.now()};
    if(!sharedSync||sharedSync.responseAt!==q.dataUpdatedAt||sharedSync.serverTime!==serverTime)
      sharedSync={responseAt:q.dataUpdatedAt,serverTime,serverMs,monotonicMs:performance.now()};
    return sharedSync;
  }, [state?.serverTime, q.dataUpdatedAt]);
  const [, setTick] = useState(0);
  const data = state?.launch?.data;
  const startsAt = parse(data?.startsAt);
  const deadline = parse(data?.deadline);
  const enabled = !!data?.enabled && Number.isFinite(deadline) && Number.isFinite(sync.serverMs);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [enabled]);
  // A device clock adjustment after synchronization must not jump the countdown.
  const now = useCallback(() => sync.serverMs + performance.now() - sync.monotonicMs, [sync]);
  return useMemo(() => ({
    isLoading: q.isLoading, data, title: state?.launch?.title, enabled, startsAt, deadline,
    preOrderCount: state?.preOrderCount ?? 0, now,
  }), [q.isLoading, data, state?.launch?.title, state?.preOrderCount, enabled, startsAt, deadline, now]);
}
