import { Router } from "express";
import { createTtlCache } from "../lib/response-cache";

const router = Router();

const logoCache = createTtlCache<Buffer>(60 * 60_000);
const logoTypeCache = createTtlCache<string>(60 * 60_000);
const logoFailCache = createTtlCache<boolean>(24 * 60 * 60_000);

const DOMAIN_RE = /^[a-zA-Z0-9.-]{3,100}$/;

const SOURCES = (domain: string) => [
  `https://img.logo.dev/${domain}?token=pk_CxMH0JoJRyOE-6B3MZ2MYg&size=200&format=png`,
  `https://logo.clearbit.com/${domain}?size=200`,
  `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
];

router.get("/brand-logo/:domain", async (req, res) => {
  const domain = req.params.domain;
  if (!DOMAIN_RE.test(domain)) {
    res.status(400).json({ error: "Invalid domain" });
    return;
  }

  if (logoFailCache.get(domain)) {
    res.status(404).json({ error: "Logo not found" });
    return;
  }

  const cached = logoCache.get(domain);
  if (cached) {
    res.setHeader("Content-Type", logoTypeCache.get(domain) ?? "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    res.send(cached);
    return;
  }

  for (const url of SOURCES(domain)) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChamakStreet/1.0)",
          "Accept": "image/*,*/*",
        },
        signal: AbortSignal.timeout(3000),
        redirect: "follow",
      });

      if (!resp.ok) continue;

      const contentType = resp.headers.get("content-type") ?? "image/png";
      if (!contentType.startsWith("image/")) continue;

      const buffer = Buffer.from(await resp.arrayBuffer());
      if (buffer.length < 100) continue;

      logoCache.set(domain, buffer);
      logoTypeCache.set(domain, contentType);

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
      res.send(buffer);
      return;
    } catch {
      continue;
    }
  }

  logoFailCache.set(domain, true);
  res.status(404).json({ error: "Logo not found" });
});

export default router;
