import { Router } from "express";
import { db, widgets as widgetsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

// ─── Public: fetch published widgets for a placement ─────────────────────────
router.get("/widgets/published", async (req, res) => {
  const placement = (req.query.placement as string) || "home";
  const rows = await db
    .select()
    .from(widgetsTable)
    .where(eq(widgetsTable.isPublished, true))
    .orderBy(asc(widgetsTable.displayOrder));
  const filtered = rows.filter((w) => w.placement === placement);
  res.json(filtered);
});

// ─── Admin: get all widgets ───────────────────────────────────────────────────
router.get("/widgets", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(widgetsTable).orderBy(asc(widgetsTable.displayOrder));
  res.json(rows);
});

// ─── Admin: create widget ─────────────────────────────────────────────────────
router.post("/widgets", requireAdmin, async (req, res) => {
  const body = req.body;
  const [maxRow] = await db
    .select({ maxOrder: widgetsTable.displayOrder })
    .from(widgetsTable)
    .orderBy(widgetsTable.displayOrder);
  const nextOrder = maxRow ? (maxRow.maxOrder ?? 0) + 10 : 0;

  const [created] = await db
    .insert(widgetsTable)
    .values({
      type: body.type || "custom",
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      imageUrl: body.imageUrl ?? null,
      icon: body.icon ?? null,
      buttonLabel: body.buttonLabel ?? null,
      buttonUrl: body.buttonUrl ?? null,
      placement: body.placement || "home",
      displayOrder: nextOrder,
      isPublished: body.isPublished ?? false,
      targeting: body.targeting || "everyone",
      background: body.background ?? null,
      accent: body.accent ?? null,
      glassAmount: body.glassAmount ?? null,
      layout: body.layout ?? null,
      size: body.size ?? null,
      borderRadius: body.borderRadius ?? null,
      animation: body.animation ?? null,
      config: body.config ?? null,
    })
    .returning();
  res.status(201).json(created);
});

// ─── Admin: update widget ─────────────────────────────────────────────────────
router.put("/widgets/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body;
  const [updated] = await db
    .update(widgetsTable)
    .set({
      type: body.type,
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      imageUrl: body.imageUrl ?? null,
      icon: body.icon ?? null,
      buttonLabel: body.buttonLabel ?? null,
      buttonUrl: body.buttonUrl ?? null,
      placement: body.placement,
      isPublished: body.isPublished,
      targeting: body.targeting,
      background: body.background ?? null,
      accent: body.accent ?? null,
      glassAmount: body.glassAmount ?? null,
      layout: body.layout ?? null,
      size: body.size ?? null,
      borderRadius: body.borderRadius !== undefined ? body.borderRadius : null,
      animation: body.animation ?? null,
      config: body.config ?? null,
    })
    .where(eq(widgetsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── Admin: toggle publish ────────────────────────────────────────────────────
router.patch("/widgets/:id/publish", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isPublished } = req.body;
  const [updated] = await db
    .update(widgetsTable)
    .set({ isPublished: Boolean(isPublished) })
    .where(eq(widgetsTable.id, id))
    .returning();
  res.json(updated);
});

// ─── Admin: reorder widgets ───────────────────────────────────────────────────
router.patch("/widgets/reorder", requireAdmin, async (req, res) => {
  const items: { id: number; displayOrder: number }[] = req.body;
  if (!Array.isArray(items)) { res.status(400).json({ error: "Array expected" }); return; }
  await Promise.all(
    items.map(({ id, displayOrder }) =>
      db.update(widgetsTable).set({ displayOrder }).where(eq(widgetsTable.id, id))
    )
  );
  res.json({ ok: true });
});

// ─── Admin: delete widget ─────────────────────────────────────────────────────
router.delete("/widgets/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(widgetsTable).where(eq(widgetsTable.id, id));
  res.json({ ok: true });
});

export default router;
