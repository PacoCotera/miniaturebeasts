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
S.useNameList("en-short-1");   // these tests show the archived English names (T-20261027-322): they pin that list; names.test.mjs proves the current one
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
  assert.equal(st.e, 2 * (3 + 2)); assert.equal(st.d, 2 * (3 + 3)); assert.equal(st.s, 2 * (4 + 4));
  assert.ok(st.tray.every((p) => p.species === "S01" && p.genome && p.read.length === 0 && !p.idd));
  assert.equal(S.openBay(st, sv, S.DEFAULT_SETTINGS, 6).plays.length, 0, "accepted crates never reopen");
  assert.equal(S.bayCrates(st, sv).length, 0);
});

test("identify: ◆1 on every pod, no free first one, no Energy; a new species is learned once and the Companion's known index follows", () => {
  const { st } = stocked([crate(1, [loikaPod(1, 11), loikaPod(2, 12), { id: "t", sp: 1, g: "rock", how: "slab", gs: 5, k: null }])]);
  st.e = 0; st.d = 1;
  assert.equal(S.identifyCost(st, settings), 1, "the first Identify ever costs ◆1");
  const r1 = S.identify(st, st.tray[0], settings); assert.equal(r1.ok, true); assert.equal(r1.free, false); assert.equal(r1.newSp, true);
  assert.equal(st.d, 0); assert.equal(st.e, 0, "Energy untouched");
  const r2 = S.identify(st, st.tray[1], settings); assert.equal(r2.ok, false); assert.match(r2.msg, /needs ◆ 1 more/); assert.equal(st.tray[1].idd, 0);
  st.d = 1; assert.equal(S.identify(st, st.tray[1], settings).newSp, false); assert.equal(st.d, 0);
  assert.deepEqual(st.knownIds, ["S01"]); assert.deepEqual(st.known, [0]);
  st.d = 1; assert.equal(S.identify(st, st.tray[2], settings).newSp, true); assert.deepEqual(st.known, [0, 1]); assert.deepEqual(st.met, [0, 1]);
  // the free economy still waives it
  assert.equal(S.identifyCost(S.freshSt("w1", 0, 1), { ...settings, economy: "free" }), 0);
});

test("the opening pays for the first Identify: a fresh save's first crate opens before any Identify and brings its Data", () => {
  const { st } = stocked([crate(1, [loikaPod(1, 11)])]);
  assert.ok(st.d >= S.identifyCost(st, settings), "the first crate brings the first Identify's Data");
  assert.equal(S.identify(st, st.tray[0], settings).ok, true);
});

test("the dock spends nothing: a fresh save's switch is off (mendFull defaults to false)", () => {
  const st = S.freshSt("w1", 0, 1); S.normalize(st); assert.equal(st.mendFull, false);
});

test("reads: 1 Data a trait, the first read ever free, half rounded up once the chapter was read on an earlier pod of the species, a read chapter free to look at again", () => {
  const { sv, st } = stocked([crate(1, [loikaPod(1, 11), loikaPod(2, 12), { id: "t", sp: 1, g: "rock", how: "slab", gs: 5, k: null }])]);
  st.e = 9; st.d = 3; st.tray.forEach((p) => S.identify(st, p, settings)); st.d = 10;
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
  assert.match(S.readBlock(st, t, "face", settings), /needs ◆ 2 more/);
  assert.equal(S.readBlock(st, { ...t, idd: 0 }, "face", settings), "identify it first");
  assert.equal(S.progress(a, settings), 4 / 6);   // the Loika at frame version 4 (T-20261016-200): Coat holds Colour and Markings, so Coat and Face read are 4 of its 6 traits
  assert.equal(S.readCost(st, a, "face", { ...settings, economy: "free" }), 0);
});

test("a glint says new here: a chapter read before on the species, unread on this pod, carrying a look the guide lacks", () => {
  const fr = frameOf("S01");
  // find two seeds whose Face traits differ in what they carry
  let a = null, b = null;
  for (let i = 1; i < 200 && !b; i++) { const g = podGenome(fr, i), carried = fr.chapters[1].traits.flatMap((t) => traitState(fr, t, g).carried).sort().join();
    if (!a) a = { i, carried }; else if (carried !== a.carried && !carried.split(",").every((l) => a.carried.split(",").includes(l))) b = { i, carried }; }
  const { sv, st } = stocked([crate(1, [loikaPod(1, a.i), loikaPod(2, b.i)])]);
  st.e = 9; st.d = 3; st.tray.forEach((p) => S.identify(st, p, settings)); st.d = 20;
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
  st.e = 9; st.d = 3; st.tray.forEach((p) => S.identify(st, p, settings)); st.d = 20;
  const [a, b, t] = st.tray;
  assert.equal(S.compareDiff(st, a, t), null, "two species never compare");
  assert.deepEqual(S.compareDiff(st, a, b), [], "nothing read: nothing differs");
  S.read(st, a, "face", settings); S.read(st, b, "face", settings);
  const d = S.compareDiff(st, a, b);
  assert.ok(Array.isArray(d)); for (const id of d) assert.ok(["crown", "eye-rings"].includes(id));
  const fr = S.frameFor(a), lineOf = (p, id) => traitState(fr, fr.chapters.flatMap((c) => c.traits).find((x) => x.id === id), p.genome).line;
  for (const id of d) assert.notEqual(lineOf(a, id), lineOf(b, id), `${id}: marked only where the two read differently`);
  const s0 = st.s, r = S.returnPod(st, t, settings, 1);
  assert.equal(r.ok, true); assert.equal(st.s, s0 + 1); assert.equal(st.tray.length, 2);
  assert.deepEqual(st.returned.at(-1), { id: t.id, sp: 1, species: "S03", g: "rock", gs: t.gs >>> 0, k: "12" });
});

test("the migration: pods keep their seeds and get genomes, studies start again, mibis become fully read founders, the Companion's part is byte-identical", () => {
  const raw = fixture(), before = JSON.stringify({ ...raw, st: undefined });
  const st = S.normalize(S.migrate(raw.st, 777, raw));
  assert.equal(st.schema, S.ST_SCHEMA);
  assert.equal(st.tray.length, 2); assert.equal(st.tray[0].gs, raw.st.tray[0].gs); assert.ok(st.tray[0].genome); assert.deepEqual(st.tray[0].read, []); assert.equal(st.tray[0].al, undefined);
  assert.equal(st.tray[1].species, "S03"); assert.equal(st.tray[1].idd, 1);
  assert.equal(st.mibis.length, 1); const m = st.mibis[0];
  for (const k of ["id", "name", "sp", "born", "from", "bonded"]) assert.deepEqual(m[k], raw.st.mibis[0][k]);
  assert.equal(m.species, "S01"); assert.ok(m.genome && m.sha && m.code); assert.deepEqual(m.read, frameOf("S01").chapters.map((c) => c.id)); assert.equal(m.parents, null); assert.equal(m.bay, 0); assert.equal(m.released, false);
  assert.deepEqual(st.known, [0, 1]); assert.deepEqual(st.knownIds, ["S01", "S03"]);
  assert.equal(st.readEver, true, "a study was paid once, so the free first read is spent");
  assert.ok(Object.keys(st.guide.S01).length >= 1, "the guide holds the founder's looks");
  assert.equal(st.rooms, 1); assert.equal(st.bays, 8); assert.deepEqual([m.room, m.slot], [0, 0]); assert.deepEqual(st.sheds, []); assert.equal(st.bud, null); assert.deepEqual(st.outbox, []);
  for (const k of ["accepted", "dockN", "probe"]) assert.deepEqual(st[k], raw.st[k]);
  assert.deepEqual(st.returned, [{ id: "xw2n9c-2:q4", sp: 2, g: "pond", k: "31", species: "S02" }], "a returned entry gains its species, nothing else");
  assert.deepEqual(st.carryReqs, [], "its request (seq 1) was applied (withSeen 1): nothing to carry over"); assert.equal(st.carrySeq, 0); assert.equal("withReq" in st, false, "the request field is gone");
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
  assert.match(S.need(st, sv, settings).text, /pod, ready to incubate/);
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

test("Grow: validated and paid once; the first bud ever five minutes, then twenty plus one per shaped trait; the pod leaves the rack; Grow paints nothing, so the outbox stays empty", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 11), loikaPod(2, 12)])]);
  const [a, b] = st.tray;
  assert.match(S.growBlock(st, { ...a, idd: 0 }, {}, settings), /identify/);
  const r = S.grow(st, a, { "eye-rings": 1 }, settings, 1000);
  assert.equal(r.ok, true); assert.equal(st.e, 18); assert.equal(st.s, 20); assert.equal(st.d, 19);
  assert.equal(st.bud.minutes, 5, "the first bud ever: five minutes"); assert.equal(st.bud.firstEver, true); assert.deepEqual(st.bud.shaped, ["eye-rings"]);
  assert.equal(st.tray.length, 1); assert.deepEqual(st.outbox, [], "Grow paints nothing (decisions 10-11 14:17)"); assert.match(st.bud.code, /^[0-9A-Z]{9}$/);
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
  const ig = S.instantGrow(st, settings, 2000 + 60000); assert.equal(ig.ok, true); assert.equal(st.s, 16 - 10, "20 minutes left: 10 Essence, no Energy, no Data"); assert.equal(st.e, 16); assert.equal(st.bud, null, "Hatch now hatches it"); assert.equal(ig.mibi.bay, 1);
});

