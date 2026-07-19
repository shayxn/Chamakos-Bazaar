import webpush from "web-push";
import { db, siteSettingsTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";

let _initialized = false;

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getOrCreateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, ["vapid_public_key", "vapid_private_key"]));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  if (map["vapid_public_key"] && map["vapid_private_key"]) {
    return { publicKey: map["vapid_public_key"], privateKey: map["vapid_private_key"] };
  }

  const keys = webpush.generateVAPIDKeys();
  await db.execute(sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES
      ('vapid_public_key', ${keys.publicKey}, NOW()),
      ('vapid_private_key', ${keys.privateKey}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `);
  return keys;
}

export async function initPush(): Promise<string> {
  if (_initialized) {
    const keys = await getOrCreateVapidKeys();
    return keys.publicKey;
  }
  await ensureTable();
  const keys = await getOrCreateVapidKeys();
  webpush.setVapidDetails("mailto:admin@chamakstreet.com", keys.publicKey, keys.privateKey);
  _initialized = true;
  return keys.publicKey;
}

export async function saveSubscription(endpoint: string, p256dh: string, auth: string) {
  await ensureTable();
  await db.execute(sql`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `);
}

export async function removeSubscription(endpoint: string) {
  await ensureTable();
  await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
}

export async function sendOrderPush(order: {
  orderNumber: string;
  customerName: string;
  total: number;
  items: { productName: string; quantity: number }[];
  createdAt: string;
}) {
  try {
    if (!_initialized) await initPush();
    await ensureTable();

    const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
      sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`
    );
    const subs: { endpoint: string; p256dh: string; auth: string }[] =
      Array.isArray(result) ? result : (result as any).rows ?? [];

    if (subs.length === 0) return;

    const itemsSummary = order.items
      .slice(0, 3)
      .map((i) => `${i.quantity}× ${i.productName}`)
      .join(", ");

    const payload = JSON.stringify({
      title: `🛒 New Order — ${order.orderNumber}`,
      body: `${order.customerName} · AED ${order.total.toFixed(2)}\n${itemsSummary}`,
      type: "NEW_ORDER",
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        createdAt: order.createdAt,
        url: "/admin/orders",
      },
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: any) => {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await removeSubscription(sub.endpoint).catch(() => {});
            }
          })
      )
    );
  } catch (err) {
    console.error("[Push] sendOrderPush failed:", err);
  }
}
