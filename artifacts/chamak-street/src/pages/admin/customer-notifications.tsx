import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Save, Send, Trash2, Pencil } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

type Campaign = { id: number; title: string; body: string; category: string; url: string; status: string; dueAt: string | null; accepted: number; failed: number; skipped: number };
type Overview = { campaigns: Campaign[]; templateCount: number; marketingWeeklyLimit: number; configured: boolean;configurationError?:string };
type Template = { id: string | number; category: string; title: string; body: string; transactional: boolean };

const BULK = ["drop", "restock", "preorder", "release", "promotion", "news", "reminder"];
const glass = "glass-card rounded-2xl p-4 sm:p-5";
const inp = "w-full rounded-xl border border-primary/30 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
const btn = "inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-primary/20 disabled:opacity-40";
const btnP = "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-40";
const toDubai = (iso: string | null) => { if (!iso) return ""; const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 4 * 3600000).toISOString().slice(0, 16) : ""; };
const fromDubai = (v: string) => {
  if(!v)return null;
  const time=Date.parse(`${v}${/T\d{2}:\d{2}:\d{2}/.test(v)?"":":00"}+04:00`);
  return Number.isFinite(time)?new Date(time).toISOString():null;
};
const braces = (s: string) => Array.from(new Set(s.match(/\{[^{}]*\}/g) ?? []));
const Lbl = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block space-y-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t}</span>{children}</label>;

const empty = { title: "", body: "", category: "drop", url: "/shop", status: "draft" as "draft" | "scheduled", due: "" };

