import { Router, type NextFunction, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  ownerStudioPagesTable,
  ownerStudioVersionsTable,
  siteSettingsTable,
  usersTable,
} from "@workspace/db";
import { touchAdminSession } from "../lib/admin-sessions";

const router = Router();

const OWNER_ID_KEY = "owner_studio_owner_id";
const GRANTS_KEY = "owner_studio_admin_ids";
const SOUND_PREFIX = "owner_sound_";
const TOOLBOX_KEY = "owner_studio_toolbox_items";
const PAGE_TYPES = new Set(["store", "admin"]);
const PROTECTED_SLUGS = new Set(["", "home", "shop", "cart", "checkout", "account", "login", "order-tracking"]);
const SAFE_EVENT_TRIGGERS = new Set(["page-open", "button-click", "product-click", "product-added", "scroll-to-section", "element-enters", "admin-page-open"]);
const SAFE_EVENT_ACTIONS = new Set(["show-notification", "navigate", "open-product", "play-sound", "trigger-animation"]);
const SYSTEM_PAGE_ROUTES = new Set([
  "/", "/shop", "/basics", "/back-to-school", "/cart", "/order-tracking", "/terms", "/privacy", "/shipping",
  "/account", "/account/login", "/account/register", "/returns", "/request-product", "/games", "/support", "/wishlist", "/maintenance",
  "/checkout", "/product/:id", "/order/:id", "/receipt/:id", "/games/:id",
  "/admin", "/admin/products", "/admin/basics", "/admin/orders", "/admin/categories", "/admin/site-settings", "/admin/reviews",
  "/admin/tiktok", "/admin/terms", "/admin/events", "/admin/games", "/admin/refund-requests", "/admin/product-requests",
  "/admin/visitors", "/admin/notifications", "/admin/abandoned-carts", "/admin/stock-alerts", "/admin/sales-reports",
  "/admin/activity", "/admin/chat", "/admin/coupons",
]);
const SOUND_KEYS = [
  "messageSent", "messageReceived", "typing", "newGroupMessage", "newPrivateMessage",
  "incomingCall", "outgoingRingback", "callConnected", "callEnded", "missedCall",
  "notification", "newOrder", "success", "error", "warning",
] as const;

type PagePermissions = { mode: "owner" | "admins" | "selected"; adminIds: number[] };
type SoundValue = { url: string; enabled: boolean; volume: number };
type SafeStudioAction = {
  type: "show-notification" | "navigate" | "open-product" | "play-sound" | "trigger-animation";
  message?: string;
  href?: string;
  productId?: number;
  soundUrl?: string;
  targetId?: string;
};
type SafeStudioEvent = {
  id: string;
  trigger: string;
  targetId?: string;
  enabled?: boolean;
  actions: SafeStudioAction[];
};
type ToolboxItem = { id: string; title: string; section: StudioContent["sections"][number] };
type StudioContent = {
  sections: Array<{
    id: string;
    type: string;
    label?: string;
    hidden?: boolean;
    elements?: Array<Record<string, unknown>>;
    animation?: Record<string, unknown>;
  }>;
  events?: SafeStudioEvent[];
  [key: string]: unknown;
};

function sessionUserId(req: Request): number | null {
  const id = Number((req.session as Record<string, unknown>)?.userId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function extractJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function getOwnerId(): Promise<number | null> {
  const [configured] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable).where(eq(siteSettingsTable.key, OWNER_ID_KEY)).limit(1);
  const configuredId = Number(configured?.value);
  if (Number.isInteger(configuredId) && configuredId > 0) return configuredId;

  const [firstAdmin] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.isAdmin, true)).orderBy(asc(usersTable.id)).limit(1);
  if (!firstAdmin) return null;

  await db.insert(siteSettingsTable)
    .values({ key: OWNER_ID_KEY, value: String(firstAdmin.id) })
    .onConflictDoNothing({ target: siteSettingsTable.key });
  return firstAdmin.id;
}

async function getGrantedAdminIds(): Promise<number[]> {
  const [setting] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable).where(eq(siteSettingsTable.key, GRANTS_KEY)).limit(1);
  const parsed = extractJson<unknown>(setting?.value, []);
  return Array.isArray(parsed)
    ? [...new Set(parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];
}

