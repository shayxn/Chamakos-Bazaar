import { Router, type Request } from "express";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

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
  customerEmail?: unknown;
  customerAddress?: unknown;
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

function getCheckoutBody(body: unknown): { customerName: string; customerEmail: string; customerAddress: string } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as CheckoutBody;
  if (typeof value.customerName !== "string" || value.customerName.trim().length < 2) return null;
  if (typeof value.customerEmail !== "string" || value.customerEmail.trim().length < 7) return null;
  if (typeof value.customerAddress !== "string" || value.customerAddress.trim().length < 5) return null;
  return {
    customerName: value.customerName.trim(),
    customerEmail: value.customerEmail.trim(),
    customerAddress: value.customerAddress.trim(),
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
    message: `Chamak Street order #${order.id.toString().padStart(6, "0")}`,
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

  const shippingFee = 25;
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + shippingFee;

  const [order] = await db.insert(ordersTable).values({
    ...parsed,
    total: String(total),
    status: "pending",
  }).returning();

  await db.insert(orderItemsTable).values(
    cartItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      price: String(item.price),
      quantity: item.quantity,
      size: item.size,
    })),
  );

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
