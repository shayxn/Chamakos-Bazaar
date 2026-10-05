import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rows } from "./management-db";
export async function releaseOrderStock(orderId:number,executor:Pick<typeof db,"execute">=db){
  const claimed=rows(await executor.execute(sql`UPDATE orders SET stock_released=TRUE WHERE id=${orderId} AND stock_reserved=TRUE AND stock_released=FALSE RETURNING id`));
  if(!claimed.length)return;
  const items=rows(await executor.execute(sql`SELECT product_id,variant_id,quantity FROM order_items WHERE order_id=${orderId} AND is_pre_order=FALSE ORDER BY product_id`));
  for(const item of items){
    if(item.variant_id){
      const p=rows(await executor.execute(sql`SELECT variants FROM products WHERE id=${item.product_id} FOR UPDATE`))[0];
      if(!p)continue;
      const variants=(p.variants??[]).map((v:any)=>v.id===item.variant_id?{...v,stock:v.stock+item.quantity}:v);
      await executor.execute(sql`UPDATE products SET variants=${JSON.stringify(variants)}::jsonb,stock=${variants.reduce((sum:number,v:any)=>sum+v.stock,0)} WHERE id=${item.product_id}`);
    }else await executor.execute(sql`UPDATE products SET stock=stock+${item.quantity} WHERE id=${item.product_id}`);
  }
}