async function getAccess(req: Request) {
  const userId = sessionUserId(req);
  const ownerId = await getOwnerId();
  const grantedAdminIds = await getGrantedAdminIds();
  return {
    userId,
    ownerId,
    grantedAdminIds,
    isOwner: userId != null && userId === ownerId,
    canAccess: userId != null && (userId === ownerId || grantedAdminIds.includes(userId)),
  };
}

async function requireOwnerStudio(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select({ id: usersTable.id, isAdmin: usersTable.isAdmin })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  if (!(await touchAdminSession(req, userId))) {
    res.status(401).json({ error: "Admin session expired. Please sign in again." });
    return;
  }
  const access = await getAccess(req);
  if (!access.canAccess) {
    res.status(403).json({ error: "Owner Studio access has not been granted" });
    return;
  }
  next();
}

async function requireOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireOwnerStudio(req, res, async () => {
    const access = await getAccess(req);
    if (!access.isOwner) {
      res.status(403).json({ error: "Only the FirstPick Owner can change Owner Studio settings" });
      return;
    }
    next();
  });
}

function cleanSlug(value: unknown): string {
  return String(value ?? "")
    .trim().toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isPagePermissions(value: unknown): value is PagePermissions {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!["owner", "admins", "selected"].includes(String(candidate.mode))) return false;
  return Array.isArray(candidate.adminIds)
    && candidate.adminIds.every((id) => Number.isInteger(Number(id)) && Number(id) > 0);
}

function normalizePermissions(value: unknown): PagePermissions {
  if (isPagePermissions(value)) {
    return {
      mode: value.mode,
      adminIds: [...new Set(value.adminIds.map(Number))],
    };
  }
  return { mode: "owner", adminIds: [] };
}

function isContent(value: unknown): value is StudioContent {
  return Boolean(value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).sections));
}

function safeStudioPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const path = value.trim();
  if (path.startsWith("/") || /^https:\/\//i.test(path)) return path.slice(0, 1200);
  throw new Error("Studio links must be a FirstPick path or HTTPS URL.");
}

