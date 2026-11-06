// The Station's sleep sequence (src/sleep.mjs) against the Companion's real responder (playtest/companion-stub.mjs) and the Caddy app in process, with a crash injected at every write:
// the Station's own, the Companion's and the Caddy's. After each one the household reboots and recovers, and the checks are the gate: one live realm, every committed copy verifies,
// nothing half-cleared, and the realm exactly as it was when the sleep was rolled back. The crash table the tests make is kept beside this file (sleep-crash-table.md) and a test
// fails when the two differ.
//   node --test prototypes/station/tests/sleep.test.mjs
//   MB_WRITE_CRASH_TABLE=1 node --test prototypes/station/tests/sleep.test.mjs    writes the table
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import * as W from "./sleep-world.mjs";
import { JOURNAL_KEY, INDEX_KEY, STATES, makeShellAsk, copyKey } from "../src/sleep.mjs";
import { verifySleepFile, readBody, fileHash } from "../../play/src/realm/sleepfile.mjs";
import { canonical } from "../../play/src/realm/canonical.mjs";
import { utf8 } from "../../play/src/realm/b64.mjs";

const { OLD } = W;
const COMMIT = STATES.indexOf("commit");
const TABLE_FILE = new URL("./sleep-crash-table.md", import.meta.url);
after(() => { try { rmSync(W.SCRATCH, { recursive: true, force: true }); } catch { /* the next run sweeps */ } });

// ---- driving a sleep ----
async function drive(st) {
  const hold = await st.sleep.begin();
  if (!hold.ok) return { hold };
  const ready = await hold.ready;
  const res = await hold.complete();
  return { hold, ready, res };
}
const stateIdx = (w) => { const s = w.journalState(); return s ? STATES.indexOf(s) : -1; };
const committedAnywhere = (w) => W.caddyLedger(w).some((l) => l.state === "committed") || W.stationLedger(w).some((l) => l.state === "committed");
const holding = (w) => { const t = W.tombstone(w); return !!t && (t.state === "pending" || t.state === "committed"); };

// The rule that holds at every instant: once a sleep is committed anywhere, the Companion is not free to go on playing the realm that sleeps.
function noTwoLives(w, where) {
  if (!committedAnywhere(w)) return;
  const wid = W.savedNow(w).wid, free = wid === OLD && !holding(w) && !w.companion.rt.sleepLock;
  assert.equal(free, false, `${where}: the sleep is committed and the old realm can still be played`);
}

// After recovery: one live realm; every copy that is committed verifies; no realm half-cleared. Returns "back" (the realm is as it was) or "asleep".
async function assertSettled(w, where) {
  const save = W.savedNow(w), tomb = W.tombstone(w), lc = W.caddyLedger(w), ls = W.stationLedger(w);
  const cC = [...new Set(lc.filter((l) => l.state === "committed").map((l) => l.sha))].sort(), cS = [...new Set(ls.filter((l) => l.state === "committed").map((l) => l.sha))].sort();
  assert.deepEqual(cC, cS, where + ": the two ledgers agree on what is committed");
  assert.ok(cC.length <= 1, where + ": one sleep");
  assert.equal(w.disk.has(JOURNAL_KEY), false, where + ": no journal is left open");
  assert.equal(w.companion.rt.sleepLock, false, where + ": the Companion is not locked");
  const files = W.caddyFiles(w), jobsAll = W.queueJobs(w);
  assert.ok(!files.some((f) => f.endsWith(".tmp")), where + ": no temporary file");
  assert.ok(jobsAll.some((j) => j.world === "wother"), where + ": another world's job is never touched");
  if (!cC.length) {
    // the realm is as it was
    assert.equal(w.disk.get(w.saveKey), w.initialRaw, where + ": the saved realm is byte for byte what it was");
    assert.equal(w.companion.wid(), OLD, where + ": the Companion is on the old realm");
    assert.equal(tomb, null, where + ": no tombstone");
    assert.deepEqual(W.copyKeys(w), [], where + ": no Station copy"); assert.deepEqual(files, [], where + ": no file on the card");
    assert.equal(w.disk.has(INDEX_KEY), false, where + ": no index");
    assert.deepEqual(W.readJSON(W.dockFile(w, OLD)), w.initialDock, where + ": the dock record is whole");
    assert.deepEqual(w.caddy.dock.record(OLD), w.initialDock, where + ": and so is the Caddy's memory of it");
    assert.deepEqual(jobsAll.filter((j) => j.world === OLD), w.initialJobs, where + ": the jobs are whole");
    assert.equal(lc.some((l) => l.state === "cleared"), false, where + ": nothing cleared");
    return "back";
  }
  const sha = cC[0], name = `${OLD}.${sha.slice(0, 8)}.mbr`;
  assert.deepEqual(files, [name], where + ": the committed file is on the card");
  const bytes = readFileSync(path.join(w.dir, "realms", "asleep", name));
  assert.equal(await fileHash(bytes), sha, where + ": the card's file is the one the ledgers name");
  assert.equal((await verifySleepFile(bytes, { pub: w.pub })).ok, true, where + ": the card's copy verifies");
  const ck = W.copyKeys(w); assert.ok(ck.includes(copyKey(OLD, sha.slice(0, 8))), where + ": the Station keeps its copy");
  const text = w.disk.get(copyKey(OLD, sha.slice(0, 8)));
  assert.equal(text, Buffer.from(bytes).toString("utf8"), where + ": both copies are the same bytes");
  assert.equal((await verifySleepFile(utf8(text), { pub: w.pub })).ok, true, where + ": the Station's copy verifies");
  const body = await readBody(bytes, { pub: w.pub }), { st: initialSt, ...initialRest } = JSON.parse(w.initialRaw);
  assert.equal(canonical(body.companion), canonical(initialRest), where + ": the Companion's part is in the file whole");
  assert.equal(canonical(body.station), canonical(initialSt), where + ": and the Station's");
  assert.deepEqual(body.caddy.dock, w.initialDock, where + ": and the Caddy's dock record");
  assert.deepEqual(body.caddy.jobs, w.initialJobs, where + ": and its jobs");
  // the old realm is cleared everywhere, and the new one is whole and live
  assert.notEqual(save.wid, OLD, where + ": the Companion is on a new realm"); assert.equal(w.companion.wid(), save.wid);
  assert.deepEqual([tomb.state, tomb.sha, tomb.newWid], ["done", sha, save.wid], where + ": the tombstone says done");
  assert.ok(save.st && save.st.wid === save.wid, where + ": the Station's part is fresh for the new realm");
  assert.equal(existsSync(W.dockFile(w, OLD)), false, where + ": the dock record is gone"); assert.equal(w.caddy.dock.record(OLD), null);
  assert.equal(jobsAll.some((j) => j.world === OLD), false, where + ": the jobs are gone");
  assert.ok(lc.some((l) => l.state === "cleared" && l.sha === sha), where + ": the card noted the clear");
  assert.equal(w.caddy.realms.count(), 1);
  assert.deepEqual(JSON.parse(w.disk.get(INDEX_KEY)).map((e) => e.sha), [sha], where + ": the index lists it");
  return "asleep";
}

