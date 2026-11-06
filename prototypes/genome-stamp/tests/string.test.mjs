// The genome string, format G1 (ticket G2 of the genome-string proposal, T-20261102-genome-string, section B): a round trip for every frame in the registry, the proposal's
// worked examples (B.4), every refusal, the format list, and the synthetic test frames at species 4094 and 4095.
//   node --test tests/string.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { FRAMES_LIST, byName, frameFor, TEST_SPECIES } from "../src/frames.mjs";
import { genomeString, decodeGenomeString, STRING_FORMAT, STRING_FORMATS, STRING_HEADER_FIELDS, stringFormats } from "../src/string.mjs";
import { CODE_ALPHABET, STEP_BITS, BLEND_STEPS, crc10, charsOf, toBits, stepValue, stampCode, decodeStampCode, copyIndex } from "../src/codec.mjs";
import { rng } from "../src/frames.mjs";
import { tulikoFrame, tulikoType } from "./tuliko-frame.mjs";

// --- helpers -----------------------------------------------------------------------------------------------------------------------------------------------
// A genome of random copies for a frame: a named locus from its pool, a continuous one a named bin or a step, equal copies about half the time (a blended child).
function genomeOf(frame, seed) {
  const r = rng(seed), copies = {};
  for (const l of frame.heritable) {
    const pick = () => {
      const p = l.pool ?? l.alleles;
      if (l.values && (r() < 0.6 || !p.every((a) => l.alleles.includes(a)))) return stepValue(l, Math.floor(r() * (BLEND_STEPS + 1)));
      return p[Math.floor(r() * p.length)];
    };
    const a = pick();
    copies[l.id] = [a, l.values && r() < 0.5 ? a : pick()];
  }
  return { copies };
}
const body = (s) => s.slice(s.indexOf("-", s.indexOf("v")) + 1);                 // everything after "G1-S<n>v<v>-"
const opening = (s) => s.slice(0, s.length - body(s).length);
const idx = (c) => CODE_ALPHABET.indexOf(c);
// A valid string from raw bits: the opening, the body (zero-padded) and the check, whatever the bits say. For building the refusals a damaged string needs a valid check.
function assemble({ format = 1, species, version, payload, open = `G${format}-S${species}v${version}-` }) {
  const bits = [...toBits(format, 4), ...toBits(species, 12), ...toBits(version, 10), ...payload];
  const b = charsOf(bits), check = charsOf(toBits(crc10(b.split("").flatMap((ch) => toBits(idx(ch), 5))), 10));
  return `${open}${b}${check}`;
}
const withCheck = (open, b) => `${open}${b}${charsOf(toBits(crc10(b.split("").flatMap((ch) => toBits(idx(ch), 5))), 10))}`;
const payloadOf = (frame, genome) => {      // the payload bits of a genome's string: the string without its header, check and padding
  const s = genomeString(frame, genome), b = body(s).slice(0, -2);
  return b.split("").flatMap((ch) => toBits(idx(ch), 5)).slice(26);
};
const sameCopies = (frame, a, b) => frame.heritable.every((l) => a[l.id].join() === b[l.id].join());

const LOIKA = () => frameFor(1, 4);
const LOIKA_TYPE = { "appearance.body-palette": ["charcoal", "charcoal"], "appearance.marking-switch": ["on", "on"], "appearance.marking-layout": ["bands", "bands"], "anatomy.crown-presence": ["on", "on"],
  "growth.exterior-eye-size-ratio": ["huge", "huge"], "movement.cycle-rate": ["low", "high"], "energy.action-efficiency": ["low", "high"] };
// --- the format ----------------------------------------------------------------------------------------------------------------------------------------
test("the format list: G1 is the only format and the one the encoder writes; the header is format 4, species 12 and frame version 10 bits", () => {
  assert.deepEqual(STRING_FORMATS, [1]); assert.equal(STRING_FORMAT, 1); assert.ok(STRING_FORMATS.includes(STRING_FORMAT));
  assert.deepEqual(STRING_HEADER_FIELDS, [["format", 4], ["species", 12], ["version", 10]]);
  assert.deepEqual(stringFormats(), [{ format: 1, opening: "G1", bits: 26, current: true }]);
  assert.ok(genomeString(LOIKA(), { copies: LOIKA_TYPE }).startsWith("G1-S1v4-"));
  assert.equal(CODE_ALPHABET, "0123456789ABCDEFGHJKMNPQRSTVWXYZ", "the stamp code's alphabet: Crockford base 32");
  assert.equal(STEP_BITS, 6); assert.equal(BLEND_STEPS, 59);
});

