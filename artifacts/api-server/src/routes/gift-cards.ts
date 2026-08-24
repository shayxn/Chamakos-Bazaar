import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { requireAdmin } from "../lib/auth-middleware";
import { logger } from "../lib/logger";

export { applyGiftCardBalance, getCustomerGiftCardBalance } from "../lib/gift-card-service";

const router = Router();
const ZIINA_API_URL = "https://api-v2.ziina.com/api/payment_intent";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCustomerId(req: any): number | null { return req.session?.customerId ?? null; }
function requireCustomer(req: any, res: any): number | null {
  const id = getCustomerId(req);
  if (!id) { res.status(401).json({ error: "Sign in to purchase a gift card" }); return null; }
  return id;
}
function getSiteBaseUrl(req: any): string {
  const c = process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (c) return c.replace(/\/+$/, "");
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}
function generateCode(): string {
  const C = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const b = crypto.randomBytes(6);
  for (const x of b) s += C[x % C.length];
  return `FP-GIFT-${s}`;
}
function generateToken(): string { return crypto.randomBytes(32).toString("hex"); }
function extractRows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  return ((r as any)?.rows ?? []) as T[];
}
function serializeCard(c: any) {
  if (!c) return null;
  return {
    id: c.id, code: c.code, claimToken: c.claim_token,
    amount: Number(c.amount), balance: Number(c.balance),
    status: c.status, forSelf: c.for_self === true || c.for_self === 1,
    purchaserCustomerId: c.purchaser_customer_id,
    ownerCustomerId: c.owner_customer_id,
    recipientName: c.recipient_name, senderName: c.sender_name,
    message: c.message, claimedAt: c.claimed_at, createdAt: c.created_at,
    transactions: c.transactions ?? [],
  };
}

