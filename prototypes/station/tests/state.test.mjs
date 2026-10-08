// The Station's rules in Node: prices and half price, the first read free, glints, compare, return, the
// migration on a fixture save (the Companion's part byte-identical), the stamp decoding to the genome.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState, stampGenome, stampFrameOf, genomeSha, nameCode, sha256, speciesIndex } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";
import { decode } from "../../genome-stamp/src/decode.mjs";
import { sameGenome } from "../../genome-stamp/src/codec.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const fixture = () => JSON.parse(readFileSync(path.join(here, "fixtures/save-v8-schema1.json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const crate = (n, pods, extra = {}) => ({ id: "x" + n, n, turn: n, at: 0, e: 3, d: 3, s: 4, pods, met: [], explored: 5, of: 20, lines: [], ...extra });
const loikaPod = (i, gs) => ({ id: "p" + i, sp: 0, g: "meadow", how: "calm", gs, k: null });
function world(crates) {
  const sv = { v: 8, seed: 7, wid: "w7", turn: 3, bay: crates, mibis: [], with: null, tier: 1, shield: 3 };
  const st = S.freshSt("w7", 3, 1000);
  return { sv, st };
}
function stocked(crates, docked = true) {
  const { sv, st } = world(crates); S.normalize(st);
  if (docked) { S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000); }
  return { sv, st };
}

test("a pod's genome comes from its seed, builds, and is the same on every load", () => {
  const fr = frameOf("S01"), a = podGenome(fr, 12345), b = podGenome(fr, 12345), c = podGenome(fr, 12346);
  assert.deepEqual(a, b); assert.notDeepEqual(a.loci, c.loci);
  assert.equal(a.species, "S01"); assert.equal(Object.keys(a.loci).length, fr.loci.length);
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.match(nameCode(genomeSha(a)), /^[0-9A-Z]{9}$/);
});

test("a trait reads as shows and hides, only, a blend's halves, or breed to change; never a locus id", () => {
  const fr = frameOf("S01");
  for (let gs = 1; gs < 40; gs++) {
    const g = podGenome(fr, gs);
    for (const ch of fr.chapters) for (const t of ch.traits) {
      const s = traitState(fr, t, g);
      assert.ok(["only", "hides", "blend", "asleep"].includes(s.kind), s.kind);
      assert.ok(!/\./.test(s.line), s.line);
      if (t.nature === "doing") assert.equal(s.sub, "breed to change");
      if (s.kind === "hides") { assert.notEqual(s.shows, s.hides); assert.equal(s.carried.length, 2); }
      if (s.kind === "blend") assert.equal(s.carried.length, 3);
    }
  }
});

test("the bay: one crate accepted once, the loose economy tops up, pods land in the wells and then wait", () => {
  const { sv, st } = world([crate(1, [loikaPod(1, 11), loikaPod(2, 12)]), crate(2, Array.from({ length: 6 }, (_, i) => loikaPod(10 + i, 100 + i)))]);
  S.normalize(st);
  assert.equal(S.dockKey(st, sv, S.DEFAULT_SETTINGS, 5).ok, true);
  const r = S.openBay(st, sv, S.DEFAULT_SETTINGS, 5);
  assert.equal(r.plays.length, 2);
  assert.deepEqual(st.accepted, ["x1", "x2"]);
  assert.equal(st.tray.length, 6); assert.equal(st.waiting.length, 2);
  assert.equal(st.e, 2 * (3 + 2)); assert.equal(st.d, 2 * (3 + 3)); assert.equal(st.s, 2 * (4 + 2));
  assert.ok(st.tray.every((p) => p.species === "S01" && p.genome && p.read.length === 0 && !p.idd));
  assert.equal(S.openBay(st, sv, S.DEFAULT_SETTINGS, 6).plays.length, 0, "accepted crates never reopen");
  assert.equal(S.bayCrates(st, sv).length, 0);
});

test("identify: 1 Energy, the first ever free; a new species is learned once and the Companion's known index follows", () => {
  const { sv, st } = stocked([crate(1, [loikaPod(1, 11), loikaPod(2, 12), { id: "t", sp: 1, g: "rock", how: "slab", gs: 5, k: null }])]);
  st.e = 1;
  const r1 = S.identify(st, st.tray[0], settings); assert.equal(r1.ok, true); assert.equal(r1.free, true); assert.equal(r1.newSp, true); assert.equal(st.e, 1);
  const r2 = S.identify(st, st.tray[1], settings); assert.equal(r2.ok, true); assert.equal(r2.free, false); assert.equal(r2.newSp, false); assert.equal(st.e, 0);
  const r3 = S.identify(st, st.tray[2], settings); assert.equal(r3.ok, false); assert.match(r3.msg, /needs 1 ⚡ more/);
  assert.deepEqual(st.knownIds, ["S01"]); assert.deepEqual(st.known, [0]); assert.deepEqual(st.met, [0]);
  st.e = 1; assert.equal(S.identify(st, st.tray[2], settings).newSp, true); assert.deepEqual(st.known, [0, 1]);
});

