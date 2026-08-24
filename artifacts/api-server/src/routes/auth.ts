import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { ensureAdminSessionsTable, getRequestDeviceDetails, touchAdminSession } from "../lib/admin-sessions";

const router = Router();
const BCRYPT_ROUNDS = 12;
const MAX_DEVICES = 3;

function legacySha256Hash(password: string): string {
  return crypto.createHash("sha256").update(password + "chamak_salt_2024").digest("hex");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$2")) return bcrypt.compare(password, storedHash);
  return storedHash === legacySha256Hash(password);
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []);
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Upgrade legacy password hash
  if (!user.passwordHash.startsWith("$2")) {
    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  }

  // ── Device session limit ───────────────────────────────────────────────────
  if (user.isAdmin) {
    await ensureAdminSessionsTable();

    // Remove stale sessions (older than 7 days, matching cookie max-age)
    await db.execute(sql`
      DELETE FROM admin_device_sessions
      WHERE user_id = ${user.id}
        AND (last_seen_at < NOW() - INTERVAL '30 days' OR revoked_at IS NOT NULL)
    `);

    // Count active device sessions
    const countRows = extractRows<{ count: string }>(
      await db.execute(sql`
        SELECT COUNT(*) AS count FROM admin_device_sessions WHERE user_id = ${user.id}
      `)
    );
    const activeCount = parseInt(countRows[0]?.count ?? "0", 10);

    if (activeCount >= MAX_DEVICES) {
      res.status(403).json({ error: "Maximum Devices Reached" });
      return;
    }

    // Register this device
    const deviceToken = crypto.randomUUID();
    const { userAgent, ipAddress } = getRequestDeviceDetails(req);
    await db.execute(sql`
      INSERT INTO admin_device_sessions (user_id, device_token, user_agent, ip_address)
      VALUES (${user.id}, ${deviceToken}, ${userAgent}, ${ipAddress})
    `);
    (req.session as Record<string, unknown>).deviceToken = deviceToken;
  }

  (req.session as Record<string, unknown>).userId = user.id;
  res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

router.post("/auth/logout", async (req, res) => {
  const session = req.session as Record<string, unknown>;
  const deviceToken = session?.deviceToken as string | undefined;
  if (deviceToken) {
    try {
      await ensureAdminSessionsTable();
      await db.execute(sql`DELETE FROM admin_device_sessions WHERE device_token = ${deviceToken}`);
    } catch {}
  }
  req.session = null;
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  const session = req.session as Record<string, unknown>;
  const userId = session?.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (user.isAdmin && !(await touchAdminSession(req, user.id))) {
    req.session = null;
    res.status(401).json({ error: "Admin session expired. Please sign in again." });
    return;
  }
  res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

router.get("/auth/admin/sessions", requireAdmin, async (req, res) => {
  const userId = (req.session as Record<string, unknown>).userId as number;
  const currentToken = (req.session as Record<string, unknown>).deviceToken as string | undefined;
  await ensureAdminSessionsTable();
  const rows = extractRows<{
    id: number;
    user_agent: string | null;
    ip_address: string | null;
    last_seen_at: string;
    created_at: string;
  }>(await db.execute(sql`
    SELECT id, user_agent, ip_address, last_seen_at, created_at
    FROM admin_device_sessions
    WHERE user_id = ${userId} AND revoked_at IS NULL
    ORDER BY last_seen_at DESC
  `));
  const current = currentToken
    ? extractRows<{ id: number }>(await db.execute(sql`
        SELECT id FROM admin_device_sessions WHERE user_id = ${userId} AND device_token = ${currentToken} LIMIT 1
      `))[0]?.id
    : null;
  res.json(rows.map((row) => ({
    id: row.id,
    device: row.user_agent?.split(" ")[0] || "Unknown browser",
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    isCurrent: row.id === current,
  })));
});

router.delete("/auth/admin/sessions/:id", requireAdmin, async (req, res) => {
  const userId = (req.session as Record<string, unknown>).userId as number;
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  const currentToken = (req.session as Record<string, unknown>).deviceToken as string | undefined;
  const target = extractRows<{ device_token: string }>(await db.execute(sql`
    SELECT device_token FROM admin_device_sessions
    WHERE id = ${sessionId} AND user_id = ${userId} AND revoked_at IS NULL
    LIMIT 1
  `))[0];
  if (!target) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await db.execute(sql`
    UPDATE admin_device_sessions SET revoked_at = NOW()
    WHERE id = ${sessionId} AND user_id = ${userId}
  `);
  if (target.device_token === currentToken) req.session = null;
  res.json({ ok: true, loggedOutCurrent: target.device_token === currentToken });
});

router.post("/auth/admin/sessions/logout-others", requireAdmin, async (req, res) => {
  const userId = (req.session as Record<string, unknown>).userId as number;
  const currentToken = (req.session as Record<string, unknown>).deviceToken as string | undefined;
  if (!currentToken) {
    res.status(400).json({ error: "Current device session is missing" });
    return;
  }
  await ensureAdminSessionsTable();
  await db.execute(sql`
    UPDATE admin_device_sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND device_token <> ${currentToken} AND revoked_at IS NULL
  `);
  res.json({ ok: true });
});

export default router;
