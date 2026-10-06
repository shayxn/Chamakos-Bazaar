import type { NextFunction, Request, Response } from "express";
import { db, siteSettingsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const OPERATIONAL_SETTING_KEYS = ["emergency_shutdown", "maintenance_mode", "store_enabled"] as const;

export type OperationalSettings = {
  emergencyShutdown: boolean;
};

export async function getOperationalSettings(): Promise<OperationalSettings> {
  const rows = await db
    .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, [...OPERATIONAL_SETTING_KEYS]));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    emergencyShutdown: values.emergency_shutdown === "true" || values.maintenance_mode === "true" || values.store_enabled === "false",
  };
}

export function invalidateOperationalSettings() {
  // Operational controls intentionally read directly from PostgreSQL so every
  // API instance observes the same emergency state immediately.
}

async function isVerifiedAdmin(req: Request) {
  const userId = (req.session as Record<string, unknown> | undefined)?.userId;
  if (typeof userId !== "number" || !Number.isInteger(userId)) return false;

  const [user] = await db
    .select({ isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.isAdmin === true;
}

/**
 * Keeps the API online for Admin recovery while rejecting customer mutations
 * during an active Emergency ShutDown. Read-only requests still support the
 * maintenance overlay and public status messaging.
 */
export async function emergencyShutdownGuard(req: Request, res: Response, next: NextFunction) {
  const isBackgroundTracking = req.method === "POST" && req.path === "/visitor-sessions/track";
  const isInvitationJoin = req.method === "POST" && ["/admin/invitations/inspect", "/admin/invitations/accept"].includes(req.path);
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path.startsWith("/auth") || isInvitationJoin || isBackgroundTracking) {
    next();
    return;
  }

  const { emergencyShutdown } = await getOperationalSettings();
  if (!emergencyShutdown || await isVerifiedAdmin(req)) {
    next();
    return;
  }

  res
    .status(503)
    .setHeader("Cache-Control", "no-store")
    .setHeader("Retry-After", "60")
    .json({
      error: "The store is temporarily unavailable. Please try again soon.",
      code: "EMERGENCY_SHUTDOWN",
    });
}