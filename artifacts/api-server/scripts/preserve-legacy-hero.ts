import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { storeMediaSignedUrl } from "../src/lib/chat-media-storage";
import { rows } from "../src/lib/management-db";

async function preserve(){
  const setting=rows(await db.execute(sql`SELECT value FROM site_settings WHERE key='hero_image'`))[0];
  const filename=String(setting?.value??"").match(/^\/api\/uploads\/([a-f0-9]{24}\.png)$/)?.[1];
  if(!filename){console.log("No legacy PNG hero to migrate.");return;}
  if(rows(await db.execute(sql`SELECT filename FROM imaginate_store_media WHERE filename=${filename}`)).length){
    console.log("Legacy hero is already preserved; no bytes or settings changed.");return;
  }
  const bytes=await fs.readFile(path.join(process.cwd(),"public/uploads",filename));
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error("Legacy image must be a genuine PNG.");
  const uploaded=await fetch(await storeMediaSignedUrl(filename,"PUT"),{method:"PUT",
    headers:{"Content-Type":"image/png"},body:bytes,signal:AbortSignal.timeout(60000)});
  if(!uploaded.ok)throw new Error("Legacy image could not be preserved.");
  const stored=await fetch(await storeMediaSignedUrl(filename,"GET"),{signal:AbortSignal.timeout(60000)});
  if(!stored.ok)throw new Error("Stored image could not be verified.");
  const hash=(value:Uint8Array)=>createHash("sha256").update(value).digest("hex");
  if(hash(bytes)!==hash(new Uint8Array(await stored.arrayBuffer())))throw new Error("Stored image differs from original.");
  await db.execute(sql`ALTER TABLE imaginate_store_media ALTER COLUMN uploader_id DROP NOT NULL`);
  // Original uploader is unknown; do not fabricate attribution or alter saved settings.
  await db.execute(sql`INSERT INTO imaginate_store_media(filename,content_type,size,uploader_id)
    VALUES(${filename},'image/png',${bytes.length},NULL) ON CONFLICT(filename) DO NOTHING`);
  console.log("PASS: legacy hero preserved byte-for-byte; existing URL/settings/local copy unchanged.");
}
preserve().then(()=>process.exit(0)).catch(()=>{console.error("Legacy hero preservation failed; existing asset/settings remain unchanged.");process.exit(1);});
