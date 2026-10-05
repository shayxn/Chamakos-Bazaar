import { randomBytes } from "node:crypto";
import { db, ordersTable, orderItemsTable, orderTrackingEventsTable, cartItemsTable, customerAccountsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import type { Request } from "express";
import { z } from "zod";
import { rows } from "./management-db";
import { getDeliveryCharges } from "./delivery";
import { validateDiscount, ensureDiscounts } from "./discount-validation";
import { ensureCommerceSchema } from "./commerce-schema";
import { validateCheckoutCountry, selectedStoreCountry } from "./global-store";

const checkoutInput = z.object({
  customerName: z.string().trim().min(2).max(150), customerPhone: z.string().trim().min(7).max(30),
  customerAddress: z.string().trim().min(5).max(1000),
  deliveryMethod: z.enum(["standard","express","priority"]).default("standard"),
  tip: z.coerce.number().finite().min(0).max(500).default(0),
  country: z.string().trim().max(100).optional(),
  paymentMethodId: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/).optional(),
  couponCode: z.string().trim().max(80).optional(),
});
export class CheckoutError extends Error {}

export async function createValidatedOrder(req: Request, paymentMethod: "cod" | "ziina", clearCart = true) {
  await ensureCommerceSchema();
  const parsed = checkoutInput.safeParse(req.body);
  if (!parsed.success) throw new CheckoutError("Check your name, phone, address, delivery option, and country.");
  const b = parsed.data;
  const session = req.session as Record<string, unknown>;
  const normalizeCountry = (value: unknown) => {
    const code = String(value ?? "AE").toUpperCase();
    return ["UAE","UNITED ARAB EMIRATES"].includes(code) ? "AE" : code;
  };
  const selected = selectedStoreCountry(req);
  const code = normalizeCountry(b.country ?? selected);
  let country;
  try { country = await validateCheckoutCountry(code, paymentMethod, b.paymentMethodId,
    selected ? normalizeCountry(selected) : undefined); }
  catch (error) { throw new CheckoutError((error as Error).message); }
  if (code !== "AE" && b.deliveryMethod !== "standard")
    throw new CheckoutError("Only standard delivery is configured outside the UAE.");
  const cartId = String(session.cartId ?? "");
  if (!cartId) throw new CheckoutError("Cart is empty.");
  await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT, ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0`);
  if (b.couponCode) await ensureDiscounts();
  const charges = await getDeliveryCharges();
  const deliveryCharge = code === "AE" ? charges[b.deliveryMethod] : country.shippingAED;
  if (deliveryCharge === null) throw new CheckoutError("Delivery pricing has not been configured for your country.");
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0) throw new CheckoutError("This delivery option is not configured.");
  const [customer] = session.customerId ? await db.select({ email:customerAccountsTable.email }).from(customerAccountsTable).where(eq(customerAccountsTable.id, Number(session.customerId))) : [];
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${cartId}))`);
    if(paymentMethod==="ziina"&&rows(await tx.execute(sql`SELECT id FROM orders WHERE payment_cart_id=${cartId} AND payment_status IN ('initializing','pending') LIMIT 1`)).length)
      throw new CheckoutError("Online payment is already pending. Check your order before starting another payment.");
    const items = rows(await tx.execute(sql`SELECT c.product_id AS "productId",c.quantity,c.size,c.color,c.variant_id AS "variantId",p.variants,p.colors,p.name AS "productName",
      p.price,p.stock,p.sizes,p.collection,p.is_pre_order AS "isPreOrder",p.hidden,p.coming_soon,p.publish_at,p.unpublish_at
      FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.session_id=${cartId} ORDER BY p.id FOR UPDATE OF p,c`));
    if (!items.length) throw new CheckoutError("Cart is empty.");
    const quantities = new Map<number,number>();
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)
        throw new CheckoutError("An item in your bag has an invalid quantity or price.");
      if (item.hidden || item.coming_soon || item.collection === "back_to_school" ||
        (item.publish_at && new Date(item.publish_at).getTime() > Date.now()) ||
        (item.unpublish_at && new Date(item.unpublish_at).getTime() <= Date.now()))
        throw new CheckoutError(`${item.productName} is no longer available. Remove it from your bag.`);
      const sizes = String(item.sizes ?? "").split(",").map(v=>v.trim()).filter(Boolean);
      if (sizes.length && !sizes.includes(String(item.size ?? ""))) throw new CheckoutError(`Choose a valid size for ${item.productName}.`);
      const colors = String(item.colors ?? "").split(",").map(v=>v.trim()).filter(Boolean);
      if (colors.length && !colors.includes(String(item.color??""))) throw new CheckoutError(`Choose a valid color for ${item.productName}.`);
      const variants: {id:string;size:string;color:string;price:number|null;stock:number}[] = item.variants ?? [];
      const variant = variants.find(v=>v.id===item.variantId && v.size===(item.size??"") && v.color===(item.color??""));
      if (variants.length && !variant) throw new CheckoutError(`Choose a valid variant for ${item.productName}.`);
      if (variant) item.price=variant.price ?? item.price;
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      item.price = Number(item.price);
    }
    for (const [id, quantity] of quantities) {
      const product = items.find(i=>i.productId===id)!;
      if (!product.isPreOrder) {
        if (product.variants?.length) {
          const variants=product.variants.map((v:any)=>({...v}));
          for(const item of items.filter(i=>i.productId===id)){
            const v=variants.find((v:any)=>v.id===item.variantId);
            if(!v||v.stock<item.quantity)throw new CheckoutError(`There is not enough stock for ${product.productName}.`);
            v.stock-=item.quantity;
          }
          await tx.execute(sql`UPDATE products SET variants=${JSON.stringify(variants)}::jsonb,stock=${variants.reduce((sum:number,v:any)=>sum+v.stock,0)} WHERE id=${id}`);
        } else {
          const updated = rows(await tx.execute(sql`UPDATE products SET stock=stock-${quantity} WHERE id=${id} AND stock>=${quantity} RETURNING id`));
          if (!updated.length) throw new CheckoutError(`There is not enough stock for ${product.productName}.`);
        }
      }
    }
    const itemsSubtotal = items.reduce((sum,i)=>sum+i.price*i.quantity,0);
    const customerKey = session.customerId ? `customer:${session.customerId}` : `phone:${b.customerPhone.replace(/\D/g,"")}`;
    const discount = b.couponCode ? await validateDiscount(b.couponCode,{items:items as any,customerKey,country:code},true,tx) : null;
    const total = Math.round(Math.max(0,itemsSubtotal+deliveryCharge+b.tip-(discount?.discountAmount ?? 0))*100)/100;
    const orderNumber = `IMG-${randomBytes(6).toString("hex").toUpperCase()}`;
    const [order] = await tx.insert(ordersTable).values({
      orderNumber,customerName:b.customerName,customerPhone:b.customerPhone,
      customerAddress:code === "AE" ? b.customerAddress : `${b.customerAddress}\n${country.name}`,
      countryCode:code,
      customerId:session.customerId?Number(session.customerId):null,
      stockReserved:true,paymentStatus:paymentMethod==="ziina"?"initializing":null,
      paymentCartId:paymentMethod==="ziina"?cartId:null,discountCustomerKey:discount?customerKey:null,
      customerEmail:customer?.email ?? null,paymentMethod,deliveryMethod:b.deliveryMethod,deliveryCharge:String(deliveryCharge),
      tip:String(b.tip),total:String(total),status:"pending",hasPreOrder:items.some(i=>i.isPreOrder),
    }).returning();
    if (discount) await tx.execute(sql`UPDATE orders SET coupon_code=${discount.couponCode},discount_amount=${discount.discountAmount} WHERE id=${order.id}`);
    await tx.insert(orderItemsTable).values(items.map(i=>({
      orderId:order.id,productId:i.productId,productName:i.productName,price:String(i.price),quantity:i.quantity,size:i.size,color:i.color,variantId:i.variantId,isPreOrder:i.isPreOrder,
    })));
    await tx.insert(orderTrackingEventsTable).values({orderId:order.id,status:"pending",note:paymentMethod==="cod" ? "Order placed successfully" : "Awaiting payment provider confirmation"});
    if (clearCart) await tx.delete(cartItemsTable).where(eq(cartItemsTable.sessionId,cartId));
    return {order,items,discount,customerKey};
  });
}

