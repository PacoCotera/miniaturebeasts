// render-seen-1: the seen record (src/logic/seen.mjs). An old save's fields read once into it: every tile he had seen stays seen, nothing else opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as SN from "../src/logic/seen.mjs";
import * as R from "../src/logic/regions.mjs";

const N = 320;
test("seenFromOld: veil and a Call's kept rows join one record; been-in comes from the visit or the veil", () => {
  const old = { revealed: [0, 1, 1], visited: [0, 0, 1], called: { 2: 1 }, veil: { 5: [1, 2, 0], c9: [7] }, veilPre: { 5: [4, 0, 8], 6: [3, 3] } };
  const sn = SN.seenFromOld(old, N);
  assert.equal(sn.f, SN.SEEN_F);
  assert.deepEqual(sn.tile[5], [5, 2, 8], "the veil and the Call's rows are one");
  assert.deepEqual(sn.tile[6], [3, 3], "a Call's rows next door stay where they were lit");
  assert.equal(SN.intoPlace(sn, 5), true, "a place with a veil record was walked in");
  assert.equal(SN.intoPlace(sn, 6), false, "a Call next door never sets been-in");
  assert.equal(SN.beenIn(sn, 2), true); assert.equal(SN.walkedCell(sn, 2), true); assert.equal(SN.revealed(sn, 1), true);
  assert.deepEqual(old.veil[5], [1, 2, 0], "the input is not changed");
});

test("a save's map folds on mount; the old fields are gone; a second mount changes nothing", () => {
  const map = { revealed: new Array(N).fill(0), visited: new Array(N).fill(0), called: {}, veil: { 7: [1] }, signs: {}, pins: [], cells: {}, pods: [], cr: [], opened: {}, lastStorm: null };
  map.revealed[7] = 1; map.visited[7] = 1;
  const region = R.regionRecord({ n: 1, slot: [2, 2], seed: 1, gen: 7, opened: 1, map });
  const S = { here: "g1", regions: [region], veilPre: { 8: [2] } };
  R.mount(S, "g1");
  assert.ok(SN.isRecord(S.seen)); assert.equal(S.revealed, undefined); assert.equal(S.veil, undefined); assert.equal(S.veilPre, undefined);
  assert.deepEqual(S.seen.tile[8], [2]); assert.equal(S.seen.been[7], 1); assert.equal(S.seen.into[7], 1); assert.equal(S.seen.rev[7], 1);
  const o = JSON.parse(JSON.stringify(R.serialize(S))), back = JSON.parse(JSON.stringify(o)); R.mount(back, "g1");
  assert.deepEqual(back.seen, S.seen, "save and load: the same ground seen");
});

test("one record across a border: a Call from next door lights tiles the walk reads the same way", () => {
  const sn = SN.newSeen(N), lay = { key: "9", cell: 9, w: 6, h: 4, reach: new Uint8Array(24).fill(1), steep: null, tiles: new Uint8Array(24) };
  assert.equal(SN.liftWhere(sn, "9", 6, 4, 6, 0, (x, y) => x >= 6 && x <= 7 && y === 1), true);   // the caster stands in the place to the left: its tile 6 is this place's tile 0
  assert.equal(SN.unveiled(sn, lay, 1, 1), true, "tile 1 was inside the cast"); assert.equal(SN.unveiled(sn, lay, 4, 1), false, "tile 4 is outside the cast");
  const sn2 = SN.newSeen(N); SN.liftWhere(sn2, "9", 6, 4, 0, 0, (x, y) => x === 1 && y === 1);
  assert.equal(SN.unveiled(sn2, lay, 1, 1), true); assert.equal(SN.levelAt(sn2, lay, 1, 1), 1);
  const mask = SN.veilMask(sn2, lay, 6, 4, 0, 0);
  assert.equal(mask[1 * 6 + 1], 0, "the lifted tile is lit"); assert.equal(mask[0], 1, "a tile he has not seen is veiled, in a place he has not been in");
});
