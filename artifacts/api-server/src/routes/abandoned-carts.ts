import { Router } from "express";
import { db, abandonedCartsTable, cartItemsTable } from "@workspace/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/abandoned-carts", requireAdmin, async (_req, res) => {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const rows = await db.select()
    .from(abandonedCartsTable)
    .where(and(
      eq(abandonedCartsTable.recovered, false),
    ))
    .orderBy(desc(abandonedCartsTable.updatedAt));

  const activeSessions = await db.execute<{ session_id: string; count: string; total: string }>(
    sql`SELECT session_id, COUNT(*)::text as count, SUM(quantity)::text as total
        FROM cart_items GROUP BY session_id`
  );

  const sessionSet = new Set(
    (activeSessions as unknown as { session_id: string }[]).map(s => s.session_id)
  );

  const result = rows.map(r => ({
    ...r,
    totalValue: r.totalValue ? Number(r.totalValue) : null,
    itemCount: r.itemCount ? Number(r.itemCount) : 0,
    hasActiveCart: sessionSet.has(r.sessionId),
  }));

  const stats = {
    total: result.length,
    withEmail: result.filter(r => r.customerEmail).length,
    totalValue: result.reduce((s, r) => s + (r.totalValue ?? 0), 0),
  };

  res.json({ carts: result, stats });
});

router.post("/abandoned-carts/track", async (req, res) => {
  const session = (req as any).session;
  const sessionId = session?.cartId;
  if (!sessionId) { res.json({ ok: false }); return; }

  const { customerName, customerPhone, customerEmail, cartData, totalValue, itemCount } = req.body as {
    customerName?: string; customerPhone?: string; customerEmail?: string;
    cartData?: string; totalValue?: number; itemCount?: number;
  };

  const existing = await db.select({ id: abandonedCartsTable.id })
    .from(abandonedCartsTable).where(eq(abandonedCartsTable.sessionId, sessionId));

  if (existing.length > 0) {
    await db.update(abandonedCartsTable).set({
      customerName: customerName ?? undefined,
      customerPhone: customerPhone ?? undefined,
      customerEmail: customerEmail ?? undefined,
      cartData: cartData ?? undefined,
      totalValue: totalValue != null ? String(totalValue) : undefined,
      itemCount: itemCount != null ? String(itemCount) : undefined,
      updatedAt: new Date(),
    }).where(eq(abandonedCartsTable.id, existing[0].id));
  } else {
    await db.insert(abandonedCartsTable).values({
      sessionId,
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
      cartData: cartData ?? null,
      totalValue: totalValue != null ? String(totalValue) : null,
      itemCount: itemCount != null ? String(itemCount) : "0",
    });
  }
  res.json({ ok: true });
});

router.post("/abandoned-carts/:id/recover", requireAdmin, async (req, res) => {
  await db.update(abandonedCartsTable).set({
    recovered: true, recoveredAt: new Date(),
  }).where(eq(abandonedCartsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.delete("/abandoned-carts/:id", requireAdmin, async (req, res) => {
  await db.delete(abandonedCartsTable).where(eq(abandonedCartsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
