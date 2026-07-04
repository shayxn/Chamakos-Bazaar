import { Router } from "express";
import { db, ordersTable, orderItemsTable } from "@workspace/db";
import { gte, sql, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/sales/reports", requireAdmin, async (req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  type RevenueRow = { total: string; count: string };
  type DbResult = { rows: RevenueRow[] };
  const EMPTY: RevenueRow = { total: "0", count: "0" };
  const allRevenue = (((await db.execute<RevenueRow>(
    sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled'`
  )) as unknown as DbResult).rows ?? [])[0] ?? EMPTY;
  const dayRevenue = (((await db.execute<RevenueRow>(
    sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled' AND created_at >= ${dayAgo.toISOString()}`
  )) as unknown as DbResult).rows ?? [])[0] ?? EMPTY;
  const weekRevenue = (((await db.execute<RevenueRow>(
    sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled' AND created_at >= ${weekAgo.toISOString()}`
  )) as unknown as DbResult).rows ?? [])[0] ?? EMPTY;
  const monthRevenue = (((await db.execute<RevenueRow>(
    sql`SELECT COALESCE(SUM(total),0)::text as total, COUNT(*)::text as count FROM orders WHERE status != 'cancelled' AND created_at >= ${monthAgo.toISOString()}`
  )) as unknown as DbResult).rows ?? [])[0] ?? EMPTY;

  const bestProducts = await db.execute<{ product_name: string; total_qty: string; total_revenue: string }>(
    sql`SELECT oi.product_name, SUM(oi.quantity)::text as total_qty, SUM(oi.quantity * oi.price)::text as total_revenue
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_name ORDER BY total_qty DESC LIMIT 10`
  );

  const topCustomers = await db.execute<{ customer_name: string; customer_email: string; order_count: string; total_spent: string }>(
    sql`SELECT customer_name, customer_email, COUNT(*)::text as order_count, SUM(total)::text as total_spent
        FROM orders WHERE status != 'cancelled' AND customer_email IS NOT NULL
        GROUP BY customer_name, customer_email ORDER BY total_spent DESC LIMIT 10`
  );

  const dailySales = await db.execute<{ day: string; revenue: string; orders: string }>(
    sql`SELECT DATE(created_at)::text as day, SUM(total)::text as revenue, COUNT(*)::text as orders
        FROM orders WHERE status != 'cancelled' AND created_at >= ${monthAgo.toISOString()}
        GROUP BY DATE(created_at) ORDER BY day ASC`
  );

  const statusBreakdown = await db.execute<{ status: string; count: string }>(
    sql`SELECT status, COUNT(*)::text as count FROM orders GROUP BY status ORDER BY count DESC`
  );

  res.json({
    summary: {
      allTime: { revenue: Number(allRevenue.total), orders: Number(allRevenue.count) },
      today: { revenue: Number(dayRevenue.total), orders: Number(dayRevenue.count) },
      week: { revenue: Number(weekRevenue.total), orders: Number(weekRevenue.count) },
      month: { revenue: Number(monthRevenue.total), orders: Number(monthRevenue.count) },
    },
    bestProducts: (bestProducts as unknown as { product_name: string; total_qty: string; total_revenue: string }[]).map(p => ({
      name: p.product_name, qty: Number(p.total_qty), revenue: Number(p.total_revenue),
    })),
    topCustomers: (topCustomers as unknown as { customer_name: string; customer_email: string; order_count: string; total_spent: string }[]).map(c => ({
      name: c.customer_name, email: c.customer_email, orders: Number(c.order_count), spent: Number(c.total_spent),
    })),
    dailySales: (dailySales as unknown as { day: string; revenue: string; orders: string }[]).map(d => ({
      day: d.day, revenue: Number(d.revenue), orders: Number(d.orders),
    })),
    statusBreakdown: (statusBreakdown as unknown as { status: string; count: string }[]).map(s => ({
      status: s.status, count: Number(s.count),
    })),
  });
});

export default router;