test("eight places: a full vivarium refuses Grow before payment and Open until one is returned; a returned mibi is released, +2 Essence, never bonded or with you; a young one may go", () => {
  const { st } = readPod([crate(1, Array.from({ length: 6 }, (_, i) => loikaPod(i, 50 + i)))]);
  assert.equal(S.seedAdults(st, "S01", 9, 8, settings).mibis.length, 8);
  assert.equal(S.vivFull(st, settings), true);
  const e0 = st.e; assert.equal(S.growBlock(st, st.tray[0], {}, settings), "the Vivarium is full"); assert.equal(S.grow(st, st.tray[0], {}, settings).ok, false); assert.equal(st.e, e0, "nothing paid");
  assert.equal(S.vivFull(st, { ...settings, rooms: 2 }), false, "the developer's rooms");
  const m = st.mibis[0], s0 = st.s;
  m.bonded = true; assert.match(S.returnMibi(st, null, m, settings).why, /bonded/); m.bonded = false;
  m.born = st.turn; assert.equal(S.returnMibiBlock(st, null, m), "", "a young mibi may be returned"); m.born = st.turn - 2;
  const [room, slot, bay] = [m.room, m.slot, m.bay];
  const sv = { with: m.id }; const blocked = S.returnMibi(st, sv, m, settings); assert.deepEqual([blocked.ok, blocked.why, "msg" in blocked], [false, "already with you", false], "a blocked return is { ok: false, why }: no plate");
  const r = S.returnMibi(st, { with: null }, m, settings); assert.equal(r.ok, true); assert.equal(st.s, s0 + 2); assert.equal(m.released, true);
  assert.equal(S.housed(st).length, 7); assert.deepEqual(S.freePlace(st, settings), { room, slot }); assert.deepEqual([m.room, m.slot], [null, null]); assert.deepEqual(st.releases.at(-1).id, m.id); assert.equal(st.guideNotes.S01.length, 1);
  assert.equal(S.grow(st, st.tray[0], {}, settings, 5000).ok, true);
  assert.equal(S.openBud(st, { with: null }, settings, 5000 + 21 * 60000).mibi.bay, bay, "the freed place is taken");
});

// --- M4 Cross ---
test("Cross while away: a mibi out with the Companion cannot be crossed, as the shown mibi or as a partner; docked it crosses as any adult; an away partner is listed marked, not dropped", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const [a, b, c] = S.seedAdults(st, "S01", 31, 3, settings).mibis, sv = { carried: [b.id] };
  st.dock = { docked: false, at: 1 };
  assert.equal(S.crossBlock(st, sv, a, b, settings), "away", "the partner is out with the Companion");
  assert.equal(S.crossBlock(st, sv, b, a, settings), "away", "the shown mibi is out");
  assert.equal(S.crossBlock(st, sv, a, c, settings), "", "two at home cross while the Companion is away");
  assert.deepEqual(S.crossPartners(st, sv, a, settings).map((m) => [m.id, !!m.away]), [[b.id, true], [c.id, false]], "the away partner is marked and kept, in bay order");
  assert.equal(S.crossPartners(st, sv, a, settings)[1], c, "a partner at home is the mibi itself");
  st.dock = { docked: true, at: 2 };
  assert.equal(S.crossBlock(st, sv, a, b, settings), "away", "R4b, the owner: no breeding while carried, docked too");
  assert.deepEqual(S.crossPartners(st, sv, a, settings).map((m) => [m.id, !!m.away]), [[b.id, true], [c.id, false]], "docked, the carried partner is still marked");
  assert.equal(S.crossBlock(st, { carried: [] }, a, b, settings), "", "brought home, it crosses as any adult");
});
test("R4b roomSince: written at the hatch and at a move (a good clock only); noteCarried stamps a traveller that left the carried set, and writes carriedSeen", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const [a, b] = S.seedAdults(st, "S01", 31, 2, { ...settings, rooms: 2 }).mibis, sv = { carried: [a.id, b.id] };
  assert.deepEqual(S.noteCarried(st, sv, 5e12), [], "the first read: nobody came home"); assert.deepEqual(st.face.carriedSeen, [a.id, b.id]);
  sv.carried = [b.id]; assert.deepEqual(S.noteCarried(st, sv, 5e12 + 1), [a.id]); assert.equal(a.roomSince, 5e12 + 1, "roomSince = now"); assert.equal(b.roomSince, undefined); assert.deepEqual(st.face.carriedSeen, [b.id]);
  const c = { ...a, roomSince: undefined }; S.noteCarried(st, { carried: [] }, 5);   // a clock before 2026 writes nothing
  assert.equal(b.roomSince, undefined, "an unset clock writes nothing");
  const m = S.moveMibi(st, a, 1, { ...settings, rooms: 2 }, 7e12); assert.ok(m.ok); assert.equal(a.roomSince, 7e12, "a move writes roomSince"); assert.ok(c);
});

test("the cross: refusals before cost; a child of two founders with real parents, known only where switch parents match; the forecast's quarters and range", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const r = S.seedAdults(st, "S01", 31, 2, settings), [a, b] = r.mibis, fr = frameOf("S01");
  assert.equal(S.crossBlock(st, null, a, a, settings), "one mibi is not a pair");
  const young = { ...b, born: st.turn }; assert.equal(S.crossBlock(st, null, a, young, settings), "not adult");
  const tuikis = S.seedAdults(st, "S03", 5, 1, settings).mibis[0]; assert.equal(S.crossBlock(st, null, a, tuikis, settings), "another species");
  assert.deepEqual(S.crossPartners(st, null, a, settings).map((m) => m.id), [b.id]);
  assert.equal(S.kinshipOf(st, a, b), 0, "two founders are unrelated");
  const fc = S.forecastOf(st, a, b, settings);
  assert.equal(fc.kinship, 0); assert.equal(fc.traits.length, 6);   // the Loika at frame version 4 (T-20261016-200): six traits
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
  const sib = S.seedSiblings(st, "S01", 99, { ...settings, rooms: 2 }); assert.equal(sib.ok, true, sib.msg);
  assert.equal(S.kinshipOf(st, sib.mibis[0], sib.mibis[1]), 0.25, "full siblings");
  assert.equal(S.kinshipOf(st, sib.mibis[0], sib.parents[0]), 0.25);
  assert.equal(S.kinshipOf(st, sib.mibis[0], a), 0, "unrelated lines");
  assert.match(S.kinshipWord(0.25), /close kin/); assert.match(S.kinshipWord(0), /wild founders/);
});

test("kinship by id: two mibis with identical genomes are two mibis, unrelated as founders and full siblings by their recorded parents", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const big = { ...settings, rooms: 2 };
  const [a, b] = S.seedAdults(st, "S01", 41, 2, big).mibis;
  const twin = S.seedAdults(st, "S01", 42, 1, big).mibis[0];
  twin.genome = structuredClone(a.genome); twin.sha = a.sha; twin.code = a.code;   // the same genome, another mibi
  assert.equal(S.crossBlock(st, null, a, twin, settings), "", "the same genome is not the same mibi");
  assert.equal(S.kinshipOf(st, a, twin), 0, "two founders, unrelated whatever their genomes");
  assert.equal(S.kinshipOf(st, a, a), 0.5, "a mibi with itself");
  const sib = S.seedSiblings(st, "S01", 43, big); assert.equal(sib.ok, true, sib.msg);
  const [s1, s2] = sib.mibis; s2.genome = structuredClone(s1.genome);   // siblings that happen to be identical
  assert.equal(S.kinshipOf(st, s1, s2), 0.25, "full siblings by their parents' ids, not one mibi");
  assert.equal(S.kinshipOf(st, s1, sib.parents[0]), 0.25, "parent and child");
  assert.equal(S.kinshipOf(st, s1, a), 0, "unrelated lines");
  const look = S.genomeLookup(st); assert.equal(look(s1.id), s1); assert.equal(look(a.genome), null, "the lookup is by id, never by genome");
  // the forecast and the cross take the records: two founders with identical genomes are unrelated, and the child records their ids
  assert.equal(S.forecastOf(st, a, twin, settings).kinship, 0);
  st.e = 50; st.s = 50; st.bud = null;
  let seed = 3; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const c = S.doCross(st, null, a, twin, big, 1000, rng); assert.equal(c.ok, true, c.msg);
  assert.equal(st.bud.kinship, 0, "no inbreeding penalty between two mibis that only share a genome");
  assert.deepEqual(st.bud.genome.origin.parentIds, [a.id, twin.id]); assert.equal(st.bud.genome.origin.kinship, 0);
});