test("B.4, the Loika (S01 frame version 4): the type is G1-S1v4-200G201KGG010049B (25 characters) and the child G1-S1v4-200G20MKV001004WD, and both decode back", () => {
  const f = LOIKA();
  const type = genomeString(f, { copies: LOIKA_TYPE });
  assert.equal(type, "G1-S1v4-200G201KGG010049B"); assert.equal(type.length, 25);
  const child = { copies: { ...LOIKA_TYPE, "appearance.body-palette": ["charcoal", "ash"], "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": [stepValue(f.heritable[4], 41), stepValue(f.heritable[4], 41)] } };
  assert.equal(child.copies["growth.exterior-eye-size-ratio"][0], 0.378983, "the blended eye, step 41");
  assert.equal(genomeString(f, child), "G1-S1v4-200G20MKV001004WD");
  for (const g of [{ copies: LOIKA_TYPE }, child]) { const d = decodeGenomeString(genomeString(f, g)); assert.ok(d.ok, d.detail); assert.deepEqual(d.genome.copies, g.copies); assert.equal(d.genome.species, 1); assert.equal(d.genome.version, 4); assert.equal(d.frame, f); }
  // the type's stamp code with every chapter read is the same genome, 55 characters long and twice as long (the stamp's empty cells)
  const code = stampCode(f, { copies: LOIKA_TYPE, readMask: 0b1111 });
  assert.equal(code, "S1v4-0F-400G22D8XZG000040000000000000014040200800G020QA"); assert.equal(code.length, 55);
});

test("B.4, the Tuliko (a test frame of S20, version 1, the 54 records of A.3): the type is an 82-character string and the bred Tuliko the next, and both decode back", () => {
  const f = tulikoFrame();
  assert.equal(f.heritable.length, 54); assert.equal(f.heritable.filter((l) => l.values).length, 40, "40 continuous"); assert.equal(f.heritable.filter((l) => !l.values).length, 14, "14 named");
  const type = tulikoType(f);
  const s = genomeString(f, type);
  assert.equal(s, "G1-S20v1-20A00XY1GC3A86100430R210861WQB0R4GC30R611GGC30R40861GC30R61GC30R6110G02HF"); assert.equal(s.length, 82);
  const bred = structuredClone(type);
  const step = (id, k) => stepValue(f.heritable.find((l) => l.id === id), k);
  Object.assign(bred.copies, {
    "form.ear-kind": ["lop", "lop"], "form.tail-length": [step("form.tail-length", 47), step("form.tail-length", 47)], "anatomy.tail-tip-form": ["tuft", "lantern"],
    "appearance.marking-switch": ["off", "on"], "appearance.marking-layout": ["bands", "masked"], "appearance.body-hue": [step("appearance.body-hue", 12), step("appearance.body-hue", 12)],
  });
  assert.equal(bred.copies["form.tail-length"][0], 0.79661); assert.equal(bred.copies["appearance.body-hue"][0], 0.20339);
  const b = genomeString(f, bred);
  assert.equal(b, "G1-S20v1-20A00SY1GC3A86188430R210861WQB0R4GC30R611GGC30R42R61GC30R61GF50R6190G02CJ"); assert.equal(b.length, 82);
  for (const [str, g] of [[s, type], [b, bred]]) { const d = decodeGenomeString(str, (sp, v) => (sp === 20 && v === 1 ? f : null)); assert.ok(d.ok, d.detail); assert.deepEqual(d.genome.copies, g.copies); }
});

