import { Router } from "express";
import { db, productsTable, ordersTable, orderItemsTable, categoriesTable } from "@workspace/db";
import { eq, inArray, lt, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

type OrderMetadata = {
  address: string | null;
  phone: string | null;
  paymentMethod: string | null;
};

function decodeOrderMetadata(value?: string | null): OrderMetadata {
  if (!value) return { address: null, phone: null, paymentMethod: null };
  try {
    const parsed = JSON.parse(value) as { address?: unknown; phone?: unknown; paymentMethod?: unknown };
    return {
      address: typeof parsed.address === "string" ? parsed.address : value,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
      paymentMethod: typeof parsed.paymentMethod === "string" ? parsed.paymentMethod : null,
    };
  } catch {
    return { address: value, phone: null, paymentMethod: null };
  }
}

router.get("/store/stats", async (_req, res) => {
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
        stock: productsTable.stock,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        featured: productsTable.featured,
        rep: productsTable.rep,
        sizes: productsTable.sizes,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(lt(productsTable.stock, 5))
      .limit(10),
  ]);

  const recentOrderItems = recentOrdersRaw.length > 0
    ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, recentOrdersRaw.map((order) => order.id)))
    : [];
  const itemsByOrderId = new Map<number, typeof recentOrderItems>();
  for (const item of recentOrderItems) {
    let existing = itemsByOrderId.get(item.orderId);
    if (!existing) {
      existing = [];
      itemsByOrderId.set(item.orderId, existing);
    }
    existing.push(item);
  }

  const recentOrders = recentOrdersRaw.map((order) => {
    const metadata = decodeOrderMetadata(order.customerAddress);
    return {
      ...order,
      customerAddress: metadata.address,
      customerPhone: metadata.phone,
      paymentMethod: metadata.paymentMethod,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({ ...item, price: Number(item.price) })),
    };
  });

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
