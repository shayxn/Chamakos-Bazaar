import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/events/active", async (_req, res) => {
  const events = await db.select().from(eventsTable).where(eq(eventsTable.isActive, true));
  const now = new Date();
  const active = events.filter((e) => {
    if (e.startAt && new Date(e.startAt) > now) return false;
    if (e.endAt && new Date(e.endAt) < now) return false;
    return true;
  });
  res.json(active);
});

router.get("/events", requireAdmin, async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt));
  res.json(events);
});

router.post("/events", requireAdmin, async (req, res) => {
  const body = req.body as Partial<typeof eventsTable.$inferInsert>;
  const [evt] = await db.insert(eventsTable).values({
    name: body.name ?? "New Event",
    type: body.type ?? "custom",
    bannerText: body.bannerText ?? null,
    bannerSubtext: body.bannerSubtext ?? null,
    bannerColor: body.bannerColor ?? "#ff6600",
    discountPercent: body.discountPercent ?? null,
    startAt: body.startAt ?? null,
    endAt: body.endAt ?? null,
    config: body.config ?? null,
    isActive: body.isActive ?? false,
  }).returning();
  res.status(201).json(evt);
});

router.patch("/events/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const body = req.body as Partial<typeof eventsTable.$inferInsert>;
  const allowed: Partial<typeof eventsTable.$inferInsert> = {};
  if (body.name !== undefined) allowed.name = body.name;
  if (body.type !== undefined) allowed.type = body.type;
  if (body.bannerText !== undefined) allowed.bannerText = body.bannerText;
  if (body.bannerSubtext !== undefined) allowed.bannerSubtext = body.bannerSubtext;
  if (body.bannerColor !== undefined) allowed.bannerColor = body.bannerColor;
  if (body.discountPercent !== undefined) allowed.discountPercent = body.discountPercent;
  if (body.startAt !== undefined) allowed.startAt = body.startAt;
  if (body.endAt !== undefined) allowed.endAt = body.endAt;
  if (body.config !== undefined) allowed.config = body.config;
  if (body.isActive !== undefined) allowed.isActive = body.isActive;
  const [evt] = await db.update(eventsTable).set(allowed).where(eq(eventsTable.id, id)).returning();
  if (!evt) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(evt);
});

router.delete("/events/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.json({ ok: true });
});

export default router;
