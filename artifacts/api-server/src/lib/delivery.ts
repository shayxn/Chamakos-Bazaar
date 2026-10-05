import { db, siteSettingsTable } from "@workspace/db";
import { inArray,sql } from "drizzle-orm";
import { ensureManagement,rows as extractRows } from "./management-db";

const DEFAULT_DELIVERY_CHARGES: Record<string, number> = {
  standard: 25,
  express: 30,
  priority: 40,
};

export const DELIVERY_METHODS = ["standard", "express", "priority"] as const;

/** Read delivery prices from site_settings with hardcoded fallback */
export async function getDeliveryCharges(): Promise<Record<string, number>> {
  const keys = ["delivery_standard_price", "delivery_express_price", "delivery_priority_price"];
  try {
    const rows = await db
      .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(inArray(siteSettingsTable.key, keys));

    const result = { ...DEFAULT_DELIVERY_CHARGES };
    for (const row of rows) {
      const v = Number(row.value);
      if (!Number.isFinite(v) || v <= 0) continue;
      if (row.key === "delivery_standard_price") result.standard = v;
      if (row.key === "delivery_express_price") result.express = v;
      if (row.key === "delivery_priority_price") result.priority = v;
    }
    await ensureManagement();
    const shipping=extractRows(await db.execute(sql`SELECT data FROM imaginate_documents WHERE kind='shipping' AND status='published'
      AND data->>'countryCode'='AE' AND (publish_at IS NULL OR publish_at<=NOW()) AND (unpublish_at IS NULL OR unpublish_at>NOW()) ORDER BY updated_at ASC`));
    for(const row of shipping){
      const method=row.data.method||"standard",amount=Number(row.data.amount);
      if((DELIVERY_METHODS as readonly string[]).includes(method)&&Number.isFinite(amount)&&amount>0)result[method]=amount;
    }
    return result;
  } catch (error) { throw new Error("Delivery configuration is temporarily unavailable.",{cause:error}); }
}