async function settle(st, where) {
  const phases = [];
  for (let n = 0; n < 6; n++) { const r = await st.sleep.recover(); phases.push(r.phase + (r.waiting ? ":" + [].concat(r.waiting).join("+") : "")); if (r.phase === "none") return phases; }
  assert.fail(where + ": recovery does not settle: " + phases.join(", "));
}

// ---- one injected failure, from setup to the settled household ----
const CRASHES = new Set(["before", "lost", "power"]);
async function scenario({ mode, i, rebootLifted = false, second = null }) {
  const w = await W.makeWorld();
  try {
    const life = w.setupLife; life.arm({ mode, i });
    let st = w.stationFor(life), out = null;
    try { out = await drive(st); } catch (e) { if (!e.crash) throw e; }
    const fired = life.fired; assert.ok(fired, `${mode} #${i}: the point was never reached`);
    const row = { mode, i, owner: fired.owner, label: fired.label, journal: fired.journal ?? null };
    const where = `${mode} #${i} (${fired.label})`;
    assert.deepEqual(w.commitMisses, [], where + ": two verified copies exist whenever the journal says commit");
    noTwoLives(w, where + " at the instant");
    const stateThen = stateIdx(w);
    if (CRASHES.has(mode)) {
      const life2 = w.newLife();
      if (mode === "power") await W.powerUp(w, life2, { seated: !rebootLifted }); else if (rebootLifted) W.lift(w);
      st = w.stationFor(life2);
      noTwoLives(w, where + " after the reboot");
      if (second !== null) {
        life2.arm({ mode: "before", i: second });
        try { await st.sleep.recover(); } catch (e) { if (!e.crash) throw e; }
        assert.ok(life2.fired, where + `: recovery write #${second} was never reached`);
        row.second = life2.fired.label;
        noTwoLives(w, where + " after the second crash");
        st = w.stationFor(w.newLife());
      }
      if (rebootLifted) { await st.sleep.recover(); noTwoLives(w, where + " while still lifted"); }
    }
    if (!w.docked) await W.dock(w);
    await settle(st, where);
    assert.deepEqual(w.commitMisses, [], where + ": two verified copies exist whenever the journal says commit");
    row.outcome = await assertSettled(w, where);
    // what the outcome must be
    if (CRASHES.has(mode)) assert.equal(row.outcome, stateThen >= COMMIT ? "asleep" : "back", where + ": the journal at the crash decides");
    else if (!out.hold.ok) assert.equal(row.outcome, "back", where);
    else if (out.res) assert.equal(row.outcome, out.res.rolledBack ? "back" : "asleep", where + ": what the sleep said is what is true");
    if (mode === "lift") assert.equal(row.outcome, (fired.journal ? STATES.indexOf(fired.journal) : -1) >= COMMIT || fired.label === "journal commit" ? "asleep" : "back", where + ": lifted before the commit rolls back, after it rolls forward");
    return row;
  } finally { w.close(); }
}

// The points a mode counts, from a run with nothing armed.
async function pointsOf(mode) {
  const w = await W.makeWorld();
  try {
    const life = w.setupLife; life.arm({ mode, i: 1e9 });
    // the counted list is kept by the life as it goes
    const st = w.stationFor(life), out = await drive(st);
    assert.equal(out.res.done, true, "the unarmed run goes through");
    return life.counted.slice();
  } finally { w.close(); }
}
const key = (recs) => { const seen = new Map(); return recs.map((r) => { const k = r.owner + "|" + r.label; const n = (seen.get(k) ?? 0) + 1; seen.set(k, n); return { ...r, key: k + "#" + n }; }); };

