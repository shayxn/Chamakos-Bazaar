import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { ensureManagement, rows } from "./management-db";

export const PERMISSIONS = ["products", "orders", "content", "support", "customers", "discounts", "analytics", "notifications", "settings"] as const;

export async function ownerId(): Promise<number | null> {
  const configured = rows(await db.execute(sql`SELECT value FROM site_settings WHERE key = 'owner_studio_owner_id' LIMIT 1`))[0];
  const id = Number(configured?.value);
  if (Number.isInteger(id) && id > 0) return id;
  return rows(await db.execute(sql`SELECT id FROM users WHERE is_admin = TRUE ORDER BY id LIMIT 1`))[0]?.id ?? null;
}

export async function adminAccess(userId: number) {
  await ensureManagement();
  const role = rows(await db.execute(sql`SELECT role, permissions FROM imaginate_admin_roles WHERE user_id = ${userId}`))[0];
  const isOwner = userId === await ownerId() || role?.role === "owner";
  // Existing admin accounts retain access until the owner explicitly restricts them.
  return { isOwner, role: isOwner ? "owner" : "admin", permissions: role?.permissions ?? [...PERMISSIONS] };
}

export async function requireOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = Number((req.session as Record<string, unknown>)?.userId);
  if (!id || !(await adminAccess(id)).isOwner) {
    res.status(403).json({ error: "Only the owner can change this setting." }); return;
  }
  next();
}

export async function enforceAdminPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = Number((req.session as Record<string, unknown>)?.userId);
  const access = await adminAccess(id);
  if (access.isOwner) { next(); return; }
  const path = req.path;
  if(!path.startsWith("/admin/chat")&&/upload|storage/.test(path)&&access.permissions.some((p:string)=>["products","content"].includes(p))){next();return;}
  let permission = "settings";
  if(path.startsWith("/admin/chat")) permission="chat";
  else if (/products|categories|stock-alerts|uploads/.test(path)) permission = "products";
  else if (/orders|refund|abandoned/.test(path)) permission = "orders";
  else if (/support|product-requests/.test(path)) permission = "support";
  else if (/coupons|discount/.test(path)) permission = "discounts";
  else if (/customer|newsletter/.test(path)) permission = "customers";
  else if (/sales|visitor|dashboard/.test(path)) permission = "analytics";
  else if (/push|notification|reminder/.test(path)) permission = "notifications";
  else if (/manage|content|tiktok|reviews|events|games/.test(path)) permission = "content";
  // Device self-service remains available to every authenticated admin.
  if (path.startsWith("/auth/") || path.startsWith("/admin/access") || path.startsWith("/admin/chat") || path.startsWith("/admin/profile") || path.startsWith("/admin/activity")) { next(); return; }
  if (!access.permissions.includes(permission)) {
    res.status(403).json({ error: `You do not have ${permission} permission.` }); return;
  }
  next();
}