test("reads: 1 Data a trait, the first read ever free, half rounded up once the chapter was read on an earlier pod of the species, a read chapter free to look at again", () => {
  const { sv, st } = stocked([crate(1, [loikaPod(1, 11), loikaPod(2, 12), { id: "t", sp: 1, g: "rock", how: "slab", gs: 5, k: null }])]);
  st.e = 9; st.d = 10; st.tray.forEach((p) => S.identify(st, p, settings));
  const [a, b, t] = st.tray, tuikis = frameOf("S03");
  assert.equal(S.readCost(st, a, "coat", settings), 0, "the first read ever is free");
  assert.equal(S.read(st, a, "coat", settings).first, true); assert.equal(st.d, 10);
  assert.equal(S.readCost(st, a, "face", settings), 2, "Face has two traits");
  assert.equal(S.read(st, a, "face", settings).cost, 2); assert.equal(st.d, 8);
  assert.equal(S.readCost(st, b, "face", settings), 1, "half, rounded up, on a later Loika");
  assert.equal(S.readCost(st, b, "coat", settings), 1, "one trait halves to one");
  assert.equal(S.readCost(st, a, "face", settings), 0, "read: free to look at again");
  assert.equal(S.read(st, a, "face", settings).again, true);
  const coat = tuikis.chapters.find((c) => c.id === "coat");
  assert.equal(S.readCost(st, t, "coat", settings), coat.traits.length);
  assert.equal(S.readCost(st, t, "face", settings), 3);
  st.d = 1; assert.equal(S.read(st, t, "face", settings).ok, false);
  assert.match(S.readBlock(st, t, "face", settings), /needs 2 ◆ more/);
  assert.equal(S.readBlock(st, { ...t, idd: 0 }, "face", settings), "identify it first");
  assert.equal(S.progress(a, settings), 3 / 5);
  assert.equal(S.readCost(st, a, "face", { ...settings, economy: "free" }), 0);
});

test("a glint says new here: a chapter read before on the species, unread on this pod, carrying a look the guide lacks", () => {
  const fr = frameOf("S01");
  // find two seeds whose Face traits differ in what they carry
  let a = null, b = null;
  for (let i = 1; i < 200 && !b; i++) { const g = podGenome(fr, i), carried = fr.chapters[1].traits.flatMap((t) => traitState(fr, t, g).carried).sort().join();
    if (!a) a = { i, carried }; else if (carried !== a.carried && !carried.split(",").every((l) => a.carried.split(",").includes(l))) b = { i, carried }; }
  const { sv, st } = stocked([crate(1, [loikaPod(1, a.i), loikaPod(2, b.i)])]);
  st.e = 9; st.d = 20; st.tray.forEach((p) => S.identify(st, p, settings));
  const [pa, pb] = st.tray;
  assert.equal(S.glint(st, pb, "face"), false, "nothing glints before the chapter was ever read");
  S.read(st, pa, "face", settings);
  assert.equal(S.glint(st, pb, "face"), true);
  assert.equal(S.podGlints(st, pb), true);
  S.read(st, pb, "face", settings);
  assert.equal(S.glint(st, pb, "face"), false, "a read chapter never glints");
  assert.ok(S.guideLooks(st, "S01", "eye-rings").length >= 1);
});

test("compare: the traits read on both pods that differ; return a pod for +1 Essence and the Companion's record", () => {
  const { sv, st } = stocked([crate(1, [loikaPod(1, 1), loikaPod(2, 2), { id: "t", sp: 1, g: "rock", how: "slab", gs: 5, k: "12" }])]);
  st.e = 9; st.d = 20; st.tray.forEach((p) => S.identify(st, p, settings));
  const [a, b, t] = st.tray;
  assert.equal(S.compareDiff(st, a, t), null, "two species never compare");
  assert.deepEqual(S.compareDiff(st, a, b), [], "nothing read: nothing differs");
  S.read(st, a, "face", settings); S.read(st, b, "face", settings);
  const d = S.compareDiff(st, a, b);
  assert.ok(Array.isArray(d)); for (const id of d) assert.ok(["crown", "eye-rings"].includes(id));
  const s0 = st.s, r = S.returnPod(st, t, settings, 1);
  assert.equal(r.ok, true); assert.equal(st.s, s0 + 1); assert.equal(st.tray.length, 2);
  assert.deepEqual(st.returned.at(-1), { id: t.id, sp: 1, g: "rock", k: "12" });
});

