import { Router } from "express";
import { ensureCommerceSchema } from "../lib/commerce-schema";
import { logAdminActivity } from "./admin-activity";
import { z } from "zod";
import { db, productsTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, ilike, and, inArray, ne, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { touchAdminSession } from "../lib/admin-sessions";
import { adminAccess } from "../lib/admin-permissions";
import { getOperationalSettings } from "../lib/operational-settings";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";
import { sendComingSoonReleasePush } from "../lib/push";

const router = Router();
router.use(async (_req,_res,next)=>{await ensureCommerceSchema();next();});
const productFields = z.object({
  name:z.string().trim().min(1).max(240).optional(),price:z.number().finite().nonnegative().optional(),
  stock:z.number().int().nonnegative().optional(),colors:z.string().max(1000).nullable().optional(),
  compareAtPrice:z.number().finite().nonnegative().nullable().optional(),
  seoTitle:z.string().max(240).nullable().optional(),seoDescription:z.string().max(2000).nullable().optional(),
  socialImage:z.string().max(2000).nullable().optional(),
  variants:z.array(z.object({id:z.string().min(1).max(100),size:z.string().max(100),color:z.string().max(100),
    stock:z.number().int().nonnegative(),price:z.number().finite().nonnegative().nullable()})).max(500).optional(),
}).passthrough();
router.use(async (req,res,next)=>{
  if(!["POST","PATCH"].includes(req.method)||req.path.includes("bulk-action")){next();return;}
  const parsed=productFields.safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Check product price, stock, variants, and fields."});return;}
  const b=parsed.data;
  if(b.variants){
    const keys=b.variants.map(v=>`${v.size}|${v.color}`);
    if(new Set(keys).size!==keys.length||new Set(b.variants.map(v=>v.id)).size!==b.variants.length){
      res.status(400).json({error:"Variant combinations and IDs must be unique."});return;
    }
    if(b.variants.length)b.stock=b.variants.reduce((sum,v)=>sum+v.stock,0);
  }
  if(b.compareAtPrice!=null&&b.price!=null&&b.compareAtPrice<=b.price){res.status(400).json({error:"Compare-at price must exceed the selling price."});return;}
  req.body=b;next();
});
const productListCache = createTtlCache<unknown>(30_000);
const productDetailCache = createTtlCache<unknown>(30_000);

export function clearProductCaches() {
  productListCache.clear();
  productDetailCache.clear();
}

// ── Badge + Coming Soon columns migration ────────────────────────────────────
let _badgeMigrated = false;
async function ensureBadgeColumns() {
  if (_badgeMigrated) return; _badgeMigrated = true;
  await db.execute(sql`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS trending BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS limited_edition BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS video_url TEXT,
      ADD COLUMN IF NOT EXISTS ships_to_uae_verified BOOLEAN NOT NULL DEFAULT FALSE
  `);
}
ensureBadgeColumns().catch(console.error);

function serializeProduct(p: {
  id: number; name: string; description: string | null; price: string | number;
  imageUrl: string | null; imageUrls: string | null; stock: number;
  sourceUrl?: string | null;
  importSource?: string | null;
  categoryId: number | null; categoryName?: string | null; featured: boolean;
  rep: boolean; sizes: string | null; isPreOrder: boolean; preOrderLabel: string | null;
  preOrderDate: string | null; preOrderNote: string | null; createdAt: Date | string;
  sellingFast?: boolean; spotlight?: boolean; hidden?: boolean;
  publishAt?: Date | string | null; unpublishAt?: Date | string | null;
  collection?: string | null;
  bestSeller?: boolean; trending?: boolean; newArrival?: boolean; limitedEdition?: boolean;
  comingSoon?: boolean; videoUrl?: string | null; shipsToUaeVerified?: boolean;
}, options: { includeSourceUrl?: boolean } = {}) {
  const { sourceUrl, rep, importSource, shipsToUaeVerified, ...publicFields } = p;
  const product = {
    ...publicFields,
    price: Number(p.price),
    compareAtPrice: (p as any).compareAtPrice == null ? null : Number((p as any).compareAtPrice),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    publishAt: p.publishAt instanceof Date ? p.publishAt.toISOString() : (p.publishAt ?? null),
    unpublishAt: p.unpublishAt instanceof Date ? p.unpublishAt.toISOString() : (p.unpublishAt ?? null),
    videoUrl: p.videoUrl ?? null,
  };
  return options.includeSourceUrl ? { ...product, sourceUrl: sourceUrl ?? null,rep,importSource,shipsToUaeVerified:shipsToUaeVerified??false } : product;
}

const AMAZON_DOMAINS = [
  "amazon.com", "amazon.ae", "amazon.ca", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it",
  "amazon.es", "amazon.nl", "amazon.se", "amazon.pl", "amazon.com.br", "amazon.com.mx", "amazon.com.au",
  "amazon.co.jp", "amazon.in", "amazon.sg", "amazon.sa", "amazon.eg", "amazon.com.tr",
];

function normalizeSourceUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Amazon source link must be a URL");
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Amazon source link must be a valid URL");
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const isAmazon = hostname === "amzn.to" || AMAZON_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  if (parsed.protocol !== "https:" || !isAmazon) {
    throw new Error("Amazon source link must be an HTTPS Amazon or amzn.to URL");
  }
  return parsed.toString();
}