test("the length claims of B.3: 23 to 26 characters for the Loika, 68 to 109 for the Tuikis, 64 to 101 for the Belatz, 81 to 129 for the Tuliko (the type, with its unequal cycle rate, is 83)", () => {
  const range = (f) => {
    let lo = 26, hi = 26;
    for (const l of f.heritable) { if (l.values) { lo += 1 + STEP_BITS; hi += 1 + 2 * STEP_BITS; } else { lo += 2 * l.bits; hi += 2 * l.bits; } }
    const open = `G1-S${f.species}v${f.version}-`.length;
    return [open + Math.ceil(lo / 5) + 2, open + Math.ceil(hi / 5) + 2];
  };
  assert.deepEqual(range(frameFor(1, 4)), [23, 26]); assert.deepEqual(range(frameFor(1, 5)), [25, 30], "the Loika at version 5 carries the crown's size, leaf count and form: two to four characters more"); assert.deepEqual(range(byName("S01", 6)), [27, 33], "and at version 6 the ear length, one more blended locus: two to three characters more"); assert.deepEqual(range(byName("S01")), [38, 53], "and at version 8, the language frame: its seventeen open loci, eleven to twenty characters more"); assert.deepEqual(range(byName("S03", 5)), [68, 109]); assert.deepEqual(range(byName("S09", 4)), [64, 101]); assert.deepEqual(range(tulikoFrame()), [81, 129]);
  // and the extremes are reached: all blends equal, none equal
  for (const f of [frameFor(1, 4), frameFor(1, 5), byName("S01", 6), byName("S01"), byName("S03", 5), byName("S09", 4), tulikoFrame()]) {
    const [lo, hi] = range(f), eq = { copies: {} }, ne = { copies: {} };
    for (const l of f.heritable) { const p = l.pool ?? l.alleles; eq.copies[l.id] = [p[0], p[0]]; ne.copies[l.id] = l.values ? [l.alleles[0], l.alleles.at(-1)] : [p[0], p[0]]; }
    assert.equal(genomeString(f, eq).length, lo, `${f.id} shortest`); assert.equal(genomeString(f, ne).length, hi, `${f.id} longest`);
  }
});

// --- every frame in the registry --------------------------------------------------------------------------------------------------------------------
test("a round trip for every frame in the registry (the real ones at every version, the legacy frames and the two synthetic test frames): string, decode, the same copies, and the same string again", () => {
  assert.equal(FRAMES_LIST.length, 16 * 3 + 1 + 1 + 1 + 3 + 1 + 2 + 19 + 3 + 2, "sixteen species at frame versions 2, 3 and 4, the Tuikis and the Loika at 5, the Loika at 6, S17 to S19 at 6, the Tuliko at 1, the Igara and the Peplos at 5, the nineteen kinds at 8, the three legacy frames and the two synthetic frames");
  let n = 0;
  for (const f of FRAMES_LIST) {
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = genomeOf(f, seed * 7919 + f.species * 31 + f.version), s = genomeString(f, g);
      assert.match(s, new RegExp(`^G1-S${f.species}v${f.version}-[0-9A-Z]+$`));
      const d = decodeGenomeString(s);
      assert.ok(d.ok, `${f.id} ${f.species}.${f.version} seed ${seed}: ${d.detail}`); assert.equal(d.frame, f);
      assert.ok(sameCopies(f, d.genome.copies, g.copies), `${f.id} ${f.species}.${f.version} seed ${seed}: the same copies`);
      assert.equal(genomeString(f, d.genome), s, `${f.id} ${f.species}.${f.version}: the same string`); n++;
    }
  }
  assert.equal(n, FRAMES_LIST.length * 5);
  // the test frame of the Tuliko too
  const t = tulikoFrame();
  for (const seed of [1, 2, 3]) { const g = genomeOf(t, seed), s = genomeString(t, g), d = decodeGenomeString(s, () => t); assert.ok(d.ok, d.detail); assert.ok(sameCopies(t, d.genome.copies, g.copies)); }
});

test("the string is a spelling of what the stamp code holds: a string and a read mask make the stamp code, and a stamp code with every chapter read makes the string", () => {
  for (const f of [LOIKA(), byName("S03", 5), byName("S09", 4), byName("S17")]) {
    const open = f.chapters.filter((c) => !c.sealed).map((c) => c.name), readMask = open.length ? f.chapters.reduce((m, c, i) => (c.sealed ? m : m + 2 ** i), 0) : 0;
    const g = genomeOf(f, 99 + f.species), s = genomeString(f, g), d = decodeGenomeString(s);
    // string -> stamp code (the open chapters read; a sealed chapter is in the string and not in the code)
    const code = stampCode(f, { copies: d.genome.copies, readMask }), back = decodeStampCode(code);
    assert.ok(back.ok, back.detail);
    for (const ch of f.chapters) for (const l of ch.loci) if (!ch.sealed) assert.deepEqual(back.genome.copies[l.id], g.copies[l.id], `${f.id} ${l.id}`);
    // a stamp code with every chapter read -> the string, exactly (only for a frame with no sealed chapter)
    if (f.chapters.every((c) => !c.sealed)) assert.equal(genomeString(f, back.genome), s, `${f.id}: stamp code to string`);
  }
});

