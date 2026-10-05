import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rows } from "../src/lib/management-db";

async function cleanup() {
  const f = JSON.parse(await fs.readFile("/tmp/imaginate-glass-fixture.json", "utf8"));
  const report = JSON.parse(await fs.readFile("/tmp/admin-messaging-test-results.json", "utf8"));
  assert.match(f.tag, /^qa-glass-[a-f0-9]{8}$/);
  assert.equal(report.tag, f.tag, "Fixture must belong to the messaging test.");
  assert.equal(f.actors.length, 2);
  const ids = f.actors.map((a: { id: number }) => a.id);
  const bound = sql.join(ids.map((id: number) => sql`${String(id)}`), sql`,`);
  const people = rows(await db.execute(sql`SELECT id, username FROM users WHERE id::text IN (${bound})`));
  assert.equal(people.length, 2);
  assert(people.every(p => String(p.username).startsWith(f.tag)));
  const before = rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM orders`))[0].n;
  await db.transaction(async tx => {
    await tx.execute(sql`DELETE FROM admin_chat_messages WHERE sender_id IN (${bound})`);
    await tx.execute(sql`DELETE FROM push_subscriptions WHERE admin_id::text IN (${bound})`);
    const metadata = rows(await tx.execute(sql`SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name IN ('user_id','admin_id')
      AND (table_name LIKE 'admin_%' OR table_name LIKE 'imaginate_admin_%' OR table_name='imaginate_notification_reads')`));
    for (const m of metadata)
      await tx.execute(sql`DELETE FROM ${sql.identifier(m.table_name)} WHERE ${sql.identifier(m.column_name)}::text IN (${bound})`);
    await tx.execute(sql`DELETE FROM admin_activity_log WHERE admin_name LIKE ${f.tag + "%"}`);
    await tx.execute(sql`DELETE FROM users WHERE id::text IN (${bound}) AND username LIKE ${f.tag + "%"}`);
  });
  console.log(JSON.stringify({
    qaActorsRemaining: rows(await db.execute(sql`SELECT id FROM users WHERE username LIKE ${f.tag + "%"}`)).length,
    qaMessagesRemaining: rows(await db.execute(sql`SELECT id FROM admin_chat_messages WHERE sender_id IN (${bound})`)).length,
    historicalOrdersBefore: before,
    historicalOrdersAfter: rows(await db.execute(sql`SELECT COUNT(*)::int AS n FROM orders`))[0].n,
    globalAndContactSettingsUntouched: true,
  }));
}
cleanup().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
