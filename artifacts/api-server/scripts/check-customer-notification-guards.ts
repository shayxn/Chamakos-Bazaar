import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { customerNotificationTemplates } from "../src/lib/customer-notification-templates";
import { ensureCustomerNotificationSchema,reserveCustomerMarketing } from "../src/lib/customer-notification-delivery";

async function check(){
  assert.equal(customerNotificationTemplates.length,300);
  assert.equal(new Set(customerNotificationTemplates.map(t=>`${t.title}|${t.body}`)).size,300);
  assert.equal(new Set(customerNotificationTemplates.map(t=>t.body)).size,300);
  const owner=`guard-check:${randomUUID()}`;
  await ensureCustomerNotificationSchema();
  try{
    const concurrent=await Promise.all(Array.from({length:12},(_,i)=>reserveCustomerMarketing(`guard:${i}`,owner)));
    assert.equal(concurrent.filter(Boolean).length,5,"Concurrent sends must reserve at most five marketing messages.");
    assert.equal(await reserveCustomerMarketing("guard:13",owner),false);
    const first=concurrent.findIndex(Boolean);
    assert.equal(await reserveCustomerMarketing(`guard:${first}`,owner),false,"Duplicate message must not be reserved twice.");
    await db.execute(sql`UPDATE customer_marketing_deliveries SET created_at=NOW()-INTERVAL '8 days' WHERE owner_key=${owner}`);
    assert.equal(await reserveCustomerMarketing("guard:after-window",owner),true);
    console.log("PASS: 300 unique customer messages; concurrent five-per-seven-day cap; duplicate prevention; window expiry. No push provider contacted.");
  }finally{await db.execute(sql`DELETE FROM customer_marketing_deliveries WHERE owner_key=${owner}`);}
}
check().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
