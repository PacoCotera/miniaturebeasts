// The Loika at frame version 6 (art director, 2026-11-03, ad-ears.md): every Loika has ears, their length heritable (small 0.45, short 0.60 the type, medium 0.75 of the head's half height); the
// ear switch, form, tilt, width and set are locked. Frames are append-only, so every frame before it is exactly what it was: the snapshot's bytes (including the Loika's version 5), and the strings and
// stamp codes of the version-5 pods of seeds 1 to 12 (written before the change).   node --test tests/s01v6.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FRAME_DATA } from "../src/frames-data.mjs";
import { FRAMES_LIST, byName, frameFor, rng } from "../src/frames.mjs";
import { genomeString, decodeGenomeString } from "../src/string.mjs";
import { stampCode, decodeStampCode, stepValue, BLEND_STEPS, sameGenome } from "../src/codec.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const LEN = "growth.auricular-length-ratio";

// sha256 (first 16 hex) of JSON.stringify of every frame of the snapshot as it stood before the Loika's version 6 was appended
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
  "19.6": "1dd3c2f3f70d84a2",
  "1.5": "e935ad8b1f6eb00b"
};
// The version-5 pods of seeds 1 to 12 (the Station's podGenome, before the change): the genome string and the stamp code (every chapter read) they wrote.
const V5_PODS = {
  1: ["G1-S1v5-200G2H3RG6R11003008G", "S1v5-0F-400G2JF0G7G00004000000000000000M0G0280901004AY5"],
  2: ["G1-S1v5-200G2H1MGEP10060KZ", "S1v5-0F-400G2J2RWZG0000400000000000000400002809006G4TB2"],
  3: ["G1-S1v5-200G2HNWGD6100410063", "S1v5-0F-400G2J1QR7G0000400010000000000C00J02009026G4JZG"],
  4: ["G1-S1v5-200G2G1JG4R20G400G0HB", "S1v5-0F-400G2JFG9ZG00000000900000000000G00G2009000G28AY"],
  5: ["G1-S1v5-200G2T1Y081M10820G05Z", "S1v5-0F-400G2JD4DZG00000000800000000004G1JG2808000GAG0A"],
  6: ["G1-S1v5-200G2H1K004M0GM0008D1", "S1v5-0F-400G2JDSV7G00000G00000000000000M020200800M062F0"],
  7: ["G1-S1v5-200G2G1TGBA1004100PV", "S1v5-0F-400G2J5G3QG00004000100000000000G0J02808004G2JD8"],
  8: ["G1-S1v5-200G2H3P080A10C20087S", "S1v5-0F-400G2J0TEQG00004G00800000000004000G2008012G6R8E"],
  9: ["G1-S1v5-200G2TNY081K0R000G86", "S1v5-0F-400G2J2EXFG00000G0000000000000C01J02808022GAJDP"],
  10: ["G1-S1v5-200G2GNMG181180100JQ", "S1v5-0F-400G2JDX97G0000000010000000000CM0202008020002SN"],
  11: ["G1-S1v5-200G2T1J082K0G0200819", "S1v5-0F-400G2JA8YQG00004G0000000000000001202009002GAJ4D"],
  12: ["G1-S1v5-200G2G3ZG5A2GC2NY", "S1v5-0F-400G2J6PF7G00004G00900000000004M0JG200901G020JV"]
};
// The version-6 pods of the same seeds: the ear length is drawn from small, short and medium like any heritable look.
const V6_PODS = {
  1: ["G1-S1v6-200G313RG6T308800R0HG", "S1v6-0F-400G32A9BZG0000240069004J00100100G020080100406Y"],
  2: ["G1-S1v6-200G311MGAP3G801G0C9", "S1v6-0F-400G32F467G000034G029008G00H00500002008000040D8"],
  3: ["G1-S1v6-200G31NWGB60G801080RT", "S1v6-0F-400G32DS1ZG000030G001008000R00D00H020080200405Q"],
  4: ["G1-S1v6-200G301JG6R310820G0206P", "S1v6-0F-400G326MAQG000020G068004G04140000502008XF"],
  5: ["G1-S1v6-200G3A1Y080M10R410820GH", "S1v6-0F-400G323YZ7G000004G000004G04S40401M02008000080FF"],
  6: ["G1-S1v6-200G311K004N10450002E4", "S1v6-0F-400G321X9FG000000000102CJ0490008000200800004078"],
  7: ["G1-S1v6-200G301TGFA0G80108068", "S1v6-0F-400G32119FG000020G04100C004R00100H02008KN"],
  8: ["G1-S1v6-200G313P083B10830G02P1", "S1v6-0F-400G327M1QG000030G060000G04H40580402008010040V6"],
  9: ["G1-S1v6-200G3ANY082J00W30002TH", "S1v6-0F-400G326ZKQG000014G041000G04R00C81G02008020080S4"],
  10: ["G1-S1v6-200G30NMG3A208A0080HB", "S1v6-0F-400G324MVQG0000200001004J00900C00102008020BZ"],
  11: ["G1-S1v6-200G3A1J081J00M200801VC", "S1v6-0F-400G3253AFG000030G001000G04R00181002008000080C6"],
  12: ["G1-S1v6-200G303ZG3A0GM30GDP", "S1v6-0F-400G32DNHQG0000200000024204840580N02008010BB"]
};

