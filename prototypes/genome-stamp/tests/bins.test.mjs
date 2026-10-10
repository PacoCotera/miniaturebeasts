// The registry's frames and the cross's blended copies: format 2 stamps a blended copy as its exact
// step and reads it back exactly; format 1 (prints from before the step) stamped it as its bin (the
// nearest named allele) and still reads; a legacy frame still encodes; every registry frame has a
// size; the stamp code is the stamp's own bytes as text.
//   node --test tests/bins.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { FRAMES_LIST, byName, frameFor } from "../src/frames.mjs";
import { stampGeometry, rasterize } from "../src/stamp.mjs";
import { decode } from "../src/decode.mjs";
import { individual } from "./cases.mjs";
import { encodeCells, parseMessage, sizeFor, copyIndex, copyLook, sameGenome, stampCode, decodeStampCode, locusBits, stepValue, stepOf, BLEND_STEPS, STEP_BITS, FORMAT, CODE_ALPHABET } from "../src/codec.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { LOCI, BLEND_STEPS as CATALOGUE_STEPS, stepValue as catalogueStep } from "../../workbench/framework/catalogue.mjs";
import { kinship } from "../../workbench/framework/cross.mjs";
import { setFrames, frameOf as stationFrame, podGenome, stampGenome, stampCode as stationStampCode, quantizeGenome, paintKey, genomeSha, genomeDigest, nameCode, cross } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";

const framesDir = new URL("../../workbench/frames/", import.meta.url);
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(new URL(f, framesDir), "utf8"))));
const ROSTER = Array.from({ length: 16 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`);

const roundTrip = (frame, genome) => {
  const { L, cells } = encodeCells(frame, genome);
  const bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0);
  return parseMessage(bits, L.N, { postmark: !!genome.postmark });
};

test("the registry carries the sixteen species of the workbench at frame version 3, the same sixteen at version 2, and the three legacy frames", () => {
  const v2 = FRAMES_LIST.filter((f) => f.version === 2 && !f.synthetic), v3 = FRAMES_LIST.filter((f) => f.version === 3), legacy = FRAMES_LIST.filter((f) => f.legacy);
  assert.equal(v2.length, 16); assert.equal(v3.length, 16);
  assert.deepEqual(v2.map((f) => f.species), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(v3.map((f) => f.species), Array.from({ length: 16 }, (_, i) => i + 1));
  for (const f of v3) {
    const old = frameFor(f.species, 2);
    assert.notDeepEqual(old.glyph, f.glyph, `${f.id}: version 3 carries the redrawn mark`);
    assert.equal(old.borderSeed, f.borderSeed, `${f.id}: the border is the species'`);
    assert.deepEqual(old.heritable.map((l) => l.id), f.heritable.map((l) => l.id), `${f.id}: same loci`);
  }
  assert.equal(byName("S01").version, 3, "the encoder's default frame is the newest");
  assert.equal(byName("S01", 2).version, 2);
  assert.deepEqual(legacy.map((f) => f.id), ["hopper", "puffcap", "glowtail"]);
  for (const f of FRAMES_LIST) assert.ok(sizeFor(f), `${f.id} fits a size`);
  assert.equal(byName("S01").name, "Loika"); assert.equal(frameFor(1, 2).id, "S01"); assert.equal(frameFor(1, 3).id, "S01"); assert.equal(frameFor(11, 1).id, "hopper");
});

