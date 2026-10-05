import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MessageCircle, Search, Send, RefreshCw } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { useSettings } from "@/lib/use-settings";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Faq = { id: number; title: string; data: { category?: string; answer?: string } };
type Ticket = { id: number; subject: string; category: string; message: string; status: string; reply: string | null; createdAt: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}/api${path}`, { credentials: "include", headers: init?.body ? { "Content-Type": "application/json" } : undefined, ...init });
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try { const j = await r.json(); if (j?.error || j?.message) msg = j.error || j.message; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json();
}

const glass = "rounded-2xl border border-violet-500/30 bg-white/[0.04] backdrop-blur-xl";
const field = "w-full rounded-xl border border-violet-500/30 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/40";

export default function SupportPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const phone = (settings.whatsapp_number || "").replace(/\D/g, "");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", category: "", message: "" });
  const [sent, setSent] = useState(false);

  const faq = useQuery({ queryKey: ["published", "faq"], queryFn: () => api<Faq[]>("/published/faq") });
  const tickets = useQuery({ queryKey: ["support", "mine"], queryFn: () => api<Ticket[]>("/support"), retry: false });

  const categories = useMemo(() => ["All", ...Array.from(new Set((faq.data ?? []).map((f) => f.data?.category).filter(Boolean) as string[]))], [faq.data]);
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (faq.data ?? []).filter((f) => (cat === "All" || f.data?.category === cat) && (!s || f.title.toLowerCase().includes(s) || (f.data?.answer ?? "").toLowerCase().includes(s)));
  }, [faq.data, search, cat]);

  const send = useMutation({
    mutationFn: () => api<Ticket>("/support", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { setSent(true); setForm({ subject: "", category: "", message: "" }); qc.invalidateQueries({ queryKey: ["support", "mine"] }); },
  });
  const valid = form.subject.trim() && form.category.trim() && form.message.trim();
  const ticketCats = categories.filter((c) => c !== "All");

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-[#050505] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">How can we help?</h1>
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input aria-label="Search help" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" data-testid="input-faq-search" className={`${field} pl-10`} />
          </div>

          {categories.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="tablist">
              {categories.map((c) => (
                <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} data-testid={`chip-faq-${c}`}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${cat === c ? "border-violet-300 bg-violet-500/30 text-white" : "border-violet-500/30 text-white/70 hover:border-violet-300"}`}>{c}</button>
              ))}
            </div>
          )}

          <section className="mt-6 space-y-2" aria-live="polite">
            {faq.isLoading && [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />)}
            {faq.isError && <div className={`${glass} p-5 text-sm`}>Questions could not load. <button onClick={() => faq.refetch()} className="ml-2 inline-flex items-center gap-1 font-bold text-violet-300"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>}
            {faq.isSuccess && shown.length === 0 && <div className={`${glass} p-5 text-sm text-white/65`}>{faq.data.length === 0 ? "No questions have been published yet. Send us a request below." : "No questions match your search."}</div>}
            {shown.map((f) => (
              <div key={f.id} className={`${glass} overflow-hidden`}>
                <button onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id} data-testid={`button-faq-${f.id}`} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left">
                  <span className="text-sm font-bold">{f.title}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-violet-300 transition-transform ${open === f.id ? "rotate-180" : ""}`} />
                </button>
                {open === f.id && <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-white/70">{f.data?.answer}</p>}
              </div>
            ))}
          </section>

          <section className={`${glass} mt-10 p-5 sm:p-6`}>
            <h2 className="text-lg font-black uppercase tracking-tight">Send a request</h2>
            {sent && <p role="status" className="mt-3 rounded-xl border border-violet-400/40 bg-violet-500/15 p-3 text-sm" data-testid="status-ticket-sent">Request received. Replies appear below.</p>}
            <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); setSent(false); if (valid) send.mutate(); }}>
              <input aria-label="Subject" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={field} data-testid="input-ticket-subject" />
              <input aria-label="Category" list="ticket-cats" placeholder="Category (for example Orders)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field} data-testid="input-ticket-category" />
              <datalist id="ticket-cats">{ticketCats.map((c) => <option key={c} value={c} />)}</datalist>
              <textarea aria-label="Message" rows={5} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={field} data-testid="input-ticket-message" />
              {send.isError && <p role="alert" className="text-sm text-red-300">{(send.error as Error).message}</p>}
              <button disabled={!valid || send.isPending} data-testid="button-ticket-send" className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-violet-400 disabled:opacity-40">
                <Send className="h-4 w-4" />{send.isPending ? "Sending" : "Send request"}
              </button>
            </form>
          </section>

          {tickets.isError && <div role="alert" className={`${glass} mt-8 p-4 text-sm text-red-200`}>Your previous requests could not load ({(tickets.error as Error).message}). <button onClick={() => tickets.refetch()} className="ml-2 font-bold text-violet-300">Retry</button></div>}
          {tickets.data && tickets.data.length > 0 && (
            <section className="mt-8 space-y-3">
              <h2 className="text-lg font-black uppercase tracking-tight">Your requests</h2>
              {tickets.data.map((t) => (
                <article key={t.id} className={`${glass} p-4`} data-testid={`card-ticket-${t.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-bold">{t.subject}</p><p className="text-xs text-white/50">{t.category} / {new Date(t.createdAt).toLocaleDateString("en-GB")}</p></div>
                    <span className="shrink-0 rounded-full border border-violet-400/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-200">{t.status}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-white/70">{t.message}</p>
                  {t.reply && <div className="mt-3 rounded-xl border border-violet-400/40 bg-violet-500/10 p-3 text-sm"><p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">Reply</p><p className="whitespace-pre-line">{t.reply}</p></div>}
                </article>
              ))}
            </section>
          )}

          {phone && (
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp"
              className="mt-8 flex items-center justify-center gap-2 rounded-full border border-violet-400/50 bg-white/[0.04] px-6 py-3.5 text-sm font-bold backdrop-blur-xl hover:bg-violet-500/20">
              <MessageCircle className="h-5 w-5" />Chat on WhatsApp
            </a>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
