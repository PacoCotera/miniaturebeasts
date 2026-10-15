// The Caddy service in Node: refuses a wrong genome, deduplicates by hash, survives a restart, honours the
// daily limit and the world's cap, retries a failed painter, serves a stored set; no cost in what it serves.
//   node --test prototypes/caddy/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp, loadFrames, RETRY_S } from "../app.mjs";
import { frameOf, podGenome, genomeSha } from "../../station/src/genome.mjs";

loadFrames();
const fresh = () => mkdtempSync(path.join(tmpdir(), "mb-caddy-"));
async function call(app, method, url, body) {
  const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try { const r = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const ct = r.headers.get("content-type") || ""; return { status: r.status, body: ct.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer()) }; }
  finally { server.close(); }
}
const loika = (gs) => podGenome(frameOf("S01"), gs);

test("refuses anything but a genome that builds; accepts one and queues it once per world", async () => {
  const app = createApp({ dataDir: fresh(), painter: "mock", mockDelay: 0 });
  assert.equal((await call(app, "POST", "/caddy-api/v1/grow", { world: "w1" })).status, 400);
  assert.equal((await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: { species: "S99", loci: {} } })).status, 400);
  const bad = loika(1); bad.loci["appearance.marking-switch"] = ["maybe", "on"];
  const r0 = await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: bad }); assert.equal(r0.status, 400); assert.match(r0.body.error, /does not build/);
  const g = loika(1), r1 = await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: g });
  assert.equal(r1.status, 202); assert.equal(r1.body.state, "queued"); assert.equal(r1.body.sha, genomeSha(g));
  const r2 = await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: g }); assert.equal(r2.body.job.id, r1.body.job.id, "the same genome in the same world is one job");
  const r3 = await call(app, "POST", "/caddy-api/v1/grow", { world: "w2", genome: g }); assert.notEqual(r3.body.job.id, r1.body.job.id, "another world queues its own job");
  assert.equal(app.state.jobs.length, 2);
  const jobs = await call(app, "GET", "/caddy-api/v1/jobs?world=w1"); assert.equal(jobs.body.jobs.length, 1);
});

test("the mock paints the set, stores it by hash, serves it, and a stored hash is never painted again", async () => {
  const app = createApp({ dataDir: fresh(), painter: "mock", mockDelay: 0 });
  const g = loika(2), sha = genomeSha(g);
  await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: g });
  const j = await app.tick(); assert.equal(j.state, "done"); assert.equal(j.painter, "mock");
  assert.ok(existsSync(path.join(app.setDir("S01", sha), "station-portrait-300x310.png")));
  const man = JSON.parse(readFileSync(path.join(app.setDir("S01", sha), "manifest.json"), "utf8")); assert.equal(man.painter, "mock"); assert.ok(!("costUSD" in man), "the public set manifest holds no cost");
  const png = await call(app, "GET", `/caddy-api/v1/sets/S01/${sha.slice(0, 16)}/token-48.png`); assert.equal(png.status, 200); assert.equal(png.body.slice(1, 4).toString(), "PNG");
  const again = await call(app, "POST", "/caddy-api/v1/grow", { world: "w3", genome: g }); assert.equal(again.status, 200); assert.equal(again.body.state, "done"); assert.match(again.body.set, /sets\/S01/);
  assert.equal(app.state.jobs.length, 1, "no second job for a stored set");
  assert.equal((await app.tick()), null);
  const st = app.status(); assert.ok(!("spendUSD" in st.today) && !("ceilingUSD" in st), "the public status holds no spend and no limit figure"); assert.equal(st.today.calls, 0); assert.equal(st.limitReached, false); assert.equal(st.queue.done, 1);
  const jobs = await call(app, "GET", "/caddy-api/v1/jobs?world=w1"); assert.ok(!("costUSD" in jobs.body.jobs[0]), "a public job holds no cost");
});

test("survives a restart: the journal brings the queue back and a job caught painting goes again", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir, painter: "mock", mockDelay: 0 });
  await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(3) });
  await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(4) });
  app.state.jobs[1].state = "painting"; writeFileSync(path.join(dir, "queue.json"), JSON.stringify({ jobs: app.state.jobs }));
  const app2 = createApp({ dataDir: dir, painter: "mock", mockDelay: 0 });
  assert.equal(app2.state.jobs.length, 2); assert.equal(app2.state.jobs[1].state, "queued"); assert.equal(app2.state.jobs[1].note, "restarted mid-painting");
  assert.equal((await app2.tick()).state, "done"); assert.equal((await app2.tick()).state, "done");
});