export default function AdminCustomerNotifications() {
  const qc = useQueryClient();
  const ov = useQuery({ queryKey: ["admin-customer-notifications"], queryFn: () => adminApi<Overview>("/admin/customer-notifications") });
  const tp = useQuery({ queryKey: ["admin-customer-notifications", "templates"], queryFn: () => adminApi<Template[]>("/admin/customer-notifications/templates"), staleTime: 300_000 });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState(""); const [cat, setCat] = useState("all");
  const [fills, setFills] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [templatePage,setTemplatePage]=useState(0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-customer-notifications"], exact: true });
  const unresolved = useMemo(() => braces(`${form.title} ${form.body}`), [form.title, form.body]);
  const dueIso = fromDubai(form.due);
  const invalid = !form.title.trim() || !form.body.trim() || unresolved.length > 0 || !form.url.startsWith("/") || (form.status === "scheduled" && (!dueIso || Date.parse(dueIso) <= Date.now()));

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({ title: form.title.trim(), body: form.body.trim(), category: form.category, url: form.url, status: form.status, dueAt: form.status === "scheduled" ? dueIso : null });
      return editId ? adminApi(`/admin/customer-notifications/${editId}`, { method: "PATCH", body }) : adminApi("/admin/customer-notifications", { method: "POST", body });
    },
    onSuccess: () => { setForm(empty); setEditId(null); setResult("Saved. Nothing has been sent."); refresh(); },
  });
  const del = useMutation({ mutationFn: (id: number) => adminApi(`/admin/customer-notifications/${id}`, { method: "DELETE" }), onSuccess: refresh });
  const send = useMutation({
    mutationFn: (id: number) => adminApi<{ accepted: number; failed: number; skipped: number }>(`/admin/customer-notifications/${id}/send`, { method: "POST" }),
    onSuccess: (r) => { setResult(`Push provider accepted ${r.accepted}, failed ${r.failed}, skipped ${r.skipped}. Acceptance by the push provider does not confirm the notification reached a phone.`); refresh(); },
  });

  const templates = (tp.data ?? []).filter((t) => (cat === "all" || t.category === cat) && `${t.title} ${t.body}`.toLowerCase().includes(search.toLowerCase()));
  const cats = useMemo(() => Array.from(new Set((tp.data ?? []).map((t) => t.category))).sort(), [tp.data]);
  const pick = (t: Template) => {
    if (t.transactional) return;
    setForm({ ...form, title: t.title, body: t.body, category: BULK.includes(t.category) ? t.category : form.category });
    setFills({});
  };
  const applyFills = () => {
    let { title, body } = form;
    for (const [k, v] of Object.entries(fills)) if (v.trim()) { title = title.split(k).join(v.trim()); body = body.split(k).join(v.trim()); }
    setForm({ ...form, title, body }); setFills({});
  };
  const editable = (c: Campaign) => ["draft","scheduled","failed"].includes(c.status);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Customer notifications</h1>
        <p className="mt-1 text-xs text-white/55">Separate from the admin reminder center. Marketing is capped at {ov.data?.marketingWeeklyLimit ?? 5} per customer per week; nothing is sent automatically to fill that limit.</p></div>
      {ov.isLoading && <div className="glass-skeleton h-32 rounded-2xl" aria-busy="true" />}
      {ov.isError && <div role="alert" className={`${glass} flex items-center justify-between text-sm text-red-200`}><span>{(ov.error as Error).message}</span><button className={btn} onClick={() => ov.refetch()}><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>}
      {ov.data && !ov.data.configured && <p role="alert" className={`${glass} text-sm text-red-200`}>{ov.data.configurationError||"Web push is not configured."} Campaigns can be drafted but not sent.</p>}

      <section className={`${glass} space-y-3`}>
        <h2 className="text-sm font-black uppercase tracking-widest">{editId ? "Edit campaign" : "Compose"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl t="Title"><input className={inp} value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-cn-title" /></Lbl>
          <Lbl t="Category"><select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{BULK.map((c) => <option key={c} value={c}>{c}</option>)}</select></Lbl>
        </div>
        <Lbl t="Message"><textarea rows={3} className={inp} maxLength={240} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="input-cn-body" /></Lbl>
        <div className="grid gap-3 sm:grid-cols-3">
          <Lbl t="Opens (site path)"><input className={inp} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Lbl>
          <Lbl t="Save as"><select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "scheduled" })}><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select></Lbl>
          {form.status === "scheduled" && <Lbl t="Send at (Dubai time, UTC+04:00)"><input type="datetime-local" className={inp} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Lbl>}
        </div>
        {unresolved.length > 0 && (
          <div role="alert" className="space-y-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm">
            <p className="text-red-200">Replace these placeholders before saving:</p>
            <div className="grid gap-2 sm:grid-cols-2">{unresolved.map((k) => <input key={k} className={inp} placeholder={`Value for ${k}`} value={fills[k] ?? ""} onChange={(e) => setFills({ ...fills, [k]: e.target.value })} />)}</div>
            <button type="button" className={btn} onClick={applyFills}>Apply values</button>
          </div>
        )}
        <div className="rounded-2xl border border-white/10 bg-black/50 p-3" aria-label="Preview"><p className="text-[10px] uppercase tracking-widest text-white/40">Preview</p><p className="mt-1 font-semibold">{form.title || "Title"}</p><p className="text-sm text-white/65">{form.body || "Message"}</p></div>
        {save.isError && <p role="alert" className="text-sm text-red-300">{(save.error as Error).message}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={btnP} disabled={invalid || save.isPending} onClick={() => save.mutate()} data-testid="button-cn-save"><Save className="h-4 w-4" />{save.isPending ? "Saving" : form.status === "scheduled" ? "Schedule" : "Save draft"}</button>
          {editId && <button className={btn} onClick={() => { setEditId(null); setForm(empty); }}>Cancel edit</button>}
        </div>
      </section>

      {result && <p role="status" className={`${glass} text-sm`}>{result}</p>}
      {(send.isError || del.isError) && <p role="alert" className="text-sm text-red-300">{((send.error || del.error) as Error).message}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-widest">Campaigns</h2>
        {ov.data?.campaigns.length === 0 && <p className={`${glass} text-sm text-white/60`}>No campaigns yet.</p>}
        {ov.data?.campaigns.map((c) => (
          <article key={c.id} className={`${glass} space-y-2`} data-testid={`card-campaign-${c.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-bold">{c.title}</p><p className="text-sm text-white/65">{c.body}</p></div>
              <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">{c.status}</span>
            </div>
            <p className="text-xs text-white/50">{c.category} / opens {c.url}{c.dueAt ? ` / due ${new Date(c.dueAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} Dubai` : ""} / provider accepted {c.accepted}, failed {c.failed}, skipped {c.skipped}</p>
            {editable(c) && (
              <div className="flex flex-wrap gap-2">
                <button className={btn} onClick={() => { setEditId(c.id); setForm({ title: c.title, body: c.body, category: c.category, url: c.url, status: c.status as "draft" | "scheduled", due: toDubai(c.dueAt) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-3.5 w-3.5" />Edit</button>
                <button className={btn} disabled={send.isPending || !ov.data?.configured} onClick={() => { if (window.confirm(`Send "${c.title}" now to opted-in customers? Customers over their weekly marketing limit are skipped.`)) send.mutate(c.id); }}><Send className="h-3.5 w-3.5" />Send now</button>
                <button className={`${btn} text-red-300`} disabled={del.isPending} onClick={() => { if (window.confirm(`Delete "${c.title}"?`)) del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5" />Delete</button>
              </div>
            )}
          </article>
        ))}
      </section>

      <section className={`${glass} space-y-3`}>
        <h2 className="text-sm font-black uppercase tracking-widest">Templates {tp.data ? `(${tp.data.length})` : ""}</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
          <input className={inp} placeholder="Search templates" value={search} onChange={(e) => {setSearch(e.target.value);setTemplatePage(0);}} data-testid="input-template-search" />
          <select className={inp} aria-label="Category" value={cat} onChange={(e) => {setCat(e.target.value);setTemplatePage(0);}}><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        {tp.isLoading && <div className="glass-skeleton h-24 rounded-xl" />}
        {tp.isError && <p role="alert" className="text-sm text-red-300">Templates could not be loaded. <button className="underline" onClick={() => tp.refetch()}>Retry</button></p>}
        <ul className="max-h-96 space-y-1.5 overflow-auto">
          {templates.slice(templatePage*30,templatePage*30+30).map((t) => (
            <li key={t.id}><button type="button" disabled={t.transactional} onClick={() => pick(t)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-sm transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="flex justify-between gap-2"><strong>{t.title}</strong><span className="text-[10px] uppercase tracking-widest text-white/45">{t.category}{t.transactional ? " / event-only" : ""}</span></span>
              <span className="text-white/60">{t.body}</span></button></li>
          ))}
        </ul>
        {tp.data && templates.length === 0 && <p className="text-sm text-white/55">No templates match.</p>}
        {templates.length>30&&<div className="flex items-center justify-between gap-3 text-xs">
          <button className={btn} disabled={templatePage===0} onClick={()=>setTemplatePage(p=>p-1)}>Previous</button>
          <span>Page {templatePage+1} of {Math.ceil(templates.length/30)}</span>
          <button className={btn} disabled={(templatePage+1)*30>=templates.length} onClick={()=>setTemplatePage(p=>p+1)}>Next</button>
        </div>}
        <p className="text-[11px] text-white/45">Order, shipping and delivery messages are sent only for real order events, never as bulk marketing.</p>
      </section>
    </div>
  );
}
