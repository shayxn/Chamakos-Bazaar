import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCategoryBody, DeleteCategoryParams } from "@workspace/api-zod";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";

const router = Router();
const categoriesCache = createTtlCache<unknown>(60_000);

router.get("/categories", async (_req, res) => {
  const cached = categoriesCache.get("all");
  if (cached) {
    setPublicReadCacheHeaders(res, 60);
    res.json(cached);
    return;
  }

  const categories = await db.select().from(categoriesTable);
  categoriesCache.set("all", categories);
  setPublicReadCacheHeaders(res, 60);
  res.json(categories);
});

router.post("/categories", async (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name } = parsed.data;
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [category] = await db.insert(categoriesTable).values({ name, slug }).returning();
  categoriesCache.clear();
  res.status(201).json(category);
});

router.delete("/categories/:id", async (req, res) => {
  const parsed = DeleteCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, parsed.data.id));
  categoriesCache.clear();
  res.json({ message: "Deleted" });
});

export default router;