test("format 1, a print from before the blend step: a blended copy is stamped as its bin and read back as that look", () => {
  const f = byName("S01");
  const eye = f.heritable.find((l) => l.id === "growth.exterior-eye-size-ratio");
  assert.deepEqual(eye.values, [0.24, 0.32, 0.44]);
  assert.equal(copyLook(eye, 0.348), "large"); assert.equal(copyLook(eye, 0.4), "huge"); assert.equal(copyIndex(eye, "huge"), 2);
  const copies = { "appearance.marking-switch": ["on", "off"], "anatomy.crown-presence": ["on", "off"], "growth.exterior-eye-size-ratio": [0.348296, 0.348296], "movement.cycle-rate": [0.950671, 0.950671], "energy.action-efficiency": [0.983488, 0.983488] };
  const g = { species: 1, version: f.version, format: 1, read: f.chapters.map((c) => c.name), copies };
  const r = roundTrip(f, g);
  assert.equal(r.genome.format, 1);
  assert.ok(r.ok, r.detail);
  assert.deepEqual(r.genome.copies["growth.exterior-eye-size-ratio"], ["large", "large"]);
  assert.deepEqual(r.genome.copies["movement.cycle-rate"], ["low", "low"], "0.95 sits nearer low (0.6) than high (1.4)");
  assert.deepEqual(r.genome.copies["energy.action-efficiency"], ["high", "high"]);
  assert.ok(sameGenome(f, g, r.genome), "the read matches the genome, blends by bin");
  const binned = { ...g, copies: { ...copies, "growth.exterior-eye-size-ratio": ["large", "large"], "movement.cycle-rate": ["low", "low"], "energy.action-efficiency": ["high", "high"] } };
  assert.equal(stampCode(f, g), stampCode(f, binned), "the code is the bins' code");
  assert.throws(() => encodeCells(f, { ...g, copies: { ...copies, "appearance.marking-switch": [0.5, "off"] } }), /unknown look/);
});

test("a legacy genome still encodes and reads on its version 1 frame", () => {
  const f = byName("hopper");
  const g = { species: 11, version: 1, read: f.chapters.map((c) => c.name), copies: Object.fromEntries(f.heritable.map((l) => [l.id, [l.alleles[0], l.alleles.at(-1)]])) };
  const r = roundTrip(f, g);
  assert.ok(r.ok, r.detail); assert.equal(r.genome.species, 11); assert.ok(sameGenome(f, g, r.genome));
});

test("a version 2 print still decodes and a version 3 print decodes, each on its own frame and glyph", () => {
  for (const [id, version] of [["S01", 2], ["S01", 3], ["S03", 2], ["S03", 3], ["S16", 2], ["S16", 3]]) {
    const f = byName(id, version), g = individual(f, 11, { read: f.chapters.filter((c) => !c.sealed).map((c) => c.name) });
    assert.equal(g.version, version);
    const geom = stampGeometry(g), img = rasterize(geom, 240);
    const d = decode(img);
    assert.ok(d.ok && d.stamps.length === 1, `${id} v${version} reads`);
    assert.equal(d.stamps[0].genome.version, version);
    assert.ok(sameGenome(f, g, d.stamps[0].genome), `${id} v${version} reads back as the genome`);
  }
});

// --- genome C1, C5, C6 (2026-10-09) ---------------------------------------------------------------------
test("the step's cost, measured: bits per blended copy and the stamp size per species", (t) => {
  assert.equal(CATALOGUE_STEPS, BLEND_STEPS, "the workbench and the codec share one step");
  const rows = [];
  for (const id of ROSTER) {
    const f = byName(id), wf = stationFrame(id);
    assert.equal(f.version, 3);
    const blended = f.heritable.filter((l) => l.values);
    for (const l of blended) {
      assert.ok(l.alleles.length + BLEND_STEPS + 1 <= 2 ** STEP_BITS, `${l.id}: its names and steps fit ${STEP_BITS} bits`);
      for (const k of [0, 1, Math.floor(BLEND_STEPS / 2), BLEND_STEPS]) assert.equal(stepValue(l, k), catalogueStep(LOCI.get(l.id), k), `${l.id} step ${k}: the codec's value is the catalogue's`);
      assert.equal(locusBits(l), STEP_BITS);
    }
    assert.ok(wf.loci.filter((l) => l.kind !== "locked" && l.alleles.every(() => true)).length >= f.heritable.length);
    const before = [sizeFor(f, { format: 1 }).N, sizeFor(f, { format: 1, postmark: true }).N], after = [sizeFor(f).N, sizeFor(f, { postmark: true }).N];
    const bits = (format) => f.heritable.reduce((s, l) => s + locusBits(l, format) * l.copies, 0);
    assert.ok(after[0] <= 37 && after[1] <= 37, `${id}: within 37x37, the largest size read in the robustness runs`);
    rows.push({ id, name: f.name, open: f.heritable.length, blended: blended.length, bits: [bits(1), bits(2)], before, after });
  }
  t.diagnostic(`step 1/${BLEND_STEPS} of the locus range, ${STEP_BITS} bits per blended copy (format ${FORMAT}); per species: open loci, blended loci, payload bits format 1 -> 2, size plain/postmark format 1 -> 2`);
  for (const r of rows) t.diagnostic(`${r.id} ${r.name}: ${r.open} open, ${r.blended} blended, ${r.bits[0]} -> ${r.bits[1]} bits, ${r.before.join("/")} -> ${r.after.join("/")}`);
  // pinned so a change of the step or the frames shows here
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.id, r.after.join("/")])), {
    S01: "25/25", S02: "29/33", S03: "37/37", S04: "25/29", S05: "29/29", S06: "29/33", S07: "33/33", S08: "29/33",
    S09: "37/37", S10: "29/33", S11: "33/33", S12: "25/25", S13: "29/33", S14: "25/29", S15: "33/33", S16: "33/33",
  });
});

