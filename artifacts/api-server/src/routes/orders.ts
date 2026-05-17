import { Router } from "express";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateOrderBody, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody } from "@workspace/api-zod";

const router = Router();

async function buildOrder(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return {
    ...order,
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({ ...i, price: Number(i.price) })),
  };
}

router.get("/orders", async (_req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  const result = await Promise.all(orders.map((o) => buildOrder(o.id)));
  res.json(result.filter(Boolean));
});

router.post("/orders", async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const session = req.session as Record<string, unknown>;
  const sessionId = session.cartId as string | undefined;

  let cartItems: Array<{ productId: number; productName: string; price: number; quantity: number; size: string | null }> = [];

  if (sessionId) {
    const rawItems = await db
      .select({
        productId: cartItemsTable.productId,
        productName: productsTable.name,
        price: productsTable.price,
        quantity: cartItemsTable.quantity,
        size: cartItemsTable.size,
      })
      .from(cartItemsTable)
      .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.sessionId, sessionId));

    cartItems = rawItems.map((i) => ({
      productId: i.productId,
      productName: i.productName ?? "Unknown",
      price: Number(i.price ?? 0),
      quantity: i.quantity,
      size: i.size ?? null,
    }));
  }

  const SHIPPING_FEE = 25;
  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0) + SHIPPING_FEE;

  const [order] = await db.insert(ordersTable).values({
    ...parsed.data,
    total: String(total || 0),
    status: "pending",
  }).returning();

  if (cartItems.length > 0) {
    await db.insert(orderItemsTable).values(
      cartItems.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        productName: i.productName,
        price: String(i.price),
        quantity: i.quantity,
        size: i.size,
      }))
    );
    if (sessionId) {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    }
  }

  const fullOrder = await buildOrder(order.id);
  res.status(201).json(fullOrder);
});

router.get("/orders/:id", async (req, res) => {
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const order = await buildOrder(parsed.data.id);
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(order);
});

router.patch("/orders/:id/status", async (req, res) => {
  const paramsParsed = UpdateOrderStatusParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  await db.update(ordersTable).set({ status: bodyParsed.data.status }).where(eq(ordersTable.id, paramsParsed.data.id));
  const order = await buildOrder(paramsParsed.data.id);
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(order);
});

export default router;
