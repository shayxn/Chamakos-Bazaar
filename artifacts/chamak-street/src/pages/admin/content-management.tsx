import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import LaunchAdmin from "@/components/launch-admin";
import { Archive, Eye, GripVertical, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

/* ---------- api ---------- */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}/api${path}`, { credentials: "include", headers: init?.body ? { "Content-Type": "application/json" } : undefined, ...init });
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try { const j = await r.json(); if (j?.error || j?.message) msg = j.error || j.message; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

async function uploadMedia(file: File): Promise<string> {
  const s = await fetch(`${BASE}/api/uploads/sign`, { method: "POST", credentials: "include" });
  if (s.ok) {
    const sig = await s.json() as { apiKey: string; folder: string; signature: string; timestamp: string; uploadUrl: string };
    const form = new FormData();
    form.append("file", file); form.append("api_key", sig.apiKey); form.append("timestamp", sig.timestamp);
    form.append("folder", sig.folder); form.append("signature", sig.signature);
    const up = await fetch(sig.uploadUrl, { method: "POST", body: form });
    if (!up.ok) throw new Error("Upload failed");
    const d = await up.json() as { secure_url?: string };
    if (!d.secure_url) throw new Error("Upload returned no URL");
    return d.secure_url;
  }
  if (s.status !== 404) throw new Error("Upload signing failed");
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch(`${BASE}/api/uploads`, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  return ((await res.json()) as { url: string }).url;
}

/* ---------- types / config ---------- */
type Status = "draft" | "published" | "archived";
type Doc = { id: number; kind: string; title: string; slug: string; status: Status; featured: boolean; showInNavigation: boolean; publishAt: string | null; unpublishAt: string | null; data: Record<string, any>; createdAt: string; updatedAt: string };
type DocInput = Omit<Doc, "id" | "kind" | "createdAt" | "updatedAt">;
type Product = { id: number; name: string; price: number };

type F = { key: string; label: string; type: "text" | "area" | "number" | "bool" | "image" | "lines" | "select" | "products" | "rows" | "date"; options?: string[]; cols?: { key: string; label: string; area?: boolean; image?: boolean }[]; hint?: string; placeholder?: string };

const KINDS: Record<string, { label: string; fields: F[]; titleLabel?: string }> = {
  news: { label: "News", fields: [
    { key: "category", label: "Category", type: "text" }, { key: "date", label: "Date", type: "date" },
    { key: "summary", label: "Summary", type: "area" }, { key: "article", label: "Article", type: "area" },
    { key: "imageUrl", label: "Featured image", type: "image" }, { key: "images", label: "More images (one URL per line)", type: "lines" },
    { key: "videoUrl", label: "Video URL", type: "text" }, { key: "seoTitle", label: "SEO title", type: "text" },
    { key: "seoDescription", label: "SEO description", type: "area" }, { key: "socialImage", label: "Social image", type: "image" } ] },
  pages: { label: "Pages", fields: [
    { key: "template", label: "Template", type: "select", options: ["collection", "our-story"] },
    { key: "headline", label: "Headline", type: "text" }, { key: "subtitle", label: "Subtitle", type: "text" },
    { key: "description", label: "Description", type: "area" }, { key: "heroImage", label: "Hero image", type: "image" },
    { key: "heroVideo", label: "Hero video URL", type: "text" }, { key: "products", label: "Products (ordered)", type: "products" },
    { key: "navigationLabel", label: "Navigation label", type: "text" }, { key: "intro", label: "Intro", type: "area" },
    { key: "story", label: "Story (Our Story only)", type: "area" },
    { key: "timeline", label: "Timeline (Our Story only)", type: "rows", cols: [{ key: "year", label: "Year" }, { key: "title", label: "Title" }, { key: "text", label: "Text", area: true }] },
    { key: "quotes", label: "Quotes (Our Story only)", type: "rows", cols: [{ key: "text", label: "Quote", area: true }, { key: "author", label: "Author" }] },
    { key: "team", label: "Team (Our Story only)", type: "rows", cols: [{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "imageUrl", label: "Photo", image: true }] },
    { key: "ctaLabel", label: "Button label", type: "text" }, { key: "ctaUrl", label: "Button URL", type: "text" },
    { key: "seoTitle", label: "SEO title", type: "text" }, { key: "seoDescription", label: "SEO description", type: "area" } ] },
  faq: { label: "FAQ", titleLabel: "Question", fields: [{ key: "category", label: "Category", type: "text" }, { key: "answer", label: "Answer", type: "area" }] },
  navigation: { label: "Navigation", titleLabel: "Label", fields: [{ key: "url", label: "URL", type: "text" }, { key: "order", label: "Order", type: "number" }] },
  homepage: { label: "Homepage blocks", fields: [{ key: "headline", label: "Headline", type: "text" }, { key: "text", label: "Text", type: "area" }, { key: "imageUrl", label: "Image", type: "image" }, { key: "url", label: "Link URL", type: "text" }] },
  "hero-panel": { label: "Hero Side Panel", fields: [{ key: "description", label: "Description", type: "area" }, { key: "imageUrl", label: "Feature image", type: "image" }, { key: "url", label: "Link URL (optional)", type: "text" }] },
  countries: { label: "Countries", titleLabel: "Country", fields: [{ key: "code", label: "Code (ISO)", type: "text" }, { key: "currency", label: "Currency", type: "text" }, { key: "enabled", label: "Enabled", type: "bool" }] },
  shipping: { label: "Shipping", fields: [{ key: "countryCode", label: "Country code", type: "text" },{key:"method",label:"Delivery method",type:"select",options:["standard","express","priority"]}, { key: "amount", label: "Amount", type: "number" }, { key: "description", label: "Description", type: "area" }] },
  launch: { label: "Launch", fields: [{ key: "deadline", label: "Deadline with timezone", type: "text", placeholder: "2026-10-27T20:00:00+04:00", hint: "ISO date and time ending in an offset such as +04:00 or Z." }, { key: "headline", label: "Headline", type: "text" }, { key: "text", label: "Text", type: "area" }, { key: "imageUrl", label: "Image", type: "image" }] },
  media: { label: "Media", fields: [{ key: "url", label: "File", type: "image" }, { key: "alt", label: "Alt text", type: "text" }] },
};
const SPECIAL = ["support", "newsletter", "customers", "team", "reminders", "notification-center"];

/* ---------- styles ---------- */
const glass = "rounded-2xl border border-primary/30 bg-white/[0.04] backdrop-blur-xl";
const inp = "w-full rounded-xl border border-primary/30 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
const btn = "inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-primary/25 disabled:opacity-40";
const btnP = "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:bg-primary disabled:opacity-40";

function Lbl({ t, hint, children }: { t: string; hint?: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t}</span>{children}{hint && <span className="block text-[11px] text-white/45">{hint}</span>}</label>;
}
function Err({ e, retry }: { e: unknown; retry?: () => void }) {
  return <div role="alert" className={`${glass} flex items-center justify-between gap-3 p-4 text-sm text-red-200`}><span>{(e as Error)?.message || "Something went wrong"}</span>{retry && <button className={btn} onClick={retry}><RefreshCw className="h-3.5 w-3.5" />Retry</button>}</div>;
}
function Skel() { return <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}</div>; }
function Empty({ t }: { t: string }) { return <div className={`${glass} p-10 text-center text-sm text-white/60`} data-testid="state-empty">{t}</div>; }
function Notice({ msg }: { msg: string }) { return msg ? <p role="status" className="rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm">{msg}</p> : null; }
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

/* ---------- field editors ---------- */
function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const pick = async (f?: File) => { if (!f) return; setBusy(true); setErr(""); try { onChange(await uploadMedia(f)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const isVid = /\.(mp4|mov|webm)(\?|$)/i.test(value);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL or upload" />
        <button type="button" className={btn} disabled={busy} onClick={() => ref.current?.click()}><Upload className="h-3.5 w-3.5" />{busy ? "..." : "Upload"}</button>
        <input ref={ref} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {value && (isVid ? <video src={value} className="max-h-40 rounded-xl" muted controls /> : <img src={value} alt="" className="max-h-40 rounded-xl border border-primary/30 object-cover" />)}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}

function DragList<T>({ items, onChange, render }: { items: T[]; onChange: (n: T[]) => void; render: (item: T, i: number) => React.ReactNode }) {
  const from = useRef<number | null>(null);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} draggable onDragStart={() => { from.current = i; }} onDragOver={(e) => e.preventDefault()}
          onDrop={() => { const f = from.current; if (f === null || f === i) return; const n = [...items]; const [m] = n.splice(f, 1); n.splice(i, 0, m); from.current = null; onChange(n); }}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-black/30 p-2">
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-primary" aria-hidden />
          <div className="min-w-0 flex-1">{render(it, i)}</div>
        </li>
      ))}
    </ul>
  );
}

function ProductPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const q = useQuery({ queryKey: ["products", "limit100"], queryFn: () => api<Product[]>("/products?limit=100"), staleTime: 60_000 });
  const [s, setS] = useState("");
  const [manual, setManual] = useState("");
  const map = useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data]);
  const avail = (q.data ?? []).filter((p) => !value.includes(p.id) && p.name.toLowerCase().includes(s.toLowerCase()));
  return (
    <div className="space-y-3">
      {value.length > 0 && <DragList items={value} onChange={onChange} render={(id) => (
        <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{map.get(id)?.name ?? `Product #${id}`}</span>
          <button type="button" aria-label="Remove product" onClick={() => onChange(value.filter((v) => v !== id))}><X className="h-4 w-4 text-white/60 hover:text-white" /></button></div>
      )} />}
      <input className={inp} placeholder="Search products to add" value={s} onChange={(e) => setS(e.target.value)} />
      {q.isLoading && <Skel />}
      {q.isError && <Err e={q.error} retry={() => q.refetch()} />}
      <div className="max-h-48 space-y-1 overflow-auto">
        {avail.slice(0, 40).map((p) => <button type="button" key={p.id} onClick={() => onChange([...value, p.id])} className="flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/20"><span className="truncate">{p.name}</span><span className="text-white/50">AED {p.price}</span></button>)}
      </div>
      <div className="flex gap-2"><input className={inp} inputMode="numeric" placeholder="Add by product ID" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} />
        <button type="button" className={btn} onClick={() => { const n = Number(manual); if (n && !value.includes(n)) onChange([...value, n]); setManual(""); }}>Add</button></div>
    </div>
  );
}