test("C5: the round trip is exact for every blended locus of S01 to S16 at the step's ends and middle", () => {
  for (const id of ROSTER) {
    const f = byName(id), blended = f.heritable.filter((l) => l.values);
    for (const k of [0, Math.floor(BLEND_STEPS / 2), BLEND_STEPS]) {
      const copies = {};
      for (const l of f.heritable) copies[l.id] = l.values ? [stepValue(l, k), stepValue(l, BLEND_STEPS - k)] : [l.pool[0], l.pool.at(-1)];
      const g = { species: f.species, version: f.version, read: f.chapters.map((c) => c.name), copies };
      const r = roundTrip(f, g);
      assert.ok(r.ok, `${id} step ${k}: ${r.detail}`); assert.equal(r.genome.format, 2);
      for (const l of blended) assert.deepEqual(r.genome.copies[l.id], copies[l.id], `${id} ${l.id} at step ${k}: exact`);
      for (const l of f.heritable) if (!l.values) assert.deepEqual(r.genome.copies[l.id], copies[l.id]);
      assert.ok(sameGenome(f, g, r.genome));
      const d = decodeStampCode(stampCode(f, g));
      assert.ok(d.ok, d.detail); assert.deepEqual(d.genome.copies, copies, `${id} step ${k}: the code too`);
    }
    // a named copy on a continuous locus stays a name; a number off the step is refused, never rounded
    const l = blended[0];
    if (l) {
      const named = Object.fromEntries(f.heritable.map((x) => [x.id, [x.pool[0], x.pool[0]]]));
      const r = roundTrip(f, { species: f.species, version: f.version, read: f.chapters.map((c) => c.name), copies: named });
      assert.deepEqual(r.genome.copies[l.id], named[l.id]);
      const off = stepValue(l, 1) + 1e-4;
      assert.equal(stepOf(l, off), -1);
      assert.throws(() => encodeCells(f, { species: f.species, version: f.version, read: f.chapters.map((c) => c.name), copies: { ...named, [l.id]: [off, off] } }), /not on the blend step/);
    }
  }
  // and through an image: a Tuikis with blends, rasterised and scanned
  const f = byName("S03"), copies = {};
  for (const l of f.heritable) copies[l.id] = l.values ? [stepValue(l, 17), stepValue(l, 17)] : [l.pool[0], l.pool.at(-1)];
  const g = { species: 3, version: f.version, read: f.chapters.filter((c) => !c.sealed).map((c) => c.name), copies };
  const d = decode(rasterize(stampGeometry(g), 300));
  assert.equal(d.stamps.length, 1); assert.ok(sameGenome(f, g, d.stamps[0].genome), "the scan reads every stepped copy exactly");
});

test("C1: a genome missing a heritable locus is refused by the stamp, naming that locus; no copy is invented", () => {
  const fr = stationFrame("S01"), g = podGenome(fr, 77);
  const ok = stampGenome(fr, g, ["coat"]);
  assert.ok(!ok.refused); assert.deepEqual(ok.read, ["Coat"]);
  const lack = structuredClone(g); delete lack.loci["anatomy.crown-presence"]; delete lack.loci["movement.cycle-rate"];
  const r = stampGenome(fr, lack, ["coat"]);
  assert.equal(r.refused, true); assert.deepEqual(r.missing.sort(), ["anatomy.crown-presence", "movement.cycle-rate"]);
  assert.match(r.reason, /anatomy\.crown-presence/);
  assert.equal(r.copies, undefined, "nothing stamped");
  assert.equal(stationStampCode(fr, lack, ["coat"]), null, "no code for a refused genome");
});

