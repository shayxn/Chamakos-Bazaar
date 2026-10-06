import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { getLaunchState, getGetLaunchStateQueryKey, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLaunchClock } from "@/lib/use-launch-clock";
import { CountdownView } from "@/components/launch-panel";

type Phase = "idle" | "zero" | "black" | "reveal";
const AUTO_KEY = "imaginate_auto_catalog_done";
const doneKey = (d: number) => `imaginate_launch_done_${d}`;
const adminKey = (d: number) => `imaginate_launch_admin_${d}`;
const preKey = "imaginate_launch_preorder";
const isBooted = () => !!(window as Window & { __imaginateBooted?: boolean }).__imaginateBooted;
const lget = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const sget = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const PRE_PATHS = /^\/(?:shop|product|products|game|cart|checkout|order|orders|track)(?:\/|$)/;
const OPEN_PATHS = /^\/(?:login|admin\/login|maintenance)(?:\/|$)/;

export function LaunchSequence() {
  const c = useLaunchClock();
  const qc = useQueryClient();
  const [path, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [booted, setBooted] = useState(isBooted);
  const [, bump] = useState(0);
  const armed = useRef<number | null>(null);
  const sequenceDeadline = useRef<number | null>(null);
  const run = useRef(0);
  const retryAt = useRef(0);
  const confirming = useRef(false);
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fade = reduce ? 150 : 900;

  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000, enabled: booted && c.enabled } as never });
  const isAdmin = !!(me.data as { isAdmin?: boolean } | undefined)?.isAdmin;

  useEffect(() => {
    if (booted) return;
    if (isBooted()) { setBooted(true); return; }
    const on = () => setBooted(true);
    window.addEventListener("firstpick:boot-complete", on);
    return () => window.removeEventListener("firstpick:boot-complete", on);
  }, [booted]);

  const n = c.enabled ? c.now() : 0;
  const started = !Number.isFinite(c.startsAt) || n >= c.startsAt;
  const counting = booted && c.enabled && started && n < c.deadline && !lget(doneKey(c.deadline));
  const zeroPending = booted && c.enabled && armed.current === c.deadline && n >= c.deadline && phase === "idle" && !lget(doneKey(c.deadline));

  // Cleanup when the deadline changes or the countdown is switched off.
  useEffect(() => {
    if (sequenceDeadline.current !== null && (!c.enabled || sequenceDeadline.current !== c.deadline)) {
      armed.current = null; run.current++; retryAt.current = 0; confirming.current = false;
      sequenceDeadline.current = null;
      setPhase("idle");
    }
  }, [c.enabled, c.deadline]);

  useEffect(() => { if (counting && armed.current === null) { armed.current = c.deadline; sequenceDeadline.current = c.deadline; } });

  const adminBypass = isAdmin && c.enabled && sget(adminKey(c.deadline)) === "1";
  const preBypass = sget(preKey) === String(c.deadline) && PRE_PATHS.test(path);
  const hidden = OPEN_PATHS.test(path) || adminBypass || preBypass;

  // At estimated zero, confirm once against the fresh server clock.
  useEffect(() => {
    if (!zeroPending || confirming.current || performance.now() < retryAt.current) return;
    const deadline = armed.current as number;
    const id = run.current;
    confirming.current = true;
    void (async () => {
      let wait = 0;
      try {
        const fresh = await qc.fetchQuery({ queryKey: getGetLaunchStateQueryKey(), queryFn: () => getLaunchState(), staleTime: 0 });
        if (id !== run.current) return;
        const serverNow = Date.parse((fresh as { serverTime?: string }).serverTime ?? "");
        const cur = (fresh as { launch?: { data?: { enabled?: boolean; deadline?: string } } }).launch?.data;
        if (!cur?.enabled || Date.parse(cur.deadline ?? "") !== deadline) return; // effect above cleans up
        if (!Number.isFinite(serverNow)) { wait = 5000; return; }
        const left = deadline - serverNow;
        if (left > 0) { wait = Math.min(Math.max(left, 1000), 5000); return; }
        armed.current = null;
        try { localStorage.setItem(doneKey(deadline), "1"); } catch { /* ignore */ }
        if (OPEN_PATHS.test(window.location.pathname) || sget(adminKey(deadline)) === "1" || (sget(preKey) === String(deadline) && PRE_PATHS.test(window.location.pathname))) { bump((x) => x + 1); return; }
        setPhase("zero");
      } catch { wait = 5000; }
      finally { retryAt.current = performance.now() + wait; if (id === run.current) confirming.current = false; }
    })();
  });

  useEffect(() => {
    if (phase === "idle") return undefined;
    // Warm the catalog chunk during the three-second message, before revealing it.
    if (phase === "zero") void import("@/pages/shop").catch(() => undefined);
    const ms = phase === "zero" ? 3000 : fade;
    const t = setTimeout(() => {
      if (phase === "zero") setPhase("black");
      else if (phase === "black") {
        if (!lget(AUTO_KEY)) { try { localStorage.setItem(AUTO_KEY, "1"); } catch { /* ignore */ } navigate("/shop"); }
        setPhase("reveal");
      } else setPhase("idle");
    }, ms);
    return () => clearTimeout(t);
  }, [phase, fade]); // eslint-disable-line react-hooks/exhaustive-deps

  const showOverlay = phase !== "idle" || ((counting || zeroPending) && !hidden);
  const showAdmin = isAdmin && phase === "idle" && !hidden && counting;
  if (!showOverlay) return null;
  const inZero = phase !== "idle" || zeroPending;
  const contentOpacity = phase === "black" || phase === "reveal" ? 0 : 1;
  const remaining = c.deadline - c.now();
  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black" role="dialog" aria-modal="true" aria-label="Launch countdown"
      style={{ opacity: phase === "reveal" ? 0 : 1, transition: `opacity ${fade}ms ease`, pointerEvents: phase === "reveal" ? "none" : "auto" }} data-testid="overlay-launch">
      <div className="flex min-h-[100dvh] w-full" style={{ opacity: contentOpacity, transition: `opacity ${fade}ms ease` }}>
        <CountdownView fill data={c.data ?? {}} remaining={remaining} zero={inZero && phase !== "idle" ? true : zeroPending ? false : false}
          preOrder={c.preOrderCount > 0 && phase === "idle"}
          onPreOrder={() => { try { sessionStorage.setItem(preKey, String(c.deadline)); } catch { /* ignore */ } }} />
      </div>
      {showAdmin && (
        <button type="button" aria-label="Admin access" title="Admin access" data-testid="button-launch-admin"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 bg-white/5 text-primary transition hover:bg-white/10"
          style={{ top: "max(1rem, env(safe-area-inset-top))" }}
          onClick={() => { try { sessionStorage.setItem(adminKey(c.deadline), "1"); } catch { /* ignore */ } bump((x) => x + 1); navigate("/admin"); }}>
          <ShieldCheck className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
