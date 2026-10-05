import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import HomepageNews from "@/components/homepage-news";
import LaunchPanel from "@/components/launch-panel";
import { ArrowRight, Heart } from "lucide-react";
import { useMemo } from "react";
import { getPrimaryProductMedia } from "@/lib/product-media";
import { useSettings } from "@/lib/use-settings";
import { useWishlist } from "@/hooks/use-wishlist";
import { Price } from "@/components/price";

function ProductTile({ product, index, wished, onWish }: {
  product: any;
  index: number;
  wished: boolean;
  onWish: (id: number) => void;
}) {
  const media = getPrimaryProductMedia(product.imageUrl);
  return (
    <article className="group" data-testid={`card-product-${product.id}`}>
      <div className="relative overflow-hidden rounded-2xl bg-[#19191c]">
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
        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-white/75"><Price v={product.price} /></span>
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

  const products = featured?.length ? featured.slice(0, 8) : (catalog ?? []).slice(0, 8);
  const productsLoading = catalogLoading;
  const productsError = catalogError;

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#111113] text-[#f4f2f7]">
      <section className="relative isolate border-b border-white/10" aria-label="Imaginate campaign">
        <div className="mx-auto grid max-w-[1600px] lg:min-h-[min(760px,calc(100svh-120px))] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <div className={`relative flex min-w-0 flex-col justify-end px-6 pb-10 pt-14 sm:px-10 lg:justify-center lg:px-[5vw] lg:pb-14 ${settings.hero_alignment === "center" ? "text-center items-center" : settings.hero_alignment === "right" ? "text-right items-end" : ""}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#b79cff]/15 blur-3xl" />
            <p className="relative mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[.3em] text-white/65"><span className="h-px w-9 bg-[#b79cff]" />{settings.hero_small_text || "IMAGINATE · UAE"}</p>
            <h1 className="relative break-words text-[clamp(2.4rem,12vw,6rem)] font-semibold uppercase leading-[.91] tracking-[-.06em] lg:text-[clamp(3rem,5.9vw,6.5rem)]" data-testid="text-hero-title">
              {settings.hero_headline?.trim() || settings.hero_title?.trim() || "IMAGINATE"}<br /><span className="text-[#b79cff]">{settings.hero_subheadline?.trim() || settings.hero_subtitle?.trim() || ""}</span>
            </h1>
            <p className="relative mt-7 max-w-md text-sm leading-6 text-white/65 sm:text-base">
              {settings.hero_description?.trim() || ""}
            </p>
            {settings.hero_cta_enabled !== "false" && <div className="relative mt-9 flex flex-wrap items-center gap-3">
              <Link href={settings.hero_cta_url?.trim() || "/shop"} data-testid="link-hero-shop" className="liquid-pill group inline-flex h-14 items-center gap-4 rounded-full px-8 text-[11px] font-semibold uppercase tracking-[.2em] text-white">
                {settings.hero_cta_label?.trim() || settings.hero_cta_text?.trim() || "Shop the collection"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/shop?new=1" className="liquid-pill inline-flex h-14 items-center rounded-full px-8 text-[11px] font-semibold uppercase tracking-[.2em] text-white">New in</Link>
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
            ) : (
              <div className="absolute inset-0 grid place-items-center"><img src="/imaginate-logo.png" alt="Imaginate" className="w-48 opacity-90" /></div>
            )}
          </div>
        </div>
      </section>
      <HomepageNews />

      <LaunchPanel />

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