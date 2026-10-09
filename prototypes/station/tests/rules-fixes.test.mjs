// The rules fixes (the game designer's brief): bred buds keep their unread chapters, sealed founders, ... Each section is a fix with its tests.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const lcg = (seed) => { let x = seed >>> 0; return () => { x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (x >>> 8) / 16777216; }; };
const MIN = 60000, T0 = 1000;
const rich = (st) => { st.e = 99; st.d = 99; st.s = 99; return st; };
const fresh = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); return rich(st); };
// a pod of the species, identified, with its read chapters
function podOf(st, id, read = [], gs = 5) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; S.skipIdentify(st, p); p.read = [...read]; return p; }
const chapters = (id) => frameOf(id).chapters.map((c) => c.id);
const known = (st, id, s, now) => chapters(id).filter((c) => S.budChapterKnown(st, c, s, now));

// ---- 1. bred buds keep their unread chapters ----
test("B1 a founder clears its unread chapters at (k + 1) / (n + 1) of the wait; the first bud at 75, 150 and 225 s; at the hatch it is read in full", () => {
  const st = fresh(); st.firstMibi = false; const p = podOf(st, "S01", ["coat"]);
  assert.equal(S.grow(st, p, {}, settings, T0).ok, true); assert.equal(st.bud.minutes, 20);
  const [coat, face, movement, stamina] = chapters("S01"); assert.deepEqual([coat, face, movement, stamina].length, 4);
  for (const [ch, at] of [[face, 5], [movement, 10], [stamina, 15]]) { assert.equal(S.budChapterKnown(st, ch, settings, T0 + at * MIN - 1), false, ch + " 1 ms before"); assert.equal(S.budChapterKnown(st, ch, settings, T0 + at * MIN), true, ch + " at +" + at); }
  assert.equal(S.budChapterKnown(st, coat, settings, T0), true);
  const o = S.openBud(st, null, settings, T0 + 20 * MIN); assert.deepEqual(o.mibi.read, chapters("S01"), "a founder opens known in every chapter");
  const f = fresh(); const q = podOf(f, "S01", ["coat"]); assert.equal(f.firstMibi, true); S.grow(f, q, {}, settings, T0); assert.equal(f.bud.minutes, 5);
  for (const [ch, ms] of [[face, 75000], [movement, 150000], [stamina, 225000]]) { assert.equal(S.budChapterKnown(f, ch, settings, T0 + ms - 1), false); assert.equal(S.budChapterKnown(f, ch, settings, T0 + ms), true); }
});
function crossed(seedAdultsSeed = 3, rngSeed = 7) {
  const st = fresh(), r = S.seedAdults(st, "S01", seedAdultsSeed, 2, settings), [a, b] = r.mibis, c = S.doCross(st, { with: null }, a, b, settings, T0, lcg(rngSeed));
  assert.equal(c.ok, true, c.msg); return st;
}
test("B2 a cross: the chapters the Station could be sure of are known from the start and the rest never, while it grows, at ready and after", () => {
  const st = crossed(), B = st.bud; assert.equal(B.kind, "cross"); assert.deepEqual(B.read, ["coat"], "the pair's firm chapters");
  const [coat, ...rest] = chapters("S01"); assert.equal(S.budChapterKnown(st, coat, settings, T0), true);
  for (const m of [0, 5, 10, 15, 20, 60]) { for (const ch of rest) assert.equal(S.budChapterKnown(st, ch, settings, T0 + m * MIN), false, `${ch} at +${m} min`); assert.deepEqual(known(st, "S01", settings, T0 + m * MIN), ["coat"], `+${m}`); }
  assert.equal(S.budReady(st, settings, T0 + 20 * MIN), true);
  const o = S.openBud(st, null, settings, T0 + 20 * MIN); assert.deepEqual(o.mibi.read, ["coat"]);
});
test("B3 a cross with Grow now: ready at once, the unread chapters still unknown, Open gives the same read", () => {
  const st = crossed(); const c = S.instantGrowCost(st, settings, T0 + MIN); assert.equal(c.s, 10, "19 minutes left: 10 Essence");
  assert.equal(S.instantGrow(st, settings, T0 + MIN).ok, true); assert.equal(S.budReady(st, settings, T0 + MIN), true);
  assert.equal(S.budChapterKnown(st, chapters("S01")[1], settings, T0 + MIN), false); assert.deepEqual(known(st, "S01", settings, T0 + MIN), ["coat"]);
  assert.deepEqual(S.openBud(st, null, settings, T0 + MIN).mibi.read, ["coat"]);
});
test("B4 a cross with skipBud mid and ready: as B2", () => {
  for (const how of ["mid", "ready"]) { const st = crossed(); S.skipBud(st, settings, how); const now = Date.now() + 5; assert.deepEqual(known(st, "S01", settings, now), ["coat"], how); if (how === "ready") assert.deepEqual(S.openBud(st, null, settings, now).mibi.read, ["coat"]); }
});
test("B5 a cross with nothing known: nothing is ever known and the child is read in nothing", () => {
  const st = crossed(31); st.bud.read = []; for (const m of [0, 10, 20, 60]) assert.deepEqual(known(st, "S01", settings, T0 + m * MIN), [], `+${m}`);
  assert.deepEqual(S.openBud(st, null, settings, T0 + 20 * MIN).mibi.read, []);
});
test("B6 a founder with Grow now: every chapter is known right after", () => {
  const st = fresh(); st.firstMibi = false; const p = podOf(st, "S01", ["coat"]); S.grow(st, p, {}, settings, T0); assert.equal(S.instantGrow(st, settings, T0 + MIN).ok, true);
  assert.deepEqual(known(st, "S01", settings, T0 + MIN), chapters("S01"));
});

// ---- 6. sealed founders ----
test("a founder of a species with a sealed chapter opens without it while it is shut, and with it when sealedOpen; the Incubator's chapters agree with the hatch", () => {
  const sealed = frameOf("S02").chapters.find((c) => c.sealed); assert.ok(sealed);
  for (const open of [false, true]) {
    const s = { ...settings, sealedOpen: open }, st = fresh(); st.firstMibi = false; const p = podOf(st, "S02", []); S.grow(st, p, {}, s, T0);
    const all = chapters("S02"), want = open ? all : all.filter((c) => c !== sealed.id);
    assert.deepEqual(known(st, "S02", s, T0 + 60 * MIN), want, "sealedOpen " + open + ": the chapters the bud shows known when ready");
    const o = S.openBud(st, null, s, T0 + 60 * MIN); assert.deepEqual(o.mibi.read, want, "the hatch agrees");
  }
});
