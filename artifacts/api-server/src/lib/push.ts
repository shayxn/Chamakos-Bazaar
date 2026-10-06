import webpush from "web-push";
import { db, siteSettingsTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import https from "node:https";

// Movie delivery is explicitly targeted. It never uses the real-order fan-out,
// customer subscriptions, order IDs, activity log or analytics.
export async function prepareMoviePush() {
  await ensureAdminPushTable();
  await initPush();
}
export function validMovieEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (["fcm.googleapis.com", "gcm-http.googleapis.com"].includes(url.hostname) || /(?:^|\.)push\.services\.mozilla\.com$|(?:^|\.)push\.apple\.com$|(?:^|\.)notify\.windows\.com$/.test(url.hostname));
  } catch { return false; }
}
export async function deliverMoviePush(deviceId: string, jobId: string, number: number, signal: AbortSignal) {
  if (signal.aborted) throw new Error("Burst stopped.");
  const result = await db.execute(sql`SELECT d.endpoint,COALESCE(a.p256dh,p.p256dh) AS p256dh,COALESCE(a.auth,p.auth) AS auth
    FROM admin_movie_devices d JOIN users u ON u.id=d.admin_id AND u.is_admin=TRUE
    JOIN admin_device_sessions s ON s.id=d.admin_session_id AND s.user_id=d.admin_id AND s.revoked_at IS NULL AND s.last_seen_at>NOW()-INTERVAL '30 days'
    LEFT JOIN admin_push_subscriptions a ON a.endpoint=d.endpoint AND a.admin_id=d.admin_id::text
    LEFT JOIN push_subscriptions p ON p.endpoint=d.endpoint AND p.admin_id=d.admin_id
    WHERE d.id=${deviceId} AND d.opted_in=TRUE`);
  const sub = (Array.isArray(result) ? result : (result as any).rows ?? [])[0];
  if (!sub?.p256dh || !sub.auth || !validMovieEndpoint(sub.endpoint)) throw new Error("Selected filming device is no longer opted in or its admin subscription is unavailable.");
  if (signal.aborted) throw new Error("Burst stopped.");
  const agent = new https.Agent({ keepAlive: false, maxSockets: 1 });
  const cancel = () => agent.destroy();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
      title: "Well done! You got an order!", body: "",
      type: "MOVIE_SIMULATION", tag: `movie-${jobId}-${number}`, data: { url: "/admin/movie-setup", kind: "MOVIE_SIMULATION" },
    }), { TTL: 60, urgency: "normal", timeout: 3000, agent });
  } finally { signal.removeEventListener("abort", cancel); agent.destroy(); }
}

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
  await db.execute(sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS admin_id INTEGER`);
}

async function getOrCreateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  return db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('imaginate-vapid-keys'))`);
  const rows = await tx
    .select()
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, ["vapid_public_key", "vapid_private_key"]));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  if (map["vapid_public_key"] && map["vapid_private_key"]) {
    return { publicKey: map["vapid_public_key"], privateKey: map["vapid_private_key"] };
  }

  const keys = webpush.generateVAPIDKeys();
  await tx.execute(sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES
      ('vapid_public_key', ${keys.publicKey}, NOW()),
      ('vapid_private_key', ${keys.privateKey}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `);
  return keys;
  });
}

export async function initPush(): Promise<string> {
  if (_initialized) {
    const keys = await getOrCreateVapidKeys();
    return keys.publicKey;
  }
  await ensureTable();
  const keys = await getOrCreateVapidKeys();
  const subjectSetting = await db.execute(sql`SELECT value FROM site_settings WHERE key='push_contact' LIMIT 1`);
  const contact = process.env.VAPID_SUBJECT || (Array.isArray(subjectSetting) ? subjectSetting : (subjectSetting as any).rows ?? [])[0]?.value;
  if (typeof contact !== "string" || !/^(mailto:|https:\/\/)/.test(contact)) throw new Error("Set your real push contact email or HTTPS website under Admin → Notifications → Push configuration before enabling notifications.");
  webpush.setVapidDetails(contact, keys.publicKey, keys.privateKey);
  _initialized = true;
  return keys.publicKey;
}
export function resetPushConfiguration() { _initialized = false; }

export async function saveSubscription(endpoint: string, p256dh: string, auth: string, adminId?: number) {
  await ensureTable();
  await db.execute(sql`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, admin_id)
    VALUES (${endpoint}, ${p256dh}, ${auth}, ${adminId ?? null})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, admin_id=EXCLUDED.admin_id
  `);
}

export async function removeSubscription(endpoint: string) {
  await ensureTable();
  await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
}
export async function removeOwnedSubscription(endpoint:string,adminId:number){
  await ensureTable();
  await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint=${endpoint} AND admin_id=${adminId}`);
}