function isPublished(p: { hidden: boolean; publishAt: Date | null; unpublishAt: Date | null }): boolean {
  if (p.hidden) return false;
  const now = new Date();
  if (p.publishAt && now < p.publishAt) return false;
  if (p.unpublishAt && now > p.unpublishAt) return false;
  return true;
}

async function hasVerifiedAdminSession(req: { session?: Record<string, unknown> }) {
  const userId = req.session?.userId;
  if (typeof userId !== "number" || !Number.isInteger(userId)) return false;
  const [user] = await db.select({ isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if(user?.isAdmin!==true||!await touchAdminSession(req as any,userId))return false;
  const access=await adminAccess(userId);
  return access.isOwner||access.permissions.some((p:string)=>p==="products"||p==="content");
}

router.get("/products", async (req, res) => {
  const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    res.status(400).json({ error: "limit must be an integer between 1 and 100" });
    return;
  }
  const isAdmin = await hasVerifiedAdminSession(req as any);
  const collection = typeof req.query.collection === "string" ? req.query.collection : undefined;
  if (!isAdmin && collection === "back_to_school") {
    res.setHeader("Cache-Control", "no-store");
    res.json([]);
    return;
  }
  const cacheKey = isAdmin ? null : req.originalUrl;
  if (cacheKey) {
    const cached = productListCache.get(cacheKey);
    if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }
  }

  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const featured = req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined;

  const conditions: SQL[] = [];
  if (!isAdmin) conditions.push(eq(productsTable.hidden, false));
  if (!isAdmin) {
    conditions.push(or(isNull(productsTable.publishAt), sql`${productsTable.publishAt} <= now()`)!, or(isNull(productsTable.unpublishAt), sql`${productsTable.unpublishAt} > now()`)!);
  }
  if (categoryId !== undefined) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured !== undefined) conditions.push(eq(productsTable.featured, featured));
  if (collection !== undefined) {
    conditions.push(eq(productsTable.collection, collection));
  } else {
    // Default: main store only (collection IS NULL)
    // Basics products must be accessed explicitly via ?collection=basics
    conditions.push(isNull(productsTable.collection));
  }

  const query = db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      imageUrls: productsTable.imageUrls,
      sourceUrl: productsTable.sourceUrl,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      rep: productsTable.rep,
      sizes: productsTable.sizes,
      colors: productsTable.colors,compareAtPrice:productsTable.compareAtPrice,variants:productsTable.variants,
      seoTitle:productsTable.seoTitle,seoDescription:productsTable.seoDescription,socialImage:productsTable.socialImage,
      isPreOrder: productsTable.isPreOrder,
      preOrderLabel: productsTable.preOrderLabel,
      preOrderDate: productsTable.preOrderDate,
      preOrderNote: productsTable.preOrderNote,
      sellingFast: productsTable.sellingFast,
      spotlight: productsTable.spotlight,
      hidden: productsTable.hidden,
      publishAt: productsTable.publishAt,
      unpublishAt: productsTable.unpublishAt,
      collection: productsTable.collection,
      bestSeller: productsTable.bestSeller,
      trending: productsTable.trending,
      newArrival: productsTable.newArrival,
      limitedEdition: productsTable.limitedEdition,
      comingSoon: productsTable.comingSoon,
       videoUrl: productsTable.videoUrl,
       shipsToUaeVerified: productsTable.shipsToUaeVerified,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .$dynamic();
  const products = await (limit === undefined ? query : query.limit(limit));

  const filtered = isAdmin ? products : products.filter(p => isPublished(p as any));
  const result = filtered.map((product) => serializeProduct(product, { includeSourceUrl: isAdmin }));
  if (collection === "back_to_school") {
    res.setHeader("Cache-Control", "no-store");
  } else if (cacheKey) {
    productListCache.set(cacheKey, result);
    setPublicReadCacheHeaders(res);
  }
  res.json(result);
});

