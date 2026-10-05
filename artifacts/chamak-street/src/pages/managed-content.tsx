import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PackageOpen, RefreshCw } from "lucide-react";
import { ContentSeo } from "@/components/content-seo";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Doc = {
  id: number; kind: string; title: string; slug: string; featured: boolean; publishAt: string | null;
  data: Record<string, any>;
};
type Product = { id: number; name: string; price: number; imageUrl?: string | null };

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/api${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(r.status === 404 ? "not-found" : `Request failed (${r.status})`);
  return r.json();
}

const glass = "rounded-3xl border border-violet-500/30 bg-white/[0.04] backdrop-blur-xl";
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const firstImage = (u?: string | null) => {
  if (!u) return "";
  try { const p = JSON.parse(u); if (Array.isArray(p)) { const f = p[0]; return typeof f === "string" ? f : f?.url ?? ""; } } catch { /* plain url */ }
  return u;
};
const dateOf = (d: Doc) => {
  const raw = d.data?.date || d.publishAt;
  const dt = raw ? new Date(raw) : null;
  return dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
};

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[100dvh] bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">{children}</div></main>;
}
function Skeleton() {
  return <Shell><div className="space-y-4" aria-busy="true"><div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/10" /><div className="h-64 animate-pulse rounded-3xl bg-white/5" /><div className="h-24 animate-pulse rounded-3xl bg-white/5" /></div></Shell>;
}
function Empty({ title, text, onRetry }: { title: string; text?: string; onRetry?: () => void }) {
  return (
    <Shell>
      <div className={`${glass} flex flex-col items-center px-6 py-16 text-center`} data-testid="state-empty">
        <PackageOpen className="mb-4 h-9 w-9 text-violet-300" />
        <h1 className="text-lg font-bold">{title}</h1>
        {text && <p className="mt-2 max-w-sm text-sm text-white/60">{text}</p>}
        <div className="mt-6 flex gap-3">
          {onRetry && <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-violet-400/50 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-violet-500/20"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}
          <Link href="/shop" className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/10">Shop</Link>
        </div>
      </div>
    </Shell>
  );
}

function setTitle(t: string) { if (typeof document !== "undefined") document.title = `${t} | IMAGINATE`; }

const previewId = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("preview"));
function PreviewBanner() { return <p className="mb-4 rounded-xl border border-violet-400/50 bg-violet-500/15 px-3 py-2 text-xs font-bold uppercase tracking-widest">Draft preview. Not public.</p>; }
const docQuery = (kind: string, slug: string) => {
  const pv = previewId();
  return { queryKey: pv ? ["preview", kind, pv] : ["published", kind, slug], queryFn: () => getJson<Doc>(pv ? `/manage/${kind}/${pv}/preview` : `/published/${kind}/${encodeURIComponent(slug)}`), retry: false };
};

function NewsList() {
  const q = useQuery({ queryKey: ["published", "news"], queryFn: () => getJson<Doc[]>("/published/news") });
  if (q.isLoading) return <Skeleton />;
  if (q.isError) return <Empty title="News could not load" text="Check your connection and try again." onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <Empty title="No news yet" text="Nothing has been published." />;
  setTitle("News");
  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-black uppercase tracking-tight sm:text-5xl">News</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {q.data.map((n) => (
          <Link key={n.id} href={`/news/${n.slug}`} data-testid={`card-news-${n.id}`} className={`${glass} group overflow-hidden transition hover:border-violet-400/70`}>
            <div className="aspect-[16/9] bg-black/60">{n.data?.imageUrl && <img src={n.data.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
            <div className="p-5">
              {n.data?.category && <p className="text-[11px] font-bold uppercase tracking-widest text-white/65">{n.data.category}</p>}
              <h2 className="mt-2 text-lg font-semibold leading-snug">{n.title}</h2>
              {n.data?.summary && <p className="mt-2 line-clamp-2 text-sm text-white/60">{n.data.summary}</p>}
              <p className="mt-3 text-xs text-white/45">{dateOf(n)}</p>
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

function Article({ slug }: { slug: string }) {
  const q = useQuery(docQuery("news", slug));
  if (q.isLoading) return <Skeleton />;
  if (q.isError) return <Empty title="Article unavailable" text="It may have been unpublished or never existed." onRetry={() => q.refetch()} />;
  const n = q.data!;
  const d = n.data ?? {};
  setTitle(d.seoTitle || n.title);
  return (
    <Shell>
      <Link href="/news" className="text-xs font-bold uppercase tracking-widest text-violet-300 hover:text-white">Back to news</Link>
      {previewId() && <div className="mt-4"><PreviewBanner /></div>}
      <article className="mt-4">
        <ContentSeo title={d.seoTitle||n.title} description={d.seoDescription||d.summary} image={d.socialImage||d.imageUrl}/>
        {d.category && <p className="text-[11px] font-bold uppercase tracking-widest text-white/65">{d.category}</p>}
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl" data-testid="text-news-title">{n.title}</h1>
        <p className="mt-3 text-sm text-white/50">{dateOf(n)}</p>
        {d.imageUrl && <img src={d.imageUrl} alt="" className="mt-6 w-full rounded-3xl border border-violet-500/30 object-cover" />}
        {d.summary && <p className="mt-6 text-lg text-white/80">{d.summary}</p>}
        {d.article && <div className="mt-6 whitespace-pre-line text-base leading-8 text-white/70">{d.article}</div>}
        {d.videoUrl && <video src={d.videoUrl} controls className="mt-6 w-full rounded-3xl border border-violet-500/30" />}
        {arr(d.images).length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {arr(d.images).map((u, i) => <img key={i} src={u} alt="" loading="lazy" className="aspect-square w-full rounded-2xl border border-white/10 object-cover" />)}
          </div>
        )}
      </article>
    </Shell>
  );
}

function ProductGrid({ ids }: { ids: number[] }) {
  const q = useQuery({ queryKey: ["collection-products",ids], queryFn: async()=>{const results=await Promise.allSettled(ids.map(id=>getJson<Product>(`/products/${id}`)));return results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]);}, staleTime: 60_000, enabled: ids.length > 0 });
  if (!ids.length) return null;
  if (q.isLoading) return <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{ids.map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/5" />)}</div>;
  if (q.isError) return <button onClick={() => q.refetch()} className="mt-8 rounded-full border border-violet-400/50 px-4 py-2 text-xs font-bold uppercase tracking-widest">Products failed to load. Retry</button>;
  const map = new Map((q.data ?? []).map((p) => [p.id, p]));
  const list = ids.map((i) => map.get(i)).filter(Boolean) as Product[];
  if (!list.length) return <p className="mt-8 text-sm text-white/55">The selected products are not currently available.</p>;
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((p) => (
        <Link key={p.id} href={`/product/${p.id}`} data-testid={`card-product-${p.id}`} className="group overflow-hidden rounded-2xl border border-violet-500/25 bg-white/[0.04] backdrop-blur-xl transition hover:border-violet-400/70">
          <div className="aspect-[3/4] bg-black/60">{firstImage(p.imageUrl) && <img src={firstImage(p.imageUrl)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}</div>
          <div className="p-3"><p className="truncate text-sm font-semibold">{p.name}</p><p className="mt-1 text-xs font-bold text-violet-300">AED {p.price}</p></div>
        </Link>
      ))}
    </div>
  );
}

