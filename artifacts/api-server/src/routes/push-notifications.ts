import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { initPush, saveSubscription, removeSubscription, sendOrderPush } from "../lib/push";

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

export default router;
