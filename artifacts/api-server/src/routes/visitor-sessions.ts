import { Router } from "express";
import { db, visitorSessionsTable, siteSettingsTable } from "@workspace/db";
import { eq, inArray, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { sendActivityPush, initPush } from "../lib/push";

// ── SSE client registry ──────────────────────────────────────────────────────
interface SseClient { res: any; id: number }
const sseClients = new Set<SseClient>();
let _nextClientId = 0;

function broadcast(data: object) {
  const chunk = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of [...sseClients]) {
    try { client.res.write(chunk); (client.res as any).flush?.(); }
    catch { sseClients.delete(client); }
  }
}

// ── DB migration (idempotent) ────────────────────────────────────────────────
let _migrated = false;
async function ensureColumns() {
  if (_migrated) return;
  _migrated = true;
  await db.execute(sql`
    ALTER TABLE visitor_sessions
      ADD COLUMN IF NOT EXISTS current_page      TEXT,
      ADD COLUMN IF NOT EXISTS search_terms      TEXT,
      ADD COLUMN IF NOT EXISTS cart_count        INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cart_value        NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_logged_in      BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS customer_email    TEXT,
      ADD COLUMN IF NOT EXISTS checkout_started  BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS order_completed   TEXT,
      ADD COLUMN IF NOT EXISTS activity_log      TEXT,
      ADD COLUMN IF NOT EXISTS notif_flags       TEXT
  `);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) return (result as any).rows as T[];
  return [];
}

async function getNotifEnabled(key: string): Promise<boolean> {
  try {
    const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    if (!rows.length) return key === "notif_new_orders";
    return rows[0].value === "true";
  } catch { return key === "notif_new_orders"; }
}

// ── Router ───────────────────────────────────────────────────────────────────
const router = Router();

// Ensure columns before any visitor session route
router.use("/visitor-sessions", async (_req, _res, next) => {
  try { await ensureColumns(); } catch {}
  next();
});

