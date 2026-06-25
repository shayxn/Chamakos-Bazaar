import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

const FASHIONCAGE_URL = "https://fashioncage.me";
const SUPPLIER_NAME = "fashioncage";

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

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${FASHIONCAGE_URL}/products.json?limit=250&page=${page}`, {
      headers: { "Accept": "application/json" },
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

router.get("/import/fashioncage/preview", requireAdmin, async (_req, res) => {
  try {
    const products = await fetchAllProducts();
    const preview = products.slice(0, 100).map(parseShopifyProduct);
    res.json({ count: products.length, products: preview });
  } catch {
    res.status(502).json({ error: "Failed to fetch from fashioncage.me" });
  }
});

router.post("/import/fashioncage", requireAdmin, async (req, res) => {
  try {
    const shopifyProducts = await fetchAllProducts();

    const existingCategories = await db.select().from(categoriesTable);
    const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

    const existingImported = await db
      .select({ externalId: productsTable.externalId, id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.importSource, SUPPLIER_NAME));
    const existingByExternalId = new Map(existingImported.map((p) => [p.externalId, p.id]));

    let imported = 0;
    let updated = 0;

    for (const sp of shopifyProducts) {
      const parsed = parseShopifyProduct(sp);

      let categoryId: number | null = null;
      if (parsed.categoryName) {
        const key = parsed.categoryName.toLowerCase();
        if (categoryMap.has(key)) {
          categoryId = categoryMap.get(key)!;
        } else {
          const [cat] = await db.insert(categoriesTable).values({ name: parsed.categoryName, slug: slugify(parsed.categoryName) }).returning();
          categoryMap.set(key, cat.id);
          categoryId = cat.id;
        }
      }

      const existingId = existingByExternalId.get(parsed.externalId);

      if (existingId) {
        await db
          .update(productsTable)
          .set({
            name: parsed.name,
            sizes: parsed.sizes,
            colors: parsed.colors,
            stock: parsed.stock,
            imageUrl: parsed.imageUrl,
            imageUrls: parsed.imageUrls,
            supplierPrice: String(parsed.supplierPrice),
            categoryId,
          })
          .where(and(eq(productsTable.id, existingId), eq(productsTable.importSource, SUPPLIER_NAME)));
        updated++;
      } else {
        await db.insert(productsTable).values({
          name: parsed.name,
          description: parsed.description,
          price: String(parsed.sellingPrice),
          supplierPrice: String(parsed.supplierPrice),
          importSource: SUPPLIER_NAME,
          externalId: parsed.externalId,
          sizes: parsed.sizes,
          colors: parsed.colors,
          stock: parsed.stock,
          imageUrl: parsed.imageUrl,
          imageUrls: parsed.imageUrls,
          categoryId,
          featured: false,
          rep: false,
          isPreOrder: false,
        });
        imported++;
      }
    }

    res.json({ imported, updated, total: shopifyProducts.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    res.status(502).json({ error: message });
  }
});

router.post("/import/recalculate-prices", requireAdmin, async (_req, res) => {
  const products = await db
    .select({ id: productsTable.id, supplierPrice: productsTable.supplierPrice })
    .from(productsTable)
    .where(eq(productsTable.importSource, SUPPLIER_NAME));

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

export default router;