const RESULTS = { before: new Map(), lost: new Map(), lostAlive: new Map(), fail: new Map(), power: new Map(), lift: new Map(), second: [] };
let ALL = null;   // every write of the three, in order

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

test("the whole sequence, nothing armed: the ten steps in order, then the realm sleeps and a new one begins", async () => {
  const w = await W.makeWorld();
  try {
    const life = w.setupLife; life.arm({ mode: "power", i: 1e9 });
    const st = w.stationFor(life), out = await drive(st);
    assert.deepEqual([out.hold.ok, out.ready.ok, out.res.ok, out.res.done], [true, true, true, true]);
    ALL = key(life.counted);
    const steps = ALL.map((p) => p.label);
    const order = ["journal open", "Companion lock", "save rewritten", "Companion sign", "tombstone pending", "journal signed", "Station copy", "journal keptStation", "PUT /realms/asleep/<wid>", "journal keptCaddy", "journal commit",
      "POST /realms/commit", "Station ledger", "Companion clear", "tombstone committed", "Companion's new realm", "tombstone done", "journal companion", "Station part fresh", "journal station", "POST /realm/clear", "journal caddy", "Station index", "journal closed"];
    let at = -1; for (const s of order) { const n = steps.indexOf(s, at + 1); assert.ok(n > at, `step "${s}" comes in its place`); at = n; }
    assert.equal(await assertSettled(w, "happy"), "asleep"); assert.deepEqual(w.commitMisses, []);
    // what the sleep file says
    const sha = W.stationLedger(w)[0].sha, bytes = readFileSync(path.join(w.dir, "realms", "asleep", `${OLD}.${sha.slice(0, 8)}.mbr`));
    const v = await verifySleepFile(bytes, { pub: w.pub }); assert.equal(v.ok, true);
    assert.equal(v.header.wid, OLD); assert.equal(v.header.companion.id, W.COMPANION_ID); assert.equal(v.header.companion.pub, w.pub);
    assert.equal(v.header.recovery.pub, W.V.recovery.pub, "the Caddy's recovery key is in the header");
    assert.deepEqual(W.tombstone(w), { wid: OLD, sha, newSeed: W.tombstone(w).newSeed, newWid: W.tombstone(w).newWid, state: "done" });
    assert.deepEqual(W.stationLedger(w).map((l) => [l.sha, l.state, l.wid]), [[sha, "committed", OLD]]);
    assert.deepEqual(w.fetchLog.filter((l) => !l.startsWith("GET")).map((l) => l.split(" ")[0] + " " + l.split(" ")[1]), ["PUT /realms/asleep/<wid>", "POST /realms/commit", "POST /realm/clear"], "the Caddy was written to three times");
  } finally { w.close(); }
});

test("a crash before each write of the Station: the realm comes back, or the sleep finishes, and the checks hold", async () => {
  const pts = await pointsOf("before"); assert.ok(pts.length >= 14, "the Station makes " + pts.length + " writes and calls");
  for (let i = 0; i < pts.length; i++) { const r = await scenario({ mode: "before", i }); RESULTS.before.set(i, r); }
});

test("a crash just after a call to the Caddy or the Companion was carried out, before the Station hears the reply", async () => {
  const pts = await pointsOf("lost"); assert.ok(pts.length >= 6);
  for (let i = 0; i < pts.length; i++) RESULTS.lost.set(i, await scenario({ mode: "lost", i }));
});

test("a reply lost while the Station lives on, and a write or call that fails once: it rolls back before the commit and finishes after it", async () => {
  for (let i = 0, n = (await pointsOf("lostAlive")).length; i < n; i++) RESULTS.lostAlive.set(i, await scenario({ mode: "lostAlive", i }));
  for (let i = 0, n = (await pointsOf("fail")).length; i < n; i++) RESULTS.fail.set(i, await scenario({ mode: "fail", i }));
});

test("a power cut at every write of all three (the Station's, the Companion's, the Caddy's): all reboot from their disks", async () => {
  const pts = await pointsOf("power"); assert.ok(pts.length >= 30);
  for (let i = 0; i < pts.length; i++) RESULTS.power.set(i, await scenario({ mode: "power", i }));
});

test("the Companion lifted from the cradle before each write: before the commit the sleep rolls back, after it the sleep waits and finishes at the next dock", async () => {
  const pts = await pointsOf("lift");
  for (let i = 0; i < pts.length; i++) RESULTS.lift.set(i, await scenario({ mode: "lift", i }));
});

test("a crash, then the reboot with the Companion still lifted, then the dock: it finishes or rolls back at the dock", async () => {
  const pts = await pointsOf("before");
  for (let i = 0; i < pts.length; i++) await scenario({ mode: "before", i, rebootLifted: true });
  const p2 = await pointsOf("power");
  for (let i = 0; i < p2.length; i += 3) await scenario({ mode: "power", i, rebootLifted: true });
});

