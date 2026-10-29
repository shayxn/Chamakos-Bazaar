const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createRequire } = require("node:module");
const localRequire = createRequire(path.join(__dirname, "../package.json"));

function load(relative, modules = {}) {
  const filename = path.join(__dirname, "../src", relative);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, require: name => name in modules ? modules[name] : localRequire(name),
    console, Date, Map, Number, String,
  }, { filename });
  return exports;
}
const personal = load("lib/personalization.ts");

test("personalisation prices are 0, 10, 10, and 20 AED per unit", () => {
  for (const [value, expected] of [
    [{}, 0], [{ personalizationName: "Ali" }, 10],
    [{ personalizationNumber: "007" }, 10],
    [{ personalizationName: "Ali", personalizationNumber: "007" }, 20],
  ]) assert.equal(personal.personalizationFee(value), expected);
});

test("name normalization and number validation preserve customer input safely", () => {
  assert.equal(personal.personalizationInput.parse({ personalizationName: "  Ali  " }).personalizationName, "Ali");
  assert.equal(personal.personalizationInput.parse({ personalizationNumber: "007" }).personalizationNumber, "007");
  for (const value of [
    { personalizationName: "" }, { personalizationName: " ".repeat(3) },
    { personalizationName: "x".repeat(31) }, { personalizationName: "A\nB" },
    { personalizationNumber: "" }, { personalizationNumber: "1234" },
    { personalizationNumber: "-1" }, { personalizationNumber: "1.5" },
    { personalizationNumber: 7 }, { personalizationNumber: "ABC" },
  ]) assert.equal(personal.personalizationInput.safeParse(value).success, false, JSON.stringify(value));
});

function checkoutHarness(items) {
  const inserts = {};
  const tables = Object.fromEntries(["ordersTable", "orderItemsTable", "orderTrackingEventsTable", "cartItemsTable", "customerAccountsTable"].map(name => [name, name]));
  const tx = {
    execute: async q => q.text.includes("FROM cart_items c JOIN products") ? items.map(i => ({ ...i })) : [],
    insert: table => ({ values(value) {
      inserts[table] = value;
      return { returning: async () => [{ id: 123, ...value }], then: resolve => resolve([]) };
    } }),
    delete: () => ({ where: async () => {} }),
  };
  const { createValidatedOrder } = load("lib/checkout-service.ts", {
    "@workspace/db": { ...tables, db: { execute: async () => [], transaction: callback => callback(tx) } },
    "drizzle-orm": { eq: () => {}, sql: (strings, ...values) => ({ text: strings.join("?"), values }) },
    "./management-db": { rows: rows => rows },
    "./delivery": { getDeliveryCharges: async () => ({ standard: 25, express: 35, priority: 50 }) },
    "./discount-validation": { ensureDiscounts: async () => {}, validateDiscount: async () => null },
    "./commerce-schema": { ensureCommerceSchema: async () => {} },
    "./global-store": { selectedStoreCountry: () => "AE", validateCheckoutCountry: async () => ({ name: "UAE" }) },
    "./personalization": personal,
  });
  return { inserts, run: () => createValidatedOrder({
    session: { cartId: "isolated-test" },
    body: { customerName: "Test Customer", customerPhone: "0000000000", customerAddress: "Isolated test address", tip: 5 },
  }, "cod") };
}

test("checkout persists inclusive unit prices, chosen text, fee and correct quantity totals", async () => {
  const base = { productId: 1, productName: "Test", price: "100", quantity: 2, isPreOrder: true, variants: [], sizes: "", colors: "" };
  const h = checkoutHarness([
    { ...base }, { ...base, personalizationName: "Ali" },
    { ...base, personalizationNumber: "007" },
    { ...base, personalizationName: "Ali", personalizationNumber: "007" },
  ]);
  await h.run();
  const lines = h.inserts.orderItemsTable;
  assert.deepEqual(Array.from(lines, i => i.price), ["100", "110", "110", "120"]);
  assert.deepEqual(Array.from(lines, i => i.personalizationFee), ["0", "10", "10", "20"]);
  assert.equal(lines[3].personalizationNumber, "007");
  assert.equal(lines[3].personalizationName, "Ali");
  assert.equal(h.inserts.ordersTable.total, "910"); // 880 items + 25 delivery + 5 tip
});

test("variant price is applied before personalisation, never replaced or doubled", async () => {
  const h = checkoutHarness([{ productId: 1, productName: "Variant", price: "100", quantity: 3,
    isPreOrder: true, variants: [{ id: "v1", price: 125, stock: 0, size: "M", color: "Black" }],
    variantId: "v1", sizes: "M", size: "M", colors: "Black", color: "Black",
    personalizationName: "Ali", personalizationNumber: "09" }]);
  await h.run();
  assert.equal(h.inserts.orderItemsTable[0].price, "145");
  assert.equal(h.inserts.ordersTable.total, "465");
});

test("checkout rejects malformed stored personalisation instead of charging for invalid work", async () => {
  const h = checkoutHarness([{ productId: 1, productName: "Test", price: "100", quantity: 1,
    isPreOrder: true, variants: [], personalizationNumber: "bad" }]);
  await assert.rejects(h.run, /Check personalisation/);
  assert.equal(h.inserts.ordersTable, undefined);
});
