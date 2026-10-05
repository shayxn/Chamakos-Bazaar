import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Save, Upload, RefreshCw } from "lucide-react";
import { getGetLaunchStateQueryKey } from "@workspace/api-client-react";
import { useLaunchClock } from "@/lib/use-launch-clock";
import { adminApi } from "@/lib/admin-api";
import { uploadMedia } from "@/lib/upload-media";
import { CountdownView } from "@/components/launch-panel";

type LaunchDoc = { id: number; title: string; slug: string; status: string; createdAt?:string; publishAt?:string; data: Record<string, string | boolean | undefined> };
const glass = "rounded-2xl glass-card p-4 sm:p-6";
const inp = "w-full rounded-xl border border-primary/30 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
const btn = "inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-primary/20 disabled:opacity-40";
const btnP = "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-40";

/** ISO -> "YYYY-MM-DDTHH:mm" wall-clock in Asia/Dubai (UTC+4, no DST). */
const toDubai = (iso?: string) => { if (!iso) return ""; const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 4 * 3600000).toISOString().slice(0, 16) : ""; };
const fromDubai = (v: string) => (v ? `${v}:00+04:00` : "");

function Media({ label, accept, value, onChange }: { label: string; accept: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const isVid = accept.startsWith("video");
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{label}</span>
      <div className="flex gap-2">
        <input className={inp} value={value} placeholder="URL or upload" onChange={(e) => onChange(e.target.value)} />
        <button type="button" className={btn} disabled={busy} onClick={() => ref.current?.click()}><Upload className="h-3.5 w-3.5" />{busy ? "Uploading" : "Upload"}</button>
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
          setBusy(true); setErr(""); try { onChange(await uploadMedia(f)); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
        }} />
      </div>
      {value && (isVid ? <video src={value} className="max-h-44 rounded-xl" controls playsInline /> : <img src={value} alt="" className="max-h-40 rounded-xl border border-primary/30 object-cover" />)}
      {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
    </div>
  );
}

export default function LaunchAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["manage", "launch"], queryFn: () => adminApi<LaunchDoc[]>("/manage/launch") });
  const doc = q.data?.[0];
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [headline, setHeadline] = useState(""); const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState(""); const [videoUrl, setVideoUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const clock = useLaunchClock();
  const loaded = useRef<number | "none" | null>(null);
  useEffect(() => {
    if (!q.isSuccess) return;
    const key = doc?.id ?? "none";
    if (loaded.current === key) return;
    loaded.current = key;
    const d = doc?.data ?? {};
    setEnabled(doc?.status==="published"&&d.enabled!==false); setStart(toDubai(d.startsAt as string||doc?.publishAt||doc?.createdAt)); setEnd(toDubai(d.deadline as string));
    setHeadline((d.headline as string) ?? ""); setText((d.text as string) ?? "");
    setImageUrl((d.imageUrl as string) ?? ""); setVideoUrl((d.videoUrl as string) ?? "");
  }, [q.isSuccess, doc]);

  const invalid = enabled && (!start || !end || Date.parse(fromDubai(end)) <= Date.parse(fromDubai(start)));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: doc?.title || "Launch countdown", slug: doc?.slug || "launch-countdown", status: enabled ? "published" : "draft",
        featured: false, showInNavigation: false, publishAt: null, unpublishAt: null,
        data: { enabled, startsAt: enabled ? fromDubai(start) : "", deadline: enabled ? fromDubai(end) : "", headline, text, imageUrl, videoUrl },
      };
      return doc ? adminApi(`/manage/launch/${doc.id}`, { method: "PATCH", body: JSON.stringify(body) }) : adminApi("/manage/launch", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { loaded.current = null; qc.invalidateQueries({ queryKey: ["manage", "launch"] }); qc.invalidateQueries({ queryKey: getGetLaunchStateQueryKey() }); qc.invalidateQueries({ queryKey: ["published"] }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Countdown and launch</h1>
      {q.isLoading && <div className="glass-skeleton h-40 rounded-2xl" aria-busy="true" />}
      {q.isError && <div role="alert" className={`${glass} flex items-center justify-between text-sm text-red-200`}><span>{(q.error as Error).message}</span><button className={btn} onClick={() => q.refetch()}><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>}
      {q.isSuccess && (
        <div className={`${glass} space-y-5`}>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span><span className="block font-bold">Countdown {enabled ? "ON" : "OFF"}</span><span className="text-xs text-white/55">When off, nothing is shown to customers.</span></span>
            <button type="button" role="switch" aria-checked={enabled} data-testid="switch-countdown" onClick={() => setEnabled(!enabled)}
              className={`relative h-8 w-14 shrink-0 rounded-full border transition ${enabled ? "border-primary bg-primary/40" : "border-white/20 bg-white/10"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </label>
          {enabled && (
            <>
              <p className="text-xs text-white/55">All times are Dubai time (Asia/Dubai, UTC+04:00). Customers see a countdown synced to the server clock.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">When should it start?</span><input type="datetime-local" className={inp} value={start} onChange={(e) => setStart(e.target.value)} data-testid="input-countdown-start" /></label>
                <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">When should it end?</span><input type="datetime-local" className={inp} value={end} onChange={(e) => setEnd(e.target.value)} data-testid="input-countdown-end" /></label>
              </div>
              {invalid && <p role="alert" className="text-sm text-red-300">Set a start and an end time, with the end after the start.</p>}
              <label className="block space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">Text above the countdown</span><input className={inp} value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
              <label className="block space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">Supporting text</span><textarea rows={3} className={inp} value={text} onChange={(e) => setText(e.target.value)} /></label>
              <Media label="Image / background" accept="image/*" value={imageUrl} onChange={setImageUrl} />
              <Media label="Launch video (plays full-screen at zero)" accept="video/*" value={videoUrl} onChange={setVideoUrl} />
              <button type="button" className={btn} onClick={() => setPreview(!preview)} data-testid="button-countdown-preview"><Eye className="h-3.5 w-3.5" />{preview ? "Hide preview" : "Preview countdown"}</button>
              {preview && (
                <div className="rounded-2xl bg-black p-2">
                  <CountdownView data={{ headline, text, imageUrl }} remaining={Math.max(0, Date.parse(fromDubai(end)) - Date.parse(fromDubai(start))) || 0} preOrder={clock.preOrderCount > 0} />
                  <p className="px-3 pb-2 text-[11px] text-white/45">Preview shows the full countdown length. The PRE-ORDER NOW button follows the live count of active pre-order products ({clock.preOrderCount} right now).</p>
                </div>
              )}
            </>
          )}
          {save.isError && <p role="alert" className="text-sm text-red-300">{(save.error as Error).message}</p>}
          {save.isSuccess && <p role="status" className="text-sm text-primary">Saved.</p>}
          <button className={btnP} disabled={save.isPending || invalid} onClick={() => save.mutate()} data-testid="button-countdown-save"><Save className="h-4 w-4" />{save.isPending ? "Saving" : "Save"}</button>
        </div>
      )}
    </div>
  );
}
