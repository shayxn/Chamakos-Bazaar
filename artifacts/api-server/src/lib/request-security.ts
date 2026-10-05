import type { Request, Response, NextFunction } from "express";

const buckets = new Map<string, { count: number; until: number }>();
const timer = setInterval(() => {
  const now = Date.now();
  for (const [key,value] of buckets) if (value.until < now) buckets.delete(key);
}, 60_000);
timer.unref();

export function requestSecurity(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!req.path.startsWith("/api")) { next(); return; }
  if (!["GET","HEAD","OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const forwarded = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwarded || req.get("host");
    try {
      if ((origin && new URL(origin).host !== host) || req.get("sec-fetch-site") === "cross-site") {
        res.status(403).json({ error: "Cross-site requests are not allowed." }); return;
      }
    } catch { res.status(403).json({ error: "Invalid request origin." }); return; }
  }
  const sensitive = /auth\/login|customers\/(login|register|send-verification|verify-registration)|orders\/track|newsletter|push\/|support/.test(req.path);
  if (sensitive) {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    const limit = /login|verification/.test(req.path) ? 15 : 60;
    if (!bucket || bucket.until < now) {
      if (buckets.size > 20_000) { res.status(429).json({ error: "Please try again shortly." }); return; }
      buckets.set(key, { count: 1, until: now + 60_000 });
    } else if (++bucket.count > limit) {
      res.setHeader("Retry-After","60");
      res.status(429).json({ error: "Too many requests. Please wait a minute." }); return;
    }
  }
  next();
}