// ── Track (public — called by the customer website) ─────────────────────────
router.post("/visitor-sessions/track", async (req, res) => {
  const {
    sessionId, deviceType, deviceOs, browser,
    screenWidth, screenHeight, referrer, entryPage,
    events, durationSeconds,
    // Enhanced fields
    currentPage, searchQuery, cartCount, cartValue,
    isLoggedIn, customerEmail, checkoutStarted, orderCompleted,
    activityEvent,  // { type, label, ts }
    eventType,      // 'visit'|'page'|'search'|'cart_add'|'checkout'|'order'
  } = req.body as Record<string, any>;

  if (!sessionId) { res.json({ ok: false }); return; }

  try {
    type SessionRow = { id: number; activity_log: string | null; notif_flags: string | null; search_terms: string | null };
    const existing = await db.execute<SessionRow>(
      sql`SELECT id, activity_log, notif_flags, search_terms FROM visitor_sessions WHERE session_id = ${sessionId} LIMIT 1`
    );
    const rows = extractRows<SessionRow>(existing);

    let activityLog: { type: string; label: string; ts: number }[] = [];
    let notifFlags: Record<string, number> = {};
    let searchTerms: string[] = [];

    if (rows.length > 0) {
      try { activityLog = JSON.parse(rows[0].activity_log ?? "[]"); } catch {}
      try { notifFlags = JSON.parse(rows[0].notif_flags ?? "{}"); } catch {}
      try { searchTerms = JSON.parse(rows[0].search_terms ?? "[]"); } catch {}
    }

    // Append activity event
    if (activityEvent?.type) {
      activityLog = [...activityLog.slice(-99), activityEvent];
    }

    // Update search terms list (deduplicated)
    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim().length >= 2) {
      const q = searchQuery.trim();
      searchTerms = [q, ...searchTerms.filter((s: string) => s !== q)].slice(0, 10);
    }

    const now = new Date();
    const isNew = rows.length === 0;

    if (!isNew) {
      await db.execute(sql`
        UPDATE visitor_sessions SET
          events            = COALESCE(${events ?? null},           events),
          duration_seconds  = COALESCE(${durationSeconds ?? null},  duration_seconds),
          last_seen_at      = ${now},
          current_page      = COALESCE(${currentPage ?? null},      current_page),
          search_terms      = ${JSON.stringify(searchTerms)},
          cart_count        = COALESCE(${cartCount ?? null},        cart_count),
          cart_value        = COALESCE(${cartValue ?? null},        cart_value),
          is_logged_in      = COALESCE(${isLoggedIn ?? null},       is_logged_in),
          customer_email    = COALESCE(${customerEmail ?? null},    customer_email),
          checkout_started  = COALESCE(${checkoutStarted ?? null},  checkout_started),
          order_completed   = COALESCE(${orderCompleted ?? null},   order_completed),
          activity_log      = ${JSON.stringify(activityLog)},
          notif_flags       = ${JSON.stringify(notifFlags)}
        WHERE id = ${rows[0].id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO visitor_sessions (
          session_id, device_type, device_os, browser,
          screen_width, screen_height, referrer, entry_page,
          events, duration_seconds, current_page, search_terms,
          cart_count, cart_value, is_logged_in, customer_email,
          checkout_started, order_completed, activity_log, notif_flags
        ) VALUES (
          ${sessionId}, ${deviceType ?? null}, ${deviceOs ?? null}, ${browser ?? null},
          ${screenWidth ?? null}, ${screenHeight ?? null}, ${referrer ?? null}, ${entryPage ?? null},
          ${events ?? null}, ${durationSeconds ?? null}, ${currentPage ?? null}, ${JSON.stringify(searchTerms)},
          ${cartCount ?? 0}, ${cartValue ?? 0}, ${isLoggedIn ?? false}, ${customerEmail ?? null},
          ${checkoutStarted ?? false}, ${orderCompleted ?? null}, ${JSON.stringify(activityLog)}, ${JSON.stringify(notifFlags)}
        )
      `);
    }

    // ── Notification triggers ─────────────────────────────────────────────
    await initPush().catch(() => {});

    // New visitor
    if (isNew && await getNotifEnabled("notif_new_visitors")) {
      // Build a human-readable device name from UA + device info
      const ua = ((req as any).headers?.["user-agent"] ?? "") as string;
      let deviceLabel: string;
      if (/ipad/i.test(ua)) {
        deviceLabel = "iPad";
      } else if (/iphone/i.test(ua)) {
        deviceLabel = "iPhone";
      } else if (/android/i.test(ua) && !/mobile/i.test(ua)) {
        deviceLabel = "Android Tablet";
      } else if (/android/i.test(ua)) {
        deviceLabel = "Android Phone";
      } else if (/macintosh|mac os x/i.test(ua)) {
        deviceLabel = "MacBook";
      } else if (/windows/i.test(ua)) {
        deviceLabel = "Windows PC";
      } else if (deviceOs === "iOS") {
        deviceLabel = deviceType === "tablet" ? "iPad" : "iPhone";
      } else if (deviceOs === "Android") {
        deviceLabel = deviceType === "tablet" ? "Android Tablet" : "Android Phone";
      } else if (deviceOs === "macOS") {
        deviceLabel = "MacBook";
      } else if (deviceOs === "Windows") {
        deviceLabel = "Windows PC";
      } else if (deviceType === "tablet") {
        deviceLabel = "Tablet";
      } else if (deviceType === "mobile") {
        deviceLabel = "Mobile Device";
      } else if (deviceType === "desktop") {
        deviceLabel = "Computer";
      } else {
        deviceLabel = deviceOs ?? deviceType ?? "Visitor";
      }
      sendActivityPush("NEW_VISITOR", {
        label: deviceLabel,
        page: entryPage ?? "/",
      }).catch(() => {});
    }

    // Search
    if (eventType === "search" && searchQuery?.trim().length >= 3 && await getNotifEnabled("notif_searches")) {
      const last = notifFlags["search"] ?? 0;
      if (Date.now() - last > 10 * 60_000) {
        notifFlags["search"] = Date.now();
        await db.execute(sql`UPDATE visitor_sessions SET notif_flags=${JSON.stringify(notifFlags)} WHERE session_id=${sessionId}`);
        sendActivityPush("CUSTOMER_SEARCH", { query: searchQuery.trim() }).catch(() => {});
      }
    }

    // Add to cart
    if (eventType === "cart_add" && await getNotifEnabled("notif_cart_adds")) {
      const last = notifFlags["cart"] ?? 0;
      if (Date.now() - last > 30 * 60_000) {
        notifFlags["cart"] = Date.now();
        await db.execute(sql`UPDATE visitor_sessions SET notif_flags=${JSON.stringify(notifFlags)} WHERE session_id=${sessionId}`);
        sendActivityPush("CART_ADD", { count: cartCount, value: cartValue }).catch(() => {});
      }
    }

    // Checkout started
    if (eventType === "checkout" && await getNotifEnabled("notif_checkout")) {
      const last = notifFlags["checkout"] ?? 0;
      if (Date.now() - last > 60 * 60_000) {
        notifFlags["checkout"] = Date.now();
        await db.execute(sql`UPDATE visitor_sessions SET notif_flags=${JSON.stringify(notifFlags)} WHERE session_id=${sessionId}`);
        sendActivityPush("CHECKOUT_STARTED", {}).catch(() => {});
      }
    }

    // ── SSE broadcast ─────────────────────────────────────────────────────
    const updated = await db.execute(
      sql`SELECT * FROM visitor_sessions WHERE session_id = ${sessionId} LIMIT 1`
    );
    const session = extractRows(updated)[0] ?? null;
    if (session) broadcast({ type: "session_update", session });

    res.json({ ok: true });
  } catch (err) {
    console.error("[Visitors] track error:", err);
    res.json({ ok: false });
  }
});