test("a starting mibi reads every open chapter, never a shut sealed one: its stamp has no sealed chapter until one is opened in play and read", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const fr = frameOf("S02"), sealed = fr.chapters.find((c) => c.sealed); assert.ok(sealed, "the Untuva seals a chapter");
  const m = S.seedAdults(st, "S02", 51, 1, { ...settings, rooms: 2 }).mibis[0];
  assert.deepEqual(m.read, fr.chapters.filter((c) => !c.sealed).map((c) => c.id), "every open chapter, the sealed one shut");
  const shut = decode(rasterize(stampGeometry(stampGenome(fr, m.genome, m.read)), 240)).stamps[0].genome;
  assert.ok(!shut.read.includes(sealed.name)); assert.ok(shut.unread.includes(sealed.name), "the stamp holds no shut sealed chapter");
  assert.equal(S.readMibi(st, m, sealed.id, settings).ok, false, "shut: it cannot be read");
  st.d = 50; const r = S.readMibi(st, m, sealed.id, { ...settings, sealedOpen: true }); assert.equal(r.ok, true, r.msg);
  const sg = stampGenome(fr, m.genome, m.read), opened = decode(rasterize(stampGeometry(sg), 240)).stamps[0].genome;
  assert.ok(opened.read.includes(sealed.name), "opened and read, it is stamped"); assert.equal(sameGenome(stampFrameOf(fr, m.genome), sg, opened), true);
  // the save's migration and a mibi made back from its seed follow the same rule
  const back = { id: 99, name: "Ivy", sp: 2, species: "S02", gs: 7, born: 0, bay: 3 }, st2 = S.freshSt("w2", 3, 1000); st2.mibis = [back]; S.normalize(st2);
  assert.ok(!back.read.includes(sealed.id));
});

test("a mibi keeps the frame version it was born with: v2- and v3-born genomes stamp S1v2 and S1v3 after the Loika moved to v4", () => {
  // the Loika at frame version 4 (T-20261016-200): a genome sampled now is born at v4; an older one keeps its own version on its stamp
  const fr = frameOf("S01") ?? frameOf(frameIds()[0]), born4 = podGenome(fr, 4242), born3 = { ...born4, frameVersion: 3 }, born2 = { ...born4, frameVersion: 2 };
  assert.equal(born4.frameVersion, 4, "a genome sampled now is born at the Loika's current frame version");
  assert.equal(stampFrameOf(fr, born2).version, 2); assert.equal(stampFrameOf(fr, born3).version, 3); assert.equal(stampFrameOf(fr, born4).version, 4);
  assert.equal(stampGenome(fr, born2, []).version, 2); assert.equal(stampGenome(fr, born3, []).version, 3); assert.equal(stampGenome(fr, born4, []).version, 4);
  assert.match(S.stampCodeOf({ species: fr.species.id, genome: born2, read: [] }) ?? "", /^S1v2-/);
  assert.match(S.stampCodeOf({ species: fr.species.id, genome: born3, read: [] }) ?? "", /^S1v3-/);
  assert.match(S.stampCodeOf({ species: fr.species.id, genome: born4, read: [] }) ?? "", /^S1v4-/);
  assert.equal(stampFrameOf(fr).version, 4, "with no genome the frame's own version stands");
});

test("p.first: written once per trait at read time, only when the look is new; an older save loads with none and shows no mark", () => {
  // an older save: a pod with no `first` field at all
  const old = fixture(); const stOld = S.freshSt("w1", 1, 1000); Object.assign(stOld, old.st ?? {}); delete stOld.schema;
  const pod = { id: "old-1", sp: 0, g: "meadow", how: "calm", gs: 4242, k: null, idd: 1, read: [] }; stOld.tray = [pod]; S.normalize(stOld);
  assert.deepEqual(stOld.tray[0].first, [], "the default is an empty list: no mark on an older pod");
  // a fresh world: the first read of a species shows new looks, so the traits are written once; the same read again changes nothing
  const st = S.freshSt("w9", 1, 1000); S.normalize(st); st.d = 50; st.e = 5;
  S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, 1000); const a = st.tray[0]; S.skipIdentify(st, a);
  const r = S.read(st, a, "coat", settings); assert.ok(r.ok && r.newLooks.length > 0, "the first pod of a species brings new looks");
  const firstTraits = [...a.first]; assert.ok(firstTraits.length > 0 && new Set(firstTraits).size === firstTraits.length, "one entry per trait");
  assert.ok(firstTraits.every((t) => frameOf("S01").chapters.find((c) => c.id === "coat").traits.some((x) => x.id === t)));
  S.read(st, a, "coat", settings); assert.deepEqual(a.first, firstTraits, "a read chapter read again writes nothing");
  // a second pod showing the same looks adds none for a trait whose looks the guide already holds
  S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, 1000); const b = st.tray[1]; S.skipIdentify(st, b); S.read(st, b, "coat", settings);
  assert.deepEqual(b.first, [], "the same genome brings nothing new: no mark");
});

test("compare: two pods whose loci differ but whose lines read the same carry no mark", () => {
  const fr = frameOf("S09"), ts = fr.chapters.flatMap((c) => c.traits), gs = Array.from({ length: 150 }, (_, i) => podGenome(fr, i + 1));
  let found = 0;
  for (const t of ts) for (let i = 0; i < gs.length && !found; i++) for (let j = i + 1; j < gs.length && !found; j++) {
    const a = gs[i], b = gs[j];
    if (t.loci.some((id) => JSON.stringify([...a.loci[id]].sort()) !== JSON.stringify([...b.loci[id]].sort())) && traitState(fr, t, a).line === traitState(fr, t, b).line) {
      found = 1; const mk = (g, id) => ({ id, sp: 1, species: "S09", idd: 1, genome: g, read: fr.chapters.map((c) => c.id) });
      assert.equal(S.compareDiff({}, mk(a, "x"), mk(b, "y")).includes(t.id), false, `${t.id}: same line, no mark`);
    }
  }
  assert.ok(found, "such a pair exists among 150 genomes");
});

test("nav fix: adults seeded by the developer make their species known, so the Library frame and Book open", () => {
  const st = S.freshSt("w1", 0, 1); S.normalize(st);
  assert.equal(st.knownIds.includes("S03"), false);
  S.seedAdults(st, "S03", 5, 2, settings);
  assert.deepEqual(st.knownIds, ["S03"]); assert.deepEqual(st.known, [speciesIndex("S03")]);
  const s2 = S.freshSt("w1", 0, 1); S.normalize(s2); S.seedSiblings(s2, "S01", 9, settings); assert.ok(s2.knownIds.includes("S01"));
});

test("nav fix: 'set out with the Companion' clears once a seeded world has a crate, a pod or a mibi", () => {
  const sv = { v: 8 };   // no world: the Companion page was never opened
  const fresh = () => { const st = S.freshSt("w1", 0, 1); S.normalize(st); return st; };
  assert.equal(S.need(fresh(), sv, settings).text, "Set out with the Companion");
  const a = fresh(); S.seedCrate(a, "S01", 1, 3, 1); assert.notEqual(S.need(a, sv, settings).text, "Set out with the Companion");
  const b = fresh(); S.seedAdults(b, "S01", 3, 1, settings); assert.notEqual(S.need(b, sv, settings).text, "Set out with the Companion");
});

test("nav fix: every screen the Station names has a mark in the title bar", () => {
  const frame = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/frame.json"), "utf8")), ids = Object.keys(frame.strings.titles);
  assert.ok(ids.includes("bench"));
  for (const id of ids) assert.ok(frame.regions.title.marks[id], "a title mark for the screen " + id);
});

test("nav fix: the developer panel blurs a button once it has acted", () => {
  assert.match(readFileSync(path.join(here, "../src/dev.mjs"), "utf8"), /addEventListener\("click"[^\n]*\.blur\(\)/);
});

test("Hatch now costs 1 Essence per 2 minutes left on the bud, rounded up, and nothing else; the price falls as the bud grows; ready buds and the free preset cost nothing", () => {
  const st = S.freshSt("w1", 0, 1000); S.normalize(st); const at = (min, minutes, extra = {}) => { st.bud = { start: 0, minutes, early: false }; return S.instantGrowCost(st, { ...settings, ...extra }, min * 60000); };
  assert.deepEqual(at(0, 5), { e: 0, d: 0, s: 3 }, "the first bud ever, 5 minutes: 3"); assert.deepEqual(at(0, 20), { e: 0, d: 0, s: 10 }, "a full 20-minute bud: 10"); assert.deepEqual(at(0, 21), { e: 0, d: 0, s: 11 }, "a shaped bud: 11");
  assert.equal(at(19.5, 20).s, 1, "a bud nearly done: 1"); assert.equal(at(1, 20).s, 10); assert.equal(at(2, 20).s, 9); assert.equal(at(3, 20).s, 9, "17 minutes left rounds up to 9");
  assert.deepEqual(at(20, 20), { e: 0, d: 0, s: 0 }, "a ready bud: nothing to pay"); assert.equal(at(0, 20, { instantGrowPreset: "free" }).s, 0, "the developer's free preset");
  assert.equal(at(0, 20, { economy: "free" }).s, 0, "the free economy");
  st.bud = null; assert.deepEqual(S.instantGrowCost(st, settings, 0), { e: 0, d: 0, s: 0 });
  // the rule pays it: refused when the Essence is short, taken when it is not
  st.bud = { start: 0, minutes: 20, early: false, species: "S01" }; st.e = 5; st.d = 5; st.s = 9; const no = S.instantGrow(st, settings, 0); assert.equal(no.ok, false); assert.match(no.msg, /^Hatch now · /); assert.equal(st.s, 9); assert.notEqual(st.bud, null, "a refused press hatches nothing");
});

// ---- the care save shape: the carried set, the dock merge, the stage, the migration step (Station side) ----
const careFixture = () => JSON.parse(readFileSync(path.join(here, "fixtures/save-v8-care-before.json"), "utf8"));
const adults = (n, seed = 5) => { const st = S.freshSt("w1", 4, 1000); S.normalize(st); S.seedAdults(st, "S01", seed, n, settings); st.turn = 4; return st; };
const svOf = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 4, bay: [], mibis: [], trips: [], carried: [], carrySeen: 0, carryRefused: [], tier: 1, shield: 3, ...over });

