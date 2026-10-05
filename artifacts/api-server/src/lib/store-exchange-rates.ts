import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rows } from "./management-db";

const KEY = "imaginate_exchange_snapshot";
const DAY = 86_400_000;
type Snapshot = { rates: Record<string, number>; fetchedAt: string; sourceUpdatedAt: string };
let pending: Promise<Snapshot | null> | null = null;
let retryAfter = 0;
let memory: Snapshot | null = null;
const attribution = "https://www.exchangerate-api.com";

function decode(value: string | undefined): Snapshot | null {
  try {
    const s = JSON.parse(value ?? "");
    if (!s || s.rates?.AED !== 1 || !Number.isFinite(Date.parse(s.fetchedAt)) || !Number.isFinite(Date.parse(s.sourceUpdatedAt))) return null;
    if (Object.entries(s.rates).some(([key, value]) => !/^[A-Z]{3}$/.test(key) || typeof value !== "number" || !Number.isFinite(value) || value <= 0)) return null;
    return s;
  } catch { return null; }
}

async function snapshot(): Promise<Snapshot | null> {
  if (memory && Date.now() - Date.parse(memory.fetchedAt) < DAY) return memory;
  const saved = rows(await db.execute(sql`SELECT value FROM site_settings WHERE key=${KEY}`))[0];
  memory = decode(saved?.value);
  if (memory && Date.now() - Date.parse(memory.fetchedAt) < DAY) return memory;
  if (Date.now() < retryAfter) return memory;
  if (pending) return pending;
  pending = db.transaction(async tx => {
    const lock = rows(await tx.execute(sql`SELECT pg_try_advisory_xact_lock(hashtext(${KEY})) AS locked`))[0];
    if (!lock?.locked) return memory;
    // Recheck persistent cache after acquiring the cross-instance lock.
    const cached = decode(rows(await tx.execute(sql`SELECT value FROM site_settings WHERE key=${KEY}`))[0]?.value);
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < DAY) return cached;
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/AED", { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error("Exchange-rate service unavailable.");
      const data = await response.json() as Record<string, any>;
      if (data.result !== "success" || data.base_code !== "AED" || !Number.isFinite(data.time_last_update_unix))
        throw new Error("Invalid exchange-rate response.");
      const next = decode(JSON.stringify({ rates: data.rates, fetchedAt: new Date().toISOString(),
        sourceUpdatedAt: new Date(data.time_last_update_unix * 1000).toISOString() }));
      if (!next) throw new Error("Invalid exchange rates.");
      await tx.execute(sql`INSERT INTO site_settings(key,value) VALUES(${KEY},${JSON.stringify(next)})
        ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`);
      return next;
    } catch {
      retryAfter = Date.now() + 20 * 60_000;
      return cached ?? memory;
    }
  }).then(value => { memory = value; return value; }).finally(() => { pending = null; });
  return pending;
}

export async function displayExchangeRates(currency: string) {
  if (currency === "AED") return { base: "AED" as const, rates: { AED: 1 }, fetchedAt: null, stale: false, available: true, attribution };
  const s = await snapshot();
  const age = s ? Date.now() - Date.parse(s.sourceUpdatedAt) : Infinity;
  const rate = s?.rates[currency];
  const available = !!rate && age < 7 * DAY;
  // Only this store's selected-currency conversion is exposed, not a redistributed FX feed.
  return { base: "AED" as const, rates: available ? { AED: 1, [currency]: rate } : { AED: 1 },
    fetchedAt: s?.sourceUpdatedAt ?? null, stale: age > 2 * DAY, available, attribution };
}
