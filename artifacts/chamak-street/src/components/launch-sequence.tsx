import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAllSettings, getLaunchState, getListProductsQueryKey, getGetLaunchStateQueryKey, listProducts } from "@workspace/api-client-react";
import { useLaunchClock } from "@/lib/use-launch-clock";
import { fetchOperationalSettings } from "@/lib/use-settings";

type Phase = "idle" | "blackout" | "video" | "fading-video" | "black" | "message" | "reveal";
const seenKey = (d: number) => `imaginate_launch_seen_${d}`;
const isBooted = () => !!(window as Window & { __imaginateBooted?: boolean }).__imaginateBooted;
const FADE = 900;

/**
 * Plays once, only for visitors who watch the countdown reach zero in this session.
 * Late/repeat visitors never see it. Readiness is real: settings, operational settings,
 * products and launch state must all load successfully before the store is revealed.
 */
export function LaunchSequence() {
  const c = useLaunchClock();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [booted, setBooted] = useState(isBooted);
  const [needsTap, setNeedsTap] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const armed = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeVideo=useRef<string|undefined>(undefined);
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fade = reduce ? 150 : FADE;

  useEffect(() => {
    if (booted) return;
    // A skipped loader can finish in an earlier sibling effect before this listener mounts.
    if(isBooted()){setBooted(true);return;}
    const on = () => setBooted(true);
    window.addEventListener("firstpick:boot-complete", on);
    return () => window.removeEventListener("firstpick:boot-complete", on);
  }, [booted]);

  // Arm only when the countdown is genuinely still running as we observe it after boot.
  useEffect(() => {
    if (!booted || !c.enabled) { armed.current=null;return; }
    if (armed.current !== null && armed.current !== c.deadline) armed.current=null;
    if (armed.current === c.deadline) return;
    const n = c.now();
    const started = !Number.isFinite(c.startsAt) || n >= c.startsAt;
    let seen = false;
    try { seen = !!localStorage.getItem(seenKey(c.deadline)); } catch { /* ignore */ }
    if (started && n < c.deadline && !seen) armed.current = c.deadline;
  });

  // At estimated zero, confirm against the real server clock before launching.
  const confirming = useRef(false);
  useEffect(() => {
    if (phase !== "idle" || armed.current === null || confirming.current) return;
    const deadline = armed.current;
    if (c.now() < deadline) return;
    confirming.current = true;
    void (async () => {
      try {
        const fresh = await qc.fetchQuery({ queryKey: getGetLaunchStateQueryKey(), queryFn: () => getLaunchState(), staleTime: 0 });
        const serverNow = Date.parse((fresh as { serverTime?: string }).serverTime ?? "");
        const current=(fresh as {launch?:{data?:{enabled?:boolean;deadline?:string;videoUrl?:string}}}).launch?.data;
        if(!current?.enabled||Date.parse(current.deadline??"")!==deadline){armed.current=null;return;}
        if (!Number.isFinite(serverNow)) return;
        const left = deadline - serverNow;
        if (left > 0) { await new Promise((r) => setTimeout(r, Math.min(left, 5000))); return; }
        try { localStorage.setItem(seenKey(deadline), "1"); } catch { /* ignore */ }
        activeVideo.current=current.videoUrl;
        armed.current = null;
        setPhase("blackout");
      } catch { /* network error: stay idle and retry on next tick */ await new Promise((r) => setTimeout(r, 2000)); }
      finally { confirming.current = false; }
    })();
  });

  const next = useCallback(() => setPhase((p) => (p === "video" ? "fading-video" : p)), []);

  useEffect(() => {
    if (phase === "blackout") {
      const t = setTimeout(() => { setVideoFailed(false); setNeedsTap(false); setPhase(activeVideo.current ? "video" : "message"); }, fade);
      return () => clearTimeout(t);
    }
    if (phase === "fading-video") {
      const t = setTimeout(() => setPhase("black"), fade);
      return () => clearTimeout(t);
    }
    if (phase === "black") {
      const t = setTimeout(() => { setPrepError(null); setPhase("message"); }, fade);
      return () => clearTimeout(t);
    }
    if (phase === "message") {
      let cancelled = false;
      setPrepError(null);
      void (async () => {
        try {
          await Promise.all([
            qc.fetchQuery({ queryKey: ["settings", "all"], queryFn: () => getAllSettings(), staleTime: 0 }),
            qc.fetchQuery({ queryKey: ["operational-settings"], queryFn: fetchOperationalSettings, staleTime: 0 }),
            qc.fetchQuery({ queryKey: getListProductsQueryKey(), queryFn: () => listProducts(), staleTime: 0 }),
            qc.fetchQuery({ queryKey: getGetLaunchStateQueryKey(), queryFn: () => getLaunchState(), staleTime: 0 }),
          ]);
          await Promise.all([
            qc.invalidateQueries({queryKey:getListProductsQueryKey()},{throwOnError:true}),
            qc.invalidateQueries({queryKey:["published"]},{throwOnError:true}),
            qc.invalidateQueries({queryKey:["/api/cart"]},{throwOnError:true}),
          ]);
          if (!cancelled) setPhase("reveal");
        } catch (e) {
          if (!cancelled) setPrepError((e as Error)?.message || "The store could not be prepared.");
        }
      })();
      return () => { cancelled = true; };
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("idle"), fade);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "video") return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch((e: unknown) => { if ((e as Error)?.name === "NotAllowedError") setNeedsTap(true); else setVideoFailed(true); });
  }, [phase]);

  if (phase === "idle") return null;
  const videoUrl = activeVideo.current;
  const showText = phase === "message" || phase === "reveal";
  const videoOpacity = phase === "video" ? 1 : 0;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black text-center" role="dialog" aria-modal="true" aria-label="Launch"
      style={{ opacity: phase === "reveal" ? 0 : 1, transition: `opacity ${fade}ms ease`, pointerEvents: phase === "reveal" ? "none" : "auto", animation: phase === "blackout" ? `launch-fade-in ${fade}ms ease both` : undefined }}>
      {(phase === "video" || phase === "fading-video") && videoUrl && (
        <>
          <video ref={videoRef} src={videoUrl} playsInline preload="auto" onEnded={next} onError={() => setVideoFailed(true)}
            className="h-full w-full bg-black object-contain" style={{ opacity: videoOpacity, transition: `opacity ${fade}ms ease` }} data-testid="video-launch" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))", opacity: videoOpacity, transition: `opacity ${fade}ms ease` }}>
            {videoFailed && <p role="alert" className="text-sm text-white/70">The launch video could not be played.</p>}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {needsTap && !videoFailed && (
                <button className="glass rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest text-white" data-testid="button-launch-play"
                  onClick={() => { const v = videoRef.current; if (!v) return; v.muted = false; v.play().then(() => setNeedsTap(false)).catch(() => { v.muted = true; v.play().then(() => setNeedsTap(false)).catch(() => setVideoFailed(true)); }); }}>
                  Tap to play with sound
                </button>
              )}
              <button className="glass-sm rounded-full px-5 py-3 text-xs font-bold uppercase tracking-widest text-white/85" onClick={next} data-testid="button-launch-skip">{videoFailed ? "Continue" : "Skip"}</button>
            </div>
          </div>
        </>
      )}
      {showText && (
        <div className="px-6">
          <p className="text-2xl font-semibold text-white sm:text-4xl" data-testid="text-launch-wait">We know you’re excited, just a few moments!</p>
          <p className="mt-3 text-sm text-white/55">This may take a few minutes.</p>
          {prepError && (
            <div role="alert" className="mt-6 space-y-3">
              <p className="text-sm text-red-300">The store could not be loaded: {prepError}</p>
              <button className="glass rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest text-white" onClick={() => { setPrepError(null); setAttempt((n) => n + 1); }} data-testid="button-launch-retry">Retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
