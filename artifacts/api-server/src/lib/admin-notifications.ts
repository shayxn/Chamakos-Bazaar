import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ensureManagement, rows } from "./management-db";
import { ownerId } from "./admin-permissions";
import { sendOwnerPush } from "./push";
import { logger } from "./logger";

export async function createAdminNotification(title: string, body: string, category: string, url: string, ownerOnly = false) {
  await ensureManagement();
  await db.execute(sql`INSERT INTO imaginate_notifications(title,body,category,url,owner_only)
    VALUES(${title},${body},${category},${url},${ownerOnly})`);
  if (category !== "work-reminders" && (ownerOnly || category === "support")) {
    const enabled = rows(await db.execute(sql`SELECT value FROM site_settings WHERE key='owner_activity_push'`))[0]?.value === "true";
    if (enabled) await sendOwnerPush(title, body, url, await ownerId()).catch(error => logger.warn({ error }, "Owner push unavailable"));
  }
}

export const REMINDER_CATEGORIES = [
  "motivation", "funny", "inactive", "get-back-to-work", "good-progress", "strong-progress",
  "long-session", "short-session", "orders", "products", "website", "content", "launch",
  "support", "inventory", "suppliers", "operations", "analytics", "end-of-day",
];
const openings = [
  "A quick check-in.", "When you have a moment.", "Your next task can be a small one.",
  "A focused session can help.", "Time for a useful check.", "Keep the next step manageable.",
  "Here is your scheduled reminder.", "One clear task is enough to start.",
];
const endings = [
  "Open Admin when you are ready.", "Check what needs your attention.",
  "Review your checklist before making changes.", "Take a short break if you need one.",
  "Focus on the most important unfinished item.",
];
const categoryText: Record<string, string> = {
  motivation: "Small, consistent improvements matter.", funny: "Your dashboard has not learned to do your work yet.",
  inactive: "It's been a while since you worked. Is this time okay?",
  "get-back-to-work": "Get to work, you lazy cheeky boy!",
  "good-progress": "You have made progress in your recent session.",
  "strong-progress": "You have completed multiple recent actions.",
  "long-session": "You have been working for a while. Check your remaining priorities.",
  "short-session": "A short session is a good time to finish one task.",
  orders: "Review orders that need attention.", products: "Check product details before publishing.",
  website: "Review the customer experience.", content: "Check your draft content.",
  launch: "Review configured launch settings.", support: "Review customer support requests.",
  inventory: "Check stock levels.", suppliers: "Review supplier information privately.",
  operations: "Check today's operational priorities.", analytics: "Review real store activity.",
  "end-of-day": "Review unfinished tasks before ending your day.",
};
export const REMINDER_VARIATION_COUNT = REMINDER_CATEGORIES.length * openings.length * endings.length;
export const reminderDefaults = {
  enabled: false, times: ["09:00", "12:30", "15:30", "18:30", "21:00"],
  days: [0,1,2,3,4,5,6], timezone: "Asia/Dubai", quietStart: "22:00", quietEnd: "08:00",
  dailyLimit: 5, intensity: "professional", categories: [...REMINDER_CATEGORIES],
};
export async function getReminderConfig() {
  const setting = rows(await db.execute(sql`SELECT value FROM site_settings WHERE key='imaginate_reminders'`))[0];
  let saved = {};
  if (setting?.value) { try { saved = JSON.parse(setting.value); } catch { /* explicitly use disabled default until configured */ } }
  return { ...reminderDefaults, ...saved, variationCount: REMINDER_VARIATION_COUNT };
}
export function reminderMessage(category: string, index: number) {
  return `${openings[index % openings.length]} ${categoryText[category]} ${endings[Math.floor(index / openings.length) % endings.length]}`;
}

let running = false;
async function checkReminders() {
  if (running) return;
  running = true;
  try {
    const config = await getReminderConfig();
    if (!config.enabled || config.dailyLimit < 1) return;
    await ensureManagement();
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: config.timezone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23", weekday:"short",
    }).formatToParts(now).map(p => [p.type,p.value]));
    const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(parts.weekday);
    const time = `${parts.hour}:${parts.minute}`;
    if (!config.days.includes(day) || !config.times.includes(time)) return;
    const quiet = config.quietStart > config.quietEnd
      ? time >= config.quietStart || time < config.quietEnd
      : time >= config.quietStart && time < config.quietEnd;
    if (quiet) return;
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    // A transaction + advisory lock makes the global daily cap safe across API instances.
    const claimed = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(8392104)`);
      const count = rows(await tx.execute(sql`SELECT COUNT(*)::integer AS count FROM imaginate_reminder_runs WHERE run_key LIKE ${date + ":%"}`))[0]?.count ?? 0;
      if (count >= config.dailyLimit) return false;
      const important = rows(await tx.execute(sql`SELECT id FROM imaginate_notifications WHERE category IN ('security','important','orders','support','inventory') AND created_at > NOW() - INTERVAL '15 minutes' LIMIT 1`));
      if (important.length) return false;
      const inserted = rows(await tx.execute(sql`INSERT INTO imaginate_reminder_runs(run_key) VALUES(${date + ":" + time}) ON CONFLICT DO NOTHING RETURNING run_key`));
      return !!inserted.length;
    });
    if (!claimed) return;
    const owner = await ownerId();
    const context = rows(await db.execute(sql`SELECT COUNT(*)::integer AS count,MIN(created_at) AS first,MAX(created_at) AS last FROM admin_activity_log WHERE created_at > NOW() - INTERVAL '2 hours' AND admin_name IN (${`Admin ${owner}`},(SELECT username FROM users WHERE id=${owner}))`))[0];
    const count = Number(context?.count ?? 0);
    const active = context?.last && new Date(context.last).getTime() > now.getTime() - 15 * 60_000;
    let candidates: string[] = config.categories.filter(c => REMINDER_CATEGORIES.includes(c));
    if (config.intensity === "professional") candidates = candidates.filter(c => !["funny","get-back-to-work"].includes(c));
    if (active) candidates = candidates.filter(c => !["inactive","get-back-to-work"].includes(c));
    let category = count >= 8 ? "strong-progress" : count > 0 ? "good-progress" : "inactive";
    if (active && context?.first && now.getTime() - new Date(context.first).getTime() > 90 * 60_000) category = "long-session";
    if (!candidates.includes(category)) category = candidates[Math.floor(Math.random() * candidates.length)];
    if (!category) return;
    const message = reminderMessage(category, Math.floor(Math.random() * 40));
    await createAdminNotification("IMAGINATE Admin", message, "work-reminders", "/admin/manage/reminders", true);
    // Work-reminder consent is independent of optional operational alert consent.
    await sendOwnerPush("IMAGINATE Admin", message, "/admin", owner);
  } catch (error) { logger.warn({ error }, "Work reminder could not run"); }
  finally { running = false; }
}
const reminderTimer = setInterval(() => { void checkReminders(); }, 60_000);
reminderTimer.unref();
