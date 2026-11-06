// The Loika at frame version 5 (owner, 2026-11-01 14:26 and the refinement after it: "crown can be tiny too. all have the gene, but not all may need to express it"):
// every Loika carries the crown's size, leaf count and form beside the crown switch, whether or not it shows a crown. Frames are append-only, so version 4 is exactly
// what it was: its frame bytes, the strings and the stamp codes of the version-4 pods of seeds 1 to 12 (written before the change), and every other frame, S02 to S19.
//   node --test tests/s01v5.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FRAME_DATA } from "../src/frames-data.mjs";
import { FRAMES_LIST, byName, frameFor } from "../src/frames.mjs";
import { genomeString, decodeGenomeString } from "../src/string.mjs";
import { stampCode, decodeStampCode, stepValue, BLEND_STEPS, sameGenome } from "../src/codec.mjs";
import { rng } from "../src/frames.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const CROWN = ["anatomy.crown-presence", "growth.crown-height-ratio", "growth.crest-leaf-count", "anatomy.crown-form"];

// sha256 (first 16 hex) of JSON.stringify of every frame of the snapshot as it stood before the Loika's version 5 was appended
const BEFORE = {
  "11.1": "4363c641bd22957e",
  "12.1": "7a6fc114aa820604",
  "13.1": "e5f3c41df3b956a4",
  "1.2": "0f3778589fdd855c",
  "2.2": "a1f6165357015b23",
  "3.2": "dd44edbf712591ef",
  "4.2": "49944cc6b779f9fc",
  "5.2": "535fa19342087115",
  "6.2": "b860ac31798f48f2",
  "7.2": "3c92211b12a5ef03",
  "8.2": "94ac7402f3b6da01",
  "9.2": "a5d7ede759a78962",
  "10.2": "6b70d56e704af98c",
  "11.2": "5ef325594647fba4",
  "12.2": "6687b6777ddfa7f7",
  "13.2": "de526525ca4cfd5c",
  "14.2": "bb43a427b0eb863a",
  "15.2": "59bba7432a0a8c3e",
  "16.2": "8ac6d224bf347122",
  "1.3": "60a98d0f2452d4fc",
  "2.3": "290765309e1b0aee",
  "3.3": "f58121343e294b38",
  "4.3": "27b52cfaa0a0d5d0",
  "5.3": "becd1cbd0a6707e5",
  "6.3": "095441a90fc7d3b5",
  "7.3": "7597925fb96d85f8",
  "8.3": "79c1021955d5a9f8",
  "9.3": "b4c21a52fedd761d",
  "10.3": "45ee2d9f09e75a01",
  "11.3": "994c2344b65be2ca",
  "12.3": "af65f4c36a6e2f48",
  "13.3": "d25494ba6ace9416",
  "14.3": "24468bdebe06c4e3",
  "15.3": "706fe63dd0cb568b",
  "16.3": "f43540f1cf5cf9f8",
  "3.4": "7d8ff5ec9e33ce10",
  "1.4": "f4265c05236dcc95",
  "2.4": "a80661759448d8a0",
  "3.5": "913fbb02566181e7",
  "4.4": "9c4a6e6c79dbef9d",
  "5.4": "e56ad61810cb883c",
  "6.4": "1f6a512a6142ab1d",
  "7.4": "f633f2aa37ea128e",
  "8.4": "a408a212a8916085",
  "9.4": "7a234f39234ff149",
  "10.4": "f6f314d5b77c40a1",
  "11.4": "b0426cb453c53ec2",
  "12.4": "9fcbd334c1b4e0f0",
  "13.4": "1bf482c6a51a8b0d",
  "14.4": "9d8511bde9836d73",
  "15.4": "45fb89afe8687a19",
  "16.4": "000c870efaa0eb96",
  "17.6": "130f5745dd8c298a",
  "18.6": "8b51cb6f2fd3f48c",
  "19.6": "1dd3c2f3f70d84a2"
};
// The version-4 pods of seeds 1 to 12 (the Station's podGenome, before the change): the genome string and the stamp code (every chapter read) they wrote. Pods 1, 2, 3 and 10 are crown off/off.
const V4_PODS = {
  1: ["G1-S1v4-200G213R0G400R0V3", "S1v4-0F-400G221T1FG0000000000000000000040M02008014040K4"],
  2: ["G1-S1v4-200G211MGG01G09T", "S1v4-0F-400G22B7G7G000000000000000000054040200800004028"],
  3: ["G1-S1v4-200G21NW08800G40X3", "S1v4-0F-400G2254EQG0000000080000000000D40G0200802004G6J"],
  4: ["G1-S1v4-200G201J0G41004000", "S1v4-0F-400G22CS9ZG00000000800000000000004G2008004020HF"],
  5: ["G1-S1v4-200G2A1YG820G0CR", "S1v4-0F-400G22B1F7G0000000000000000000401GG20080040AGV5"],
  6: ["G1-S1v4-200G211KGC0008EK", "S1v4-0F-400G229AV7G000040000000000000000000200800M06GCA"],
  7: ["G1-S1v4-200G201TG801080QN", "S1v4-0F-400G2284R7G0000000080000000000040G0200800402G1S"],
  8: ["G1-S1v4-200G213PGM2008Q9", "S1v4-0F-400G2272D7G00004000000000000005404G2008010060ED"],
  9: ["G1-S1v4-200G2ANY08A0004CA", "S1v4-0F-400G22DZJZG0000400000000000000D01G020080200AGT7"],
  10: ["G1-S1v4-200G20NMGC00G0J6", "S1v4-0F-400G2284NFG0000000080000000000C0000200802400G11"],
  11: ["G1-S1v4-200G2A1J08800G02ZB", "S1v4-0F-400G22DEJQG00004000000000000001410020080000AGYF"],
  12: ["G1-S1v4-200G203ZGC30GV5", "S1v4-0F-400G225T4QG0000400080000000000440GG200801M02GRJ"]
};

