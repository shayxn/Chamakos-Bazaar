import { Router } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";

const router = Router();
const reviewsCache = createTtlCache<unknown>(60_000);

function clearReviewsCache() { reviewsCache.clear(); }

function serializeReview(r: typeof reviewsTable.$inferSelect) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.get("/reviews", async (_req, res) => {
  const cached = reviewsCache.get("public");
  if (cached) { setPublicReadCacheHeaders(res, 60); res.json(cached); return; }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.isVisible, true))
    .orderBy(asc(reviewsTable.displayOrder), asc(reviewsTable.createdAt));
  const result = reviews.map(serializeReview);
  reviewsCache.set("public", result);
  setPublicReadCacheHeaders(res, 60);
  res.json(result);
});

router.get("/reviews/all", requireAdmin, async (_req, res) => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .orderBy(asc(reviewsTable.displayOrder), asc(reviewsTable.createdAt));
  res.json(reviews.map(serializeReview));
});

// Public submission — creates review as invisible (pending admin approval)
router.post("/reviews/submit", async (req, res) => {
  const body = req.body as {
    customerName?: string;
    rating?: number;
    body?: string;
    imageUrls?: string;
    productName?: string;
  };
  if (!body.customerName?.trim() || !body.body?.trim()) {
    res.status(400).json({ error: "Name and review text are required" });
    return;
  }
  const reviewBody = body.productName?.trim()
    ? `[${body.productName.trim()}] ${body.body.trim()}`
    : body.body.trim();
  const rawRating = Number(body.rating ?? 5);
  const safeRating = Number.isFinite(rawRating) ? Math.min(5, Math.max(1, rawRating)) : 5;
  const [review] = await db
    .insert(reviewsTable)
    .values({
      customerName: body.customerName.trim(),
      customerAvatar: null,
      rating: safeRating,
      body: reviewBody,
      imageUrls: body.imageUrls ?? null,
      isVerified: false,
      isPinned: false,
      isVisible: false,
      displayOrder: 0,
    })
    .returning();
  clearReviewsCache();
  res.status(201).json({ message: "Review submitted for approval", id: review.id });
});

router.post("/reviews", requireAdmin, async (req, res) => {
  const body = req.body as {
    customerName: string;
    customerAvatar?: string;
    rating?: number;
    body: string;
    imageUrls?: string;
    isVerified?: boolean;
    isPinned?: boolean;
    isVisible?: boolean;
    displayOrder?: number;
  };
  if (!body.customerName || !body.body) {
    res.status(400).json({ error: "customerName and body required" });
    return;
  }
  const adminRating = Number(body.rating ?? 5);
  const [review] = await db
    .insert(reviewsTable)
    .values({
      customerName: body.customerName,
      customerAvatar: body.customerAvatar ?? null,
      rating: Number.isFinite(adminRating) ? Math.min(5, Math.max(1, adminRating)) : 5,
      body: body.body,
      imageUrls: body.imageUrls ?? null,
      isVerified: body.isVerified ?? false,
      isPinned: body.isPinned ?? false,
      isVisible: body.isVisible !== undefined ? body.isVisible : true,
      displayOrder: body.displayOrder ?? 0,
    })
    .returning();
  clearReviewsCache();
  res.status(201).json(serializeReview(review));
});

router.patch("/reviews/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Partial<typeof reviewsTable.$inferInsert>;
  // Allowlist writable fields to prevent mass-assignment
  const allowed: Partial<typeof reviewsTable.$inferInsert> = {};
  const fields = ["customerName","customerAvatar","rating","body","imageUrls","isVerified","isPinned","isVisible","displayOrder"] as const;
  for (const f of fields) { if (body[f] !== undefined) (allowed as Record<string, unknown>)[f] = body[f]; }
  if (allowed.rating !== undefined) {
    const r = Number(allowed.rating);
    allowed.rating = Number.isFinite(r) ? Math.min(5, Math.max(1, r)) : 5;
  }
  clearReviewsCache();
  const [review] = await db.update(reviewsTable).set(allowed).where(eq(reviewsTable.id, id)).returning();
  if (!review) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeReview(review));
});

router.delete("/reviews/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  clearReviewsCache();
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
