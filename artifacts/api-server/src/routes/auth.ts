import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

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

// ── Device session tracking ────────────────────────────────────────────────────
let _sessionsTableEnsured = false;
async function ensureSessionsTable() {
  if (_sessionsTableEnsured) return;
  _sessionsTableEnsured = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_device_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      device_token TEXT UNIQUE NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return (result as any).rows ?? [];
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
    await ensureSessionsTable();

    // Remove stale sessions (older than 7 days, matching cookie max-age)
    await db.execute(sql`
      DELETE FROM admin_device_sessions
      WHERE user_id = ${user.id}
        AND last_seen_at < NOW() - INTERVAL '7 days'
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
    await db.execute(sql`
      INSERT INTO admin_device_sessions (user_id, device_token)
      VALUES (${user.id}, ${deviceToken})
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
      await ensureSessionsTable();
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
  res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

export default router;