function Rows({ cols, value, onChange }: { cols: NonNullable<F["cols"]>; value: Record<string, string>[]; onChange: (v: Record<string, string>[]) => void }) {
  return (
    <div className="space-y-2">
      <DragList items={value} onChange={onChange} render={(row, i) => (
        <div className="grid gap-2 sm:grid-cols-2">
          {cols.map((c) => c.image
            ? <div key={c.key} className="sm:col-span-2"><ImageField value={row[c.key] ?? ""} onChange={(v) => onChange(value.map((r, j) => j === i ? { ...r, [c.key]: v } : r))} /></div>
            : c.area
              ? <textarea key={c.key} aria-label={c.label} placeholder={c.label} rows={2} className={`${inp} sm:col-span-2`} value={row[c.key] ?? ""} onChange={(e) => onChange(value.map((r, j) => j === i ? { ...r, [c.key]: e.target.value } : r))} />
              : <input key={c.key} aria-label={c.label} placeholder={c.label} className={inp} value={row[c.key] ?? ""} onChange={(e) => onChange(value.map((r, j) => j === i ? { ...r, [c.key]: e.target.value } : r))} />)}
          <button type="button" className="justify-self-start text-xs text-red-300" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove row</button>
        </div>
      )} />
      <button type="button" className={btn} onClick={() => onChange([...value, {}])}><Plus className="h-3.5 w-3.5" />Add row</button>
    </div>
  );
}

