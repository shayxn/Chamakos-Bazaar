import { Router } from "express";
import { db, productsTable, ordersTable, orderItemsTable, categoriesTable } from "@workspace/db";
import { eq, inArray, lt, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/store/stats", requireAdmin, async (_req, res) => {
  const [
    [productCount],
    [orderCount],
    [revenueResult],
    [pendingResult],
    recentOrdersRaw,
    lowStockProducts,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(ordersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending")),
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(5),
    db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        imageUrl: productsTable.imageUrl,
        imageUrls: productsTable.imageUrls,
        stock: productsTable.stock,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        featured: productsTable.featured,
        rep: productsTable.rep,
        sizes: productsTable.sizes,
        isPreOrder: productsTable.isPreOrder,
        preOrderLabel: productsTable.preOrderLabel,
        preOrderDate: productsTable.preOrderDate,
        preOrderNote: productsTable.preOrderNote,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(lt(productsTable.stock, 5))
      .limit(10),
  ]);

  const recentOrderItems = recentOrdersRaw.length > 0
    ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, recentOrdersRaw.map((o) => o.id)))
    : [];
  const itemsByOrderId = new Map<number, typeof recentOrderItems>();
  for (const item of recentOrderItems) {
    if (!itemsByOrderId.has(item.orderId)) itemsByOrderId.set(item.orderId, []);
    itemsByOrderId.get(item.orderId)!.push(item);
  }

  const recentOrders = recentOrdersRaw.map((order) => ({
    ...order,
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({ ...item, price: Number(item.price) })),
  }));

  res.json({
    totalProducts: productCount.count,
    totalOrders: orderCount.count,
    totalRevenue: Number(revenueResult.total),
    pendingOrders: pendingResult.count,
    recentOrders,
    lowStockProducts: lowStockProducts.map((p) => ({
      ...p,
      price: Number(p.price),
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

export default router;
