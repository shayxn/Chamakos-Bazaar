import { db, productsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rows } from "../src/lib/management-db";

async function run() {
  if(process.argv[2]!=="--confirmed-delete")throw new Error("Explicit catalog deletion confirmation is required.");
  const result=await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('imaginate-catalog-reset'))`);
    const before=rows(await tx.execute(sql`SELECT COUNT(*)::int AS n FROM products`))[0];
    const orders=rows(await tx.execute(sql`SELECT COUNT(*)::int AS n FROM orders`))[0];
    // Do not cascade-delete historic order items if an unexpected database constraint exists.
    const dangerous=rows(await tx.execute(sql`SELECT conname FROM pg_constraint
      WHERE contype='f' AND confrelid='products'::regclass AND conrelid='order_items'::regclass`));
    if(dangerous.length)throw new Error("Historical order constraints need review before catalog deletion.");
    await tx.execute(sql`DELETE FROM cart_items`);
    await tx.execute(sql`DELETE FROM stock_alerts`);
    await tx.execute(sql`DELETE FROM wishlists`);
    await tx.execute(sql`DELETE FROM product_import_queue`);
    await tx.delete(productsTable);
    await tx.insert(productsTable).values([
      {name:"IMAGINATE Test Tee",description:"Clearly labeled test product for checking variants, cart and checkout. Not part of the former catalog.",
        price:"50.00",imageUrl:"/imaginate-logo.png",stock:4,sizes:"S,M",colors:"Black,Purple",featured:true,newArrival:true,
        variants:[{id:"test-tee-black-s",size:"S",color:"Black",stock:2,price:50},{id:"test-tee-purple-m",size:"M",color:"Purple",stock:2,price:55}]},
      {name:"IMAGINATE Test Pre-order",description:"Clearly labeled test product for checking the pre-order experience. No shipping or release date is promised.",
        price:"75.00",imageUrl:"/imaginate-logo.png",stock:3,sizes:"M",colors:"Purple",featured:true,isPreOrder:true,
        preOrderLabel:"Test pre-order",variants:[{id:"test-preorder-purple-m",size:"M",color:"Purple",stock:3,price:75}]},
    ]);
    const afterOrders=rows(await tx.execute(sql`SELECT COUNT(*)::int AS n FROM orders`))[0];
    if(orders.n!==afterOrders.n)throw new Error("Historical orders changed; aborting.");
    return {removed:before.n,added:2,historicalOrdersPreserved:true};
  });
  process.stdout.write(JSON.stringify(result)+"\n");
}
run().then(()=>process.exit(0)).catch(error=>{process.stderr.write(error.message+"\n");process.exit(1);});
