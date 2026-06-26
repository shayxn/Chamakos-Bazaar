import { Router } from "express";
import { db, gamesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/games", async (_req, res) => {
  const games = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.isActive, true))
    .orderBy(asc(gamesTable.displayOrder), asc(gamesTable.createdAt));
  res.json(games.map(serialize));
});

router.get("/games/all", requireAdmin, async (_req, res) => {
  const games = await db
    .select()
    .from(gamesTable)
    .orderBy(asc(gamesTable.displayOrder), asc(gamesTable.createdAt));
  res.json(games.map(serialize));
});

router.get("/games/:id", async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  res.json(serialize(game));
});

router.post("/games", requireAdmin, async (req, res) => {
  const body = req.body as Partial<typeof gamesTable.$inferInsert>;
  const [game] = await db.insert(gamesTable).values({
    name: body.name ?? "New Game",
    description: body.description ?? null,
    coverImage: body.coverImage ?? null,
    videoUrl: body.videoUrl ?? null,
    musicUrl: body.musicUrl ?? null,
    trailerUrl: body.trailerUrl ?? null,
    platform: body.platform ?? null,
    genre: body.genre ?? null,
    isPreOrder: body.isPreOrder ?? true,
    preOrderDate: body.preOrderDate ?? null,
    preOrderPrice: body.preOrderPrice != null ? String(body.preOrderPrice) : null,
    preOrderNote: body.preOrderNote ?? null,
    preOrderButtonText: body.preOrderButtonText ?? null,
    isActive: body.isActive ?? true,
    animationEnabled: body.animationEnabled ?? true,
    displayOrder: body.displayOrder ?? 0,
  }).returning();
  res.status(201).json(serialize(game));
});

router.patch("/games/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const body = req.body as Partial<typeof gamesTable.$inferInsert>;
  const patch: Partial<typeof gamesTable.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.coverImage !== undefined) patch.coverImage = body.coverImage;
  if (body.videoUrl !== undefined) patch.videoUrl = body.videoUrl;
  if (body.musicUrl !== undefined) patch.musicUrl = body.musicUrl;
  if (body.trailerUrl !== undefined) patch.trailerUrl = body.trailerUrl;
  if (body.platform !== undefined) patch.platform = body.platform;
  if (body.genre !== undefined) patch.genre = body.genre;
  if (body.isPreOrder !== undefined) patch.isPreOrder = body.isPreOrder;
  if (body.preOrderDate !== undefined) patch.preOrderDate = body.preOrderDate;
  if (body.preOrderPrice !== undefined) patch.preOrderPrice = body.preOrderPrice != null ? String(body.preOrderPrice) : null;
  if (body.preOrderNote !== undefined) patch.preOrderNote = body.preOrderNote;
  if (body.preOrderButtonText !== undefined) patch.preOrderButtonText = body.preOrderButtonText;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  if (body.animationEnabled !== undefined) patch.animationEnabled = body.animationEnabled;
  if (body.displayOrder !== undefined) patch.displayOrder = body.displayOrder;

  const [game] = await db.update(gamesTable).set(patch).where(eq(gamesTable.id, id)).returning();
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  res.json(serialize(game));
});

router.delete("/games/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.delete(gamesTable).where(eq(gamesTable.id, id));
  res.json({ ok: true });
});

function serialize(g: typeof gamesTable.$inferSelect) {
  return {
    ...g,
    preOrderPrice: g.preOrderPrice != null ? Number(g.preOrderPrice) : null,
  };
}

export default router;
