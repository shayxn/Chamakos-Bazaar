import { Router } from "express";
import { db,productsTable } from "@workspace/db";
import { sql,eq,and,or,isNull } from "drizzle-orm";
import { ensureManagement,rows } from "../lib/management-db";
const router=Router();
const escape=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
router.get("/robots.txt",(req,res)=>{
  const host=req.get("x-forwarded-host")?.split(",")[0]?.trim()||req.get("host");
  const origin=process.env.PUBLIC_SITE_URL||`${req.get("x-forwarded-proto")?.split(",")[0]||req.protocol}://${host}`;
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nDisallow: /receipt\nDisallow: /order/\nSitemap: ${origin.replace(/\/$/,"")}/sitemap.xml\n`);
});
router.get("/sitemap.xml",async(req,res)=>{
  await ensureManagement();
  const host=req.get("x-forwarded-host")?.split(",")[0]?.trim()||req.get("host");
  const origin=process.env.PUBLIC_SITE_URL||`${req.get("x-forwarded-proto")?.split(",")[0]||req.protocol}://${host}`;
  const paths=["/","/shop","/news","/about","/support","/terms"];
  const products=await db.select({id:productsTable.id}).from(productsTable).where(and(eq(productsTable.hidden,false),isNull(productsTable.collection),
    or(isNull(productsTable.publishAt),sql`${productsTable.publishAt}<=NOW()`),or(isNull(productsTable.unpublishAt),sql`${productsTable.unpublishAt}>NOW()`)));
  const docs=rows(await db.execute(sql`SELECT kind,slug FROM imaginate_documents WHERE kind IN ('news','pages') AND status='published'
    AND (publish_at IS NULL OR publish_at<=NOW()) AND (unpublish_at IS NULL OR unpublish_at>NOW())`));
  paths.push(...products.map(p=>`/product/${p.id}`),...docs.map(d=>`${d.kind==="news"?"/news":""}/${encodeURIComponent(d.slug)}`));
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${escape(origin.replace(/\/$/,"")+path)}</loc></url>`).join("")}</urlset>`);
});
export default router;
