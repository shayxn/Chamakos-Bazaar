import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as any)?.rows ?? []) as T[];
}

/** Returns the total available gift card balance for a customer */
export async function getCustomerGiftCardBalance(customerId: number): Promise<number> {
  const rows = extractRows<{ total: string }>(
    await db.execute(sql`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM gift_cards
      WHERE owner_customer_id = ${customerId} AND status = 'active' AND balance > 0
    `)
  );
  return Number(rows[0]?.total ?? 0);
}

/** Atomically deducts amountToUse from the customer's active gift cards.
 *  Processes oldest cards first. Returns the actual amount deducted. */
export async function applyGiftCardBalance(
  customerId: number,
  amountToUse: number,
  orderId: number
): Promise<number> {
  const cards = extractRows<{ id: number; balance: string }>(
    await db.execute(sql`
      SELECT id, balance FROM gift_cards
      WHERE owner_customer_id = ${customerId} AND status = 'active' AND balance > 0
      ORDER BY created_at ASC
    `)
  );

  let remaining = amountToUse;
  let totalDeducted = 0;

  for (const card of cards) {
    if (remaining <= 0.001) break;
    const cardBalance = Number(card.balance);
    const toDeduct = Math.min(cardBalance, remaining);
    const newBalance = Math.max(0, cardBalance - toDeduct);
    const newStatus = newBalance <= 0.001 ? "used" : "active";

    const result = await db.execute(sql`
      UPDATE gift_cards
      SET balance = ${newBalance},
          status = ${newStatus}
      WHERE id = ${card.id}
        AND balance >= ${toDeduct}
        AND status = 'active'
    `);

    const affected = (result as any).rowCount ?? (result as any).count ?? 1;
    if (Number(affected) > 0) {
      await db.execute(sql`
        INSERT INTO gift_card_transactions (gift_card_id, order_id, amount_used, balance_after, description)
        VALUES (${card.id}, ${orderId}, ${toDeduct}, ${newBalance}, 'Order payment')
      `);
      totalDeducted += toDeduct;
      remaining -= toDeduct;
    }
  }

  return totalDeducted;
}