// ── SSE stream (admin only) ──────────────────────────────────────────────────
router.get("/visitor-sessions/stream", requireAdmin, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  (res as any).flushHeaders?.();

  const client: SseClient = { res, id: ++_nextClientId };
  sseClients.add(client);
  res.write(`data: ${JSON.stringify({ type: "connected", id: client.id })}\n\n`);
  (res as any).flush?.();

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
      (res as any).flush?.();
    } catch { clearInterval(heartbeat); sseClients.delete(client); }
  }, 25_000);

  req.on("close", () => { clearInterval(heartbeat); sseClients.delete(client); });
});

// ── Admin list ───────────────────────────────────────────────────────────────
router.get("/visitor-sessions", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 200);
  const rows = await db.execute(
    sql`SELECT * FROM visitor_sessions ORDER BY last_seen_at DESC LIMIT ${limit}`
  );
  const sessions = extractRows(rows);

  const stats = await db.execute<{ total: string; today: string; mobile: string }>(
    sql`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::text AS today,
      COUNT(*) FILTER (WHERE device_type = 'mobile')::text AS mobile
    FROM visitor_sessions`
  );
  const s = extractRows<{ total: string; today: string; mobile: string }>(stats)[0] ?? { total: "0", today: "0", mobile: "0" };
  res.json({ sessions, stats: { total: Number(s.total), today: Number(s.today), mobile: Number(s.mobile) } });
});

// ── Delete ───────────────────────────────────────────────────────────────────
router.delete("/visitor-sessions/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(visitorSessionsTable).where(eq(visitorSessionsTable.id, id));
  broadcast({ type: "session_delete", id });
  res.json({ ok: true });
});

// ── Notification settings ────────────────────────────────────────────────────
const NOTIF_KEYS = [
  "notif_new_orders", "notif_searches", "notif_new_visitors",
  "notif_cart_adds", "notif_checkout", "notif_new_accounts",
] as const;

router.get("/visitor-sessions/notif-settings", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, [...NOTIF_KEYS]));
    const defaults: Record<string, boolean> = {
      notif_new_orders: true,
      notif_searches: false,
      notif_new_visitors: false,
      notif_cart_adds: false,
      notif_checkout: false,
      notif_new_accounts: false,
    };
    for (const r of rows) defaults[r.key] = r.value === "true";
    res.json(defaults);
  } catch { res.json({}); }
});

router.post("/visitor-sessions/notif-settings", requireAdmin, async (req, res) => {
  try {
    const settings = req.body as Record<string, boolean>;
    for (const [key, val] of Object.entries(settings)) {
      if (!NOTIF_KEYS.includes(key as any)) continue;
      await db.execute(sql`
        INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${val ? "true" : "false"}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
    }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to save settings" }); }
});

export default router;