function normalizeStudioEvents(value: unknown): SafeStudioEvent[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 40) throw new Error("Studio events must contain up to 40 supported events.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Studio event ${index + 1} is invalid.`);
    const event = item as Record<string, unknown>;
    const trigger = String(event.trigger ?? "");
    if (!SAFE_EVENT_TRIGGERS.has(trigger)) throw new Error(`Studio event trigger "${trigger}" is not supported.`);
    if (!Array.isArray(event.actions) || event.actions.length === 0 || event.actions.length > 8) {
      throw new Error("Each Studio event needs between one and eight safe actions.");
    }
    const actions = event.actions.map((raw, actionIndex) => {
      if (!raw || typeof raw !== "object") throw new Error(`Studio event action ${actionIndex + 1} is invalid.`);
      const action = raw as Record<string, unknown>;
      const type = String(action.type ?? "");
      if (!SAFE_EVENT_ACTIONS.has(type)) throw new Error(`Studio action "${type}" is not supported.`);
      const output: SafeStudioAction = { type: type as SafeStudioAction["type"] };
      if (type === "show-notification") {
        const message = String(action.message ?? "").trim().slice(0, 240);
        if (!message) throw new Error("Notification actions need a message.");
        output.message = message;
      }
      if (type === "navigate") {
        output.href = safeStudioPath(action.href);
        if (!output.href) throw new Error("Navigation actions need a safe destination.");
      }
      if (type === "open-product") {
        const productId = Number(action.productId);
        if (!Number.isInteger(productId) || productId <= 0) throw new Error("Open product actions need a valid product ID.");
        output.productId = productId;
      }
      if (type === "play-sound") {
        output.soundUrl = safeStudioPath(action.soundUrl);
        if (!output.soundUrl) throw new Error("Play sound actions need an HTTPS or FirstPick audio URL.");
      }
      if (type === "trigger-animation") {
        const targetId = String(action.targetId ?? "").trim().slice(0, 120);
        if (!targetId) throw new Error("Animation actions need an element target.");
        output.targetId = targetId;
      }
      return output;
    });
    return {
      id: String(event.id ?? `event-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || `event-${index + 1}`,
      trigger,
      targetId: typeof event.targetId === "string" ? event.targetId.slice(0, 120) : undefined,
      enabled: event.enabled !== false,
      actions,
    };
  });
}

function normalizeContent(value: unknown): StudioContent {
  if (!isContent(value)) return { sections: [] };
  const content = value as StudioContent;
  for (const section of content.sections) {
    for (const element of section.elements ?? []) {
      for (const field of ["href", "url", "imageUrl"] as const) {
        const raw = element[field];
        if (typeof raw !== "string" || !raw.trim()) continue;
        const url = raw.trim();
        const safe = url.startsWith("/") || /^https:\/\//i.test(url);
        if (!safe) throw new Error(`${field} must be a FirstPick path or HTTPS URL.`);
      }
    }
  }
  return { ...content, events: normalizeStudioEvents(content.events) };
}

function asPagePayload(page: typeof ownerStudioPagesTable.$inferSelect) {
  return {
    ...page,
    permissions: normalizePermissions(page.permissions),
    content: normalizeContent(page.content),
    publishedContent: page.publishedContent && isContent(page.publishedContent) ? page.publishedContent : null,
  };
}

function canAccessPage(page: typeof ownerStudioPagesTable.$inferSelect, access: Awaited<ReturnType<typeof getAccess>>): boolean {
  if (access.isOwner) return true;
  const permissions = normalizePermissions(page.permissions);
  if (permissions.mode === "admins") return access.canAccess;
  return permissions.mode === "selected" && access.userId != null && permissions.adminIds.includes(access.userId);
}

async function getAccessiblePage(id: number, req: Request) {
  const [page] = await db.select().from(ownerStudioPagesTable).where(eq(ownerStudioPagesTable.id, id)).limit(1);
  if (!page) return { page: null, allowed: false };
  return { page, allowed: canAccessPage(page, await getAccess(req)) };
}

async function saveVersion(page: typeof ownerStudioPagesTable.$inferSelect, userId: number, content = page.content, version = page.version) {
  await db.insert(ownerStudioVersionsTable).values({
    pageId: page.id,
    version,
    title: page.title,
    slug: page.slug,
    content: normalizeContent(content),
    pageType: page.pageType,
    status: page.status,
    createdBy: userId,
  }).onConflictDoNothing();
}

router.get("/owner-studio/access", async (req, res): Promise<void> => {
  const userId = sessionUserId(req);
  if (!userId) {
    res.json({ canAccess: false, isOwner: false, ownerId: null, grantedAdminIds: [] });
    return;
  }
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.isAdmin) {
    res.json({ canAccess: false, isOwner: false, ownerId: null, grantedAdminIds: [] });
    return;
  }
  const access = await getAccess(req);
  res.json({
    canAccess: access.canAccess,
    isOwner: access.isOwner,
    ownerId: access.ownerId,
    grantedAdminIds: access.grantedAdminIds,
  });
});

router.get("/owner-studio/toolbox", requireOwnerStudio, async (_req, res): Promise<void> => {
  const [setting] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable).where(eq(siteSettingsTable.key, TOOLBOX_KEY)).limit(1);
  const raw = extractJson<unknown>(setting?.value, []);
  const items = Array.isArray(raw) ? raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const title = String(candidate.title ?? "").trim().slice(0, 120);
    try {
      const section = normalizeContent({ sections: [candidate.section] }).sections[0];
      if (!title || !section) return [];
      return [{ id: String(candidate.id ?? `toolbox-${index}`).slice(0, 120), title, section }];
    } catch {
      return [];
    }
  }) : [];
  res.json({ items });
});

router.post("/owner-studio/toolbox", requireOwner, async (req, res): Promise<void> => {
  const title = String(req.body?.title ?? "").trim().slice(0, 120);
  if (!title) { res.status(400).json({ error: "A toolbox item name is required" }); return; }
  let section: StudioContent["sections"][number];
  try {
    section = normalizeContent({ sections: [req.body?.section] }).sections[0];
    if (!section) throw new Error("A valid section is required.");
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid toolbox section" });
    return;
  }
  const [setting] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable).where(eq(siteSettingsTable.key, TOOLBOX_KEY)).limit(1);
  const existing = extractJson<ToolboxItem[]>(setting?.value, []).slice(0, 49);
  const item: ToolboxItem = {
    id: `toolbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    section,
  };
  const items = [item, ...existing];
  await db.insert(siteSettingsTable).values({ key: TOOLBOX_KEY, value: JSON.stringify(items) })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(items), updatedAt: new Date() } });
  res.status(201).json({ item });
});