test("T2 the care fixture (Station half): the swap request becomes an add, the legacy bonds are back-filled, stages follow, and the migration is idempotent", () => {
  const raw = careFixture(), once = S.normalize(S.migrate(raw.st, 777, raw)), twice = S.normalize(S.migrate(structuredClone(once), 778, raw));
  assert.equal(once.schema, S.ST_SCHEMA); assert.deepEqual(once.carryReqs, [{ seq: 1, op: "add", id: 3 }]); assert.equal(once.carrySeq, 1); assert.equal("withReq" in once, false);
  const [dot, moss, fig] = once.mibis;
  assert.deepEqual([dot.bondCare, dot.grownTurn], [0, 2], "an old bonded adult stays adult: elder at born + 18"); assert.deepEqual([moss.bondCare, moss.grownTurn], [0, null], "an old bonded juvenile waits for care"); assert.equal(fig.grownTurn, null); assert.equal(fig.bonded, false); assert.equal(fig.bondCare, undefined);
  assert.deepEqual(twice, once, "run twice: the same JSON");
  assert.deepEqual(S.carriedIds(once, raw), [1], "no `carried` yet: the old `with` is read"); assert.deepEqual(S.carriedIds(once, { ...raw, carried: [1], with: undefined }), [1]);
  const stages = (m) => Array.from({ length: 11 }, (_, i) => S.mibiStage({ ...once, turn: 4 + i }, m));
  assert.deepEqual(stages(dot), Array.from({ length: 11 }, () => "adult"), "Dot: adult through turn 14, elder at 18"); assert.equal(S.mibiStage({ ...once, turn: 17 }, dot), "adult"); assert.equal(S.mibiStage({ ...once, turn: 18 }, dot), "elder");
  assert.ok(stages(moss).every((x) => x === "juvenile"), "Moss: a bonded juvenile waits for care, through turn 14"); assert.deepEqual(stages(fig), Array.from({ length: 11 }, () => "adult")); assert.equal(S.mibiStage({ ...once, turn: 18 }, fig), "adult"); assert.equal(S.mibiStage({ ...once, turn: 19 }, fig), "elder", "born 1: elder at 19");
});
test("the care step keeps an unapplied request as an add and drops an applied one; a mibi the Companion already carries is not asked for twice", () => {
  const raw = careFixture(); raw.st.withReq = { id: 3, seq: 2 }; raw.withSeen = 2; assert.deepEqual(S.migrate(structuredClone(raw.st), 1, raw).carryReqs, [], "applied");
  raw.withSeen = 1; raw.st.withReq = { id: 1, seq: 2 }; assert.deepEqual(S.migrate(structuredClone(raw.st), 1, raw).carryReqs, [], "already carried");
  raw.st.withReq = null; const st = S.migrate(structuredClone(raw.st), 1, raw); assert.deepEqual([st.carryReqs, st.carrySeq], [[], 0]);
});
test("T3 the carried set (Station half): adds queue against the projection, a fourth is refused as full, home needs a carried mibi, and nothing changes until the Companion applies", () => {
  const st = adults(4), [a, b, c, d] = st.mibis, sv = svOf({ carried: [a.id] });
  assert.equal(S.CARRY_MAX, 3);
  assert.deepEqual(S.carryAdd(st, sv, b), { ok: true }); assert.deepEqual(S.carryAdd(st, sv, c), { ok: true });
  assert.deepEqual(S.carryAdd(st, sv, d), { ok: false, why: "full" }, "the projection holds three"); assert.deepEqual(S.carryAdd(st, sv, b), { ok: false, why: "carried" }); assert.deepEqual(S.carryAdd(st, sv, null), { ok: false, why: "unknown" });
  assert.deepEqual(st.carryReqs.map((r) => [r.seq, r.op, r.id]), [[1, "add", b.id], [2, "add", c.id]]); assert.equal(st.carrySeq, 2);
  assert.deepEqual(S.carriedIds(st, sv), [a.id], "queued away: nothing is carried yet"); assert.deepEqual(S.pendingCarry(st, sv).map((r) => r.id), [b.id, c.id]); assert.deepEqual(S.projectCarried(st, sv), [a.id, b.id, c.id]);
  assert.deepEqual(S.carryHome(st, sv, a), { ok: true }); assert.deepEqual(S.projectCarried(st, sv), [b.id, c.id]); assert.deepEqual(S.carryAdd(st, sv, d), { ok: true }, "bringing one home made room");
  assert.deepEqual(S.carryHome(st, sv, { id: 99 }), { ok: false, why: "unknown" }); st.mibis.push({ ...a, id: 50, released: true }); assert.deepEqual(S.carryAdd(st, sv, st.mibis.at(-1)), { ok: false, why: "released" });
  assert.deepEqual(S.homeMibis(st, sv).map((m) => m.id), [b.id, c.id, d.id], "home is everyone the Companion does not carry (a pending add is still at home)");
  const applied = { ...sv, carried: [a.id, b.id], carrySeen: 2 }; assert.deepEqual(S.pendingCarry(st, applied).map((r) => r.seq), [3, 4]); S.trimCarryReqs(st, applied); assert.deepEqual(st.carryReqs.map((r) => r.seq), [3, 4], "applied ops are trimmed on save");
  assert.equal(S.carryAdd(st, applied, S.mibiById(st, b.id)).why, "carried"); const seq = st.carrySeq; S.carryHome(st, applied, S.mibiById(st, b.id)); assert.equal(st.carrySeq, seq + 1, "a seq is never reused");
  assert.deepEqual(S.carriedIds(st, { carried: [a.id, 77] }), [a.id], "ids that are not Station mibis are dropped"); assert.deepEqual(S.carriedIds(st, null), []);
});
test("T4 the dock merge: max and OR only, idempotent through a lift, a redock and a reload; the Station never sets bonded", () => {
  const st = adults(2), [a, b] = st.mibis, sv = svOf({ mibis: [{ id: a.id, care: 3, tends: 2, bonded: true, bondCare: 1, grownTurn: 5, outings: 2, notches: 1 }, { id: b.id, care: 0, tends: 0, bonded: false }] });
  b.bonded = true; b.care = 4;
  const home = S.mergeCare(st, sv); assert.deepEqual(home, [a.id]);
  assert.deepEqual([a.care, a.tends, a.bonded, a.bondCare, a.grownTurn, a.outings, a.notches], [3, 2, true, 1, 5, 2, 1]); assert.deepEqual([b.care, b.bonded], [4, true], "sv false, st true: stays true; care keeps the higher");
  const snap = JSON.stringify(st); S.mergeCare(st, sv); assert.equal(JSON.stringify(st), snap, "twice: identical");
  S.dockKey(st, sv, settings, 2000); S.dockKey(st, sv, settings, 2001); const after = JSON.parse(JSON.stringify(st)); S.mergeCare(after, sv); S.normalize(after);
  assert.deepEqual([after.mibis[0].care, after.mibis[0].bondCare, after.mibis[0].grownTurn, after.mibis[1].bonded], [3, 1, 5, true], "a lift, a redock and a reload change nothing");
  const lower = svOf({ mibis: [{ id: a.id, care: 1, bondCare: 0, grownTurn: 3, bonded: false }] }); S.mergeCare(st, lower); assert.deepEqual([a.care, a.bondCare, a.grownTurn, a.bonded], [3, 1, 5, true], "lower values never lower a mirror (max), and false never clears true (OR)");
  const c = adults(1).mibis[0]; assert.equal(c.bonded, false); const cs = adults(1); S.mergeCare(cs, svOf({ mibis: [{ id: cs.mibis[0].id, care: 2, bonded: false }] })); assert.equal(cs.mibis[0].bonded, false, "the Station never sets bonded");
  const g = adults(1); g.mibis[0].grownTurn = 4; S.mergeCare(g, svOf({ mibis: [{ id: g.mibis[0].id, grownTurn: 4 }] })); assert.equal(g.mibis[0].grownTurn, 4);
});
test("T5 trips: a record without `carried` reads as its partner; with it, every carried mibi enters the places, once", () => {
  assert.deepEqual(S.tripCarried({ v: 1, partner: 7, places: [] }), [7]); assert.deepEqual(S.tripCarried({ v: 1, partner: null, places: [] }), []); assert.deepEqual(S.tripCarried({ v: 1, partner: 7, carried: [7, 8, 9] }), [7, 8, 9]); assert.deepEqual(S.tripCarried({ v: 1, partner: 7, carried: [] }), []);
  const st = adults(3), [a, b, c] = st.mibis, sv = svOf({ trips: [{ v: 1, n: 1, partner: a.id, places: ["wood"], carried: [a.id, b.id] }, { v: 1, n: 2, partner: c.id, places: ["rock"] }] });
  S.mergeCare(st, sv); S.mergeCare(st, sv); assert.deepEqual([a.walked, b.walked, c.walked], [["wood"], ["wood"], ["rock"]], "a set insert, whole list every time");
});
test("T7 the refusal plate: the newest unseen 'full' refusal of a Station mibi shows once; other reasons show nothing; a seen refusal stays seen", () => {
  const st = adults(3), [a, b, c] = st.mibis, sv = svOf({ carryRefused: [{ seq: 4, id: b.id, why: "full" }, { seq: 5, id: c.id, why: "released" }] });
  assert.deepEqual(S.carryRefusal(st, sv), { seq: 4, id: b.id, name: b.name }, "a full then a released: the full one still shows");
  assert.deepEqual(S.seenCarryRefusal(st, sv), { seq: 4, id: b.id, name: b.name }); assert.equal(st.carryRefusedSeen, 4); assert.equal(S.carryRefusal(st, sv), null, "once");
  const again = JSON.parse(JSON.stringify(st)); S.normalize(again); S.dockKey(again, sv, settings, 2000); S.dockKey(again, sv, settings, 2001); assert.equal(S.carryRefusal(again, sv), null, "after a lift, a redock and a reload");
  assert.equal(S.carryRefusal(adults(1), svOf({ carryRefused: [{ seq: 1, id: 1, why: "carried" }, { seq: 2, id: 1, why: "unknown" }] })), null, "non-full alone shows nothing");
  assert.equal(S.carryRefusal(st, svOf({ carryRefused: [{ seq: 9, id: 404, why: "full" }] })), null, "a refusal of a mibi that is not a Station mibi");
  const s2 = adults(2), svb = svOf({ carryRefused: [{ seq: 1, id: s2.mibis[0].id, why: "full" }, { seq: 2, id: s2.mibis[1].id, why: "full" }] }); assert.equal(S.carryRefusal(s2, svb).id, s2.mibis[1].id, "the newest full"); S.seenCarryRefusal(s2, svb); assert.equal(S.carryRefusal(s2, svb), null, "every refusal up to it is seen");
});
test("T6 stageAt (Station): care grows a bonded mibi; the clock grows an unbonded one; adultTurns moves the clock path only", () => {
  const E = S.ELDER_TURNS, J = S.JUVENILE_TURNS;
  for (const [j, bondedAt] of [[2, 5], [1, 5], [0, 5]]) { const m = { born: 0, bonded: true, grownTurn: 2 }; assert.equal(S.stageAt(m, 17, j, E), "adult"); assert.equal(S.stageAt(m, 18, j, E), "elder", "bonded at turn 5 → grownTurn 2, elder at 18, whatever adultTurns is"); void bondedAt; }
  assert.equal(S.stageAt({ born: 0, bonded: true, grownTurn: null }, 14, J, E), "juvenile", "a juvenile bonded at turn 1 waits for care");
  assert.deepEqual([0, 1, 2, 17, 18].map((t) => S.stageAt({ born: 0, bonded: false, grownTurn: null }, t, J, E)), ["juvenile", "juvenile", "adult", "adult", "elder"]);
  assert.equal(S.stageAt({ born: 0, grownTurn: null, bonded: false }, 2, 3, E), "juvenile"); assert.equal(S.stageAt({ born: 0, grownTurn: null, bonded: false }, 3, 3, E), "adult"); assert.equal(S.stageAt({ born: 0, grownTurn: null, bonded: false }, 19, 3, E), "elder", "elder follows adultTurns on the clock path");
  const st = adults(1); st.turn = 19; st.mibis[0].born = 0; assert.equal(S.mibiStage(st, st.mibis[0], { ...settings, adultTurns: 3 }), "elder"); assert.equal(S.mibiStage(st, st.mibis[0]), "elder");
});
test("the Station's own care rules: a carried, pending or bonded mibi is not returned; carried mibis are not watched or compared; there is no bond line in need()", () => {
  const st = adults(4), [a, b, c, d] = st.mibis, sv = svOf({ carried: [a.id] }); st.carryReqs = [{ seq: 1, op: "add", id: b.id }]; st.carrySeq = 1; c.bonded = true; c.grownTurn = 2;
  assert.equal(S.returnMibiBlock(st, sv, a), "already with you"); assert.equal(S.returnMibiBlock(st, sv, b), "goes at the next dock"); assert.match(S.returnMibiBlock(st, sv, c), /bonded/); assert.equal(S.returnMibiBlock(st, sv, d), "", "an unbonded adult at home may be returned");
  assert.equal(S.benchWatch(st, sv, a, 250, settings, 1000).ok, false, "a carried mibi is not watched"); assert.equal(S.benchWatch(st, sv, d, 250, settings, 1000).ok, true);
  assert.equal(S.benchCompare(st, sv, a, d, settings, 1000).ok, false, "nor compared");
  a.outings = 3; assert.ok(!/bond/i.test(S.need(st, sv, settings).text), "an offered bond is not a need"); assert.equal("bond" in S, false); assert.equal("bondOffered" in S, false); for (const k of ["withId", "effWithId", "atHome", "pendingWith", "takeWith"]) assert.equal(k in S, false, k + " is gone");
});
test("the migration of an older write defaults the care fields and back-fills a legacy bond once", () => {
  const st = adults(2); const [a, b] = st.mibis; a.bonded = true; a.outings = 3; delete a.care; b.bonded = true; b.born = 3; st.turn = 4; delete st.carryReqs; delete st.carrySeq;
  S.normalize(st); assert.deepEqual([a.care, a.tends, a.bondCare, a.grownTurn], [0, 0, 0, a.born + S.JUVENILE_TURNS]); assert.deepEqual([b.bondCare, b.grownTurn], [0, null]); assert.deepEqual([st.carryReqs, st.carrySeq, st.carryRefusedSeen], [[], 0, 0]);
  const snap = JSON.stringify(st); S.normalize(st); assert.equal(snap, JSON.stringify(st), "idempotent");
});

