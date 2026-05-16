import { Router } from "express";
import { db, productsTable, ordersTable, orderItemsTable, categoriesTable } from "@workspace/db";
import { eq, lt, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/store/stats", async (_req, res) => {
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [revenueResult] = await db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(ordersTable);
  const [pendingResult] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending"));

  const recentOrdersRaw = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(5);
  const recentOrders = await Promise.all(recentOrdersRaw.map(async (o) => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
    return {
      ...o,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      items: items.map((i) => ({ ...i, price: Number(i.price) })),
    };
  }));

  const lowStockProducts = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      sizes: productsTable.sizes,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(lt(productsTable.stock, 5))
    .limit(10);

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
