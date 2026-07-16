import { Router } from "express";
import { db, visitorSessionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as any).rows)) {
    return (result as any).rows as T[];
  }
  return [];
}

const router = Router();

router.post("/visitor-sessions/track", async (req, res) => {
  const {
    sessionId, deviceType, deviceOs, browser,
    screenWidth, screenHeight, referrer, entryPage,
    events, durationSeconds,
  } = req.body as Record<string, any>;

  if (!sessionId) { res.json({ ok: false }); return; }

  const existing = await db.select({ id: visitorSessionsTable.id })
    .from(visitorSessionsTable)
    .where(eq(visitorSessionsTable.sessionId, sessionId));

  if (existing.length > 0) {
    await db.update(visitorSessionsTable).set({
      events: events ?? undefined,
      durationSeconds: durationSeconds ?? undefined,
      lastSeenAt: new Date(),
    }).where(eq(visitorSessionsTable.id, existing[0].id));
  } else {
    await db.insert(visitorSessionsTable).values({
      sessionId,
      deviceType: deviceType ?? null,
      deviceOs: deviceOs ?? null,
      browser: browser ?? null,
      screenWidth: screenWidth ?? null,
      screenHeight: screenHeight ?? null,
      referrer: referrer ?? null,
      entryPage: entryPage ?? null,
      events: events ?? null,
      durationSeconds: durationSeconds ?? null,
    });
  }
  res.json({ ok: true });
});

router.get("/visitor-sessions", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 200);
  const rows = await db.select()
    .from(visitorSessionsTable)
    .orderBy(desc(visitorSessionsTable.lastSeenAt))
    .limit(limit);

  const stats = await db.execute<{ total: string; today: string; mobile: string }>(
    sql`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::text AS today,
      COUNT(*) FILTER (WHERE device_type = 'mobile')::text AS mobile
    FROM visitor_sessions`
  );

  const s = extractRows<{ total: string; today: string; mobile: string }>(stats)[0] ?? { total: "0", today: "0", mobile: "0" };
  res.json({ sessions: rows, stats: { total: Number(s.total), today: Number(s.today), mobile: Number(s.mobile) } });
});

router.delete("/visitor-sessions/:id", requireAdmin, async (req, res) => {
  await db.delete(visitorSessionsTable).where(eq(visitorSessionsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
