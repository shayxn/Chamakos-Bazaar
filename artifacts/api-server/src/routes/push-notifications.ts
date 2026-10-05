import { Router } from "express";
import { db, customerAccountsTable, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { initPush, saveSubscription, removeOwnedSubscription, sendTestPush, saveCustomerSubscription, ensureCustomerSubTable, saveWishlistSubscription } from "../lib/push";
import { subscribeCustomer } from "./customer-notifications";
import { customerNotificationOwner,ensureCustomerNotificationSchema } from "../lib/customer-notification-delivery";
import { rows } from "../lib/management-db";

const router = Router();
router.use((req,res,next)=>{
  if(req.method==="POST"&&req.path.includes("/push/")&&req.body?.endpoint){
    try{
      const url=new URL(req.body.endpoint);
      if(url.protocol!=="https:"||!["fcm.googleapis.com","web.push.apple.com","updates.push.services.mozilla.com"].includes(url.hostname)&&!url.hostname.endsWith(".notify.windows.com"))
        throw new Error("Unsupported push provider.");
    }catch{res.status(400).json({error:"Use a subscription from a supported browser push provider."});return;}
  }
  next();
});

router.get("/push/vapid-key", requireAdmin, async (_req, res) => {
  try {
    const publicKey = await initPush();
    res.json({ publicKey });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Failed to initialize push" });
  }
});

router.post("/push/subscribe", requireAdmin, async (req, res) => {
  try {
    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "endpoint and keys required" });
      return;
    }
    await initPush();
    await saveSubscription(endpoint, keys.p256dh, keys.auth, Number(req.session?.userId));
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Failed to save subscription" });
  }
});

router.delete("/push/subscribe", requireAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint) {
      res.status(400).json({ error: "endpoint required" });
      return;
    }
    await removeOwnedSubscription(endpoint,Number(req.session?.userId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

router.post("/push/test", requireAdmin, async (req, res) => {
  try {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    if (!endpoint) return void res.status(400).json({ error: "Current browser subscription is required" });
    await sendTestPush(endpoint, Number(req.session?.userId));
    res.json({ ok: true, acceptedByProvider: true });
  } catch (error) {
    res.status(422).json({ error: error instanceof Error ? error.message : "Test notification failed" });
  }
});

// Customer self-subscription
router.post("/push/customer-subscribe", async (req, res) => {
  // This legacy action was an explicit order-updates opt-in, never marketing consent.
  const {endpoint,p256dh,auth}=req.body;
  await ensureCustomerNotificationSchema();
  const previous=rows(await db.execute(sql`SELECT BOOL_OR(marketing_enabled AND consent_at IS NOT NULL) AS marketing
    FROM customer_push_subscriptions WHERE owner_key=${customerNotificationOwner(req)}`))[0];
  req.body={endpoint,keys:{p256dh,auth},consent:true,marketingEnabled:previous?.marketing===true,orderUpdatesEnabled:true};
  await subscribeCustomer(req,res);
});

router.get("/push/vapid-public-key", async (_req, res) => {
  try {res.json({publicKey:await initPush()});}
  catch(error){res.status(503).json({error:error instanceof Error?error.message:"Push is not configured."});}
});

// Wishlist "notify me on release" — links session_id to a push subscription
router.post("/push/wishlist-notify-subscribe", async (req, res) => {
  const { endpoint, p256dh, auth } = req.body as Record<string, string>;
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: "Missing fields" }); return; }
  const sessionId = (req as any).session?.wishlistId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "No session — add something to wishlist first" }); return; }
  // Wishlist release notices are marketing and go through the same consent/quota pipeline.
  await ensureCustomerNotificationSchema();
  const previous=rows(await db.execute(sql`SELECT BOOL_OR(order_updates_enabled) AS orders FROM customer_push_subscriptions
    WHERE owner_key=${customerNotificationOwner(req)}`))[0];
  req.body={endpoint,keys:{p256dh,auth},consent:true,marketingEnabled:true,orderUpdatesEnabled:previous?.orders===true};
  await subscribeCustomer(req,res);
});

export default router;
