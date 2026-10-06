import { useEffect, useState } from "react";
import { useGetAllSettings, useGetGlobalStoreContext, getGetGlobalStoreContextQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { fetchOperationalSettings } from "@/lib/use-settings";

const SESSION_KEY = "firstpick_loaded";
const LOADING_DURATION_MS = 3_000;
const EXIT_DURATION_MS = 200;
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export function LoadingScreen() {
  const [skip] = useState(() => {
    try {
      return /\/(?:admin|login)(?:\/|$)/.test(window.location.pathname) || !!sessionStorage.getItem(SESSION_KEY);
    } catch { return false; }
  });
  const settings = useGetAllSettings({ query: { queryKey: ["settings", "all"], staleTime: 30_000, enabled: !skip } });
  const operational = useQuery({ queryKey: ["operational-settings"], queryFn: fetchOperationalSettings, staleTime: 0, enabled: !skip, retry: 1 });
  const country = useGetGlobalStoreContext({query:{queryKey:getGetGlobalStoreContextQueryKey(),enabled:!skip,staleTime:60_000,retry:1}});
  const [routeReady, setRouteReady] = useState(() => !!(window as Window & { __firstpickRouteReady?: boolean }).__firstpickRouteReady);
  const [fontsReady, setFontsReady] = useState(false);
  const [visible, setVisible] = useState(!skip);
  const [slow, setSlow] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => { if (skip) return; const t = setTimeout(() => setMinElapsed(true), LOADING_DURATION_MS - EXIT_DURATION_MS); return () => clearTimeout(t); }, [skip]);
  useEffect(() => {
    if (skip) return;
    let mounted = true;
    const onRoute = () => setRouteReady(true);
    window.addEventListener("firstpick:route-ready", onRoute);
    // Font downloads must not hold the entire store behind a blocking overlay.
    const fontTimer = setTimeout(() => setFontsReady(true), 1_000);
    void document.fonts?.ready.then(() => { if (mounted) setFontsReady(true); });
    const slowTimer = setTimeout(() => setSlow(true), 10_000);
    return () => {
      mounted = false;
      clearTimeout(fontTimer);
      clearTimeout(slowTimer);
      window.removeEventListener("firstpick:route-ready", onRoute);
    };
  }, [skip]);
  const [leaving, setLeaving] = useState(false);
  const failed = settings.isError || operational.isError || country.isError;
  const settled = (settings.isSuccess || settings.isError) && (operational.isSuccess || operational.isError) && (country.isSuccess || country.isError);
  useEffect(() => {
    // A failed optional/location request must not permanently cover the real UI.
    // The app keeps its own honest data errors and the API still enforces store safety.
    if (skip || (!settled && !slow) || (!routeReady && !slow) || !fontsReady || !minElapsed || leaving) return;
    if (!failed && settled) { try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {} }
    setLeaving(true);
    (window as Window & { __imaginateBooted?: boolean }).__imaginateBooted = true;
    window.dispatchEvent(new Event("firstpick:boot-complete"));
  }, [skip, settled, slow, failed, routeReady, fontsReady, minElapsed, leaving]);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setVisible(false), EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [leaving]);
  useEffect(() => {
    if (skip) {
      (window as Window & { __imaginateBooted?: boolean }).__imaginateBooted = true;
      window.dispatchEvent(new Event("firstpick:boot-complete"));
    }
  }, [skip]);
  if (!visible) return !skip && failed ? (
    <div role="alert" className="fixed inset-x-3 bottom-3 z-[90] flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-black/95 p-4 text-xs text-white" data-testid="store-service-warning">
      <span>{settings.isError || operational.isError ? "Store services could not be reached. The website’s /api connection needs to be checked." : "Location preferences are unavailable. Please retry before checking out."}</span>
      <button className="rounded-lg border border-primary/50 px-3 py-2" onClick={() => window.location.reload()}>Retry connection</button>
    </div>
  ) : null;
  return (
    <div className="imaginate-boot fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-black px-6 text-center" role="status" aria-live="polite" data-leaving={leaving}>
      <div className="imaginate-boot-glow" aria-hidden="true" />
      <div className="imaginate-boot-logo relative">
        <img src={`${BASE}/imaginate-logo.png`} alt="IMAGINATE" width="256" className="relative z-10 h-auto w-56 sm:w-64 object-contain" />
        <svg className="imaginate-bolt" viewBox="0 0 200 80" aria-hidden="true">
          <polyline points="0,40 38,30 62,46 96,26 130,48 164,32 200,42" fill="none" stroke="#b79cff" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
      {(failed || slow) && (
        <>
          <p className="text-xs tracking-wide text-white/60">{failed ? "The store could not be loaded." : "Taking longer than expected."}</p>
          <button className="rounded-lg border border-primary/50 px-5 py-3 text-sm text-white hover:bg-white/5" onClick={() => window.location.reload()}>Retry loading</button>
        </>
      )}
    </div>
  );
}
