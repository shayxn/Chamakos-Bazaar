import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const DEFAULT_DELIVERY_CHARGES: Record<string, number> = {
  standard: 20,
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
    return result;
  } catch {
    return { ...DEFAULT_DELIVERY_CHARGES };
  }
}
