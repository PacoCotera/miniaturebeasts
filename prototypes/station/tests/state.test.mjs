// The Station's rules in Node: prices and half price, the first read free, glints, compare, return, the
// migration on a fixture save (the Companion's part byte-identical), the stamp decoding to the genome.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI } from "../../workbench/framework/catalogue.mjs";
import { setFrames, frameOf, frameIds, podGenome, traitState, stampGenome, stampFrameOf, genomeSha, nameCode, sha256, speciesIndex } from "../src/genome.mjs";
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
      if (s.kind === "blend") { assert.equal(s.carried.length, 3); assert.match(s.line, / to /); }
      assert.ok(!/^shows /.test(s.line) && !/if they wake/.test(s.line), s.line);
    }
  }
});

test("no Pods trait line is longer than six words, over every pair of looks in all sixteen frames", () => {
  const words = (line) => line.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  const pairs = (list) => list.flatMap((x, i) => list.slice(i).map((y) => [x, y]));
  let checked = 0, longest = { n: 0, line: "" };
  const kinds = new Set();
  for (const id of frameIds()) {
    const fr = frameOf(id);
    for (const ch of fr.chapters) for (const t of ch.traits) {
      const poolOf = (lid) => fr.pools?.[lid] ?? LOCI.get(lid).alleles.map((a) => a.id);
      const base = podGenome(fr, 3);
      const first = t.loci[0], second = t.loci[1];
      for (const pa of pairs(poolOf(first))) for (const pb of (second ? pairs(poolOf(second)) : [null])) {
        const g = structuredClone(base); g.loci[first] = [...pa]; if (pb) g.loci[second] = [...pb];
        const st = traitState(fr, t, g);
        kinds.add(st.kind); checked++;
        const n = words(st.line);
        if (n > longest.n) longest = { n, line: `${id} ${t.name}: ${st.line}` };
        assert.ok(n <= 6, `${id} ${t.name}: "${st.line}" is ${n} words`);
        assert.ok(!/^shows /.test(st.line) && !/if they wake/.test(st.line) && !/ and /.test(st.line) || /(tail and ears|bars and spots)/.test(st.line), st.line);
      }
    }
  }
  assert.ok(checked > 1000 && ["only", "hides", "blend", "asleep"].every((k) => kinds.has(k)), `${checked} lines over ${[...kinds]}`);
  assert.ok(longest.n <= 6, longest.line);
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
  assert.match(S.stampCodeOf(p), new RegExp(`^S1v${stampFrameOf(fr).version}-03-`), "the code names the frame version the registry builds now");
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
  assert.match(S.need(st, sv, settings).text, /could grow/);
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

// --- M2 Grow ---
const readPod = (crates = [crate(1, [loikaPod(1, 11)])]) => { const w = stocked(crates); w.st.e = 20; w.st.d = 20; w.st.s = 20; for (const p of w.st.tray) S.skipRead(w.st, p, settings); return w; };

test("Create: a read look-trait rolls among three pictures from the pod's own copies; a doing never; a change costs 1 Data", () => {
  const { st } = readPod(), p = st.tray[0], fr = frameOf("S01");
  const sh = S.shapeableTraits(p).map((t) => t.id);
  assert.ok(sh.includes("markings") && sh.includes("crown") && sh.includes("eye-rings") && !sh.includes("drive") && !sh.includes("efficiency"), sh.join());
  for (const id of sh) { const o = S.rollOptions(p, id), same = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === id).loci.every((l) => p.genome.loci[l][0] === p.genome.loci[l][1]);
    assert.equal(o.length, same ? 1 : 3, id); assert.equal(o[0].choice, 0); assert.deepEqual(o[0].genome, p.genome); }
  assert.deepEqual(S.rollOptions(p, "drive"), []);
  const choices = { "eye-rings": 1 }, g = S.founderGenome(p, choices);
  assert.deepEqual(g.loci["growth.exterior-eye-size-ratio"], [p.genome.loci["growth.exterior-eye-size-ratio"][0], p.genome.loci["growth.exterior-eye-size-ratio"][0]]);
  assert.deepEqual(S.growCost(st, choices, settings), { e: 2, s: 0, d: 1 }, "the first founder: 2 Energy and the change");
  st.firstMibi = false; assert.deepEqual(S.growCost(st, { "eye-rings": 2, crown: 1 }, settings), { e: 2, s: 4, d: 2 });
  assert.deepEqual(S.clashTraits(p, choices), [], "a shape the frame's pools allow builds");
  // the clash mechanism: a validator that rejects whenever the crown is shaped marks the crown alone
  const rejectsCrown = (frame, genome) => (genome.loci["anatomy.crown-presence"].join() === "off,off" ? ["a crown clash"] : []);
  const g0 = p.genome.loci["anatomy.crown-presence"], offChoice = g0[0] === "off" ? 1 : g0[1] === "off" ? 2 : 0;
  if (offChoice) { assert.deepEqual(S.clashTraits(p, { crown: offChoice, "eye-rings": 1 }, rejectsCrown), ["crown"]); assert.match(S.growBlock(st, p, { crown: offChoice }, settings, ["crown"]), /won't grow · Crown/); }
  assert.deepEqual(S.clashTraits(p, { "eye-rings": 1, crown: 0 }, () => ["always"]), ["eye-rings"], "when no single revert fixes it, every changed trait is marked");
});

test("Grow: validated and paid once; the first bud ever five minutes, then twenty plus one per shaped trait; the pod leaves the rack; the genome waits in the outbox", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 11), loikaPod(2, 12)])]);
  const [a, b] = st.tray;
  assert.match(S.growBlock(st, { ...a, idd: 0 }, {}, settings), /identify/);
  const r = S.grow(st, a, { "eye-rings": 1 }, settings, 1000);
  assert.equal(r.ok, true); assert.equal(st.e, 18); assert.equal(st.s, 20); assert.equal(st.d, 19);
  assert.equal(st.bud.minutes, 5, "the first bud ever: five minutes"); assert.equal(st.bud.firstEver, true); assert.deepEqual(st.bud.shaped, ["eye-rings"]);
  assert.equal(st.tray.length, 1); assert.equal(st.outbox.length, 1); assert.equal(st.outbox[0].sha, st.bud.sha); assert.match(st.bud.code, /^[0-9A-Z]{9}$/);
  assert.match(S.growBlock(st, b, {}, settings), /busy/);
  assert.equal(S.budProgress(st, settings, 1000 + 2.5 * 60000), 0.5); assert.equal(S.budReady(st, settings, 1000 + 5 * 60000), true);
  assert.equal(S.budChapterKnown(st, "coat", settings, 1000), true, "a read chapter is known from the start");
  assert.equal(S.budProgress(st, { ...settings, budScale: 10 }, 1000 + 30000), 1, "the developer's bud scale");
  assert.equal(S.openBud(st, null, settings, 1000).ok, false, "not before it is ready");
  const o = S.openBud(st, null, settings, 1000 + 5 * 60000); assert.equal(o.ok, true);
  const m = o.mibi; assert.equal(m.name, "Dot"); assert.equal(m.bay, 0); assert.deepEqual(m.read, frameOf("S01").chapters.map((c) => c.id)); assert.equal(m.parents, null); assert.equal(m.paint, null); assert.equal(st.bud, null);
  assert.equal(S.mibiStage(st, m), "juvenile");
  // the second founder: 2 Energy 4 Essence, twenty-one minutes with one shaped trait, and instant grow for a price
  const r2 = S.grow(st, b, { markings: 2 }, settings, 2000); assert.equal(r2.ok, true); assert.equal(st.e, 16); assert.equal(st.s, 16); assert.equal(st.bud.minutes, 21);
  assert.equal(S.budReady(st, settings, 2000 + 60000), false);
  const ig = S.instantGrow(st, settings, 2000 + 60000); assert.equal(ig.ok, true); assert.equal(st.s, 14); assert.equal(S.budReady(st, settings, 2000 + 60001), true);
  assert.equal(S.openBud(st, null, settings, 2000 + 60001).mibi.bay, 1);
});

