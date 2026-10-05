import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "../lib/auth-middleware";
import { requireOwner, adminAccess, ownerId, PERMISSIONS } from "../lib/admin-permissions";
import { ensureManagement, rows } from "../lib/management-db";
import { logAdminActivity } from "./admin-activity";

const router = Router();
router.get("/admin/access",requireAdmin,async(req,res)=>{res.json(await adminAccess(Number(req.session?.userId)));});
const accessInput = z.object({
  role: z.enum(["admin", "owner"]), permissions: z.array(z.enum(PERMISSIONS)).max(20),
});
router.get("/admin/team", requireAdmin, requireOwner, async (_req, res): Promise<void> => {
  const users = await db.select({ id: usersTable.id, username: usersTable.username }).from(usersTable).where(eq(usersTable.isAdmin, true));
  res.json(await Promise.all(users.map(async user => ({ ...user, ...await adminAccess(user.id) }))));
});
router.post("/admin/team", requireAdmin, requireOwner, async (req, res): Promise<void> => {
  const parsed = accessInput.extend({
    username: z.string().trim().min(3).max(80), password: z.string().min(12).max(128),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Username, password of at least 12 characters, and valid permissions are required." }); return; }
  await ensureManagement();
  const b = parsed.data;
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, b.username));
  if (existing.length) { res.status(409).json({ error: "Username already exists." }); return; }
  const passwordHash = await bcrypt.hash(b.password, 12);
  const user = await db.transaction(async tx => {
    const [user] = await tx.insert(usersTable).values({ username: b.username, passwordHash, isAdmin: true }).returning({ id: usersTable.id, username: usersTable.username });
    await tx.execute(sql`INSERT INTO imaginate_admin_roles(user_id,role,permissions) VALUES(${user.id},${b.role},${JSON.stringify(b.permissions)}::jsonb)`);
    return user;
  });
  await logAdminActivity(`Admin ${req.session?.userId}`, "Admin account created", `admin:${user.id}`, b.username);
  res.status(201).json({ ...user, role: b.role, permissions: b.permissions });
});
router.patch("/admin/team/:id", requireAdmin, requireOwner, async (req, res): Promise<void> => {
  const parsed = accessInput.safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || !Number.isInteger(id)) { res.sendStatus(400); return; }
  if (id === await ownerId() && parsed.data.role !== "owner") {
    res.status(409).json({ error: "The primary owner cannot be demoted." }); return;
  }
  const [user] = await db.select({ id: usersTable.id, username: usersTable.username }).from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.sendStatus(404); return; }
  await ensureManagement();
  await db.execute(sql`INSERT INTO imaginate_admin_roles(user_id,role,permissions) VALUES(${id},${parsed.data.role},${JSON.stringify(parsed.data.permissions)}::jsonb)
    ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,permissions=EXCLUDED.permissions`);
  await logAdminActivity(`Admin ${req.session?.userId}`, "Admin permissions changed", `admin:${id}`, user.username);
  res.json({ ...user, ...parsed.data });
});
router.delete("/admin/team/:id",requireAdmin,requireOwner,async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0){res.sendStatus(400);return;}
  if(id===await ownerId()||id===req.session?.userId){res.status(409).json({error:"The primary owner and your current account cannot be removed."});return;}
  await db.update(usersTable).set({isAdmin:false}).where(eq(usersTable.id,id));
  await db.execute(sql`UPDATE admin_device_sessions SET revoked_at=NOW() WHERE user_id=${id}`);
  await logAdminActivity(`Admin ${req.session?.userId}`,"Admin access removed",String(id));
  res.json({ok:true});
});
export default router;
