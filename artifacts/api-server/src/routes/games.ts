import { Router } from "express";
import { db, gamesTable, productsTable, cartItemsTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
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

router.post("/games/:id/preorder-cart", async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const externalId = `game-preorder-${id}`;
  let [product] = await db.select().from(productsTable).where(eq(productsTable.externalId, externalId));
  if (!product) {
    [product] = await db.insert(productsTable).values({
      name: `${game.name} – Pre-Order`,
      description: game.description ?? undefined,
      price: game.preOrderPrice ?? "299.00",
      imageUrl: game.coverImage ?? undefined,
      stock: 9999,
      isPreOrder: true,
      preOrderDate: game.preOrderDate ?? undefined,
      preOrderNote: game.preOrderNote ?? undefined,
      externalId,
    }).returning();
  }

  const session = req.session as Record<string, unknown>;
  if (!session.cartId) {
    session.cartId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  const sessionId = session.cartId as string;

  const [existing] = await db.select().from(cartItemsTable).where(
    and(eq(cartItemsTable.sessionId, sessionId), eq(cartItemsTable.productId, product.id))
  );
  if (existing) {
    await db.update(cartItemsTable).set({ quantity: existing.quantity + 1 }).where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ sessionId, productId: product.id, quantity: 1 });
  }

  res.json({ ok: true, productId: product.id });
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
