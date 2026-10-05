import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { PgDialect } from "drizzle-orm/pg-core";
import orders from "../src/routes/orders";

async function check(){
  const handler=(orders as any).stack.find((layer:any)=>layer.route?.path==="/orders/:id"&&layer.route.methods.delete).route.stack.at(-1).handle;
  const original=db.transaction;
  try{
    for(const status of ["pending","shipped","delivered","cancelled",null]){
      let stock=3, released=status==="cancelled", response=200, deletions=0;
      const executor={
        async execute(query:any){
          const text=new PgDialect().sqlToQuery(query).sql;
          if(text.includes("SELECT id,status FROM orders"))return status?[{id:123,status}]:[];
          if(text.includes("UPDATE orders SET stock_released")){
            if(released)return[];
            released=true;return[{id:123}];
          }
          if(text.includes("FROM order_items"))return[{product_id:456,quantity:1,variant_id:null}];
          if(text.includes("UPDATE products SET stock=stock+")){stock++;return[];}
          throw new Error(`Unexpected test query: ${text}`);
        },
        delete(){return{where:async()=>{deletions++;}};},
      };
      // Isolated process: inject an in-memory executor, never create/delete real orders or products.
      (db as any).transaction=async(fn:any)=>fn(executor);
      await handler({params:{id:"123"}},{json(){},sendStatus(code:number){response=code;},status(code:number){response=code;return this;}});
      assert.equal(stock,status==="pending"?4:3);
      assert.equal(response,status?200:404);
      assert.equal(deletions,status?3:0);
    }
    console.log("PASS: pending delete releases inventory; shipped/delivered preserve sold stock; cancelled delete is idempotent; missing order returns 404. No real order/product records changed.");
  }finally{(db as any).transaction=original;}
}
check().then(()=>process.exit(0)).catch(error=>{console.error({name:error.name,message:error.message,expected:error.expected,actual:error.actual});process.exit(1);});