async function getAllSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  await ensureTable();
  const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
    sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`
  );
  return Array.isArray(result) ? result : (result as any).rows ?? [];
}

async function deliver(subs: { endpoint: string; p256dh: string; auth: string }[], payload: string) {
  if (!subs.length) return 0;
  const results = await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      return true;
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await removeSubscription(sub.endpoint).catch(() => {});
      }
      return false;
    }
  }));
  return results.filter(Boolean).length;
}

export async function sendTestPush(endpoint: string, adminId?: number) {
  if (!_initialized) await initPush();
  const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
    sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE endpoint = ${endpoint} AND admin_id=${adminId ?? null} LIMIT 1`
  );
  const subs = Array.isArray(result) ? result : (result as any).rows ?? [];
  if (!subs.length) throw new Error("This browser does not have an active push subscription.");
  const delivered = await deliver(subs, JSON.stringify({
    title: "IMAGINATE Admin",
    body: "Admin notifications are working.",
    type: "TEST_NOTIFICATION",
    data: { url: "/admin/notifications" },
  }));
  if (!delivered) throw new Error("Your push provider did not accept the test notification.");
  return delivered;
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
      title: `🛒 IMAGINATE — New Order`,
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
  await db.execute(sql`ALTER TABLE customer_push_subscriptions ADD COLUMN IF NOT EXISTS customer_id INTEGER,ADD COLUMN IF NOT EXISTS order_id INTEGER`);
}

export async function saveCustomerSubscription(endpoint: string, p256dh: string, auth: string, customerPhone?: string, customerEmail?: string,customerId?:number,orderId?:number) {
  await ensureCustomerSubTable();
  await db.execute(sql`
    INSERT INTO customer_push_subscriptions (endpoint, p256dh, auth, customer_phone, customer_email,customer_id,order_id)
    VALUES (${endpoint}, ${p256dh}, ${auth}, ${customerPhone ?? null}, ${customerEmail ?? null},${customerId??null},${orderId??null})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, 
      customer_phone = EXCLUDED.customer_phone,customer_email = EXCLUDED.customer_email,
      customer_id=EXCLUDED.customer_id,order_id=EXCLUDED.order_id
  `);
}

// ── Customer order status push ────────────────────────────────────────────────
const STATUS_PUSH_MESSAGES: Record<string, (orderNumber: string, extra?: Record<string, unknown>) => { title: string; body: string } | null> = {
  confirmed: (n) => ({ title: "Order placed", body: `Your IMAGINATE order #${n} has been placed successfully.` }),
  preparing: (n) => ({ title: "Preparing your order", body: `We're preparing your IMAGINATE order #${n}.` }),
  shipped: (n) => ({ title: "Order shipped", body: `Your IMAGINATE order #${n} has been shipped.` }),
  out_for_delivery: (n) => ({ title: "Out for delivery", body: `Your IMAGINATE order #${n} is out for delivery.` }),
  delivered: (n) => ({ title: "Delivered ✓", body: `Your IMAGINATE order #${n} has arrived. Enjoy your order!` }),
  delayed: (n, e) => ({ title: "Order delayed", body: `Your IMAGINATE order #${n} has been delayed.${e?.delayedUntil ? ` Updated estimate: ${e.delayedUntil}` : ""} Open Imaginate to see the details.` }),
  cancelled: (n, e) => {
    const refundMsg = e?.refundInitiated ? " Your refund has been initiated through the payment provider; timing depends on the provider." : "";
    return { title: "Order Cancelled", body: `Your IMAGINATE order #${n} has been cancelled.${refundMsg} Open the app and go to My Orders to view the details.` };
  },
};

async function getCustomerSubscriptions(customerId:number|undefined|null,orderId:number,customerEmail?:string|null): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  await (await import("./customer-notification-delivery")).ensureCustomerNotificationSchema();
  // Customer subscriptions are stored in a separate table with customer identifier
  try {
    const result = await db.execute<{ endpoint: string; p256dh: string; auth: string }>(
      sql`SELECT endpoint, p256dh, auth FROM customer_push_subscriptions c
          WHERE order_updates_enabled=TRUE AND (customer_id = ${customerId??null} OR order_id = ${orderId})
          AND NOT EXISTS(SELECT 1 FROM push_subscriptions a WHERE a.endpoint=c.endpoint)
          AND NOT EXISTS(SELECT 1 FROM admin_push_subscriptions a WHERE a.endpoint=c.endpoint)
          LIMIT 10`
    );
    return Array.isArray(result) ? result : (result as any).rows ?? [];
  } catch { return []; }
}

