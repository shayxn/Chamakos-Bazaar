import { randomUUID } from "node:crypto";
import type { Request } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { initPush, ensureCustomerSubTable } from "./push";
import { rows } from "./management-db";
import { logger } from "./logger";

let schemaPromise: Promise<void> | undefined;
export function ensureCustomerNotificationSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await ensureCustomerSubTable();
    await db.execute(sql`ALTER TABLE customer_push_subscriptions
      ADD COLUMN IF NOT EXISTS owner_key TEXT,
      ADD COLUMN IF NOT EXISTS marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS order_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS session_id TEXT`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS customer_notification_campaigns (
      id SERIAL PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,category TEXT NOT NULL,url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',due_at TIMESTAMPTZ,accepted INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,skipped INTEGER NOT NULL DEFAULT 0,error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS customer_marketing_deliveries (
      id SERIAL PRIMARY KEY,message_id TEXT NOT NULL,owner_key TEXT NOT NULL,status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(message_id,owner_key))`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS customer_marketing_weekly ON customer_marketing_deliveries(owner_key,created_at)`);
    // Same browser must not silently become both a customer and a work-notification recipient.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
      id SERIAL PRIMARY KEY,endpoint TEXT UNIQUE NOT NULL,p256dh TEXT NOT NULL,auth TEXT NOT NULL,
      admin_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  })().catch(error => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}
export function customerNotificationOwner(req: Request) {
  if (req.session?.customerId) return `customer:${req.session.customerId}`;
  if (!req.session!.customerNotificationId) req.session!.customerNotificationId = randomUUID();
  return `visitor:${req.session!.customerNotificationId}`;
}
export async function bindCustomerOrder(req: Request, orderId: number) {
  await ensureCustomerNotificationSchema();
  await db.execute(sql`UPDATE customer_push_subscriptions SET order_id=${orderId}
    WHERE owner_key=${customerNotificationOwner(req)} AND order_updates_enabled=TRUE`);
}
type Sub = { endpoint: string; p256dh: string; auth: string; owner_key: string };
export async function reserveCustomerMarketing(messageId:string,owner:string) {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"customer-marketing:" + owner}))`);
    const previous = rows(await tx.execute(sql`SELECT status FROM customer_marketing_deliveries
      WHERE message_id=${messageId} AND owner_key=${owner}`))[0];
    if (previous && previous.status !== "failed") return false;
    const recent = rows(await tx.execute(sql`SELECT COUNT(*)::int AS n FROM customer_marketing_deliveries
      WHERE owner_key=${owner} AND created_at>NOW()-INTERVAL '7 days' AND status IN ('pending','accepted')`))[0];
    if (Number(recent?.n) >= 5) return false;
    await tx.execute(sql`INSERT INTO customer_marketing_deliveries(message_id,owner_key,status)
      VALUES(${messageId},${owner},'pending') ON CONFLICT(message_id,owner_key)
      DO UPDATE SET status='pending',created_at=NOW()`);
    return true;
  });
}
export async function sendCustomerMarketing(messageId: string, message: {title:string;body:string;url:string}, wishlistProductId?: number) {
  await ensureCustomerNotificationSchema();
  await initPush(); // No claim, no quota reservation, and no fake success when configuration is missing.
  const eligible = rows<Sub>(await db.execute(sql`SELECT c.endpoint,c.p256dh,c.auth,c.owner_key
    FROM customer_push_subscriptions c WHERE c.marketing_enabled=TRUE AND c.consent_at IS NOT NULL AND c.owner_key IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM push_subscriptions a WHERE a.endpoint=c.endpoint)
    AND NOT EXISTS(SELECT 1 FROM admin_push_subscriptions a WHERE a.endpoint=c.endpoint)
    ${wishlistProductId ? sql`AND EXISTS(SELECT 1 FROM wishlists w WHERE w.session_id=c.session_id AND w.product_id=${wishlistProductId})` : sql``}
    LIMIT 10000`));
  const groups = new Map<string, Sub[]>();
  for (const sub of eligible) groups.set(sub.owner_key, [...(groups.get(sub.owner_key) ?? []), sub]);
  const report = { accepted: 0, failed: 0, skipped: 0 };
  const recipients = [...groups.entries()];
  for (let i = 0; i < recipients.length; i += 5) {
    await Promise.all(recipients.slice(i, i + 5).map(async ([owner, devices]) => {
      // Rolling seven days, atomically reserved across every customer's devices.
      const claim = await reserveCustomerMarketing(messageId,owner);
      if (!claim) { report.skipped++; return; }
      let accepted = 0;
      for (const sub of devices) {
        // Re-check preferences after claiming: an opt-out must take effect before sending.
        const active = rows(await db.execute(sql`SELECT id FROM customer_push_subscriptions
          WHERE endpoint=${sub.endpoint} AND owner_key=${owner} AND marketing_enabled=TRUE`))[0];
        if (!active) continue;
        try {
          await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
            JSON.stringify({...message,type:"CUSTOMER_MARKETING",data:{url:message.url,messageId}}), {TTL:86400,timeout:10000});
          accepted++;
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410)
            await db.execute(sql`DELETE FROM customer_push_subscriptions WHERE endpoint=${sub.endpoint}`);
          logger.warn({statusCode:error.statusCode}, "Customer push was not accepted by the provider");
        }
      }
      await db.execute(sql`UPDATE customer_marketing_deliveries SET status=${accepted ? "accepted" : "failed"}
        WHERE message_id=${messageId} AND owner_key=${owner}`);
      if (accepted) report.accepted += accepted; else report.failed++;
    }));
  }
  return report;
}
