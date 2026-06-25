import { Router } from "express";
import { db, tiktokVideosTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

function serializeVideo(v: typeof tiktokVideosTable.$inferSelect) {
  return { ...v, createdAt: v.createdAt.toISOString() };
}

router.get("/tiktok", async (_req, res) => {
  const videos = await db
    .select()
    .from(tiktokVideosTable)
    .where(eq(tiktokVideosTable.isVisible, true))
    .orderBy(asc(tiktokVideosTable.displayOrder), asc(tiktokVideosTable.createdAt));
  res.json(videos.map(serializeVideo));
});

router.get("/tiktok/all", requireAdmin, async (_req, res) => {
  const videos = await db
    .select()
    .from(tiktokVideosTable)
    .orderBy(asc(tiktokVideosTable.displayOrder), asc(tiktokVideosTable.createdAt));
  res.json(videos.map(serializeVideo));
});

router.post("/tiktok", requireAdmin, async (req, res) => {
  const body = req.body as {
    embedUrl: string;
    title?: string;
    thumbnailUrl?: string;
    displayOrder?: number;
    isVisible?: boolean;
  };
  if (!body.embedUrl) {
    res.status(400).json({ error: "embedUrl required" });
    return;
  }
  const [video] = await db
    .insert(tiktokVideosTable)
    .values({
      embedUrl: body.embedUrl,
      title: body.title ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      displayOrder: body.displayOrder ?? 0,
      isVisible: body.isVisible !== undefined ? body.isVisible : true,
    })
    .returning();
  res.status(201).json(serializeVideo(video));
});

router.patch("/tiktok/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [video] = await db.update(tiktokVideosTable).set(req.body).where(eq(tiktokVideosTable.id, id)).returning();
  if (!video) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeVideo(video));
});

router.delete("/tiktok/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(tiktokVideosTable).where(eq(tiktokVideosTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