test("S01 version 5 is the frame it was, and so is every other frame: the snapshot only gained 1.6, at the end", () => {
  const frames = FRAME_DATA.frames, keys = frames.map((f) => `${f.species}.${f.version}`), n = Object.keys(BEFORE).length;
  assert.deepEqual(keys.slice(0, n), Object.keys(BEFORE), "every earlier frame is in the same place");
  assert.deepEqual(keys.slice(n), ["1.6", "20.1"], "and the Loika's version 6 follows the last of them, then the Tuliko");
  for (const f of frames.slice(0, n)) assert.equal(sha(JSON.stringify(f)), BEFORE[`${f.species}.${f.version}`], `${f.id} ${f.species}.${f.version} is unchanged`);
  assert.ok(!frameFor(1, 5).heritable.some((l) => l.id === LEN), "version 5 carries no ear length open");
});

test("the version-5 pods of seeds 1 to 12: their strings decode and write back the same, and their stamp codes are the same bytes", () => {
  const f = frameFor(1, 5);
  for (const [seed, [str, code]] of Object.entries(V5_PODS)) {
    const d = decodeGenomeString(str); assert.ok(d.ok, d.detail); assert.equal(d.frame, f);
    assert.equal(genomeString(f, d.genome), str, `seed ${seed}: the same string`);
    assert.equal(stampCode(f, { copies: d.genome.copies, readMask: 0b1111 }), code, `seed ${seed}: the same stamp code`);
    const back = decodeStampCode(code); assert.ok(back.ok, back.detail); assert.deepEqual(back.genome.copies, d.genome.copies, `seed ${seed}: the stamp code reads back`);
  }
});

test("the Loika at version 6 is the newest and adds exactly the ear length to the heritable loci, in the Face chapter, with the AD's three alleles and the catalogue's step grid", () => {
  const f6 = byName("S01"), f5 = frameFor(1, 5);
  assert.equal(f6.version, 6); assert.equal(frameFor(1, 6), f6);
  const ids6 = f6.heritable.map((l) => l.id), ids5 = f5.heritable.map((l) => l.id);
  assert.deepEqual(ids6.filter((id) => !ids5.includes(id)), [LEN], "one locus added");
  assert.deepEqual(ids5.filter((id) => !ids6.includes(id)), [], "none taken away");
  assert.ok(!ids6.some((id) => id === "anatomy.auricular-presence"), "the ear switch is not heritable: it is locked on");
  assert.deepEqual(f6.chapters.find((c) => c.name === "Face").loci.map((l) => l.id).filter((id) => id === LEN), [LEN]);
  const l = f6.heritable.find((x) => x.id === LEN);
  assert.deepEqual(l.pool, ["small", "short", "medium"]);
  const value = (name) => l.values[l.alleles.indexOf(name)];
  assert.deepEqual([value("small"), value("short"), value("medium")], [0.45, 0.6, 0.75], "the band's ends and the type, as the AD ruled them");
  assert.equal(stepValue(l, 0), 0.45, "the step grid starts at the catalogue's lowest ear"); assert.equal(stepValue(l, BLEND_STEPS), 1.4);
  assert.ok(l.alleles.length + BLEND_STEPS + 1 <= 64, "its names and steps fit the six bits of a blended copy");
  assert.equal(f6.locked.length, 45); assert.ok(f6.locked.some(([id]) => id === "anatomy.auricular-presence"), "the ear switch is among the locked loci");
});

