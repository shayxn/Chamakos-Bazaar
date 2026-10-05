import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { defaultGlobalConfig, globalConfigSchema, validateCheckoutCountry } from "../src/lib/global-store";

async function check() {
  const original = db.execute;
  let config = defaultGlobalConfig();
  (db as any).execute = async () => [{value:JSON.stringify(config)}];
  try {
    assert.equal((await validateCheckoutCountry("AE","cod",undefined,"US")).code,"AE",
      "Global off must recover an old foreign session.");
    await assert.rejects(validateCheckoutCountry("US","cod"),/not available/);
    config.enabled = true;
    await assert.rejects(validateCheckoutCountry("US","cod"),/only in the UAE/);
    await assert.rejects(validateCheckoutCountry("AE","cod",undefined,"US"),/selection changed/);
    assert.equal((await validateCheckoutCountry("US","ziina","ziina","US")).code,"US");
    await assert.rejects(validateCheckoutCountry("US","ziina","cod"),/payment method/);
    config.paymentMethods.find(m=>m.provider==="ziina")!.countries=["AE"];
    await assert.rejects(validateCheckoutCountry("US","ziina"),/payment method/);
    config.countries.find(c=>c.code==="US")!.enabled=false;
    assert.equal((await validateCheckoutCountry("AE","cod",undefined,"US")).code,"AE");
    await assert.rejects(validateCheckoutCountry("US","cod"),/not available/);
    config.paymentMethods.find(m=>m.provider==="cod")!.countries=["AE","US"];
    assert.equal(globalConfigSchema.safeParse(config).success,false);
    console.log("PASS: global-off and removed-country recovery, UAE-only COD, selected-country binding, provider/country limits, invalid COD configuration. No live records changed.");
  }finally{(db as any).execute=original;}
}
check().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);});
