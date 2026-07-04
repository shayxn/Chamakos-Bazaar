import { Router } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

function serializeReview(r: typeof reviewsTable.$inferSelect) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.get("/reviews", async (_req, res) => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.isVisible, true))
    .orderBy(asc(reviewsTable.displayOrder), asc(reviewsTable.createdAt));
  res.json(reviews.map(serializeReview));
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
  const [review] = await db
    .insert(reviewsTable)
    .values({
      customerName: body.customerName.trim(),
      customerAvatar: null,
      rating: Math.min(5, Math.max(1, Number(body.rating ?? 5))),
      body: reviewBody,
      imageUrls: body.imageUrls ?? null,
      isVerified: false,
      isPinned: false,
      isVisible: false,
      displayOrder: 0,
    })
    .returning();
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
  const [review] = await db
    .insert(reviewsTable)
    .values({
      customerName: body.customerName,
      customerAvatar: body.customerAvatar ?? null,
      rating: body.rating ?? 5,
      body: body.body,
      imageUrls: body.imageUrls ?? null,
      isVerified: body.isVerified ?? false,
      isPinned: body.isPinned ?? false,
      isVisible: body.isVisible !== undefined ? body.isVisible : true,
      displayOrder: body.displayOrder ?? 0,
    })
    .returning();
  res.status(201).json(serializeReview(review));
});

router.patch("/reviews/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [review] = await db.update(reviewsTable).set(req.body).where(eq(reviewsTable.id, id)).returning();
  if (!review) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeReview(review));
});

router.delete("/reviews/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
