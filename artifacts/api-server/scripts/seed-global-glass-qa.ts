import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs/promises";
import { rows, ensureManagement } from "../src/lib/management-db";

async function seed() {
  await ensureManagement();
  const token = randomUUID().slice(0,8);
  const tag = `qa-glass-${token}`;
  const password = randomUUID();
  const passwordHash = createHash("sha256").update(password+"chamak_salt_2024").digest("hex");
  const actors = [];
  for (const role of ["owner","admin"]) {
    const username = `${tag}-${role}`;
    const user = rows(await db.execute(sql`INSERT INTO users(username,password_hash,is_admin) VALUES(${username},${passwordHash},TRUE) RETURNING id`))[0];
    await db.execute(sql`INSERT INTO imaginate_admin_roles(user_id,role,permissions) VALUES(${user.id},${role},${JSON.stringify(["products","orders","content","analytics","settings","notifications"])}::jsonb)`);
    actors.push({id:user.id,username,password,role});
  }
  const original = rows(await db.execute(sql`SELECT value FROM site_settings WHERE key='imaginate_global_store'`))[0]?.value ?? null;
  const products = rows(await db.execute(sql`SELECT id,name,stock,variants FROM products WHERE hidden=FALSE`));
  await fs.writeFile("/tmp/imaginate-glass-fixture.json",JSON.stringify({tag,actors,originalGlobal:original,originalStocks:products},null,2),{mode:0o600});
  console.log("Tagged isolated QA actors created; credentials saved only in /tmp/imaginate-glass-fixture.json. Owner identity and catalogue unchanged.");
}
seed().then(()=>process.exit(0)).catch(()=>{console.error("QA setup failed.");process.exit(1);});
