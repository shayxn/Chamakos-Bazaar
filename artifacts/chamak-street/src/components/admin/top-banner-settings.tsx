import { useRef, useState, type PointerEvent } from "react";
import { Upload, Trash2, Move, RotateCcw, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BannerFrame } from "@/components/top-banner";
import { bannerGeometry, clamp, defaultCrop, parseTopBanner, safeBannerUrl, type TopBannerConfig } from "@/lib/top-banner";

export function TopBannerSettings({ value, onChange, onSave, upload }: {
  value?: string; onChange: (value: string) => void; onSave: (value: string) => Promise<void>;
  upload: (file: File) => Promise<string>;
}) {
  const config = parseTopBanner(value);
  const [draft, setDraft] = useState<TopBannerConfig | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; initialX: number; initialY: number; dx: number; dy: number } | null>(null);
  const update = (patch: Partial<TopBannerConfig>) => onChange(JSON.stringify({ ...config, ...patch }));
  const persist = async (next: TopBannerConfig) => {
    if(!safeBannerUrl(next.url)) { setError("Use an https:// URL or an internal path such as /shop."); return false; }
    setSaving(true); setError("");
    try { await onSave(JSON.stringify(next)); return true; }
    catch { setError("Could not save the Top Banner. Your saved banner is unchanged. Please try again."); return false; }
    finally { setSaving(false); }
  };
  const chooseFile = async (file?: File) => {
    if(!file) return;
    if(!/^image\/(?:jpeg|png|webp|gif)$/.test(file.type)) { setError("Upload a JPEG, PNG, WebP or GIF image."); return; }
    setUploading(true); setError("");
    try {
      const image = await upload(file);
      setReady(false);
      setDraft({ ...config, image, crop: { ...defaultCrop } });
    } catch { setError("Image upload failed. Your existing banner has not been changed."); }
    finally { setUploading(false); if(fileInput.current) fileInput.current.value = ""; }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if(!draft || !drag.current || drag.current.id!==e.pointerId) return;
    const d = drag.current;
    setDraft(current => current && ({ ...current, crop: { ...current.crop,
      x: d.dx > 0.01 ? clamp(d.initialX - (e.clientX - d.x) / d.dx) : current.crop.x,
      y: d.dy > 0.01 ? clamp(d.initialY - (e.clientY - d.y) / d.dy) : current.crop.y } }));
  };
  const adjust = (key: "x" | "y" | "zoom", n: number) => setDraft(d => d && ({ ...d, crop: { ...d.crop, [key]: n } }));
  const busy = uploading || saving;
  return <section className="space-y-5" aria-labelledby="top-banner-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="top-banner-heading" className="font-black uppercase tracking-wider text-primary">Top Banner</h2>
      <Button type="button" disabled={busy} onClick={() => void persist(config)}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Top Banner"}</Button>
    </div>
    <p className="text-sm text-muted-foreground">A thin image strip above the customer navigation. Upload any normal image shape, then choose the exact 12:1 crop.</p>
    <p className="text-sm font-medium text-primary">Recommended: 1920 × 160 px (12:1)</p>
    <div className="flex items-center gap-3">
      <button type="button" role="switch" aria-label="Top Banner ON/OFF" aria-checked={config.enabled} disabled={busy}
        onClick={() => update({ enabled: !config.enabled })}
        className={`relative h-7 w-12 rounded-full border border-white/15 transition-colors ${config.enabled ? "bg-primary" : "bg-white/10"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${config.enabled ? "left-6" : "left-1"}`} />
      </button>
      <span className="text-sm font-semibold">Top Banner {config.enabled ? "ON" : "OFF"}</span>
    </div>
    <input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif"
      aria-label="Upload Top Banner image" onChange={e => void chooseFile(e.target.files?.[0])} />
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy} onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : config.image ? "Replace Image" : "Upload Image"}</Button>
      {config.image && <>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setError(""); setReady(false); setDraft({ ...config, crop: { ...config.crop } }); }}><Move className="mr-2 h-4 w-4" />Edit Crop</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setPreview(p => !p)}><Eye className="mr-2 h-4 w-4" />Preview</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { update({ image: "", crop: { ...defaultCrop } }); setPreview(false); }}><Trash2 className="mr-2 h-4 w-4" />Remove Image</Button>
      </>}
    </div>
    <label className="block space-y-2"><span className="text-sm">Optional clickable URL</span>
      <Input disabled={busy} value={config.url} placeholder="https://example.com or /shop"
        onChange={e => update({ url: e.target.value })} /></label>
    {preview && config.image && <div className="liquid-panel rounded-2xl p-4"><p className="mb-3 text-xs text-muted-foreground">Final banner preview · fixed 12:1</p><BannerFrame image={config.image} crop={config.crop} /></div>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <Dialog open={!!draft} onOpenChange={open => { if(!open && !saving) { setDraft(null); drag.current=null; } }}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-4xl max-h-[90dvh] overflow-y-auto liquid-panel z-[80]"
        onEscapeKeyDown={e => { if(saving)e.preventDefault(); }} onPointerDownOutside={e => { if(saving)e.preventDefault(); }}>
        <DialogTitle>Position Top Banner image</DialogTitle>
        <DialogDescription>Drag behind the fixed 12:1 frame or use the position sliders. Zoom never stretches the image. Save Crop saves this banner to Site Settings.</DialogDescription>
        {draft && <>
          <div className="rounded-2xl bg-black/40 p-3 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Fixed 12:1 crop frame · exactly what customers see</p>
            <BannerFrame image={draft.image} crop={draft.crop} className="outline outline-2 outline-primary cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
              onImageLoad={ratio => { setReady(true); setDraft(d => d && d.crop.ratio!==ratio ? { ...d, crop: { ...d.crop, ratio } } : d); }}
              onImageError={() => { setReady(false); setError("Could not load the uploaded image. Try another image."); }}
              onPointerDown={e => {
                if(!ready || saving)return;
                e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect(), g = bannerGeometry(draft.crop);
                drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, initialX: draft.crop.x, initialY: draft.crop.y,
                  dx: r.width*(g.width/100-1), dy: r.height*(g.height/100-1) };
              }} onPointerMove={move} onPointerUp={() => { drag.current=null; }} onPointerCancel={() => { drag.current=null; }} />
          </div>
          {!ready && <p role="status" className="text-sm text-muted-foreground">Loading image…</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            {(["zoom", "x", "y"] as const).map(key => <label key={key} className="space-y-2 text-sm">
              <span className="flex justify-between"><span>{key==="zoom" ? "Zoom" : key==="x" ? "Horizontal position" : "Vertical position"}</span>
                <span className="text-primary">{key==="zoom" ? `${draft.crop.zoom.toFixed(2)}×` : `${Math.round(draft.crop[key]*100)}%`}</span></span>
              <input className="w-full accent-[#a855f7]" type="range" aria-label={key==="zoom" ? "Banner zoom" : key==="x" ? "Horizontal position" : "Vertical position"}
                min={key==="zoom" ? 1 : 0} max={key==="zoom" ? 8 : 1} step={key==="zoom" ? 0.01 : 0.001}
                disabled={!ready || saving} value={draft.crop[key]} onChange={e => adjust(key,Number(e.target.value))} />
            </label>)}
          </div>
          <p className="text-xs text-muted-foreground">Minimum zoom fills the frame without gaps. Higher zoom allows more movement in either direction.</p>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setDraft(d => d && ({ ...d, crop: { ...defaultCrop, ratio: d.crop.ratio } }))}><RotateCcw className="mr-2 h-4 w-4" />Reset positioning</Button>
            <Button type="button" disabled={!ready || saving} onClick={async () => { if(await persist(draft))setDraft(null); }}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Crop"}</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
