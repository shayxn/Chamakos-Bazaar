import { useEffect, useState } from "react";
import { useGetAllSettings } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { fetchOperationalSettings } from "@/lib/use-settings";

const SESSION_KEY = "firstpick_loaded";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export function LoadingScreen() {
  const [skip] = useState(() => {
    try {
      return /\/(?:admin|login)(?:\/|$)/.test(window.location.pathname) || !!sessionStorage.getItem(SESSION_KEY);
    } catch { return false; }
  });
  const settings = useGetAllSettings({ query: { queryKey: ["settings", "all"], staleTime: 30_000, enabled: !skip } });
  const operational = useQuery({ queryKey: ["operational-settings"], queryFn: fetchOperationalSettings, staleTime: 0, enabled: !skip, retry: 1 });
  const [routeReady, setRouteReady] = useState(() => !!(window as Window & { __firstpickRouteReady?: boolean }).__firstpickRouteReady);
  const [fontsReady, setFontsReady] = useState(false);
  const [visible, setVisible] = useState(!skip);
  const [slow, setSlow] = useState(false);
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
  useEffect(() => {
    if (skip || !settings.isSuccess || !operational.isSuccess || !routeReady || !fontsReady) return;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    setVisible(false);
    window.dispatchEvent(new Event("firstpick:boot-complete"));
  }, [skip, settings.isSuccess, operational.isSuccess, routeReady, fontsReady]);

  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (visible || skip) return;
    setLeaving(false);
  }, [visible, skip]);
  if (!visible) return null;
  const failed = settings.isError || operational.isError;
  return (
    <div className="imaginate-boot fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-black px-6 text-center" role="status" aria-live="polite" data-leaving={leaving}>
      <div className="imaginate-boot-glow" aria-hidden="true" />
      <div className="imaginate-boot-logo relative">
        <img src={`${BASE}/imaginate-logo.png`} alt="IMAGINATE" width="200" className="relative z-10 h-auto w-44 object-contain" />
        <svg className="imaginate-bolt" viewBox="0 0 200 80" aria-hidden="true">
          <polyline points="0,40 38,30 62,46 96,26 130,48 164,32 200,42" fill="none" stroke="#c4a7ff" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
      {(failed || slow) && (
        <>
          <p className="text-xs tracking-wide text-white/60">{failed ? "The store could not be loaded." : "Taking longer than expected."}</p>
          <button className="rounded-lg border border-[rgba(124,58,237,0.5)] px-5 py-3 text-sm text-white hover:bg-white/5" onClick={() => window.location.reload()}>Retry loading</button>
        </>
      )}
    </div>
  );
}
