import { useCallback, useEffect, useRef, useState } from "react";
import { getMovieSetupState, startMovieSetup, stopMovieSetup, sendMovieFilmingBurst, optInMovieFilmingDevice,
  useGetMovieFilmingDevices, useGetMovieSetupState, type MovieSetupState, type MoviePushJob } from "@workspace/api-client-react";
import { getGetMovieFilmingDevicesQueryKey, getGetMovieSetupStateQueryKey } from "@workspace/api-client-react";
import { MovieSound } from "@/lib/movie-sound";
import { useAdminPushNotifications } from "@/hooks/use-admin-notifications";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
type Phase = "idle" | "movie" | "test" | "complete" | "stopped";
type Timeline = { id: string; mode: "movie" | "test"; total: number; duration: number; startsAt: number };
export type MovieCard = { id: string; orderNumber: number; appearedAt: number; kind: "MOVIE_SIMULATION" };

export function useMovieSetup() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0);
  const [cards, setCards] = useState<MovieCard[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectedScreens, setConnectedScreens] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [pushJob, setPushJob] = useState<MoviePushJob | null>(null);
  const [optingIn, setOptingIn] = useState(false);
  const devicesQuery = useGetMovieFilmingDevices({ query: { queryKey: getGetMovieFilmingDevicesQueryKey(), refetchInterval: 30_000, retry: false } });
  const stateQuery = useGetMovieSetupState({ query: { queryKey: getGetMovieSetupStateQueryKey(), refetchInterval: pushJob?.status === "running" ? 1000 : false, retry: false } });
  const notifications = useAdminPushNotifications();
  const latestRevision = useRef(0);
  const alive = useRef(true);
  const audio = useRef(new MovieSound());
  const source = useRef<EventSource | null>(null);
  const raf = useRef<number | null>(null);
  const timeline = useRef<Timeline | null>(null);
  const visibleCards = useRef<MovieCard[]>([]);
  const previousCount = useRef(0);
  const lastSound = useRef(-Infinity);
  const seenMovie = useRef<string | null>(null);
  const mode = useRef<"movie" | "test">("movie");
  const generation = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);

  const disconnect = useCallback(() => {
    source.current?.close(); source.current = null;
    if (alive.current) { setConnected(false); setConnectedScreens(0); }
  }, []);
  const haltVisuals = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null; timeline.current = null; visibleCards.current = [];
    previousCount.current = 0; audio.current.stop();
    if (alive.current) { setCards([]); setCount(0); setSoundEnabled(false); setBusy(false); }
  }, []);
  const enableSound = useCallback(async () => {
    const currentGeneration = generation.current;
    try {
      await audio.current.enable();
      if (alive.current && generation.current === currentGeneration) { setSoundEnabled(true); setError(""); }
      else audio.current.stop();
    } catch (e) {
      if (alive.current) { setSoundEnabled(false); setError(e instanceof Error ? e.message : "Sound unavailable. The visual simulation still works."); }
    }
  }, []);
  const muteSound = useCallback(() => { audio.current.stop(); setSoundEnabled(false); }, []);
  const animate = useCallback((current: Timeline) => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    timeline.current = current;
    previousCount.current = 0; visibleCards.current = []; lastSound.current = -Infinity;
    setCards([]); setCount(0); setPhase(current.mode);
    const tick = (now: number) => {
      if (!alive.current || timeline.current !== current) return;
      const elapsed = Math.max(0, now - current.startsAt);
      const progress = Math.min(1, elapsed / current.duration);
      const next = Math.min(current.total, Math.floor(current.total * (current.mode === "movie" ? progress ** 2.2 : progress)));
      const delta = next - previousCount.current;
      const retained = visibleCards.current.filter(card => now - card.appearedAt < 900);
      if (delta > 0) {
        // Aggregate all logical events in the counter; render at most eight cards.
        const first = Math.max(previousCount.current + 1, next - 7);
        for (let number = first; number <= next; number++) retained.push({ id: `${current.id}:${number}`, orderNumber: number, appearedAt: now, kind: "MOVIE_SIMULATION" });
        if (current.mode === "test") for (let i = 0; i < delta; i++) audio.current.play(i * 0.025);
        else if (now - lastSound.current >= 80) { audio.current.play(); lastSound.current = now; }
        previousCount.current = next;
        setCount(next);
      }
      const bounded = retained.slice(-8);
      if (delta > 0 || bounded.length !== visibleCards.current.length) { visibleCards.current = bounded; setCards(bounded); }
      if (elapsed >= current.duration + 950) {
        timeline.current = null; raf.current = null; setPhase("complete");
        if (current.mode === "test") setTestResult(true);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    // Joining a running session doesn't replay historical sounds or cards.
    const alreadyElapsed = Math.max(0, performance.now() - current.startsAt);
    previousCount.current = Math.min(current.total, Math.floor(current.total * (current.mode === "movie" ? Math.min(1, alreadyElapsed / current.duration) ** 2.2 : Math.min(1, alreadyElapsed / current.duration))));
    setCount(previousCount.current);
    raf.current = requestAnimationFrame(tick);
  }, []);
  const applySnapshot = useCallback((state: MovieSetupState) => {
    if (!alive.current || state.kind !== "MOVIE_SIMULATION") return;
    if (state.revision < latestRevision.current) return;
    latestRevision.current = state.revision;
    setPushJob(state.pushJob);
    setConnectedScreens(state.connectedScreens);
    if (!state.run) return;
    if (state.run.id === seenMovie.current) return;
    seenMovie.current = state.run.id;
    mode.current = "movie";
    setTestResult(false);
    animate({ id: state.run.id, mode: "movie", total: state.run.eventCount, duration: state.run.durationMs, startsAt: performance.now() + state.run.startsAt - state.serverNow });
  }, [animate]);
  useEffect(() => {
    const state = stateQuery.data;
    if (state && state.revision >= latestRevision.current) {
      latestRevision.current = state.revision;
      setPushJob(state.pushJob);
    }
  }, [stateQuery.data]);
  useEffect(() => {
    if (devicesQuery.data) setSelectedDeviceIds(current => current.filter(id => devicesQuery.data!.devices.some(device => device.id === id && device.optedIn)));
  }, [devicesQuery.data]);
  const optInDevice = useCallback(async (label: string, optedIn: boolean) => {
    setOptingIn(true); setError("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") throw new Error("Web Push is unavailable. On iPhone/iPad install the site to your Home Screen and open it there.");
      if (optedIn && !(await notifications.subscribe())) throw new Error(devicesQuery.data?.reason || "Notification permission or subscription is unavailable. Check Admin → Notifications.");
      const registration = await navigator.serviceWorker.getRegistration(`${BASE}/sw.js`);
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error("This device has no registered Web Push subscription.");
      const device = await optInMovieFilmingDevice({ endpoint: subscription.endpoint, label: label.trim() || "Filming device", optedIn });
      setSelectedDeviceIds(current => optedIn ? [...new Set([...current, device.id])] : current.filter(id => id !== device.id));
      await devicesQuery.refetch();
    } catch (e) { setError(e instanceof Error ? e.message : "Device opt-in failed."); }
    finally { if (alive.current) setOptingIn(false); }
  }, [devicesQuery, notifications]);
  const connect = useCallback(() => {
    if (source.current) return;
    if (typeof EventSource === "undefined") { setError("Live filming sync is unavailable in this browser."); return; }
    const events = new EventSource(`${BASE}/api/admin/movie-setup/stream`, { withCredentials: true });
    source.current = events;
    events.onopen = () => {
      if (alive.current && source.current === events) {
        setConnected(true);
        setError(current => current.startsWith("Sync disconnected.") ? "" : current);
      }
    };
    events.addEventListener("snapshot", event => {
      if (source.current !== events) return;
      try { applySnapshot(JSON.parse((event as MessageEvent).data)); } catch { setError("The filming session could not be read. Reconnect to try again."); }
    });
    events.addEventListener("stopped", () => {
      if (source.current !== events) return;
      generation.current++; pendingRequest.current?.abort();
      haltVisuals(); disconnect(); setPhase("stopped"); setTestResult(false);
    });
    events.addEventListener("unauthorized", () => {
      haltVisuals(); disconnect(); setPhase("stopped"); setError("Admin session ended. Sign in again to use Movie Setup.");
    });
    events.onerror = () => {
      if (source.current !== events) return;
      setConnected(false);
      haltVisuals(); setPhase("stopped");
      setError("Sync disconnected. This screen stopped safely; reconnecting…");
      // Native EventSource retries this one connection and receives a fresh snapshot.
      seenMovie.current = null;
    };
  }, [applySnapshot, disconnect, haltVisuals]);

  const start = useCallback(async () => {
    const command = ++generation.current;
    mode.current = "movie";
    pendingRequest.current?.abort();
    const controller = new AbortController(); pendingRequest.current = controller;
    setBusy(true); setError(""); setTestResult(false);
    await enableSound();
    if (generation.current !== command) return;
    connect();
    try {
      const state = await getMovieSetupState({ signal: controller.signal });
      if (generation.current !== command) return;
      const started = await startMovieSetup({ expectedRevision: state.revision, deviceIds: selectedDeviceIds }, { signal: controller.signal });
      if (generation.current === command) applySnapshot(started);
    } catch (e) {
      if (generation.current === command) setError(e instanceof Error ? e.message : "Movie sequence could not start.");
    } finally { if (alive.current && generation.current === command) setBusy(false); }
  }, [applySnapshot, connect, enableSound, selectedDeviceIds]);
  const test = useCallback(async () => {
    const command = ++generation.current;
    mode.current = "test";
    disconnect(); pendingRequest.current?.abort();
    setError(""); setTestResult(false); setBusy(true);
    await enableSound();
    if (generation.current !== command || !alive.current) return;
    const controller = new AbortController(); pendingRequest.current = controller;
    try {
      const state = await getMovieSetupState({ signal: controller.signal });
      const result = await sendMovieFilmingBurst({ expectedRevision: state.revision, deviceIds: selectedDeviceIds, mode: "test" }, { signal: controller.signal });
      if (generation.current !== command || !alive.current) return;
      latestRevision.current = result.revision; setPushJob(result.pushJob);
      animate({ id: `local-test-${command}`, mode: "test", total: 10, duration: 1800, startsAt: performance.now() + 100 });
    } catch (e) { if (generation.current === command) setError(e instanceof Error ? e.message : "Real push test could not be queued."); }
    finally { if (alive.current && generation.current === command) setBusy(false); }
  }, [animate, disconnect, enableSound, selectedDeviceIds]);
  const burst = useCallback(async () => {
    const command = ++generation.current; mode.current = "movie"; setBusy(true); setError("");
    pendingRequest.current?.abort();
    const controller = new AbortController(); pendingRequest.current = controller;
    await enableSound();
    if (generation.current !== command) return;
    connect();
    try {
      const state = await getMovieSetupState({ signal: controller.signal });
      const result = await sendMovieFilmingBurst({ expectedRevision: state.revision, deviceIds: selectedDeviceIds, mode: "movie" }, { signal: controller.signal });
      if (generation.current === command) applySnapshot(result);
    } catch (e) { if (generation.current === command) setError(e instanceof Error ? e.message : "Movie burst could not start."); }
    finally { if (alive.current && generation.current === command) setBusy(false); }
  }, [applySnapshot, connect, enableSound, selectedDeviceIds]);
  const stop = useCallback(async () => {
    generation.current++; pendingRequest.current?.abort();
    const previousRevision = latestRevision.current;
    latestRevision.current++;
    haltVisuals(); disconnect(); setPhase("stopped"); setTestResult(false);
    try {
      const state = await stopMovieSetup();
      if (alive.current) { latestRevision.current = state.revision; setPushJob(state.pushJob); }
    }
    catch {
      latestRevision.current = previousRevision;
      if (alive.current) setError("This screen stopped. The server did not confirm stopping other screens or remaining real pushes. Press STOP IMMEDIATELY again.");
    }
  }, [disconnect, haltVisuals]);
  useEffect(() => {
    alive.current = true; connect();
    const visibility = () => { if (document.hidden) { audio.current.stop(); setSoundEnabled(false); } };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive.current = false; generation.current++; pendingRequest.current?.abort();
      disconnect(); haltVisuals(); document.removeEventListener("visibilitychange", visibility);
    };
  }, [connect, disconnect, haltVisuals]);
  return { phase, count, cards, connected, connectedScreens, soundEnabled, error, busy, testResult, start, test, burst, stop, connect, enableSound, muteSound,
    selectedDeviceIds, setSelectedDeviceIds, devices: devicesQuery.data?.devices ?? [], pushConfigured: devicesQuery.data?.configured ?? false,
    pushReason: devicesQuery.data?.reason ?? (devicesQuery.error?.message || null), devicesLoading: devicesQuery.isLoading,
    refreshDevices: devicesQuery.refetch, pushJob, optInDevice, optingIn };
}