test("the version-6 pods of seeds 1 to 12: every string carries the ears, decodes and writes back the same, and the stamp codes read back", () => {
  const f = byName("S01");
  for (const [seed, [str, code]] of Object.entries(V6_PODS)) {
    const d = decodeGenomeString(str); assert.ok(d.ok, d.detail); assert.equal(d.frame, f); assert.match(str, /^G1-S1v6-/);
    const ears = d.genome.copies[LEN]; assert.ok(Array.isArray(ears) && ears.length === 2, `seed ${seed} carries the ear length`);
    assert.ok(ears.every((c) => ["small", "short", "medium"].includes(c)), `seed ${seed}: a copy of the pool`);
    assert.equal(genomeString(f, d.genome), str, `seed ${seed}: the same string`);
    assert.equal(stampCode(f, { copies: d.genome.copies, readMask: 0b1111 }), code, `seed ${seed}: the same stamp code`);
    const back = decodeStampCode(code); assert.ok(back.ok, back.detail); assert.deepEqual(back.genome.copies, d.genome.copies);
  }
  assert.equal(V6_PODS[1][0], "G1-S1v6-200G313RG6T308800R0HG", "the seed-1 Loika's string");
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

test("a version-6 round trip through the string codec and the stamp codec with the ears at each end, mixed and on a step", () => {
  const f = byName("S01"), l = f.heritable.find((x) => x.id === LEN), readAll = 2 ** f.chapters.length - 1;
  for (const ears of [["small", "small"], ["short", "short"], ["medium", "medium"], ["small", "medium"], [stepValue(l, 3), stepValue(l, 3)], [stepValue(l, 0), "medium"]]) {
    const g = genomeOf(f, 41); g.copies[LEN] = ears;
    const s = genomeString(f, g), d = decodeGenomeString(s);
    assert.ok(d.ok, d.detail); assert.equal(d.frame, f); assert.match(s, /^G1-S1v6-/);
    for (const x of f.heritable) assert.deepEqual(d.genome.copies[x.id], g.copies[x.id], `${x.id} through the string`);
    assert.equal(genomeString(f, d.genome), s);
    const code = stampCode(f, { copies: g.copies, readMask: readAll }), back = decodeStampCode(code);
    assert.ok(back.ok, back.detail); assert.equal(back.frame, f); assert.match(code, /^S1v6-/);
    for (const x of f.heritable) assert.deepEqual(back.genome.copies[x.id], g.copies[x.id], `${x.id} through the stamp code`);
    assert.ok(sameGenome(f, { ...g, species: 1, version: 6, readMask: readAll }, back.genome));
    assert.equal(genomeString(f, back.genome), s, "the stamp code with every chapter read makes the same string");
  }
  for (let seed = 1; seed <= 40; seed++) { const g = genomeOf(f, seed), d = decodeGenomeString(genomeString(f, g)); assert.ok(d.ok, d.detail); for (const x of f.heritable) assert.deepEqual(d.genome.copies[x.id], g.copies[x.id]); }
});

test("a version-6 string is not a version-5 or version-4 string: each decodes against its own frame only", () => {
  const f6 = byName("S01"), f5 = frameFor(1, 5), f4 = frameFor(1, 4);
  for (const f of [f4, f5, f6]) { const s = genomeString(f, genomeOf(f, 9)); assert.equal(decodeGenomeString(s).frame, f); assert.match(s, new RegExp(`^G1-S1v${f.version}-`)); }
  assert.equal(FRAMES_LIST.filter((x) => x.species === 1).map((x) => x.version).join(), "2,3,4,5,6");
});
