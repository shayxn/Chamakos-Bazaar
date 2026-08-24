import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth-middleware";
import { eq, sql } from "drizzle-orm";
import { initPush, saveAdminSubscription, sendAdminChatPush, sendAdminCallPush } from "../lib/push";

const router = Router();
type Admin = { id: string; name: string };
type Client = { res: any; admin: Admin; deviceId: string };
type RoomDevice = { adminId: string; deviceId: string };
type Room = { initiator: string; members: Map<string, Set<string>>; createdAt: number };
const clients = new Map<string, Client>(); // admin/device; an admin may have several browsers.
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const rooms = new Map<string, Room>();
let migrated = false;

async function me(req: any): Promise<Admin> {
  const id = Number(req.session?.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user?.isAdmin) throw new Error("No authenticated admin");
  return { id: String(user.id), name: user.username };
}
async function tables() {
  if (migrated) return; migrated = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_chat_messages (
      id SERIAL PRIMARY KEY, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL, message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text', conversation_id TEXT NOT NULL DEFAULT 'group',
      client_message_id TEXT, metadata TEXT, reactions TEXT NOT NULL DEFAULT '{}', read_by TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS admin_profiles (
      admin_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#ff6600',
      pfp_data TEXT,
      last_name_change TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS pfp_data TEXT;
    ALTER TABLE admin_chat_messages ADD COLUMN IF NOT EXISTS conversation_id TEXT NOT NULL DEFAULT 'group';
    ALTER TABLE admin_chat_messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS admin_chat_messages_sender_client_message_key
      ON admin_chat_messages(sender_id, client_message_id) WHERE client_message_id IS NOT NULL;
  `);
}
function online() {
  return [...new Map([...clients.values()].map(c => [c.admin.id, c.admin])).values()];
}
function write(client: Client, value: object) {
  try { client.res.write(`data: ${JSON.stringify(value)}\n\n`); client.res.flush?.(); } catch {
    const key = `${client.admin.id}:${client.deviceId}`;
    if (clients.get(key) === client) clients.delete(key);
  }
}
function emit(value: object, allowed?: Set<string>) {
  for (const client of clients.values()) if (!allowed || allowed.has(client.admin.id)) write(client, value);
}
function roomAdminIds(room: Room) {
  return [...room.members.keys()];
}
function roomDevices(room: Room): RoomDevice[] {
  return [...room.members.entries()].flatMap(([adminId, devices]) => [...devices].map(deviceId => ({ adminId, deviceId })));
}
function roomMembersEvent(roomId: string, room: Room) {
  return { type: "ROOM_MEMBERS", roomId, members: roomAdminIds(room), devices: roomDevices(room) };
}
function roomHasDevice(room: Room, adminId: string, deviceId: string) {
  return room.members.get(adminId)?.has(deviceId) ?? false;
}
function addRoomDevice(room: Room, adminId: string, deviceId: string) {
  const devices = room.members.get(adminId) ?? new Set<string>();
  devices.add(deviceId);
  room.members.set(adminId, devices);
}
function removeDeviceFromRooms(adminId: string, deviceId: string) {
  for (const [roomId, room] of rooms) {
    const devices = room.members.get(adminId);
    if (!devices?.delete(deviceId)) continue;
    if (!devices.size) room.members.delete(adminId);
    if (!room.members.size) rooms.delete(roomId);
    else emit(roomMembersEvent(roomId, room));
  }
}
function deviceIdFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.slice(0, 100) : null;
}
function scheduleRoomDeparture(key: string, adminId: string, deviceId: string) {
  const existing = disconnectTimers.get(key);
  if (existing) clearTimeout(existing);
  disconnectTimers.set(key, setTimeout(() => {
    disconnectTimers.delete(key);
    if (clients.has(key)) return;
    removeDeviceFromRooms(adminId, deviceId);
    emit({ type: "PRESENCE", onlineAdmins: online() });
  }, 5000));
}
function dmMembers(conversationId: string): string[] | null {
  const m = /^dm:(\d+):(\d+)$/.exec(conversationId);
  return m ? [m[1], m[2]] : null;
}
function conversationFor(adminId: string, target?: unknown) {
  if (!target || target === "group") return { id: "group", members: undefined as Set<string> | undefined };
  if (typeof target !== "string") return null;
  const members = dmMembers(target);
  if (!members || !members.includes(adminId)) return null;
  return { id: target, members: new Set(members) };
}
async function validAdmin(id: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, Number(id)));
  return !!u?.isAdmin;
}

router.get("/admin/chat/stream", requireAdmin, async (req, res) => {
  const admin = await me(req); const deviceId = typeof req.query.deviceId === "string" ? req.query.deviceId.slice(0, 100) : crypto.randomUUID();
  res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache"); res.setHeader("Connection", "keep-alive"); res.flushHeaders?.();
  const key = `${admin.id}:${deviceId}`;
  const pendingDeparture = disconnectTimers.get(key);
  if (pendingDeparture) {
    clearTimeout(pendingDeparture);
    disconnectTimers.delete(key);
  }
  const client = { res, admin, deviceId }; clients.set(key, client);
  emit({ type: "PRESENCE", onlineAdmins: online() });
  const heartbeat = setInterval(() => { try { res.write(":\n\n"); } catch {} }, 25000);
  req.on("close", () => {
    if (clients.get(key) === client) {
      clients.delete(key);
      scheduleRoomDeparture(key, admin.id, deviceId);
      emit({ type: "PRESENCE", onlineAdmins: online() });
    }
    clearInterval(heartbeat);
  });
});

router.get("/admin/chat/conversations", requireAdmin, async (req, res) => {
  const admin = await me(req); await tables();
  const all = await db.select().from(usersTable);
  const admins = all.filter(u => u.isAdmin).map(u => ({ adminId: String(u.id), adminName: u.username }));
  const rows = await db.execute<any>(sql`SELECT conversation_id, MAX(created_at) AS updated_at FROM admin_chat_messages GROUP BY conversation_id`).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  const visible = rows.filter((r: any) => r.conversation_id === "group" || dmMembers(r.conversation_id)?.includes(admin.id));
  res.json({ me: admin, admins, conversations: [{ id: "group", kind: "group", name: "Admin team" }, ...visible.filter((r: any) => r.conversation_id !== "group").map((r: any) => ({ id: r.conversation_id, kind: "direct", updatedAt: r.updated_at }))] });
});

router.get("/admin/chat/messages", requireAdmin, async (req, res) => {
  const admin = await me(req); await tables(); const c = conversationFor(admin.id, req.query.conversationId);
  if (!c) return void res.status(403).json({ error: "Conversation is not available to this admin" });
  const rows = await db.execute<any>(sql`SELECT * FROM admin_chat_messages WHERE conversation_id=${c.id} ORDER BY created_at ASC LIMIT 200`).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  res.json(rows.map((r: any) => ({ id:r.id,senderId:r.sender_id,senderName:r.sender_name,message:r.message,type:r.type,conversationId:r.conversation_id,clientMessageId:r.client_message_id,metadata:r.metadata,reactions:JSON.parse(r.reactions||"{}"),readBy:JSON.parse(r.read_by||"[]"),createdAt:r.created_at })));
});

router.post("/admin/chat/messages", requireAdmin, async (req, res) => {
  const admin = await me(req); await tables(); const message = String(req.body?.message ?? "").trim(); const c = conversationFor(admin.id, req.body?.conversationId);
  if (!message) return void res.status(400).json({ error: "Empty message" }); if (!c) return void res.status(403).json({ error: "Conversation is not available to this admin" });
  if (c.members && !(await Promise.all([...c.members].map(validAdmin))).every(Boolean)) return void res.status(404).json({ error: "Admin not found" });
  const cmid = typeof req.body?.clientMessageId === "string" ? req.body.clientMessageId : null;
  const old = cmid ? await db.execute<any>(sql`SELECT * FROM admin_chat_messages WHERE sender_id=${admin.id} AND client_message_id=${cmid} LIMIT 1`).then(r => (Array.isArray(r)?r:(r as any).rows??[])[0]) : null;
  const row = old ?? (await db.execute<any>(sql`INSERT INTO admin_chat_messages(sender_id,sender_name,message,conversation_id,client_message_id) VALUES(${admin.id},${admin.name},${message},${c.id},${cmid}) RETURNING *`).then(r => (Array.isArray(r)?r:(r as any).rows??[])[0]));
  const output = { id:row.id,senderId:row.sender_id,senderName:row.sender_name,message:row.message,type:row.type,conversationId:row.conversation_id,clientMessageId:row.client_message_id,metadata:row.metadata,reactions:JSON.parse(row.reactions||"{}"),readBy:JSON.parse(row.read_by||"[]"),createdAt:row.created_at };
  emit({ type:"MESSAGE", message:output }, c.members); if (!old) sendAdminChatPush(admin.name, message, admin.id, c.members ? [...c.members].filter(id => id !== admin.id) : undefined).catch(() => {});
  res.status(old ? 200 : 201).json(output);
});

router.post("/admin/chat/typing", requireAdmin, async (req,res) => { const admin=await me(req); const c=conversationFor(admin.id,req.body?.conversationId); if(!c || typeof req.body?.typing!=="boolean") return void res.status(400).json({error:"Invalid typing payload"}); emit({type:"TYPING",adminId:admin.id,adminName:admin.name,typing:req.body.typing,conversationId:c.id},c.members); res.status(204).end(); });
router.post("/admin/chat/messages/:id/react", requireAdmin, async (req,res) => { const admin=await me(req); await tables(); const emoji=String(req.body?.emoji??""); const [row]=await db.execute<any>(sql`SELECT conversation_id,reactions FROM admin_chat_messages WHERE id=${Number(req.params.id)}`).then(r=>Array.isArray(r)?r:(r as any).rows??[]); const c=row&&conversationFor(admin.id,row.conversation_id); if(!row||!c||!emoji) return void res.status(403).json({error:"Message unavailable"}); const reactions=JSON.parse(row.reactions||"{}"); reactions[emoji]??=[]; const i=reactions[emoji].indexOf(admin.id); i<0?reactions[emoji].push(admin.id):reactions[emoji].splice(i,1); if(!reactions[emoji].length)delete reactions[emoji]; await db.execute(sql`UPDATE admin_chat_messages SET reactions=${JSON.stringify(reactions)} WHERE id=${Number(req.params.id)}`); emit({type:"REACTION",messageId:Number(req.params.id),reactions,conversationId:c.id},c.members); res.json({reactions}); });

// Existing admin profile setup continues to work independently of chat identity.
// Chat itself always uses the authenticated account identity above.
router.get("/admin/profile/:adminId", requireAdmin, async (req, res) => {
  await tables();
  const rows = await db.execute<any>(
    sql`SELECT * FROM admin_profiles WHERE admin_id = ${String(req.params.adminId)} LIMIT 1`,
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  res.json(rows[0] ?? null);
});
router.post("/admin/profile", requireAdmin, async (req, res) => {
  const { adminId, displayName, avatarColor } = req.body as Record<string, string>;
  if (!adminId || !displayName?.trim()) return void res.status(400).json({ error: "adminId and displayName required" });
  await tables();
  const [existing] = await db.execute<any>(
    sql`SELECT last_name_change FROM admin_profiles WHERE admin_id = ${adminId}`,
  ).then(r => Array.isArray(r) ? r : (r as any).rows ?? []);
  if (existing?.last_name_change && (Date.now() - new Date(existing.last_name_change).getTime()) < 7 * 86_400_000) {
    const daysLeft = Math.ceil(7 - (Date.now() - new Date(existing.last_name_change).getTime()) / 86_400_000);
    return void res.status(429).json({ error: `You can change your name again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` });
  }
  await db.execute(sql`
    INSERT INTO admin_profiles (admin_id, display_name, avatar_color, last_name_change)
    VALUES (${adminId}, ${displayName.trim()}, ${avatarColor ?? "#ff6600"}, NOW())
    ON CONFLICT (admin_id) DO UPDATE SET display_name = EXCLUDED.display_name,
      avatar_color = COALESCE(EXCLUDED.avatar_color, admin_profiles.avatar_color),
      last_name_change = NOW()
  `);
  emit({ type: "PROFILE_UPDATE", adminId, displayName: displayName.trim() });
  res.json({ ok: true });
});
router.post("/admin/profile/pfp", requireAdmin, async (req, res) => {
  const { adminId, pfpData } = req.body as Record<string, string>;
  if (!adminId || !pfpData) return void res.status(400).json({ error: "adminId and pfpData required" });
  if (pfpData.length > 800_000) return void res.status(413).json({ error: "Image too large. Please use a smaller photo." });
  await tables();
  await db.execute(sql`
    INSERT INTO admin_profiles (admin_id, display_name, pfp_data)
    VALUES (${adminId}, 'Admin', ${pfpData})
    ON CONFLICT (admin_id) DO UPDATE SET pfp_data = EXCLUDED.pfp_data
  `);
  emit({ type: "PROFILE_UPDATE", adminId, pfpData });
  res.json({ ok: true });
});

router.post("/admin/chat/push-subscribe", requireAdmin, async (req,res) => { const admin=await me(req); const {endpoint,p256dh,auth}=req.body??{}; if(!endpoint||!p256dh||!auth)return void res.status(400).json({error:"Missing fields"}); await initPush(); await saveAdminSubscription(endpoint,p256dh,auth,admin.id); res.json({ok:true}); });
router.get("/admin/chat/online", requireAdmin, (_req,res)=>res.json(online()));
router.get("/admin/chat/ice-config", requireAdmin, (_req,res) => { const iceServers:any[]=[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}]; if(process.env.TURN_URL&&process.env.TURN_USERNAME&&process.env.TURN_CREDENTIAL)iceServers.push({urls:process.env.TURN_URL,username:process.env.TURN_USERNAME,credential:process.env.TURN_CREDENTIAL}); res.json({iceServers}); });

// WebRTC mesh is deliberately limited to a small internal team, not a large conference.
router.post("/admin/chat/rooms", requireAdmin, async(req,res)=>{const admin=await me(req);const deviceId=deviceIdFrom(req.body?.deviceId);if(!deviceId)return void res.status(400).json({error:"Missing device"});const id=crypto.randomUUID();const room:Room={initiator:admin.id,members:new Map(),createdAt:Date.now()};addRoomDevice(room,admin.id,deviceId);rooms.set(id,room);emit({type:"ROOM_INVITE",roomId:id,from:admin},new Set(online().map(a=>a.id).filter(id=>id!==admin.id)));sendAdminCallPush(admin.name,admin.id,`/admin/chat?room=${encodeURIComponent(id)}`).catch(()=>{});res.status(201).json({roomId:id});});
router.post("/admin/chat/rooms/:roomId/join", requireAdmin, async(req,res)=>{const admin=await me(req);const deviceId=deviceIdFrom(req.body?.deviceId);const roomId=String(req.params.roomId);const room=rooms.get(roomId);if(!deviceId)return void res.status(400).json({error:"Missing device"});if(!room)return void res.status(404).json({error:"Room ended"});addRoomDevice(room,admin.id,deviceId);const event=roomMembersEvent(roomId,room);emit(event);res.json({members:event.members,devices:event.devices});});
router.post("/admin/chat/rooms/:roomId/leave", requireAdmin, async(req,res)=>{const admin=await me(req);const deviceId=deviceIdFrom(req.query.deviceId??req.body?.deviceId);const roomId=String(req.params.roomId);const room=rooms.get(roomId);if(!deviceId)return void res.status(400).json({error:"Missing device"});if(room){const devices=room.members.get(admin.id);if(devices?.delete(deviceId)&&!devices.size)room.members.delete(admin.id);if(!room.members.size)rooms.delete(roomId);else emit(roomMembersEvent(roomId,room));}res.status(204).end();});
router.post("/admin/chat/rooms/:roomId/signal", requireAdmin, async(req,res)=>{const admin=await me(req);const deviceId=deviceIdFrom(req.body?.deviceId);const roomId=String(req.params.roomId);const room=rooms.get(roomId);const to=String(req.body?.to??"");const toDeviceId=deviceIdFrom(req.body?.toDeviceId);if(!room||!deviceId||!toDeviceId||!roomHasDevice(room,admin.id,deviceId)||!roomHasDevice(room,to,toDeviceId))return void res.status(403).json({error:"Room signal denied"});const recipient=clients.get(`${to}:${toDeviceId}`);if(recipient)write(recipient,{type:"ROOM_SIGNAL",roomId,from:admin.id,fromDeviceId:deviceId,fromName:admin.name,signal:req.body.signal});res.status(204).end();});
setInterval(()=>{const now=Date.now();for(const [id,room] of rooms)if(!room.members.size||now-room.createdAt>8*60*60_000)rooms.delete(id);},60_000).unref();
export default router;