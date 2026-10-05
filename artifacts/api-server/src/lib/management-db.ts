import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export function rows<T = Record<string, any>>(result: unknown): T[] {
  return Array.isArray(result) ? result as T[] : (result as { rows?: T[] })?.rows ?? [];
}

let ready: Promise<void> | undefined;
export function ensureManagement(): Promise<void> {
  if (!ready) ready = (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_documents (
      id SERIAL PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', featured BOOLEAN NOT NULL DEFAULT FALSE,
      show_in_navigation BOOLEAN NOT NULL DEFAULT FALSE, publish_at TIMESTAMPTZ,
      unpublish_at TIMESTAMPTZ, data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(kind, slug))`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS imaginate_documents_public ON imaginate_documents(kind,status,publish_at)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_support (
      id SERIAL PRIMARY KEY, owner_key TEXT NOT NULL, customer_id INTEGER,
      subject TEXT NOT NULL, category TEXT NOT NULL, message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', reply TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_newsletter (
      id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'subscribed',
      consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_admin_roles (
      user_id INTEGER PRIMARY KEY, role TEXT NOT NULL DEFAULT 'admin',
      permissions JSONB NOT NULL DEFAULT '[]')`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_notifications (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, category TEXT NOT NULL,
      url TEXT NOT NULL, owner_only BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_notification_reads (
      notification_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      PRIMARY KEY(notification_id,user_id))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_reminder_runs (
      run_key TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  })().catch((error) => { ready = undefined; throw error; });
  return ready;
}

export function documentPayload(row: Record<string, any>) {
  return {
    id: row.id, kind: row.kind, title: row.title, slug: row.slug, status: row.status,
    featured: row.featured, showInNavigation: row.show_in_navigation,
    publishAt: row.publish_at, unpublishAt: row.unpublish_at,
    data: row.data, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
