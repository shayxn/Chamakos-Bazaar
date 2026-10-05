import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { rows } from "../lib/management-db";
const router=Router();
let schema:Promise<void>|undefined;
function ensure(){
  if(!schema)schema=(async()=>{
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_traffic_sessions (
      id TEXT PRIMARY KEY,visitor_id TEXT NOT NULL,device_type TEXT,current_page TEXT NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_view_at TIMESTAMPTZ)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_traffic_views (
      id BIGSERIAL PRIMARY KEY,session_id TEXT NOT NULL,visitor_id TEXT NOT NULL,page TEXT NOT NULL,viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS imaginate_traffic_view_dates ON imaginate_traffic_views(viewed_at,visitor_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS imaginate_traffic_online ON imaginate_traffic_sessions(last_seen_at)`);
  })().catch(e=>{schema=undefined;throw e;});return schema;
}
const input=z.object({visitorId:z.string().uuid(),page:z.string().startsWith("/").max(500),
  deviceType:z.enum(["desktop","mobile","tablet"]).optional(),pageChanged:z.boolean().optional()});
router.post("/traffic/track",async(req,res)=>{
  const parsed=input.safeParse(req.body);if(!parsed.success){res.status(400).json({error:"Invalid anonymous traffic event."});return;}
  const b=parsed.data;
  if(req.session?.userId||/^\/(?:admin|login)(?:\/|$)/.test(b.page)||/bot|crawler|spider/i.test(req.get("user-agent")??"")){
    res.json({ok:true});return;
  }
  await ensure();
  req.session!.trafficVisitorId??=b.visitorId;
  req.session!.trafficSessionId??=randomUUID();
  const visitor=String(req.session!.trafficVisitorId),sid=String(req.session!.trafficSessionId);
  const page=b.page.split(/[?#]/)[0].replace(/^\/(?:order|receipt)\/[^/]+/, "/order/:id");
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${sid}))`);
    const prior=rows(await tx.execute(sql`SELECT current_page,last_view_at FROM imaginate_traffic_sessions WHERE id=${sid}`))[0];
    const view=!prior||prior.current_page!==page||(b.pageChanged===true&&Date.now()-new Date(prior.last_view_at??0).getTime()>1000);
    await tx.execute(sql`INSERT INTO imaginate_traffic_sessions(id,visitor_id,device_type,current_page,last_view_at)
      VALUES(${sid},${visitor},${b.deviceType??null},${page},NOW())
      ON CONFLICT(id) DO UPDATE SET last_seen_at=NOW(),current_page=EXCLUDED.current_page,
      device_type=COALESCE(EXCLUDED.device_type,imaginate_traffic_sessions.device_type),
      last_view_at=CASE WHEN ${view} THEN NOW() ELSE imaginate_traffic_sessions.last_view_at END`);
    if(view)await tx.execute(sql`INSERT INTO imaginate_traffic_views(session_id,visitor_id,page) VALUES(${sid},${visitor},${page})`);
  });
  res.json({ok:true});
});
router.get("/admin/live-traffic",requireAdmin,async(_req,res)=>{
  await ensure();
  const s=rows(await db.execute(sql`WITH bounds AS (
    SELECT date_trunc('day',NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai' AS day,
    date_trunc('week',NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai' AS week,
    date_trunc('month',NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai' AS month)
    SELECT COUNT(*)::int AS views,COUNT(DISTINCT visitor_id)::int AS visitors,
    COUNT(DISTINCT visitor_id) FILTER(WHERE viewed_at>=b.day)::int AS today,
    COUNT(DISTINCT visitor_id) FILTER(WHERE viewed_at>=b.week)::int AS week,
    COUNT(DISTINCT visitor_id) FILTER(WHERE viewed_at>=b.month)::int AS month,
    COUNT(DISTINCT visitor_id) FILTER(WHERE viewed_at>=b.month-INTERVAL '1 month' AND viewed_at<b.month)::int AS previous
    FROM imaginate_traffic_views CROSS JOIN bounds b`))[0];
  const active=rows(await db.execute(sql`SELECT DISTINCT ON(visitor_id) RIGHT(id,8) AS "sessionId",current_page AS page,
    device_type AS "deviceType",last_seen_at AS "lastSeenAt" FROM imaginate_traffic_sessions
    WHERE last_seen_at>NOW()-INTERVAL '90 seconds' ORDER BY visitor_id,last_seen_at DESC LIMIT 500`));
  const online=rows(await db.execute(sql`SELECT COUNT(DISTINCT visitor_id)::int AS n FROM imaginate_traffic_sessions WHERE last_seen_at>NOW()-INTERVAL '90 seconds'`))[0];
  const monthly=rows(await db.execute(sql`SELECT to_char(month,'YYYY-MM') AS month,COUNT(v.id)::int AS "pageViews",
    COUNT(DISTINCT v.visitor_id)::int AS visitors FROM generate_series(
      date_trunc('month',NOW() AT TIME ZONE 'Asia/Dubai')-INTERVAL '11 months',
      date_trunc('month',NOW() AT TIME ZONE 'Asia/Dubai'),INTERVAL '1 month') month
    LEFT JOIN imaginate_traffic_views v ON v.viewed_at>=month AT TIME ZONE 'Asia/Dubai'
      AND v.viewed_at<(month+INTERVAL '1 month') AT TIME ZONE 'Asia/Dubai' GROUP BY month ORDER BY month`));
  const topPages=rows(await db.execute(sql`SELECT page AS path,COUNT(*)::int AS views FROM imaginate_traffic_views GROUP BY page ORDER BY views DESC LIMIT 20`));
  const topProducts=rows(await db.execute(sql`SELECT p.id,p.name,COUNT(*)::int AS views FROM imaginate_traffic_views v
    JOIN products p ON v.page='/product/'||p.id::text GROUP BY p.id,p.name ORDER BY views DESC LIMIT 10`));
  const classification=rows(await db.execute(sql`WITH first_visits AS(SELECT visitor_id,MIN(viewed_at) AS first FROM imaginate_traffic_views GROUP BY visitor_id),
    today AS(SELECT DISTINCT visitor_id FROM imaginate_traffic_views WHERE viewed_at >= date_trunc('day',NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai')
    SELECT COUNT(*) FILTER(WHERE f.first>=date_trunc('day',NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai')::int AS new,
    COUNT(*) FILTER(WHERE f.first<date_trunc('day',NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai')::int AS returning
    FROM today t JOIN first_visits f USING(visitor_id)`))[0];
  res.set("Cache-Control","no-store").json({onlineVisitors:Number(online?.n??0),activeVisitors:active,
    todayVisitors:Number(s?.today??0),weekVisitors:Number(s?.week??0),monthVisitors:Number(s?.month??0),
    previousMonthVisitors:Number(s?.previous??0),totalPageViews:Number(s?.views??0),uniqueVisitors:Number(s?.visitors??0),
    newVisitors:Number(classification?.new??0),returningVisitors:Number(classification?.returning??0),
    monthly,topPages,topProducts,countryBreakdown:[],countryAvailable:false,timezone:"Asia/Dubai",serverTime:new Date().toISOString()});
});
export default router;
