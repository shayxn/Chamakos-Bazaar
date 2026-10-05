import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { documentPayload, ensureManagement, rows } from "../lib/management-db";
const router=Router();
router.get("/launch-state",async(_req,res)=>{
  await ensureManagement();
  const launch=rows(await db.execute(sql`SELECT * FROM imaginate_documents WHERE kind='launch' AND status='published'
    AND (publish_at IS NULL OR publish_at<=NOW()) AND (unpublish_at IS NULL OR unpublish_at>NOW())
    AND COALESCE(data->>'enabled','true')='true' ORDER BY updated_at DESC LIMIT 1`))[0];
  const count=rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM products WHERE is_pre_order=TRUE AND hidden=FALSE
    AND coming_soon=FALSE AND (collection IS NULL OR collection='basics')
    AND (publish_at IS NULL OR publish_at<=NOW()) AND (unpublish_at IS NULL OR unpublish_at>NOW())`))[0];
  const doc=launch?documentPayload(launch):null;
  if(doc)doc.data={...doc.data,enabled:doc.data.enabled!==false,
    startsAt:doc.data.startsAt||new Date(doc.publishAt||doc.createdAt).toISOString()};
  res.set("Cache-Control","no-store").json({serverTime:new Date().toISOString(),timezone:"Asia/Dubai",
    launch:doc,preOrderCount:Number(count?.n??0)});
});
export default router;