test("honours the daily limit and the world's daily cap; a capped job waits for the next day", async () => {
  let now = Date.parse("2026-10-08T12:00:00Z");
  const app = createApp({ dataDir: fresh(), painter: "mock", mockDelay: 0, growCap: 1, now: () => now });
  await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(5) });
  await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(6) });
  assert.equal((await app.tick()).state, "done");
  const capped = await app.tick(); assert.equal(capped.state, "capped"); assert.match(capped.error, /cap/); assert.equal(capped.nextAt, Date.parse("2026-10-09T00:00:00Z"));
  assert.equal(await app.tick(), null, "nothing runs before the next day");
  now = Date.parse("2026-10-09T00:00:01Z");
  assert.equal((await app.tick()).state, "done", "the next day it paints");
  // the daily limit: a real painter with the day's spend at the limit never calls (the seeded ledger.json is a fixture)
  const app2 = createApp({ dataDir: fresh(), painter: "real", ceilingUSD: 5, now: () => now });
  process.env.GEMINI_API_KEY = "test-key-never-used"; process.env.MB_LEDGER = fresh();
  try {
    app2.state.ledger[new Date(now).toISOString().slice(0, 10)] = { calls: 14, spendUSD: 5.1, worlds: {} };
    await call(app2, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(7) });
    const j = await app2.tick(); assert.equal(j.state, "capped"); assert.match(j.error, /limit/);
    assert.equal(app2.status().painter, "real"); assert.equal(app2.status().limitReached, true);
  } finally { delete process.env.GEMINI_API_KEY; delete process.env.MB_LEDGER; }
  assert.equal(createApp({ dataDir: fresh(), painter: "real", ceilingUSD: 5 }).status().painter, "mock", "without a key the real painter falls back to the mock");
  process.env.GEMINI_API_KEY = "test-key-never-used";
  try { assert.equal(createApp({ dataDir: fresh(), painter: "real", ceilingUSD: 5 }).status().painter, "mock", "without MB_LEDGER the real painter falls back to the mock"); }
  finally { delete process.env.GEMINI_API_KEY; }
});

test("real mode with no daily limit set runs as the mock", async () => {
  process.env.GEMINI_API_KEY = "test-key-never-used"; process.env.MB_LEDGER = fresh();
  try {
    const app = createApp({ dataDir: fresh(), painter: "real", mockDelay: 0 });
    assert.equal(app.cfg.ceilingUSD, null); assert.equal(app.status().painter, "mock"); assert.equal(app.status().configured, "real"); assert.equal(app.status().limitReached, false);
    await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(10) });
    const j = await app.tick(); assert.equal(j.state, "done"); assert.equal(j.painter, "mock");
  } finally { delete process.env.GEMINI_API_KEY; delete process.env.MB_LEDGER; }
});

test("a failed painter retries at one, five and thirty minutes, then fails and the placeholder stands", async () => {
  let now = Date.parse("2026-10-08T12:00:00Z");
  const app = createApp({ dataDir: fresh(), painter: "real", ceilingUSD: 5, growService: "/nonexistent/service.py", python: "/nonexistent/python", now: () => now });
  process.env.GEMINI_API_KEY = "test-key-never-used"; process.env.MB_LEDGER = fresh();
  try {
    await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(8) });
    const j1 = await app.tick(); assert.equal(j1.state, "queued"); assert.equal(j1.tries, 1); assert.equal(j1.nextAt, now + RETRY_S[0] * 1000); assert.ok(j1.error);
    assert.equal(await app.tick(), null, "not before its minute");
    now += RETRY_S[0] * 1000; const j2 = await app.tick(); assert.equal(j2.tries, 2); assert.equal(j2.nextAt, now + RETRY_S[1] * 1000);
    now += RETRY_S[1] * 1000; const j3 = await app.tick(); assert.equal(j3.state, "failed"); assert.equal(j3.tries, 3);
    assert.equal(app.status().queue.failed, 1);
  } finally { delete process.env.GEMINI_API_KEY; delete process.env.MB_LEDGER; }
});

test("a failed painting's spend still counts toward the day's ledger", async () => {
  // a stand-in for grow/service.py, run by node: it writes the --cost-out file as the real one does in its finally, then fails; no call is made
  const dir = fresh(), stub = path.join(dir, "stub-service.mjs");
  writeFileSync(stub, 'import { writeFileSync } from "node:fs"; const a = process.argv; writeFileSync(a[a.indexOf("--cost-out") + 1], JSON.stringify({ calls: 2, costUSD: 0.25 })); process.exit(1);\n');
  const now = Date.parse("2026-10-08T12:00:00Z");
  const app = createApp({ dataDir: path.join(dir, "data"), painter: "real", ceilingUSD: 5, growService: stub, python: process.execPath, now: () => now });
  process.env.GEMINI_API_KEY = "test-key-never-used"; process.env.MB_LEDGER = fresh();
  try {
    await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(11) });
    const j = await app.tick(); assert.equal(j.state, "queued"); assert.equal(j.tries, 1); assert.match(j.error, /exited 1/);
    const d = app.state.ledger["2026-10-08"]; assert.equal(d.calls, 2); assert.equal(d.spendUSD, 0.25); assert.deepEqual(d.worlds, {}, "a failed job does not count against the world's cap");
    const onDisk = JSON.parse(readFileSync(path.join(app.dataDir, "ledger.json"), "utf8")); assert.equal(onDisk["2026-10-08"].spendUSD, 0.25, "the ledger is written");
  } finally { delete process.env.GEMINI_API_KEY; delete process.env.MB_LEDGER; }
});

test("painter off: jobs wait queued and the status says so", async () => {
  const app = createApp({ dataDir: fresh(), painter: "off" });
  await call(app, "POST", "/caddy-api/v1/grow", { world: "w1", genome: loika(9) });
  const j = await app.tick(); assert.equal(j.state, "queued"); assert.equal(app.status().painter, "off");
});
