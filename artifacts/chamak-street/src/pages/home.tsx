import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import HomepageNews from "@/components/homepage-news";
import LaunchPanel from "@/components/launch-panel";
import { ArrowRight, Heart } from "lucide-react";
import { useMemo } from "react";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { useSettings } from "@/lib/use-settings";
import { useWishlist } from "@/hooks/use-wishlist";
import { formatPrice } from "@/lib/currency";

function ProductTile({ product, index, wished, onWish }: {
  product: any;
  index: number;
  wished: boolean;
  onWish: (id: number) => void;
}) {
  const media = getPrimaryProductMedia(product.imageUrl);
  return (
    <article className="group" data-testid={`card-product-${product.id}`}>
      <div className="relative overflow-hidden bg-[#19191c]">
        <Link href={`/product/${product.id}`} className="block">
          <div className="aspect-[4/5] overflow-hidden">
            {media ? (
              media.type === "video" ? (
                <video src={media.url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" muted playsInline preload="metadata" />
              ) : (
                <img src={media.url} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" loading="lazy" />
              )
            ) : (
              <div className="flex h-full items-center justify-center bg-[#17171a] text-[10px] uppercase tracking-[.3em] text-white/35">Imaginate / {String(index + 1).padStart(2, "0")}</div>
            )}
          </div>
        </Link>
        <button
          type="button"
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          data-testid={`button-wishlist-${product.id}`}
          onClick={() => onWish(product.id)}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-colors hover:border-white/60 hover:bg-black/60"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-[#bda4ff] text-[#bda4ff]" : ""}`} strokeWidth={1.5} />
        </button>
        {product.isPreOrder && (
          <span className="absolute bottom-3 left-3 bg-black/65 px-2.5 py-1 text-[9px] uppercase tracking-[.2em] text-white backdrop-blur">Pre-order</span>
        )}
      </div>
      <div className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          {product.categoryName && <p className="mb-1 text-[9px] uppercase tracking-[.22em] text-white/45">{product.categoryName}</p>}
          <Link href={`/product/${product.id}`} className="text-sm font-medium leading-snug text-white transition-colors hover:text-[#c4adff]" data-testid={`link-product-${product.id}`}>
            {product.name}
          </Link>
        </div>
        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-white/75">{formatPrice(product.price)}</span>
      </div>
    </article>
  );
}

export default function Home() {
  const settings = useSettings();
  const { data: catalog, isLoading: catalogLoading, isError: catalogError, refetch: refetchCatalog } = useListProducts(
    { limit: 24 },
    { query: { queryKey: getListProductsQueryKey({ limit: 24 }), staleTime: 30_000 } }
  );
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const featured = useMemo(() => (catalog ?? []).filter((product) => product.featured), [catalog]);

  const heroImage = useMemo(() => {
    const tryImages = (value?: string) => {
      try {
        const parsed: unknown = JSON.parse(value || "");
        if (Array.isArray(parsed)) return parsed.find((item) => typeof item === "string" && item.trim()) as string | undefined;
      } catch { /* A single configured URL is also supported. */ }
      return undefined;
    };
    return (settings.hero_image && settings.hero_image !== "/chamako-hero.png" ? settings.hero_image : undefined) ?? tryImages(settings.hero_images);
  }, [settings.hero_images, settings.hero_image]);

  const liveEnabled = settings.live_event_enabled === "true";
  const liveDate = settings.live_event_date?.trim() || "";
  const liveTime = settings.live_event_time?.trim();
  const liveCtaUrl = settings.live_event_live_url?.trim() || settings.live_event_cta_url?.trim();
  const eventDateLabel = /^\d{4}-\d{2}-\d{2}$/.test(liveDate)
    ? new Intl.DateTimeFormat("en-AE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${liveDate}T00:00:00`))
    : liveDate;
  const products = featured?.length ? featured.slice(0, 8) : (catalog ?? []).slice(0, 8);
  const productsLoading = catalogLoading;
  const productsError = catalogError;

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#111113] text-[#f4f2f7]">
      <section className="relative isolate border-b border-white/10" aria-label="Imaginate campaign">
        <div className="mx-auto grid max-w-[1600px] lg:min-h-[calc(100svh-120px)] lg:grid-cols-[1.05fr_.95fr]">
          <div className={`relative flex flex-col justify-end px-6 pb-10 pt-14 sm:px-10 lg:px-[5vw] lg:pb-14 ${settings.hero_alignment === "center" ? "text-center items-center" : settings.hero_alignment === "right" ? "text-right items-end" : ""}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#7c3aed]/15 blur-3xl" />
            <p className="relative mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[.3em] text-white/65"><span className="h-px w-9 bg-[#a78bfa]" />{settings.hero_small_text || "IMAGINATE · UAE"}</p>
            <h1 className="relative text-[clamp(3.2rem,9vw,8.4rem)] font-semibold uppercase leading-[.84] tracking-[-.07em]" data-testid="text-hero-title">
              {settings.hero_headline?.trim() || settings.hero_title?.trim() || "IMAGINATE"}<br /><span className="text-[#b79cff]">{settings.hero_subheadline?.trim() || settings.hero_subtitle?.trim() || ""}</span>
            </h1>
            <p className="relative mt-7 max-w-md text-sm leading-6 text-white/65 sm:text-base">
              {settings.hero_description?.trim() || ""}
            </p>
            {settings.hero_cta_enabled !== "false" && <div className="relative mt-9 flex flex-wrap items-center gap-3">
              <Link href={settings.hero_cta_url?.trim() || "/shop"} data-testid="link-hero-shop" className="group inline-flex items-center gap-4 bg-[#b79cff] px-7 py-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#111113] transition-colors hover:bg-white">
                {settings.hero_cta_label?.trim() || settings.hero_cta_text?.trim() || "Shop the collection"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/shop?new=1" className="inline-flex items-center border border-white/25 px-7 py-4 text-[11px] uppercase tracking-[.2em] transition-colors hover:border-white">New in</Link>
            </div>}
          </div>
          <div className="relative min-h-[420px] overflow-hidden border-t border-white/10 bg-[#19191c] lg:border-l lg:border-t-0">
            {settings.hero_video ? (
              <video src={settings.hero_video} poster={heroImage} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
            ) : heroImage ? (
              <>
                <img src={heroImage} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#111113]/70 via-transparent to-transparent" />
              </>
            ) : products.length >= 2 ? (
              <div className="grid h-full grid-cols-2 gap-px bg-white/10">
                {products.slice(0, 4).map((p, i) => {
                  const m = getPrimaryProductMedia(p.imageUrl);
                  return (
                    <Link key={p.id} href={`/product/${p.id}`} className={`relative block overflow-hidden bg-[#19191c] ${i === 0 ? "row-span-2" : ""}`}>
                      {m?.type === "image" && <img src={m.url} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105" loading={i ? "lazy" : "eager"} />}
                      <span className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 text-[9px] uppercase tracking-[.18em]">{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center"><img src="/imaginate-logo.png" alt="Imaginate" className="w-48 opacity-90" /></div>
            )}
          </div>
        </div>
        <div className="overflow-hidden border-t border-white/10 bg-[#0d0d0f] py-3" aria-hidden="true">
          <div className="imag-marquee flex w-max gap-10 text-[10px] uppercase tracking-[.35em] text-white/45">
            {Array.from({ length: 12 }).map((_, i) => <span key={i}>Imaginate / UAE / Streetwear</span>)}
          </div>
        </div>
      </section>

      <HomepageNews />
      <LaunchPanel />
      {liveEnabled && (
        <section className="relative isolate overflow-hidden border-y border-white/10 bg-[#17161a]" aria-label="IMAGINATE Live">
          {settings.live_event_background && (
            <>
              <img src={settings.live_event_background} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" loading="lazy" />
              <div aria-hidden="true" className="absolute inset-0 bg-[#111113]/75" />
            </>
          )}
          <div className="relative mx-auto flex max-w-[1600px] flex-col gap-7 px-6 py-9 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-[8vw]">
            <div className="flex items-start gap-5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c3a9ff]" />
              <div>
                <p className="mb-2 text-[9px] uppercase tracking-[.3em] text-[#c3a9ff]">IMAGINATE Live</p>
                <h2 className="text-2xl font-medium tracking-[-.04em] sm:text-3xl">{settings.live_event_title || "A moment in the making."}</h2>
                {settings.live_event_description && <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">{settings.live_event_description}</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
              {(liveDate || liveTime) && (
                <p className="text-[10px] uppercase tracking-[.17em] text-white/65">
                  {eventDateLabel}{liveTime ? ` · ${liveTime}${settings.live_event_timezone ? ` ${settings.live_event_timezone}` : ""}` : ""}
                </p>
              )}
              {liveCtaUrl && (
                <a href={liveCtaUrl} className="group inline-flex items-center gap-3 text-[10px] uppercase tracking-[.2em] text-white hover:text-[#c6b2f0]" data-testid="link-live-event">
                  {settings.live_event_cta_text || "Discover the event"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <section id="collection" className="mx-auto max-w-[1600px] px-6 pb-24 pt-24 sm:px-10 sm:pb-32 sm:pt-32 lg:px-[8vw]">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-14 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 text-[9px] uppercase tracking-[.3em] text-[#bba4f4]">Selected for you</p>
            <h2 className="text-4xl font-medium uppercase leading-none tracking-[-.07em] sm:text-6xl">The collection<span className="text-[#bba4f4]">.</span></h2>
          </div>
          <Link href="/shop" className="group inline-flex items-center gap-3 text-[10px] uppercase tracking-[.2em] text-white/65 transition-colors hover:text-white" data-testid="link-view-collection">
            View all pieces <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse bg-white/[.055]" />)}
          </div>
        ) : productsError ? (
          <div role="status" className="border-y border-white/10 py-12 text-sm text-white/60">
            The collection could not be loaded right now. <button className="ml-2 underline underline-offset-4 hover:text-white" onClick={() => { void refetchCatalog(); }}>Try again</button>
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 md:grid-cols-4">
            {products.map((product, index) => (
              <ProductTile key={product.id} product={product} index={index} wished={wishlistIds.has(product.id)} onWish={toggleWishlist} />
            ))}
          </div>
        ) : (
          <div className="border-y border-white/10 py-12 text-sm text-white/55">The collection is taking shape. Check back soon.</div>
        )}
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-[#17161a] px-6 py-24 sm:px-10 sm:py-36">
        <div aria-hidden="true" className="absolute -right-20 top-1/2 h-[440px] w-[440px] -translate-y-1/2 rounded-full border border-[#bba4f4]/10 sm:right-[8%]" />
        <div aria-hidden="true" className="absolute -right-5 top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full border border-white/[.06] sm:right-[14%]" />
        <div className="relative mx-auto max-w-[1600px] lg:px-[8vw]">
          <p className="mb-6 text-[9px] uppercase tracking-[.3em] text-[#bba4f4]">A different kind of statement</p>
          <h2 className="max-w-5xl text-[clamp(2.8rem,8vw,7.6rem)] font-medium uppercase leading-[.88] tracking-[-.075em]">
            Not made to fit in.<br /><span className="text-white/38">Made to feel like you.</span>
          </h2>
          <div className="mt-10 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <p className="max-w-sm text-sm leading-6 text-white/55">We believe what you wear should leave room for who you are becoming. IMAGINATE starts there.</p>
            <img src="/imaginate-logo.png" alt="Imaginate" className="h-auto w-40 object-contain sm:w-52" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1600px] flex-col gap-7 px-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-20 lg:px-[8vw]">
        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[.28em] text-[#bba4f4]">Find your expression</p>
          <h2 className="text-3xl font-medium uppercase tracking-[-.06em] sm:text-5xl">Your next chapter starts here.</h2>
        </div>
        <Link href="/shop" className="group inline-flex w-fit items-center gap-5 border-b border-white/55 pb-3 text-[10px] uppercase tracking-[.22em] transition-colors hover:border-[#c6b2f0] hover:text-[#c6b2f0]" data-testid="link-final-shop">
          Enter the collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </main>
  );
}