// --- refusals ------------------------------------------------------------------------------------------------------------------------------------------
test("a changed character is refused, in every position of the body and the check, for every other character of the alphabet", () => {
  for (const f of [LOIKA(), tulikoFrame()]) {
    const s = genomeString(f, f.id === "S20" ? tulikoType(f) : { copies: LOIKA_TYPE }), o = opening(s), b = body(s);
    const lookup = () => f;
    let tried = 0;
    for (let i = 0; i < b.length; i++) for (const c of CODE_ALPHABET) {
      if (c === b[i]) continue;
      const d = decodeGenomeString(o + b.slice(0, i) + c + b.slice(i + 1), lookup);
      assert.equal(d.ok, false, `${f.id}: position ${i} -> ${c}`); assert.equal(d.stage, "check", `${f.id}: position ${i} -> ${c} names the check`); tried++;
    }
    assert.equal(tried, b.length * 31);
  }
});

test("two swapped neighbours are refused, in the body and in the check, wherever the two characters differ", () => {
  let swaps = 0;
  for (const f of [LOIKA(), byName("S03", 5), byName("S09", 4), tulikoFrame()]) {
    for (const seed of [1, 2, 3]) {
      const g = f.id === "S20" && seed === 1 ? tulikoType(f) : genomeOf(f, seed + 40), s = genomeString(f, g), o = opening(s), b = body(s);
      for (let i = 0; i + 1 < b.length; i++) {
        if (b[i] === b[i + 1]) continue;
        const d = decodeGenomeString(o + b.slice(0, i) + b[i + 1] + b[i] + b.slice(i + 2), () => f);
        assert.equal(d.ok, false, `${f.id} seed ${seed}: swap at ${i}`); assert.equal(d.stage, "check"); swaps++;
      }
    }
  }
  assert.ok(swaps > 400);
});

test("the opening must agree with the bits: another species, another frame version, another format number in the text", () => {
  const s = genomeString(LOIKA(), { copies: LOIKA_TYPE }), b = body(s);
  assert.equal(decodeGenomeString(`G1-S2v4-${b}`).stage, "header"); assert.equal(decodeGenomeString(`G1-S1v3-${b}`).stage, "header"); assert.equal(decodeGenomeString(`G1-S1v14-${b}`).stage, "header");
  assert.match(decodeGenomeString(`G1-S1v3-${b}`).detail, /disagrees/);
});

test("an unknown format is refused before anything is read: G2, G0 and G15, with a valid body or not", () => {
  const s = genomeString(LOIKA(), { copies: LOIKA_TYPE }), b = body(s);
  for (const n of [0, 2, 3, 15, 16, 99]) { const d = decodeGenomeString(`G${n}-S1v4-${b}`); assert.equal(d.ok, false); assert.equal(d.stage, "header"); assert.match(d.detail, new RegExp(`G${n}`)); }
  // a string whose bits say format 2 under an honest G2 opening and a valid check: still a format this reader does not know
  const g2 = assemble({ format: 2, species: 1, version: 4, payload: payloadOf(LOIKA(), { copies: LOIKA_TYPE }) });
  assert.equal(g2.startsWith("G2-S1v4-"), true); const d = decodeGenomeString(g2); assert.equal(d.ok, false); assert.equal(d.stage, "header");
  // and a G1 opening over bits that say format 2 disagrees
  assert.equal(decodeGenomeString(assemble({ format: 2, species: 1, version: 4, payload: [], open: "G1-S1v4-" })).stage, "header");
});

