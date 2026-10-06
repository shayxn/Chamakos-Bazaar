import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMovieSetup } from "@/hooks/use-movie-setup";

const PURPLE = "#b79cff";

const CSS = `
.ms-root{position:relative;min-height:100dvh;background:#000;color:#f5f3fa;overflow:hidden;font-family:'Space Grotesk',sans-serif}
.ms-atmo{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 50% at 50% 0%,rgba(183,156,255,.16),transparent 70%),radial-gradient(50% 40% at 50% 100%,rgba(183,156,255,.08),transparent 70%);opacity:.5;transition:opacity .4s}
.ms-active .ms-atmo{opacity:1;animation:ms-breathe 1.4s ease-in-out infinite}
.ms-pulse{animation:ms-ring 1.1s ease-out infinite}
.ms-card{animation:ms-in .22s cubic-bezier(.16,1,.3,1) both}
.ms-btn{min-height:48px;border-radius:9999px;padding:0 22px;font-weight:700;letter-spacing:.12em;font-size:12px;text-transform:uppercase;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#f5f3fa;transition:transform .15s,border-color .2s,opacity .2s}
.ms-btn:hover:not(:disabled){border-color:${PURPLE}}
.ms-btn:active:not(:disabled){transform:scale(.97)}
.ms-btn:disabled{opacity:.35;cursor:not-allowed}
.ms-primary{background:${PURPLE};color:#0a0610;border-color:${PURPLE}}
.ms-stop{border-color:rgba(255,90,90,.7);color:#ffb4b4;background:rgba(255,60,60,.12)}
@keyframes ms-breathe{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes ms-ring{0%{box-shadow:0 0 0 0 rgba(183,156,255,.45)}100%{box-shadow:0 0 0 22px rgba(183,156,255,0)}}
@keyframes ms-in{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ms-atmo,.ms-pulse,.ms-card{animation:none!important}}
`;

