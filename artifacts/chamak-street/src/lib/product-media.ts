export type ProductMediaType = "image" | "video";

export type ProductMedia = {
  url: string;
  type: ProductMediaType;
};

function normalizeMediaUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  return base && !url.startsWith(`${base}/`) ? `${base}${url}` : url;
}

function inferMediaType(url: string): ProductMediaType {
  return /\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i.test(url) || /\/video\/upload\//.test(url)
    ? "video"
    : "image";
}

export function parseProductMedia(value?: string | null): ProductMedia[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item): ProductMedia | null => {
          if (typeof item === "string") return { url: normalizeMediaUrl(item), type: inferMediaType(item) };
          if (!item || typeof item !== "object") return null;
          const candidate = item as { url?: unknown; type?: unknown };
          if (typeof candidate.url !== "string" || candidate.url.trim() === "") return null;
          return {
            url: normalizeMediaUrl(candidate.url),
            type: candidate.type === "video" ? "video" : inferMediaType(candidate.url),
          };
        })
        .filter((item): item is ProductMedia => Boolean(item));
    }
  } catch {
    // Existing products store a plain URL in imageUrl.
  }

  return [{ url: normalizeMediaUrl(value), type: inferMediaType(value) }];
}

export function serializeProductMedia(media: ProductMedia[]): string {
  return JSON.stringify(media.filter((item) => item.url.trim() !== ""));
}

export function getPrimaryProductMedia(value?: string | null): ProductMedia | null {
  return parseProductMedia(value)[0] ?? null;
}