test("growBlockKey names what stops Grow in the rules' order (unidentified, busy, full, clash, short) with the icons a short price lacks; growBlock's words are unchanged; shortIcons lists ⚡ ◆ ❀ as shortText does", () => {
  const st = S.freshSt("w1", 1, 1000); S.normalize(st); st.firstMibi = false; S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, 1000); const p = st.tray[0];
  assert.deepEqual(S.growBlockKey(st, p, {}, settings), { key: "unidentified", short: null }); assert.equal(S.growBlock(st, p, {}, settings), "identify it first");
  S.skipIdentify(st, p); st.e = 99; st.d = 99; st.s = 99; assert.equal(S.growBlockKey(st, p, {}, settings), null); assert.equal(S.growBlock(st, p, {}, settings), "");
  st.e = 0; st.s = 0; assert.deepEqual(S.growBlockKey(st, p, {}, settings), { key: "short", short: "⚡ ❀", from: "field" }); assert.equal(S.growBlock(st, p, {}, settings), S.shortText(st, 2, 0, 4));
  const free = { ...settings, economy: "free" }; assert.equal(S.growBlockKey(st, p, {}, free), null, "a free economy is short of nothing");
  st.bud = { kind: "founder" }; assert.deepEqual(S.growBlockKey(st, p, {}, settings), { key: "busy", short: null }, "busy before short"); assert.equal(S.growBlock(st, p, {}, settings), "the incubator is busy"); st.bud = null;
  for (let i = 0; i < 8; i++) st.mibis.push({ id: 100 + i, room: 0, slot: i, bay: i, released: false }); assert.deepEqual(S.growBlockKey(st, p, {}, settings), { key: "full", short: null }); assert.equal(S.growBlock(st, p, {}, settings), "the Vivarium is full"); st.mibis = [];
  assert.deepEqual(S.growBlockKey(st, p, {}, settings, ["crown"]), { key: "clash", short: null }); assert.match(S.growBlock(st, p, {}, settings, ["crown"]), /^this shape won't grow · /);
  st.e = 1; st.d = 0; st.s = 9; assert.equal(S.shortIcons(st, 2, 1, 4), "⚡ ◆"); assert.equal(S.shortIcons(st, 1, 0, 9), ""); assert.equal(S.shortIcons(st, 0, 0, 10), "❀");
});