test("S01 version 4 is the frame it was, and so is every other frame: the snapshot only gained 1.5 and 1.6, at the end", () => {
  const frames = FRAME_DATA.frames, keys = frames.map((f) => `${f.species}.${f.version}`);
  assert.deepEqual(keys.slice(0, Object.keys(BEFORE).length), Object.keys(BEFORE), "every earlier frame is in the same place");
  assert.deepEqual(keys.slice(Object.keys(BEFORE).length), ["1.5", "1.6", "20.1", "10.5", "12.5"], "and the Loika's versions 5 and 6 follow the last of them, then the Tuliko, then the Igara and the Peplos at 5");
  for (const f of frames.slice(0, Object.keys(BEFORE).length)) assert.equal(sha(JSON.stringify(f)), BEFORE[`${f.species}.${f.version}`], `${f.id} ${f.species}.${f.version} is unchanged`);
  assert.ok(frameFor(1, 4).heritable.some((l) => l.id === "anatomy.crown-presence"), "version 4 keeps the crown switch open");
  assert.ok(!frameFor(1, 4).heritable.some((l) => l.id === "growth.crown-height-ratio"), "and carries no crown size");
  assert.ok(frameFor(1, 4).locked.some(([id]) => id === "growth.crown-height-ratio"), "version 4 fixes the crown size");
});

test("the version-4 pods of seeds 1 to 12: their strings decode and write back the same, and their stamp codes are the same bytes", () => {
  const f = frameFor(1, 4);
  for (const [seed, [str, code]] of Object.entries(V4_PODS)) {
    const d = decodeGenomeString(str); assert.ok(d.ok, d.detail); assert.equal(d.frame, f);
    assert.equal(genomeString(f, d.genome), str, `seed ${seed}: the same string`);
    assert.equal(stampCode(f, { copies: d.genome.copies, readMask: 0b1111 }), code, `seed ${seed}: the same stamp code`);
    const back = decodeStampCode(code); assert.ok(back.ok, back.detail); assert.deepEqual(back.genome.copies, d.genome.copies, `seed ${seed}: the stamp code reads back`);
  }
});

