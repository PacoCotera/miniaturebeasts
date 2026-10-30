// The Caddy service's dock (dock.mjs, the /dock routes in app.mjs): a seat and a lift are states, not toggles; seats and seq only rise; a restart keeps the cradles and
// the face state; each world is one file, written beside and renamed; the stream sends the snapshot first, then dock and face events, with a heartbeat; worlds never
// see each other; a write that cannot be stored changes nothing and says so; the 30-day sweep. The portrait tests (caddy.test.mjs) run unchanged beside these.
//   node --test prototypes/caddy/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../app.mjs";
import { createDock, SWEEP_MS } from "../dock.mjs";

const fresh = () => mkdtempSync(path.join(tmpdir(), "mb-caddy-dock-"));
async function serve(app) { const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r)); return { url: `http://127.0.0.1:${server.address().port}/caddy-api/v1`, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) }; }
const post = (s, p, body) => fetch(s.url + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (s, p) => fetch(s.url + p).then(async (r) => ({ status: r.status, body: await r.json() }));
const A = { id: "c1a2b3c4d", name: "Companion A" };

test("a seat and a lift are states, not toggles: a repeat changes nothing; seats and seq only rise", async () => {
  const app = createApp({ dataDir: fresh() }), s = await serve(app);
  try {
    let r = await post(s, "/dock/seat", { world: "w1", cradle: "companion", seated: true, companion: A });
    assert.equal(r.status, 200); assert.equal(r.body.changed, true);
    assert.deepEqual([r.body.snapshot.cradles.companion.state, r.body.snapshot.cradles.companion.seats, r.body.snapshot.cradles.companion.seq, r.body.snapshot.seq], ["seated", 1, 1, 1]);
    assert.deepEqual(r.body.snapshot.face.who, A, "the face holds whose Companion is seated");
    r = await post(s, "/dock/seat", { world: "w1", cradle: "companion", seated: true, companion: A });
    assert.deepEqual([r.body.changed, r.body.snapshot.cradles.companion.seats, r.body.snapshot.seq], [false, 1, 1], "a second seat is no change");
    const seqs = [];
    for (const seated of [false, false, true, false, true]) { r = await post(s, "/dock/seat", { world: "w1", cradle: "companion", seated }); seqs.push([r.body.snapshot.seq, r.body.snapshot.cradles.companion.seats, r.body.snapshot.cradles.companion.state]); }
    assert.deepEqual(seqs, [[2, 1, "lifted"], [2, 1, "lifted"], [3, 2, "seated"], [4, 2, "lifted"], [5, 3, "seated"]], "seq rises on each change and only then; seats counts the seats");
    r = await post(s, "/dock/seat", { world: "w1", cradle: "station", seated: true }); assert.deepEqual([r.body.snapshot.cradles.station.state, r.body.snapshot.cradles.station.seats, r.body.snapshot.seq], ["seated", 1, 6], "the Station cradle is a state too");
    assert.equal(r.body.snapshot.cradles.companion.seats, 3, "and leaves the Companion's alone");
    const g = await get(s, "/dock?world=w1"); assert.deepEqual(g.body, r.body.snapshot, "GET /dock is the snapshot");
    assert.deepEqual((await get(s, "/dock")).body.worlds, [{ world: "w1", seq: 6, companion: "seated", seats: 3, fault: false }]);
    assert.deepEqual((await get(s, "/status")).body.dock, { worlds: 1, seated: 1, faults: 0 }, "the status gains the dock counts");
    for (const bad of [{ cradle: "companion", seated: true }, { world: "../x", cradle: "companion", seated: true }, { world: "w1", cradle: "printer", seated: true }, { world: "w1", cradle: "companion", seated: "yes" }])
      assert.equal((await post(s, "/dock/seat", bad)).status, 400, JSON.stringify(bad));
  } finally { await s.close(); }
});

test("journaled by write-and-rename, one file per world; a restart keeps the cradles and the face state", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir }), s = await serve(app);
  await post(s, "/dock/seat", { world: "w1", cradle: "companion", seated: true, companion: A }); await post(s, "/dock/seat", { world: "w1", cradle: "station", seated: true });
  await post(s, "/dock/seat", { world: "w2", cradle: "companion", seated: true }); await post(s, "/dock/seat", { world: "w2", cradle: "companion", seated: false });
  const before = [(await get(s, "/dock?world=w1")).body, (await get(s, "/dock?world=w2")).body]; await s.close();
  assert.deepEqual(readdirSync(path.join(dir, "dock")).sort(), ["w1.json", "w2.json"], "one file per world, no temporary left");
  assert.equal(JSON.parse(readFileSync(path.join(dir, "dock", "w1.json"), "utf8")).cradles.companion.state, "seated");
  const s2 = await serve(createApp({ dataDir: dir }));
  try { assert.deepEqual([(await get(s2, "/dock?world=w1")).body, (await get(s2, "/dock?world=w2")).body], before, "the same after a restart");
    const r = await post(s2, "/dock/seat", { world: "w1", cradle: "companion", seated: true }); assert.equal(r.body.changed, false, "still seated: no change"); }
  finally { await s2.close(); }
});

