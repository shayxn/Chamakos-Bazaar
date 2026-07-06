import { Router } from "express";
import { db, productsTable, categoriesTable, siteSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

const SUPPLIERS: Record<string, string> = {
  fashioncage: "https://fashioncage.me",
  stylescape: "https://stylescape.me",
};

const CHAMAK_PLACEHOLDER_URL = "/chamak-placeholder.svg";

function sanitizeProductImage(name: string, imageUrl: string | null): string | null {
  if (/stylescape/i.test(name)) return CHAMAK_PLACEHOLDER_URL;
  if (imageUrl && /stylescape\.me/i.test(imageUrl)) return CHAMAK_PLACEHOLDER_URL;
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

type ShopifyProduct = {
  id: number;
  title: string;
  body_html: string;
  product_type: string;
  tags: string[];
  vendor: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
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

  return {
    externalId: String(p.id),
    name: p.title,
    description,
    supplierPrice,
    sellingPrice,
    sizes,
    colors,
    stock: inStock ? 100 : 0,
    imageUrl: imageUrls[0]?.url ?? null,
    imageUrls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
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
  const map: Record<string, string> = {};
  for (const key of keys) {
    const row = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    if (row[0]) map[key] = row[0].value;
  }
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

async function setSyncStat(supplier: string, key: string, value: string) {
  const fullKey = `${key}_${supplier}`;
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, fullKey));
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, fullKey));
  } else {
    await db.insert(siteSettingsTable).values({ key: fullKey, value });
  }
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

    const parsedProducts = shopifyProducts.map((p) => {
      const base = parseShopifyProduct(p);
      return {
        ...base,
        imageUrl: sanitizeProductImage(base.name, base.imageUrl),
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
      name: string; description: string | null; price: string; supplierPrice: string;
      importSource: string; externalId: string | null; sizes: string | null; colors: string | null;
      stock: number; imageUrl: string | null; imageUrls: string | null;
      categoryId: number | null; featured: boolean; rep: boolean; isPreOrder: boolean;
    };
    type UpdateRow = { id: number; data: {
      name: string; sizes: string | null; colors: string | null; stock: number;
      imageUrl: string | null; imageUrls: string | null; supplierPrice: string; categoryId: number | null;
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
            categoryId,
          },
        });
      } else {
        const isFeatured = importedCount % 2 === 0;
        toInsert.push({
          name: parsed.name,
          description: parsed.description,
          price: String(parsed.sellingPrice),
          supplierPrice: String(parsed.supplierPrice),
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
    await setSyncStat(supplierName, "sync_last_at", now);
    await setSyncStat(supplierName, "sync_next_at", nextSync);
    await setSyncStat(supplierName, "sync_import_count", String(imported));
    await setSyncStat(supplierName, "sync_update_count", String(updated));
    await setSyncStat(supplierName, "sync_skip_count", String(skipped));
    await setSyncStat(supplierName, "sync_error", "");

    return { imported, updated, skipped, total: shopifyProducts.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    await setSyncStat(supplierName, "sync_error", message);
    return { imported: 0, updated: 0, skipped: 0, total: 0, error: message };
  }
}

/* ─── fashioncage ─── */
router.get("/import/fashioncage/preview", requireAdmin, async (_req, res) => {
  try {
    const products = await fetchShopifyProducts(SUPPLIERS.fashioncage);
    const preview = products.slice(0, 100).map((p) => {
      const base = parseShopifyProduct(p);
      return { ...base, imageUrl: sanitizeProductImage(base.name, base.imageUrl) };
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
      return { ...base, imageUrl: sanitizeProductImage(base.name, base.imageUrl) };
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
  const [fc, ss] = await Promise.allSettled([
    runSupplierImport(SUPPLIERS.fashioncage, "fashioncage"),
    runSupplierImport(SUPPLIERS.stylescape, "stylescape"),
  ]);
  res.json({
    fashioncage: fc.status === "fulfilled" ? fc.value : { error: (fc as PromiseRejectedResult).reason?.message },
    stylescape: ss.status === "fulfilled" ? ss.value : { error: (ss as PromiseRejectedResult).reason?.message },
  });
});

/* ─── stats ─── */
router.get("/import/stats", requireAdmin, async (_req, res) => {
  const [fc, ss] = await Promise.all([
    getSyncStats("fashioncage"),
    getSyncStats("stylescape"),
  ]);
  res.json({ fashioncage: fc, stylescape: ss });
});

/* ─── toggle autosync ─── */
router.post("/import/toggle-autosync", requireAdmin, async (req, res) => {
  const { supplier, enabled } = req.body as { supplier: string; enabled: boolean };
  if (!Object.keys(SUPPLIERS).includes(supplier)) {
    res.status(400).json({ error: "Unknown supplier" });
    return;
  }
  await setSyncStat(supplier, "sync_auto_enabled", enabled ? "true" : "false");
  res.json({ ok: true });
});

/* ─── recalculate prices ─── */
router.post("/import/recalculate-prices", requireAdmin, async (_req, res) => {
  const products = await db
    .select({ id: productsTable.id, supplierPrice: productsTable.supplierPrice })
    .from(productsTable);

  let updated = 0;
  for (const p of products) {
    if (p.supplierPrice != null) {
      const newPrice = calcSellingPrice(Number(p.supplierPrice));
      await db.update(productsTable).set({ price: String(newPrice) }).where(eq(productsTable.id, p.id));
      updated++;
    }
  }

  res.json({ updated });
});

export { runSupplierImport };
export default router;