function FieldEditor({ f, value, onChange }: { f: F; value: any; onChange: (v: any) => void }) {
  switch (f.type) {
    case "text": return <Lbl t={f.label} hint={f.hint}><input className={inp} placeholder={f.placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Lbl>;
    case "date": return <Lbl t={f.label}><input type="date" className={inp} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Lbl>;
    case "area": return <Lbl t={f.label}><textarea rows={4} className={inp} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Lbl>;
    case "number": return <Lbl t={f.label}><input type="number" className={inp} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} /></Lbl>;
    case "bool": return <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{f.label}</label>;
    case "select": return <Lbl t={f.label}><select className={inp} value={value ?? f.options?.[0]} onChange={(e) => onChange(e.target.value)}>{f.options?.map((o) => <option key={o} value={o}>{o}</option>)}</select></Lbl>;
    case "image": return <Lbl t={f.label}><ImageField value={value ?? ""} onChange={onChange} /></Lbl>;
    case "lines": return <Lbl t={f.label}><textarea rows={3} className={inp} value={(value ?? []).join("\n")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} /></Lbl>;
    case "products": return <div className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">{f.label}</span><ProductPicker value={value ?? []} onChange={onChange} /></div>;
    case "rows": return <div className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">{f.label}</span><Rows cols={f.cols!} value={value ?? []} onChange={onChange} /></div>;
  }
}

/* ---------- document editor ---------- */
const blank = (): DocInput => ({ title: "", slug: "", status: "draft", featured: false, showInNavigation: false, publishAt: null, unpublishAt: null, data: {} });