test("C5: the migration moves a living mibi's blends onto the step, is idempotent, and keeps its painting key and name", () => {
  const fr = stationFrame("S01"), st = S.freshSt("w1", 5, 1000);
  const a = podGenome(fr, 1), b = podGenome(fr, 2);
  // a child crossed before the step: its blends are off it
  const old = cross(fr, a, b, { rng: (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })() });
  const eye = "growth.exterior-eye-size-ratio";
  old.loci[eye] = [0.333333, 0.333333]; old.loci["movement.cycle-rate"] = [0.951234, 0.951234];
  const sha = genomeSha(old), code = nameCode(sha), digest = genomeDigest(old);
  const paint = { state: "landed", sha, at: 1 };
  const kid = { id: 3, name: "Pip", sp: 0, species: "S01", gs: null, born: 0, from: { n: 0, g: "meadow", how: "cross" }, genome: old, sha, code, read: ["coat"], parents: [{ id: 1, genome: a }, { id: 2, genome: b }], bay: 0, paint, released: false, shaped: [] };
  const grandkid = { id: 4, name: "Moss", sp: 0, species: "S01", gs: null, born: 0, from: { n: 0, g: "meadow", how: "cross" }, genome: { ...podGenome(fr, 3), origin: { kind: "cross", parents: [digest, genomeDigest(a)] } }, sha: "x", code: "y", read: [], parents: [{ id: 3, genome: structuredClone(old) }, { id: 1, genome: a }], bay: 1, paint: null, released: false, shaped: [] };
  st.mibis = [{ id: 1, name: "Ada", sp: 0, species: "S01", gs: 1, born: 0, genome: a, sha: genomeSha(a), code: nameCode(genomeSha(a)), read: [], parents: null, bay: 2, paint: null, released: false, shaped: [] }, kid, grandkid];
  const kinBefore = S.kinshipOf(st, grandkid, kid), kinDigest = kinship(grandkid.genome, kid.genome, (d) => [kid.genome, ...grandkid.parents.map((p) => p.genome)].find((g) => genomeDigest(g) === d) ?? null);
  S.normalize(st);
  const m = st.mibis.find((x) => x.id === 3);
  assert.notEqual(m.genome.loci[eye][0], 0.333333, "moved onto the step");
  for (const id of [eye, "movement.cycle-rate"]) assert.ok(stepOf(byName("S01").heritable.find((l) => l.id === id), m.genome.loci[id][0]) >= 0);
  assert.equal(Math.abs(m.genome.loci[eye][0] - 0.333333) <= (0.44 - 0.24) / BLEND_STEPS / 2 + 1e-9, true, "by at most half a step");
  assert.equal(m.sha, sha, "the painting key is the one painted"); assert.equal(m.paint, paint); assert.equal(m.code, code, "the name stays");
  assert.equal(paintKey(m.genome), sha, "the genome carries its painting key"); assert.equal(m.genome.origin.was.digest, digest);
  assert.equal(st.outbox.length, 0, "nothing goes to be painted again");
  const once = structuredClone(m.genome);
  S.normalize(st);
  assert.deepEqual(st.mibis.find((x) => x.id === 3).genome, once, "idempotent");
  assert.equal(quantizeGenome(fr, once), once, "a genome on the step comes back as itself");
  assert.equal(quantizeGenome(fr, a), a, "named copies are never moved");
  assert.equal(S.kinshipOf(st, grandkid, m), kinBefore, "the pedigree by id stays whole");
  assert.equal(kinship(grandkid.genome, m.genome, (d) => [m.genome, ...grandkid.parents.map((p) => p.genome)].find((g) => genomeDigest(g) === d) ?? null), kinDigest, "and so does a pedigree walked by digest (origin.was)");
  assert.equal(kinBefore, 0.375, "a child of Pip and Ada with Pip: a half from Pip, a quarter from Ada");
  assert.ok(!stampGenome(fr, m.genome, ["coat", "face", "movement", "stamina"]).refused);
  assert.ok(decodeStampCode(stationStampCode(fr, m.genome, ["face", "movement", "stamina"])).ok);
});

