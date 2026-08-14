import { Router } from "express";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, orderTrackingEventsTable, customerAccountsTable } from "@workspace/db";
import { eq, inArray, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { createTtlCache } from "../lib/response-cache";
import { sendOrderPush } from "../lib/push";
import { getDeliveryCharges, DELIVERY_METHODS } from "../lib/delivery";

const router = Router();

const ordersListCache = createTtlCache<ReturnType<typeof serializeOrder>[]>(15_000);

function generateOrderNumber(): string {
  const num = 100000 + Math.floor(Math.random() * 900000);
  return `CHM-${num}`;
}

const DELIVERY_LABELS: Record<string, string> = {
  standard: "Standard Delivery",
  express: "Express Delivery",
  priority: "FirstPick Priority",
};

function serializeOrder(order: typeof ordersTable.$inferSelect, items: Array<typeof orderItemsTable.$inferSelect>) {
  return {
    ...order,
    total: Number(order.total),
    deliveryCharge: Number(order.deliveryCharge ?? 20),
    tip: Number(order.tip ?? 0),
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({ ...i, price: Number(i.price) })),
  };
}

async function buildOrder(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId)),
    db.select().from(orderTrackingEventsTable).where(eq(orderTrackingEventsTable.orderId, orderId)).orderBy(asc(orderTrackingEventsTable.createdAt)),
  ]);
  return {
    ...serializeOrder(order, items),
    trackingEvents: events.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
  };
}

router.get("/orders", requireAdmin, async (_req, res) => {
  const cached = ordersListCache.get("all");
  if (cached) { res.json(cached); return; }

  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  if (orders.length === 0) { ordersListCache.set("all", []); res.json([]); return; }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orders.map((o) => o.id)));
  const itemsByOrderId = new Map<number, typeof items>();
  for (const item of items) {
    if (!itemsByOrderId.has(item.orderId)) itemsByOrderId.set(item.orderId, []);
    itemsByOrderId.get(item.orderId)!.push(item);
  }

  const result = orders.map((order) => serializeOrder(order, itemsByOrderId.get(order.id) ?? []));
  ordersListCache.set("all", result);
  res.json(result);
});

router.get("/orders/track", async (req, res) => {
  const { orderNumber, phone } = req.query as { orderNumber?: string; phone?: string };
  if (!orderNumber || !phone) {
    res.status(400).json({ error: "orderNumber and phone required" });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber));

  if (!order || order.customerPhone !== phone.trim()) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const events = await db
    .select()
    .from(orderTrackingEventsTable)
    .where(eq(orderTrackingEventsTable.orderId, order.id))
    .orderBy(orderTrackingEventsTable.createdAt);

  res.json({
    ...serializeOrder(order, items),
    events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

router.post("/orders", async (req, res) => {
  const body = req.body as {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    paymentMethod?: string;
    deliveryMethod?: string;
    tip?: number;
  };
  if (!body.customerName || !body.customerPhone || !body.customerAddress) {
    res.status(400).json({ error: "customerName, customerPhone and customerAddress required" });
    return;
  }
  const charges = await getDeliveryCharges();
  const deliveryMethod = (body.deliveryMethod && (DELIVERY_METHODS as readonly string[]).includes(body.deliveryMethod))
    ? body.deliveryMethod : "standard";
  const deliveryCharge = charges[deliveryMethod] ?? 20;
  const rawTip = Number(body.tip ?? 0);
  const tip = isNaN(rawTip) || rawTip < 0 ? 0 : Math.min(rawTip, 500);

  const session = req.session as Record<string, unknown>;
  const sessionId = session.cartId as string | undefined;

  let cartItems: Array<{ productId: number; productName: string; price: number; quantity: number; size: string | null; isPreOrder: boolean }> = [];

  if (sessionId) {
    const rawItems = await db
      .select({
        productId: cartItemsTable.productId,
        productName: productsTable.name,
        price: productsTable.price,
        quantity: cartItemsTable.quantity,
        size: cartItemsTable.size,
        isPreOrder: productsTable.isPreOrder,
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
      isPreOrder: i.isPreOrder ?? false,
    }));
  }

  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const itemsSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = itemsSubtotal + deliveryCharge + tip;
  const hasPreOrder = cartItems.some((i) => i.isPreOrder);

  let orderNumber = generateOrderNumber();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber));
    if (existing.length === 0) break;
    orderNumber = generateOrderNumber();
    attempts++;
  }

  const [order] = await db.insert(ordersTable).values({
    orderNumber,
    customerName: body.customerName,
    customerEmail: null,
    customerPhone: body.customerPhone,
    customerAddress: body.customerAddress,
    paymentMethod: body.paymentMethod ?? "cod",
    deliveryMethod,
    deliveryCharge: String(deliveryCharge),
    tip: String(tip),
    total: String(total || 0),
    status: "pending",
    hasPreOrder,
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
        isPreOrder: i.isPreOrder,
      }))
    );
    if (sessionId) {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    }
  }

  await db.insert(orderTrackingEventsTable).values({
    orderId: order.id,
    status: "pending",
    note: "Order placed successfully",
  });

  const fullOrder = await buildOrder(order.id);
  ordersListCache.clear();
  (req.session as Record<string, unknown>).lastOrderId = order.id;

  // Fire push notification asynchronously — don't block response
  if (fullOrder) {
    sendOrderPush({
      orderNumber: fullOrder.orderNumber ?? `#${fullOrder.id}`,
      customerName: fullOrder.customerName,
      total: fullOrder.total,
      deliveryMethod: fullOrder.deliveryMethod ?? "standard",
      deliveryCharge: fullOrder.deliveryCharge ?? 20,
      tip: fullOrder.tip ?? 0,
      items: fullOrder.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
      createdAt: fullOrder.createdAt,
    }).catch(() => {});
  }

  res.status(201).json(fullOrder);
});

router.get("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const session = req.session as Record<string, unknown>;
  const userId = session.userId as number | undefined;        // admin session
  const customerId = session.customerId as number | undefined; // customer account session
  const lastOrderId = session.lastOrderId as number | undefined; // guest last order

  // Must have at least one form of identity
  if (!userId && !customerId && lastOrderId !== id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const order = await buildOrder(id);
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  // Customer account session (not admin): verify they own this order
  if (customerId && !userId) {
    const [customer] = await db
      .select({ phone: customerAccountsTable.phone, email: customerAccountsTable.email })
      .from(customerAccountsTable)
      .where(eq(customerAccountsTable.id, customerId));
    const ownsOrder =
      customer && (
        (customer.phone && customer.phone === order.customerPhone) ||
        (customer.email && customer.email === order.customerEmail)
      );
    const isLastOrder = lastOrderId === id;
    if (!ownsOrder && !isLastOrder) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  res.json(order);
});

router.patch("/orders/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.update(ordersTable).set(req.body).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  ordersListCache.clear();
  const fullOrder = await buildOrder(id);
  res.json(fullOrder);
});

router.patch("/orders/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body as { status: string };
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id));
  // Auto-record tracking event for every status change
  await db.insert(orderTrackingEventsTable).values({ orderId: id, status, note: null });
  ordersListCache.clear();
  const order = await buildOrder(id);
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(order);
});

router.post("/orders/:id/tracking", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, note } = req.body as { status: string; note?: string };
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  const [event] = await db.insert(orderTrackingEventsTable).values({
    orderId: id,
    status,
    note: note ?? null,
  }).returning();
  res.status(201).json({ ...event, createdAt: event.createdAt.toISOString() });
});

router.delete("/orders/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  await db.delete(orderTrackingEventsTable).where(eq(orderTrackingEventsTable.orderId, id));
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
