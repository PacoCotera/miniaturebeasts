// The registry's frames and the cross's blended copies: a numeric copy on a continuous locus is
// stamped as its bin (the nearest named allele) and read back as that look; a legacy frame still
// encodes; every registry frame has a size.
//   node --test tests/bins.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { FRAMES_LIST, byName, frameFor } from "../src/frames.mjs";
import { encodeCells, parseMessage, sizeFor, copyIndex, copyLook, sameGenome, stampCode } from "../src/codec.mjs";

const roundTrip = (frame, genome) => {
  const { L, cells } = encodeCells(frame, genome);
  const bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0);
  return parseMessage(bits, L.N, { postmark: !!genome.postmark });
};

test("the registry carries the sixteen species of the workbench at frame version 2 beside the three legacy frames", () => {
  const v2 = FRAMES_LIST.filter((f) => f.version === 2 && !f.synthetic), legacy = FRAMES_LIST.filter((f) => f.legacy);
  assert.equal(v2.length, 16);
  assert.deepEqual(v2.map((f) => f.species), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(legacy.map((f) => f.id), ["hopper", "puffcap", "glowtail"]);
  for (const f of FRAMES_LIST) assert.ok(sizeFor(f), `${f.id} fits a size`);
  assert.equal(byName("S01").name, "Loika"); assert.equal(frameFor(1, 2).id, "S01"); assert.equal(frameFor(11, 1).id, "hopper");
});

test("a blended copy is stamped as its bin and read back as that look", () => {
  const f = byName("S01");
  const eye = f.heritable.find((l) => l.id === "growth.exterior-eye-size-ratio");
  assert.deepEqual(eye.values, [0.24, 0.32, 0.44]);
  assert.equal(copyLook(eye, 0.348), "large"); assert.equal(copyLook(eye, 0.4), "huge"); assert.equal(copyIndex(eye, "huge"), 2);
  const copies = { "appearance.marking-switch": ["on", "off"], "anatomy.crown-presence": ["on", "off"], "growth.exterior-eye-size-ratio": [0.348296, 0.348296], "movement.cycle-rate": [0.950671, 0.950671], "energy.action-efficiency": [0.983488, 0.983488] };
  const g = { species: 1, version: 2, read: f.chapters.map((c) => c.name), copies };
  const r = roundTrip(f, g);
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
