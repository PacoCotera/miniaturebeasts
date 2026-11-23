// wild-marking-draw-1: a newly drawn wild Loika (draw version 2) carries the marking switch as two copies, each "on" at 0.35;
// a pod without dv (an old save) keeps the old draw exactly.
//   node --test prototypes/station/tests/wild-marking-draw.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, P_MARKING_ON, DRAW_V } from "../src/genome.mjs";
import { buildIndividual } from "../../species/framework/species.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const loika = JSON.parse(readFileSync(path.resolve(here, "../../species/frames/language/species-S01.json"), "utf8"));
const tuikis = JSON.parse(readFileSync(path.resolve(here, "../../species/frames/language/species-S03.json"), "utf8"));
setFrames([loika, tuikis]);
const M = "appearance.marking-switch";
const on = (g) => g.loci[M].filter((c) => c === "on").length;

test("the rate is one named constant, 0.35", () => { assert.equal(P_MARKING_ON, 0.35); assert.equal(DRAW_V, 2); });

test("1,000 seeded wild draws: about 12% show, 45% carry it hidden, 42% none", () => {
  const n = [0, 0, 0];
  for (let i = 0; i < 1000; i++) n[on(podGenome(frameOf("S01"), (i * 2654435761 + 12345) >>> 0, 2))]++;
  const none = n[0] / 10, hidden = n[1] / 10, shown = n[2] / 10;
  console.log(`shown ${shown}%, hidden carriers ${hidden}%, none ${none}%`);
  assert.ok(Math.abs(shown - 12.25) < 3 && Math.abs(hidden - 45.5) < 4 && Math.abs(none - 42.25) < 4);
});

test("the same seed gives the same Loika; she builds", () => {
  const a = podGenome(frameOf("S01"), 777, 2), b = podGenome(frameOf("S01"), 777, 2);
  assert.deepEqual(a, b);
  assert.equal(buildIndividual(frameOf("S01"), a).validation.status, "valid");
});

test("an old pod (no dv) keeps its old Loika; only the marking locus differs under dv 2", () => {
  for (const gs of [1, 2, 99, 4242, 123456789]) {
    const old = podGenome(frameOf("S01"), gs), same = podGenome(frameOf("S01"), gs, 1);
    assert.deepEqual(old, same);
    const neu = podGenome(frameOf("S01"), gs, 2);
    assert.equal(old.loci[M].length, 2);
    assert.equal(neu.loci[M].length, 2);
  }
});

test("other kinds are untouched by dv 2", () => {
  for (const gs of [1, 2, 99]) assert.deepEqual(podGenome(frameOf("S03"), gs, 2), podGenome(frameOf("S03"), gs));
});
