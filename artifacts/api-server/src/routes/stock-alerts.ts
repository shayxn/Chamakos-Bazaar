import { Router } from "express";
import { db, stockAlertsTable, productsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.post("/stock-alerts", async (req, res) => {
  const { productId, phone, name } = req.body as { productId: number; phone: string; name?: string };
  if (!productId || !phone) { res.status(400).json({ error: "productId and phone required" }); return; }
  const [alert] = await db.insert(stockAlertsTable).values({ productId, phone: phone.trim(), name: name?.trim() ?? null }).returning();
  res.status(201).json(alert);
});

router.get("/stock-alerts", requireAdmin, async (_req, res) => {
  const alerts = await db.select({
    id: stockAlertsTable.id,
    productId: stockAlertsTable.productId,
    phone: stockAlertsTable.phone,
    name: stockAlertsTable.name,
    notified: stockAlertsTable.notified,
    createdAt: stockAlertsTable.createdAt,
    productName: productsTable.name,
  }).from(stockAlertsTable)
    .leftJoin(productsTable, eq(stockAlertsTable.productId, productsTable.id))
    .orderBy(desc(stockAlertsTable.createdAt));
  res.json(alerts);
});

router.patch("/stock-alerts/:id/notified", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [alert] = await db.update(stockAlertsTable).set({ notified: true }).where(eq(stockAlertsTable.id, id)).returning();
  res.json(alert);
});

router.delete("/stock-alerts/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.delete(stockAlertsTable).where(eq(stockAlertsTable.id, id));
  res.json({ ok: true });
});

export default router;
