import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../lib/auth-middleware";
import { requireOwner } from "../lib/admin-permissions";
import { ensureManagement, rows, documentPayload } from "../lib/management-db";
import { logAdminActivity } from "./admin-activity";

const router = Router();
const kinds = ["news", "pages", "faq", "navigation", "homepage", "countries", "shipping", "launch", "media"];
const input = z.object({
  title: z.string().trim().min(1).max(240), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false), showInNavigation: z.boolean().default(false),
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  unpublishAt: z.string().datetime({ offset: true }).nullable().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

router.param("kind", (req, res, next, value) => {
  if (!kinds.includes(value)) { res.status(404).json({ error: "Unknown content type" }); return; }
  next();
});
router.get("/published/:kind", async (req, res): Promise<void> => {
  await ensureManagement();
  if (["countries", "shipping", "media"].includes(String(req.params.kind))) { res.json([]); return; }
  const result = rows(await db.execute(sql`SELECT * FROM imaginate_documents WHERE kind = ${String(req.params.kind)}
    AND status = 'published' AND (publish_at IS NULL OR publish_at <= NOW())
    AND (unpublish_at IS NULL OR unpublish_at > NOW()) ORDER BY featured DESC, created_at DESC LIMIT 200`));
  res.setHeader("Cache-Control", "no-store");
  res.json(result.map(documentPayload));
});
router.get("/published/:kind/:slug", async (req, res): Promise<void> => {
  await ensureManagement();
  if (!["news", "pages"].includes(String(req.params.kind))) { res.sendStatus(404); return; }
  const doc = rows(await db.execute(sql`SELECT * FROM imaginate_documents WHERE kind = ${String(req.params.kind)}
    AND slug = ${String(req.params.slug)} AND status = 'published'
    AND (publish_at IS NULL OR publish_at <= NOW()) AND (unpublish_at IS NULL OR unpublish_at > NOW()) LIMIT 1`))[0];
  if (!doc) { res.status(404).json({ error: "Page not found" }); return; }
  res.json(documentPayload(doc));
});
router.get("/manage/:kind", requireAdmin, async (req, res): Promise<void> => {
  await ensureManagement();
  res.json(rows(await db.execute(sql`SELECT * FROM imaginate_documents WHERE kind = ${String(req.params.kind)}
    ORDER BY updated_at DESC LIMIT 500`)).map(documentPayload));
});
router.get("/manage/:kind/:id/preview", requireAdmin, async (req, res): Promise<void> => {
  await ensureManagement();
  const doc = rows(await db.execute(sql`SELECT * FROM imaginate_documents WHERE kind = ${String(req.params.kind)} AND id = ${Number(req.params.id)}`))[0];
  if (!doc) { res.sendStatus(404); return; }
  res.json(documentPayload(doc));
});

router.use("/manage/:kind", (req, res, next) => {
  if (req.method !== "GET" && ["countries", "shipping", "launch"].includes(String(req.params.kind))) {
    void requireOwner(req, res, next);
  } else next();
});

async function save(req: import("express").Request, res: import("express").Response) {
  await ensureManagement();
  const parsed = input.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Provide a title, valid URL slug, and valid dates.", details: parsed.error.flatten() }); return; }
  const b = parsed.data;
  if (b.publishAt && b.unpublishAt && new Date(b.unpublishAt) <= new Date(b.publishAt)) {
    res.status(400).json({ error: "Unpublish must be after publish." }); return;
  }
  const kind = String(req.params.kind);
  if (kind === "pages" && !["collection", "our-story"].includes(String(b.data.template))) {
    res.status(400).json({ error: "Choose Collection or Our Story." }); return;
  }
  if(kind==="launch"&&b.data.enabled!==false&&b.data.deadline&&(!/(?:Z|[+-]\d{2}:\d{2})$/.test(String(b.data.deadline))||!Number.isFinite(Date.parse(String(b.data.deadline))))){
    res.status(400).json({error:"Launch deadline requires a valid date and an explicit timezone."});return;
  }
  if(kind==="launch"&&b.data.enabled!==false){
    const start=b.data.startsAt?Date.parse(String(b.data.startsAt)):Date.now();
    if(!b.data.deadline||!Number.isFinite(start)||!/(?:Z|[+-]\d{2}:\d{2})$/.test(String(b.data.startsAt??new Date().toISOString()))||Date.parse(String(b.data.deadline))<=start){
      res.status(400).json({error:"Countdown requires a valid start and a later end, with explicit timezone offsets."});return;
    }
  }
  if(kind==="shipping"&&(!Number.isFinite(b.data.amount)||Number(b.data.amount)<=0)){res.status(400).json({error:"Shipping amount must be a positive AED amount."});return;}
  if (kind === "pages" && ["admin", "shop", "cart", "checkout", "account", "support", "news", "login", "maintenance", "wishlist"].includes(b.slug)) {
    res.status(400).json({ error: "This URL belongs to a built-in store page." }); return;
  }
  if (Buffer.byteLength(JSON.stringify(b.data)) > 150_000) { res.status(400).json({ error: "Content is too large. Upload media instead." }); return; }
  const validateUrls = (value: unknown, key = ""): boolean => {
    if (Array.isArray(value)) return value.every(v => validateUrls(v, key));
    if (value && typeof value === "object") return Object.entries(value).every(([k,v]) => validateUrls(v,k));
    if (typeof value === "string" && /(?:url|image|video|href|link)$/i.test(key) && value) return /^(https:\/\/|\/(?!\/))/.test(value);
    return true;
  };
  if (!validateUrls(b.data)) { res.status(400).json({ error: "Media and links must use HTTPS or a local path." }); return; }
  if (["countries", "shipping"].includes(kind) && b.status === "published" && String(b.data.countryCode ?? b.data.code ?? "").toUpperCase() !== "AE") {
    res.status(400).json({ error: "Worldwide Shipping is off. International configurations must remain drafts." }); return;
  }
  try {
    const result = await db.transaction(async tx=>{
      if(kind==="launch")await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('imaginate-launch'))`);
      const saved=req.params.id
      ? await tx.execute(sql`UPDATE imaginate_documents SET title=${b.title},slug=${b.slug},status=${b.status},
          featured=${b.featured},show_in_navigation=${b.showInNavigation},publish_at=${b.publishAt ?? null},
          unpublish_at=${b.unpublishAt ?? null},data=${JSON.stringify(b.data)}::jsonb,updated_at=NOW()
          WHERE id=${Number(req.params.id)} AND kind=${kind} RETURNING *`)
      : await tx.execute(sql`INSERT INTO imaginate_documents (kind,title,slug,status,featured,show_in_navigation,publish_at,unpublish_at,data)
          VALUES (${kind},${b.title},${b.slug},${b.status},${b.featured},${b.showInNavigation},${b.publishAt ?? null},${b.unpublishAt ?? null},${JSON.stringify(b.data)}::jsonb) RETURNING *`);
      const launch=rows(saved)[0];
      if(kind==="launch"&&launch&&b.data.enabled!==false&&b.status==="published")
        await tx.execute(sql`UPDATE imaginate_documents SET data=jsonb_set(data,'{enabled}','false'::jsonb)
          WHERE kind='launch' AND id<>${launch.id} AND COALESCE(data->>'enabled','true')='true'`);
      return saved;
    });
    const doc = rows(result)[0];
    if (!doc) { res.sendStatus(404); return; }
    await logAdminActivity(`Admin ${req.session?.userId}`, `${kind} ${req.params.id ? "updated" : "created"} (${b.status})`, `${kind}:${doc.id}`, b.title);
    res.status(req.params.id ? 200 : 201).json(documentPayload(doc));
  } catch (error: any) {
    if (error?.code === "23505" || error?.cause?.code === "23505") { res.status(409).json({ error: "This URL is already used." }); return; }
    throw error;
  }
}
router.post("/manage/:kind", requireAdmin, save);
router.patch("/manage/:kind/:id", requireAdmin, save);
router.delete("/manage/:kind/:id", requireAdmin, async (req, res): Promise<void> => {
  if(req.query.permanent==="true"){
    await ensureManagement();
    const deleted=rows(await db.execute(sql`DELETE FROM imaginate_documents WHERE kind=${String(req.params.kind)} AND id=${Number(req.params.id)} RETURNING id`));
    if(!deleted.length){res.sendStatus(404);return;}res.json({ok:true});return;
  }
  await ensureManagement();
  await db.execute(sql`UPDATE imaginate_documents SET status='archived',updated_at=NOW() WHERE kind=${String(req.params.kind)} AND id=${Number(req.params.id)}`);
  await logAdminActivity(`Admin ${req.session?.userId}`, `${String(req.params.kind)} archived`, String(req.params.id));
  res.json({ ok: true });
});
export default router;
