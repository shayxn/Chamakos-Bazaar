import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, siteSettingsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth-middleware";
import { logger } from "../lib/logger";
import { clearProductCaches } from "./products";

const router = Router();
const IMPORTERS = ["firstpick", "basics"] as const;
type ImporterName = (typeof IMPORTERS)[number];
const AMAZON_SOURCE = "amazon-ae";
const SHIPPING_PRICE = 25;
const DEFAULT_PROFIT = 25;

type QueueRow = {
  id: number;
  importer: ImporterName;
  externalId: string;
  name: string;
  description: string | null;
  sourcePrice: string;
  profit: string;
  imageUrl: string | null;
  imageUrls: string | null;
  sourceUrl: string | null;
  categoryName: string | null;
  stock: number;
  sizes: string | null;
  colors: string | null;
  status: "staged" | "published" | "removed" | "rejected";
  productId: number | null;
  lastSeenAt: Date | string;
  createdAt: Date | string;
};

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] } | null)?.rows ?? []);
}

function isImporter(value: unknown): value is ImporterName {
  return typeof value === "string" && (IMPORTERS as readonly string[]).includes(value);
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return row?.value ?? fallback;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(siteSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value } });
}

function nextDailyRun(lastSyncAt: string | null): string {
  const from = lastSyncAt ? new Date(lastSyncAt) : new Date();
  return new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function isBackToSchool(name: string, categoryName: string | null): boolean {
  return /school|backpack|pencil|eraser|sharpener|calculator|stationery|notebook|lunch|case|bag/i
    .test(`${name} ${categoryName ?? ""}`);
}

function sellingPrice(sourcePrice: string | number, profit: string | number): number {
  const price = Number(sourcePrice);
  const addOn = Number(profit);
  return Math.round((price + SHIPPING_PRICE + addOn) * 100) / 100;
}

async function getAmazonStatus() {
  const [firstpickLast, basicsLast] = await Promise.all([
    getSetting("importer_last_at_firstpick", ""),
    getSetting("importer_last_at_basics", ""),
  ]);
  const [firstpickAuto, basicsAuto, firstpickProfit, basicsProfit] = await Promise.all([
    getSetting("importer_auto_enabled_firstpick", "true"),
    getSetting("importer_auto_enabled_basics", "true"),
    getSetting("importer_profit_firstpick", String(DEFAULT_PROFIT)),
    getSetting("importer_profit_basics", String(DEFAULT_PROFIT)),
  ]);
  const [firstpickRows, basicsRows] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS count FROM product_import_queue WHERE importer = 'firstpick' AND status = 'staged'`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM product_import_queue WHERE importer = 'basics' AND status = 'staged'`),
  ]);
  const count = (result: unknown) => Number(extractRows<{ count: number }>(result)[0]?.count ?? 0);
  return {
    source: AMAZON_SOURCE,
    marketplace: "Amazon.ae",
    connected: false,
    sourceMessage: "Connect an authorized Amazon Selling Partner account to refresh Amazon.ae products.",
    shippingPrice: SHIPPING_PRICE,
    importers: {
      firstpick: {
        lastSyncAt: firstpickLast || null,
        nextSyncAt: nextDailyRun(firstpickLast || null),
        autoSyncEnabled: firstpickAuto !== "false",
        profit: Math.min(100, Math.max(20, Number(firstpickProfit) || DEFAULT_PROFIT)),
        stagedCount: count(firstpickRows),
      },
      basics: {
        lastSyncAt: basicsLast || null,
        nextSyncAt: nextDailyRun(basicsLast || null),
        autoSyncEnabled: basicsAuto !== "false",
        profit: Math.min(100, Math.max(20, Number(basicsProfit) || DEFAULT_PROFIT)),
        stagedCount: count(basicsRows),
      },
    },
  };
}

router.get("/importer/status", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await getAmazonStatus());
});

router.get("/importer/queue", requireAdmin, async (req, res): Promise<void> => {
  const importer = req.query.importer;
  if (!isImporter(importer)) {
    res.status(400).json({ error: "importer must be firstpick or basics" });
    return;
  }
  const result = await db.execute(sql`
    SELECT id, importer, external_id AS "externalId", name, description,
      source_price AS "sourcePrice", profit, image_url AS "imageUrl",
      image_urls AS "imageUrls", source_url AS "sourceUrl",
      category_name AS "categoryName", stock, sizes, colors, status,
      product_id AS "productId", last_seen_at AS "lastSeenAt", created_at AS "createdAt"
    FROM product_import_queue
    WHERE importer = ${importer} AND status IN ('staged', 'published')
    ORDER BY created_at DESC
    LIMIT 500
  `);
  res.json(extractRows<QueueRow>(result).map((row) => ({
    ...row,
    sourcePrice: Number(row.sourcePrice),
    profit: Number(row.profit),
    sellingPrice: sellingPrice(row.sourcePrice, row.profit),
  })));
});

router.post("/importer/refresh", requireAdmin, async (req, res): Promise<void> => {
  const importer = req.body?.importer;
  if (!isImporter(importer)) {
    res.status(400).json({ error: "importer must be firstpick or basics" });
    return;
  }
  await setSetting(`importer_error_${importer}`, "Amazon connection required");
  res.status(503).json({
    code: "AMAZON_CONNECTION_REQUIRED",
    error: "Amazon refresh is unavailable until an authorized Amazon Selling Partner connection is connected.",
    importer,
  });
});