export async function releaseFailedCheckout(created: Awaited<ReturnType<typeof createValidatedOrder>>) {
  await db.transaction(async tx => {
    const claimed = rows(await tx.execute(sql`UPDATE orders SET status='cancelled',stock_released=TRUE,payment_status='failed' WHERE id=${created.order.id} AND status='pending' AND stock_released=FALSE RETURNING id`));
    if (!claimed.length) return;
    for (const item of created.items) if (!item.isPreOrder) {
      if(item.variantId){
        const current=rows(await tx.execute(sql`SELECT variants FROM products WHERE id=${item.productId} FOR UPDATE`))[0];
        const variants=(current?.variants??[]).map((v:any)=>v.id===item.variantId?{...v,stock:v.stock+item.quantity}:v);
        await tx.execute(sql`UPDATE products SET variants=${JSON.stringify(variants)}::jsonb,stock=${variants.reduce((sum:number,v:any)=>sum+v.stock,0)} WHERE id=${item.productId}`);
      }else await tx.execute(sql`UPDATE products SET stock=stock+${item.quantity} WHERE id=${item.productId}`);
    }
    if (created.discount) {
      await tx.execute(sql`UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=${created.discount.id}`);
      await tx.execute(sql`UPDATE imaginate_discount_uses SET count=GREATEST(0,count-1) WHERE coupon_id=${created.discount.id} AND customer_key=${created.customerKey}`);
    }
    await tx.insert(orderTrackingEventsTable).values({orderId:created.order.id,status:"cancelled",note:"Payment initialization failed; no payment confirmed."});
  });
}
