// tuliko-soft-7-1: generation 7 places lay the Tuliko's tiles (T.WADE mud, T.SCREE) where softGround names a soft cell or edge; the foot reach of every place is what it was without them.
//   node --test prototypes/exploration/tests/gen7-soft.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage, PLACES } from "./page-harness.mjs";
import { MW, MH, T_BLOCK, T, softGround } from "../src/world.mjs";
import { genRegion7 } from "../src/gen7/region.mjs";
import { bakedCell, layout7 } from "../src/world7.mjs";

const mibi = (id, sp) => ({ id, name: "Fig", sp, born: 0, outings: 0, notches: 2, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null });
const walk7 = (seed, sp) => { const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true; S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; S.mibis = [${JSON.stringify(mibi(1, sp))}]; S.carried = [1]; S.lead = 1; startExpedition('weather', G.spawns[0])`); return p; };
const J = (p, src) => JSON.parse(p.run(`JSON.stringify(${src})`));
const standX = "{ key: S.exp.patch.key, lay: curLay(), live: curLive(), P: S.exp.patch }";

test("a wade cell of generation 7 holds mud across its water: the Tuliko stands on it, a Loika does not, and the west way in joins the east with it open", () => {
  let seen = 0, stood = 0;
  for (const seed of [7, 13, 42]) {
    const p = walk7(seed, 19), other = walk7(seed, 0);
    const cells = J(p, "(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.soft.wade[c]) out.push(c); return out; })()");
    for (const c of cells.slice(0, 3)) {
      for (const q of [p, other]) q.run(`S.exp.start = ${c}; S.exp.pos = ${c}; S.exp.range = 4; enterPatch(); if (RT.view) endView();`);
      const at = J(p, "(() => { const l = curLay(); const i = l.tiles.findIndex(t => t === T.WADE); return i < 0 ? null : [i % l.w, (i / l.w) | 0]; })()");
      assert.ok(at, `seed ${seed} cell ${c} lays mud`); seen++;
      const [x, y] = at;
      if (J(p, "!!curLive().pt")) { stood++; assert.ok(J(p, `canStand(${standX}, ${x}, ${y}, curLive().pt)`), "the Tuliko stands on the mud"); }
      if (J(other, "!!curLive().pt")) assert.ok(!J(other, `canStand(${standX}, ${x}, ${y}, curLive().pt)`), "a Loika stays off it");
    }
  }
  assert.ok(seen >= 3 && stood >= 1, `mud places seen: ${seen}, with the Tuliko standing on it: ${stood}`);
});

test("a scree edge of generation 7 is crossed in the same two lines from both cells, and the Tuliko lands on the tile just inside", () => {
  let seen = 0;
  for (const seed of [7, 13]) {
    const p = walk7(seed, 19), edges = J(p, "(() => { const out = []; for (let i = 0; i < 2 * MW * MH; i++) if (G.soft.scree[i]) out.push(i); return out; })()");
    for (const i of edges) {
      const a = i >> 1, dir = i & 1 ? "down" : "right", b = dir === "down" ? a + MW : a + 1, opp = dir === "down" ? "up" : "left";
      const ca = J(p, `(layout(String(${a})).cross || []).find(q => q.ei === ${i}) || null`), cb = J(p, `(layout(String(${b})).cross || []).find(q => q.ei === ${i}) || null`);
      if (!ca || !cb) continue;
      assert.equal(ca.dir, dir); assert.equal(cb.dir, opp); assert.equal(ca.s, cb.s, "the same lines from both cells");
      p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; mapStep(${JSON.stringify(dir)}); enterPatch(); if (RT.view) endView();`);
      assert.equal(J(p, "S.exp.pos"), b, "the Tuliko crosses the scree edge");
      assert.deepEqual(J(p, "[S.exp.patch.x, S.exp.patch.y]"), [cb.entry.x, cb.entry.y], "it lands just inside the crossing");
      if (++seen >= 6) break;
    }
  }
  assert.ok(seen >= 3, "scree crossings seen: " + seen);
});

test("soft tiles never change what the page reaches on foot: a place with them and the same place without have the same reach", () => {
  let cells = 0;
  for (const seed of [7, 42]) { const G = genRegion7(seed, 2, 2); G.soft = softGround(G, seed);
    for (let c = 0; c < MW * MH; c++) { if (!G.soft.wade[c] && !(G.soft.scree[c * 2] || G.soft.scree[c * 2 + 1])) continue;
      const b = bakedCell(PLACES.ctx, seed, [2, 2], c), on = layout7(PLACES.ctx, G, seed, [2, 2], String(c), undefined, undefined, b), off = layout7(PLACES.ctx, G, seed, [2, 2], String(c), undefined, undefined, { ir: { ...b.ir, soft: null }, place: b.place });
      cells++; assert.deepEqual([...on.reach], [...off.reach], `seed ${seed} cell ${c}`); assert.deepEqual([...on.compId], [...off.compId]);
      for (let i = 0; i < on.tiles.length; i++) if (on.tiles[i] !== off.tiles[i]) assert.ok(T_BLOCK[off.tiles[i]] && (on.tiles[i] === T.WADE || on.tiles[i] === T.SCREE), "only blocked tiles became soft"); } }
  assert.ok(cells >= 6, "cells compared: " + cells);
});
