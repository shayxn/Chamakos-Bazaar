const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");

// Exercise the real route state machine with isolated DB/provider adapters.
// No account, order, customer, subscription or notification is created here.
function harness(deliver) {
  const endpoints = new Map(), sent = [], queries = [];
  const allowed = new Set([randomUUID(), randomUUID()]);
  let time = 100_000;
  const router = {};
  for (const method of ["get", "post"]) router[method] = (url, ...handlers) => endpoints.set(`${method}:${url}`, handlers.at(-1));
  const parse = { safeParse: data => ({ success: Array.isArray(data?.deviceIds) && data.deviceIds.length > 0 && Number.isInteger(data.expectedRevision), data }) };
  const modules = {
    express: { Router: () => router },
    "node:crypto": { randomUUID },
    "../lib/auth-middleware": { requireAdmin() {} },
    "../lib/admin-sessions": { touchAdminSession: async () => true },
    "@workspace/db": { usersTable: {}, db: { execute: async query => {
      queries.push(query.text);
      assert.ok(!/\b(?:orders|order_items|customers|customer_push_subscriptions|analytics|products)\b/.test(query.text));
      return allowed.has(query.values[0]) ? [{ id: query.values[0] }] : [];
    } } },
    "drizzle-orm": { eq() {}, sql: (strings, ...values) => ({ text: strings.join("?"), values }) },
    "@workspace/api-zod": { StartMovieSetupBody: parse, SendMovieFilmingBurstBody: parse, OptInMovieFilmingDeviceBody: parse },
    "../lib/management-db": { rows: result => Array.isArray(result) ? result : result.rows },
    "../lib/push": { prepareMoviePush: async () => {}, validMovieEndpoint: () => false, deliverMoviePush: async (...args) => {
      sent.push(args);
      assert.ok(allowed.has(args[0]), "Only selected/consented targets may be sent to");
      if (deliver) await deliver(...args);
    } },
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/routes/movie-setup.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, {
    require: name => { assert.ok(name in modules, `Unexpected dependency: ${name}`); return modules[name]; },
    exports: {}, Date: { now: () => time }, AbortController, URL,
    setTimeout: fn => setTimeout(fn, 1), clearTimeout, setInterval, clearInterval,
  });
  async function request(action, body = {}, method = "post") {
    const result = { status: 200, body: null };
    const res = { status(n) { result.status = n; return this; }, setHeader() { return this; }, json(data) { result.body = JSON.parse(JSON.stringify(data)); return this; } };
    await endpoints.get(`${method}:/admin/movie-setup/${action}`)({ body, session: { userId: 1 } }, res);
    return result;
  }
  const state = async () => (await request("state", {}, "get")).body;
  async function finish() {
    for (let i = 0; i < 1000; i++) {
      const current = await state();
      if (current.pushJob?.status !== "running") return current;
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    assert.fail("Isolated burst did not finish");
  }
  return { request, state, finish, sent, allowed: [...allowed], advance: ms => { time += ms; }, queries };
}

test("one movie sequence sends at most 50 total pushes, only to explicit targets", async () => {
  const h = harness();
  const start = await h.request("start", { expectedRevision: 0, deviceIds: h.allowed, eventCount: 999999, pushCount: 3200 });
  assert.equal(start.status, 200);
  assert.equal(start.body.run.eventCount, 3200);
  const done = await h.finish();
  assert.equal(done.pushJob.total, 50);
  assert.equal(done.pushJob.accepted, 50);
  assert.equal(h.sent.length, 50);
  assert.equal(new Set(h.sent.map(args => args[0])).size, 2);
  h.advance(20_001);
  const repeated = await h.request("push", { expectedRevision: done.revision, deviceIds: h.allowed, mode: "movie" });
  assert.equal(repeated.status, 409);
  assert.equal(h.sent.length, 50);
});
test("real test is capped at 10, not 10 per selected device", async () => {
  const h = harness();
  await h.request("push", { expectedRevision: 0, deviceIds: h.allowed, mode: "test" });
  const done = await h.finish();
  assert.equal(done.pushJob.total, 10);
  assert.equal(h.sent.length, 10);
});
test("stop aborts in-flight delivery and prevents later sends and stale starts", async () => {
  let pendingSignal, rejectPending;
  const h = harness(async (_id, _job, _number, signal) => new Promise((resolve, reject) => {
    pendingSignal = signal; rejectPending = reject;
  }));
  await h.request("start", { expectedRevision: 0, deviceIds: h.allowed });
  await new Promise(resolve => setTimeout(resolve, 2));
  const stopped = await h.request("stop");
  assert.equal(stopped.body.run, null);
  assert.equal(stopped.body.pushJob.status, "stopped");
  assert.equal(pendingSignal.aborted, true);
  rejectPending(new Error("aborted"));
  await new Promise(resolve => setTimeout(resolve, 3));
  assert.equal(h.sent.length, 1);
  assert.equal((await h.state()).pushJob.accepted, 0);
  assert.equal((await h.request("start", { expectedRevision: 0, deviceIds: h.allowed })).status, 409);
});
test("provider throttling stops the burst after one request with no retry", async () => {
  const h = harness(async () => { const error = new Error("throttle"); error.statusCode = 429; throw error; });
  await h.request("push", { expectedRevision: 0, deviceIds: h.allowed, mode: "test" });
  const done = await h.finish();
  assert.equal(h.sent.length, 1);
  assert.equal(done.pushJob.failed, 1);
  assert.equal(done.pushJob.accepted, 0);
  assert.match(done.pushJob.reason, /throttled/);
});
test("unregistered targets are rejected before any provider send", async () => {
  const h = harness();
  const response = await h.request("start", { expectedRevision: 0, deviceIds: [randomUUID()] });
  assert.equal(response.status, 503);
  assert.equal(h.sent.length, 0);
  assert.equal((await h.state()).run, null);
});
