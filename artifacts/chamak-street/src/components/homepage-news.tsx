import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export type NewsDoc = {
  id: number; title: string; slug: string; featured: boolean; publishAt: string | null; createdAt?: string;
  data: { category?: string; summary?: string; imageUrl?: string; date?: string };
};

function fmt(doc: NewsDoc) {
  const raw = doc.data?.date || doc.publishAt || doc.createdAt;
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function HomepageNews() {
  const { data, isError, refetch } = useQuery<NewsDoc[]>({
    queryKey: ["published", "news"],
    queryFn: async ({ signal }) => {
      const r = await fetch(`${BASE}/api/published/news`, { credentials: "include", cache: "no-store", signal });
      if (!r.ok) throw new Error("Could not load news");
      return r.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 5_000,
  });
  if (isError && !data) return <section aria-label="News" className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-white/10 p-5"><h2 className="text-xl font-bold text-white">News</h2><p role="alert" className="mt-2 text-sm text-white/60">News could not be loaded.</p><button type="button" onClick={() => void refetch()} className="mt-3 text-sm text-primary" data-testid="button-news-retry">Try again</button></div></section>;
  if (!data || data.length === 0) return null;
  const featured = data.find((d) => d.featured) ?? data[0];
  const rest = data.filter((d) => d.id !== featured.id).slice(0, 4);
  const solo = rest.length === 0;

  return (
    <section aria-label="News" className="px-4 py-10 sm:px-6 lg:px-8" data-testid="section-homepage-news">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">News</h2>
          <Link href="/news" className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white" data-testid="link-news-all">All news</Link>
        </div>
        <div className={solo ? "" : "grid gap-4 lg:grid-cols-[1.35fr_1fr]"}>
          <Link href={`/news/${featured.slug}`} data-testid={`card-news-featured-${featured.id}`}
            className={`group glass-card flex overflow-hidden rounded-3xl ${solo && featured.data?.imageUrl ? "flex-col md:flex-row" : "flex-col"}`}>
            {featured.data?.imageUrl && (
              <div className={`overflow-hidden bg-black ${solo ? "aspect-[16/9] md:w-1/2 md:aspect-auto md:min-h-[260px]" : "aspect-[16/9]"}`}>
                <img src={featured.data.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
            )}
            <div className="flex-1 p-5 sm:p-7">
              {featured.data?.category && <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{featured.data.category}</p>}
              <h3 className="mt-3 text-xl font-semibold leading-tight text-white sm:text-3xl">{featured.title}</h3>
              {featured.data?.summary && <p className="mt-3 line-clamp-3 text-sm text-white/65">{featured.data.summary}</p>}
              <p className="mt-4 text-sm text-white/55">{fmt(featured)}</p>
              <span className="mt-5 inline-block text-xs font-bold uppercase tracking-widest text-primary">Read story →</span>
            </div>
          </Link>
          {rest.length > 0 && (
            <div className="flex flex-col gap-3">
              {rest.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} data-testid={`card-news-${n.id}`}
                  className="group glass-card flex flex-1 items-stretch gap-4 overflow-hidden rounded-2xl">
                  {n.data?.imageUrl && <div className="w-28 shrink-0 bg-black sm:w-36"><img src={n.data.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /></div>}
                  <div className="flex min-w-0 flex-col justify-center p-3 sm:pr-4">
                    {n.data?.category && <p className="text-[10px] font-bold uppercase tracking-widest text-primary/90">{n.data.category}</p>}
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
