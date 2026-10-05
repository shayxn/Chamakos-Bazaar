import { db,ordersTable,orderTrackingEventsTable } from "@workspace/db";
import { eq,sql } from "drizzle-orm";
import { rows } from "./management-db";
import { releaseOrderStock } from "./order-stock";
import { ensureCommerceSchema } from "./commerce-schema";
import { createAdminNotification } from "./admin-notifications";

export async function verifyZiinaPayment(orderId:number){
  await ensureCommerceSchema();
  const [order]=await db.select().from(ordersTable).where(eq(ordersTable.id,orderId));
  if(!order)throw new Error("Order not found.");
  if(order.paymentMethod!=="ziina")return {status:"not-required",orderStatus:order.status};
  if(["paid","failed","canceled"].includes(order.paymentStatus??""))return {status:order.paymentStatus,orderStatus:order.status};
  if(!process.env.ZIINA_ACCESS_TOKEN)throw new Error("Online payment verification is not configured. Payment has not been confirmed.");
  if(!order.paymentIntentId)throw new Error("No payment intent is recorded for this order. Payment has not been confirmed.");
  const response=await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(order.paymentIntentId)}`,{
    headers:{Authorization:`Bearer ${process.env.ZIINA_ACCESS_TOKEN}`},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("The payment provider could not verify this payment. Try again.");
  const intent=await response.json() as {id:string;status:string;amount:number;currency_code:string};
  if(intent.id!==order.paymentIntentId||intent.currency_code!=="AED"||intent.amount!==Math.round(Number(order.total)*100))
    throw new Error("The payment provider returned mismatched payment details. Contact support.");
  const status=intent.status==="completed"?"paid":intent.status==="failed"?"failed":intent.status==="canceled"?"canceled":"pending";
  const updated=await db.transaction(async tx=>{
    const current=rows(await tx.execute(sql`SELECT * FROM orders WHERE id=${orderId} FOR UPDATE`))[0];
    if(["paid","failed","canceled"].includes(current.payment_status??""))return false;
    const orderStatus=status==="paid"&&!current.stock_released&&current.status!=="cancelled"?"confirmed":
      ["failed","canceled"].includes(status)?"cancelled":current.status;
    await tx.update(ordersTable).set({paymentStatus:status,status:orderStatus}).where(eq(ordersTable.id,orderId));
    if(["failed","canceled"].includes(status)){
      await releaseOrderStock(orderId,tx);
      if(current.coupon_code&&current.discount_customer_key){
        await tx.execute(sql`UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE code=${current.coupon_code}`);
        await tx.execute(sql`UPDATE imaginate_discount_uses SET count=GREATEST(0,count-1) WHERE customer_key=${current.discount_customer_key}
          AND coupon_id IN (SELECT id FROM coupons WHERE code=${current.coupon_code})`);
      }
    }
    if(status!=="pending")await tx.insert(orderTrackingEventsTable).values({orderId,status:orderStatus,note:status==="paid"?"Payment verified by provider":`Payment ${status} verified by provider; reserved stock released`});
    return status!=="pending";
  });
  if(updated)await createAdminNotification(status==="paid"?"Online payment verified":"Online payment not completed",order.orderNumber||`Order ${orderId}`,
    status==="paid"?"orders":"important",`/admin/orders`);
  const [fresh]=await db.select({status:ordersTable.status}).from(ordersTable).where(eq(ordersTable.id,orderId));
  return {status,orderStatus:fresh.status};
}