router.post("/products", requireAdmin, async (req, res) => {
  const body = req.body as {
    name: string; description?: string; price: number; imageUrl?: string;
    imageUrls?: string; stock?: number; categoryId?: number; featured?: boolean;
    rep?: boolean; sizes?: string; isPreOrder?: boolean; preOrderLabel?: string;
    preOrderDate?: string; preOrderNote?: string; sellingFast?: boolean; spotlight?: boolean;
    hidden?: boolean; publishAt?: string | null; unpublishAt?: string | null;
    bestSeller?: boolean; trending?: boolean; newArrival?: boolean; limitedEdition?: boolean;
      videoUrl?: string | null; shipsToUaeVerified?: boolean; sourceUrl?: string | null;
  };
  if (!body.name || body.price === undefined) {
    res.status(400).json({ error: "name and price required" });
    return;
  }
  let sourceUrl: string | null | undefined;
  try {
    sourceUrl = normalizeSourceUrl(body.sourceUrl);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid source link" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    name: body.name,
    description: body.description ?? null,
    price: String(body.price),
    imageUrl: body.imageUrl ?? null,
    imageUrls: body.imageUrls ?? null,
    stock: body.stock ?? 0,
    categoryId: body.categoryId ?? null,
    featured: body.featured ?? false,
    rep: body.rep ?? false,
    sizes: body.sizes ?? null,
    colors:(body as any).colors ?? null,compareAtPrice:(body as any).compareAtPrice==null?null:String((body as any).compareAtPrice),
    variants:(body as any).variants ?? [],seoTitle:(body as any).seoTitle ?? null,
    seoDescription:(body as any).seoDescription ?? null,socialImage:(body as any).socialImage ?? null,
    isPreOrder: body.isPreOrder ?? false,
    preOrderLabel: body.preOrderLabel ?? null,
    preOrderDate: body.preOrderDate ?? null,
    preOrderNote: body.preOrderNote ?? null,
    sellingFast: body.sellingFast ?? false,
    spotlight: body.spotlight ?? false,
    hidden: body.hidden ?? false,
    publishAt: body.publishAt ? new Date(body.publishAt) : null,
    unpublishAt: body.unpublishAt ? new Date(body.unpublishAt) : null,
    collection: (body as any).collection ?? null,
    bestSeller: body.bestSeller ?? false,
    trending: body.trending ?? false,
    newArrival: body.newArrival ?? false,
    limitedEdition: body.limitedEdition ?? false,
    comingSoon: (body as any).comingSoon ?? false,
     videoUrl: body.videoUrl ?? null,
     shipsToUaeVerified: body.shipsToUaeVerified ?? false,
     sourceUrl: sourceUrl ?? null,
  }).returning();
  clearProductCaches();
  res.status(201).json(serializeProduct({ ...product, categoryName: null }, { includeSourceUrl: true }));
  await logAdminActivity(`Admin ${req.session?.userId}`,"Product created",String(product.id),product.name);
});

