import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function validateCartProduct(productId: number, quantity: number, size?: string | null, color?:string|null,variantId?:string|null) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Quantity must be between 1 and 99.");
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id,productId));
  if (!p || p.hidden || p.comingSoon || (p.collection != null && p.collection !== "basics") ||
    (p.unpublishAt && p.unpublishAt.getTime()<=Date.now()))
    throw new Error("This product is not available.");
  if (p.publishAt && p.publishAt.getTime() > Date.now()) {
    throw new Error(p.isPreOrder ? "Pre-orders for this product have not opened yet." : "This product has not launched yet.");
  }
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const variant = variants.find(v=>v.id===variantId && (!v.size || v.size===(size??"")) && (!v.color || v.color===(color??"")));
  if (variants.length && !variant) throw new Error("Please choose a valid product variant.");
  if (!p.isPreOrder && quantity > (variant?.stock ?? p.stock)) throw new Error("Not enough stock is available.");
  const sizes = p.sizes?.split(",").map(v=>v.trim()).filter(Boolean) ?? [];
  if (sizes.length && !sizes.includes(size ?? "")) throw new Error("Please choose a valid size.");
  const colors = p.colors?.split(",").map(v=>v.trim()).filter(Boolean) ?? [];
  if (colors.length && !colors.includes(color ?? "")) throw new Error("Please choose a valid color.");
}