test("the Loika at version 5 adds exactly the crown's size, leaf count and form to the heritable loci, in the Face chapter, with the catalogue's whole range", () => {
  const f5 = frameFor(1, 5), f4 = frameFor(1, 4);
  assert.equal(f5.version, 5); assert.equal(byName("S01").version, 6, "the newest is version 6 (s01v6.test.mjs)");
  const ids5 = f5.heritable.map((l) => l.id), ids4 = f4.heritable.map((l) => l.id);
  assert.deepEqual(ids5.filter((id) => !ids4.includes(id)).sort(), CROWN.slice(1).sort(), "three loci added");
  assert.deepEqual(ids4.filter((id) => !ids5.includes(id)), [], "none taken away: the crown switch stays a heritable switch");
  const face = f5.chapters.find((c) => c.name === "Face");
  assert.deepEqual(face.loci.map((l) => l.id).filter((id) => CROWN.includes(id)), CROWN, "the crown's four loci, together in the Face chapter");
  const by = (id) => f5.heritable.find((l) => l.id === id);
  assert.deepEqual(by("growth.crown-height-ratio").pool, ["low", "high"], "size: the whole catalogue range, 0.45 to 1.05 of the head");
  assert.deepEqual(by("growth.crest-leaf-count").pool, ["two", "three"]);
  assert.deepEqual(by("anatomy.crown-form").pool, ["leaf", "pointed"]);
  assert.ok(by("growth.crown-height-ratio").values, "the size blends on the step: a child lands anywhere between the parents");
});

// A genome of random copies for a frame: a named locus from its pool, a continuous one a named bin or a step, equal copies about half the time.
function genomeOf(frame, seed) {
  const r = rng(seed), copies = {};
  for (const l of frame.heritable) {
    const pick = () => { const p = l.pool ?? l.alleles; return l.values && r() < 0.6 ? stepValue(l, Math.floor(r() * (BLEND_STEPS + 1))) : p[Math.floor(r() * p.length)]; };
    const a = pick(); copies[l.id] = [a, l.values && r() < 0.5 ? a : pick()];
  }
  return { copies };
}

test("a version-5 round trip through the string codec and the stamp codec, with the crown on, off and mixed, and a crown size on a step", () => {
  const f = frameFor(1, 5), size = f.heritable.find((l) => l.id === "growth.crown-height-ratio");
  const readAll = 2 ** f.chapters.length - 1;
  for (const [sw, h] of [[["on", "on"], ["high", "high"]], [["off", "off"], ["low", "high"]], [["off", "on"], [stepValue(size, 7), stepValue(size, 7)]], [["on", "off"], [stepValue(size, 0), stepValue(size, 59)]]]) {
    const g = genomeOf(f, 31); g.copies["anatomy.crown-presence"] = sw; g.copies["growth.crown-height-ratio"] = h;
    const s = genomeString(f, g), d = decodeGenomeString(s);
    assert.ok(d.ok, d.detail); assert.equal(d.frame, f); assert.match(s, /^G1-S1v5-/);
    for (const l of f.heritable) assert.deepEqual(d.genome.copies[l.id], g.copies[l.id], `${l.id} through the string`);
    assert.equal(genomeString(f, d.genome), s);
    const code = stampCode(f, { copies: g.copies, readMask: readAll }), back = decodeStampCode(code);
    assert.ok(back.ok, back.detail); assert.equal(back.frame, f); assert.match(code, /^S1v5-/);
    for (const l of f.heritable) assert.deepEqual(back.genome.copies[l.id], g.copies[l.id], `${l.id} through the stamp code`);
    assert.ok(sameGenome(f, { ...g, species: 1, version: 5, readMask: readAll }, back.genome));
    assert.equal(genomeString(f, back.genome), s, "the stamp code with every chapter read makes the same string");
  }
  for (let seed = 1; seed <= 40; seed++) { const g = genomeOf(f, seed), d = decodeGenomeString(genomeString(f, g)); assert.ok(d.ok, d.detail); for (const l of f.heritable) assert.deepEqual(d.genome.copies[l.id], g.copies[l.id]); }
});

test("a version-5 string is not a version-4 string: each decodes against its own frame only", () => {
  const f4 = frameFor(1, 4), f5 = frameFor(1, 5), g = genomeOf(f5, 5), s5 = genomeString(f5, g);
  assert.equal(decodeGenomeString(s5).frame, f5);
  const g4 = genomeOf(f4, 5), s4 = genomeString(f4, g4);
  assert.equal(decodeGenomeString(s4).frame, f4); assert.match(s4, /^G1-S1v4-/);
  assert.equal(FRAMES_LIST.filter((x) => x.species === 1).map((x) => x.version).join(), "2,3,4,5,6");
});