router.delete("/owner-studio/toolbox/:id", requireOwner, async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "");
  const [setting] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable).where(eq(siteSettingsTable.key, TOOLBOX_KEY)).limit(1);
  const existing = extractJson<ToolboxItem[]>(setting?.value, []);
  const items = existing.filter((item) => item?.id !== id);
  await db.insert(siteSettingsTable).values({ key: TOOLBOX_KEY, value: JSON.stringify(items) })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(items), updatedAt: new Date() } });
  res.json({ ok: true });
});

router.get("/owner-studio/pages", requireOwnerStudio, async (_req, res): Promise<void> => {
  const pages = await db.select().from(ownerStudioPagesTable).orderBy(desc(ownerStudioPagesTable.updatedAt));
  const access = await getAccess(_req);
  res.json(pages.filter((page) => canAccessPage(page, access)).map(asPagePayload));
});

router.get("/owner-studio/system-page", async (req, res): Promise<void> => {
  const route = String(req.query.route ?? "").trim().slice(0, 180);
  if (!SYSTEM_PAGE_ROUTES.has(route)) {
    res.status(404).json({ error: "FirstPick page layer not found" });
    return;
  }
  const published = await db.select().from(ownerStudioPagesTable)
    .where(eq(ownerStudioPagesTable.status, "published"))
    .orderBy(desc(ownerStudioPagesTable.updatedAt));
  const page = published.find((candidate) => {
    const content = candidate.publishedContent as Record<string, unknown> | null;
    return content?.systemRoute === route && candidate.pageType === "store";
  });
  if (!page) {
    res.status(204).end();
    return;
  }
  res.json({ title: page.title, content: page.publishedContent });
});

router.get("/owner-studio/admin-system-page", requireOwnerStudio, async (req, res): Promise<void> => {
  const route = String(req.query.route ?? "").trim().slice(0, 180);
  if (!SYSTEM_PAGE_ROUTES.has(route) || !route.startsWith("/admin")) {
    res.status(404).json({ error: "Admin page layer not found" });
    return;
  }
  const published = await db.select().from(ownerStudioPagesTable)
    .where(eq(ownerStudioPagesTable.status, "published"))
    .orderBy(desc(ownerStudioPagesTable.updatedAt));
  const access = await getAccess(req);
  const page = published.find((candidate) => {
    const content = candidate.publishedContent as Record<string, unknown> | null;
    return content?.systemRoute === route && candidate.pageType === "admin" && canAccessPage(candidate, access);
  });
  if (!page) {
    res.status(204).end();
    return;
  }
  res.json({ title: page.title, content: page.publishedContent });
});

router.post("/owner-studio/pages", requireOwnerStudio, async (req, res): Promise<void> => {
  const userId = sessionUserId(req);
  const title = String(req.body?.title ?? "").trim().slice(0, 120);
  const slug = cleanSlug(req.body?.slug);
  const pageType = String(req.body?.pageType ?? "store");
  if (!userId || !title || !slug || !PAGE_TYPES.has(pageType)) {
    res.status(400).json({ error: "A title, valid URL slug, and page type are required" });
    return;
  }
  if (PROTECTED_SLUGS.has(slug)) {
    res.status(400).json({ error: "That URL is reserved for a protected FirstPick page" });
    return;
  }
  const [page] = await db.insert(ownerStudioPagesTable).values({
    title,
    slug,
    pageType,
    status: "draft",
    content: { sections: [] },
    permissions: req.body?.permissions
      ? normalizePermissions(req.body.permissions)
      : ((await getAccess(req)).isOwner ? { mode: "owner", adminIds: [] } : { mode: "selected", adminIds: [userId] }),
    createdBy: userId,
  }).returning();
  res.status(201).json(asPagePayload(page));
});

router.get("/owner-studio/pages/:id", requireOwnerStudio, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }
  const { page, allowed } = await getAccessiblePage(id, req);
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  if (!allowed) { res.status(403).json({ error: "Page access has not been granted" }); return; }
  res.json(asPagePayload(page));
});

