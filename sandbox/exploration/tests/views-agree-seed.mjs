// The generator 7 views audit for one seed (see views-agree.test.mjs): every land cell, the mismatches stay a minority of the sides (seed 7 alone: 4042 of 29118; the lead has the numbers:
// cliff and water sides the IR still gives a way in). The test used to run seeds 1-3 in one tally (about 9 minutes); each seed is now its own file (views-agree-seed1/2/3.test.mjs), so the
// CI shards can share the time. The floors are a third of the old three-seed floors (cells > 600, sides > 2400), and the 20% bar holds for each seed.
import test from "node:test";
import assert from "node:assert/strict";
import { softGround, bankEdges } from "../src/world.mjs";
import { realm7 } from "../src/gen7/region.mjs";
import { cellIR } from "../src/gen7/place.mjs";
import { ATLAS } from "../src/regions.mjs";
import { newTally, auditGen7, report } from "../tools/views-audit.mjs";

export function auditSeed(seed) {
  test(`the audit: every land cell of generator 7, seed ${seed}: the mismatches stay a minority of the sides`, { timeout: 900000 }, () => {
    const t = newTally();
    auditGen7(seed, t, { realm7, cellIR, softGround, bankEdges, ATLAS });
    assert.ok(t.cells > 200 && t.sides > 800, "the sweep covers the world: " + t.cells + " cells");
    assert.ok(t.bad < 0.2 * t.sides, "\n" + report(t, "generator 7, seed " + seed));
  });
}
