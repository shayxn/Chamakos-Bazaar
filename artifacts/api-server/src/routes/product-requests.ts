import { Router } from "express";
import { db, productRequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/product-requests", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(productRequestsTable).orderBy(desc(productRequestsTable.createdAt));
  res.json(rows);
});

router.post("/product-requests", async (req, res) => {
  const { customerName, customerEmail, productName, description, referenceUrl } = req.body as Record<string, string>;
  const name = typeof customerName === "string" ? customerName.trim() : "";
  const email = typeof customerEmail === "string" ? customerEmail.trim() : "";
  const product = typeof productName === "string" ? productName.trim() : "";
  if (!name || !email || !product) {
    res.status(400).json({ error: "Name, email, and product name are required" });
    return;
  }
  if (name.length > 200 || email.length > 200 || product.length > 500) {
    res.status(400).json({ error: "Input too long" });
    return;
  }
  const [row] = await db.insert(productRequestsTable).values({
    customerName: name, customerEmail: email, productName: product,
    description: description?.trim() || null,
    referenceUrl: referenceUrl?.trim() || null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/product-requests/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };
  const [row] = await db.update(productRequestsTable)
    .set({ status: status ?? undefined, adminNote: adminNote ?? undefined })
    .where(eq(productRequestsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/product-requests/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(productRequestsTable).where(eq(productRequestsTable.id, id));
  res.json({ ok: true });
});

export default router;