router.patch("/owner-studio/pages/:id", requireOwnerStudio, async (req, res): Promise<void> => {
  const userId = sessionUserId(req);
  const id = Number(req.params.id);
  if (!userId || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }
  const { page: current, allowed } = await getAccessiblePage(id, req);
  if (!current) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  if (!allowed) { res.status(403).json({ error: "Page access has not been granted" }); return; }
  const access = await getAccess(req);
  const expectedVersion = Number(req.body?.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion !== current.version) {
    res.status(409).json({ error: "This page changed elsewhere. Refresh before saving again.", page: asPagePayload(current) });
    return;
  }
  const updates: Partial<typeof ownerStudioPagesTable.$inferInsert> = { updatedAt: new Date() };
  if (req.body?.title !== undefined) {
    const title = String(req.body.title).trim().slice(0, 120);
    if (!title) { res.status(400).json({ error: "Page title cannot be empty" }); return; }
    updates.title = title;
  }
  if (req.body?.slug !== undefined) {
    const slug = cleanSlug(req.body.slug);
    if (!access.isOwner) {
      res.status(403).json({ error: "Only the owner can change a page URL" });
      return;
    }
    if (!slug || PROTECTED_SLUGS.has(slug)) {
      res.status(400).json({ error: "That URL is reserved or invalid" });
      return;
    }
    updates.slug = slug;
  }
  if (req.body?.content !== undefined) {
    if (!isContent(req.body.content)) {
      res.status(400).json({ error: "Page content must contain a sections array" });
      return;
    }
    try {
      updates.content = normalizeContent(req.body.content);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid page content" });
      return;
    }
  }
  if (req.body?.permissions !== undefined) {
    if (!access.isOwner) { res.status(403).json({ error: "Only the owner can change page permissions" }); return; }
    updates.permissions = normalizePermissions(req.body.permissions);
  }
  if (updates.content !== undefined) updates.version = current.version + 1;

  const [page] = await db.update(ownerStudioPagesTable).set(updates)
    .where(and(eq(ownerStudioPagesTable.id, id), eq(ownerStudioPagesTable.version, expectedVersion))).returning();
  if (!page) { res.status(409).json({ error: "This page changed elsewhere. Refresh before saving again." }); return; }
  if (updates.content !== undefined) await saveVersion(page, userId, updates.content, page.version);
  res.json(page ? asPagePayload(page) : page);
});

router.post("/owner-studio/pages/:id/publish", requireOwner, async (req, res): Promise<void> => {
  const userId = sessionUserId(req);
  const id = Number(req.params.id);
  if (!userId || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }
  const [current] = await db.select().from(ownerStudioPagesTable).where(eq(ownerStudioPagesTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Page not found" }); return; }
  const nextVersion = current.version + 1;
  const [page] = await db.transaction(async (tx) => {
    const [updated] = await tx.update(ownerStudioPagesTable).set({
      publishedContent: normalizeContent(current.content),
      status: "published",
      version: nextVersion,
      publishedBy: userId,
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(ownerStudioPagesTable.id, id)).returning();
    if (updated) {
      await tx.insert(ownerStudioVersionsTable).values({
        pageId: updated.id,
        version: nextVersion,
        title: updated.title,
        slug: updated.slug,
        content: normalizeContent(updated.content),
        pageType: updated.pageType,
        status: "published",
        createdBy: userId,
      }).onConflictDoNothing();
    }
    return [updated];
  });
  res.json(page ? asPagePayload(page) : page);
});

router.post("/owner-studio/pages/:id/duplicate", requireOwnerStudio, async (req, res): Promise<void> => {
  const userId = sessionUserId(req);
  const id = Number(req.params.id);
  if (!userId || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }
  const { page: original, allowed } = await getAccessiblePage(id, req);
  if (!original) { res.status(404).json({ error: "Page not found" }); return; }
  if (!allowed) { res.status(403).json({ error: "Page access has not been granted" }); return; }
  let slug = cleanSlug(`${original.slug}-copy`);
  let suffix = 2;
  while ((await db.select({ id: ownerStudioPagesTable.id }).from(ownerStudioPagesTable)
    .where(and(eq(ownerStudioPagesTable.pageType, original.pageType), eq(ownerStudioPagesTable.slug, slug))).limit(1)).length) {
    slug = cleanSlug(`${original.slug}-copy-${suffix++}`);
  }
  const [copy] = await db.insert(ownerStudioPagesTable).values({
    title: `${original.title} Copy`,
    slug,
    pageType: original.pageType,
    status: "draft",
    content: normalizeContent(original.content),
    permissions: normalizePermissions(original.permissions),
    createdBy: userId,
  }).returning();
  res.status(201).json(asPagePayload(copy));
});

router.delete("/owner-studio/pages/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid page id" }); return; }
  const [page] = await db.select({ id: ownerStudioPagesTable.id, slug: ownerStudioPagesTable.slug })
    .from(ownerStudioPagesTable).where(eq(ownerStudioPagesTable.id, id)).limit(1);
  if (!page) { res.status(404).json({ error: "Page not found" }); return; }
  if (PROTECTED_SLUGS.has(page.slug)) {
    res.status(400).json({ error: "Protected FirstPick pages cannot be deleted" });
    return;
  }
  await db.delete(ownerStudioPagesTable).where(eq(ownerStudioPagesTable.id, id));
  res.json({ ok: true });
});