function Page({ slug }: { slug: string }) {
  const q = useQuery(docQuery("pages", slug));
  if (q.isLoading) return <Skeleton />;
  if (q.isError) return <Empty title="Page unavailable" text="This page is not published." onRetry={() => q.refetch()} />;
  const p = q.data!; const d = p.data ?? {};
  setTitle(d.seoTitle || p.title);
  const story = d.template === "our-story";
  const timeline = arr(d.timeline), quotes = arr(d.quotes), team = arr(d.team);
  return (
    <main className="min-h-[100dvh] bg-[#050505] text-white">
      <ContentSeo title={d.seoTitle||p.title} description={d.seoDescription||d.description} image={d.socialImage||d.heroImage}/>
      {previewId() && <div className="px-4 pt-4 sm:px-6"><PreviewBanner /></div>}
      <header className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        {d.heroVideo ? <video src={d.heroVideo} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-40" />
          : d.heroImage && <img src={d.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        <div className="relative mx-auto max-w-5xl">
          <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl" data-testid="text-page-headline">{d.headline || p.title}</h1>
          {d.subtitle && <p className="mt-4 text-lg text-violet-200 sm:text-2xl">{d.subtitle}</p>}
          {d.description && <p className="mt-4 max-w-2xl text-white/70">{d.description}</p>}
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {d.intro && <p className="max-w-3xl whitespace-pre-line text-lg leading-8 text-white/80">{d.intro}</p>}
        {story && d.story && <div className="mt-8 max-w-3xl whitespace-pre-line leading-8 text-white/65">{d.story}</div>}
        {story && timeline.length > 0 && (
          <ol className="mt-12 space-y-4 border-l border-violet-500/40 pl-5">
            {timeline.map((t, i) => <li key={i} className={`${glass} p-4`}><p className="text-xs font-bold uppercase tracking-widest text-violet-300">{t.year}</p><p className="mt-1 font-semibold">{t.title}</p>{t.text && <p className="mt-1 text-sm text-white/60">{t.text}</p>}</li>)}
          </ol>
        )}
        {story && quotes.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {quotes.map((x, i) => <blockquote key={i} className={`${glass} p-5`}><p className="text-lg leading-7">{x.text}</p>{x.author && <footer className="mt-3 text-xs font-bold uppercase tracking-widest text-violet-300">{x.author}</footer>}</blockquote>)}
          </div>
        )}
        {story && team.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {team.map((m, i) => <div key={i} className={`${glass} overflow-hidden`}>{m.imageUrl && <img src={m.imageUrl} alt={m.name} loading="lazy" className="aspect-square w-full object-cover" />}<div className="p-3"><p className="font-semibold">{m.name}</p><p className="text-xs text-white/55">{m.role}</p></div></div>)}
          </div>
        )}
        <ProductGrid ids={arr(d.products).map(Number).filter(Boolean)} />
        {d.ctaLabel && d.ctaUrl && (
          <div className="mt-10">
            {/^https?:\/\//i.test(d.ctaUrl)
              ? <a href={d.ctaUrl} className="inline-block rounded-full bg-violet-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-violet-400">{d.ctaLabel}</a>
              : <Link href={d.ctaUrl} className="inline-block rounded-full bg-violet-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-violet-400">{d.ctaLabel}</Link>}
          </div>
        )}
      </div>
    </main>
  );
}

export default function ManagedContent() {
  const [loc] = useLocation();
  const path = loc.split("?")[0].replace(/\/+$/, "");
  if (path === "/news") return <NewsList />;
  if (path.startsWith("/news/")) return <Article slug={decodeURIComponent(path.slice(6))} />;
  return <Page slug={decodeURIComponent(path.replace(/^\//, ""))} />;
}