router.get("/products/complete-the-look", async (req, res) => {
  const productId = req.query.productId ? Number(req.query.productId) : null;
  if (!productId) { res.json([]); return; }

  const [current] = await db
    .select({ importSource: productsTable.importSource })
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!current) { res.json([]); return; }

  const ALL_SOURCES = ["fashioncage", "stealstreetwear", "reesdxb"];
  const otherSources = current.importSource
    ? ALL_SOURCES.filter((s) => s !== current.importSource)
    : ALL_SOURCES;

  const picks: ReturnType<typeof serializeProduct>[] = [];

  for (const source of otherSources) {
    for (const tryFeatured of [true, false]) {
      if (picks.find((p) => (p as any).importSource === source)) break;
      const conds: SQL[] = [
        eq(productsTable.importSource, source),
        ne(productsTable.id, productId),
        isNotNull(productsTable.imageUrl),
        eq(productsTable.hidden, false),
      ];
      if (tryFeatured) conds.push(eq(productsTable.featured, true));

      const [row] = await db
        .select({
          id: productsTable.id, name: productsTable.name, description: productsTable.description,
          price: productsTable.price, imageUrl: productsTable.imageUrl, imageUrls: productsTable.imageUrls,
          stock: productsTable.stock, categoryId: productsTable.categoryId,
          categoryName: categoriesTable.name, featured: productsTable.featured,
          rep: productsTable.rep, sizes: productsTable.sizes, isPreOrder: productsTable.isPreOrder,
          preOrderLabel: productsTable.preOrderLabel, preOrderDate: productsTable.preOrderDate,
          preOrderNote: productsTable.preOrderNote, importSource: productsTable.importSource,
          createdAt: productsTable.createdAt,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(...conds))
        .limit(1);

      if (row) picks.push(serializeProduct(row));
    }
  }

  setPublicReadCacheHeaders(res);
  res.json(picks);
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const isAdmin = await hasVerifiedAdminSession(req as any);
  const cacheKey = isAdmin ? null : req.originalUrl;
  if (cacheKey) {
    const cached = productDetailCache.get(cacheKey);
    if (cached) {
      const cachedProduct = cached as { collection?: string | null };
      if (cachedProduct.collection === "back_to_school") {
        if (!(await getOperationalSettings()).backToSchoolEnabled) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        res.setHeader("Cache-Control", "no-store");
      } else {
        setPublicReadCacheHeaders(res);
      }
      res.json(cached);
      return;
    }
  }

  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      imageUrls: productsTable.imageUrls,
      sourceUrl: productsTable.sourceUrl,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      rep: productsTable.rep,
      sizes: productsTable.sizes,
      colors: productsTable.colors,compareAtPrice:productsTable.compareAtPrice,variants:productsTable.variants,
      seoTitle:productsTable.seoTitle,seoDescription:productsTable.seoDescription,socialImage:productsTable.socialImage,
      isPreOrder: productsTable.isPreOrder,
      preOrderLabel: productsTable.preOrderLabel,
      preOrderDate: productsTable.preOrderDate,
      preOrderNote: productsTable.preOrderNote,
      sellingFast: productsTable.sellingFast,
      spotlight: productsTable.spotlight,
      hidden: productsTable.hidden,
      publishAt: productsTable.publishAt,
      unpublishAt: productsTable.unpublishAt,
      collection: productsTable.collection,
      bestSeller: productsTable.bestSeller,
      trending: productsTable.trending,
      newArrival: productsTable.newArrival,
      limitedEdition: productsTable.limitedEdition,
      comingSoon: productsTable.comingSoon,
       videoUrl: productsTable.videoUrl,
       shipsToUaeVerified: productsTable.shipsToUaeVerified,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));

  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  const isSchoolProduct = product.collection === "back_to_school";
  if (!isAdmin && isSchoolProduct) { res.status(404).json({ error: "Not found" }); return; }
  if (!isAdmin && !isPublished(product as any)) { res.status(404).json({ error: "Not found" }); return; }
  const result = serializeProduct(product, { includeSourceUrl: isAdmin });
  if (cacheKey) {
    if (isSchoolProduct) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      productDetailCache.set(cacheKey, result);
      setPublicReadCacheHeaders(res);
    }
  }
  res.json(result);
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  const allowedFields = [
    "name", "description", "price", "imageUrl", "imageUrls", "stock", "categoryId", "featured",
    "colors","compareAtPrice","variants","seoTitle","seoDescription","socialImage",
    "sizes", "isPreOrder", "preOrderLabel", "preOrderDate", "preOrderNote", "sellingFast", "spotlight",
    "hidden", "publishAt", "unpublishAt", "collection", "bestSeller", "trending", "newArrival",
    "limitedEdition", "comingSoon", "videoUrl", "shipsToUaeVerified", "sourceUrl",
  ] as const;
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No editable product fields supplied" });
    return;
  }
  if (updateData.price !== undefined) updateData.price = String(updateData.price);
  if(updateData.compareAtPrice!=null)updateData.compareAtPrice=String(updateData.compareAtPrice);
  if (updateData.publishAt !== undefined) updateData.publishAt = updateData.publishAt ? new Date(updateData.publishAt as string) : null;
  if (updateData.unpublishAt !== undefined) updateData.unpublishAt = updateData.unpublishAt ? new Date(updateData.unpublishAt as string) : null;
  try {
    const sourceUrl = normalizeSourceUrl(updateData.sourceUrl);
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid source link" });
    return;
  }
  if (updateData.spotlight === true) {
    await db.update(productsTable).set({ spotlight: false }).where(eq(productsTable.spotlight, true));
  }

  // Detect coming-soon → released transition to fire push notifications
  let releaseProductName: string | null = null;
  let releaseImageUrl: string | null = null;
  if (updateData.comingSoon === false) {
    const [cur] = await db
      .select({ comingSoon: productsTable.comingSoon, name: productsTable.name, imageUrl: productsTable.imageUrl })
      .from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (cur?.comingSoon === true) {
      releaseProductName = cur.name;
      releaseImageUrl = cur.imageUrl;
    }
  }

  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  clearProductCaches();

  // Fire release push in background (non-blocking)
  if (releaseProductName) {
    sendComingSoonReleasePush(id, releaseProductName, releaseImageUrl).catch(console.error);
  }

  res.json(serializeProduct({ ...product, categoryName: null }, { includeSourceUrl: true }));
  await logAdminActivity(`Admin ${req.session?.userId}`,Object.keys(updateData).includes("price")?"Product price changed":Object.keys(updateData).includes("stock")?"Product stock changed":"Product updated",String(id),product.name);
});

