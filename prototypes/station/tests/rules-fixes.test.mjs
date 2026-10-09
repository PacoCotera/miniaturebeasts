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

// ---- 3. names never carry a digit ----
test("N1 the first two names are Dot and Moss; a fresh save has no names used", () => {
  const st = S.freshSt("w1", 1, T0); assert.deepEqual(st.namesUsed, []); assert.equal(S.drawName(st), "Dot"); assert.equal(S.drawName(st), "Moss"); assert.deepEqual(st.namesUsed, ["dot", "moss"]);
});
test("N2 no name carries a digit over 5,000 draws; N4 the pool's order: names, heads × tails, head + tail + tail, all unique", () => {
  const st = S.freshSt("w1", 1, T0), pool = { names: ["Dot", "Moss", "Bean"], heads: ["Ka", "Lo", "Mi", "Ne", "Pu", "Ro", "Su", "Te", "Va", "Wi", "Xe", "Yo"], tails: ["ri", "sa", "mo", "vu", "li", "po", "ke", "na", "do", "fi", "gu", "ha"] };
  const seen = new Set(); for (let i = 0; i < 5000; i++) { const n = S.drawName(st, pool); assert.ok(!/\d/.test(n), n); assert.ok([...n].length <= S.NAME_MAX, n); assert.ok(!seen.has(S.nameKey(n)), "unique " + n); seen.add(S.nameKey(n)); }
  const s2 = S.freshSt("w1", 1, T0), p2 = { names: ["A", "B"], heads: ["Ka", "Lo"], tails: ["ri", "sa"] };
  assert.deepEqual(Array.from({ length: 12 }, () => S.drawName(s2, p2)), ["A", "B", "Kari", "Lori", "Kasa", "Losa", "Kariri", "Loriri", "Kasari", "Losari", "Karisa", "Lorisa"]);
});
test("N3 a released name is never redrawn, and a migrated name blocks its look-alike", () => {
  const st = fresh(); S.seedAdults(st, "S01", 3, 2, settings); const [dot] = st.mibis; assert.equal(dot.name, "Dot"); dot.released = true; assert.ok(st.namesUsed.includes("dot"));
  assert.equal(S.drawName(st), "Bean", "Dot and Moss are used, the third name is next"); st.mibis.push({ ...dot, id: 99, name: "Fíg", released: false }); S.normalize(st); assert.ok(st.namesUsed.includes("fig"));
  assert.notEqual(S.drawName(st), "Fig", "FIG blocks Fig");
  const s2 = S.freshSt("w1", 1, T0); s2.mibis.push({ ...dot, id: 5, name: "DOT" }); S.normalize(s2); assert.equal(S.drawName(s2), "Moss", "a migrated DOT blocks Dot");
});
test("nameKey and nameProblem: lowercase, accents and separators gone; the refusals of the naming board", () => {
  assert.equal(S.nameKey("Mo-Mo"), "momo"); assert.equal(S.nameKey("Mómo"), "momo"); assert.equal(S.nameKey("Mo Mo"), "momo"); assert.equal(S.nameKey("Œuf"), "oeuf"); assert.equal(S.nameKey("ŒUF"), "oeuf");
  for (const bad of ["A", "Elevenchars", "-Mo", "Mo-", "Mo--Mo", "Mo -Mo", "Loika", "loika", "LOIKA", "Aulaka", "Lóika"]) assert.notEqual(S.nameProblem(bad), "", bad);
  for (const ok of ["Mo", "Mo-Mo", "Tenletters", "Bean", "Pip"]) assert.equal(S.nameProblem(ok), "", ok);
  const st = S.freshSt("w1", 1, T0); assert.equal(S.claimName(st, "Mo-Mo").ok, true); assert.equal(S.claimName(st, "Mómo").ok, false); assert.ok(st.namesUsed.includes("momo")); assert.equal(S.claimName(st, "X").ok, false);
  assert.equal(S.drawName(st, { names: ["Mo Mo", "Nib"] }), "Nib", "a player's name blocks the pool's look-alike");
});
test("N5 a save with digit names: renamed in id order, the references follow, and a second normalize changes nothing", () => {
  const st = fresh(); S.seedAdults(st, "S01", 3, 2, settings); const [a, b] = st.mibis;
  a.name = "Pebble 2"; b.name = "Moss 2"; a.code = "CODEAAAAA"; b.code = "CODEBBBBB";
  const child = { ...a, id: 7, name: "Wren", parents: [{ id: a.id, name: "Pebble 2" }, { id: b.id, name: "Moss 2" }], from: { n: 0, g: "meadow", how: "cross", podId: null, of: ["Pebble 2", "Moss 2"] } }; st.mibis.push(child);
  st.releases.push({ id: a.id, name: "Pebble 2", species: "S01" }); st.guideNotes.S01 = [{ name: "Pebble 2", code: "CODEAAAAA", turn: 1 }, { name: "Other", code: "ZZZ", turn: 1 }];
  delete st.namesUsed; st.log = [];   // an old save: no names used yet
  S.normalize(st); const names = st.mibis.map((m) => m.name); assert.ok(names.every((n) => !/\d/.test(n)), names.join());
  assert.equal(a.name, "Dot", "id order, first of the pool that is free (Dot and Moss are free: their holders were Pebble 2 and Moss 2)"); assert.equal(b.name, "Moss");
  assert.deepEqual(child.parents.map((q) => q.name), [a.name, b.name]); assert.deepEqual(child.from.of, [a.name, b.name]); assert.equal(st.releases[0].name, a.name); assert.equal(st.guideNotes.S01[0].name, a.name); assert.equal(st.guideNotes.S01[1].name, "Other");
  assert.equal(st.log.filter((l) => / · Renamed /.test(l)).length, 2);
  const once = JSON.stringify(st); S.normalize(st); assert.equal(JSON.stringify(st), once, "idempotent");
});
test("N6 the three callers draw as drawName does", () => {
  const st = fresh(); const names = []; for (let i = 0; i < 3; i++) { const p = podOf(st, "S01", chapters("S01")); st.firstMibi = false; S.grow(st, p, {}, settings, T0); names.push(S.openBud(st, null, settings, T0 + 60 * MIN).mibi.name); }
  S.seedAdults(st, "S01", 5, 2, settings); names.push(...st.mibis.slice(3).map((m) => m.name)); S.seedSiblings(st, "S01", 9, settings); names.push(...st.mibis.slice(5).map((m) => m.name));
  const ref = S.freshSt("w1", 1, T0); assert.deepEqual(names, names.map(() => S.drawName(ref)), "the same sequence"); assert.equal(new Set(names.map(S.nameKey)).size, names.length);
});
