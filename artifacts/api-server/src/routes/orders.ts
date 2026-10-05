import { Router } from "express";
import { createValidatedOrder, CheckoutError } from "../lib/checkout-service";
import { clearProductCaches } from "./products";
import { ensureCommerceSchema } from "../lib/commerce-schema";
import { releaseOrderStock } from "../lib/order-stock";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, orderTrackingEventsTable, customerAccountsTable } from "@workspace/db";
import { eq, inArray, asc, desc, or, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { createTtlCache } from "../lib/response-cache";
import { sendOrderPush, sendCustomerStatusPush } from "../lib/push";
import { logAdminActivity } from "./admin-activity";
import { getDeliveryCharges, DELIVERY_METHODS } from "../lib/delivery";

const router = Router();
router.use(async (_req,_res,next)=>{await ensureCommerceSchema();next();});

const ordersListCache = createTtlCache<ReturnType<typeof serializeOrder>[]>(15_000);

let _ordersMigrated = false;
async function ensureOrderColumns() {
  if (_ordersMigrated) return; _ordersMigrated = true;
  await db.execute(sql`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS delay_reason TEXT,
      ADD COLUMN IF NOT EXISTS delayed_until TEXT,
      ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
      ADD COLUMN IF NOT EXISTS refund_initiated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS customer_push_log TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS coupon_code TEXT,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0
  `);
}
ensureOrderColumns().catch(console.error);

async function generateOrderNumber(): Promise<string> {
  const { ordersTable: ot } = await import("@workspace/db");
  const { eq: deq } = await import("drizzle-orm");
  for (let i = 0; i < 10; i++) {
    const num = 100000 + Math.floor(Math.random() * 900000);
    const candidate = `CHM-${num}`;
    const [existing] = await db.select({ id: ot.id }).from(ot).where(deq(ot.orderNumber, candidate));
    if (!existing) return candidate;
  }
  // Fallback: timestamp-based
  return `CHM-${Date.now().toString(36).toUpperCase()}`;
}

const DELIVERY_LABELS: Record<string, string> = {
  standard: "Standard Delivery",
  express: "Express Delivery",
  priority: "Priority Delivery",
};

function serializeOrder(order: typeof ordersTable.$inferSelect, items: Array<typeof orderItemsTable.$inferSelect>) {
  return {
    ...order,
    total: Number(order.total),
    discountAmount:Number(order.discountAmount??0),
    deliveryCharge: Number(order.deliveryCharge ?? 25),
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

  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
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

// ─── Customer: most recent order for signed-in account ───────────────────────
router.get("/orders/my-latest", async (req, res) => {
  const session = req.session as Record<string, unknown>;
  const customerId = session.customerId as number | undefined;

  if (!customerId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  const [customer] = await db
    .select({ phone: customerAccountsTable.phone, email: customerAccountsTable.email })
    .from(customerAccountsTable)
    .where(eq(customerAccountsTable.id, customerId));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  // Find most recent order matching by phone OR email
  const conditions = [];
  conditions.push(eq(ordersTable.customerId,customerId));
  if (customer.email) conditions.push(eq(ordersTable.customerEmail, customer.email));

  if (conditions.length === 0) {
    res.status(404).json({ error: "No orders" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions)!)
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "No orders" });
    return;
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.json(serializeOrder(order, items));
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
  if (req.body?.paymentMethod && req.body.paymentMethod !== "cod") {
    res.status(400).json({ error: "Use the secure payment provider checkout for online payments." }); return;
  }
  let created;
  try { created = await createValidatedOrder(req,"cod"); }
  catch (error) {
    if (error instanceof CheckoutError || /discount|stock|bag|size/i.test((error as Error).message)) {
      res.status(400).json({error:(error as Error).message}); return;
    }
    throw error;
  }
  const order = created.order;

  const fullOrder = await buildOrder(order.id);
  ordersListCache.clear();
  clearProductCaches();
  (req.session as Record<string, unknown>).lastOrderId = order.id;

  // Fire push notification asynchronously — don't block response
  if (fullOrder) {
    sendOrderPush({
      orderNumber: fullOrder.orderNumber ?? `#${fullOrder.id}`,
      customerName: fullOrder.customerName ?? "Customer",
      total: fullOrder.total,
      deliveryMethod: fullOrder.deliveryMethod ?? "standard",
      deliveryCharge: fullOrder.deliveryCharge ?? 25,
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
  if(userId){
    let authorized=false;
    await requireAdmin(req,res,()=>{authorized=true;});
    if(!authorized)return;
  }

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
        order.customerId===customerId ||
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
  // Allowlist only admin-editable fields — never let clients mutate totals, ids, or session data
  const { status, customerName, customerPhone, customerEmail, customerAddress, notes } = req.body as Record<string, string | undefined>;
  const patch: Record<string, unknown> = {};
  if (status !== undefined) {res.status(400).json({error:"Use the order status control to change status."});return;}
  if (customerName !== undefined) patch.customerName = customerName;
  if (customerPhone !== undefined) patch.customerPhone = customerPhone;
  if (customerEmail !== undefined) patch.customerEmail = customerEmail;
  if (customerAddress !== undefined) patch.customerAddress = customerAddress;
  if (notes !== undefined) patch.notes = notes;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
  try {
    const [order] = await db.update(ordersTable).set(patch).where(eq(ordersTable.id, id)).returning();
    if (!order) { res.status(404).json({ error: "Not found" }); return; }
    ordersListCache.clear();
    const fullOrder = await buildOrder(id);
    res.json(fullOrder);
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

router.patch("/orders/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, delayReason, delayedUntil, cancelReason, refundInitiated, adminName } = 
    req.body as { status: string; delayReason?: string; delayedUntil?: string; cancelReason?: string; refundInitiated?: boolean; adminName?: string };
  if (!["pending","confirmed","preparing","shipped","out_for_delivery","delivered","cancelled","delayed","pre_order"].includes(status)) { res.status(400).json({ error: "Choose a valid order status." }); return; }
  
  const setData: Record<string, unknown> = { status };
  if (status === "delayed") { 
    setData.delayReason = delayReason ?? null; 
    setData.delayedUntil = delayedUntil ?? null; 
  }
  if (status === "cancelled") {
    setData.cancelReason = cancelReason ?? null;
    if (refundInitiated !== undefined) setData.refundInitiated = refundInitiated;
  }
  if (delayedUntil !== undefined && status !== "delayed") setData.delayedUntil = delayedUntil;
  
  const updated=await db.transaction(async tx=>{
    const current=rowsForStatus(await tx.execute(sql`SELECT id,status,payment_method,payment_status FROM orders WHERE id=${id} FOR UPDATE`))[0];
    if(!current)return false;
    if(current.status==="cancelled"&&status!=="cancelled")throw new CheckoutError("Cancelled orders cannot be reopened; create a new order to reserve stock.");
    if(current.payment_method==="ziina"&&current.payment_status!=="paid"&&!["pending","cancelled","delayed"].includes(status))
      throw new CheckoutError("Online payment has not been verified by the provider.");
    await tx.update(ordersTable).set(setData as any).where(eq(ordersTable.id,id));
    if(status==="cancelled")await releaseOrderStock(id,tx);
    return true;
  }).catch(error=>{
    if(error instanceof CheckoutError){res.status(409).json({error:error.message});return false;}throw error;
  });
  if(res.headersSent)return;
  if(!updated){res.sendStatus(404);return;}
  clearProductCaches();
  
  // Log tracking event
  const trackingNote = 
    status === "delayed" ? (delayReason ? `Delayed: ${delayReason}${delayedUntil ? ` until ${delayedUntil}` : ""}` : "Order delayed") :
    status === "cancelled" ? (cancelReason ?? "Order cancelled") : null;
  await db.insert(orderTrackingEventsTable).values({ orderId: id, status, note: trackingNote });
  
  ordersListCache.clear();
  const order = await buildOrder(id);
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  
  // Log admin activity
  logAdminActivity(`Admin ${req.session?.userId}`, `Order ${status}`, order.orderNumber ?? `#${order.id}`).catch(() => {});
  
  // Send customer push notification
  sendCustomerStatusPush(order, status, { delayReason, delayedUntil, cancelReason, refundInitiated }).catch(() => {});
  
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
function rowsForStatus(result:unknown):Record<string,any>[] {return Array.isArray(result)?result:(result as any)?.rows??[];}
