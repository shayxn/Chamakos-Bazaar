import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

// Public: get currently active events (respects start/end dates)
router.get("/events/active", async (_req, res) => {
  const events = await db.select().from(eventsTable)
    .where(eq(eventsTable.isActive, true))
    .orderBy(asc(eventsTable.priority), desc(eventsTable.createdAt));
  const now = new Date();
  const active = events.filter((e) => {
    if (e.startAt && new Date(e.startAt) > now) return false;
    if (e.endAt && new Date(e.endAt) < now) return false;
    return true;
  });
  res.json(active);
});

// Admin: list all events
router.get("/events", requireAdmin, async (_req, res) => {
  const events = await db.select().from(eventsTable)
    .orderBy(asc(eventsTable.priority), desc(eventsTable.createdAt));
  res.json(events);
});

// Admin: create event
router.post("/events", requireAdmin, async (req, res) => {
  const body = req.body as Partial<typeof eventsTable.$inferInsert>;
  const [evt] = await db.insert(eventsTable).values({
    name: body.name ?? "New Event",
    type: body.type ?? "custom",
    bannerText: body.bannerText ?? null,
    bannerSubtext: body.bannerSubtext ?? null,
    bannerColor: body.bannerColor ?? "#ff6600",
    textColor: body.textColor ?? "#ffffff",
    accentColor: body.accentColor ?? "#ffffff",
    logoUrl: body.logoUrl ?? null,
    backgroundImageUrl: body.backgroundImageUrl ?? null,
    badgeText: body.badgeText ?? null,
    countdownEnabled: body.countdownEnabled ?? false,
    startAt: body.startAt ?? null,
    endAt: body.endAt ?? null,
    homepageEnabled: body.homepageEnabled ?? false,
    homepageTitle: body.homepageTitle ?? null,
    homepageSubtitle: body.homepageSubtitle ?? null,
    ctaText: body.ctaText ?? null,
    ctaUrl: body.ctaUrl ?? null,
    popupEnabled: body.popupEnabled ?? false,
    popupText: body.popupText ?? null,
    popupImageUrl: body.popupImageUrl ?? null,
    discountPercent: body.discountPercent ?? null,
    priority: body.priority ?? 0,
    config: body.config ?? null,
    isActive: body.isActive ?? false,
  }).returning();
  res.status(201).json(evt);
});

// Admin: update event
router.patch("/events/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const body = req.body as Partial<typeof eventsTable.$inferInsert>;
  const allowed: Partial<typeof eventsTable.$inferInsert> = {};
  const fields = [
    "name","type","bannerText","bannerSubtext","bannerColor","textColor","accentColor",
    "logoUrl","backgroundImageUrl","badgeText","countdownEnabled",
    "startAt","endAt","homepageEnabled","homepageTitle","homepageSubtitle",
    "ctaText","ctaUrl","popupEnabled","popupText","popupImageUrl",
    "discountPercent","priority","config","isActive",
  ] as const;
  for (const f of fields) {
    if (body[f] !== undefined) (allowed as Record<string, unknown>)[f] = body[f];
  }
  const [evt] = await db.update(eventsTable).set(allowed).where(eq(eventsTable.id, id)).returning();
  if (!evt) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(evt);
});

// Admin: duplicate event
router.post("/events/:id/duplicate", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [original] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!original) { res.status(404).json({ error: "Event not found" }); return; }
  const { id: _id, createdAt: _c, ...rest } = original;
  const [copy] = await db.insert(eventsTable).values({
    ...rest,
    name: `${rest.name} (Copy)`,
    isActive: false,
  }).returning();
  res.status(201).json(copy);
});

// Admin: delete event
router.delete("/events/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.json({ ok: true });
});

export default router;
