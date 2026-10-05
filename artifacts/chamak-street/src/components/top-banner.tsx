import { useEffect, useState, type HTMLAttributes } from "react";
import { Link } from "wouter";
import { useSettings } from "@/lib/use-settings";
import { bannerGeometry, parseTopBanner, safeBannerUrl, type BannerCrop } from "@/lib/top-banner";

export function BannerFrame({ image, crop, onImageLoad, onImageError, ...props }: {
  image: string; crop: BannerCrop; onImageLoad?: (ratio: number) => void; onImageError?: () => void;
} & HTMLAttributes<HTMLDivElement>) {
  const g = bannerGeometry(crop);
  return <div {...props} style={{ ...props.style, position: "relative", width: "100%", aspectRatio: "12 / 1", overflow: "hidden" }}>
    <img src={image} alt="IMAGINATE top banner" draggable={false} onError={onImageError}
      onLoad={e => { const i = e.currentTarget; if(i.naturalWidth && i.naturalHeight) onImageLoad?.(i.naturalWidth / i.naturalHeight); }}
      style={{ position: "absolute", width: `${g.width}%`, height: `${g.height}%`, maxWidth: "none",
        left: `${g.left}%`, top: `${g.top}%`, objectFit: "cover", objectPosition: "center", display: "block" }} />
  </div>;
}

export function TopBanner() {
  const settings = useSettings();
  const config = parseTopBanner(settings.top_banner);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [config.image]);
  if (!config.enabled || !config.image || failed) return null;
  const frame = <BannerFrame image={config.image} crop={config.crop} onImageError={() => setFailed(true)} />;
  if(!config.url || !safeBannerUrl(config.url)) return <div data-testid="top-banner" className="w-full shrink-0">{frame}</div>;
  const props = { "data-testid": "top-banner", "aria-label": "Open top banner link", className: "block w-full shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" };
  return config.url.startsWith("/")
    ? <Link {...props} href={config.url}>{frame}</Link>
    : <a {...props} href={config.url}>{frame}</a>;
}