test("six bays: a full vivarium refuses Grow before payment and Open until one is returned; a returned mibi is released, +2 Essence, never bonded or juvenile or with you", () => {
  const { st } = readPod([crate(1, Array.from({ length: 6 }, (_, i) => loikaPod(i, 50 + i)))]);
  assert.equal(S.seedAdults(st, "S01", 9, 6, settings).mibis.length, 6);
  assert.equal(S.bayFull(st, settings), true);
  const e0 = st.e; assert.match(S.growBlock(st, st.tray[0], {}, settings), /no bay free/); assert.equal(S.grow(st, st.tray[0], {}, settings).ok, false); assert.equal(st.e, e0, "nothing paid");
  assert.equal(S.bayFull(st, { ...settings, bays: 8 }), false, "the developer's bays");
  const m = st.mibis[0], s0 = st.s;
  m.bonded = true; assert.match(S.returnMibi(st, null, m, settings).msg, /bonded/); m.bonded = false;
  m.born = st.turn; assert.match(S.returnMibi(st, null, m, settings).msg, /adult/); m.born = st.turn - 2;
  const sv = { with: m.id }; assert.match(S.returnMibi(st, sv, m, settings).msg, /with you/);
  const r = S.returnMibi(st, { with: null }, m, settings); assert.equal(r.ok, true); assert.equal(st.s, s0 + 2); assert.equal(m.released, true);
  assert.equal(S.housed(st).length, 5); assert.equal(S.freeBay(st, settings), m.bay); assert.deepEqual(st.releases.at(-1).id, m.id); assert.equal(st.guideNotes.S01.length, 1);
  assert.equal(S.grow(st, st.tray[0], {}, settings, 5000).ok, true);
  assert.equal(S.openBud(st, { with: null }, settings, 5000 + 21 * 60000).mibi.bay, m.bay, "the freed bay is taken");
});