// ── DB Migration ──────────────────────────────────────────────────────────────
let _migrated = false;
async function ensureTables() {
  if (_migrated) return; _migrated = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      claim_token TEXT UNIQUE,
      amount NUMERIC(10,2) NOT NULL,
      balance NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      for_self BOOLEAN NOT NULL DEFAULT TRUE,
      purchaser_customer_id INTEGER,
      owner_customer_id INTEGER,
      recipient_name TEXT,
      sender_name TEXT,
      message TEXT,
      claimed_at TIMESTAMP WITH TIME ZONE,
      payment_intent_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gift_card_transactions (
      id SERIAL PRIMARY KEY,
      gift_card_id INTEGER NOT NULL,
      order_id INTEGER,
      amount_used NUMERIC(10,2) NOT NULL,
      balance_after NUMERIC(10,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_discount NUMERIC(10,2) NOT NULL DEFAULT 0
  `);
}
ensureTables().catch(console.error);

// ── POST /gift-cards/purchase ─────────────────────────────────────────────────
router.post("/gift-cards/purchase", async (req, res) => {
  const customerId = requireCustomer(req, res);
  if (!customerId) return;

  const { amount, forSelf, recipientName, senderName, message } = req.body as Record<string, unknown>;
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 10 || amountNum > 10000) {
    res.status(400).json({ error: "Amount must be between AED 10 and AED 10,000" }); return;
  }
  const isForSelf = forSelf !== false;
  const recipientStr = typeof recipientName === "string" ? recipientName.trim() : "";
  const senderStr   = typeof senderName   === "string" ? senderName.trim()   : "";
  const messageStr  = typeof message      === "string" ? message.trim()      : "";

  if (!isForSelf && !recipientStr) {
    res.status(400).json({ error: "Recipient name is required" }); return;
  }

  try {
    const code       = generateCode();
    const claimToken = isForSelf ? null : generateToken();

    const inserted = extractRows<{ id: number }>(await db.execute(sql`
      INSERT INTO gift_cards
        (code, claim_token, amount, balance, status, for_self,
         purchaser_customer_id, owner_customer_id, recipient_name, sender_name, message)
      VALUES
        (${code}, ${claimToken}, ${amountNum}, ${amountNum}, 'pending', ${isForSelf},
         ${customerId}, ${isForSelf ? customerId : null},
         ${recipientStr || null}, ${senderStr || null}, ${messageStr || null})
      RETURNING id
    `));
    const giftCardId = inserted[0]?.id;
    if (!giftCardId) throw new Error("Failed to create gift card record");

    const baseUrl   = getSiteBaseUrl(req);
    const successUrl = `${baseUrl}/gift-cards/complete/${giftCardId}?payment=success`;
    const cancelUrl  = `${baseUrl}/gift-cards?payment=cancelled`;

    const accessToken = process.env.ZIINA_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Online payment is not configured. Contact support.");

    const zinaAmount = Math.round(amountNum * 100);
    if (zinaAmount < 200) throw new Error("Minimum gift card amount is AED 2.00");

    const zBody = {
      amount: zinaAmount,
      currency_code: process.env.ZIINA_CURRENCY_CODE ?? "AED",
      message: `FirstPick Gift Card — AED ${amountNum}`,
      success_url: successUrl,
      cancel_url:  cancelUrl,
      failure_url: cancelUrl,
      test: process.env.ZIINA_TEST_MODE === "true",
    };
    const zResp = await fetch(ZIINA_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(zBody),
    });
    const zData = await zResp.json() as { id: string; redirect_url?: string; latest_error?: { message?: string } };
    if (!zResp.ok || !zData.redirect_url) {
      throw new Error(zData.latest_error?.message ?? "Payment provider error");
    }

    await db.execute(sql`UPDATE gift_cards SET payment_intent_id = ${zData.id} WHERE id = ${giftCardId}`);
    res.json({ giftCardId, redirectUrl: zData.redirect_url });
  } catch (err) {
    logger.error({ err }, "Gift card purchase failed");
    res.status(502).json({ error: err instanceof Error ? err.message : "Purchase failed" });
  }
});

// ── POST /gift-cards/activate/:id ─────────────────────────────────────────────
router.post("/gift-cards/activate/:id", async (req, res) => {
  const customerId = requireCustomer(req, res);
  if (!customerId) return;

  const gcId = Number(req.params.id);
  if (isNaN(gcId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const rows = extractRows<any>(await db.execute(sql`SELECT * FROM gift_cards WHERE id = ${gcId}`));
  const gc = rows[0];
  if (!gc) { res.status(404).json({ error: "Gift card not found" }); return; }
  if (gc.purchaser_customer_id !== customerId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (gc.status === "active") { res.json({ ...serializeCard(gc), alreadyActive: true }); return; }
  if (gc.status !== "pending") { res.status(400).json({ error: "Gift card cannot be activated" }); return; }

  await db.execute(sql`
    UPDATE gift_cards
    SET status = 'active'
        ${gc.for_self ? sql`, owner_customer_id = ${customerId}` : sql``}
    WHERE id = ${gcId} AND status = 'pending'
  `);

  const updated = extractRows<any>(await db.execute(sql`SELECT * FROM gift_cards WHERE id = ${gcId}`));
  res.json(serializeCard(updated[0]));
});

// ── GET /gift-cards/my ────────────────────────────────────────────────────────
router.get("/gift-cards/my", async (req, res) => {
  const customerId = requireCustomer(req, res);
  if (!customerId) return;

  const rows = extractRows<any>(await db.execute(sql`
    SELECT gc.*,
      COALESCE((
        SELECT json_agg(t ORDER BY t.created_at DESC)
        FROM gift_card_transactions t WHERE t.gift_card_id = gc.id
      ), '[]'::json) as transactions
    FROM gift_cards gc
    WHERE gc.owner_customer_id = ${customerId} AND gc.status IN ('active', 'used')
    ORDER BY gc.created_at DESC
  `));
  res.json(rows.map(serializeCard));
});

// ── GET /gift-cards/balance ───────────────────────────────────────────────────
router.get("/gift-cards/balance", async (req, res) => {
  const customerId = requireCustomer(req, res);
  if (!customerId) return;
  const rows = extractRows<{ total: string }>(await db.execute(sql`
    SELECT COALESCE(SUM(balance), 0) as total
    FROM gift_cards
    WHERE owner_customer_id = ${customerId} AND status = 'active' AND balance > 0
  `));
  res.json({ balance: Number(rows[0]?.total ?? 0) });
});

// ── GET /gift-cards/claim/:token (public) ─────────────────────────────────────
router.get("/gift-cards/claim/:token", async (req, res) => {
  const rows = extractRows<any>(await db.execute(sql`
    SELECT id, amount, status, recipient_name, sender_name, message, for_self,
           claimed_at, created_at, owner_customer_id,
           CASE WHEN status = 'active' AND owner_customer_id IS NULL THEN code ELSE NULL END as code
    FROM gift_cards WHERE claim_token = ${req.params.token}
  `));
  const gc = rows[0];
  if (!gc) { res.status(404).json({ error: "Gift link not found" }); return; }
  res.json(serializeCard(gc));
});

// ── POST /gift-cards/claim/:token ─────────────────────────────────────────────
router.post("/gift-cards/claim/:token", async (req, res) => {
  const customerId = requireCustomer(req, res);
  if (!customerId) return;

  const result = extractRows<any>(await db.execute(sql`
    UPDATE gift_cards
    SET owner_customer_id = ${customerId}, claimed_at = NOW()
    WHERE claim_token = ${req.params.token}
      AND status = 'active'
      AND owner_customer_id IS NULL
      AND for_self = FALSE
    RETURNING *
  `));

  if (!result[0]) {
    const existing = extractRows<any>(await db.execute(sql`SELECT * FROM gift_cards WHERE claim_token = ${req.params.token}`));
    const ex = existing[0];
    if (!ex) { res.status(404).json({ error: "Gift link not found or expired" }); return; }
    if (ex.owner_customer_id === customerId) { res.json({ ...serializeCard(ex), alreadyClaimed: true }); return; }
    res.status(409).json({ error: "This gift card has already been claimed" }); return;
  }
  res.json(serializeCard(result[0]));
});

// ── Admin: GET /admin/gift-cards ──────────────────────────────────────────────
router.get("/admin/gift-cards", requireAdmin, async (_req, res) => {
  const rows = extractRows<any>(await db.execute(sql`
    SELECT gc.*,
      p.name as purchaser_name, p.email as purchaser_email,
      o.name as owner_name, o.email as owner_email,
      COALESCE((
        SELECT json_agg(t ORDER BY t.created_at DESC)
        FROM gift_card_transactions t WHERE t.gift_card_id = gc.id
      ), '[]'::json) as transactions
    FROM gift_cards gc
    LEFT JOIN customer_accounts p ON p.id = gc.purchaser_customer_id
    LEFT JOIN customer_accounts o ON o.id = gc.owner_customer_id
    ORDER BY gc.created_at DESC
  `));
  res.json(rows.map((c: any) => ({
    ...serializeCard(c),
    purchaserName: c.purchaser_name, purchaserEmail: c.purchaser_email,
    ownerName: c.owner_name,       ownerEmail: c.owner_email,
  })));
});

// ── Admin: PATCH /admin/gift-cards/:id ────────────────────────────────────────
router.patch("/admin/gift-cards/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status } = req.body as { status?: string };
  if (!status || !["active", "disabled"].includes(status)) {
    res.status(400).json({ error: "status must be 'active' or 'disabled'" }); return;
  }
  await db.execute(sql`UPDATE gift_cards SET status = ${status} WHERE id = ${id}`);
  res.json({ ok: true });
});

export default router;
