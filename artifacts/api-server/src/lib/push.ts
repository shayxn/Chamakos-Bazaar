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
  webpush.setVapidDetails("mailto:admin@firstpick.ae", keys.publicKey, keys.privateKey);
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

async function getAllSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  await ensureTable();
  const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
    sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`
  );
  return Array.isArray(result) ? result : (result as any).rows ?? [];
}

async function deliver(subs: { endpoint: string; p256dh: string; auth: string }[], payload: string) {
  if (!subs.length) return;
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
}

// ── Order push (called after confirmed order) ────────────────────────────────
const DELIVERY_LABEL_MAP: Record<string, string> = {
  standard: "Standard",
  express: "Express",
  priority: "⚡ Priority",
};

export async function sendOrderPush(order: {
  orderNumber: string;
  customerName: string;
  total: number;
  deliveryMethod?: string;
  deliveryCharge?: number;
  tip?: number;
  items: { productName: string; quantity: number }[];
  createdAt: string;
}) {
  try {
    if (!_initialized) await initPush();
    const subs = await getAllSubscriptions();
    if (!subs.length) return;

    const itemsSummary = order.items.slice(0, 3).map((i) => `${i.quantity}× ${i.productName}`).join(", ");
    const deliveryLabel = DELIVERY_LABEL_MAP[order.deliveryMethod ?? "standard"] ?? "Standard";
    const tipLine = (order.tip ?? 0) > 0 ? ` · Tip AED ${(order.tip ?? 0).toFixed(2)}` : "";
    const payload = JSON.stringify({
      title: `🛒 FirstPick — New Order`,
      body: `${order.customerName} · AED ${order.total.toFixed(2)} · ${deliveryLabel}${tipLine}\n${itemsSummary}`,
      type: "NEW_ORDER",
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        createdAt: order.createdAt,
        url: "/admin/orders",
      },
    });
    await deliver(subs, payload);
  } catch (err) {
    console.error("[Push] sendOrderPush failed:", err);
  }
}

// ── Customer push subscription table ────────────────────────────────────────
export async function ensureCustomerSubTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customer_push_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveCustomerSubscription(endpoint: string, p256dh: string, auth: string, customerPhone?: string, customerEmail?: string) {
  await ensureCustomerSubTable();
  await db.execute(sql`
    INSERT INTO customer_push_subscriptions (endpoint, p256dh, auth, customer_phone, customer_email)
    VALUES (${endpoint}, ${p256dh}, ${auth}, ${customerPhone ?? null}, ${customerEmail ?? null})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, 
      customer_phone = COALESCE(EXCLUDED.customer_phone, customer_push_subscriptions.customer_phone),
      customer_email = COALESCE(EXCLUDED.customer_email, customer_push_subscriptions.customer_email)
  `);
}

// ── Customer order status push ────────────────────────────────────────────────
const STATUS_PUSH_MESSAGES: Record<string, (orderNumber: string, extra?: Record<string, unknown>) => { title: string; body: string } | null> = {
  confirmed: (n) => ({ title: "Order Placed 🛍️", body: `Your FirstPick order #${n} has been placed successfully. We'll keep you updated!` }),
  preparing: (n) => ({ title: "Preparing 📦", body: `Good news! We're preparing your FirstPick order #${n}.` }),
  shipped: (n) => ({ title: "Shipped 🚚", body: `Your FirstPick order #${n} has been shipped and is heading your way.` }),
  out_for_delivery: (n) => ({ title: "On Its Way ⚡", body: `Not long now! Your FirstPick order #${n} is on its way to you.` }),
  delivered: (n) => ({ title: "Delivered ✓", body: `Delivered! Your FirstPick order #${n} has arrived. Enjoy your order!` }),
  delayed: (n, e) => ({ title: "Order Delayed ⚠️", body: `Your FirstPick order #${n} has been delayed.${e?.delayedUntil ? ` Expected by: ${e.delayedUntil}` : ""} Open FirstPick and go to My Orders to see more.` }),
  cancelled: (n, e) => {
    const refundMsg = e?.refundInitiated ? " Your money will be refunded back to your original payment method shortly." : "";
    return { title: "Order Cancelled", body: `Your FirstPick order #${n} has been cancelled.${refundMsg} Open FirstPick and go to My Orders to view the details.` };
  },
};