test("a second crash in the middle of recovery, at every write recovery makes, after each of the first crashes", async () => {
  const pts = await pointsOf("before");
  for (let i = 0; i < pts.length; i++) {
    // how many writes and calls recovery makes after this crash
    const w = await W.makeWorld(); let n = 0;
    try {
      w.setupLife.arm({ mode: "before", i }); let st = w.stationFor(w.setupLife);
      try { await drive(st); } catch (e) { if (!e.crash) throw e; }
      const life2 = w.newLife(); life2.arm({ mode: "before", i: 1e9 }); st = w.stationFor(life2); await st.sleep.recover(); n = life2.counted.length;
    } finally { w.close(); }
    for (let j = 0; j < n; j++) { const r = await scenario({ mode: "before", i, second: j }); RESULTS.second.push([i, j, r.second, r.outcome]); }
  }
  assert.ok(RESULTS.second.length > 20);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

test("let go in the middle of the hold writes nothing that lasts: the store and the card are as they were, the Companion is unlocked and the Caddy was only read", async () => {
  for (const when of ["at once", "while the Companion signs", "after the file is whole"]) {
    const w = await W.makeWorld();
    try {
      const before = W.snapshot(w);
      let release = () => {}; const gate = new Promise((r) => { release = r; });
      if (when === "while the Companion signs") w.companionHooks.beforeHandle = (op) => (op === "sign" ? gate : undefined);   // the sign is held up on the way to the Companion
      const st = w.stationFor(w.setupLife), hold = await st.sleep.begin();
      assert.equal(hold.ok, true);
      assert.notEqual(w.journalState(), null, when + ": the journal is open during the hold");
      if (when === "after the file is whole") await hold.ready;
      if (when === "while the Companion signs") { while (w.fetchLog.length < 3) await new Promise((r) => setTimeout(r, 5)); }   // the lock is done, the Caddy has been read, the sign is waiting
      const cancelled = hold.cancel(); release();
      const c = await cancelled; assert.equal(c.ok, true);
      assert.equal(st.sleep.holding, false);
      const after = W.snapshot(w);
      assert.deepEqual(after.disk, before.disk, when + ": the shared store is as it was");
      assert.deepEqual(after.files, before.files, when + ": the card is as it was");
      assert.equal(w.companion.rt.sleepLock, false, when + ": the Companion plays on");
      assert.equal(W.tombstone(w), null);
      assert.deepEqual(w.fetchLog.filter((l) => !l.startsWith("GET")), [], when + ": the Caddy was only read");
      assert.equal((await hold.complete()).why, "let go", "a ring that fills after the let go does nothing");
      assert.equal((await st.sleep.recover()).phase, "none");
      assert.equal(await assertSettled(w, when), "back");
    } finally { w.close(); }
  }
});

test("the Caddy offline at step 5 rolls back; the card is asked to drop the file when it answers again", async () => {
  const w = await W.makeWorld();
  try {
    const life = w.setupLife; life.arm({ mode: "power", i: 1e9 });
    const st = w.stationFor(life), hold = await st.sleep.begin(); await hold.ready;
    w.offline = true;   // the card does not answer from the PUT on
    const res = await hold.complete();
    assert.deepEqual([res.ok, res.rolledBack], [false, true]); assert.match(res.why, /Caddy/);
    assert.deepEqual(res.pending, ["caddy"], "the drop waits for the card");
    assert.equal(w.companion.rt.sleepLock, false, "the player has the realm back while the card is quiet");
    assert.equal(W.tombstone(w), null); assert.deepEqual(W.copyKeys(w), [], "the Station's copy is gone");
    assert.equal(JSON.parse(w.disk.get(JOURNAL_KEY)).state, "keptStation", "the journal stays until the card has dropped the file");
    assert.equal((await st.sleep.preflight()).why, "busy", "no new sleep meanwhile");
    assert.equal((await st.sleep.recover()).phase, "waiting");
    w.offline = false;
    assert.equal((await st.sleep.recover()).phase, "rolledBack");
    assert.equal(await assertSettled(w, "offline"), "back");
    assert.deepEqual(W.caddyLedger(w).map((l) => l.state), [], "the card never saw the file");
  } finally { w.close(); }
});

test("the Caddy offline at step 5 after the file had landed: rolled back, and the file dropped once the card answers", async () => {
  const w = await W.makeWorld();
  try {
    const put = (await pointsOf("lostAlive")).map((p) => p.label).indexOf("PUT /realms/asleep/<wid>");
    const life = w.setupLife; life.arm({ mode: "lostAlive", i: put, then: () => { w.offline = true; } });   // the file lands, the reply is lost, and the card goes quiet
    const st = w.stationFor(life), out = await drive(st);
    assert.deepEqual([out.res.ok, out.res.rolledBack], [false, true]); assert.deepEqual(out.res.pending, ["caddy"]);
    assert.equal(W.caddyFiles(w).length, 1, "the file is on the card");
    assert.equal(w.companion.rt.sleepLock, false, "the player has the realm back"); assert.deepEqual(W.copyKeys(w), []);
    assert.equal((await st.sleep.recover()).phase, "waiting");
    w.offline = false;
    assert.equal((await st.sleep.recover()).phase, "rolledBack");
    assert.equal(await assertSettled(w, "landed then offline"), "back");
    assert.deepEqual(W.caddyLedger(w).map((l) => l.state), ["kept", "dropped"]);
  } finally { w.close(); }
});

test("lifted after the commit: the Station waits, and the next dock finishes it; a Companion lifted with its tombstone committed finishes alone", async () => {
  const w = await W.makeWorld();
  try {
    // the commit goes through, and the Companion is lifted before it is asked to clear
    const labels = (await pointsOf("lift")).map((p) => p.label), at = labels.indexOf("Station ledger") + 1;
    assert.equal(labels[at], "Companion clear");
    const life = w.setupLife; life.arm({ mode: "lift", i: at });
    const st = w.stationFor(life), { res } = await drive(st);
    assert.deepEqual([res.ok, res.done, res.waiting], [true, false, "companion"], "committed, and waiting for the Companion");
    assert.equal(JSON.parse(w.disk.get(JOURNAL_KEY)).state, "commit");
    assert.equal(W.savedNow(w).wid, OLD); assert.equal(holding(w), true, "the Companion shows only Dock to finish");
    noTwoLives(w, "lifted");
    assert.equal((await st.sleep.recover()).phase, "waiting");
    await W.dock(w);
    assert.equal((await st.sleep.recover()).phase, "done");
    assert.equal(await assertSettled(w, "lifted after the commit"), "asleep");
  } finally { w.close(); }
  // lifted in the middle of its own clear: it rolls forward alone, the Station finds it done at the dock
  const w2 = await W.makeWorld();
  try {
    const labels = (await pointsOf("lift")).map((p) => p.label), at = labels.indexOf("tombstone committed");
    const life = w2.setupLife; life.arm({ mode: "lift", i: at });
    const st = w2.stationFor(life), out = await drive(st);
    assert.equal(out.res.ok, true);
    assert.equal((await settle(st, "alone")).includes("none"), true);
    if (!w2.docked) await W.dock(w2);
    await settle(st, "alone");
    assert.equal(await assertSettled(w2, "lifted mid-clear"), "asleep");
  } finally { w2.close(); }
});

test("rotation: the Station keeps the newest 2; an older copy goes only when the Caddy lists it committed", async () => {
  const w = await W.makeWorld();
  try {
    const sleepOnce = async (st, tag) => { const o = await drive(st); assert.equal(o.res?.done, true, tag + ": " + JSON.stringify(o.res ?? o.hold)); assert.equal((await st.sleep.recover()).phase, "none"); return W.savedNow(w).wid; };
    const life = w.setupLife; let st = w.stationFor(life);
    const wid1 = OLD, wid2 = await sleepOnce(st, "one");
    assert.equal(W.copyKeys(w).length, 1);
    // the new realm sleeps too (its Caddy records are empty, its Station part is the fresh one)
    const wid3 = await sleepOnce(st, "two");
    assert.equal(W.copyKeys(w).length, 2, "two copies");
    const idx = () => JSON.parse(w.disk.get(INDEX_KEY));
    assert.deepEqual(idx().map((e) => e.wid), [wid2, wid1], "the index lists them newest first");
    // a third sleep, while the card does not list the oldest (its file is gone from the card): the oldest copy stays
    const fs = await import("node:fs");
    const oldest = W.caddyFiles(w).find((f) => f.startsWith(wid1 + ".")), keep = fs.readFileSync(path.join(w.dir, "realms", "asleep", oldest));
    fs.rmSync(path.join(w.dir, "realms", "asleep", oldest)); fs.rmSync(path.join(w.dir, "realms", "index.json"));
    w.caddy = (await import("../../caddy/app.mjs")).createApp({ dataDir: w.dir, now: () => W.T0, caddyId: "ktestcaddy" }); w.caddy.ready = null;
    st = w.stationFor(life);
    const wid4 = await sleepOnce(st, "three");
    assert.equal(W.copyKeys(w).length, 3, "three copies: the oldest is not listed by the card, so it stays");
    assert.ok(W.copyKeys(w).some((k) => k.includes(wid1 + ".")), "the oldest copy is still here");
    assert.deepEqual(idx().map((e) => e.wid), [wid3, wid2], "the index is the newest 2");
    // the card gets it back (the file is put where it was and the card restarts): the next recovery drops the oldest
    fs.writeFileSync(path.join(w.dir, "realms", "asleep", oldest), keep); fs.rmSync(path.join(w.dir, "realms", "index.json"));
    w.caddy = (await import("../../caddy/app.mjs")).createApp({ dataDir: w.dir, now: () => W.T0, caddyId: "ktestcaddy" });
    assert.equal(w.caddy.realms.state((await fileHash(keep))), "committed", "the card knows it as committed again");
    st = w.stationFor(life);
    assert.equal((await st.sleep.recover()).phase, "none");
    assert.equal(W.copyKeys(w).length, 2, "two copies again");
    assert.ok(!W.copyKeys(w).some((k) => k.includes(wid1 + ".")), "the oldest copy went once the card listed it");
    // and every copy left verifies, signed by the Companion's key
    for (const k of W.copyKeys(w)) assert.equal((await verifySleepFile(utf8(w.disk.get(k)), { pub: w.pub })).ok, true, k);
    assert.equal(wid4 !== wid3, true);
  } finally { w.close(); }
});

test("rotation waits while the Caddy is quiet: nothing is dropped on a guess; the next recovery drops it once the card answers", async () => {
  const w = await W.makeWorld();
  try {
    const st = w.stationFor(w.setupLife);
    for (const t of ["one", "two"]) assert.equal((await drive(st)).res.done, true, t);
    const at = (await pointsOf("lift")).map((p) => p.label).indexOf("journal caddy");
    const life = w.setupLife; life.arm({ mode: "lift", i: at, run: () => { w.offline = true; } });   // the card goes quiet just before the rotation
    const st3 = w.stationFor(life), o = await drive(st3);
    assert.equal(o.res.done, true, "the sleep itself is finished: the rotation is not part of it");
    assert.equal(w.disk.has(JOURNAL_KEY), false);
    assert.equal(W.copyKeys(w).length, 3, "three copies: the oldest stays while the card cannot say it has it");
    w.offline = false;
    assert.equal((await st3.sleep.recover()).phase, "none");
    assert.equal(W.copyKeys(w).length, 2, "the card answers: the oldest goes");
  } finally { w.close(); }
  // the Caddy loses a half-done clear: the dock record gone, the jobs still there; or the jobs gone, the card's note not yet written. Each is mended by clearing again.
  for (const part of ["the dock record only", "the dock record and the jobs"]) {
    const w2 = await W.makeWorld();
    try {
      const at = (await pointsOf("before")).map((p) => p.label).indexOf("POST /realm/clear");
      const life = w2.setupLife; life.arm({ mode: "before", i: at });
      try { await drive(w2.stationFor(life)); } catch (e) { if (!e.crash) throw e; }
      w2.caddy.dock.clear(OLD);
      if (part !== "the dock record only") { w2.caddy.state.jobs = w2.caddy.state.jobs.filter((j) => j.world !== OLD); const fs = await import("node:fs"); fs.writeFileSync(path.join(w2.dir, "queue.json"), JSON.stringify({ schema: "mb-caddy-queue/1", jobs: w2.caddy.state.jobs })); }
      await W.powerUp(w2, w2.newLife(), { seated: true });
      const st2 = w2.stationFor(w2.newLife()); await settle(st2, part);
      assert.equal(await assertSettled(w2, part), "asleep");
    } finally { w2.close(); }
  }
});

test("a sleep that cannot be trusted rolls back: a signature that does not verify, a Companion that refuses, a card that refuses or does not list the file, a realm that moved under the file", async () => {
  const cases = {
    "a signature that does not verify": { tamper: (w) => ({ ask: (op, ack) => (op === "sign" && ack.ok ? { ...ack, sig: (ack.sig[0] === "A" ? "B" : "A") + ack.sig.slice(1) } : ack) }) },
    "a Companion that refuses (the Station trusts another key)": { before: (w) => { w.disk.set("mb-station-companions", w.disk.get("mb-station-companions").replace(/"pub":"[^"]+"/, '"pub":"' + "B".repeat(43) + '"')); } },
    "a card that refuses the file": { tamper: (w) => ({ fetch: (label, r) => (label.startsWith("PUT") ? { status: 400, json: async () => ({ ok: false }) } : r) }) },
    "a card that does not list the file": { tamper: (w) => ({ fetch: (label, r) => (label === "GET /realms/asleep" ? { status: 200, json: async () => ({ ok: true, realms: [] }) } : r) }) },
    "a card that answers with a different file": { tamper: (w) => ({ fetch: (label, r) => (label.startsWith("PUT") ? { status: 200, json: async () => ({ ok: true, sha: "0".repeat(64) }) } : r) }) },
    "the Station's part moved during the hold": { between: (w) => { const o = W.savedNow(w); o.st = { ...o.st, e: (o.st.e || 0) + 1 }; w.disk.set(w.saveKey, JSON.stringify(o)); } },
    "the Companion's part moved during the hold": { between: (w) => { const o = W.savedNow(w); o.turn += 1; w.disk.set(w.saveKey, JSON.stringify(o)); } },
  };
  for (const [name, c] of Object.entries(cases)) {
    const w = await W.makeWorld();
    try {
      if (c.before) c.before(w);
      if (c.tamper) w.tamper = c.tamper(w);
      const st = w.stationFor(w.setupLife), hold = await st.sleep.begin();
      assert.equal(hold.ok, true, name); await hold.ready;
      if (c.between) c.between(w);
      const res = await hold.complete();
      assert.deepEqual([res.ok, res.rolledBack], [false, true], name + ": " + JSON.stringify(res));
      w.tamper = null; if (c.between) { /* the moved part is the realm now */ w.initialRaw = w.disk.get(w.saveKey); }
      await settle(st, name);
      assert.equal(await assertSettled(w, name), "back", name);
      assert.equal(W.caddyLedger(w).some((l) => l.state === "committed"), false, name + ": nothing was committed");
    } finally { w.close(); }
  }
});

test("the card lost the file between keeping and committing: the commit finds nothing, the Station's copy goes up again, and the sleep finishes", async () => {
  const w = await W.makeWorld();
  try {
    const at = (await pointsOf("before")).map((p) => p.label).indexOf("POST /realms/commit");
    w.setupLife.arm({ mode: "before", i: at });
    try { await drive(w.stationFor(w.setupLife)); } catch (e) { if (!e.crash) throw e; }
    assert.equal(w.journalState(), "commit");
    const fs = await import("node:fs"), f = W.caddyFiles(w)[0];
    fs.rmSync(path.join(w.dir, "realms", "asleep", f)); fs.rmSync(path.join(w.dir, "realms", "index.json"));
    await W.powerUp(w, w.newLife(), { seated: true });
    assert.deepEqual(W.caddyFiles(w), [], "the card has no file");
    const st = w.stationFor(w.newLife()); await settle(st, "lost file");
    assert.equal(await assertSettled(w, "lost file"), "asleep");
  } finally { w.close(); }
});

test("recover() during a hold in progress answers running and changes nothing; the hold then completes", async () => {
  const w = await W.makeWorld();
  try {
    const st = w.stationFor(w.setupLife), hold = await st.sleep.begin(); await hold.ready;
    const before = W.snapshot(w), fetches = w.fetchLog.length;
    assert.equal((await st.sleep.recover()).phase, "running");
    assert.deepEqual(W.snapshot(w), before, "the store and the card are as they were");
    assert.equal(w.fetchLog.length, fetches, "and the Caddy was not asked anything");
    const res = await hold.complete(); assert.equal(res.done, true);
    assert.equal(await assertSettled(w, "recover during the hold"), "asleep");
  } finally { w.close(); }
});

test("a store that hands back a damaged copy makes the sleep roll back, and the realm is back", async () => {
  for (const reads of ["every read", "the read-back after the write"]) {
    const w = await W.makeWorld();
    try {
      let n = 0;
      w.tamper = { get: (k, v) => (k.startsWith("mb-sleep@") && (reads === "every read" || ++n >= 2) ? v.slice(0, -5) + (v.slice(-5, -4) === "0" ? "1" : "0") + v.slice(-4) : v) };
      const st = w.stationFor(w.setupLife), out = await drive(st);
      assert.deepEqual([out.res.ok, out.res.rolledBack], [false, true], reads);
      assert.match(out.res.why, /Station's copy|read back/, reads);
      assert.deepEqual(W.caddyFiles(w), [], reads + ": the card holds nothing"); assert.equal(W.caddyLedger(w).length, 0);
      w.tamper = null; await settle(st, reads);
      assert.equal(await assertSettled(w, reads), "back");
    } finally { w.close(); }
  }
});

test("rotation keeps the oldest copy when the Caddy lists it but not as committed", async () => {
  const w = await W.makeWorld();
  try {
    let st = w.stationFor(w.setupLife);
    for (const t of ["one", "two"]) assert.equal((await drive(st)).res.done, true, t);
    const oldest = W.stationLedger(w)[0];
    w.tamper = { fetch: (label, r) => (label === "GET /realms/asleep" ? { status: r.status, json: async () => { const b = await r.json(); return { ...b, realms: b.realms.map((x) => (x.sha === oldest.sha ? { ...x, state: "kept" } : x)) }; } } : r) };
    assert.equal((await drive(st)).res.done, true, "three");
    assert.equal(W.copyKeys(w).length, 3, "the oldest stays: listed, but kept and not committed");
    assert.ok(W.copyKeys(w).some((k) => k.includes(oldest.wid + ".")));
    assert.deepEqual(JSON.parse(w.disk.get(INDEX_KEY)).map((e) => e.wid).includes(oldest.wid), false, "the index is the newest 2");
    assert.equal(JSON.parse(w.disk.get(INDEX_KEY)).length, 2);
    w.tamper = null; assert.equal((await st.sleep.recover()).phase, "none");
    assert.equal(W.copyKeys(w).length, 2, "the card says committed: it goes");
  } finally { w.close(); }
});

test("preflight: refused with a plain reason, and nothing is written", async () => {
  const cases = {
    off: (w) => { w.settings.realmSleep = false; },
    "not docked": (w) => { w.docked = false; },
    "no caddy": (w) => { w.offline = true; },
    "no room": (w) => { w.quota = 1000; },
    "no key": (w) => { w.disk.set("mb-station-companions", w.disk.get("mb-station-companions").replace(/"pub":"[^"]+"/, '"pub":"A","pubMismatch":true')); },
    busy: (w) => { w.disk.set(JOURNAL_KEY, JSON.stringify({ v: 1, id: "x", state: "open", wid: OLD, newWid: "wabc", newSeed: 1 })); },
    "no save": (w) => { w.disk.set(w.saveKey, w.disk.get(w.saveKey).replace('"v":9', '"v":8')); },
  };
  for (const [why, setup] of Object.entries(cases)) {
    const w = await W.makeWorld();
    try {
      setup(w);
      const st = w.stationFor(w.setupLife), before = W.snapshot(w);
      const r = await st.sleep.begin();
      assert.deepEqual([r.ok, r.why], [false, why], why);
      assert.deepEqual(W.snapshot(w), before, why + ": nothing written");
      assert.deepEqual(w.fetchLog.filter((l) => !l.startsWith("GET")), [], why + ": the Caddy was not written to");
    } finally { w.close(); }
  }
  // a store that fills in the middle of the hold: the copy cannot be written, and the sleep rolls back (the realm is whole)
  const w = await W.makeWorld();
  try {
    const at = (await pointsOf("fail")).map((p) => p.label).indexOf("Station copy");
    w.setupLife.arm({ mode: "fail", i: at });
    const out = await drive(w.stationFor(w.setupLife));
    assert.equal(out.res.rolledBack, true); assert.equal(await assertSettled(w, "store full"), "back");
  } finally { w.close(); }
});

test("the shell's relay: a request waits for the ack with its nonce, and a Companion that does not answer is a timeout", async () => {
  const sent = []; let hear = null;
  const timers = []; const fake = { setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimer: (id) => { timers[id - 1] = null; } };
  const sh = makeShellAsk({ post: (m) => sent.push(m), listen: (fn) => { hear = fn; }, timeoutMs: 15000, ...fake });
  const p1 = sh.ask("lock", { wid: "w1" }), p2 = sh.ask("sign", { wid: "w1", signed: "x" });
  assert.deepEqual(sent.map((m) => [m.t, m.nonce, m.op, m.wid]), [["mb-sleep", 1, "lock", "w1"], ["mb-sleep", 2, "sign", "w1"]]);
  hear({ t: "mb-sleep-ack", nonce: 2, op: "sign", ok: true, sig: "S" }); hear({ t: "mb-sleep-ack", nonce: 99, ok: true });
  assert.deepEqual(await p2, { ok: true, sig: "S" });
  timers[0].fn();
  assert.deepEqual(await p1, { ok: false, why: "timeout" });
  hear({ t: "mb-sleep-ack", nonce: 1, ok: true });   // a late ack for the timed-out ask is ignored
  const bad = makeShellAsk({ post: () => { throw new Error("no window"); }, listen: () => {}, ...fake });
  assert.deepEqual(await bad.ask("lock"), { ok: false, why: "no link" });
});

test("everything stays behind the developer setting realmSleep: off by default, and no part of the game reaches the sequence", async () => {
  const { DEFAULT_SETTINGS } = await import("../src/state.mjs");
  assert.equal(DEFAULT_SETTINGS.realmSleep, false);
  const { readdirSync } = await import("node:fs"), src = new URL("../src/", import.meta.url);
  const users = readdirSync(src, { recursive: true }).filter((f) => /\.(mjs|js|html)$/.test(f) && !f.endsWith("sleep.mjs")).filter((f) => /(from\s*|import\s*\(\s*|import\s+)["'][^"']*\/sleep\.mjs["']/.test(readFileSync(new URL(f, src), "utf8")));
  assert.deepEqual(users, [], "nothing in the Station imports the sleep sequence yet");
  const w = await W.makeWorld({ realmSleep: false });
  try { const before = W.snapshot(w), r = await w.stationFor(w.setupLife).sleep.begin(); assert.deepEqual([r.ok, r.why], [false, "off"]); assert.deepEqual(W.snapshot(w), before); } finally { w.close(); }
});

test("the crash table on file is the one the tests make", async () => {
  const md = tableMarkdown();
  if (process.env.MB_WRITE_CRASH_TABLE) writeFileSync(TABLE_FILE, md);
  assert.equal(readFileSync(TABLE_FILE, "utf8"), md, "sleep-crash-table.md is out of date: run with MB_WRITE_CRASH_TABLE=1");
});

// ---- the crash table ----
function tableMarkdown() {
  const cell = (r) => (r ? (r.outcome === "asleep" ? "asleep" : "back") : "-");
  const rows = ALL ?? [], byLabel = (mode) => { const recs = key([...RESULTS[mode].values()].map((r) => ({ owner: r.owner, label: r.label, ...r }))); return new Map(recs.map((r) => [r.key, r])); };
  const before = byLabel("before"), lost = byLabel("lost"), alive = byLabel("lostAlive"), fail = byLabel("fail"), power = byLabel("power"), lift = byLabel("lift");
  const lines = [];
  lines.push("# The crash table for putting a realm to sleep", "",
    "Each row is one write in the sequence, in the order they happen. Every column is a run of the whole household (the Station, the Companion on its real responder, the Caddy app, one shared store), with that one write broken, then the reboot and recovery. The cell is where the household ended up: **back** (the realm is exactly as it was, byte for byte, the card holds no trace) or **asleep** (committed on both ledgers, both copies verify, the old realm cleared everywhere, the new one live). Every run also passed: one live realm, every committed copy verifies, no realm half-cleared, and at no instant after the commit could the old realm be played. A cell that failed would stop the test.", "",
    "- **Station dies before**: the Station stops just before the write; the Companion and the Caddy go on. The journal column is what the journal said at that moment.",
    "- **Reply lost**: the call to the Caddy or the Companion was carried out, then the Station died before hearing the reply.",
    "- **Fails once**: the write or call throws once (a full store, a quiet Caddy) and the Station lives on: the sequence rolls back before the commit and goes on after it.",
    "- **Power cut**: everything dies just before the write (for the Companion's and the Caddy's own writes too) and all three start again from their disks.",
    "- **Lifted**: the Companion is taken off the cradle just before the write; the dock afterwards finishes or rolls back.", "",
    "| # | Write | By | Journal then | Station dies before | Reply lost | Fails once | Power cut | Lifted |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  rows.forEach((p, n) => {
    const b = before.get(p.key), l = lost.get(p.key), a = alive.get(p.key), f = fail.get(p.key), pw = power.get(p.key), lf = lift.get(p.key);
    const lostCell = l && a ? `${cell(l)} / ${cell(a)}` : "-";
    lines.push(`| ${n + 1} | ${p.label} | ${p.owner} | ${(pw && pw.journal) || "-"} | ${cell(b)} | ${lostCell} | ${cell(f)} | ${cell(pw)} | ${cell(lf)} |`);
  });
  const reads = [...RESULTS.fail.values()].filter((r) => /^GET /.test(r.label));
  lines.push("", "Reads that fail once (they write nothing, so there is no crash to inject): " + reads.map((r) => `${r.label} -> ${cell(r)}`).join("; ") + ".", "",
    `Reply lost shows two runs: the Station dies / the Station lives on. A second crash in the middle of recovery was injected at each of the ${RESULTS.second.length} writes recovery makes after a first crash, and every one settled.`, "");
  return lines.join("\n");
}