export default function AdminMovieSetup() {
  const m = useMovieSetup();
  const [confirming, setConfirming] = useState<null | "start" | "burst">(null);
  const form = useForm<{ label: string }>({ defaultValues: { label: "" } });
  const running = m.phase === "movie" || m.phase === "test";
  const active = running;
  const jobRunning = m.pushJob?.status === "running";
  const ids = m.selectedDeviceIds;
  const ready = m.pushConfigured && ids.length > 0 && !m.busy && !jobRunning;
  const startDisabled = !ready || running;
  const testDisabled = !ready || running;
  const burstDisabled = !ready;
  const lockSelect = m.busy || running || jobRunning;
  const own = m.devices.find(d => d.isOwn);
  const toggleDevice = (id: string) => {
    if (ids.includes(id)) m.setSelectedDeviceIds(ids.filter(x => x !== id));
    else if (ids.length < 10) m.setSelectedDeviceIds([...ids, id]);
  };
  const job = m.pushJob;

  const label =
    m.phase === "movie" ? "MOVIE MODE RUNNING" :
    m.phase === "test" ? "LOCAL TEST RUNNING" :
    m.phase === "complete" ? (m.testResult ? "TEST COMPLETE" : "SEQUENCE COMPLETE") :
    m.phase === "stopped" ? "STOPPED" : "READY";

  return (
    <div className={`ms-root ${active ? "ms-active" : ""}`} data-event-kind="MOVIE_SIMULATION" data-testid="movie-setup-root">
      <style>{CSS}</style>
      <div className="ms-atmo" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: PURPLE }}>IMAGINATE · Movie Setup</p>
            <p className="mt-2 inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: "rgba(183,156,255,.45)", color: "#d9ccff" }} data-testid="text-filming-warning">
              FILMING TOOL — DOES NOT AFFECT REAL STORE DATA
            </p>
          </div>
          <button type="button" className="ms-btn ms-stop" onClick={() => { setConfirming(null); void m.stop(); }} data-testid="button-stop-movie">
            STOP IMMEDIATELY
          </button>
        </header>

        <section className="glass-liquid rounded-3xl p-5 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            <span data-testid="text-phase">{label}</span>
            <span data-testid="status-connection" className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${m.connected && active ? "ms-pulse" : ""}`} style={{ background: m.connected ? PURPLE : "#666" }} />
              {m.connected ? `Synced · ${m.connectedScreens} screen${m.connectedScreens === 1 ? "" : "s"}` : "Not syncing"}
            </span>
          </div>
          <div className="mt-6 text-center">
            <div className="font-bold leading-none tabular-nums" style={{ fontSize: "clamp(64px,18vw,168px)", color: m.count ? "#fff" : "rgba(255,255,255,.25)" }} data-testid="text-order-counter">
              {m.count.toLocaleString("en-US")}
            </div>
            <div className="mt-3 text-xs font-bold uppercase tracking-[0.35em]" style={{ color: PURPLE }}>
              {m.count === 1 ? "Simulated order" : "Simulated orders"}{m.count >= 3000 ? "+" : ""}
            </div>
          </div>
        </section>

        <section className="grid min-h-[120px] gap-2 sm:grid-cols-2" data-testid="list-notification-cards">
          {m.phase !== "stopped" && m.cards.map(c => (
            <div key={c.id} className="ms-card glass-sm flex items-center justify-between gap-3 rounded-2xl px-4 py-3" data-event-kind={c.kind} data-testid={`card-notification-${c.orderNumber}`}>
              <div>
                <p className="text-sm font-bold">Well done! You got an order!</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Order #{c.orderNumber.toLocaleString("en-US")} · MOVIE_SIMULATION</p>
              </div>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PURPLE }} />
            </div>
          ))}
        </section>

        {m.error && (
          <div role="alert" className="rounded-2xl border p-4" style={{ borderColor: "rgba(255,90,90,.5)", background: "rgba(255,60,60,.08)" }} data-testid="text-error">
            <p className="text-sm text-red-200">{m.error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="ms-btn" onClick={m.connect} disabled={m.busy || m.phase === "test"} data-testid="button-reconnect">Reconnect</button>
              <button type="button" className="ms-btn" onClick={() => setConfirming("start")} disabled={startDisabled} data-testid="button-retry">Retry start</button>
            </div>
          </div>
        )}

        <section className="glass rounded-3xl p-5 sm:p-6" data-testid="section-devices">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Select filming device</h2>
          <p className="mt-1 text-xs text-white/55">Only opted-in, registered Admin/Owner devices appear. Select up to 10 ({ids.length}/10).</p>
          {!m.pushConfigured && (
            <p className="mt-3 text-xs text-red-200" data-testid="text-push-reason">{m.pushReason ?? "Push is not configured."} <a href="/admin/notifications" className="underline" data-testid="link-notification-settings">Open notification settings</a></p>
          )}
          {m.pushConfigured && m.pushReason && <p className="mt-3 text-xs text-white/60" data-testid="text-push-reason">{m.pushReason}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {m.devicesLoading && <div className="glass-skeleton h-14 rounded-2xl" />}
            {!m.devicesLoading && m.devices.filter(d => d.optedIn).length === 0 && <p className="text-xs text-white/50" data-testid="text-no-devices">No opted-in devices yet. Opt in this device below.</p>}
            {m.devices.filter(d => d.optedIn).map(d => (
              <label key={d.id} className="glass-sm flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" data-testid={`device-${d.id}`}>
                <input type="checkbox" checked={ids.includes(d.id)} disabled={lockSelect || (!ids.includes(d.id) && ids.length >= 10)} onChange={() => toggleDevice(d.id)} data-testid={`checkbox-device-${d.id}`} />
                <span className="min-w-0"><span className="block truncate font-bold">{d.label}{d.isOwn ? " (this device)" : ""}</span><span className="block truncate text-[11px] text-white/50">{d.adminName}</span></span>
              </label>
            ))}
          </div>
          <button type="button" className="ms-btn mt-3" onClick={() => void m.refreshDevices()} disabled={m.devicesLoading} data-testid="button-refresh-devices">Refresh devices</button>

          <div className="mt-6 border-t border-white/10 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em]">This device</h3>
            <Form {...form}>
              <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={form.handleSubmit(v => void m.optInDevice(v.label.trim(), true))}>
                <FormField control={form.control} name="label" rules={{ required: true, validate: v => v.trim().length > 0 }} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-[11px] uppercase tracking-[0.18em] text-white/60">Device label</FormLabel>
                    <FormControl><Input {...field} placeholder={own?.label ?? "Filming iPhone"} maxLength={60} className="glass-input h-12 rounded-full" data-testid="input-device-label" /></FormControl></FormItem>
                )} />
                <button type="submit" className="ms-btn ms-primary" disabled={m.optingIn || !form.watch("label")?.trim()} data-testid="button-opt-in">{m.optingIn ? "Registering…" : "Opt in this device"}</button>
                <button type="button" className="ms-btn" disabled={m.optingIn || !own?.optedIn} onClick={() => void m.optInDevice(own?.label ?? form.getValues("label").trim(), false)} data-testid="button-revoke">Revoke this device</button>
              </form>
            </Form>
            <p className="mt-2 text-[11px] text-white/45">Opting in requests notification permission and registers this device through the existing notification setup.</p>
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className="ms-btn ms-primary sm:min-w-[260px]" style={{ minHeight: 64, fontSize: 14 }} disabled={startDisabled} onClick={() => setConfirming("start")} data-testid="button-start-movie">
              START MOVIE MODE
            </button>
            <button type="button" className="ms-btn" style={{ minHeight: 64 }} disabled={testDisabled} onClick={() => void m.test()} data-testid="button-test-notifications">
              TEST 10 REAL PUSHES
            </button>
            <button type="button" className="ms-btn" style={{ minHeight: 64 }} disabled={burstDisabled} onClick={() => setConfirming("burst")} data-testid="button-movie-burst">
              MOVIE BURST — up to 50 real pushes
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/55" data-testid="text-push-note">
            Real pushes go only to the selected devices, capped at 50 per burst, one burst per movie sequence. iOS and other systems may group or throttle them; there are no retries or bypasses. Real OS pushes use the normal system sound where supported; a custom cha-ching is not guaranteed. The sound button below arms the in-app effects per device. STOP cannot recall notifications a provider has already accepted.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 p-3" data-testid="panel-simulated">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Simulated orders (in-app only)</p>
              <p className="mt-1 text-xl font-bold tabular-nums" data-testid="text-simulated-count">{m.count.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: "rgba(183,156,255,.4)" }} data-testid="panel-push-job">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: PURPLE }}>Real push job</p>
              {job ? (
                <div className="mt-1 text-sm">
                  <p data-testid="text-push-status">{job.mode} · {job.status}</p>
                  <p className="tabular-nums" data-testid="text-push-progress">Accepted by provider {job.accepted} of {job.total} · attempted {job.attempted} · failed {job.failed}</p>
                  <p className="text-[11px] text-white/45">Accepted means the push provider took it, not that a device displayed it.</p>
                  {job.reason && <p className="mt-1 text-xs text-red-200" data-testid="text-push-job-reason">{job.reason}</p>}
                </div>
              ) : <p className="mt-1 text-sm text-white/50" data-testid="text-push-status">No push job.</p>}
            </div>
          </div>
        </section>

        <section className="glass-sm flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
          <div className="max-w-xl text-xs leading-relaxed text-white/60">
            Connected screens sync on a transient server session; only devices on this page participate. Each device must tap Enable sound here because of browser autoplay rules.
            <span className="ml-1 font-bold" data-testid="status-sound">{m.soundEnabled ? "Sound on." : "Sound off."}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.soundEnabled
              ? <button type="button" className="ms-btn" onClick={m.muteSound} data-testid="button-mute-sound">Mute sound</button>
              : <button type="button" className="ms-btn" onClick={() => void m.enableSound()} data-testid="button-enable-sound">Enable sound</button>}
            <button type="button" className="ms-btn" onClick={m.connect} disabled={m.connected || m.busy || m.phase === "test"} data-testid="button-join-session">Join filming session</button>
          </div>
        </section>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.7)" }} role="dialog" aria-modal="true" aria-labelledby="ms-confirm-title" data-testid="dialog-confirm-start">
          <div className="glass-modal w-full max-w-md rounded-3xl p-6">
            <h2 id="ms-confirm-title" className="text-lg font-bold">{confirming === "burst" ? "Send the movie burst?" : "Start the movie order notification sequence?"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">This is a filming simulation only. It will NOT create real orders or affect store analytics.</p>
            <p className="mt-3 text-sm leading-relaxed text-white/70" data-testid="text-confirm-push">It will send real OS push notifications to {ids.length} selected device{ids.length === 1 ? "" : "s"}, capped at 50 real pushes in one burst, alongside the 3,200-event in-app simulation. No actual orders are created.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="ms-btn" onClick={() => setConfirming(null)} data-testid="button-cancel-start">CANCEL</button>
              <button type="button" className="ms-btn ms-primary" onClick={() => { const c = confirming; setConfirming(null); void (c === "burst" ? m.burst() : m.start()); }} data-testid="button-confirm-start">{confirming === "burst" ? "SEND BURST" : "START MOVIE MODE"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
