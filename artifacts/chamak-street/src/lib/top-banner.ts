export type BannerCrop = { x: number; y: number; zoom: number; ratio: number };
export type TopBannerConfig = { enabled: boolean; image: string; url: string; crop: BannerCrop };
export const defaultCrop: BannerCrop = { x: 0.5, y: 0.5, zoom: 1, ratio: 12 };
export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export function safeBannerUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}
export function parseTopBanner(raw?: string): TopBannerConfig {
  let v: any = {};
  try { v = JSON.parse(raw || "{}") || {}; } catch { /* absent or invalid configuration stays hidden */ }
  const number = (key: string, fallback: number) => typeof v.crop?.[key] === "number" && Number.isFinite(v.crop[key]) ? v.crop[key] : fallback;
  return {
    enabled: v.enabled === true,
    image: typeof v.image === "string" && safeBannerUrl(v.image) ? v.image : "",
    url: typeof v.url === "string" ? v.url : "",
    crop: { x: clamp(number("x", 0.5)), y: clamp(number("y", 0.5)), zoom: clamp(number("zoom", 1), 1, 8),
      ratio: Math.max(0.0001, number("ratio", 12)) },
  };
}
/** Cover-fit the original, then zoom and pan within the unchanged 12:1 viewport. */
export function bannerGeometry(crop: BannerCrop) {
  const width = Math.max(100, crop.ratio / 12 * 100) * crop.zoom;
  const height = width * 12 / crop.ratio;
  return { width, height, left: -(width - 100) * crop.x, top: -(height - 100) * crop.y };
}