// --- M4 Cross ---
test("the cross: refusals before cost; a child of two founders with real parents, known only where switch parents match; the forecast's quarters and range", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const r = S.seedAdults(st, "S01", 31, 2, settings), [a, b] = r.mibis, fr = frameOf("S01");
  assert.equal(S.crossBlock(st, null, a, a, settings), "one mibi is not a pair");
  const young = { ...b, born: st.turn }; assert.equal(S.crossBlock(st, null, a, young, settings), "not adult");
  const tuikis = S.seedAdults(st, "S03", 5, 1, settings).mibis[0]; assert.equal(S.crossBlock(st, null, a, tuikis, settings), "another species");
  assert.deepEqual(S.crossPartners(st, null, a, settings).map((m) => m.id), [b.id]);
  assert.equal(S.kinshipOf(st, a, b), 0, "two founders are unrelated");
  const fc = S.forecastOf(st, a, b, settings);
  assert.equal(fc.kinship, 0); assert.equal(fc.traits.length, 5);
  for (const t of fc.traits) { if (t.kind === "switch") { assert.equal(t.seeds.length, 4); assert.ok(Math.abs(t.seeds.reduce((s2, x) => s2 + x.weight, 0) - 1) < 1e-6); } else { assert.equal(t.kind, "blend"); assert.ok(t.range[0] <= t.range[1]); assert.equal(t.firm, false); } }
  const e0 = st.e, s0 = st.s;
  let seed = 7; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const c = S.doCross(st, null, a, b, settings, 1000, rng); assert.equal(c.ok, true, c.msg);
  assert.equal(st.e, e0 - 2); assert.equal(st.s, s0 - 4);
  const B = st.bud; assert.equal(B.kind, "cross"); assert.equal(B.parents.length, 2); assert.equal(B.parents[0].id, a.id); assert.ok(B.parents[1].genome); assert.equal(B.minutes, 20); assert.equal(B.kinship, 0);
  assert.deepEqual(B.read, S.childKnownChapters(fr, fc), "known only where every trait of the chapter is firm");
  for (const l of fr.loci) if (l.kind !== "locked") { const [x, y] = B.genome.loci[l.id]; const cont = typeof x === "number"; if (!cont) { assert.ok(a.genome.loci[l.id].includes(x) && b.genome.loci[l.id].includes(y), "one copy from each parent at " + l.id); } else assert.equal(x, y, "a blend's copies are equal"); }
  assert.match(S.crossBlock(st, null, a, b, settings), /busy/);
  const o = S.openBud(st, null, settings, 1000 + 20 * 60000); assert.equal(o.ok, true); const child = o.mibi;
  assert.equal(child.parents.length, 2); assert.deepEqual(child.read, B.read); assert.equal(S.mibiStage(st, child), "juvenile");
  // reading the child: a blended chapter costs as a pod's would, half once read on the species before
  const unread = fr.chapters.find((ch) => !child.read.includes(ch.id)); assert.ok(unread, "a chapter stays unread on the child");
  const cost = S.mibiReadCost(st, child, unread.id, settings); assert.ok(cost >= 1);
  const rr = S.readMibi(st, child, unread.id, settings); assert.equal(rr.ok, true); assert.ok(child.read.includes(unread.id)); assert.equal(S.readMibi(st, child, unread.id, settings).again, true);
  // kinship: the child to a parent is a quarter; siblings a quarter; the penalty surfaces more
  assert.equal(S.kinshipOf(st, child, a), 0.25);
  child.born = st.turn - 2;
  const fc2 = S.forecastOf(st, child, a, settings); assert.equal(fc2.kinship, 0.25);
  const sib = S.seedSiblings(st, "S01", 99, { ...settings, bays: 10 }); assert.equal(sib.ok, true, sib.msg);
  assert.equal(S.kinshipOf(st, sib.mibis[0], sib.mibis[1]), 0.25, "full siblings");
  assert.equal(S.kinshipOf(st, sib.mibis[0], sib.parents[0]), 0.25);
  assert.equal(S.kinshipOf(st, sib.mibis[0], a), 0, "unrelated lines");
  assert.match(S.kinshipWord(0.25), /close kin/); assert.match(S.kinshipWord(0), /wild founders/);
});
