import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export type NewsDoc = {
  id: number; title: string; slug: string; featured: boolean; publishAt: string | null;
  data: { category?: string; summary?: string; imageUrl?: string; date?: string };
};

function fmt(doc: NewsDoc) {
  const raw = doc.data?.date || doc.publishAt;
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function HomepageNews() {
  const { data } = useQuery<NewsDoc[]>({
    queryKey: ["published", "news"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/published/news`, { credentials: "include" });
      if (!r.ok) throw new Error("Could not load news");
      return r.json();
    },
    staleTime: 60_000,
  });
  if (!data || data.length === 0) return null;
  const featured = data.find((d) => d.featured) ?? data[0];
  const rest = data.filter((d) => d.id !== featured.id).slice(0, 4);

  return (
    <section aria-label="News" className="px-4 py-12 sm:px-6 lg:px-8" data-testid="section-homepage-news">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">News</h2>
          <Link href="/news" className="text-xs font-bold uppercase tracking-widest text-violet-300 hover:text-white" data-testid="link-news-all">All news</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Link href={`/news/${featured.slug}`} data-testid={`card-news-featured-${featured.id}`}
            className="group flex flex-col overflow-hidden rounded-3xl border border-violet-500/30 bg-white/[0.04] backdrop-blur-xl transition hover:border-violet-400/70">
            <div className="aspect-[16/9] overflow-hidden bg-black/60">
              {featured.data?.imageUrl && <img src={featured.data.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
            </div>
            <div className="p-5 sm:p-7">
              {featured.data?.category && <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">{featured.data.category}</p>}
              <h3 className="mt-3 text-xl font-semibold leading-tight text-white sm:text-3xl">{featured.title}</h3>
              <p className="mt-4 text-sm text-white/55">{fmt(featured)}</p>
            </div>
          </Link>
          {rest.length > 0 && (
            <div className="flex flex-col gap-3">
              {rest.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} data-testid={`card-news-${n.id}`}
                  className="group flex flex-1 items-stretch gap-4 overflow-hidden rounded-2xl border border-violet-500/20 bg-white/[0.03] backdrop-blur-xl transition hover:border-violet-400/60">
                  <div className="w-28 shrink-0 bg-black/60 sm:w-36">
                    {n.data?.imageUrl && <img src={n.data.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center py-3 pr-4">
                    {n.data?.category && <p className="text-[10px] font-bold uppercase tracking-widest text-white/65">{n.data.category}</p>}
                    <h3 className="mt-1.5 line-clamp-3 text-sm font-semibold leading-snug text-white sm:text-base">{n.title}</h3>
                    <p className="mt-2 text-xs text-white/50">{fmt(n)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