test("the Station keeps an unknown top-level Companion field (gen) through load, save and storageChanged", async () => {
  const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
  const game = await import("../src/game.mjs"), stored = () => JSON.parse(mem.get(S.SAVE_KEY));
  mem.set(S.SAVE_KEY, JSON.stringify({ ...fixture(), gen: 2 }));
  game.load(); game.save(); assert.equal(stored().gen, 2, "load then save keeps gen");
  mem.set(S.SAVE_KEY, JSON.stringify({ ...stored(), gen: 3 }));
  game.storageChanged(); game.save(); assert.equal(stored().gen, 3, "storageChanged then save keeps the Companion's newer gen");
  const before = JSON.stringify({ ...stored(), st: undefined }); game.save(); assert.equal(JSON.stringify({ ...stored(), st: undefined }), before, "a save changes nothing of the Companion's part");
});

test("naming: what stops a name (short, full, marks, a species, a clan, a holder), the pool's next names peeked and nothing consumed, a rename that follows its references, Keep that writes nothing", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 21)])]);
  const [a, b] = S.seedAdults(st, "S01", 31, 2, settings).mibis; S.normalize(st);
  const why = (t, atDone = true) => S.nameProblem(st, a, t, atDone)?.key ?? null;
  assert.equal(why("A"), "short"); assert.equal(why("A-"), "short", "a mark is not a letter"); assert.equal(why("Abcdefghijk"), "full"); assert.equal(why("-Abc"), "first"); assert.equal(why("Ab--c"), "twice"); assert.equal(why("Ab c-"), "last"); assert.equal(why("Ab c-", false), null, "a mark last is refused at Done only");
  assert.equal(why("Loika"), "species"); assert.equal(why("loika"), "species", "by the name's key"); assert.equal(why("Lophessa"), "clan");
  assert.deepEqual(S.nameProblem(st, a, b.name), { key: "taken", holder: b.name }); assert.equal(S.nameProblem(st, b, b.name), null, "its own name is not held by another");
  const used = [...st.namesUsed], next = S.peekNames(st, a, 12);
  assert.equal(next.length, 12); assert.ok(next.every((n) => !S.nameProblem(st, a, n) && ![...used].includes(S.nameKey(n))), "each could be given"); assert.deepEqual(st.namesUsed, used, "nothing is consumed"); assert.deepEqual(S.peekNames(st, a, 12), next, "the same twelve each time");
  assert.deepEqual(S.renameMibi(st, a, a.name), { ok: true, kept: true, name: a.name }); assert.ok(!st.log.some((l) => /Renamed/.test(l.text ?? l)), "Keep logs nothing");
  assert.equal(S.renameMibi(st, a, "Loika").ok, false); assert.equal(a.name === "Loika", false);
  b.from = { ...b.from, of: [a.name, "Zed"] }; b.parents = [{ id: a.id, name: a.name }]; const old = a.name, r = S.renameMibi(st, a, "Mo-Mo");
  assert.deepEqual([r.ok, r.kept, r.name, r.old], [true, false, "Mo-Mo", old]); assert.equal(a.name, "Mo-Mo"); assert.deepEqual(b.from.of, ["Mo-Mo", "Zed"], "the origin follows"); assert.equal(b.parents[0].name, "Mo-Mo", "the parents follow"); assert.ok(st.namesUsed.includes("momo"));
  assert.equal(S.renameMibi(st, a, "MO-MO").ok, true, "a change of case only is a rename"); assert.equal(a.name, "MO-MO");
});

test("the bench's switch: setMendFull sets whether the dock mends every plate and logs it; DOCK_MEND_FLOOR is the plates the dock leaves whole free; nothing else sets it", () => {
  assert.equal(S.DOCK_MEND_FLOOR, 2);
  const { sv, st } = world([]); S.normalize(st); st.e = 50;
  S.setMendFull(st, false); assert.equal(st.mendFull, false); assert.match(st.log.at(-1), /two plates, free/);
  S.setMendFull(st, true); assert.equal(st.mendFull, true); assert.match(st.log.at(-1), /every plate/);
  // docked with the switch off: the dock leaves the Probe at the floor, free (a broken Probe is mended whole); on: every plate at the price
  const lift = () => { st.dock = { docked: false, at: 1 }; };
  sv.shield = 0; st.probe = null; S.setMendFull(st, false); lift(); const e0 = st.e; S.dockKey(st, sv, settings, 10); assert.equal(st.probe.shield, 3, "a broken Probe is whole again, free");
  assert.equal(st.e, e0, "free");
  lift(); st.probe.shield = 1; S.dockKey(st, sv, settings, 11); assert.equal(st.probe.shield, S.DOCK_MEND_FLOOR, "switch off: brought to the floor, nothing paid for more"); assert.equal(st.e, e0);
  S.setMendFull(st, true); lift(); st.probe.shield = 1; S.dockKey(st, sv, settings, 12); assert.equal(st.probe.shield, 3, "switch on: every plate at its price"); assert.equal(st.e, e0 - 1);
});

test("a species beyond the Companion's three: each mibi carries its species name in the save (normalize, idempotent)", () => {
  const { st } = world([]); S.normalize(st);
  S.seedAdults(st, "S05", 3, 2, settings); S.seedAdults(st, "S10", 4, 2, settings);
  S.normalize(st);
  assert.equal(st.mibis.length, 4);
  for (const m of st.mibis) { assert.equal(m.sp, -1); assert.equal(m.spName, frameOf(m.species).species.name); }
  assert.deepEqual(st.mibis.map((m) => m.spName), ["Tepor", "Tepor", "Igara", "Igara"]);
  const once = JSON.stringify(st); S.normalize(st); assert.equal(JSON.stringify(st), once, "a second normalize changes nothing");
});

test("a returned pod of a species beyond three keeps its species and opens from a Companion crate", () => {
  const { sv, st } = world([]); S.normalize(st);
  S.seedCrate(st, "S05", 1, 9, 1000); S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000);
  const p = st.tray[0]; assert.equal(p.species, "S05"); assert.equal(p.sp, -1);
  S.returnPod(st, p, settings, 1000);
  const r = st.returned.at(-1); assert.equal(r.species, "S05");
  // the Companion's record of it, as index.html seeds, takes and crates it (with species carried, §3)
  const q = { id: "r1", sp: r.sp, ...(r.species ? { species: r.species } : {}), g: r.g, how: "ground", gs: 12345, k: "12" };
  sv.bay.push(crate(5, [q]));
  S.dockKey(st, sv, settings, 2000); S.dockKey(st, sv, settings, 2000);
  const o = S.openBay(st, sv, settings, 2000);
  assert.deepEqual(o.plays[0].ids, ["x5:r1"]); assert.equal(st.tray.find((t) => t.id === "x5:r1")?.species, "S05");
});

test("an older save: returned entries gain their species from sp (none for -1); a crate pod of no species is not lost silently", () => {
  const { sv, st } = world([crate(6, [{ id: "r9", sp: -1, g: "cave", how: "ground", gs: 7, k: "3" }, loikaPod(1, 11)])]);
  st.returned = [{ id: "a", sp: 2, g: "pond", k: "31" }, { id: "b", sp: -1, g: "cave", k: "4" }];
  S.normalize(st);
  assert.deepEqual(st.returned.map((r) => r.species), ["S02", null]);
  const once = JSON.stringify(st.returned); S.normalize(st); assert.equal(JSON.stringify(st.returned), once);
  S.dockKey(st, sv, settings, 1000); const o = S.openBay(st, sv, settings, 1000);
  assert.deepEqual(o.plays[0].ids, ["x6:p1"]); assert.deepEqual(o.plays[0].skipped, ["r9"]);
  assert.match(st.log.at(-1), /1 pod ·/); assert.match(st.log.at(-1), /r9/);
});

test("a returned pod is the same individual: from a Companion crate it lands with the genome it left with, as a new find", () => {
  const { sv, st } = world([]); S.normalize(st);
  S.seedCrate(st, "S05", 1, 9, 1000); S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000);
  const p = st.tray[0], genome = structuredClone(p.genome);
  S.returnPod(st, p, settings, 1000);
  const r = st.returned.at(-1); assert.equal(r.gs, p.gs >>> 0);
  const q = { id: "r1", sp: r.sp, ...(r.species ? { species: r.species } : {}), g: r.g, how: "ground", gs: r.gs, k: "12" };
  sv.bay.push(crate(5, [q]));
  S.dockKey(st, sv, settings, 2000); S.dockKey(st, sv, settings, 2000);
  S.openBay(st, sv, settings, 2000);
  const back = st.tray.find((t) => t.id === "x5:r1");
  assert.deepEqual(back.genome, genome); assert.equal(back.idd, 0); assert.deepEqual(back.read, []);
});

test("Grow and Cross leave the outbox empty (the Caddy is called only for the sitting), and normalize drops an old Grow entry and keeps a sitting's", () => {
  const { st } = readPod([crate(1, [loikaPod(1, 11), loikaPod(2, 12)])]);
  assert.equal(S.grow(st, st.tray[0], {}, settings, 1000).ok, true); assert.deepEqual(st.outbox, [], "Grow");
  const x = readPod([crate(1, [loikaPod(1, 21)])]).st, [a, b] = S.seedAdults(x, "S01", 31, 2, settings).mibis;
  let seed = 7; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  assert.equal(S.doCross(x, null, a, b, settings, 1000, rng).ok, true); assert.deepEqual(x.outbox, [], "Cross");
  x.outbox = [{ sha: "old", species: "S01", genome: {}, at: 1 }, { sitting: true, sha: "portrait" }]; S.normalize(x);
  assert.deepEqual(x.outbox, [{ sitting: true, sha: "portrait" }], "an old Grow entry never goes; a sitting's stays");
});

