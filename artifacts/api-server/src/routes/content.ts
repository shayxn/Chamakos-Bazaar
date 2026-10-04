import { Router } from "express";
import { db, contentPagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

const defaultPages: Record<string, { title: string; content: string }> = {
  terms: {
    title: "Terms of Service",
    content: "",
  },
};

async function getContentPage(slug: string) {
  const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.slug, slug));
  if (page) {
    // The old generated default asserted refund and shipping policies that were
    // never confirmed. Keep the stored record intact, but do not publish it.
    const isUnverifiedLegacyDefault = slug === "terms" &&
      page.content.startsWith("Welcome to Chamak Street.") &&
      page.content.includes("No chargebacks should be attempted after purchase");
    return {
      slug: page.slug,
      title: isUnverifiedLegacyDefault ? "Terms of Service" : page.title.replace(/first[\s_-]?pick|chamak(?:os| street)?/gi, "IMAGINATE"),
      content: isUnverifiedLegacyDefault ? "" : page.content.replace(/first[\s_-]?pick|chamak(?:os| street)?/gi, "IMAGINATE"),
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
