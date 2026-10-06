import { Router, type Response } from "express";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../lib/auth-middleware";
import { touchAdminSession } from "../lib/admin-sessions";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { StartMovieSetupBody, SendMovieFilmingBurstBody, OptInMovieFilmingDeviceBody } from "@workspace/api-zod";
import { prepareMoviePush, deliverMoviePush, validMovieEndpoint } from "../lib/push";
import { rows } from "../lib/management-db";

// Deliberately process-local and disposable. Only explicitly targeted filming
// push is allowed here; never import order fan-out, tracking or store mutations.
const router = Router();
type Run = { id: string; startsAt: number; durationMs: number; eventCount: number };
type Screen = { res: Response; req: any; userId: number };
let run: Run | null = null;
let revision = 0;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let checking = false;
const screens = new Set<Screen>();
type PushJob = { id: string; mode: "test" | "movie"; status: "running" | "completed" | "stopped" | "failed"; total: number; attempted: number; accepted: number; failed: number; reason: string | null };
let pushJob: PushJob | null = null;
let deliveryController: AbortController | null = null;
let pendingDelay: ReturnType<typeof setTimeout> | null = null;
let releaseDelay: (() => void) | null = null;
let lastPushStarted = 0;
let usedMovieRun: string | null = null;
const delivering = () => pushJob?.status === "running";
const snapshot = () => ({ kind: "MOVIE_SIMULATION" as const, run, revision, serverNow: Date.now(), connectedScreens: screens.size, pushJob });
async function selectedDevices(ids: string[]) {
  await prepareMoviePush();
  const unique = [...new Set(ids)];
  for (const id of unique) {
    const found = rows(await db.execute(sql`SELECT d.id FROM admin_movie_devices d
      JOIN users u ON u.id=d.admin_id AND u.is_admin=TRUE
      JOIN admin_device_sessions s ON s.id=d.admin_session_id AND s.user_id=d.admin_id AND s.revoked_at IS NULL AND s.last_seen_at>NOW()-INTERVAL '30 days'
      LEFT JOIN admin_push_subscriptions a ON a.endpoint=d.endpoint AND a.admin_id=d.admin_id::text
      LEFT JOIN push_subscriptions p ON p.endpoint=d.endpoint AND p.admin_id=d.admin_id
      WHERE d.id=${id} AND d.opted_in=TRUE AND (a.id IS NOT NULL OR p.id IS NOT NULL)`));
    if (!found.length) throw new Error("A selected device is not an opted-in, registered Admin/Owner device. Refresh the device list.");
  }
  return unique;
}
function stopDelivery() {
  deliveryController?.abort(); deliveryController = null;
  if (pendingDelay) clearTimeout(pendingDelay);
  pendingDelay = null; releaseDelay?.(); releaseDelay = null;
  if (pushJob?.status === "running") { pushJob.status = "stopped"; pushJob.reason = "Stopped. Notifications already accepted by the provider cannot be recalled; an in-flight notification may already have arrived."; }
}
function startDelivery(ids: string[], mode: "test" | "movie", req: any) {
  const job: PushJob = { id: randomUUID(), mode, status: "running", total: mode === "test" ? 10 : 50, attempted: 0, accepted: 0, failed: 0, reason: null };
  pushJob = job; lastPushStarted = Date.now();
  const controller = new AbortController(); deliveryController = controller;
  void (async () => {
    try {
      for (let index = 0; index < job.total && !controller.signal.aborted; index++) {
        if (!(await touchAdminSession(req, Number(req.session?.userId)))) throw new Error("The initiating admin session ended. Burst stopped.");
        if (controller.signal.aborted) break;
        job.attempted++;
        try { await deliverMoviePush(ids[index % ids.length], job.id, index + 1, controller.signal); job.accepted++; }
        catch (error: any) {
          if (controller.signal.aborted) break;
          job.failed++;
          const status = Number(error?.statusCode || 0);
          job.reason = status === 429 ? "Push provider throttled this burst (HTTP 429). Stopped without retrying." :
            status === 404 || status === 410 ? `A filming subscription expired (HTTP ${status}). Opt in again on that device.` :
            status === 401 || status === 403 ? `Push provider rejected the VAPID configuration or subscription (HTTP ${status}). Check Admin → Notifications.` :
            status ? `Push provider rejected the request (HTTP ${status}). No retries were sent.` :
            String(error?.message).startsWith("Selected filming device") ? error.message :
            /^(?:E[A-Z0-9_]{2,40})$/.test(String(error?.code)) ? `Push connection failed (${error.code}). No retries were sent.` :
            "Push subscription or configuration failed. Check Admin → Notifications and re-register the selected device. No retries were sent.";
          job.status = "failed"; break;
        }
        broadcast();
        if (index + 1 < job.total && !controller.signal.aborted) await new Promise<void>(resolve => {
          releaseDelay = resolve;
          pendingDelay = setTimeout(() => { pendingDelay = null; releaseDelay = null; resolve(); }, index < 2 ? 700 : 350);
        });
      }
      if (job.status === "running") job.status = controller.signal.aborted ? "stopped" : "completed";
    } catch (error) { if (!controller.signal.aborted) { job.status = "failed"; job.reason = error instanceof Error ? error.message : "Burst unavailable."; } }
    finally { if (deliveryController === controller) deliveryController = null; broadcast(); }
  })();
}
function send(screen: Screen, event = "snapshot") {
  if (screen.res.destroyed || screen.res.writableEnded) return;
  if (screen.res.writableLength > 64 * 1024) { screen.res.end(); return; }
  screen.res.write(`event: ${event}\ndata: ${JSON.stringify(snapshot())}\n\n`);
}
function broadcast(event = "snapshot") {
  for (const screen of screens) send(screen, event);
}
function remove(screen: Screen) {
  if (!screens.delete(screen)) return;
  if (!screens.size && heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  broadcast();
}
function beginHeartbeat() {
  if (heartbeat) return;
  // One shared lifecycle timer, not one timer per simulated notification.
  heartbeat = setInterval(async () => {
    if (checking) return;
    checking = true;
    try {
      for (const screen of [...screens]) {
        try {
          const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, screen.userId));
          if (!user?.isAdmin || !(await touchAdminSession(screen.req, screen.userId))) {
            screen.res.write("event: unauthorized\ndata: {}\n\n");
            screen.res.end(); remove(screen); continue;
          }
          send(screen);
        } catch { screen.res.end(); remove(screen); }
      }
    } finally { checking = false; }
  }, 15_000);
  heartbeat.unref();
}
router.get("/admin/movie-setup/state", requireAdmin, (_req, res) => {
  res.setHeader("Cache-Control", "no-store").json(snapshot());
});
router.get("/admin/movie-setup/devices", requireAdmin, async (req, res) => {
  let reason: string | null = null;
  try { await prepareMoviePush(); } catch (error) { reason = error instanceof Error ? error.message : "Push configuration unavailable."; }
  const currentSession = rows(await db.execute(sql`SELECT id FROM admin_device_sessions WHERE user_id=${Number(req.session?.userId)} AND device_token=${String((req.session as any)?.deviceToken || "")} AND revoked_at IS NULL`))[0];
  const devices = rows(await db.execute(sql`SELECT d.id,d.label,d.opted_in,u.username,d.admin_id,d.admin_session_id
    FROM admin_movie_devices d JOIN users u ON u.id=d.admin_id AND u.is_admin=TRUE
    JOIN admin_device_sessions s ON s.id=d.admin_session_id AND s.user_id=d.admin_id AND s.revoked_at IS NULL AND s.last_seen_at>NOW()-INTERVAL '30 days'
    WHERE d.opted_in=TRUE ORDER BY d.updated_at DESC LIMIT 100`));
  res.setHeader("Cache-Control", "no-store").json({ configured: !reason, reason, devices: devices.map(d => ({
    id: d.id, label: d.label, adminName: d.username, optedIn: d.opted_in, isOwn: d.admin_id === Number(req.session?.userId) && d.admin_session_id === currentSession?.id,
  })) });
});
router.post("/admin/movie-setup/devices", requireAdmin, async (req, res) => {
  const parsed = OptInMovieFilmingDeviceBody.safeParse(req.body);
  if (!parsed.success || !validMovieEndpoint(parsed.success ? parsed.data.endpoint : "")) { res.status(400).json({ error: "Use this browser's supported Web Push subscription and a device label." }); return; }
  try { await prepareMoviePush(); } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Push configuration unavailable." }); return; }
  const id = Number(req.session?.userId), { endpoint, label, optedIn } = parsed.data;
  const session = rows(await db.execute(sql`SELECT id FROM admin_device_sessions WHERE user_id=${id} AND device_token=${String((req.session as any)?.deviceToken || "")} AND revoked_at IS NULL`))[0];
  if (!session) { res.status(401).json({ error: "Sign in again before opting this device into filming." }); return; }
  const owned = rows(await db.execute(sql`SELECT endpoint FROM admin_push_subscriptions WHERE endpoint=${endpoint} AND admin_id=${String(id)}
    UNION SELECT endpoint FROM push_subscriptions WHERE endpoint=${endpoint} AND admin_id=${id}`));
  if (!owned.length) { res.status(403).json({ error: "Only this authenticated admin's registered browser can opt itself in." }); return; }
  const conflict = rows(await db.execute(sql`SELECT admin_id FROM admin_movie_devices WHERE endpoint=${endpoint}`))[0];
  if (conflict && conflict.admin_id !== id) { res.status(409).json({ error: "This endpoint belongs to a different filming admin. Remove its previous opt-in first." }); return; }
  const device = rows(await db.execute(sql`INSERT INTO admin_movie_devices(id,admin_id,admin_session_id,endpoint,label,opted_in)
    VALUES(${randomUUID()},${id},${session.id},${endpoint},${label},${optedIn})
    ON CONFLICT(endpoint) DO UPDATE SET label=EXCLUDED.label,opted_in=EXCLUDED.opted_in,admin_session_id=EXCLUDED.admin_session_id,updated_at=NOW()
    WHERE admin_movie_devices.admin_id=${id} RETURNING id`))[0];
  if (!device) { res.status(409).json({ error: "Device ownership changed. Refresh and try again." }); return; }
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, id));
  res.json({ id: device.id, label, optedIn, isOwn: true, adminName: user.username });
});
router.post("/admin/movie-setup/start", requireAdmin, async (req, res) => {
  const parsed = StartMovieSetupBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Reconnect to the filming session before starting." }); return; }
  if (parsed.data.expectedRevision !== revision) {
    res.status(409).json({ error: "The filming session changed. Reconnect and try again." }); return;
  }
  if (delivering() || Date.now() - lastPushStarted < 20_000) { res.status(429).json({ error: "A burst is running or cooling down. No extra pushes were queued." }); return; }
  let ids: string[];
  try { ids = await selectedDevices(parsed.data.deviceIds); }
  catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Push unavailable." }); return; }
  if (parsed.data.expectedRevision !== revision || delivering() || Date.now() - lastPushStarted < 20_000) { res.status(409).json({ error: "Sequence was stopped or changed. Nothing was started." }); return; }
  if (!run || Date.now() >= run.startsAt + run.durationMs) {
    run = { id: randomUUID(), startsAt: Date.now() + 800, durationMs: 60_000, eventCount: 3_200 };
    revision++;
    broadcast();
  }
  if (usedMovieRun !== run.id) { usedMovieRun = run.id; startDelivery(ids, "movie", req); broadcast(); }
  res.setHeader("Cache-Control", "no-store").json(snapshot());
});
router.post("/admin/movie-setup/push", requireAdmin, async (req, res) => {
  const parsed = SendMovieFilmingBurstBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Select opted-in filming devices and a valid mode." }); return; }
  if (parsed.data.expectedRevision !== revision) { res.status(409).json({ error: "Session changed. Refresh before sending." }); return; }
  if (delivering() || Date.now() - lastPushStarted < 20_000) { res.status(429).json({ error: "A burst is running or cooling down. No extra pushes were queued." }); return; }
  let ids: string[];
  try { ids = await selectedDevices(parsed.data.deviceIds); } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Push unavailable." }); return; }
  if (parsed.data.expectedRevision !== revision || delivering()) { res.status(409).json({ error: "Session changed. Nothing was queued." }); return; }
  if (parsed.data.mode === "movie") {
    if (!run || Date.now() >= run.startsAt + run.durationMs) { run = { id: randomUUID(), startsAt: Date.now() + 800, durationMs: 60_000, eventCount: 3200 }; revision++; }
    if (usedMovieRun === run.id) { res.status(409).json({ error: "This sequence already used its one burst of up to 50 pushes." }); return; }
    usedMovieRun = run.id;
  }
  startDelivery(ids, parsed.data.mode, req); broadcast();
  res.setHeader("Cache-Control", "no-store").json(snapshot());
});
router.post("/admin/movie-setup/stop", requireAdmin, (_req, res) => {
  stopDelivery();
  run = null; revision++;
  broadcast("stopped");
  const closing = [...screens];
  screens.clear();
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  for (const screen of closing) screen.res.end();
  res.setHeader("Cache-Control", "no-store").json(snapshot());
});
router.get("/admin/movie-setup/stream", requireAdmin, (req, res) => {
  if (screens.size >= 128) { res.status(429).json({ error: "Too many filming screens connected." }); return; }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const screen = { res, req, userId: Number(req.session?.userId) };
  screens.add(screen);
  res.on("close", () => remove(screen));
  broadcast();
  beginHeartbeat();
});
export default router;
