import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";

const router = Router();
const categoriesCache = createTtlCache<unknown>(60_000);

function clearCache() { categoriesCache.clear(); }

router.get("/categories", async (_req, res) => {
  const cached = categoriesCache.get("all");
  if (cached) {
    setPublicReadCacheHeaders(res, 60);
    res.json(cached);
    return;
  }
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.isVisible, true))
    .orderBy(asc(categoriesTable.displayOrder), asc(categoriesTable.id));
  categoriesCache.set("all", categories);
  setPublicReadCacheHeaders(res, 60);
  res.json(categories);
});

router.get("/categories/all", requireAdmin, async (_req, res) => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.displayOrder), asc(categoriesTable.id));
  res.json(categories);
});

router.post("/categories", requireAdmin, async (req, res) => {
  const body = req.body as {
    name: string;
    bannerImageUrl?: string;
    thumbnailImageUrl?: string;
    iconEmoji?: string;
    description?: string;
    bgImageUrl?: string;
    accentColor?: string;
    displayOrder?: number;
    isVisible?: boolean;
  };
  if (!body.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [category] = await db
    .insert(categoriesTable)
    .values({
      name: body.name,
      slug,
      bannerImageUrl: body.bannerImageUrl ?? null,
      thumbnailImageUrl: body.thumbnailImageUrl ?? null,
      iconEmoji: body.iconEmoji ?? null,
      description: body.description ?? null,
      bgImageUrl: body.bgImageUrl ?? null,
      accentColor: body.accentColor ?? null,
      displayOrder: body.displayOrder ?? 0,
      isVisible: body.isVisible !== undefined ? body.isVisible : true,
    })
    .returning();
  clearCache();
  res.status(201).json(category);
});

router.patch("/categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  if (body.name && typeof body.name === "string") {
    body.slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  const [category] = await db
    .update(categoriesTable)
    .set(body)
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!category) { res.status(404).json({ error: "Not found" }); return; }
  clearCache();
  res.json(category);
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  clearCache();
  res.json({ message: "Deleted" });
});

export default router;
