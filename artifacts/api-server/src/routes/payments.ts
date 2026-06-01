import { Router, type Request } from "express";
import { db, ordersTable } from "@workspace/db";
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

router.post("/payments/ziina-intent", async (req, res) => {
  const orderId = getOrderId(req.body);
  if (!orderId) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const accessToken = process.env.ZIINA_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(500).json({ error: "Ziina is not configured" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const amount = Math.round(Number(order.total) * 100);
  if (!Number.isFinite(amount) || amount < 200) {
    res.status(400).json({ error: "Ziina payments require a minimum amount of AED 2.00" });
    return;
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

  try {
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
      res.status(502).json({ error: data.latest_error?.message ?? "Ziina payment intent failed" });
      return;
    }

    if (!data.redirect_url) {
      logger.error({ data }, "Ziina payment intent response missing redirect_url");
      res.status(502).json({ error: "Ziina payment link was not returned" });
      return;
    }

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