router.delete("/products/all", requireAdmin, async (_req, res) => {
  await db.delete(productsTable);
  clearProductCaches();
  res.json({ message: "All products deleted" });
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  clearProductCaches();
  res.json({ message: "Deleted" });
});

router.post("/products/bulk-action", requireAdmin, async (req, res) => {
  const { ids, action, value } = req.body as {
    ids: number[];
    action: "delete" | "hide" | "show" | "feature" | "unfeature" | "preorder" | "unpreorder" | "category" | "price";
    value?: unknown;
  };
  if (!ids || ids.length === 0) { res.status(400).json({ error: "No product IDs provided" }); return; }

  let affected = 0;
  switch (action) {
    case "delete":
      await db.delete(productsTable).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "hide":
      await db.update(productsTable).set({ hidden: true }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "show":
      await db.update(productsTable).set({ hidden: false }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "feature":
      await db.update(productsTable).set({ featured: true }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "unfeature":
      await db.update(productsTable).set({ featured: false }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "preorder":
      await db.update(productsTable).set({ isPreOrder: true }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "unpreorder":
      await db.update(productsTable).set({ isPreOrder: false }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "category":
      await db.update(productsTable).set({ categoryId: value as number }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "price":
      for (const id of ids) {
        await db.update(productsTable).set({ price: String(value) }).where(eq(productsTable.id, id));
      }
      affected = ids.length;
      break;
    default:
      res.status(400).json({ error: "Unknown action" }); return;
  }
  clearProductCaches();
  res.json({ ok: true, affected });
});

export default router;
