import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rows } from "../src/lib/management-db";
import { defaultGlobalConfig } from "../src/lib/global-store";
import { storeMediaSignedUrl } from "../src/lib/chat-media-storage";

async function cleanup() {
  const f = JSON.parse(await fs.readFile("/tmp/imaginate-glass-fixture.json","utf8"));
  const t = JSON.parse(await fs.readFile("/tmp/imaginate-glass-test-results.json","utf8"));
  assert.match(f.tag,/^qa-glass-[a-f0-9]{8}$/);
  const owner = f.actors.find((a:any)=>a.role==="owner");
  assert(owner?.cookie && owner.username.startsWith(f.tag));
  assert(process.env.REPLIT_DEV_DOMAIN);
  const base = `https://${process.env.REPLIT_DEV_DOMAIN}/api`;
  const ids = f.actors.map((a:any)=>a.id);
  const boundIds = sql.join(ids.map((id:number)=>sql`${String(id)}`),sql`,`);
  const request = async (path:string, method="GET",body?:unknown) => {
    const r = await fetch(base+path,{method,headers:{"Cookie":owner.cookie,"Content-Type":"application/json"},
      ...(body ? {body:JSON.stringify(body)} : {})});
    assert(r.ok,`Cleanup request ${method} ${path} returned ${r.status}`);
    return r.json();
  };
  const current = await request("/admin/global-store");
  const lastRevision = Math.max(...t.revisions.map((r:any)=>r.revision));
  assert.equal(current.config.revision,lastRevision,"A non-test settings change exists; do not overwrite it.");
  const orders = rows(await db.execute(sql`SELECT id FROM orders WHERE customer_name LIKE ${f.tag+"%"}`));
  assert(orders.length<=1,"Only the single approved test purchase may be removed.");
  for(const o of orders) {
    assert.equal(o.id,t.codOrder?.id);
    await request(`/orders/${o.id}`,"DELETE");
  }
  const docs = rows(await db.execute(sql`SELECT id,kind,data FROM imaginate_documents WHERE title LIKE ${f.tag+"%"}`));
  const media = new Set<string>();
  for(const d of docs) {
    for(const match of JSON.stringify(d.data).matchAll(/\/api\/uploads\/([a-f0-9]{24}\.(?:jpg|png|webp|gif|mp4|webm|mov))/g))
      media.add(match[1]);
    await request(`/manage/${encodeURIComponent(d.kind)}/${d.id}?permanent=true`,"DELETE");
  }
  for(const filename of media) {
    const owned = rows(await db.execute(sql`SELECT filename FROM imaginate_store_media
      WHERE filename=${filename} AND uploader_id::text IN (${boundIds})`));
    if(!owned.length)continue;
    const needle = `%${filename}%`;
    const referenced = rows(await db.execute(sql`SELECT
      EXISTS(SELECT 1 FROM imaginate_documents d WHERE to_jsonb(d)::text LIKE ${needle}) OR
      EXISTS(SELECT 1 FROM products p WHERE to_jsonb(p)::text LIKE ${needle}) OR
      EXISTS(SELECT 1 FROM categories c WHERE to_jsonb(c)::text LIKE ${needle}) OR
      EXISTS(SELECT 1 FROM site_settings s WHERE s.value LIKE ${needle}) AS used`))[0]?.used;
    if(referenced){console.log("Kept a QA upload now referenced by non-test content.");continue;}
    const deleted = await fetch(await storeMediaSignedUrl(filename,"DELETE"),{method:"DELETE"});
    assert(deleted.ok||deleted.status===404,"QA upload cleanup failed; source assets remain untouched.");
    await db.execute(sql`DELETE FROM imaginate_store_media WHERE filename=${filename} AND uploader_id::text IN (${boundIds})`);
  }
  const original = f.originalGlobal ? JSON.parse(f.originalGlobal) : defaultGlobalConfig();
  const restored = await request("/admin/global-store","PUT",{...original,revision:current.config.revision});
  assert.equal(restored.config.enabled,original.enabled);
  // Provide real brand editorial content only when this new panel has no owner-authored records.
  await db.execute(sql`INSERT INTO imaginate_documents(kind,title,slug,status,featured,data)
    SELECT 'hero-panel',v.title,v.slug,'published',v.featured,v.data::jsonb FROM (VALUES
    ('The IMAGINATE edit','imaginate-edit',TRUE,${JSON.stringify({description:"Explore clothing and streetwear from IMAGINATE.",imageUrl:"/imaginate-icon-512.png?v=provided-logo",url:"/shop"})}),
    ('Behind the label','behind-the-label',FALSE,${JSON.stringify({description:"Get to know IMAGINATE and our story.",imageUrl:"/imaginate-icon-192.png?v=provided-logo",url:"/about"})})
    ) AS v(title,slug,featured,data)
    WHERE NOT EXISTS(SELECT 1 FROM imaginate_documents WHERE kind='hero-panel')
    ON CONFLICT(kind,slug) DO NOTHING`);
  await db.transaction(async tx=>{
    const metadata = rows(await tx.execute(sql`SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name IN ('user_id','admin_id')
      AND (table_name LIKE 'admin_%' OR table_name LIKE 'imaginate_admin_%' OR table_name='imaginate_notification_reads')`));
    for(const m of metadata)
      await tx.execute(sql`DELETE FROM ${sql.identifier(m.table_name)} WHERE ${sql.identifier(m.column_name)}::text IN (${boundIds})`);
    await tx.execute(sql`DELETE FROM admin_activity_log WHERE created_at>=${t.startedAt}::timestamptz
      AND (admin_name LIKE ${f.tag+"%"} OR admin_name IN (${sql.join(ids.map((id:number)=>sql`${"Admin "+id}`),sql`,`)}))`);
    const abandoned = rows(await tx.execute(sql`SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='abandoned_carts' AND column_name='customer_name'`));
    if(abandoned.length)await tx.execute(sql`DELETE FROM abandoned_carts WHERE customer_name LIKE ${f.tag+"%"}`);
    await tx.execute(sql`DELETE FROM users WHERE id::text IN (${boundIds}) AND username LIKE ${f.tag+"%"}`);
  });
  const stock = rows(await db.execute(sql`SELECT id,stock,variants FROM products WHERE hidden=FALSE`));
  const differences = f.originalStocks.filter((p:any)=>{
    const now = stock.find(n=>n.id===p.id);
    return !now||now.stock!==p.stock||JSON.stringify(now.variants)!==JSON.stringify(p.variants);
  }).map((p:any)=>p.id);
  console.log(JSON.stringify({testOrdersRemoved:orders.length,testCardsRemoved:docs.length,
    qaActorsRemaining:rows(await db.execute(sql`SELECT id FROM users WHERE username LIKE ${f.tag+"%"}`)).length,
    originalGlobalRestored:true,globalEnabled:restored.config.enabled,stockDifferences:differences,
    historicalOrders:rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM orders`))[0].n}));
}
cleanup().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);});
