import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { initPush } from "../lib/push";
import { rows } from "../lib/management-db";
import { customerNotificationTemplates, CUSTOMER_MARKETING_CATEGORIES } from "../lib/customer-notification-templates";
import { ensureCustomerNotificationSchema, customerNotificationOwner, sendCustomerMarketing } from "../lib/customer-notification-delivery";
import { logger } from "../lib/logger";
const router = Router();
router.param("id",(_req,res,next,value)=>{
  if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))){res.status(400).json({error:"Invalid campaign ID."});return;}next();
});
const prefsInput = z.object({marketingEnabled:z.boolean(),orderUpdatesEnabled:z.boolean()});
const subscriptionInput = prefsInput.extend({consent:z.literal(true),endpoint:z.string().url().max(4096),
  keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{80,200}$/),auth:z.string().regex(/^[A-Za-z0-9_-]{16,100}$/)})});
async function preferences(req: import("express").Request) {
  await ensureCustomerNotificationSchema();
  const result = rows(await db.execute(sql`SELECT COUNT(*)::int AS n,BOOL_OR(marketing_enabled) AS marketing,
    BOOL_OR(order_updates_enabled) AS orders FROM customer_push_subscriptions WHERE owner_key=${customerNotificationOwner(req)}`))[0];
  return {subscribed:Number(result?.n)>0,marketingEnabled:result?.marketing===true,orderUpdatesEnabled:result?.orders===true};
}
router.get("/customer-notifications/preferences", async(req,res)=> {res.json(await preferences(req));});
router.patch("/customer-notifications/preferences", async(req,res)=> {
  const parsed=prefsInput.safeParse(req.body);if(!parsed.success){res.status(400).json({error:"Choose both notification preferences."});return;}
  await ensureCustomerNotificationSchema();
  await db.execute(sql`UPDATE customer_push_subscriptions SET marketing_enabled=${parsed.data.marketingEnabled},
    order_updates_enabled=${parsed.data.orderUpdatesEnabled} WHERE owner_key=${customerNotificationOwner(req)}`);
  res.json(await preferences(req));
});
export async function subscribeCustomer(req:import("express").Request,res:import("express").Response) {
  const parsed=subscriptionInput.safeParse(req.body);if(!parsed.success){res.status(400).json({error:"Explicit consent, preferences, and valid browser subscription keys are required."});return;}
  if(req.session?.userId){res.status(403).json({error:"Use Admin notifications for this signed-in Admin browser."});return;}
  const b=parsed.data,u=new URL(b.endpoint);
  if(u.protocol!=="https:"||!["fcm.googleapis.com","web.push.apple.com","updates.push.services.mozilla.com"].includes(u.hostname)&&!u.hostname.endsWith(".notify.windows.com")){
    res.status(400).json({error:"Unsupported browser push provider."});return;
  }
  try {await initPush();}catch(error){res.status(503).json({error:error instanceof Error?error.message:"Push is not configured."});return;}
  await ensureCustomerNotificationSchema();
  const admin=rows(await db.execute(sql`SELECT endpoint FROM push_subscriptions WHERE endpoint=${b.endpoint}
    UNION ALL SELECT endpoint FROM admin_push_subscriptions WHERE endpoint=${b.endpoint}`));
  if(admin.length){res.status(409).json({error:"This browser subscription is registered for Admin updates. Use a separate customer browser."});return;}
  const owner=customerNotificationOwner(req);
  await db.transaction(async tx=>{
    const old=rows(await tx.execute(sql`SELECT owner_key,p256dh,auth FROM customer_push_subscriptions WHERE endpoint=${b.endpoint} FOR UPDATE`))[0];
    if(old&&old.owner_key!==owner&&(old.p256dh!==b.keys.p256dh||old.auth!==b.keys.auth))throw new Error("Subscription ownership could not be verified.");
    if(old?.owner_key&&old.owner_key!==owner){
      for(const key of [old.owner_key,owner].sort())await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"customer-marketing:"+key}))`);
      // Preserve quota across anonymous-to-account association, rather than resetting on login.
      await tx.execute(sql`UPDATE customer_marketing_deliveries SET owner_key=${owner} WHERE owner_key=${old.owner_key}
        AND NOT EXISTS(SELECT 1 FROM customer_marketing_deliveries n WHERE n.owner_key=${owner} AND n.message_id=customer_marketing_deliveries.message_id)`);
    }
    await tx.execute(sql`INSERT INTO customer_push_subscriptions(endpoint,p256dh,auth,owner_key,customer_id,order_id,session_id,
      marketing_enabled,order_updates_enabled,consent_at) VALUES(${b.endpoint},${b.keys.p256dh},${b.keys.auth},${owner},
      ${req.session?.customerId??null},${req.session?.lastOrderId??null},${req.session?.wishlistId??null},
      ${b.marketingEnabled},${b.orderUpdatesEnabled},NOW())
      ON CONFLICT(endpoint) DO UPDATE SET owner_key=EXCLUDED.owner_key,customer_id=EXCLUDED.customer_id,
      p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,
      order_id=COALESCE(EXCLUDED.order_id,customer_push_subscriptions.order_id),session_id=COALESCE(EXCLUDED.session_id,customer_push_subscriptions.session_id),
      marketing_enabled=EXCLUDED.marketing_enabled,order_updates_enabled=EXCLUDED.order_updates_enabled,consent_at=NOW()`);
  });
  res.json(await preferences(req));
}
router.post("/customer-notifications/subscribe",subscribeCustomer);
const campaignInput=z.object({title:z.string().trim().min(1).max(100),body:z.string().trim().min(1).max(1000),
  category:z.enum(CUSTOMER_MARKETING_CATEGORIES),url:z.string().regex(/^\/(?!\/|admin(?:\/|$)|login(?:\/|$))/).max(500),
  status:z.enum(["draft","scheduled"]),dueAt:z.string().datetime({offset:true}).nullable().optional()});
function payload(c:any){return {id:c.id,title:c.title,body:c.body,category:c.category,url:c.url,status:c.status,
  dueAt:c.due_at,accepted:c.accepted,failed:c.failed,skipped:c.skipped,error:c.error};}
router.get("/admin/customer-notifications",requireAdmin,async(_req,res)=>{
  await ensureCustomerNotificationSchema();let configured=true,configurationError:string|undefined;
  try{await initPush();}catch(error){configured=false;configurationError=error instanceof Error?error.message:"Push is not configured.";}
  res.json({campaigns:rows(await db.execute(sql`SELECT * FROM customer_notification_campaigns ORDER BY id DESC LIMIT 200`)).map(payload),
    templateCount:customerNotificationTemplates.length,marketingWeeklyLimit:5,configured,configurationError});
});
router.get("/admin/customer-notifications/templates",requireAdmin,(_req,res)=>{res.json(customerNotificationTemplates);});
async function saveCampaign(req:import("express").Request,res:import("express").Response){
  const parsed=campaignInput.safeParse(req.body);if(!parsed.success){res.status(400).json({error:"Provide a valid customer marketing message, customer link, and schedule."});return;}
  const b=parsed.data;
  if(/[{}]/.test(b.title+b.body)){res.status(400).json({error:"Replace every template placeholder with real information."});return;}
  if(b.status==="scheduled"&&(!b.dueAt||Date.parse(b.dueAt)<=Date.now())){res.status(400).json({error:"Choose a future date and time with an explicit timezone."});return;}
  await ensureCustomerNotificationSchema();
  const result=rows(req.params.id?await db.execute(sql`UPDATE customer_notification_campaigns
    SET title=${b.title},body=${b.body},category=${b.category},url=${b.url},status=${b.status},due_at=${b.dueAt??null},error=NULL,updated_at=NOW()
    WHERE id=${Number(req.params.id)} AND status IN ('draft','scheduled','failed') RETURNING *`):
    await db.execute(sql`INSERT INTO customer_notification_campaigns(title,body,category,url,status,due_at)
    VALUES(${b.title},${b.body},${b.category},${b.url},${b.status},${b.dueAt??null}) RETURNING *`))[0];
  if(!result){res.status(409).json({error:"The campaign cannot be edited after sending begins."});return;}
  res.status(req.params.id?200:201).json(payload(result));
}
router.post("/admin/customer-notifications",requireAdmin,saveCampaign);
router.patch("/admin/customer-notifications/:id",requireAdmin,saveCampaign);
router.delete("/admin/customer-notifications/:id",requireAdmin,async(req,res)=>{
  await ensureCustomerNotificationSchema();
  const result=rows(await db.execute(sql`DELETE FROM customer_notification_campaigns WHERE id=${Number(req.params.id)}
    AND status IN ('draft','scheduled','failed') RETURNING id`));
  if(!result.length){res.status(409).json({error:"Only unsent campaigns can be deleted."});return;}res.sendStatus(204);
});
export async function dispatchCampaign(id:number){
  await ensureCustomerNotificationSchema();await initPush();
  const c=rows(await db.execute(sql`UPDATE customer_notification_campaigns SET status='sending',updated_at=NOW()
    WHERE id=${id} AND status IN ('draft','scheduled','failed') RETURNING *`))[0];
  if(!c)throw new Error("Campaign is already sending, sent, or unavailable.");
  try{
    const report=await sendCustomerMarketing(`campaign:${id}`,{title:c.title,body:c.body,url:c.url});
    await db.execute(sql`UPDATE customer_notification_campaigns SET status=${report.failed?"partial":"sent"},
      accepted=${report.accepted},failed=${report.failed},skipped=${report.skipped},error=NULL,updated_at=NOW() WHERE id=${id}`);
    return report;
  }catch(error){
    await db.execute(sql`UPDATE customer_notification_campaigns SET status='failed',error='Push dispatch failed; no delivery claim.',updated_at=NOW() WHERE id=${id}`);
    throw error;
  }
}
router.post("/admin/customer-notifications/:id/send",requireAdmin,async(req,res)=>{
  try{res.json(await dispatchCampaign(Number(req.params.id)));}catch(error){res.status(503).json({error:error instanceof Error?error.message:"Push dispatch failed."});}
});
let polling=false;
const timer=setInterval(async()=>{
  if(polling)return;polling=true;
  try{
    await ensureCustomerNotificationSchema();
    const due=rows(await db.execute(sql`SELECT id FROM customer_notification_campaigns WHERE status='scheduled' AND due_at<=NOW() ORDER BY due_at LIMIT 5`));
    for(const c of due)await dispatchCampaign(c.id);
  }catch(error){logger.warn({error:error instanceof Error?error.message:"Push scheduling unavailable"},"Customer notification scheduler");}
  finally{polling=false;}
},30000);
timer.unref();
export default router;
