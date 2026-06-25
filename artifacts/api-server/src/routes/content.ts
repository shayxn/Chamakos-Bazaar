import { Router } from "express";
import { db, contentPagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

const DEFAULT_TERMS_CONTENT = `Welcome to Chamak Street. By placing an order on our store, you agree to the following Terms of Policy.

## 1. Order Agreement
By purchasing from Chamak Street, you confirm that you have read and agreed to all policies, terms, and conditions listed below.

## 2. Shipping & Delivery
Delivery times may vary depending on location, product availability, holidays, weather conditions, or courier delays. Some orders may arrive later than expected.

By placing an order, you understand and accept that:
- Orders may be delayed
- Shipping times are estimates only
- Chamak Street is not responsible for unexpected courier or transit delays

## 3. No Refund Policy
All sales are final.

Once an order has been placed:
- No refunds are allowed
- No cancellations are allowed
- No chargebacks should be attempted after purchase

Please make sure all information, sizes, colors, and products are correct before checking out.

## 4. Incorrect Information
Customers are responsible for entering the correct name, address, phone number, and delivery details. Chamak Street is not responsible for failed deliveries caused by incorrect customer information.

## 5. Product Availability
Some products may have limited stock. We reserve the right to cancel or limit orders if items become unavailable.

## 6. Changes to Policy
Chamak Street may update or change these policies at any time without prior notice.

By ordering from Chamak Street, you automatically agree to all Terms of Policy listed above.`;

const defaultPages: Record<string, { title: string; content: string }> = {
  terms: {
    title: "Terms of Policy",
    content: DEFAULT_TERMS_CONTENT,
  },
};

async function getContentPage(slug: string) {
  const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.slug, slug));
  if (page) {
    return {
      slug: page.slug,
      title: page.title,
      content: page.content,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  const fallback = defaultPages[slug];
  if (!fallback) return null;
  return { slug, ...fallback, updatedAt: null };
}

router.get("/content/:slug", async (req, res) => {
  const page = await getContentPage(req.params.slug);
  if (!page) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(page);
});

router.put("/content/:slug", requireAdmin, async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (title.length < 2 || content.length < 10) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [page] = await db
    .insert(contentPagesTable)
    .values({ slug: req.params.slug as string, title, content, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: contentPagesTable.slug,
      set: { title, content, updatedAt: new Date() },
    })
    .returning();

  res.json({
    slug: page.slug,
    title: page.title,
    content: page.content,
    updatedAt: page.updatedAt.toISOString(),
  });
});

export default router;