// reads the event stream: the events in order, until `until` holds or the time runs out
async function stream(s, world, until, ms = 3000) {
  const ac = new AbortController(), r = await fetch(`${s.url}/dock/events?world=${world}`, { signal: ac.signal }), events = [];
  assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /text\/event-stream/);
  const reader = r.body.getReader(), dec = new TextDecoder(); let buf = "", timer;
  const done = new Promise((resolve) => { timer = setTimeout(resolve, ms); (async () => { try { for (;;) { const { value, done: end } = await reader.read(); if (end) break; buf += dec.decode(value);
    let i; while ((i = buf.indexOf("\n\n")) >= 0) { const block = buf.slice(0, i); buf = buf.slice(i + 2); const ev = /^event: (.*)$/m.exec(block)?.[1], data = /^data: (.*)$/m.exec(block)?.[1]; if (ev) events.push({ ev, data: JSON.parse(data) }); if (until(events)) { resolve(); return; } } } } catch { /* aborted */ } resolve(); })(); });
  return { events, done: done.then(() => { clearTimeout(timer); ac.abort(); return events; }) };
}
test("the stream sends the snapshot first, then dock and face events, and a heartbeat; worlds never see each other", async () => {
  const app = createApp({ dataDir: fresh(), heartbeatMs: 60 }), s = await serve(app);
  try {
    await post(s, "/dock/seat", { world: "w1", cradle: "station", seated: true });
    const w1 = await stream(s, "w1", (e) => ["heartbeat", "dock", "face"].every((k) => e.some((x) => x.ev === k))), w2 = await stream(s, "w2", () => false, 600);
    await new Promise((r) => setTimeout(r, 50));
    await post(s, "/dock/seat", { world: "w1", cradle: "companion", seated: true, companion: A });
    const e1 = await w1.done, e2 = await w2.done;
    assert.equal(e1[0].ev, "snapshot", "the snapshot first"); assert.equal(e1[0].data.cradles.station.state, "seated"); assert.equal(e1[0].data.cradles.companion.state, "lifted");
    const dock = e1.find((x) => x.ev === "dock"), face = e1.find((x) => x.ev === "face");
    assert.deepEqual([dock.data.cradle, dock.data.state, dock.data.seats, dock.data.seq], ["companion", "seated", 1, 2]); assert.deepEqual(face.data.who, A);
    assert.ok(e1.findIndex((x) => x.ev === "dock") > 0 && e1.some((x) => x.ev === "heartbeat"), "then the events and the heartbeat");
    assert.deepEqual(e2.map((x) => x.ev).filter((x) => x !== "heartbeat"), ["snapshot"], "w2 heard nothing of w1");
    assert.deepEqual([e2[0].data.cradles.companion.seats, e2[0].data.seq], [0, 0], "an unseen world reads as both cradles empty");
    assert.equal((await fetch(`${s.url}/dock/events`)).status, 400, "the stream needs a world");
  } finally { await s.close(); }
});

test("a write the Caddy cannot store changes nothing and marks the face's fault; the next stored write clears it", () => {
  let fail = true; const dock = createDock({ dataDir: fresh(), write: (f, o) => { if (fail) throw new Error("disk full"); } });
  const heard = []; dock.subscribe("w1", (ev, d) => heard.push([ev, d.fault ?? d.state]));
  const r = dock.seat("w1", "companion", true, A);
  assert.deepEqual([r.ok, r.status, r.fault], [false, 503, true]); assert.match(r.error, /could not store it: disk full/);
  const s = dock.snapshot("w1"); assert.deepEqual([s.cradles.companion.state, s.cradles.companion.seats, s.seq, s.face.fault, s.face.who], ["lifted", 0, 0, true, null], "nothing was taken");
  fail = false; const r2 = dock.seat("w1", "companion", true, A); assert.equal(r2.ok, true);
  assert.deepEqual([r2.snapshot.cradles.companion.state, r2.snapshot.face.fault], ["seated", false]);
  assert.deepEqual(heard, [["face", true], ["dock", "seated"], ["face", false]]);
  assert.equal(dock.counts().faults, 0);
});

test("the 30-day sweep: a world with nothing seated and no seat for 30 days goes, with its file; a seated one stays", () => {
  let t = Date.parse("2026-10-01T12:00:00Z"); const dir = fresh(), dock = createDock({ dataDir: dir, now: () => t });
  dock.seat("old", "companion", true); dock.seat("old", "companion", false);
  dock.seat("kept", "companion", true);   // left seated
  t += SWEEP_MS - 1000; dock.seat("recent", "companion", true); dock.seat("recent", "companion", false);
  assert.deepEqual(dock.sweep(t), [], "not before 30 days");
  t += 2000; assert.deepEqual(dock.sweep(t), ["old"]);
  assert.ok(!existsSync(path.join(dir, "dock", "old.json")) && existsSync(path.join(dir, "dock", "kept.json")));
  assert.deepEqual(dock.list().map((w) => w.world).sort(), ["kept", "recent"]);
  t += SWEEP_MS; assert.deepEqual(dock.sweep(t), ["recent"], "the seated world is never swept");
});