async function getCustomerSubscriptions(customerPhone?: string | null, customerEmail?: string | null): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  await ensureTable();
  // Customer subscriptions are stored in a separate table with customer identifier
  try {
    const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
      sql`SELECT endpoint, p256dh, auth FROM customer_push_subscriptions 
          WHERE customer_phone = ${customerPhone ?? null} OR customer_email = ${customerEmail ?? null}
          LIMIT 10`
    );
    return Array.isArray(result) ? result : (result as any).rows ?? [];
  } catch { return []; }
}

export async function sendCustomerStatusPush(
  order: { id: number; orderNumber?: string | null; customerPhone?: string | null; customerEmail?: string | null; customerPushLog?: string | null },
  status: string,
  extra?: { delayReason?: string; delayedUntil?: string; cancelReason?: string; refundInitiated?: boolean }
) {
  try {
    if (!_initialized) await initPush();
    const orderNum = order.orderNumber ?? `FP${order.id}`;
    const msgFactory = STATUS_PUSH_MESSAGES[status];
    if (!msgFactory) return; // No push for this status
    
    // Prevent duplicate: check customer_push_log
    const alreadySent = JSON.parse(order.customerPushLog ?? "[]") as string[];
    if (alreadySent.includes(status)) return;
    
    const msg = msgFactory(orderNum, extra as Record<string, unknown>);
    if (!msg) return;
    
    const subs = await getCustomerSubscriptions(order.customerPhone, order.customerEmail);
    if (!subs.length) return;
    
    const payload = JSON.stringify({
      title: msg.title, body: msg.body, type: "ORDER_STATUS",
      data: { orderId: order.id, orderNumber: orderNum, url: `/order/${order.id}` }
    });
    await deliver(subs, payload);
    
    // Update push log — mark this status as sent
    const newLog = JSON.stringify([...alreadySent, status]);
    await db.execute(sql`UPDATE orders SET customer_push_log = ${newLog} WHERE id = ${order.id}`);
  } catch (err) {
    console.error("[Push] sendCustomerStatusPush failed:", err);
  }
}

// ── Admin push subscriptions ─────────────────────────────────────────────────
let _adminSubsMigrated = false;
async function ensureAdminPushTable() {
  if (_adminSubsMigrated) return; _adminSubsMigrated = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      admin_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveAdminSubscription(endpoint: string, p256dh: string, auth: string, adminId?: string) {
  await ensureAdminPushTable();
  await db.execute(sql`
    INSERT INTO admin_push_subscriptions (endpoint, p256dh, auth, admin_id)
    VALUES (${endpoint}, ${p256dh}, ${auth}, ${adminId ?? null})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
      admin_id = COALESCE(EXCLUDED.admin_id, admin_push_subscriptions.admin_id)
  `);
}

async function getAdminSubscriptions(skipAdminId?: string): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  await ensureAdminPushTable();
  const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
    skipAdminId
      ? sql`SELECT endpoint, p256dh, auth FROM admin_push_subscriptions WHERE (admin_id != ${skipAdminId} OR admin_id IS NULL)`
      : sql`SELECT endpoint, p256dh, auth FROM admin_push_subscriptions`
  );
  return Array.isArray(result) ? result : (result as any).rows ?? [];
}

export async function sendAdminCallPush(callerName: string, callerAdminId: string) {
  try {
    if (!_initialized) await initPush();
    const subs = await getAdminSubscriptions(callerAdminId);
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `📞 Incoming Call`,
      body: `${callerName} is calling you on FirstPick Admin`,
      type: "ADMIN_CALL",
      data: { url: "/admin/chat" },
    });
    await deliver(subs, payload);
  } catch {}
}

export async function sendAdminChatPush(senderName: string, message: string, senderId: string) {
  try {
    if (!_initialized) await initPush();
    const subs = await getAdminSubscriptions(senderId);
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `💬 ${senderName}`,
      body: message.length > 100 ? message.slice(0, 97) + "…" : message,
      type: "ADMIN_CHAT",
      data: { url: "/admin/chat" }
    });
    await deliver(subs, payload);
  } catch {}
}

