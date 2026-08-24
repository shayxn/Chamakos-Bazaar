import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { initPush, saveSubscription, removeSubscription, sendOrderPush, saveCustomerSubscription, ensureCustomerSubTable, saveWishlistSubscription } from "../lib/push";

const router = Router();

router.get("/push/vapid-key", requireAdmin, async (_req, res) => {
  try {
    const publicKey = await initPush();
    res.json({ publicKey });
  } catch {
    res.status(500).json({ error: "Failed to initialize push" });
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
    await saveSubscription(endpoint, keys.p256dh, keys.auth);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.delete("/push/subscribe", requireAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint) {
      res.status(400).json({ error: "endpoint required" });
      return;
    }
    await removeSubscription(endpoint);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

router.post("/push/test", requireAdmin, async (_req, res) => {
  try {
    await sendOrderPush({
      orderNumber: "TEST-001",
      customerName: "Test Customer",
      total: 299,
      items: [{ productName: "Chamak Hoodie", quantity: 1 }],
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Test notification failed" });
  }
});

// Customer self-subscription
router.post("/push/customer-subscribe", async (req, res) => {
  const { endpoint, p256dh, auth, customerPhone, customerEmail } = req.body as Record<string, string>;
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: "Missing fields" }); return; }
  await saveCustomerSubscription(endpoint, p256dh, auth, customerPhone, customerEmail);
  res.json({ ok: true });
});

router.get("/push/vapid-public-key", async (_req, res) => {
  const key = await initPush();
  res.json({ publicKey: key });
});

// Wishlist "notify me on release" — links session_id to a push subscription
router.post("/push/wishlist-notify-subscribe", async (req, res) => {
  const { endpoint, p256dh, auth } = req.body as Record<string, string>;
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: "Missing fields" }); return; }
  const sessionId = (req as any).session?.wishlistId as string | undefined;
  if (!sessionId) { res.status(400).json({ error: "No session — add something to wishlist first" }); return; }
  await saveWishlistSubscription(endpoint, p256dh, auth, sessionId);
  res.json({ ok: true });
});

export default router;
