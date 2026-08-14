import { Router } from "express";
import { db, cartItemsTable, productsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { AddToCartBody, UpdateCartItemParams, UpdateCartItemBody, RemoveCartItemParams } from "@workspace/api-zod";

const router = Router();

function getSessionId(req: import("express").Request): string {
  const session = req.session as Record<string, unknown>;
  if (!session.cartId) {
    session.cartId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return session.cartId as string;
}

async function buildCart(sessionId: string) {
  const items = await db
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      productName: productsTable.name,
      productImageUrl: productsTable.imageUrl,
      price: productsTable.price,
      quantity: cartItemsTable.quantity,
      size: cartItemsTable.size,
    })
    .from(cartItemsTable)
    .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.sessionId, sessionId));

  const mappedItems = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName ?? "Unknown",
    productImageUrl: item.productImageUrl ?? null,
    price: Number(item.price ?? 0),
    quantity: item.quantity,
    size: item.size ?? null,
  }));

  const total = mappedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items: mappedItems, total };
}

router.get("/cart", async (req, res) => {
  const sessionId = getSessionId(req);
  const cart = await buildCart(sessionId);
  res.json(cart);
});

router.post("/cart/items", async (req, res) => {
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const sessionId = getSessionId(req);
  const { productId, quantity, size } = parsed.data;

  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(
      eq(cartItemsTable.sessionId, sessionId),
      eq(cartItemsTable.productId, productId),
      ...(size ? [eq(cartItemsTable.size, size)] : [isNull(cartItemsTable.size)]),
    ));

  if (existing) {
    await db
      .update(cartItemsTable)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ sessionId, productId, quantity, size: size ?? null });
  }

  const cart = await buildCart(sessionId);
  res.json(cart);
});

router.patch("/cart/items/:id", async (req, res) => {
  const paramsParsed = UpdateCartItemParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = UpdateCartItemBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const sessionId = getSessionId(req);
  await db
    .update(cartItemsTable)
    .set({ quantity: bodyParsed.data.quantity })
    .where(and(eq(cartItemsTable.id, paramsParsed.data.id), eq(cartItemsTable.sessionId, sessionId)));
  const cart = await buildCart(sessionId);
  res.json(cart);
});

router.delete("/cart/items/:id", async (req, res) => {
  const parsed = RemoveCartItemParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const sessionId = getSessionId(req);
  await db.delete(cartItemsTable).where(and(
    eq(cartItemsTable.id, parsed.data.id),
    eq(cartItemsTable.sessionId, sessionId),
  ));
  const cart = await buildCart(sessionId);
  res.json(cart);
});

export default router;
