import { Router } from "express";
import { db, refundRequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/refund-requests", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(refundRequestsTable).orderBy(desc(refundRequestsTable.createdAt));
  res.json(rows.map(r => ({ ...r, refundAmount: r.refundAmount ? Number(r.refundAmount) : null })));
});

router.post("/refund-requests", async (req, res) => {
  const { orderNumber, customerName, customerEmail, customerPhone, reason, description } = req.body as Record<string, string>;
  if (!orderNumber || !customerName || !customerEmail || !reason) {
    res.status(400).json({ error: "Order number, name, email, and reason are required" });
    return;
  }
  const [row] = await db.insert(refundRequestsTable).values({
    orderNumber, customerName, customerEmail,
    customerPhone: customerPhone || null,
    reason, description: description || null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/refund-requests/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status, adminNote, refundAmount } = req.body as { status?: string; adminNote?: string; refundAmount?: number };
  const [row] = await db.update(refundRequestsTable)
    .set({
      status: status ?? undefined,
      adminNote: adminNote ?? undefined,
      refundAmount: refundAmount != null ? String(refundAmount) : undefined,
    })
    .where(eq(refundRequestsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, refundAmount: row.refundAmount ? Number(row.refundAmount) : null });
});

router.delete("/refund-requests/:id", requireAdmin, async (req, res) => {
  await db.delete(refundRequestsTable).where(eq(refundRequestsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
