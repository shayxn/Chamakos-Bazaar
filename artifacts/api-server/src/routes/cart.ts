import { Router } from "express";
import { db, cartItemsTable, productsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { AddToCartBody, UpdateCartItemParams, UpdateCartItemBody, RemoveCartItemParams } from "@workspace/api-zod";
import { validateCartProduct } from "../lib/cart-validation";
import { ensureCommerceSchema } from "../lib/commerce-schema";

const router = Router();
router.use(async (_req,_res,next)=>{await ensureCommerceSchema();next();});

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
      color: cartItemsTable.color,variantId:cartItemsTable.variantId,variants:productsTable.variants,
    })
    .from(cartItemsTable)
    .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.sessionId, sessionId));

  const mappedItems = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName ?? "Unknown",
    productImageUrl: item.productImageUrl ?? null,
    price: Number(item.variants?.find(v=>v.id===item.variantId)?.price ?? item.price ?? 0),
    quantity: item.quantity,
    size: item.size ?? null,
    color:item.color ?? null,variantId:item.variantId ?? null,
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
  const { productId, quantity, size, color, variantId } = parsed.data;

  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(
      eq(cartItemsTable.sessionId, sessionId),
      eq(cartItemsTable.productId, productId),
      ...(size ? [eq(cartItemsTable.size, size)] : [isNull(cartItemsTable.size)]),
      ...(color ? [eq(cartItemsTable.color,color)] : [isNull(cartItemsTable.color)]),
      ...(variantId ? [eq(cartItemsTable.variantId,variantId)] : [isNull(cartItemsTable.variantId)]),
    ));

  if (existing) {
    try { await validateCartProduct(productId, existing.quantity + quantity, size, color, variantId); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    await db
      .update(cartItemsTable)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    try { await validateCartProduct(productId, quantity, size, color, variantId); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    await db.insert(cartItemsTable).values({ sessionId, productId, quantity, size: size ?? null,color:color ?? null,variantId:variantId ?? null });
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
  const [item] = await db.select().from(cartItemsTable).where(and(eq(cartItemsTable.id,paramsParsed.data.id),eq(cartItemsTable.sessionId,sessionId)));
  if (!item) { res.status(404).json({error:"Cart item not found."}); return; }
  try { await validateCartProduct(item.productId,bodyParsed.data.quantity,item.size,item.color,item.variantId); }
  catch (error) { res.status(400).json({error:(error as Error).message}); return; }
  const result = await db
    .update(cartItemsTable)
    .set({ quantity: bodyParsed.data.quantity })
    .where(and(eq(cartItemsTable.id, paramsParsed.data.id), eq(cartItemsTable.sessionId, sessionId)));
  if (!result.rowCount) { res.status(404).json({ error: "Item not found" }); return; }
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
  const result = await db.delete(cartItemsTable).where(and(
    eq(cartItemsTable.id, parsed.data.id),
    eq(cartItemsTable.sessionId, sessionId),
  ));
  if (!result.rowCount) { res.status(404).json({ error: "Item not found" }); return; }
  const cart = await buildCart(sessionId);
  res.json(cart);
});

export default router;