function Editor({ kind, doc, onClose }: { kind: string; doc: Doc | null; onClose: () => void }) {
  const qc = useQueryClient();
  const cfg = KINDS[kind];
  const [form, setForm] = useState<DocInput>(() => doc ? { title: doc.title, slug: doc.slug, status: doc.status, featured: doc.featured, showInNavigation: doc.showInNavigation, publishAt: doc.publishAt, unpublishAt: doc.unpublishAt, data: doc.data ?? {} } : blank());
  const [slugTouched, setSlugTouched] = useState(!!doc);
  const [preview, setPreview] = useState(false);
  const save = useMutation({
    mutationFn: (input: DocInput) => doc ? api<Doc>(`/manage/${kind}/${doc.id}`, { method: "PATCH", body: JSON.stringify(input) }) : api<Doc>(`/manage/${kind}`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manage", kind] }); qc.invalidateQueries({ queryKey: ["published"] }); onClose(); },
  });
  const setData = (k: string, v: any) => setForm((f) => ({ ...f, data: { ...f.data, [k]: v } }));
  const submit = (status?: Status) => save.mutate({ ...form, slug: form.slug || slugify(form.title), status: status ?? form.status });
  const story = kind === "pages" && form.data.template === "our-story";
  const fields = cfg.fields.filter((f) => !(kind === "pages" && !story && ["story", "timeline", "quotes", "team"].includes(f.key)));
  const launchBad = kind === "launch" && form.data.deadline && !/(Z|[+-]\d{2}:?\d{2})$/.test(String(form.data.deadline));

  return (
    <div className={`${glass} space-y-4 p-4 sm:p-6`} data-testid="editor-document">
      <div className="flex items-center justify-between"><h2 className="text-lg font-black uppercase">{doc ? "Edit" : "New"} {cfg.label}</h2><button className={btn} onClick={onClose}><X className="h-3.5 w-3.5" />Close</button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Lbl t={cfg.titleLabel ?? "Title"}><input className={inp} value={form.title} data-testid="input-doc-title" onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })} /></Lbl>
        <Lbl t="Slug"><input className={inp} value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }} /></Lbl>
        <Lbl t="Status"><select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Lbl>
        <div className="flex flex-wrap items-center gap-4 pt-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />{kind === "news" ? "Pin as main story" : "Featured"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={form.showInNavigation} onChange={(e) => setForm({ ...form, showInNavigation: e.target.checked })} />Show in navigation</label>
        </div>
        <Lbl t="Publish at (schedule)"><input type="datetime-local" className={inp} value={toLocal(form.publishAt)} onChange={(e) => setForm({ ...form, publishAt: fromLocal(e.target.value) })} /></Lbl>
        <Lbl t="Unpublish at"><input type="datetime-local" className={inp} value={toLocal(form.unpublishAt)} onChange={(e) => setForm({ ...form, unpublishAt: fromLocal(e.target.value) })} /></Lbl>
      </div>
      <div className="grid gap-4">{fields.map((f) => <FieldEditor key={f.key} f={f} value={form.data[f.key]} onChange={(v) => setData(f.key, v)} />)}</div>
      {launchBad && <p role="alert" className="text-sm text-red-300">Deadline needs an explicit timezone offset.</p>}
      {kind === "pages" && (
        <div>
          <button type="button" className={btn} onClick={() => setPreview((p) => !p)}><Eye className="h-3.5 w-3.5" />{preview ? "Hide preview" : "Preview"}</button>
          {preview && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-primary/30 bg-black">
              {form.data.heroImage && <img src={form.data.heroImage} alt="" className="h-40 w-full object-cover opacity-60" />}
              <div className="p-4"><p className="text-2xl font-black uppercase">{form.data.headline || form.title || "Untitled"}</p><p className="text-primary">{form.data.subtitle}</p><p className="mt-2 text-sm text-white/65">{form.data.description}</p>
                <p className="mt-3 text-xs text-white/50">Template: {form.data.template ?? "collection"} / {(form.data.products ?? []).length} products</p></div>
            </div>
          )}
        </div>
      )}
      {doc && (kind === "news" || kind === "pages") && (
        <a className={btn} href={`${BASE}${kind === "news" ? "/news" : ""}/${doc.slug}?preview=${doc.id}`} target="_blank" rel="noreferrer" data-testid="link-draft-preview"><Eye className="h-3.5 w-3.5" />Open saved draft preview</a>
      )}
      {save.isError && <Err e={save.error} />}
      <div className="flex flex-wrap gap-2">
        <button className={btnP} disabled={save.isPending || !form.title.trim() || !!launchBad} onClick={() => submit()} data-testid="button-doc-save"><Save className="h-4 w-4" />{save.isPending ? "Saving" : "Save"}</button>
        {form.status !== "published" && <button className={btn} disabled={save.isPending || !form.title.trim() || !!launchBad} onClick={() => submit("published")}>Save and publish</button>}
        {form.status === "published" && <button className={btn} disabled={save.isPending} onClick={() => submit("draft")}>Unpublish</button>}
      </div>
    </div>
  );
}