test("C6: the stamp code is the stamp's own bytes as text: it round-trips for every species, refuses a corrupted character, and holds no unread chapter and no shut sealed one", () => {
  for (const id of ROSTER) {
    const f = byName(id);
    for (const seed of [1, 2, 3]) {
      const g = individual(f, seed * 101, { read: f.chapters.filter((c, i) => !c.sealed && (i + seed) % 3 !== 0).map((c) => c.name) });
      const code = stampCode(f, g);
      assert.match(code, new RegExp(`^S${f.species}v${f.version}-[0-9A-F]{2,}-[${CODE_ALPHABET}]+$`));
      assert.ok(!/[ILOU]/.test(code.slice(code.lastIndexOf("-") + 1)), "no look-alikes");
      const d = decodeStampCode(code);
      assert.ok(d.ok, `${id}: ${d.detail}`);
      assert.ok(sameGenome(f, g, d.genome), `${id}: decodes to the stamp's genome`);
      assert.deepEqual(d.genome.read, g.read);
      for (const c of f.chapters) if (!g.read.includes(c.name)) for (const l of c.loci) assert.equal(d.genome.copies[l.id], undefined, `${id}: unread ${c.name} is absent`);
      // the same as a scan of the stamp's message
      const r = roundTrip(f, g); assert.deepEqual(d.genome, r.genome);
      // every single character of the body changed to every other is refused
      const body = code.slice(code.lastIndexOf("-") + 1), head = code.slice(0, code.length - body.length);
      if (seed === 1) for (let i = 0; i < body.length; i++) for (const ch of CODE_ALPHABET) {
        if (ch === body[i]) continue;
        const bad = head + body.slice(0, i) + ch + body.slice(i + 1);
        assert.equal(decodeStampCode(bad).ok, false, `${id}: ${bad} is refused`);
      }
      assert.equal(decodeStampCode(code.replace(/^S\d+/, `S${f.species === 16 ? 15 : f.species + 1}`)).ok, false, "an opening that disagrees is refused");
      assert.equal(decodeStampCode(code.toLowerCase().replace(/-(\w+)$/, (m0, b) => "-" + b.match(/.{1,4}/g).join(" "))).ok, true, "case and spacing do not matter");
    }
  }
  // the Station's code: no shut sealed chapter is in it (shut, it is never read); opened and read, it is; the name code stays a name
  const fr = stationFrame("S02"), sealed = fr.chapters.find((c) => c.sealed);
  assert.ok(sealed, "the Untuva seals a chapter");
  const g = podGenome(fr, 5), shut = fr.chapters.filter((c) => !c.sealed).map((c) => c.id), opened = fr.chapters.map((c) => c.id);
  assert.ok(!stampGenome(fr, g, shut).read.includes(sealed.name), "no shut sealed chapter");
  const d = decodeStampCode(stationStampCode(fr, g, shut));
  assert.ok(d.ok, d.detail); assert.ok(!d.genome.read.includes(sealed.name));
  for (const tr of sealed.traits) for (const l of tr.loci) assert.equal(d.genome.copies[l], undefined);
  const d2 = decodeStampCode(stationStampCode(fr, g, opened));
  assert.ok(d2.ok, d2.detail); assert.ok(d2.genome.read.includes(sealed.name), "an opened and read sealed chapter is stamped");
  for (const tr of sealed.traits) for (const l of tr.loci) assert.deepEqual(d2.genome.copies[l], g.loci[l]);
  assert.match(nameCode(genomeSha(g)), /^[0-9A-Z]{9}$/);
  // hidden copies are carried: a heterozygous switch reads back as both of its copies
  const f1 = stationFrame("S01"), het = podGenome(f1, 9);
  het.loci["appearance.marking-switch"] = ["off", "on"];
  const d1 = decodeStampCode(stationStampCode(f1, het, ["coat"]));
  assert.deepEqual(d1.genome.copies["appearance.marking-switch"], ["off", "on"]);
});