export async function sendCustomerStatusPush(
  order: { id: number;customerId?:number|null; orderNumber?: string | null; customerPhone?: string | null; customerEmail?: string | null; customerPushLog?: string | null },
  status: string,
  extra?: { delayReason?: string; delayedUntil?: string; cancelReason?: string; refundInitiated?: boolean }
) {
  try {
    if (!_initialized) await initPush();
    const orderNum = order.orderNumber ?? `IMG-${order.id}`;
    const msgFactory = STATUS_PUSH_MESSAGES[status];
    if (!msgFactory) return; // No push for this status
    
    // Prevent duplicate: check customer_push_log
    const alreadySent = JSON.parse(order.customerPushLog ?? "[]") as string[];
    if (alreadySent.includes(status)) return;
    
    const msg = msgFactory(orderNum, extra as Record<string, unknown>);
    if (!msg) return;
    
    const subs = await getCustomerSubscriptions(order.customerId,order.id,order.customerEmail);
    if (!subs.length) return;
    
    const payload = JSON.stringify({
      title: msg.title, body: msg.body, type: "CUSTOMER_ORDER_STATUS",
      data: { orderId: order.id, orderNumber: orderNum, url: `/order/${order.id}` }
    });
    const accepted=await deliver(subs, payload);
    if(!accepted)return;
    
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

export async function removeAdminSubscription(endpoint: string,adminId?:string) {
  await ensureAdminPushTable();
  await db.execute(adminId?sql`DELETE FROM admin_push_subscriptions WHERE endpoint=${endpoint} AND admin_id=${adminId}`:sql`DELETE FROM admin_push_subscriptions WHERE endpoint=${endpoint}`);
}

async function getAdminSubscriptions(skipAdminId?: string): Promise<{ endpoint: string; p256dh: string; auth: string; admin_id?: string | null }[]> {
  await ensureAdminPushTable();
  const result = await db.execute<{ endpoint: string; p256dh: string; auth: string; admin_id?: string | null }>(
    skipAdminId
      ? sql`SELECT endpoint, p256dh, auth, admin_id FROM admin_push_subscriptions WHERE (admin_id != ${skipAdminId} OR admin_id IS NULL)`
      : sql`SELECT endpoint, p256dh, auth, admin_id FROM admin_push_subscriptions`
  );
  return Array.isArray(result) ? result : (result as any).rows ?? [];
}

export async function sendAdminCallPush(callerName: string, callerAdminId: string, roomUrl = "/admin/chat") {
  try {
    if (!_initialized) await initPush();
    const subs = await getAdminSubscriptions(callerAdminId);
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `📞 Incoming Call`,
      body: `${callerName} is calling you on IMAGINATE Admin`,
      type: "ADMIN_CALL",
        data: { url: roomUrl },
    });
    await deliver(subs, payload);
  } catch {}
}

export async function sendAdminChatPush(senderName: string, message: string, senderId: string, recipientAdminIds?: string[], conversationId = "group") {
  try {
    if (!_initialized) await initPush();
    const subs = (await getAdminSubscriptions(senderId)).filter((sub: any) => !recipientAdminIds || recipientAdminIds.includes(sub.admin_id));
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `💬 ${senderName}`,
      body: message.length > 100 ? message.slice(0, 97) + "…" : message,
      type: "ADMIN_CHAT",
      data: { url: `/admin/chat?conversation=${encodeURIComponent(conversationId)}`, conversationId }
    });
    await deliver(subs, payload);
  } catch (error) { console.error("[Push] Admin chat delivery failed:", error instanceof Error ? error.message : "Unknown error"); }
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

export async function sendOwnerPush(title: string, body: string, url: string, owner: number | null) {
  if (!owner) return 0;
  await initPush();
  await ensureAdminPushTable();
  const subs = rowsForOwner(await db.execute(sql`
    SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE admin_id=${owner}
    UNION SELECT endpoint,p256dh,auth FROM admin_push_subscriptions WHERE admin_id=${String(owner)}`));
  return deliver(subs, JSON.stringify({ title, body, type: "ADMIN_ACTIVITY", data: { url } }));
}
function rowsForOwner(result: unknown): { endpoint: string; p256dh: string; auth: string }[] {
  return Array.isArray(result) ? result : (result as any).rows ?? [];
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
    const {sendCustomerMarketing}=await import("./customer-notification-delivery");
    await sendCustomerMarketing(`release:${productId}:${new Date().toISOString().slice(0,10)}`,
      {title:`${productName} is available`,body:"The item you asked to hear about is now available. Open Imaginate to view it.",url:`/product/${productId}`},productId);
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

    let title = "IMAGINATE";
    let body = "";
    let url = "/admin/visitors";

    switch (type) {
      case "NEW_VISITOR":
        title = "IMAGINATE — New Visitor";
        body = `A ${data.label ?? "visitor"} just opened IMAGINATE`;
        break;
      case "CUSTOMER_SEARCH":
        title = "IMAGINATE — Customer Search";
        body = `A customer searched for "${data.query}"`;
        break;
      case "CART_ADD":
        title = "IMAGINATE — Added to Cart";
        body = data.count
          ? `A customer has ${data.count} item${Number(data.count) !== 1 ? "s" : ""} in cart (AED ${Number(data.value ?? 0).toFixed(0)})`
          : "A customer added an item to their cart";
        break;
      case "CHECKOUT_STARTED":
        title = "IMAGINATE — Checkout Started";
        body = "A customer just started checkout";
        url = "/admin/orders";
        break;
      case "NEW_ACCOUNT":
        title = "IMAGINATE — New Account";
        body = `New customer account created${data.email ? `: ${data.email}` : ""}`;
        break;
      default:
        title = "IMAGINATE";
        body = String(data.body ?? "");
    }

    const payload = JSON.stringify({ title, body, type, data: { ...data, url } });
    await deliver(subs, payload);
  } catch (err) {
    console.error("[Push] sendActivityPush failed:", err);
  }
}