test("an unknown frame version or species is refused with the studio's words: valid check, no frame", () => {
  const payload = payloadOf(LOIKA(), { copies: LOIKA_TYPE });
  for (const [species, version] of [[1, 99], [1, 7], [1, 0], [999, 1], [20, 2], [3000, 1], [21, 1], [22, 1]]) {
    const d = decodeGenomeString(assemble({ species, version, payload }));
    assert.equal(d.ok, false, `${species}.${version}`); assert.equal(d.stage, "species", `${species}.${version}`); assert.match(d.detail, /isn't in the studio yet/);
  }
});

test("not a genome string: a stamp code, a name code, empty text, a characters outside the alphabet, and a string too short", () => {
  const f = LOIKA();
  const code = stampCode(f, { copies: LOIKA_TYPE, readMask: 15 });
  for (const text of ["", "   ", "hello", code, "ABCDEFGHJ", "G-S1v4-0000", "G1S1v4-0000", "G1-S1-0000", "S1v4-0F-00", null, undefined, "G1-S1v4"]) { const d = decodeGenomeString(text); assert.equal(d.ok, false, String(text)); assert.equal(d.stage, "string", String(text)); }
  for (const bad of ["U", "!", "é", "*", "?", "/"]) { const s = genomeString(f, { copies: LOIKA_TYPE }); const d = decodeGenomeString(s.slice(0, 12) + bad + s.slice(13)); assert.equal(d.ok, false); assert.equal(d.stage, "string"); assert.match(d.detail, /not a string character/); }
  assert.equal(decodeGenomeString("G1-S1v4-").stage, "string"); assert.equal(decodeGenomeString("G1-S1v4-0").stage, "string"); assert.equal(decodeGenomeString("G1-S1v4-00").stage, "string");
  assert.equal(decodeGenomeString("G1-S1v4-000").stage, "string", "a body shorter than the header");
});

test("the wrong length for the frame is refused: too short, too long, padding that is not empty", () => {
  const f = LOIKA(), s = genomeString(f, { copies: LOIKA_TYPE }), o = opening(s), b = body(s).slice(0, -2);
  // too short: whole characters missing at the end, with a valid check over what is left
  for (let cut = 1; cut <= 4; cut++) { const d = decodeGenomeString(withCheck(o, b.slice(0, b.length - cut))); assert.equal(d.ok, false, `cut ${cut}`); assert.equal(d.stage, "length"); }
  // too long: five more bits or more
  for (const extra of ["0", "00", "Z", "ZZZZ"]) { const d = decodeGenomeString(withCheck(o, b + extra)); assert.equal(d.ok, false, extra); assert.equal(d.stage, "length"); }
  // padding: the last character's spare bits set (the Loika type is 73 bits of 75, so the last character holds two spare bits)
  const last = idx(b.at(-1)), flipped = CODE_ALPHABET[last | 1];
  const dirty = decodeGenomeString(withCheck(o, b.slice(0, -1) + flipped)); assert.equal(dirty.ok, false); assert.equal(dirty.stage, "length"); assert.match(dirty.detail, /padding/);
  assert.ok(decodeGenomeString(withCheck(o, b)).ok, "and the untouched body is fine");
});

test("a code with no look is refused: a named code past the alleles, a step past the 59, equal copies written the long way", () => {
  const f = LOIKA(), payload = payloadOf(f, { copies: LOIKA_TYPE });
  // body-palette has 11 alleles in 4 bits: codes 11 to 15 are no colour
  for (const code of [11, 15]) { const p = [...toBits(code, 4), ...payload.slice(4)]; const d = decodeGenomeString(assemble({ species: 1, version: 4, payload: p })); assert.equal(d.ok, false); assert.equal(d.stage, "look"); assert.match(d.detail, /body-palette/); }
  // the eye (3 alleles, then 60 steps): code 63 is past step 59
  const at = 8 + 2 + 2 + 2;  // palette (8), switch (2), layout (2), crown (2): the eye starts here
  assert.deepEqual(payload.slice(at, at + 7), [1, ...toBits(2, 6)], "the huge/huge eye: equal, code 2");
  for (const code of [63, 62 + 1]) { const p = [...payload.slice(0, at), 1, ...toBits(code, 6), ...payload.slice(at + 7)]; const d = decodeGenomeString(assemble({ species: 1, version: 4, payload: p })); assert.equal(d.ok, false); assert.equal(d.stage, "look"); }
  const top = [...payload.slice(0, at), 1, ...toBits(3 + 59, 6), ...payload.slice(at + 7)];     // code 62 is step 59: the last, fine
  assert.ok(decodeGenomeString(assemble({ species: 1, version: 4, payload: top })).ok);
  // equal copies in the long form: one genome, one string
  const long = [...payload.slice(0, at), 0, ...toBits(2, 6), ...toBits(2, 6), ...payload.slice(at + 7)];
  const d = decodeGenomeString(assemble({ species: 1, version: 4, payload: long })); assert.equal(d.ok, false); assert.equal(d.stage, "look"); assert.match(d.detail, /short form/);
});

test("the encoder refuses a missing locus, one copy, three copies, a blend off the step and a look the frame does not know; it never rounds or invents", () => {
  const f = LOIKA(), g = (over) => ({ copies: { ...LOIKA_TYPE, ...over } });
  assert.throws(() => genomeString(f, { copies: { ...LOIKA_TYPE, "movement.cycle-rate": undefined } }), /cycle-rate: two copies required/);
  assert.throws(() => genomeString(f, { copies: Object.fromEntries(Object.entries(LOIKA_TYPE).filter(([k]) => k !== "energy.action-efficiency")) }), /action-efficiency: two copies required/);
  assert.throws(() => genomeString(f, g({ "anatomy.crown-presence": ["on"] })), /two copies required/);
  assert.throws(() => genomeString(f, g({ "anatomy.crown-presence": ["on", "on", "on"] })), /two copies required/);
  assert.throws(() => genomeString(f, g({ "growth.exterior-eye-size-ratio": [0.3, 0.3] })), /0.3 is not on the blend step/);
  assert.throws(() => genomeString(f, g({ "growth.exterior-eye-size-ratio": [0.378983, 0.38] })), /copy 2: 0.38 is not on the blend step/);
  assert.throws(() => genomeString(f, g({ "appearance.body-palette": ["charcoal", "mauve"] })), /unknown look mauve/);
  assert.throws(() => genomeString(f, g({ "appearance.marking-layout": ["bands", "masked"] })), /unknown look masked/, "a frame of version 4 does not know the pin 11 layouts");
  assert.throws(() => genomeString(f, {}), /no copies/);
  assert.throws(() => genomeString({ ...f, species: 4096 }, { copies: LOIKA_TYPE }), /does not fit/); assert.throws(() => genomeString({ ...f, version: 1024 }, { copies: LOIKA_TYPE }), /does not fit/);
  // a record of the shape the workbench saves (mb-genome/2: `loci`) works as well as the stamp's `copies`
  assert.equal(genomeString(f, { loci: LOIKA_TYPE }), "G1-S1v4-200G201KGG010049B");
});

// --- spelling --------------------------------------------------------------------------------------------------------------------------------------------
test("a reader ignores case, spaces, dots and dashes in the body, and reads O as 0 and I and L as 1", () => {
  const f = LOIKA(), g = { copies: { ...LOIKA_TYPE, "appearance.body-palette": ["charcoal", "ash"] } }, s = genomeString(f, g);
  const o = opening(s), b = body(s), grouped = b.match(/.{1,5}/g).join(" ");
  for (const text of [s.toLowerCase(), `${o}${grouped}`, `  ${o}${b.match(/.{1,5}/g).join("-")}\n`, `${o}${b.match(/.{1,5}/g).join(".")}`, `${o}${b.slice(0, 7)}\n${b.slice(7)}`]) {
    const d = decodeGenomeString(text); assert.ok(d.ok, `${JSON.stringify(text)}: ${d.detail}`); assert.deepEqual(d.genome.copies, g.copies);
  }
  // 1 and 0 spelled the other ways: find a string with a 0 or a 1 in its body
  const h = genomeString(f, { copies: LOIKA_TYPE }), hb = body(h);
  const alt = hb.replace(/0/g, "O").replace(/1/g, "l");
  assert.notEqual(alt, hb); assert.ok(decodeGenomeString(opening(h) + alt).ok);
  assert.ok(decodeGenomeString(opening(h) + hb.replace(/1/g, "I")).ok);
});

test("the synthetic test frames stand at species 4094 and 4095, so S21 and S22 stay free, and they round-trip", () => {
  assert.deepEqual(TEST_SPECIES, [4094, 4095]);
  const a = byName("future100"), b = byName("future150");
  assert.equal(a.species, 4094); assert.equal(b.species, 4095); assert.ok(a.synthetic && b.synthetic);
  assert.deepEqual(FRAMES_LIST.filter((f) => f.synthetic).map((f) => f.species), [4094, 4095]);
  assert.deepEqual(FRAMES_LIST.filter((f) => f.species >= 4000).map((f) => f.id), ["future100", "future150"], "numbers 4000 to 4095 are kept for tests; only the two synthetic frames stand there");
  assert.equal(frameFor(21, 1) ?? null, null); assert.equal(frameFor(22, 1) ?? null, null);
  assert.equal(frameFor(4094, 1), a); assert.equal(frameFor(4095, 1), b);
  for (const f of [a, b]) { const g = genomeOf(f, 5), s = genomeString(f, g); assert.ok(s.startsWith(`G1-S${f.species}v1-`)); assert.ok(decodeGenomeString(s).ok); }
  assert.ok(FRAMES_LIST.every((f) => f.species <= 4095), "twelve bits");
});

test("no unread chapter and no sealed chapter goes missing: the string holds every heritable locus of the frame, sealed chapters too, and only those", () => {
  const f = byName("S09", 4);          // the Belatz has a sealed chapter
  assert.ok(f.chapters.some((c) => c.sealed));
  const g = genomeOf(f, 3), d = decodeGenomeString(genomeString(f, g));
  assert.deepEqual(Object.keys(d.genome.copies), f.heritable.map((l) => l.id));
  for (const ch of f.chapters.filter((c) => c.sealed)) for (const l of ch.loci) assert.deepEqual(d.genome.copies[l.id], g.copies[l.id]);
  // an extra key in the genome (a locked locus) is not written: the string is the heritable loci and nothing else
  const withLocked = { copies: { ...g.copies, "development.symmetry": ["radial", "radial"] } };
  assert.equal(genomeString(f, withLocked), genomeString(f, g));
});

// --- inspect.html ----------------------------------------------------------------------------------------------------------------------------------------
test("inspect.html reads both: a genome string (every chapter, and the stamp code beside it), a stamp code (what was read), and says kindly what a name code or anything else is", async () => {
  const els = { out: { textContent: "" }, code: { value: "", addEventListener() {} }, read: { handler: null, addEventListener(ev, fn) { if (ev === "click") this.handler = fn; } } };
  globalThis.document = { getElementById: (id) => els[id] };
  globalThis.location = { search: "" };
  await import("../inspect.mjs");
  const run = (text) => { els.code.value = text; els.read.handler(); return els.out.textContent; };
  const f = byName("S09", 4), g = genomeOf(f, 11), s = genomeString(f, g);
  const shown = run(s);
  assert.match(shown, /^Belatz, species 9, frame version 4, genome string format G1/);
  for (const ch of f.chapters) assert.ok(shown.includes(ch.sealed ? `${ch.name} (sealed)` : ch.name), `chapter ${ch.name}`);
  for (const l of f.heritable) assert.ok(shown.includes(`${l.id}: ${g.copies[l.id].join(" / ")}`), l.id);
  const openMask = f.chapters.reduce((m, c, i) => (c.sealed ? m : m + 2 ** i), 0);
  assert.ok(shown.includes(stampCode(f, { copies: g.copies, readMask: openMask })), "the stamp code of the same genome is shown beside the string");
  const l4 = LOIKA(), code = stampCode(l4, { copies: LOIKA_TYPE, readMask: 0b0011 });
  const stamp = run(code);
  assert.match(stamp, /^Loika, species 1, frame version 4, stamp format 2, 25×25 cells\nRead: Coat, Face\nNot in the stamp: Movement, Stamina/);
  assert.ok(stamp.includes("appearance.body-palette: charcoal / charcoal") && !stamp.includes("movement.cycle-rate"));
  assert.match(run("  g1-s1v4-200g201kgg010049b "), /^Loika, species 1/, "case and edge spaces do not matter");
  assert.match(run("G1-S1v4-200G201KGG010048B"), /^No read: .*\(check\)\.$/);
  assert.match(run("G7-S1v4-200G201KGG010049B"), /^No read: format G7 is not one this reader knows .*\(header\)\.$/);
  assert.match(run("S1v4-0F-"), /^No read: .*\./);
  assert.match(run("A1B2C3D4E"), /a name code names a mibi; it holds no genes/);
  assert.match(run("hello"), /neither a genome string/);
  delete globalThis.document; delete globalThis.location;
});
