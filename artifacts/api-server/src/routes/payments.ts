import { Router, type Request } from "express";
import { createValidatedOrder, releaseFailedCheckout, CheckoutError } from "../lib/checkout-service";
import { clearProductCaches } from "./products";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, orderTrackingEventsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getDeliveryCharges, DELIVERY_METHODS } from "../lib/delivery";
import { createHash } from "node:crypto";
import { requireAdmin } from "../lib/auth-middleware";
import { verifyZiinaPayment } from "../lib/payment-verification";

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
  orderNumber:string|null;
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
    operation_id:(()=>{const h=createHash("sha1").update(`imaginate-ziina:${order.orderNumber||order.id}`).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;})(),
    amount,
    currency_code: "AED",
    message: `IMAGINATE order #${order.id.toString().padStart(6, "0")}`,
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
    signal:AbortSignal.timeout(10000),
  });

  const data = (await response.json()) as ZiinaPaymentIntentResponse;
  if (!response.ok) {
    logger.error({ status: response.status, data }, "Ziina payment intent failed");
    throw new Error(data.latest_error?.message ?? "Ziina payment intent failed");
  }

  if (!data.redirect_url||!data.id) {
    logger.error({ data }, "Ziina payment intent response missing redirect_url");
    throw new Error("Ziina payment link was not returned");
  }

  return data;
}

router.post("/payments/ziina-checkout", async (req, res) => {
  if (!process.env.ZIINA_ACCESS_TOKEN) { res.status(503).json({error:"Online payment is not configured. No payment has been taken."}); return; }
  let created;
  try { created = await createValidatedOrder(req,"ziina",false); }
  catch (error) {
    if (error instanceof CheckoutError || /discount|stock|bag|size/i.test((error as Error).message)) {
      res.status(400).json({error:(error as Error).message}); return;
    }
    throw error;
  }
  const order = created.order;
  (req.session as Record<string, unknown>).lastOrderId = order.id;

  try {
    const data = await createZiinaIntent(req, order);
    await db.update(ordersTable).set({paymentIntentId:data.id,paymentStatus:"pending"}).where(eq(ordersTable.id,order.id));
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, String(req.session?.cartId ?? "")));
    clearProductCaches();
    res.status(201).json({
      orderId: order.id,
      id: data.id,
      redirectUrl: data.redirect_url,
      embeddedUrl: data.embedded_url ?? null,
    });
  } catch (error) {
    await releaseFailedCheckout(created);
    clearProductCaches();
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
  if(userId){let allowed=false;await requireAdmin(req,res,()=>{allowed=true;});if(!allowed)return;}

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if(order.paymentMethod!=="ziina"||order.status==="cancelled"||order.paymentStatus==="paid"){res.status(409).json({error:"This order does not require a new online payment."});return;}
  if(order.paymentIntentId){res.status(409).json({error:"An online payment already exists. Check its status before retrying."});return;}

  try {
    const data = await createZiinaIntent(req, order);
    await db.update(ordersTable).set({paymentIntentId:data.id,paymentStatus:"pending"}).where(eq(ordersTable.id,order.id));
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
router.get("/payments/:id/status",async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0){res.sendStatus(400);return;}
  const [order]=await db.select().from(ordersTable).where(eq(ordersTable.id,id));
  if(!order){res.sendStatus(404);return;}
  if(req.session?.userId){let allowed=false;await requireAdmin(req,res,()=>{allowed=true;});if(!allowed)return;}
  else if(req.session?.lastOrderId!==id&&(!req.session?.customerId||order.customerId!==req.session.customerId)){res.sendStatus(403);return;}
  try{
    const state=await verifyZiinaPayment(id);
    clearProductCaches();
    res.setHeader("Cache-Control","no-store");res.json(state);
  }catch(error){res.status(503).json({error:(error as Error).message});}
});

export default router;