router.get("/owner-studio/pages/:id/versions", requireOwnerStudio, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid page id" }); return; }
  const { page, allowed } = await getAccessiblePage(id, req);
  if (!page) { res.status(404).json({ error: "Page not found" }); return; }
  if (!allowed) { res.status(403).json({ error: "Page access has not been granted" }); return; }
  const versions = await db.select({
    id: ownerStudioVersionsTable.id,
    pageId: ownerStudioVersionsTable.pageId,
    version: ownerStudioVersionsTable.version,
    title: ownerStudioVersionsTable.title,
    slug: ownerStudioVersionsTable.slug,
    pageType: ownerStudioVersionsTable.pageType,
    status: ownerStudioVersionsTable.status,
    content: ownerStudioVersionsTable.content,
    createdAt: ownerStudioVersionsTable.createdAt,
  }).from(ownerStudioVersionsTable)
    .where(eq(ownerStudioVersionsTable.pageId, id))
    .orderBy(desc(ownerStudioVersionsTable.version));
  res.json(versions);
});

router.post("/owner-studio/pages/:id/restore/:version", requireOwner, async (req, res): Promise<void> => {
  const userId = sessionUserId(req);
  const id = Number(req.params.id);
  const version = Number(req.params.version);
  if (!userId || !Number.isInteger(id) || id <= 0 || !Number.isInteger(version) || version <= 0) {
    res.status(400).json({ error: "Invalid page or version" });
    return;
  }
  const [snapshot] = await db.select().from(ownerStudioVersionsTable)
    .where(and(eq(ownerStudioVersionsTable.pageId, id), eq(ownerStudioVersionsTable.version, version))).limit(1);
  if (!snapshot) { res.status(404).json({ error: "Version not found" }); return; }
  const [current] = await db.select().from(ownerStudioPagesTable).where(eq(ownerStudioPagesTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Page not found" }); return; }
  const [page] = await db.update(ownerStudioPagesTable).set({
    content: normalizeContent(snapshot.content),
    version: current.version + 1,
    updatedAt: new Date(),
  }).where(eq(ownerStudioPagesTable.id, id)).returning();
  if (page) await saveVersion(page, userId, page.content, page.version);
  res.json(page ? asPagePayload(page) : page);
});

router.get("/owner-studio/admins", requireOwner, async (_req, res): Promise<void> => {
  const admins = await db.select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable).where(eq(usersTable.isAdmin, true)).orderBy(asc(usersTable.username));
  res.json(admins);
});

router.patch("/owner-studio/grants", requireOwner, async (req, res): Promise<void> => {
  const ownerId = await getOwnerId();
  const ids = Array.isArray(req.body?.adminIds)
    ? [...new Set(req.body.adminIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0 && id !== ownerId))]
    : [];
  const validAdmins = ids.length
    ? await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.isAdmin, true), inArray(usersTable.id, ids)))
    : [];
  const adminIds = validAdmins.map((admin) => admin.id);
  await db.insert(siteSettingsTable).values({ key: GRANTS_KEY, value: JSON.stringify(adminIds) })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(adminIds), updatedAt: new Date() } });
  res.json({ adminIds });
});

function defaultSound(): SoundValue {
  return { url: "", enabled: true, volume: 0.7 };
}

router.get("/owner-studio/sounds", requireOwnerStudio, async (_req, res): Promise<void> => {
  const settings = await db.select().from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, SOUND_KEYS.map((key) => `${SOUND_PREFIX}${key}`)));
  const byKey = new Map(settings.map((setting) => [setting.key.slice(SOUND_PREFIX.length), extractJson<SoundValue>(setting.value, defaultSound())]));
  const sounds = Object.fromEntries(SOUND_KEYS.map((key) => [key, byKey.get(key) ?? defaultSound()]));
  res.json({ sounds });
});