// --- the rooms ---
const roomsWorld = (n, over = {}) => { const st = S.freshSt("w1", 4, 1000); S.normalize(st); st.firstMibi = false; S.seedAdults(st, "S01", 5, n, { ...settings, rooms: 4, ...over }); st.turn = 4; return st; };
test("rooms: a new world has one room and eight places; the ninth mibi has none; vivFull with eight in one room is true", () => {
  const st = S.freshSt("w1", 4, 1000); S.normalize(st);
  assert.deepEqual([S.ROOM, S.ROOMS_MAX, st.rooms, S.roomCount(st, settings), st.face.room], [8, 4, 1, 1, 0]);
  assert.deepEqual(S.freePlace(st, settings), { room: 0, slot: 0 }); assert.equal(S.vivFull(st, settings), false);
  S.seedAdults(st, "S01", 5, 8, settings); assert.equal(S.housed(st).length, 8); assert.equal(S.vivFull(st, settings), true); assert.equal(S.freePlace(st, settings), null);
  assert.deepEqual(S.housed(st).map((m) => [m.room, m.slot, m.bay]), Array.from({ length: 8 }, (_, i) => [0, i, i]));
  assert.equal(S.seedAdults(st, "S01", 6, 1, settings).ok, false); assert.deepEqual(S.ROOM_NAMES, ["Roots", "Reeds", "Boulders", "Ferns"]);
  assert.equal(S.roomCount(st, { ...settings, rooms: 9 }), 4); assert.equal(S.roomCount(st, { ...settings, rooms: 3 }), 3, "the developer's rooms win"); assert.equal(S.vivFull(st, { ...settings, rooms: 2 }), false);
});
test("rooms: addRoom spends 4, 8, 12 Energy under a tuned economy, refuses at four rooms (all) and when short (short)", () => {
  const st = S.freshSt("w1", 4, 1000); S.normalize(st); const tuned = { ...settings, economy: "tuned" };
  st.e = 3; assert.deepEqual(S.addRoomBlock(st, tuned), { key: "short", short: ["e"] }); assert.deepEqual(S.addRoom(st, tuned), { ok: false, key: "short", short: ["e"] }); assert.deepEqual([st.e, st.rooms], [3, 1]);
  st.e = 100; const spent = [];
  for (const want of [4, 8, 12]) { assert.equal(S.addRoomBlock(st, tuned), null); assert.equal(S.roomPrice(st, tuned), want); const e0 = st.e, r = S.addRoom(st, tuned); spent.push(e0 - st.e); assert.deepEqual(r, { ok: true, room: st.rooms - 1 }); }
  assert.deepEqual(spent, [4, 8, 12]); assert.equal(st.rooms, 4); assert.equal(S.roomPrice(st, tuned), null);
  assert.deepEqual(S.addRoomBlock(st, tuned), { key: "all" }); assert.deepEqual(S.addRoom(st, tuned), { ok: false, key: "all" }); assert.equal(st.e, 76);
  assert.match(st.log.at(-1), /^T5 · Added the Ferns room · ⚡ −12$/); assert.equal(S.addRoomBlock({ ...st, rooms: 1, e: 0 }, { ...tuned, economy: "free" }), null, "a free economy asks nothing");
});
test("rooms: moveBlock gives own, full, noRoom, released; moveMibi is free and instant, takes the lowest free slot, and keeps a carried mibi's place", () => {
  const st = roomsWorld(9, { rooms: 2 }); st.rooms = 2; const two = { ...settings, rooms: 2 }, [a] = st.mibis, last = st.mibis[8];
  assert.deepEqual([last.room, last.slot], [1, 0]);
  assert.deepEqual(S.moveBlock(st, a, 0, two), { key: "own" }); assert.deepEqual(S.moveBlock(st, a, 2, two), { key: "noRoom" }); assert.deepEqual(S.moveBlock(st, a, -1, two), { key: "noRoom" });
  assert.equal(S.moveBlock(st, a, 1, two), null); assert.deepEqual(S.moveBlock(st, last, 0, two), { key: "full" });
  const e0 = st.e, s0 = st.s, r = S.moveMibi(st, a, 1, two); assert.deepEqual(r, { ok: true, room: 1, slot: 1 }); assert.deepEqual([a.room, a.slot, a.bay], [1, 1, 9]); assert.deepEqual([st.e, st.s], [e0, s0]);
  assert.equal(st.log.at(-1), `T5 · ${a.name} moves to the Reeds room`); assert.deepEqual(S.freePlace(st, two), { room: 0, slot: 0 }, "the place it left is free");
  assert.deepEqual(S.inRoom(st, 1).map((m) => m.slot), [0, 1]); assert.deepEqual(S.moveMibi(st, a, 1, two), { ok: false, key: "own" });
  const b = st.mibis[1]; b.bonded = true; b.outings = 3; const sv = svOf({ carried: [b.id] }); assert.equal(S.moveMibi(st, b, 1, two).ok, true); assert.deepEqual(S.carriedIds(st, sv), [b.id], "still with the Companion"); assert.equal(S.moveBlock(st, b, 0, two) === null, true, "and may come back");
  last.released = true; assert.deepEqual(S.moveBlock(st, last, 0, two), { key: "released" });
});
test("rooms: a hatch fills the shown room first, then the first room with a place; the log ends with the room", () => {
  const st = roomsWorld(3, { rooms: 2 }); const two = { ...settings, rooms: 2 };
  st.face.room = 1; S.seedAdults(st, "S01", 21, 1, two); assert.deepEqual([st.mibis[3].room, st.mibis[3].slot, st.mibis[3].bay], [1, 0, 8], "the shown room first");
  const bud = (n) => { const p = { ...st.tray[0] }; void p; st.e = 50; st.s = 50; st.d = 50; st.bud = { kind: "founder", species: "S01", sp: 0, gs: 60 + n, genome: podGenome(frameOf("S01"), 60 + n), sha: genomeSha(podGenome(frameOf("S01"), 60 + n)), code: "X", start: 0, minutes: 5, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: true }; };
  bud(1); const o = S.openBud(st, { with: null }, two, 10 * 60000); assert.equal(o.ok, true); assert.deepEqual([o.mibi.room, o.mibi.slot], [1, 1]); assert.match(st.log.at(-1), /^T5 · Opened · \S+ · Loika · juvenile · the Reeds room$/);
  for (let i = 0; i < 6; i++) { bud(2 + i); S.openBud(st, { with: null }, two, 10 * 60000); } assert.equal(S.inRoom(st, 1).length, 8);
  st.face.room = 1; bud(9); const full = S.openBud(st, { with: null }, two, 10 * 60000); assert.deepEqual([full.mibi.room, full.mibi.slot], [0, 3], "the shown room is full: the first with a place");
  assert.equal(S.vivFull(st, two), false); st.face.room = 0; bud(10); for (let i = 0; i < 4; i++) { S.openBud(st, { with: null }, two, 10 * 60000); bud(11 + i); } assert.equal(S.vivFull(st, two), true);
  const refused = S.openBud(st, { with: null }, two, 10 * 60000); assert.deepEqual([refused.ok, refused.msg], [false, "The Vivarium is full"]); assert.deepEqual(refused.plate, ["The Vivarium is full", "Return a mibi to make room", "or add a room"]);
  st.rooms = 4; assert.equal(S.openBud(st, { with: null }, { ...two, rooms: 2 }, 10 * 60000).plate.length, 2, "no third line at four rooms");
  st.rooms = 2; st.bud = { kind: "founder", species: "S01", sp: 0, minutes: 20, early: false, start: Date.now() }; assert.deepEqual(S.instantGrow(st, { ...two, economy: "free" }).plate, ["The Vivarium is full", "Return a mibi to make room", "or add a room"]);
});
test("rooms: a young mibi returns for +2 Essence and its place is free at once; the shed pod is due at max(born + adultTurns, releasedAt) + 2", () => {
  for (const [aT, turn, want] of [[2, 1, 4], [5, 1, 7], [2, 10, 12], [5, 6, 8]]) {
    const set = { ...settings, adultTurns: aT }, st = roomsWorld(2); st.turn = turn; const m = st.mibis[0]; m.born = 0;
    const young = S.mibiStage(st, m, set) === "juvenile"; assert.equal(S.returnMibiBlock(st, null, m), ""); const s0 = st.s;
    const r = S.returnMibi(st, { with: null }, m, set); assert.equal(r.ok, true, "adultTurns " + aT + " young " + young); assert.equal(st.s, s0 + 2);
    assert.deepEqual([m.released, m.room, m.slot, m.releasedAt], [true, null, null, turn]); assert.deepEqual(S.freePlace(st, set), { room: 0, slot: 0 }, "its place is free at once");
    assert.equal(st.sheds.length, 1); const sh = st.sheds[0]; assert.deepEqual([sh.id, sh.name, sh.sp, sh.species, sh.g, sh.due], [m.id, m.name, m.sp, m.species, m.from.g, want], "aT " + aT + " turn " + turn);
    assert.equal(sh.state, sh.genome ? "due" : "none"); assert.ok(sh.genome, "a pod is shed");
  }
  const a = roomsWorld(1), b = roomsWorld(1); S.returnMibi(a, null, a.mibis[0], settings); S.returnMibi(b, null, b.mibis[0], settings); assert.deepEqual(a.sheds[0].genome, b.sheds[0].genome, "the same release always sheds the same pod");
  const sv = S.seededRng(7), sw = S.seededRng(7); assert.deepEqual([sv(), sv()], [sw(), sw()]);
});
test("rooms: the shed genome's origin.kinship is max(1/8, the mibi's own): a founder 0.125, a child of full siblings 0.25", () => {
  const st = roomsWorld(0); const big = { ...settings, rooms: 4 };
  const f = S.seedAdults(st, "S01", 5, 1, big).mibis[0]; S.returnMibi(st, null, f, big);
  assert.deepEqual([st.sheds[0].kinship, st.sheds[0].genome.origin.kinship, st.sheds[0].genome.origin.kind], [0.125, 0.125, "shed"]);
  const sib = S.seedSiblings(st, "S01", 99, big); assert.equal(sib.ok, true, sib.msg); const [x, y] = sib.mibis; assert.equal(S.kinshipOf(st, x, y), 0.25);
  let r = null; for (let i = 0; i < 20 && !r?.ok; i++) { st.e = 99; st.s = 99; st.bud = null; r = S.doCross(st, svOf(), x, y, big, 1, S.seededRng(1 + i)); } assert.equal(r.ok, true);
  const kid = S.seedAdults(st, "S01", 12, 1, big).mibis[0]; kid.genome = st.bud.genome; assert.equal(kid.genome.origin.kinship, 0.25);
  S.returnMibi(st, null, kid, big); const sh = st.sheds.at(-1); assert.deepEqual([sh.kinship, sh.genome.origin.kinship], [0.25, 0.25]);
});
test("rooms: the v3 migration: 0, 6 and 12 housed give 1, 1 and 2 rooms, the slots in bay order, bay kept, nothing lost, and a second migrate changes nothing", () => {
  for (const [n, rooms] of [[0, 1], [6, 1], [12, 2]]) {
    const st = roomsWorld(n); st.schema = 3; delete st.rooms; delete st.sheds; st.bays = n > 8 ? 12 : 6;
    housedOld(st).forEach((m, i) => { m.bay = n - 1 - i; delete m.room; delete m.slot; }); const ids = st.mibis.map((m) => m.id).sort(), bayBefore = new Map(st.mibis.map((m) => [m.id, m.bay]));   // migrate writes in place: the v3 bays are read before it
    const once = S.normalize(S.migrate(st, 5)); assert.equal(once.schema, S.ST_SCHEMA); assert.equal(once.rooms, rooms, n + " housed"); assert.deepEqual(once.sheds, []); assert.equal(once.bays, Math.min(12, 8 * rooms));
    assert.deepEqual(once.mibis.map((m) => m.id).sort(), ids, "no mibi lost");
    for (const m of once.mibis) { const old = bayBefore.get(m.id); assert.deepEqual([m.room, m.slot], [Math.floor(old / 8), old % 8], "bay order"); assert.equal(m.bay, m.room * 8 + m.slot); }
    const snap = JSON.stringify(once); assert.equal(JSON.stringify(S.normalize(S.migrate(once, 6))), snap, "a second migrate is a no-op");
  }
  const st = roomsWorld(3); st.schema = 3; st.mibis[0].bay = 5; st.mibis[1].bay = 0; st.mibis[2].bay = 2; st.mibis[2].released = true; delete st.mibis[2].room; const out = S.migrate(st, 1);
  assert.deepEqual(out.mibis.map((m) => [m.room, m.slot]), [[0, 1], [0, 0], [null, null]], "gaps close; a released mibi holds no place"); assert.equal(out.rooms, 1);
  { const st = roomsWorld(12); st.schema = 3; delete st.rooms; delete st.sheds; st.bays = 12; for (const m of st.mibis) { m.bay = m.room * 8 + m.slot; delete m.room; delete m.slot; }
    for (const b of [2, 5, 9]) Object.assign(st.mibis.find((m) => m.bay === b), { released: true, releasedAt: 4 });
    const order = S.housed(st).sort((a, b) => a.bay - b.bay).map((m) => m.id), out = S.normalize(S.migrate(st, 1));
    assert.equal(out.rooms, 2); assert.deepEqual([0, 1, 2, 3].map((r) => S.inRoom(out, r).length), [8, 1, 0, 0], "nine housed with gaps at bays 2, 5, 9: the first room full, one in the second");
    assert.deepEqual([...S.inRoom(out, 0), ...S.inRoom(out, 1)].map((m) => m.id), order, "in bay order"); assert.equal(out.mibis.length, 12, "nobody lost"); assert.equal(out.bays, 12); }
  assert.equal(S.normalize({ ...S.freshSt("w", 1, 1), face: { room: 7 } }).face.room, 0, "an unknown room shown falls back to the first");
});
const housedOld = (st) => st.mibis.filter((m) => !m.released);
test("rooms: need() and needKey() say full after the docked crates and ahead of the bud; the label and the ring follow addRoomBlock; a shed pod opened is marked found", () => {
  const st = roomsWorld(8, { rooms: 1 }); st.rooms = 1; st.e = 20; const sv = svOf();
  assert.equal(S.needKey(st, sv, settings), null, "nothing waits for a place yet");
  st.bud = { kind: "founder", species: "S01", sp: 0, minutes: 5, early: true, start: 0 }; assert.equal(S.budReady(st, settings), true);
  assert.deepEqual(S.needKey(st, sv, settings), { key: "full", act: "vivarium", ring: "room.new" });
  let n = S.need(st, sv, settings); assert.deepEqual([n.text, n.act, n.label, n.ring], ["The Vivarium is full", "vivarium", "Add a room", "room.new"]);
  st.e = 0; assert.deepEqual(S.needKey(st, sv, settings), { key: "full", act: "vivarium", ring: "resident" }); n = S.need(st, sv, settings); assert.deepEqual([n.label, n.ring], ["Make room", "resident"]);
  st.rooms = 4; st.e = 99; assert.equal(S.needKey(st, sv, { ...settings, rooms: 4 }).key, "budReady", "four rooms are not full with eight");
  const full = { ...settings, rooms: 1 }; st.rooms = 4; assert.equal(S.needKey(st, sv, full).ring, "resident", "no room can be added at four rooms");
  const cs = [crate(1, [])]; sv.bay = cs; st.dock = { docked: true, at: 0 }; assert.equal(S.needKey(st, sv, full).key, "crates"); assert.equal(S.need(st, sv, full).act, "bay", "the docked crates come first");
  const q = { id: "q1", sp: 0, species: "S01", g: "meadow", how: "calm", gs: 3, k: null, shed: 5 }; const st2 = S.freshSt("w", 4, 1); S.normalize(st2); st2.dock = { docked: true, at: 0 };
  st2.sheds.push({ id: 5, name: "Dot", sp: 0, species: "S01", g: "meadow", due: 3, kinship: 0.125, genome: null, state: "due" });
  S.openCrates(st2, svOf({ bay: [crate(1, [q])] }), settings, 1); assert.equal(st2.tray[0].shed, 5); assert.equal(st2.sheds[0].state, "found");
  const p = { ...q, id: "q2", shed: undefined }; S.openCrates(st2, svOf({ bay: [crate(2, [p])] }), settings, 2); assert.equal(st2.tray.at(-1).shed, null);
});

test("R2: a crate pod with shed and genome opens into the tray with that genome and marks the record found", () => {
  const st = roomsWorld(2); st.turn = 1; const m = st.mibis[0]; m.born = 0;
  assert.equal(S.returnMibi(st, { with: null }, m, settings).ok, true);
  const rec = st.sheds[0]; assert.equal(rec.state, "due"); const genome = rec.genome;
  const pod = { id: "s" + rec.id, sp: rec.sp, g: "rock", how: "shed", gs: 5, k: null, shed: rec.id, of: rec.name, genome };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 9, bay: [crate(1, [pod])], mibis: [], with: null, tier: 1, shield: 3 };
  assert.equal(S.dockKey(st, sv, settings, 5).ok, true); const o = S.openBay(st, sv, settings, 5);
  assert.equal(o.plays[0].ids.length, 1, "the pod lands");
  const landed = st.tray.concat(st.waiting).find((t) => t.id === o.plays[0].ids[0]);
  assert.deepEqual(landed.genome, genome, "the mibi's own line"); assert.equal(landed.shed, rec.id);
  assert.equal(st.sheds.find((r) => r.id === rec.id).state, "found");
});
