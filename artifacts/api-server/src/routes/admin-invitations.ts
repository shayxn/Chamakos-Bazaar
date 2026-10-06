import { Router, type Request, type Response, type NextFunction } from "express";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { requireOwner, adminAccess, PERMISSIONS } from "../lib/admin-permissions";
import { ensureManagement, rows } from "../lib/management-db";
import { logAdminActivity } from "./admin-activity";

const router = Router();
const tokenInput = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const inviteInput = z.object({ permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length) });
const joinInput = tokenInput.extend({
  username: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9_.-]+$/),
  password: z.string().min(12).max(128),
});
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const attempts = new Map<string, { count: number; until: number }>();
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = `${req.ip}:${req.path}`;
  const attempt = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 };
  if (attempt.count >= 20 || (!attempts.has(key) && attempts.size >= 10_000)) {
    res.setHeader("Retry-After", "900");
    res.status(429).json({ error: "Too many attempts. Please try again later." }); return;
  }
  attempt.count++;
  attempts.set(key, attempt);
  next();
}
type Invitation = { id: string; created_by: number; permissions: string[]; expires_at: Date | string; accepted_at: unknown; revoked_at: unknown };
const available = (invite?: Invitation) => !!invite && !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at).getTime() > Date.now();
async function creatorCanInvite(id: number) {
  const user = rows(await db.execute(sql`SELECT is_admin FROM users WHERE id=${id}`))[0];
  return user?.is_admin === true && (await adminAccess(id)).isOwner;
}
function invalid(res: Response, invite?: Invitation) {
  const reason = !invite ? "not valid" : invite.accepted_at ? "already used" : invite.revoked_at ? "revoked" : new Date(invite.expires_at).getTime() <= Date.now() ? "expired" : "revoked";
  res.status(410).json({ error: `This invitation is ${reason}. Ask the owner for a new link.` });
}

router.get("/admin-invite.html", (req, res) => {
  // The capability is in the URL fragment: it never reaches server logs or link-preview crawlers.
  const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
  const protocol = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim() === "https" ? "https" : "http";
  let origin: string;
  try { origin = new URL(`${protocol}://${host}`).origin; } catch { res.sendStatus(400); return; }
  const joinPath = req.originalUrl.split("?")[0].replace(/\/api\/admin-invite\.html$/, "/admin/join");
  const logo = new URL(joinPath.replace(/\/admin\/join$/, "/imaginate-logo.png"), origin).href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.type("html").send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>You're invited to join the Imaginate admins.</title><meta name="description" content="You're invited to join the Imaginate admins. Press this link to join!"><meta property="og:title" content="You're invited to join the Imaginate admins."><meta property="og:description" content="Press this link to join!"><meta property="og:type" content="website"><meta property="og:image" content="${logo}"><meta name="twitter:card" content="summary"><meta name="twitter:image" content="${logo}"></head><body style="background:#08070c;color:white;font-family:sans-serif;text-align:center;padding:60px 24px"><img src="${logo}" alt="IMAGINATE" width="240"><h1>You're invited to join the Imaginate admins.</h1><p>Press this link to join!</p><p>Please enable JavaScript to accept your invitation.</p><script>location.replace(${JSON.stringify(joinPath).replace(/</g, "\\u003c")}+location.hash)</script></body></html>`);
});

router.post("/admin/invitations", requireAdmin, requireOwner, async (req, res) => {
  const parsed = inviteInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose valid admin permissions." }); return; }
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
  const permissions = [...new Set(parsed.data.permissions)];
  await db.execute(sql`INSERT INTO admin_invitations(id,token_hash,created_by,permissions,expires_at)
    VALUES(${id},${digest(token)},${Number(req.session?.userId)},${JSON.stringify(permissions)}::jsonb,${expiresAt})`);
  await logAdminActivity(`Admin ${req.session?.userId}`, "Admin invitation created", `invitation:${id}`);
  res.status(201).json({ id, token, expiresAt, permissions });
});
router.get("/admin/invitations", requireAdmin, requireOwner, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const invites = rows(await db.execute(sql`SELECT id,permissions,created_at,expires_at,revoked_at,accepted_at
    FROM admin_invitations ORDER BY created_at DESC LIMIT 100`));
  res.json(invites.map(invite => ({ id: invite.id, permissions: invite.permissions, createdAt: invite.created_at, expiresAt: invite.expires_at,
    status: invite.accepted_at ? "accepted" : invite.revoked_at ? "revoked" : new Date(invite.expires_at).getTime() <= Date.now() ? "expired" : "pending" })));
});
router.delete("/admin/invitations/:id", requireAdmin, requireOwner, async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) { res.sendStatus(400); return; }
  const revoked = rows(await db.execute(sql`UPDATE admin_invitations SET revoked_at=NOW()
    WHERE id=${String(req.params.id)} AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`));
  if (!revoked.length) { res.status(409).json({ error: "Invitation is no longer pending." }); return; }
  await logAdminActivity(`Admin ${req.session?.userId}`, "Admin invitation revoked", `invitation:${req.params.id}`);
  res.json({ ok: true });
});
router.post("/admin/invitations/inspect", rateLimit, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = tokenInput.safeParse(req.body);
  if (!parsed.success) { invalid(res); return; }
  const invite = rows(await db.execute(sql`SELECT * FROM admin_invitations WHERE token_hash=${digest(parsed.data.token)}`))[0] as Invitation | undefined;
  if (!available(invite) || !(await creatorCanInvite(invite!.created_by))) { invalid(res, invite); return; }
  res.json({ permissions: invite!.permissions, expiresAt: invite!.expires_at });
});
router.post("/admin/invitations/accept", rateLimit, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = joinInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Use a username of 3–80 letters, numbers, dots, underscores or dashes, and a password of 12–128 characters." }); return; }
  await ensureManagement();
  const lookup = rows(await db.execute(sql`SELECT * FROM admin_invitations WHERE token_hash=${digest(parsed.data.token)}`))[0] as Invitation | undefined;
  if (!available(lookup) || !(await creatorCanInvite(lookup!.created_by))) { invalid(res, lookup); return; }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const user = await db.transaction(async tx => {
      const invite = rows(await tx.execute(sql`SELECT * FROM admin_invitations WHERE token_hash=${digest(parsed.data.token)} FOR UPDATE`))[0] as Invitation | undefined;
      if (!available(invite) || !(await creatorCanInvite(invite!.created_by))) return null;
      const [member] = await tx.insert(usersTable).values({ username: parsed.data.username, passwordHash, isAdmin: true }).returning({ id: usersTable.id, username: usersTable.username });
      // Never accept a role/permission override from the person redeeming the link.
      await tx.execute(sql`INSERT INTO imaginate_admin_roles(user_id,role,permissions)
        VALUES(${member.id},'admin',${JSON.stringify(invite!.permissions)}::jsonb)`);
      await tx.execute(sql`UPDATE admin_invitations SET accepted_at=NOW(),accepted_by=${member.id} WHERE id=${invite!.id}`);
      return member;
    });
    if (!user) { invalid(res); return; }
    await logAdminActivity(user.username, "Admin invitation accepted", `admin:${user.id}`);
    res.status(201).json(user);
  } catch (error: any) {
    if (error?.code === "23505" || error?.cause?.code === "23505") { res.status(409).json({ error: "That username is already taken. Choose another; your invitation is still available." }); return; }
    throw error;
  }
});
export default router;