router.patch("/importer/config", requireAdmin, async (req, res): Promise<void> => {
  const { importer, profit, autoSyncEnabled } = req.body as {
    importer?: unknown;
    profit?: unknown;
    autoSyncEnabled?: unknown;
  };
  if (!isImporter(importer)) {
    res.status(400).json({ error: "importer must be firstpick or basics" });
    return;
  }
  const numericProfit = Number(profit);
  if (!Number.isFinite(numericProfit) || numericProfit < 20 || numericProfit > 100) {
    res.status(400).json({ error: "profit must be between AED 20 and AED 100" });
    return;
  }
  await setSetting(`importer_profit_${importer}`, String(Math.round(numericProfit)));
  if (typeof autoSyncEnabled === "boolean") {
    await setSetting(`importer_auto_enabled_${importer}`, autoSyncEnabled ? "true" : "false");
  }
  res.json(await getAmazonStatus());
});

router.post("/importer/bring-to-store", requireAdmin, async (req, res): Promise<void> => {
  const { importer, ids } = req.body as { importer?: unknown; ids?: unknown };
  if (!isImporter(importer) || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "importer and at least one queue id are required" });
    return;
  }
  const queueIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (queueIds.length !== ids.length) {
    res.status(400).json({ error: "queue ids must be positive integers" });
    return;
  }
  const published = await db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      SELECT id, importer, external_id AS "externalId", name, description,
        source_price AS "sourcePrice", profit, image_url AS "imageUrl",
        image_urls AS "imageUrls", source_url AS "sourceUrl",
        category_name AS "categoryName", stock, sizes, colors
      FROM product_import_queue
      WHERE importer = ${importer} AND status = 'staged'
        AND id IN (${sql.join(queueIds.map((id) => sql`${id}`), sql`, `)})
      FOR UPDATE
    `);
    const rows = extractRows<QueueRow>(result);
    if (rows.length === 0) return [];

    const categories = await tx.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable);
    const categoryMap = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
    const created: Array<{ queueId: number; productId: number }> = [];
    for (const row of rows) {
      const categoryName = row.categoryName?.trim() || (isBackToSchool(row.name, row.categoryName) ? "Back To School" : null);
      let categoryId = categoryName ? categoryMap.get(categoryName.toLowerCase()) ?? null : null;
      if (categoryName && categoryId == null) {
        const [category] = await tx.insert(categoriesTable)
          .values({ name: categoryName, slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })
          .returning({ id: categoriesTable.id });
        categoryId = category?.id ?? null;
        if (categoryId != null) categoryMap.set(categoryName.toLowerCase(), categoryId);
      }
      const [existing] = await tx.select({ id: productsTable.id })
        .from(productsTable)
        .where(and(eq(productsTable.importSource, AMAZON_SOURCE), eq(productsTable.externalId, row.externalId)))
        .limit(1);
      const productId = existing?.id ?? (await tx.insert(productsTable).values({
        name: row.name,
        description: row.description,
        price: String(sellingPrice(row.sourcePrice, row.profit)),
        supplierPrice: String(row.sourcePrice),
        sourceUrl: row.sourceUrl,
        importSource: AMAZON_SOURCE,
        externalId: row.externalId,
        imageUrl: row.imageUrl,
        imageUrls: row.imageUrls,
        stock: Math.max(0, Number(row.stock) || 0),
        sizes: row.sizes,
        colors: row.colors,
        categoryId,
        featured: false,
        rep: true,
        isPreOrder: false,
        collection: importer === "basics" ? "basics" : isBackToSchool(row.name, row.categoryName) ? "back_to_school" : null,
        newArrival: true,
        shipsToUaeVerified: false,
      }).returning({ id: productsTable.id }))[0]?.id;
      if (productId == null) throw new Error("Could not create imported product");
      await tx.execute(sql`
        UPDATE product_import_queue
        SET status = 'published', product_id = ${productId}, last_seen_at = NOW()
        WHERE id = ${row.id} AND importer = ${importer} AND status = 'staged'
      `);
      created.push({ queueId: row.id, productId });
    }
    return created;
  });
  if (published.length === 0) {
    res.status(409).json({ error: "Those products have already been published or removed" });
    return;
  }
  clearProductCaches();
  res.status(201).json({ imported: published.length, products: published });
});

router.delete("/importer/queue/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid queue id" });
    return;
  }
  const result = await db.execute(sql`
    SELECT product_id AS "productId", status
    FROM product_import_queue
    WHERE id = ${id}
    LIMIT 1
  `);
  const row = extractRows<{ productId: number | null; status: string }>(result)[0];
  if (!row) {
    res.status(404).json({ error: "Import record not found" });
    return;
  }
  if (row.productId) {
    await db.update(productsTable).set({ hidden: true }).where(eq(productsTable.id, row.productId));
    clearProductCaches();
  }
  await db.execute(sql`DELETE FROM product_import_queue WHERE id = ${id}`);
  res.json({ deleted: true, productHidden: Boolean(row.productId) });
});

async function scheduledAmazonRefresh(): Promise<void> {
  const status = await getAmazonStatus();
  if (!status.connected) return;
  // The official Amazon adapter is intentionally the only place that may
  // populate this queue. A missing connection must never create fake products.
}

setInterval(() => {
  scheduledAmazonRefresh().catch((error) => logger.error({ error }, "Amazon importer scheduler failed"));
}, 60 * 60 * 1000);

export { sellingPrice, isBackToSchool };
export default router;