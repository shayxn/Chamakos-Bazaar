import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { deleteLegacyChatMedia } from "../src/lib/chat-media-storage";

type DbRow = Record<string, unknown>;
function rows<T extends DbRow>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []);
}

const VALID_CHAT_PATH = /^admin-chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function purge() {
  const target = process.env.ADMIN_CHAT_PURGE_TARGET;
  if (process.env.ADMIN_CHAT_PURGE_CONFIRM !== "DELETE_ALL_ADMIN_CHAT_HISTORY") {
    throw new Error("Explicit purge confirmation is missing.");
  }
  if (target !== "development" && target !== "render-production") {
    throw new Error("A named database target is required.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("The active database connection is missing.");
  }
  const databaseHost = new URL(process.env.DATABASE_URL).hostname.toLowerCase();
  const isRenderDatabase = databaseHost === "render.com" || databaseHost.endsWith(".render.com");
  if (target === "development" && isRenderDatabase) {
    throw new Error("The development purge cannot target Render.");
  }
  if (target === "render-production" && !isRenderDatabase) {
    throw new Error("The production purge must target the documented Render database host.");
  }
  if (target === "render-production" && !process.env.PRODUCTION_RENDER_DATABASE_URL) {
    throw new Error("The secure Render database connection is not available.");
  }
  if (target === "render-production" && process.env.DATABASE_URL !== process.env.PRODUCTION_RENDER_DATABASE_URL) {
    throw new Error("The active database connection does not match the secure Render database connection.");
  }

  const tables = rows<{ messages: string | null; uploads: string | null }>(await db.execute(sql`
    SELECT to_regclass('public.admin_chat_messages')::text AS messages,
           to_regclass('public.admin_chat_uploads')::text AS uploads
  `))[0];
  if (!tables?.messages || !tables?.uploads) {
    throw new Error("Expected chat-history tables were not found; refusing to modify this database.");
  }

  const before = rows<{ messages: number; uploads: number }>(await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM admin_chat_messages) AS messages,
      (SELECT COUNT(*)::int FROM admin_chat_uploads) AS uploads
  `))[0];
  const uploadRows = rows<{ object_path: string | null }>(await db.execute(sql`
    SELECT DISTINCT object_path FROM admin_chat_uploads WHERE object_path IS NOT NULL
  `));
  const metadataRows = rows<{ metadata: string | null }>(await db.execute(sql`
    SELECT metadata FROM admin_chat_messages WHERE metadata IS NOT NULL
  `));

  const objectPaths = new Set<string>();
  for (const row of uploadRows) {
    if (!row.object_path || !VALID_CHAT_PATH.test(row.object_path)) {
      throw new Error("Unexpected upload path found; refusing to delete chat records or unrelated files.");
    }
    objectPaths.add(row.object_path);
  }
  for (const row of metadataRows) {
    for (const match of (row.metadata ?? "").matchAll(/admin-chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)) {
      objectPaths.add(match[0]);
    }
  }

  let mediaDeleted = 0;
  let mediaAlreadyMissing = 0;
  for (const objectPath of objectPaths) {
    if (await deleteLegacyChatMedia(objectPath)) mediaDeleted += 1;
    else mediaAlreadyMissing += 1;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM admin_chat_messages`);
    await tx.execute(sql`DELETE FROM admin_chat_uploads`);
  });

  const after = rows<{ messages: number; uploads: number }>(await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM admin_chat_messages) AS messages,
      (SELECT COUNT(*)::int FROM admin_chat_uploads) AS uploads
  `))[0];
  if (after.messages !== 0 || after.uploads !== 0) {
    throw new Error("Post-purge verification found remaining chat records.");
  }

  console.log(JSON.stringify({
    target,
    messagesDeleted: before.messages,
    uploadRecordsDeleted: before.uploads,
    mediaObjectsDeleted: mediaDeleted,
    mediaObjectsAlreadyMissing: mediaAlreadyMissing,
    remainingMessages: after.messages,
    remainingUploadRecords: after.uploads,
  }));
}

purge()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("Admin chat purge did not complete.", (error as { code?: string })?.code ?? "check the purge prerequisites");
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