function DocManager({ kind }: { kind: string }) {
  const qc = useQueryClient();
  const cfg = KINDS[kind];
  const [editing, setEditing] = useState<Doc | "new" | null>(null);
  useEffect(() => setEditing(null), [kind]);
  const q = useQuery({ queryKey: ["manage", kind], queryFn: () => api<Doc[]>(`/manage/${kind}`) });
  const del = useMutation({ mutationFn: (v: number | { id: number; permanent: boolean }) => { const id = typeof v === "number" ? v : v.id; const perm = typeof v !== "number" && v.permanent; return api(`/manage/${kind}/${id}${perm ? "?permanent=true" : ""}`, { method: "DELETE" }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["manage", kind] }); qc.invalidateQueries({ queryKey: ["published"] }); } });
  const reorder = useMutation({
    mutationFn: async (list: Doc[]) => { await Promise.all(list.map((d, i) => d.data?.order === i ? null : api(`/manage/${kind}/${d.id}`, { method: "PATCH", body: JSON.stringify({ title: d.title, slug: d.slug, status: d.status, featured: d.featured, showInNavigation: d.showInNavigation, publishAt: d.publishAt, unpublishAt: d.unpublishAt, data: { ...d.data, order: i } }) }))); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manage", kind] }); qc.invalidateQueries({ queryKey: ["published"] }); },
  });
  const docs = useMemo(() => { const l = [...(q.data ?? [])]; if (kind === "navigation") l.sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0)); return l; }, [q.data, kind]);
  if (editing) return <Editor key={editing === "new" ? "new" : editing.id} kind={kind} doc={editing === "new" ? null : editing} onClose={() => setEditing(null)} />;
  const row = (d: Doc) => (
    <div className="flex items-center justify-between gap-3">
      <button className="min-w-0 text-left" onClick={() => setEditing(d)} data-testid={`button-edit-${d.id}`}>
        <p className="truncate font-bold">{d.title}</p>
        <p className="truncate text-xs text-white/50">/{d.slug}{d.publishAt ? ` / from ${new Date(d.publishAt).toLocaleString()}` : ""}{d.unpublishAt ? ` / until ${new Date(d.unpublishAt).toLocaleString()}` : ""}</p>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {d.featured && <span className="hidden rounded-full border border-primary/50 px-2 py-0.5 text-[10px] uppercase tracking-widest sm:inline">Featured</span>}
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${d.status === "published" ? "border-primary bg-primary/25" : "border-white/25 text-white/60"}`}>{d.status}</span>
        <button aria-label={`Archive ${d.title}`} className="rounded-full p-2 hover:bg-white/10" disabled={del.isPending} onClick={() => { if (window.confirm(`Archive "${d.title}"?`)) del.mutate(d.id); }}><Archive className="h-4 w-4" /></button>
        <button aria-label={`Delete ${d.title} permanently`} data-testid={`button-delete-${d.id}`} className="rounded-full p-2 text-red-300 hover:bg-red-500/15" disabled={del.isPending} onClick={() => { if (window.confirm(`Permanently delete "${d.title}"? This cannot be undone.`)) del.mutate({ id: d.id, permanent: true }); }}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">{cfg.label}</h1><button className={btnP} onClick={() => setEditing("new")} data-testid="button-doc-new"><Plus className="h-4 w-4" />New</button></div>
      {kind === "navigation" && <p className="text-xs text-white/55">Drag rows to reorder.</p>}
      {(del.isError || reorder.isError) && <Err e={del.error || reorder.error} />}
      {q.isLoading && <Skel />}
      {q.isError && <Err e={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && docs.length === 0 && <Empty t={`No ${cfg.label.toLowerCase()} yet.`} />}
      {kind === "navigation"
        ? docs.length > 0 && <DragList items={docs} onChange={(l) => reorder.mutate(l)} render={row} />
        : <div className="space-y-2">{docs.map((d) => <div key={d.id} className={`${glass} p-3`}>{row(d)}</div>)}</div>}
    </div>
  );
}

/* ---------- special panels ---------- */
function useList<T>(key: string, path: string) { return useQuery({ queryKey: ["admin-x", key], queryFn: () => api<T[]>(path) }); }
function Wrap({ title, q, children }: { title: string; q: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }; children: React.ReactNode }) {
  return <div className="space-y-4"><h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">{title}</h1>{q.isLoading ? <Skel /> : q.isError ? <Err e={q.error} retry={() => q.refetch()} /> : children}</div>;
}
const when = (s: string) => new Date(s).toLocaleString();

function SupportPanel() {
  const qc = useQueryClient();
  type T = { id: number; subject: string; category: string; message: string; status: string; reply: string | null; createdAt: string };
  const q = useList<T>("support", "/admin/support");
  const [drafts, setDrafts] = useState<Record<number, { status: string; reply: string }>>({});
  const m = useMutation({ mutationFn: (v: { id: number; status: string; reply: string }) => api(`/admin/support/${v.id}`, { method: "PATCH", body: JSON.stringify({ status: v.status, reply: v.reply }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-x", "support"] }) });
  return (
    <Wrap title="Support requests" q={q}>
      {m.isError && <Err e={m.error} />}
      {q.data?.length === 0 && <Empty t="No support requests." />}
      {q.data?.map((t) => { const d = drafts[t.id] ?? { status: t.status, reply: t.reply ?? "" }; return (
        <article key={t.id} className={`${glass} space-y-3 p-4`} data-testid={`card-ticket-${t.id}`}>
          <div><p className="font-bold">{t.subject}</p><p className="text-xs text-white/50">{t.category} / {when(t.createdAt)}</p></div>
          <p className="whitespace-pre-line text-sm text-white/75">{t.message}</p>
          <textarea aria-label="Reply" rows={3} className={inp} placeholder="Reply" value={d.reply} onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, reply: e.target.value } })} />
          <div className="flex flex-wrap gap-2">
            <select aria-label="Status" className={`${inp} w-auto`} value={d.status} onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, status: e.target.value } })}><option value="open">Open</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option></select>
            <button className={btnP} disabled={m.isPending} onClick={() => m.mutate({ id: t.id, ...d })}>Save</button>
          </div>
        </article>); })}
    </Wrap>
  );
}

function SimpleTable<T extends { id: number }>({ title, path, cols }: { title: string; path: string; cols: { h: string; v: (r: T) => string }[] }) {
  const q = useList<T>(path, path);
  return (
    <Wrap title={title} q={q}>
      {q.data?.length === 0 ? <Empty t="Nothing here yet." /> : (
        <div className={`${glass} overflow-x-auto`}><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b border-primary/25 text-[10px] uppercase tracking-widest text-white/55">{cols.map((c) => <th key={c.h} className="p-3">{c.h}</th>)}</tr></thead>
          <tbody>{q.data?.map((r) => <tr key={r.id} className="border-b border-white/5">{cols.map((c) => <td key={c.h} className="p-3">{c.v(r)}</td>)}</tr>)}</tbody></table></div>
      )}
    </Wrap>
  );
}

function NewsletterPanel() {
  const qc = useQueryClient();
  type S = { id: number; email: string; status: string; createdAt: string };
  const q = useList<S>("newsletter", "/admin/newsletter");
  const m = useMutation({ mutationFn: (v: { id: number; status: string }) => api(`/admin/newsletter/${v.id}`, { method: "PATCH", body: JSON.stringify({ status: v.status }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-x", "newsletter"] }) });
  return (
    <Wrap title="Newsletter" q={q}>
      {m.isError && <Err e={m.error} />}
      {q.data?.length === 0 ? <Empty t="No subscribers yet." /> : (
        <div className={`${glass} overflow-x-auto`}><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b border-primary/25 text-[10px] uppercase tracking-widest text-white/55"><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3" /></tr></thead>
          <tbody>{q.data?.map((r) => <tr key={r.id} className="border-b border-white/5"><td className="p-3">{r.email}</td><td className="p-3">{r.status}</td><td className="p-3">{when(r.createdAt)}</td>
            <td className="p-3 text-right"><button className={btn} disabled={m.isPending} onClick={() => m.mutate({ id: r.id, status: r.status === "unsubscribed" ? "subscribed" : "unsubscribed" })}>{r.status === "unsubscribed" ? "Resubscribe" : "Unsubscribe"}</button></td></tr>)}</tbody></table></div>
      )}
    </Wrap>
  );
}

const HERO_KEYS = ["hero_headline", "hero_subheadline", "hero_small_text", "hero_cta_label", "hero_cta_url", "hero_image", "hero_video", "hero_alignment", "hero_cta_enabled"] as const;
function HeroPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings-raw"], queryFn: () => api<Record<string, string>>("/settings") });
  const [f, setF] = useState<Record<string, string> | null>(null);
  useEffect(() => { if (q.data && !f) setF(Object.fromEntries(HERO_KEYS.map((k) => [k, q.data[k] ?? (k === "hero_cta_enabled" ? "true" : k === "hero_alignment" ? "left" : "")]))); }, [q.data, f]);
  const save = useMutation({ mutationFn: (v: Record<string, string>) => api("/settings/bulk", { method: "POST", body: JSON.stringify(v) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings-raw"] }); qc.invalidateQueries({ queryKey: ["settings"] }); } });
  const set = (k: string, v: string) => setF((p) => ({ ...(p as Record<string, string>), [k]: v }));
  return (
    <Wrap title="Homepage hero" q={q}>
      {f && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${glass} space-y-4 p-4 sm:p-6`}>
            <Lbl t="Headline"><input className={inp} value={f.hero_headline} onChange={(e) => set("hero_headline", e.target.value)} /></Lbl>
            <Lbl t="Subheadline"><input className={inp} value={f.hero_subheadline} onChange={(e) => set("hero_subheadline", e.target.value)} /></Lbl>
            <Lbl t="Small text"><textarea rows={2} className={inp} value={f.hero_small_text} onChange={(e) => set("hero_small_text", e.target.value)} /></Lbl>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={f.hero_cta_enabled !== "false"} onChange={(e) => set("hero_cta_enabled", String(e.target.checked))} />Show button</label>
            <Lbl t="Button label"><input className={inp} value={f.hero_cta_label} onChange={(e) => set("hero_cta_label", e.target.value)} /></Lbl>
            <Lbl t="Button link"><input className={inp} placeholder="/shop" value={f.hero_cta_url} onChange={(e) => set("hero_cta_url", e.target.value)} /></Lbl>
            <Lbl t="Alignment"><select className={inp} value={f.hero_alignment} onChange={(e) => set("hero_alignment", e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Lbl>
            <Lbl t="Image"><ImageField value={f.hero_image} onChange={(v) => set("hero_image", v)} /></Lbl>
            <Lbl t="Video"><ImageField value={f.hero_video} onChange={(v) => set("hero_video", v)} /></Lbl>
            {save.isError && <Err e={save.error} />}
            {save.isSuccess && <Notice msg="Hero saved." />}
            <button className={btnP} disabled={save.isPending} onClick={() => save.mutate(f)} data-testid="button-hero-save"><Save className="h-4 w-4" />{save.isPending ? "Saving" : "Save hero"}</button>
          </div>
          <div className={`${glass} relative overflow-hidden p-0`} aria-label="Hero preview">
            <div className="relative flex min-h-[320px] items-center bg-black p-6" style={{ justifyContent: f.hero_alignment === "center" ? "center" : f.hero_alignment === "right" ? "flex-end" : "flex-start", textAlign: (f.hero_alignment || "left") as "left" | "center" | "right" }}>
              {f.hero_video ? <video src={f.hero_video} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover opacity-50" /> : f.hero_image && <img src={f.hero_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
              <div className="relative max-w-sm">
                <p className="text-3xl font-black uppercase leading-none">{f.hero_headline}</p>
                <p className="mt-2 text-lg text-primary">{f.hero_subheadline}</p>
                <p className="mt-2 text-sm text-white/70">{f.hero_small_text}</p>
                {f.hero_cta_enabled !== "false" && f.hero_cta_label && <span className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-xs font-black uppercase tracking-widest">{f.hero_cta_label}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </Wrap>
  );
}

const PERMS = ["products", "orders", "content", "support", "customers", "discounts", "analytics", "notifications", "settings"];
function TeamPanel() {
  const qc = useQueryClient();
  type M = { id: number; username: string; role: string; permissions: string[] };
  const q = useList<M>("team", "/admin/team");
  const [nu, setNu] = useState({ username: "", password: "", role: "admin", permissions: [] as string[] });
  const inv = () => qc.invalidateQueries({ queryKey: ["admin-x", "team"] });
  const add = useMutation({ mutationFn: () => api("/admin/team", { method: "POST", body: JSON.stringify(nu) }), onSuccess: () => { inv(); setNu({ username: "", password: "", role: "admin", permissions: [] }); } });
  const upd = useMutation({ mutationFn: (m: M) => api(`/admin/team/${m.id}`, { method: "PATCH", body: JSON.stringify({ role: m.role, permissions: m.permissions }) }), onSuccess: inv });
  const remove=useMutation({mutationFn:(id:number)=>api(`/admin/team/${id}`,{method:"DELETE"}),onSuccess:inv});
  const toggle = (arr: string[], p: string) => arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p];
  const permBox = (sel: string[], on: (p: string) => void) => <div className="flex flex-wrap gap-3">{PERMS.map((p) => <label key={p} className="flex items-center gap-1.5 text-xs"><input type="checkbox" className="accent-primary" checked={sel.includes(p)} onChange={() => on(p)} />{p}</label>)}</div>;
  return (
    <Wrap title="Team" q={q}>
      <div className={`${glass} space-y-3 p-4`}>
        <p className="text-xs font-black uppercase tracking-widest text-white/60">Add member (owner only). Team management itself is owner-only.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input aria-label="Username" className={inp} placeholder="Username" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
          <input aria-label="Password" type="password" className={inp} placeholder="Password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          <select aria-label="Role" className={inp} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}><option value="admin">admin</option></select>
        </div>
        {permBox(nu.permissions, (p) => setNu({ ...nu, permissions: toggle(nu.permissions, p) }))}
        {add.isError && <Err e={add.error} />}
        <button className={btnP} disabled={!nu.username || !nu.password || add.isPending} onClick={() => add.mutate()}>Add</button>
      </div>
      {upd.isError && <Err e={upd.error} />}
      {remove.isError&&<Err e={remove.error}/>}
      {q.data?.length === 0 && <Empty t="No team members." />}
      {q.data?.map((m) => <TeamRow key={m.id} m={m} permBox={permBox} toggle={toggle} onSave={(x) => upd.mutate(x)} onRemove={()=>{if(window.confirm("Remove this member's Admin access and sign them out? Their customer data will not be deleted."))remove.mutate(m.id);}} busy={upd.isPending||remove.isPending} />)}
    </Wrap>
  );
}
function TeamRow({ m, permBox, toggle, onSave, onRemove,busy }: { m: { id: number; username: string; role: string; permissions: string[] }; permBox: (s: string[], on: (p: string) => void) => React.ReactNode; toggle: (a: string[], p: string) => string[]; onSave: (m: any) => void;onRemove:()=>void; busy: boolean }) {
  const [role, setRole] = useState(m.role); const [perms, setPerms] = useState(m.permissions);
  return (
    <div className={`${glass} space-y-3 p-4`}>
      <div className="flex items-center justify-between gap-3"><p className="font-bold">{m.username}</p>
        <select aria-label="Role" className={`${inp} w-auto`} value={role} onChange={(e) => setRole(e.target.value)}><option value="admin">admin</option>{m.role === "owner" && <option value="owner">owner</option>}</select></div>
      {permBox(perms, (p) => setPerms(toggle(perms, p)))}
      <button className={btn} disabled={busy} onClick={() => onSave({ id: m.id, username: m.username, role, permissions: perms })}>Save</button>
      <button className={`${btn} ml-2`} disabled={busy} onClick={onRemove}>Remove Admin access</button>
    </div>
  );
}

type Rem = { variationCount?: number; enabled: boolean; times: string[]; days: number[]; timezone: string; quietStart: string; quietEnd: string; dailyLimit: number; intensity: string; categories: string[] };
function RemindersPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-x", "reminders"], queryFn: () => api<Rem>("/admin/reminders") });
  const [f, setF] = useState<Rem | null>(null);
  useEffect(() => { if (q.data && !f) setF(q.data); }, [q.data, f]);
  const save = useMutation({ mutationFn: (v: Rem) => api<Rem>("/admin/reminders", { method: "PATCH", body: JSON.stringify(v) }), onSuccess: (d) => { qc.setQueryData(["admin-x", "reminders"], d); setF(d); } });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <Wrap title="Reminders" q={q}>
      {f && (
        <div className={`${glass} space-y-4 p-4 sm:p-6`}>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />Reminders enabled</label>
          <Lbl t="Times (one HH:MM per line)"><textarea rows={3} className={inp} value={f.times.join("\n")} onChange={(e) => setF({ ...f, times: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></Lbl>
          <div className="flex flex-wrap gap-3">{dayNames.map((n, i) => <label key={n} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-primary" checked={f.days.includes(i)} onChange={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((d) => d !== i) : [...f.days, i].sort() })} />{n}</label>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Lbl t="Timezone"><input className={inp} placeholder="Asia/Dubai" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Lbl>
            <Lbl t="Reminders per day (0 to 5)"><select className={inp} value={f.dailyLimit} onChange={(e) => setF({ ...f, dailyLimit: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Lbl>
            <Lbl t="Quiet start"><input type="time" className={inp} value={f.quietStart} onChange={(e) => setF({ ...f, quietStart: e.target.value })} /></Lbl>
            <Lbl t="Quiet end"><input type="time" className={inp} value={f.quietEnd} onChange={(e) => setF({ ...f, quietEnd: e.target.value })} /></Lbl>
            <Lbl t="Intensity"><select className={inp} value={f.intensity} onChange={(e) => setF({ ...f, intensity: e.target.value })}><option value="professional">Professional</option><option value="mixed">Mixed</option><option value="funny">Funny</option></select></Lbl>
          </div>
          <Lbl t="Categories (one per line)"><textarea rows={3} className={inp} value={f.categories.join("\n")} onChange={(e) => setF({ ...f, categories: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></Lbl>
          {typeof f.variationCount === "number" && <p className="text-xs text-white/55">{f.variationCount} message variations available.</p>}
          {save.isError && <Err e={save.error} />}
          {save.isSuccess && <Notice msg="Saved." />}
          <button className={btnP} disabled={save.isPending} onClick={() => save.mutate(f)}><Save className="h-4 w-4" />Save</button>
        </div>
      )}
    </Wrap>
  );
}

function NotificationPanel() {
  const qc = useQueryClient();
  type N = { id: number; title: string; body: string; category: string; url: string; read: boolean; createdAt: string };
  const [cat, setCat] = useState("");
  const q = useQuery({ queryKey: ["admin-x", "notif", cat], queryFn: () => api<N[]>(`/admin/notification-center${cat ? `?category=${encodeURIComponent(cat)}` : ""}`) });
  const [, nav] = useLocation();
  const read = useMutation({ mutationFn: (b: { ids: number[] } | { all: true }) => api("/admin/notification-center/read", { method: "PATCH", body: JSON.stringify(b) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-x", "notif"] }) });
  const cats = ["important", "orders", "activity", "support", "inventory", "work-reminders"];
  return (
    <Wrap title="Notification center" q={q}>
      <div className="flex flex-wrap items-center gap-2">
        <button className={`${btn} ${!cat ? "bg-primary/30" : ""}`} onClick={() => setCat("")}>All</button>
        {cats.map((c) => <button key={c} className={`${btn} ${cat === c ? "bg-primary/30" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
        <button className={`${btn} ml-auto`} disabled={read.isPending} onClick={() => read.mutate({ all: true })}>Mark all read</button>
      </div>
      {read.isError && <Err e={read.error} />}
      {q.data?.length === 0 && <Empty t="No notifications." />}
      {q.data?.map((n) => (
        <div key={n.id} className={`${glass} flex items-start justify-between gap-3 p-4 ${n.read ? "opacity-60" : ""}`}>
          <button className="min-w-0 text-left" onClick={() => { if (!n.read) read.mutate({ ids: [n.id] }); if (n.url) { /^https?:/i.test(n.url) ? window.open(n.url, "_blank") : nav(n.url); } }}>
            <p className="font-bold">{n.title}</p><p className="text-sm text-white/70">{n.body}</p><p className="mt-1 text-xs text-white/45">{n.category} / {when(n.createdAt)}</p>
          </button>
          {!n.read && <button className={btn} onClick={() => read.mutate({ ids: [n.id] })}>Read</button>}
        </div>
      ))}
    </Wrap>
  );
}

/* ---------- page ---------- */
export default function ContentManagement() {
  const [loc] = useLocation();
  const kind = decodeURIComponent(loc.split("?")[0].replace(/\/+$/, "").split("/").pop() ?? "");
  return (
    <div className="space-y-6 text-white" data-testid={`page-manage-${kind}`}>
      {kind === "launch" ? <LaunchAdmin />
        : kind === "support" ? <SupportPanel />
        : kind === "newsletter" ? <NewsletterPanel />
        : kind === "homepage" ? <HeroPanel />
        : kind === "customers" ? <SimpleTable title="Customers" path="/admin/customers" cols={[{ h: "Name", v: (r: {id:number;name:string;email:string;phone:string;createdAt:string}) => r.name }, { h: "Email", v: (r) => r.email }, { h: "Phone", v: (r) => r.phone || "" }, { h: "Joined", v: (r) => when(r.createdAt) }]} />
        : kind === "team" ? <TeamPanel />
        : kind === "reminders" ? <RemindersPanel />
        : kind === "notification-center" ? <NotificationPanel />
        : KINDS[kind] ? <DocManager kind={kind} />
        : <Empty t={`Unknown section "${kind}". Available: ${[...Object.keys(KINDS), ...SPECIAL].join(", ")}.`} />}
    </div>
  );
}
