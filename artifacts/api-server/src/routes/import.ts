import { Router } from "express";
import { db, productsTable, categoriesTable, siteSettingsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

const SUPPLIERS: Record<string, string> = {
  fashioncage: "https://fashioncage.me",
  stylescape: "https://stylescape.me",
  stealstreetwear: "https://stealstreetwear.com",
};
// Public shipping policy checked on 2026-08-24: "FAST SHIPPING 1-3 DAYS ONLY ALL OVER UAE".
const UAE_DELIVERY_VERIFIED_SOURCES = new Set(["stealstreetwear"]);

const CHAMAK_PLACEHOLDER_URL = "/chamak-placeholder.svg";

function sanitizeProductImage(name: string, imageUrl: string | null, _source?: string): string | null {
  return imageUrl;
}

type ShopifyVariant = {
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: string;
  available: boolean;
};

type ShopifyOption = {
  name: string;
  values: string[];
};

type ShopifyImage = {
  src: string;
};

type ShopifyMediaSource = {
  url?: string;
  src?: string;
  mime_type?: string;
  type?: string;
};

type ShopifyProduct = {
  id: number;
  handle?: string;
  title: string;
  body_html: string;
  product_type: string;
  tags: string[];
  vendor: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
  media?: Array<{ media_type?: string; sources?: ShopifyMediaSource[]; src?: string; url?: string }>;
  videos?: ShopifyMediaSource[];
  video?: ShopifyMediaSource | string;
};

type SyncStats = {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastImportCount: number;
  lastUpdateCount: number;
  lastSkipCount: number;
  lastErrorMsg: string | null;
  autoSyncEnabled: boolean;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function calcSellingPrice(supplierPrice: number): number {
  return Math.round((supplierPrice + 25) * 1.3 * 100) / 100;
}

function extractSupplierVideo(p: ShopifyProduct): string | null {
  const candidates: ShopifyMediaSource[] = [];
  for (const media of p.media ?? []) {
    if (media.media_type === "video" || media.sources?.some((source) => source.mime_type?.startsWith("video/") || source.type === "video")) {
      candidates.push(...(media.sources ?? []), { src: media.src, url: media.url, type: media.media_type });
    }
  }
  candidates.push(...(p.videos ?? []));
  if (typeof p.video === "string") candidates.push({ url: p.video, type: "video" });
  else if (p.video) candidates.push(p.video);
  return candidates
    .map((candidate) => candidate.url ?? candidate.src)
    .find((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url) && /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url))
    ?? null;
}

function extractVideoFromHtml(html: string): string | null {
  const matches = [
    ...html.matchAll(/<(?:video|source)[^>]+src=["']([^"']+\.(?:mp4|webm|mov|m4v|ogg)(?:\?[^"']*)?)["']/gi),
    ...html.matchAll(/https?:\\?\/\\?\/[^"'\\\s]+?\.(?:mp4|webm|mov|m4v|ogg)(?:\?[^"'\\\s]*)?/gi),
  ];
  for (const match of matches) {
    const candidate = (match[1] ?? match[0]).replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (/^https?:\/\//i.test(candidate)) return candidate;
  }
  return null;
}

async function fetchSupplierProductVideo(baseUrl: string, handle: string | null): Promise<string | null> {
  if (!handle) return null;
  try {
    const res = await fetch(`${baseUrl}/products/${encodeURIComponent(handle)}`, {
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 FirstPick product-media sync" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return extractVideoFromHtml(await res.text());
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], maxConcurrent: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(maxConcurrent, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

async function fetchShopifyProducts(baseUrl: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${baseUrl}/products.json?limit=250&page=${page}`, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 ChamakStreet/1.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) break;
    const data = (await res.json()) as { products: ShopifyProduct[] };
    if (!data.products || data.products.length === 0) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
    page++;
  }
  return all;
}

function parseShopifyProduct(p: ShopifyProduct) {
  const supplierPrice = Number(p.variants[0]?.price ?? "0");
  const sellingPrice = calcSellingPrice(supplierPrice);

  const sizeOption = p.options.find((o) => /size/i.test(o.name));
  const colorOption = p.options.find((o) => /colo(u)?r/i.test(o.name));

  const sizes = sizeOption
    ? [...new Set(p.variants.map((v) => v.option1).filter((s): s is string => !!s))].join(", ")
    : p.variants.length > 0 && p.variants[0].title !== "Default Title"
    ? [...new Set(p.variants.map((v) => v.title).filter(Boolean))].join(", ")
    : null;

  const colors = colorOption
    ? [...new Set(p.variants.map((v) => v.option2).filter((s): s is string => !!s))].join(", ")
    : null;

  const inStock = p.variants.some((v) => v.available);
  const description = stripHtml(p.body_html) || null;
  const imageUrls = p.images.map((img) => ({ url: img.src, type: "image" as const }));
  const videoUrl = extractSupplierVideo(p);

  return {
    externalId: String(p.id),
    handle: p.handle ?? null,
    name: p.title,
    description,
    supplierPrice,
    sellingPrice,
    sizes,
    colors,
    stock: inStock ? 100 : 0,
    imageUrl: imageUrls[0]?.url ?? null,
    imageUrls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
    videoUrl,
    categoryName: p.product_type?.trim() || null,
  };
}

async function getSyncStats(supplier: string): Promise<SyncStats> {
  const keys = [
    `sync_last_at_${supplier}`,
    `sync_next_at_${supplier}`,
    `sync_import_count_${supplier}`,
    `sync_update_count_${supplier}`,
    `sync_skip_count_${supplier}`,
    `sync_error_${supplier}`,
    `sync_auto_enabled_${supplier}`,
  ];
  const rows = await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, keys));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    lastSyncAt: map[`sync_last_at_${supplier}`] ?? null,
    nextSyncAt: map[`sync_next_at_${supplier}`] ?? null,
    lastImportCount: Number(map[`sync_import_count_${supplier}`] ?? 0),
    lastUpdateCount: Number(map[`sync_update_count_${supplier}`] ?? 0),
    lastSkipCount: Number(map[`sync_skip_count_${supplier}`] ?? 0),
    lastErrorMsg: map[`sync_error_${supplier}`] ?? null,
    autoSyncEnabled: map[`sync_auto_enabled_${supplier}`] !== "false",
  };
}

async function setSyncStats(supplier: string, stats: Record<string, string>) {
  const entries = Object.entries(stats).map(([k, v]) => ({ key: `${k}_${supplier}`, value: v }));
  await db.execute(sql`
    INSERT INTO site_settings (key, value)
    SELECT * FROM jsonb_to_recordset(${JSON.stringify(entries.map(e => ({ key: e.key, value: e.value })))}::jsonb)
      AS t(key text, value text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
}

async function runSupplierImport(baseUrl: string, supplierName: string): Promise<{
  imported: number; updated: number; skipped: number; total: number; error?: string;
}> {
  try {
    const shopifyProducts = await fetchShopifyProducts(baseUrl);

    const existingCategories = await db.select().from(categoriesTable);
    const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

    const existingImported = await db
      .select({ externalId: productsTable.externalId, id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.importSource, supplierName));
    const existingByExternalId = new Map(existingImported.map((p) => [p.externalId, p.id]));

    const parsedProducts = await mapWithConcurrency(shopifyProducts, 4, async (p) => {
      const base = parseShopifyProduct(p);
      return {
        ...base,
        sourceUrl: base.handle ? `${baseUrl}/products/${base.handle}` : null,
        imageUrl: sanitizeProductImage(base.name, base.imageUrl, supplierName),
        videoUrl: base.videoUrl ?? await fetchSupplierProductVideo(baseUrl, base.handle),
      };
    });

    for (const parsed of parsedProducts) {
      if (parsed.categoryName) {
        const key = parsed.categoryName.toLowerCase();
        if (!categoryMap.has(key)) {
          const [cat] = await db
            .insert(categoriesTable)
            .values({ name: parsed.categoryName, slug: slugify(parsed.categoryName) })
            .returning();
          categoryMap.set(key, cat.id);
        }
      }
    }

    type InsertRow = {
      name: string; description: string | null; price: string; supplierPrice: string; sourceUrl: string | null; videoUrl: string | null; shipsToUaeVerified: boolean;
      importSource: string; externalId: string | null; sizes: string | null; colors: string | null;
      stock: number; imageUrl: string | null; imageUrls: string | null;
      categoryId: number | null; featured: boolean; rep: boolean; isPreOrder: boolean;
    };
    type UpdateRow = { id: number; data: {
      name: string; sizes: string | null; colors: string | null; stock: number;
      imageUrl: string | null; imageUrls: string | null; supplierPrice: string; sourceUrl: string | null; categoryId: number | null; videoUrl?: string; shipsToUaeVerified: boolean;
    }};

    const toInsert: InsertRow[] = [];
    const toUpdate: UpdateRow[] = [];
    let importedCount = 0;

    for (const parsed of parsedProducts) {
      const categoryId = parsed.categoryName
        ? (categoryMap.get(parsed.categoryName.toLowerCase()) ?? null)
        : null;
      const existingId = existingByExternalId.get(parsed.externalId);

      if (existingId) {
        toUpdate.push({
          id: existingId,
          data: {
            name: parsed.name,
            sizes: parsed.sizes,
            colors: parsed.colors,
            stock: parsed.stock,
            imageUrl: parsed.imageUrl,
            imageUrls: parsed.imageUrls,
            supplierPrice: String(parsed.supplierPrice),
            sourceUrl: parsed.sourceUrl,
            categoryId,
            ...(parsed.videoUrl ? { videoUrl: parsed.videoUrl } : {}),
            shipsToUaeVerified: UAE_DELIVERY_VERIFIED_SOURCES.has(supplierName),
          },
        });
      } else {
        const isFeatured = importedCount % 2 === 0;
        toInsert.push({
          name: parsed.name,
          description: parsed.description,
          price: String(parsed.sellingPrice),
          supplierPrice: String(parsed.supplierPrice),
          sourceUrl: parsed.sourceUrl,
          videoUrl: parsed.videoUrl,
          shipsToUaeVerified: UAE_DELIVERY_VERIFIED_SOURCES.has(supplierName),
          importSource: supplierName,
          externalId: parsed.externalId,
          sizes: parsed.sizes,
          colors: parsed.colors,
          stock: parsed.stock,
          imageUrl: parsed.imageUrl,
          imageUrls: parsed.imageUrls,
          categoryId,
          featured: isFeatured,
          rep: true,
          isPreOrder: false,
        });
        importedCount++;
      }
    }

    if (toInsert.length > 0) {
      await db.insert(productsTable).values(toInsert);
    }

    const BATCH_SIZE = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((p) =>
          db.update(productsTable)
            .set(p.data)
            .where(and(eq(productsTable.id, p.id), eq(productsTable.importSource, supplierName)))
        )
      );
    }

    const imported = toInsert.length;
    const updated = toUpdate.length;
    const skipped = 0;

    const now = new Date().toISOString();
    const nextSync = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await setSyncStats(supplierName, {
      sync_last_at: now,
      sync_next_at: nextSync,
      sync_import_count: String(imported),
      sync_update_count: String(updated),
      sync_skip_count: String(skipped),
      sync_error: "",
    });

    return { imported, updated, skipped, total: shopifyProducts.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    await setSyncStats(supplierName, { sync_error: message }).catch(() => {});
    return { imported: 0, updated: 0, skipped: 0, total: 0, error: message };
  }
}

/* ─── fashioncage ─── */
router.get("/import/fashioncage/preview", requireAdmin, async (_req, res) => {
  try {
    const products = await fetchShopifyProducts(SUPPLIERS.fashioncage);
    const preview = products.slice(0, 100).map((p) => {
      const base = parseShopifyProduct(p);
      return { ...base, sourceUrl: base.handle ? `${SUPPLIERS.fashioncage}/products/${base.handle}` : null, imageUrl: sanitizeProductImage(base.name, base.imageUrl) };
    });
    res.json({ count: products.length, products: preview });
  } catch {
    res.status(502).json({ error: "Failed to fetch from fashioncage.me" });
  }
});

router.post("/import/fashioncage", requireAdmin, async (_req, res) => {
  const result = await runSupplierImport(SUPPLIERS.fashioncage, "fashioncage");
  if (result.error) res.status(502).json({ error: result.error });
  else res.json(result);
});

/* ─── stylescape ─── */
router.get("/import/stylescape/preview", requireAdmin, async (_req, res) => {
  try {
    const products = await fetchShopifyProducts(SUPPLIERS.stylescape);
    const preview = products.slice(0, 100).map((p) => {
      const base = parseShopifyProduct(p);
      return { ...base, sourceUrl: base.handle ? `${SUPPLIERS.stylescape}/products/${base.handle}` : null, imageUrl: sanitizeProductImage(base.name, base.imageUrl, "stylescape") };
    });
    res.json({ count: products.length, products: preview });
  } catch {
    res.status(502).json({ error: "Failed to fetch from stylescape.me" });
  }
});

router.post("/import/stylescape", requireAdmin, async (_req, res) => {
  const result = await runSupplierImport(SUPPLIERS.stylescape, "stylescape");
  if (result.error) res.status(502).json({ error: result.error });
  else res.json(result);
});

/* ─── stealstreetwear ─── */
router.get("/import/stealstreetwear/preview", requireAdmin, async (_req, res) => {
  try {
    const products = await fetchShopifyProducts(SUPPLIERS.stealstreetwear);
    const preview = products.slice(0, 100).map((p) => {
      const base = parseShopifyProduct(p);
      return { ...base, sourceUrl: base.handle ? `${SUPPLIERS.stealstreetwear}/products/${base.handle}` : null, imageUrl: sanitizeProductImage(base.name, base.imageUrl, "stealstreetwear") };
    });
    res.json({ count: products.length, products: preview });
  } catch {
    res.status(502).json({ error: "Failed to fetch from stealstreetwear.com" });
  }
});

router.post("/import/stealstreetwear", requireAdmin, async (_req, res) => {
  const result = await runSupplierImport(SUPPLIERS.stealstreetwear, "stealstreetwear");
  if (result.error) res.status(502).json({ error: result.error });
  else res.json(result);
});

router.post("/import/sync-approved", requireAdmin, async (_req, res) => {
  const result = await runSupplierImport(SUPPLIERS.stealstreetwear, "stealstreetwear");
  if (result.error) {
    res.status(502).json({ error: result.error });
    return;
  }
  res.json({ stealstreetwear: result });
});

/* ─── delete by source ─── */
router.delete("/import/delete-by-source/:supplier", requireAdmin, async (req, res) => {
  const supplier = req.params.supplier as string;
  if (!Object.keys(SUPPLIERS).includes(supplier)) {
    res.status(400).json({ error: "Unknown supplier" });
    return;
  }
  const deleted = await db
    .delete(productsTable)
    .where(eq(productsTable.importSource, supplier))
    .returning({ id: productsTable.id });
  res.json({ deleted: deleted.length, supplier });
});

/* ─── sync all ─── */
router.post("/import/sync-all", requireAdmin, async (_req, res) => {
  const [fc, ss, sw] = await Promise.allSettled([
    runSupplierImport(SUPPLIERS.fashioncage, "fashioncage"),
    runSupplierImport(SUPPLIERS.stylescape, "stylescape"),
    runSupplierImport(SUPPLIERS.stealstreetwear, "stealstreetwear"),
  ]);
  res.json({
    fashioncage: fc.status === "fulfilled" ? fc.value : { error: (fc as PromiseRejectedResult).reason?.message },
    stylescape: ss.status === "fulfilled" ? ss.value : { error: (ss as PromiseRejectedResult).reason?.message },
    stealstreetwear: sw.status === "fulfilled" ? sw.value : { error: (sw as PromiseRejectedResult).reason?.message },
  });
});

/* ─── stats ─── */
router.get("/import/stats", requireAdmin, async (_req, res) => {
  const [fc, ss, sw] = await Promise.all([
    getSyncStats("fashioncage"),
    getSyncStats("stylescape"),
    getSyncStats("stealstreetwear"),
  ]);
  res.json({ fashioncage: fc, stylescape: ss, stealstreetwear: sw });
});

/* ─── toggle autosync ─── */
router.post("/import/toggle-autosync", requireAdmin, async (req, res) => {
  const { supplier, enabled } = req.body as { supplier: string; enabled: boolean };
  if (!Object.keys(SUPPLIERS).includes(supplier)) {
    res.status(400).json({ error: "Unknown supplier" });
    return;
  }
  await setSyncStats(supplier, { sync_auto_enabled: enabled ? "true" : "false" });
  res.json({ ok: true });
});

/* ─── recalculate prices ─── */
router.post("/import/recalculate-prices", requireAdmin, async (_req, res) => {
  const result = await db.execute<{ updated: string }>(sql`
    UPDATE products
    SET price = ROUND(((supplier_price::numeric + 25) * 1.3), 2)::text
    WHERE supplier_price IS NOT NULL AND supplier_price != '0'
    RETURNING id
  `);
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  res.json({ updated: rows.length });
});

// ── Auto-sync scheduler ──────────────────────────────────────────────────────
// Checks every hour; runs import if 24h have elapsed since last sync and auto-sync is enabled.
setInterval(async () => {
  for (const [supplierName, baseUrl] of Object.entries(SUPPLIERS)) {
    try {
      const stats = await getSyncStats(supplierName);
      if (!stats.autoSyncEnabled) continue;
      const lastSync = stats.lastSyncAt ? new Date(stats.lastSyncAt) : null;
      const now = new Date();
      // Skip if synced less than 23 hours ago
      if (lastSync && (now.getTime() - lastSync.getTime()) < 23 * 60 * 60 * 1000) continue;
      console.log(`[AutoSync] Running scheduled import for ${supplierName}`);
      await runSupplierImport(baseUrl, supplierName);
    } catch (err) {
      console.error(`[AutoSync] Error for ${supplierName}:`, err);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export { runSupplierImport };
export default router;
