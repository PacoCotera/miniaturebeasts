// The nursery's rules (station step 5; owner 2026-11-21 15:0x "I like it", "3 capsules is ok"): three capsules, Grow it free on the real clock, the shelf in rows by origin, pods never dry, a young waits in her capsule.
//   node --test prototypes/station/tests/nursery.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as N from "../src/nursery.mjs";
S.useNameList("en-short-1");

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../../species/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).filter((f) => !f.species.draft));
const settings = { ...S.DEFAULT_SETTINGS };
const T0 = Date.UTC(2026, 10, 22, 12, 0, 0), MIN = 60000;
const fresh = () => { const st = S.freshSt("w1", 0, T0); S.normalize(st, T0); return st; };
const crate = (n, pods) => ({ id: "x" + n, n, turn: n, at: 0, e: 0, d: 0, s: 0, pods, met: [], explored: 5, of: 20, lines: [] });
const podOf = (i, g, gs) => ({ id: "p" + i, sp: 0, g, how: "calm", gs, k: null });
// pods come home as a crate does: the same path the game uses
function homeWith(pods, n = 1) { const st = fresh(), sv = { v: 8, seed: 7, wid: "w1", turn: n, bay: [crate(n, pods)], mibis: [], with: null, tier: 1, shield: 3 }; S.dockKey(st, sv, settings, T0); S.openBay(st, sv, settings, T0); return { st, sv }; }

test("the capsules are one number, three, and a fresh save has them all free", () => {
  assert.equal(S.CAPSULES, 3);
  const st = fresh(); assert.equal(st.caps.length, S.CAPSULES); assert.deepEqual(N.capsulesOf(st, settings, T0).map((c) => c.state), ["free", "free", "free"]);
  assert.equal(JSON.parse(JSON.stringify(st)).bud, undefined, "st.bud is never saved: the save holds the capsules");
});

test("Grow it takes a free capsule and time; nothing else is spent, no pod is read first", () => {
  const { st } = homeWith([podOf(0, "pond", 41), podOf(1, "pond", 42)]);
  const before = { e: st.e, d: st.d, s: st.s }, p = st.tray[0];
  assert.equal(p.idd, 0, "the pod was never identified");
  const r = S.growPod(st, p, settings, T0); assert.equal(r.ok, true); assert.equal(r.capsule, 0);
  assert.deepEqual({ e: st.e, d: st.d, s: st.s }, before, "no Energy, no Data, no Essence");
  assert.equal(st.tray.length, 1, "the pod left the shelf");
  const c = N.capsuleOf(st, 0, settings, T0 + 2 * MIN); assert.equal(c.state, "growing"); assert.ok(c.progress > 0 && c.progress < 1); assert.ok(c.left >= 1);
  assert.equal(N.capsuleOf(st, 0, settings, T0 + 30 * MIN).state, "ready", "on the real clock, the first one in five minutes");
});

test("three pods grow in three capsules at once; a fourth waits for a free one", () => {
  const { st } = homeWith([0, 1, 2, 3].map((i) => podOf(i, "pond", 50 + i)));
  for (let k = 0; k < 3; k++) assert.equal(S.growPod(st, st.tray[0], settings, T0 + k).capsule, k);
  assert.deepEqual(S.capsuleBuds(st), [0, 1, 2]);
  assert.deepEqual(S.growPod(st, st.tray[0], settings, T0), { ok: false, why: "busy" });
  assert.equal(S.growBlockKey(st, st.tray[0] ? { ...st.tray[0], idd: 1 } : null)?.key, "busy");
});

test("progress is the same with the Companion here or away: it reads the clock alone", () => {
  const { st, sv } = homeWith([podOf(0, "rock", 77)]); S.growPod(st, st.tray[0], settings, T0);
  const here = N.capsuleOf(st, 0, settings, T0 + 3 * MIN);
  S.dockKey(st, sv, settings, T0 + 3 * MIN);   // (docked or lifted, the capsule's own clock does not care)
  assert.deepEqual(N.capsuleOf(st, 0, settings, T0 + 3 * MIN), here);
});

test("the hatch plays on the capsule that is ready, as today: the working capsule frees and the others keep growing", () => {
  const { st, sv } = homeWith([podOf(0, "pond", 61), podOf(1, "pond", 62)]);
  S.growPod(st, st.tray[0], settings, T0 - 60 * MIN); S.growPod(st, st.tray[0], settings, T0);
  assert.equal(N.capsuleOf(st, 0, settings, T0).state, "ready"); assert.equal(N.capsuleOf(st, 1, settings, T0).state, "growing");
  S.setWorking(st, 0); const r = S.openBud(st, sv, settings, T0); S.setWorking(st, null);
  assert.equal(r.ok, true); assert.equal(st.caps[0], null); assert.ok(st.caps[1], "the other capsule still grows");
});

test("a young waiting in her capsule holds it: nothing else can grow there; three young say so in one line", () => {
  const st = fresh(); st.caps = [{ young: 1 }, { young: 2 }, { young: 3 }];
  assert.equal(S.capsuleFree(st), -1); assert.equal(N.summary(st, settings, T0).allYoung, true);
  assert.equal(S.growBlockKey(st, { idd: 1 })?.key, "busy");
});

test("an older save's one bud goes into the first capsule", () => {
  const st = S.freshSt("w1", 0, T0), bud = { kind: "founder", species: "S01", start: T0, minutes: 5, read: [], genome: null };
  const raw = JSON.parse(JSON.stringify(st)); raw.bud = bud; delete raw.caps;
  const back = S.normalize(raw, T0); assert.equal(back.caps[0].kind, "founder"); assert.equal(back.bud, back.caps[0]);
});

test("pods never dry: a pod keeps for good, however many world turns pass", () => {
  const { st, sv } = homeWith([podOf(0, "pond", 90)]);
  S.dockKey(st, sv, settings, T0); sv.turn = 500; sv.bay = []; S.dockKey(st, sv, settings, T0);
  assert.equal(st.tray.length, 1); assert.deepEqual(S.dryPods(st), []);
});

test("rows by origin: pods of one wild one are one row with a count; forty pods are a few rows, not forty", () => {
  const pods = Array.from({ length: 40 }, (_, i) => podOf(i, ["meadow", "pond", "rock", "wood", "cave", "meadow"][i % 6 === 5 ? 0 : i % 5], 100 + i));
  const { st } = homeWith(pods); const rows = N.shelfRows(st);
  assert.ok(rows.length <= 6, "forty pods read as at most six rows: " + rows.length);
  assert.equal(rows.reduce((a, r) => a + r.count, 0), 40);
  assert.ok(rows.every((r) => r.kind === "wild" && r.title.length > 0));
});

test("the pad changes the order; rows that could bring something new always come first", () => {
  const { st } = homeWith([podOf(0, "meadow", 1), podOf(1, "pond", 2), podOf(2, "rock", 3)]);
  const a = N.shelfRows(st, "newest"), b = N.shelfRows(st, "parents");
  assert.equal(a.length, 3); assert.equal(b.length, 3);
  const firstOld = a.findIndex((r) => !r.isNew), lastNew = a.map((r) => r.isNew).lastIndexOf(true);
  assert.ok(lastNew < firstOld || firstOld < 0, "new rows come first");
  assert.deepEqual(N.ORDERS, ["newest", "parents"]);
});

test("a pod of your own pair is one origin, in either order of the parents", () => {
  assert.equal(N.originKey({ species: "S01", parents: [{ id: 2 }, { id: 1 }] }), "pair:1+2");
  assert.equal(N.originKey({ species: "S01", parents: [1, 2] }), "pair:1+2");
});