export async function sendAdminActivityPush(adminName: string, action: string, orderRef?: string) {
  try {
    if (!_initialized) await initPush();
    const subs = await getAdminSubscriptions();
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `🔔 ${adminName}`,
      body: `${action}${orderRef ? ` · ${orderRef}` : ""}`,
      type: "ADMIN_ACTIVITY",
      data: { url: "/admin/activity" }
    });
    await deliver(subs, payload);
  } catch {}
}

// ── Coming-soon wishlist notifications ───────────────────────────────────────
let _wishlistColMigrated = false;
async function ensureWishlistSubColumn() {
  if (_wishlistColMigrated) return; _wishlistColMigrated = true;
  await ensureCustomerSubTable();
  await db.execute(sql`
    ALTER TABLE customer_push_subscriptions
      ADD COLUMN IF NOT EXISTS session_id TEXT
  `);
}

export async function saveWishlistSubscription(endpoint: string, p256dh: string, auth: string, sessionId: string) {
  await ensureWishlistSubColumn();
  await db.execute(sql`
    INSERT INTO customer_push_subscriptions (endpoint, p256dh, auth, session_id)
    VALUES (${endpoint}, ${p256dh}, ${auth}, ${sessionId})
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      session_id = COALESCE(EXCLUDED.session_id, customer_push_subscriptions.session_id)
  `);
}

export async function sendComingSoonReleasePush(productId: number, productName: string, imageUrl?: string | null) {
  try {
    if (!_initialized) await initPush();
    // Find push subscriptions for all sessions that wishlisted this product (single JOIN query)
    const subRows = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
      sql`SELECT DISTINCT cps.endpoint, cps.p256dh, cps.auth
          FROM customer_push_subscriptions cps
          INNER JOIN wishlists w ON w.session_id = cps.session_id
          WHERE w.product_id = ${productId} AND cps.session_id IS NOT NULL`
    );
    const subs = (Array.isArray(subRows) ? subRows : (subRows as any).rows ?? []) as { endpoint: string; p256dh: string; auth: string }[];
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `🔥 ${productName} just dropped!`,
      body: "The item you wishlisted is now available. Tap to shop before it sells out.",
      type: "PRODUCT_RELEASE",
      data: { productId, url: `/product/${productId}` },
    });
    await deliver(subs, payload);
    console.log(`[Push] Sent release push for product ${productId} to ${subs.length} subscriber(s)`);
  } catch (err) {
    console.error("[Push] sendComingSoonReleasePush failed:", err);
  }
}

// ── Activity push (customer events) ─────────────────────────────────────────
export async function sendActivityPush(type: string, data: Record<string, unknown>) {
  try {
    if (!_initialized) await initPush();
    const subs = await getAllSubscriptions();
    if (!subs.length) return;

    let title = "FirstPick";
    let body = "";
    let url = "/admin/visitors";

    switch (type) {
      case "NEW_VISITOR":
        title = "FirstPick — New Visitor";
        body = `A ${data.label ?? "visitor"} just opened FirstPick`;
        break;
      case "CUSTOMER_SEARCH":
        title = "FirstPick — Customer Search";
        body = `A customer searched for "${data.query}"`;
        break;
      case "CART_ADD":
        title = "FirstPick — Added to Cart";
        body = data.count
          ? `A customer has ${data.count} item${Number(data.count) !== 1 ? "s" : ""} in cart (AED ${Number(data.value ?? 0).toFixed(0)})`
          : "A customer added an item to their cart";
        break;
      case "CHECKOUT_STARTED":
        title = "FirstPick — Checkout Started";
        body = "A customer just started checkout";
        url = "/admin/orders";
        break;
      case "NEW_ACCOUNT":
        title = "FirstPick — New Account";
        body = `New customer account created${data.email ? `: ${data.email}` : ""}`;
        break;
      default:
        title = "FirstPick";
        body = String(data.body ?? "");
    }

    const payload = JSON.stringify({ title, body, type, data: { ...data, url } });
    await deliver(subs, payload);
  } catch (err) {
    console.error("[Push] sendActivityPush failed:", err);
  }
}
