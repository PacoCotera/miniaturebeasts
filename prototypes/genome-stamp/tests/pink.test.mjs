// Catalogue 15 (owner 2026-11-20, the Igara): pale pink and deep pink are appended to the body and second colour lists of S10's frame 5, and to no other frame. The registry is append-only
// (`--replace 10.5` once), the bit widths stay 4 and 3, and a print made before decodes the same.   node --test tests/pink.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { FRAME_DATA } from "../src/frames-data.mjs";
import { byName } from "../src/frames.mjs";
import { stampCode, decodeStampCode, sameGenome } from "../src/codec.mjs";

const BODY = "appearance.body-palette", SECOND = "appearance.underside-palette";
// S10 frame 5's lists as they stood before the pinks
const OLD_BODY = ["charcoal", "russet", "jade", "lagoon", "cobalt", "periwinkle", "plum", "raspberry", "coral", "marigold", "ash"];
const OLD_SECOND = ["cream", "slate", "milk-mint", "ice", "butter", "peach"];
const lociOf = (f) => f.chapters.flatMap((c) => c.loci);

test("the pinks are appended to S10 frame 5's colour lists and to no other frame's", () => {
  for (const f of FRAME_DATA.frames) {
    const listed = lociOf(f).filter((l) => l.alleles.some((a) => /-pink$/.test(a)));
    if (f.species === 10 && f.version === 5) assert.deepEqual(listed.map((l) => l.id), [BODY, SECOND]);
    else assert.deepEqual(listed, [], `${f.id} ${f.species}.${f.version} lists no pink`);
  }
  const f = FRAME_DATA.frames.find((x) => x.species === 10 && x.version === 5);
  assert.deepEqual(lociOf(f).find((l) => l.id === BODY).alleles, [...OLD_BODY, "pale-pink", "deep-pink"]);
  assert.deepEqual(lociOf(f).find((l) => l.id === SECOND).alleles, [...OLD_SECOND, "pale-pink", "deep-pink"]);
});

test("bit widths stay 4 (body) and 3 (second colour): the frame's payload is the size it was", () => {
  const f = byName("S10", 5);
  assert.equal(f.heritable.find((l) => l.id === BODY).bits, 4);
  assert.equal(f.heritable.find((l) => l.id === SECOND).bits, 3);
});

test("a print made before the pinks (russet and peach, every old allele) decodes the same, and a pink pair round-trips", () => {
  const f = byName("S10", 5), readAll = 2 ** f.chapters.length - 1;
  const base = {};
  for (const l of f.heritable) { const p = l.pool ?? l.alleles; base[l.id] = [p[0], p[p.length - 1]]; }
  const old = { ...base, [BODY]: ["russet", "ash"], [SECOND]: ["peach", "butter"] };
  // every old allele keeps its index: the code of an old genome reads back as the old genome
  for (const a of OLD_BODY) for (const b of OLD_SECOND) {
    const g = { ...base, [BODY]: [a, "ash"], [SECOND]: [b, "peach"] }, code = stampCode(f, { copies: g, readMask: readAll }), back = decodeStampCode(code);
    assert.ok(back.ok, back.detail); assert.deepEqual(back.genome.copies[BODY], [a, "ash"]); assert.deepEqual(back.genome.copies[SECOND], [b, "peach"]);
  }
  const code = stampCode(f, { copies: old, readMask: readAll }), back = decodeStampCode(code);
  assert.ok(sameGenome(f, { copies: old, species: 10, version: 5, readMask: readAll }, back.genome));
  const pink = { ...base, [BODY]: ["pale-pink", "deep-pink"], [SECOND]: ["deep-pink", "pale-pink"] }, pb = decodeStampCode(stampCode(f, { copies: pink, readMask: readAll }));
  assert.ok(pb.ok, pb.detail); assert.deepEqual(pb.genome.copies[BODY], ["pale-pink", "deep-pink"]); assert.deepEqual(pb.genome.copies[SECOND], ["deep-pink", "pale-pink"]);
});
