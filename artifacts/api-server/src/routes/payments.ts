import { Router, type Request } from "express";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, orderTrackingEventsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getDeliveryCharges, DELIVERY_METHODS } from "../lib/delivery";

function generateOrderNumber(): string {
  const num = 100000 + Math.floor(Math.random() * 900000);
  return `CHM-${num}`;
}

const ZIINA_API_URL = "https://api-v2.ziina.com/api/payment_intent";

type ZiinaPaymentIntentResponse = {
  id: string;
  redirect_url?: string;
  embedded_url?: string;
  latest_error?: {
    message?: string;
    code?: string;
  };
};


type CheckoutBody = {
  customerName?: unknown;
  customerPhone?: unknown;
  customerAddress?: unknown;
  deliveryMethod?: unknown;
  tip?: unknown;
};

type OrderForPayment = {
  id: number;
  total: string;
};

const router = Router();

function getOrderId(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const orderId = (body as { orderId?: unknown }).orderId;
  if (typeof orderId !== "number" || !Number.isInteger(orderId) || orderId <= 0) return null;
  return orderId;
}

function getSiteBaseUrl(req: Request): string {
  const configuredUrl = process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  return `${req.protocol}://${req.get("host")}`;
}

function getCheckoutBody(body: unknown): { customerName: string; customerPhone: string; customerAddress: string; deliveryMethod: string; tip: number } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as CheckoutBody;
  if (typeof value.customerName !== "string" || value.customerName.trim().length < 2) return null;
  if (typeof value.customerPhone !== "string" || value.customerPhone.trim().length < 7) return null;
  if (typeof value.customerAddress !== "string" || value.customerAddress.trim().length < 5) return null;
  const deliveryMethod = typeof value.deliveryMethod === "string" && (DELIVERY_METHODS as readonly string[]).includes(value.deliveryMethod)
    ? value.deliveryMethod : "standard";
  const rawTip = Number(value.tip ?? 0);
  const tip = isNaN(rawTip) || rawTip < 0 ? 0 : Math.min(rawTip, 500);
  return {
    customerName: value.customerName.trim(),
    customerPhone: value.customerPhone.trim(),
    customerAddress: value.customerAddress.trim(),
    deliveryMethod,
    tip,
  };
}

async function getCartItems(sessionId: string) {
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

  return rawItems.map((item) => ({
    productId: item.productId,
    productName: item.productName ?? "Unknown",
    price: Number(item.price ?? 0),
    quantity: item.quantity,
    size: item.size ?? null,
    isPreOrder: item.isPreOrder ?? false,
  }));
}

async function createZiinaIntent(req: Request, order: OrderForPayment): Promise<ZiinaPaymentIntentResponse> {
  const accessToken = process.env.ZIINA_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Ziina is not configured");
  }

  const amount = Math.round(Number(order.total) * 100);
  if (!Number.isFinite(amount) || amount < 200) {
    throw new Error("Ziina payments require a minimum amount of AED 2.00");
  }

  const siteBaseUrl = getSiteBaseUrl(req);
  const orderUrl = `${siteBaseUrl}/order/${order.id}`;
  const body = {
    amount,
    currency_code: process.env.ZIINA_CURRENCY_CODE ?? "AED",
    message: `FirstPick order #${order.id.toString().padStart(6, "0")}`,
    success_url: `${orderUrl}?payment=ziina-success&payment_intent_id={PAYMENT_INTENT_ID}`,
    cancel_url: `${orderUrl}?payment=ziina-cancelled&payment_intent_id={PAYMENT_INTENT_ID}`,
    failure_url: `${orderUrl}?payment=ziina-failed&payment_intent_id={PAYMENT_INTENT_ID}`,
    test: process.env.ZIINA_TEST_MODE === "true",
    allow_tips: false,
  };

  const response = await fetch(ZIINA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as ZiinaPaymentIntentResponse;
  if (!response.ok) {
    logger.error({ status: response.status, data }, "Ziina payment intent failed");
    throw new Error(data.latest_error?.message ?? "Ziina payment intent failed");
  }

  if (!data.redirect_url) {
    logger.error({ data }, "Ziina payment intent response missing redirect_url");
    throw new Error("Ziina payment link was not returned");
  }

  return data;
}

router.post("/payments/ziina-checkout", async (req, res) => {
  const parsed = getCheckoutBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const session = req.session as Record<string, unknown>;
  const sessionId = session.cartId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const cartItems = await getCartItems(sessionId);
  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const charges = await getDeliveryCharges();
  const deliveryCharge = charges[parsed.deliveryMethod] ?? 20;
  const tip = parsed.tip;
  const itemsSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const rawCouponCode = typeof req.body?.couponCode === "string" ? req.body.couponCode.trim() : "";
  let discountAmount = 0;
  let appliedCouponCode: string | null = null;
  if (rawCouponCode) {
    const { applyCoupon } = await import("./coupons");
    const coupon = await applyCoupon(rawCouponCode, itemsSubtotal);
    if (!coupon) {
      res.status(400).json({ error: "This coupon is invalid, expired, or no longer available" });
      return;
    }
    discountAmount = coupon.discountAmount;
    appliedCouponCode = coupon.couponCode;
  }
  const total = Math.max(0, itemsSubtotal + deliveryCharge + tip - discountAmount);

  const hasPreOrder = cartItems.some((item) => item.isPreOrder);

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
    customerName: parsed.customerName,
    customerEmail: null,
    customerPhone: parsed.customerPhone,
    customerAddress: parsed.customerAddress,
    paymentMethod: "ziina",
    deliveryMethod: parsed.deliveryMethod,
    deliveryCharge: String(deliveryCharge),
    tip: String(tip),
    total: String(total),
    status: "pending",
    hasPreOrder,
  }).returning();
  if (appliedCouponCode) {
    await db.execute(sql`
      UPDATE orders
      SET coupon_code = ${appliedCouponCode}, discount_amount = ${discountAmount}
      WHERE id = ${order.id}
    `);
  }

  await db.insert(orderItemsTable).values(
    cartItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      price: String(item.price),
      quantity: item.quantity,
      size: item.size,
      isPreOrder: item.isPreOrder,
    })),
  );

  await db.insert(orderTrackingEventsTable).values({
    orderId: order.id,
    status: "pending",
    note: "Order placed — awaiting Ziina payment",
  });

  (req.session as Record<string, unknown>).lastOrderId = order.id;

  try {
    const data = await createZiinaIntent(req, order);
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    res.status(201).json({
      orderId: order.id,
      id: data.id,
      redirectUrl: data.redirect_url,
      embeddedUrl: data.embedded_url ?? null,
    });
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, "Ziina checkout failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Ziina payment request failed" });
  }
});

router.post("/payments/ziina-intent", async (req, res) => {
  const orderId = getOrderId(req.body);
  if (!orderId) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  // Must be admin OR the session owner of this order
  const session = req.session as Record<string, unknown>;
  const userId = session.userId as number | undefined;
  const lastOrderId = session.lastOrderId as number | undefined;
  if (!userId && lastOrderId !== orderId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  try {
    const data = await createZiinaIntent(req, order);
    res.status(201).json({
      id: data.id,
      redirectUrl: data.redirect_url,
      embeddedUrl: data.embedded_url ?? null,
    });
  } catch (error) {
    logger.error({ err: error }, "Ziina payment intent request failed");
    res.status(502).json({ error: "Ziina payment request failed" });
  }
});

export default router;
