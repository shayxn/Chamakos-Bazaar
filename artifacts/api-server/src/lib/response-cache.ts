import type { Response } from "express";

export const PUBLIC_READ_CACHE_SECONDS = 30;

export function setPublicReadCacheHeaders(res: Response, maxAgeSeconds = PUBLIC_READ_CACHE_SECONDS) {
  res.setHeader("Cache-Control", `public, max-age=0, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
}

export function createTtlCache<T>(ttlMs: number) {
  const maxEntries = 50;
  const cache = new Map<string, { expiresAt: number; value: T }>();

  return {
    get(key: string): T | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T) {
      if (!cache.has(key) && cache.size >= maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      cache.set(key, { expiresAt: Date.now() + ttlMs, value });
    },
    clear() {
      cache.clear();
    },
  };
}
