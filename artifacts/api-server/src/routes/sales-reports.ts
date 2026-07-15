import { Router } from "express";
import { db, ordersTable, orderItemsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

/** Drizzle db.execute() returns either an array directly (postgres.js) or {rows:[]} (pg).
 *  This helper normalises both shapes. */
function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const r = (result as any)?.rows;
  if (Array.isArray(r)) return r as T[];
  return [];
}

router.get("/sales/reports", requireAdmin, async (req, res) => {
  const now = new Date();
  const dayAgo  = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7  * 86400000);
  const monthAgo= new Date(now.getTime() - 30 * 86400000);

  const EMPTY = { total: "0", count: "0" };

  const [allRaw, dayRaw, weekRaw, monthRaw] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled'`),
    db.execute(sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled' AND created_at >= ${dayAgo.toISOString()}`),
    db.execute(sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled' AND created_at >= ${weekAgo.toISOString()}`),
    db.execute(sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled' AND created_at >= ${monthAgo.toISOString()}`),
  ]);

  const allRevenue   = extractRows<{ total: string; count: string }>(allRaw)[0]   ?? EMPTY;
  const dayRevenue   = extractRows<{ total: string; count: string }>(dayRaw)[0]   ?? EMPTY;
  const weekRevenue  = extractRows<{ total: string; count: string }>(weekRaw)[0]  ?? EMPTY;
  const monthRevenue = extractRows<{ total: string; count: string }>(monthRaw)[0] ?? EMPTY;

  const [bestProductsRaw, topCustomersRaw, dailySalesRaw, statusRaw] = await Promise.all([
    db.execute(sql`
      SELECT oi.product_name, SUM(oi.quantity)::text as total_qty, SUM(oi.quantity * oi.price)::text as total_revenue
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_name ORDER BY total_qty DESC LIMIT 10`),
    db.execute(sql`
      SELECT customer_name, customer_email, COUNT(*)::text as order_count, SUM(total)::text as total_spent
      FROM orders WHERE status != 'cancelled' AND customer_email IS NOT NULL
      GROUP BY customer_name, customer_email ORDER BY total_spent DESC LIMIT 10`),
    db.execute(sql`
      SELECT DATE(created_at)::text as day, SUM(total)::text as revenue, COUNT(*)::text as orders
      FROM orders WHERE status != 'cancelled' AND created_at >= ${monthAgo.toISOString()}
      GROUP BY DATE(created_at) ORDER BY day ASC`),
    db.execute(sql`
      SELECT status, COUNT(*)::text as count FROM orders GROUP BY status ORDER BY count DESC`),
  ]);

  type PRow = { product_name: string; total_qty: string; total_revenue: string };
  type CRow = { customer_name: string; customer_email: string; order_count: string; total_spent: string };
  type DRow = { day: string; revenue: string; orders: string };
  type SRow = { status: string; count: string };

  res.json({
    summary: {
      allTime: { revenue: Number(allRevenue.total),   orders: Number(allRevenue.count)   },
      today:   { revenue: Number(dayRevenue.total),   orders: Number(dayRevenue.count)   },
      week:    { revenue: Number(weekRevenue.total),  orders: Number(weekRevenue.count)  },
      month:   { revenue: Number(monthRevenue.total), orders: Number(monthRevenue.count) },
    },
    bestProducts: extractRows<PRow>(bestProductsRaw).map(p => ({
      name: p.product_name, qty: Number(p.total_qty), revenue: Number(p.total_revenue),
    })),
    topCustomers: extractRows<CRow>(topCustomersRaw).map(c => ({
      name: c.customer_name, email: c.customer_email, orders: Number(c.order_count), spent: Number(c.total_spent),
    })),
    dailySales: extractRows<DRow>(dailySalesRaw).map(d => ({
      day: d.day, revenue: Number(d.revenue), orders: Number(d.orders),
    })),
    statusBreakdown: extractRows<SRow>(statusRaw).map(s => ({
      status: s.status, count: Number(s.count),
    })),
  });
});

export default router;
