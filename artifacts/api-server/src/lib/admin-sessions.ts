import type { Request } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensurePromise: Promise<void> | null = null;

export function ensureAdminSessionsTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_device_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        device_token TEXT UNIQUE NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );
      ALTER TABLE admin_device_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
      ALTER TABLE admin_device_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
      ALTER TABLE admin_device_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS admin_device_sessions_user_idx
        ON admin_device_sessions (user_id, last_seen_at DESC);
    `).then(() => undefined);
  }
  return ensurePromise;
}

export async function getAdminDeviceToken(req: Request): Promise<string | null> {
  const token = (req.session as Record<string, unknown> | null)?.deviceToken;
  if (typeof token !== "string" || !token) return null;
  await ensureAdminSessionsTable();
  const result = await db.execute<{ id: number; user_id: number; revoked_at: string | null }>(
    sql`SELECT id, user_id, revoked_at FROM admin_device_sessions WHERE device_token = ${token} LIMIT 1`,
  );
  const rows: Array<{ id: number; user_id: number; revoked_at: string | null }> = Array.isArray(result)
    ? result
    : ((result as unknown as { rows?: Array<{ id: number; user_id: number; revoked_at: string | null }> }).rows ?? []);
  return rows[0]?.revoked_at ? null : token;
}

export async function touchAdminSession(req: Request, userId: number): Promise<boolean> {
  const token = await getAdminDeviceToken(req);
  if (!token) return false;
  await db.execute(sql`
    UPDATE admin_device_sessions
    SET last_seen_at = NOW()
    WHERE device_token = ${token} AND user_id = ${userId} AND revoked_at IS NULL
  `);
  return true;
}

export function getRequestDeviceDetails(req: Request) {
  return {
    userAgent: String(req.get("user-agent") ?? "").slice(0, 500) || null,
    ipAddress: String(req.ip ?? "").slice(0, 100) || null,
  };
}