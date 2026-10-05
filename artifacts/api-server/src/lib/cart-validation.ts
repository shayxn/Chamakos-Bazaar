import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function validateCartProduct(productId: number, quantity: number, size?: string | null, color?:string|null,variantId?:string|null) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Quantity must be between 1 and 99.");
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id,productId));
  if (!p || p.hidden || p.comingSoon || p.collection === "back_to_school" ||
    (p.publishAt && p.publishAt.getTime()>Date.now()) || (p.unpublishAt && p.unpublishAt.getTime()<=Date.now()))
    throw new Error("This product is not available.");
  const variant = p.variants.find(v=>v.id===variantId && v.size===(size??"") && v.color===(color??""));
  if (p.variants.length && !variant) throw new Error("Please choose a valid product variant.");
  if (!p.isPreOrder && quantity > (variant?.stock ?? p.stock)) throw new Error("Not enough stock is available.");
  const sizes = p.sizes?.split(",").map(v=>v.trim()).filter(Boolean) ?? [];
  if (sizes.length && !sizes.includes(size ?? "")) throw new Error("Please choose a valid size.");
  const colors = p.colors?.split(",").map(v=>v.trim()).filter(Boolean) ?? [];
  if (colors.length && !colors.includes(color ?? "")) throw new Error("Please choose a valid color.");
}
