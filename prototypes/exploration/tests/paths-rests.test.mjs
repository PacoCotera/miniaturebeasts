// paths-gen-build-3: every thin end of the road is a destination (src/gen7/keepers.mjs roadTips; the plan's `rests`).
//   node --test prototypes/exploration/tests/paths-rests.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { planOf } from "../src/gen7/places.mjs";
import { roadTips } from "../src/gen7/keepers.mjs";

test("seed 1, place 34,44: the road's leftover tip gets a road-rest whose yard meets it, off every set piece", () => {
  const p = planOf(1, 34, 44), r = (p.rests || [])[0];
  assert.ok(r, "a rest is seated");
  assert.equal(r.kind, "road-rest"); assert.deepEqual(r.block, []);
  for (const s of p.spots) assert.ok(r.x + r.w <= s.x || s.x + s.w <= r.x || r.y + r.h <= s.y || s.y + s.h <= r.y, "the box keeps off the set piece");
  assert.ok(r.end && r.end.x >= 1, "it carries the road's last tile");
});

test("seed 8, place 39,50: a road on a cliff top gets its hut on the top's grass, not across the cliff", () => {
  const p = planOf(8, 39, 50);
  assert.ok(p.keepers, "seated"); assert.equal(p.keepers.kind, "hut");
  for (let y = p.keepers.y; y < p.keepers.y + p.keepers.h; y++) for (let x = p.keepers.x; x < p.keepers.x + p.keepers.w; x++) assert.equal(p.topGrass[y * p.w + x], 1);
});

test("roadTips: a straight stub from the frame's edge ends in one tip, and a yard beside it covers the tip", () => {
  const w = 30, h = 30, cw = 28, ch = 28, terrain = new Uint8Array(w * h).fill(6), TVs = { PATH: 5, FORD: 20, BRIDGE: 21 };
  for (let y = 1; y <= 12; y++) terrain[y * w + 14] = 5;   // from the top edge down to y 12
  const a = { w, h, cw, ch, terrain };
  assert.deepEqual(roadTips(a, TVs, []), [[14, 12]]);
  assert.deepEqual(roadTips(a, TVs, [{ x: 12, y: 12, w: 5, h: 4 }]), []);
});
