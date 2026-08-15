import { Router } from "express";
import { db } from "@workspace/db";
import { requireAdmin } from "../lib/auth-middleware";
import { sql } from "drizzle-orm";
import { initPush, saveAdminSubscription, sendAdminChatPush } from "../lib/push";

const router = Router();

// SSE registry
const chatClients = new Map<string, { res: any; adminName: string; adminId: string }>();

function broadcastChat(data: object) {
  const chunk = `data: ${JSON.stringify(data)}\n\n`;
  for (const [, client] of chatClients) {
    try { client.res.write(chunk); client.res.flush?.(); } catch { chatClients.delete([...chatClients.entries()].find(([,v]) => v.res === client.res)?.[0] ?? ""); }
  }
}

export function getOnlineAdmins() {
  return [...chatClients.values()].map(c => ({ adminId: c.adminId, adminName: c.adminName }));
}

// WebRTC signaling via SSE
function sendToAdmin(adminId: string, data: object) {
  const client = chatClients.get(adminId);
  if (!client) return;
  try { const chunk = `data: ${JSON.stringify(data)}\n\n`; client.res.write(chunk); client.res.flush?.(); } catch {}
}

let _chatMigrated = false;
async function ensureChatTables() {
  if (_chatMigrated) return; _chatMigrated = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_chat_messages (
      id SERIAL PRIMARY KEY,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      metadata TEXT,
      reactions TEXT NOT NULL DEFAULT '{}',
      read_by TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS admin_profiles (
      admin_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#ff6600',
      last_name_change TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
ensureChatTables().catch(console.error);

// SSE stream
router.get("/admin/chat/stream", requireAdmin, async (req, res) => {
  const adminId = req.query.adminId as string || "admin";
  const adminName = req.query.adminName as string || "Admin";
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  
  chatClients.set(adminId, { res, adminName, adminId });
  
  // Notify others that this admin joined
  broadcastChat({ type: "PRESENCE", adminId, adminName, online: true, onlineAdmins: getOnlineAdmins() });
  
  // Heartbeat
  const hb = setInterval(() => { try { res.write(":\n\n"); (res as any).flush?.(); } catch { clearInterval(hb); }}, 25000);
  
  req.on("close", () => {
    chatClients.delete(adminId);
    clearInterval(hb);
    broadcastChat({ type: "PRESENCE", adminId, adminName, online: false, onlineAdmins: getOnlineAdmins() });
  });
});

// Send message
router.post("/admin/chat/messages", requireAdmin, async (req, res) => {
  const { senderId, senderName, message, type = "text", metadata } = req.body as Record<string, string>;
  if (!message?.trim()) { res.status(400).json({ error: "Empty message" }); return; }
  await ensureChatTables();
  
  const [row] = await db.execute<{ id: number; created_at: string }>(
    sql`INSERT INTO admin_chat_messages (sender_id, sender_name, message, type, metadata) 
        VALUES (${senderId}, ${senderName}, ${message}, ${type ?? "text"}, ${metadata ?? null})
        RETURNING id, created_at`
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  
  const newMsg = { id: row?.id, senderId, senderName, message, type: type ?? "text", metadata, reactions: {}, readBy: [senderId], createdAt: row?.created_at ?? new Date().toISOString() };
  broadcastChat({ type: "MESSAGE", message: newMsg });
  // Push to admins who are not currently in the SSE stream (app closed / home screen)
  sendAdminChatPush(senderName, message, senderId).catch(() => {});
  res.status(201).json(newMsg);
});

// Admin push subscribe
router.post("/admin/chat/push-subscribe", requireAdmin, async (req, res) => {
  const { endpoint, p256dh, auth, adminId } = req.body as Record<string, string>;
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: "Missing fields" }); return; }
  await initPush();
  await saveAdminSubscription(endpoint, p256dh, auth, adminId);
  res.json({ ok: true });
});

// Get messages
router.get("/admin/chat/messages", requireAdmin, async (req, res) => {
  await ensureChatTables();
  const rows = await db.execute<any>(
    sql`SELECT id, sender_id, sender_name, message, type, metadata, reactions, read_by, created_at 
        FROM admin_chat_messages ORDER BY created_at ASC LIMIT 200`
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  
  res.json(rows.map((r: any) => ({
    id: r.id, senderId: r.sender_id, senderName: r.sender_name, message: r.message,
    type: r.type, metadata: r.metadata, reactions: JSON.parse(r.reactions ?? "{}"),
    readBy: JSON.parse(r.read_by ?? "[]"), createdAt: r.created_at
  })));
});

// React to message
router.post("/admin/chat/messages/:id/react", requireAdmin, async (req, res) => {
  const msgId = Number(req.params.id);
  const { adminId, emoji } = req.body as { adminId: string; emoji: string };
  await ensureChatTables();
  
  const [existing] = await db.execute<{ reactions: string }>(
    sql`SELECT reactions FROM admin_chat_messages WHERE id = ${msgId}`
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  
  const reactions: Record<string, string[]> = JSON.parse(existing?.reactions ?? "{}");
  if (!reactions[emoji]) reactions[emoji] = [];
  const idx = reactions[emoji].indexOf(adminId);
  if (idx >= 0) reactions[emoji].splice(idx, 1); else reactions[emoji].push(adminId);
  if (reactions[emoji].length === 0) delete reactions[emoji];
  
  await db.execute(sql`UPDATE admin_chat_messages SET reactions = ${JSON.stringify(reactions)} WHERE id = ${msgId}`);
  broadcastChat({ type: "REACTION", messageId: msgId, reactions });
  res.json({ reactions });
});

// WebRTC signaling (supports broadcast=true to ring all online admins)
router.post("/admin/chat/signal", requireAdmin, (req, res) => {
  const { to, from, fromName, signal, broadcast } = req.body as { to?: string; from: string; fromName: string; signal: object; broadcast?: boolean };
  if (broadcast) {
    // Ring all other online admins
    for (const [adminId] of chatClients) {
      if (adminId !== from) sendToAdmin(adminId, { type: "WEBRTC_SIGNAL", from, fromName, signal });
    }
  } else if (to) {
    sendToAdmin(to, { type: "WEBRTC_SIGNAL", from, fromName, signal });
  }
  res.json({ ok: true });
});

// Online admins
router.get("/admin/chat/online", requireAdmin, (_req, res) => {
  res.json(getOnlineAdmins());
});

// Admin profile (name)
router.get("/admin/profile/:adminId", requireAdmin, async (req, res) => {
  await ensureChatTables();
  const rows = await db.execute<any>(
    sql`SELECT * FROM admin_profiles WHERE admin_id = ${req.params.adminId}`
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  res.json(rows[0] ?? null);
});

router.post("/admin/profile", requireAdmin, async (req, res) => {
  const { adminId, displayName, avatarColor } = req.body as Record<string, string>;
  if (!adminId || !displayName?.trim()) { res.status(400).json({ error: "adminId and displayName required" }); return; }
  await ensureChatTables();
  
  // Check 7-day cooldown for name change
  const [existing] = await db.execute<{ last_name_change: string | null }>(
    sql`SELECT last_name_change FROM admin_profiles WHERE admin_id = ${adminId}`
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  
  if (existing?.last_name_change) {
    const lastChange = new Date(existing.last_name_change);
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      const daysLeft = Math.ceil(7 - daysSince);
      res.status(429).json({ error: `You can change your name again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.` });
      return;
    }
  }
  
  await db.execute(sql`
    INSERT INTO admin_profiles (admin_id, display_name, avatar_color, last_name_change)
    VALUES (${adminId}, ${displayName.trim()}, ${avatarColor ?? "#ff6600"}, NOW())
    ON CONFLICT (admin_id) DO UPDATE SET display_name = EXCLUDED.display_name, 
      avatar_color = COALESCE(EXCLUDED.avatar_color, admin_profiles.avatar_color),
      last_name_change = NOW()
  `);
  broadcastChat({ type: "PRESENCE", adminId, adminName: displayName.trim(), online: chatClients.has(adminId), onlineAdmins: getOnlineAdmins() });
  res.json({ ok: true });
});

export default router;
