import { Router } from "express";
import { db, gamesTable, productsTable, cartItemsTable } from "@workspace/db";
import { eq, asc, and, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { ensureCommerceSchema } from "../lib/commerce-schema";
import { validateCartProduct } from "../lib/cart-validation";

const router = Router();
let gamesSchemaReady: Promise<void> | undefined;

function ensureGamesSchema(): Promise<void> {
  if (!gamesSchemaReady) {
    gamesSchemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          cover_image TEXT,
          video_url TEXT,
          music_url TEXT,
          trailer_url TEXT,
          platform TEXT,
          genre TEXT,
          is_pre_order BOOLEAN NOT NULL DEFAULT TRUE,
          pre_order_date TEXT,
          pre_order_price NUMERIC(10,2),
          pre_order_note TEXT,
          pre_order_button_text TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          animation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        ALTER TABLE games
          ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled game',
          ADD COLUMN IF NOT EXISTS description TEXT,
          ADD COLUMN IF NOT EXISTS cover_image TEXT,
          ADD COLUMN IF NOT EXISTS video_url TEXT,
          ADD COLUMN IF NOT EXISTS music_url TEXT,
          ADD COLUMN IF NOT EXISTS trailer_url TEXT,
          ADD COLUMN IF NOT EXISTS platform TEXT,
          ADD COLUMN IF NOT EXISTS genre TEXT,
          ADD COLUMN IF NOT EXISTS is_pre_order BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS pre_order_date TEXT,
          ADD COLUMN IF NOT EXISTS pre_order_price NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS pre_order_note TEXT,
          ADD COLUMN IF NOT EXISTS pre_order_button_text TEXT,
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS animation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      `);
    })().catch((error) => {
      gamesSchemaReady = undefined;
      throw error;
    });
  }
  return gamesSchemaReady;
}

router.use(async (_req, _res, next): Promise<void> => {
  await ensureGamesSchema();
  next();
});

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
  const [game] = await db.select().from(gamesTable).where(and(eq(gamesTable.id, id), eq(gamesTable.isActive, true)));
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
  await ensureCommerceSchema();
  const id = parseInt(req.params.id as string);
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game || !game.isActive) { res.status(404).json({ error: "Game not found" }); return; }
  if (!game.isPreOrder) { res.status(409).json({ error: "Pre-orders are not open for this game." }); return; }

  const externalId = `game-preorder-${id}`;
  let [product] = await db.select().from(productsTable).where(eq(productsTable.externalId, externalId));
  const productFields = {
    name: `${game.name} – Pre-Order`,
    description: game.description,
    price: String(game.preOrderPrice ?? "299.00"),
    imageUrl: game.coverImage,
    isPreOrder: true,
    preOrderDate: game.preOrderDate,
    preOrderNote: game.preOrderNote,
  };
  if (!product) {
    [product] = await db.insert(productsTable).values({
      ...productFields,
      stock: 9999,
      externalId,
    }).returning();
  } else {
    [product] = await db.update(productsTable)
      .set(productFields)
      .where(eq(productsTable.id, product.id))
      .returning();
  }

  const session = req.session as Record<string, unknown>;
  if (!session.cartId) {
    session.cartId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  const sessionId = session.cartId as string;

  const [existing] = await db.select().from(cartItemsTable).where(
    and(eq(cartItemsTable.sessionId, sessionId), eq(cartItemsTable.productId, product.id))
  );
  try {
    await validateCartProduct(product.id, (existing?.quantity ?? 0) + 1);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }
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