test("the migration: pods keep their seeds and get genomes, studies start again, mibis become fully read founders, the Companion's part is byte-identical", () => {
  const raw = fixture(), before = JSON.stringify({ ...raw, st: undefined });
  const st = S.normalize(S.migrate(raw.st, 777));
  assert.equal(st.schema, 2);
  assert.equal(st.tray.length, 2); assert.equal(st.tray[0].gs, raw.st.tray[0].gs); assert.ok(st.tray[0].genome); assert.deepEqual(st.tray[0].read, []); assert.equal(st.tray[0].al, undefined);
  assert.equal(st.tray[1].species, "S03"); assert.equal(st.tray[1].idd, 1);
  assert.equal(st.mibis.length, 1); const m = st.mibis[0];
  for (const k of ["id", "name", "sp", "born", "from", "bonded"]) assert.deepEqual(m[k], raw.st.mibis[0][k]);
  assert.equal(m.species, "S01"); assert.ok(m.genome && m.sha && m.code); assert.deepEqual(m.read, frameOf("S01").chapters.map((c) => c.id)); assert.equal(m.parents, null); assert.equal(m.bay, 0); assert.equal(m.released, false);
  assert.deepEqual(st.known, [0, 1]); assert.deepEqual(st.knownIds, ["S01", "S03"]);
  assert.equal(st.readEver, true, "a study was paid once, so the free first read is spent");
  assert.ok(Object.keys(st.guide.S01).length >= 1, "the guide holds the founder's looks");
  assert.equal(st.bays, 6); assert.equal(st.bud, null); assert.deepEqual(st.outbox, []);
  for (const k of ["accepted", "dockN", "probe", "withReq", "returned"]) assert.deepEqual(st[k], raw.st[k]);
  assert.match(st.log.at(-1), /migrated/);
  assert.equal(JSON.stringify({ ...raw, st: undefined }), before, "the Companion's part is untouched");
  assert.equal(S.migrate(st, 778), st, "forward only, never twice");
});

test("the stamp: a read pod's stamp decodes to its genome; the mask follows the chapters read", () => {
  const { sv, st } = stocked([crate(1, [loikaPod(1, 11)])]);
  st.e = 9; st.d = 20; const p = st.tray[0]; S.identify(st, p, settings); S.read(st, p, "coat", settings); S.read(st, p, "face", settings);
  const fr = frameOf("S01"), sg = stampGenome(fr, p.genome, p.read);
  assert.deepEqual(sg.read, ["Coat", "Face"]);
  const img = rasterize(stampGeometry(sg), 200), d = decode(img);
  assert.equal(d.stamps.length, 1);
  assert.equal(sameGenome(stampFrameOf(fr), sg, d.stamps[0].genome), true);
  assert.equal(d.stamps[0].genome.unread.length, 2);
  assert.match(S.stampCodeOf(p), /^S1v2-03-/);
});

test("need: crates, then new pods, then glints, then unread pods", () => {
  const { sv, st } = world([crate(1, [loikaPod(1, 11)])]); S.normalize(st);
  S.dockKey(st, sv, settings, 1);
  assert.equal(S.need(st, sv, settings).act, "bay");
  S.openBay(st, sv, settings, 1);
  assert.match(S.need(st, sv, settings).text, /new pod/);
  st.e = 5; S.identify(st, st.tray[0], settings);
  assert.match(S.need(st, sv, settings).text, /Loika pod waits/);
  S.skipRead(st, st.tray[0], settings);
  assert.equal(S.need(st, sv, settings).text, "");
});

test("developer seeds go through the same rules: a seeded crate arrives at the dock, a pasted genome is checked whole", () => {
  const { sv, st } = world([]); S.normalize(st);
  assert.equal(S.seedCrate(st, "S05", 3, 42).ok, true);
  assert.equal(S.bayCrates(st, sv).length, 1);
  S.dockKey(st, sv, settings, 1); S.openBay(st, sv, settings, 1);
  assert.equal(st.tray.length, 3); assert.equal(st.tray[0].species, "S05"); assert.equal(st.tray[0].sp, -1, "no Companion index for a species it does not carry");
  assert.equal(S.identify(st, st.tray[0], settings).newSp, true);
  assert.deepEqual(st.known, [], "the Companion's known list only carries its own species");
  const g = podGenome(frameOf("S01"), 9); assert.equal(S.seedPodFromGenome(st, g, settings).ok, true);
  const bad = structuredClone(g); bad.loci["appearance.marking-switch"] = ["maybe", "on"];
  assert.equal(S.seedPodFromGenome(st, bad, settings).ok, false);
  assert.equal(speciesIndex("S05"), -1);
});