router.patch("/owner-studio/sounds", requireOwner, async (req, res): Promise<void> => {
  const input = req.body?.sounds;
  if (!input || typeof input !== "object") { res.status(400).json({ error: "Sound settings are required" }); return; }
  const sounds: Record<string, SoundValue> = {};
  for (const key of SOUND_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (!value || typeof value !== "object") continue;
    const candidate = value as Record<string, unknown>;
    sounds[key] = {
      url: String(candidate.url ?? "").trim().slice(0, 1200),
      enabled: candidate.enabled !== false,
      volume: Math.min(1, Math.max(0, Number(candidate.volume ?? 0.7) || 0)),
    };
    await db.insert(siteSettingsTable).values({ key: `${SOUND_PREFIX}${key}`, value: JSON.stringify(sounds[key]) })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(sounds[key]), updatedAt: new Date() } });
  }
  res.json({ sounds });
});

router.post("/owner-studio/validate-code", requireOwnerStudio, async (req, res): Promise<void> => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const errors: string[] = [];
  const warnings: string[] = [];
  if (code.length > 50_000) errors.push("Custom code must be 50,000 characters or less.");
  const blockedPatterns: Array<[RegExp, string]> = [
    [/\b(import|require|process|child_process|eval|Function)\b/i, "Modules, runtime access, and dynamic evaluation are not allowed."],
    [/\b(document\.cookie|localStorage|sessionStorage|indexedDB)\b/i, "Browser storage and cookies are not available to custom items."],
    [/\b(fetch|XMLHttpRequest|WebSocket)\b/i, "Network access is not available; use the documented FirstPick API."],
    [/\b(password|secret|authorization|payment|database|shell)\b/i, "Sensitive systems and credentials are not available to custom items."],
  ];
  for (const [pattern, message] of blockedPatterns) {
    if (pattern.test(code)) errors.push(message);
  }
  if (/<script\b/i.test(code)) errors.push("Script tags are not supported in visual custom items.");
  if (code.trim() && !code.includes("FirstPick")) warnings.push("Prefer the documented FirstPick API for navigation, notifications, sounds, and animation triggers.");
  res.json({ valid: errors.length === 0, errors, warnings });
});

router.get("/owner-studio/admin-page/:slug", requireOwnerStudio, async (req, res): Promise<void> => {
  const slug = cleanSlug(req.params.slug);
  if (!slug) { res.status(404).json({ error: "Admin page not found" }); return; }
  const [page] = await db.select({
    id: ownerStudioPagesTable.id,
    title: ownerStudioPagesTable.title,
    slug: ownerStudioPagesTable.slug,
    pageType: ownerStudioPagesTable.pageType,
    status: ownerStudioPagesTable.status,
    content: ownerStudioPagesTable.content,
    permissions: ownerStudioPagesTable.permissions,
  }).from(ownerStudioPagesTable)
    .where(and(eq(ownerStudioPagesTable.slug, slug), eq(ownerStudioPagesTable.pageType, "admin")))
    .limit(1);
  if (!page) { res.status(404).json({ error: "Admin page not found" }); return; }
  const access = await getAccess(req);
  if (!canAccessPage(page as typeof ownerStudioPagesTable.$inferSelect, access)) {
    res.status(403).json({ error: "Admin page access has not been granted" });
    return;
  }
  try {
    res.json({ ...page, content: normalizeContent(page.content) });
  } catch {
    res.status(404).json({ error: "Admin page not found" });
  }
});

router.get("/owner-studio/public/:slug", async (req, res): Promise<void> => {
  const slug = cleanSlug(req.params.slug);
  if (!slug) { res.status(404).json({ error: "Page not found" }); return; }
  const [page] = await db.select({
    id: ownerStudioPagesTable.id,
    title: ownerStudioPagesTable.title,
    slug: ownerStudioPagesTable.slug,
    pageType: ownerStudioPagesTable.pageType,
    content: ownerStudioPagesTable.publishedContent,
    status: ownerStudioPagesTable.status,
  }).from(ownerStudioPagesTable)
    .where(and(eq(ownerStudioPagesTable.slug, slug), eq(ownerStudioPagesTable.pageType, "store"), eq(ownerStudioPagesTable.status, "published")))
    .limit(1);
  if (!page || !isContent(page.content)) { res.status(404).json({ error: "Page not found" }); return; }
  try {
    res.json({ ...page, content: normalizeContent(page.content) });
  } catch {
    res.status(404).json({ error: "Page not found" });
  }
});

export default router;