// The map room's rules are the Companion's: for the same save the Station's reach, its valid starts and its signs' order are the page's own, over three seeds.
//   node --test prototypes/exploration/tests/map-rules-shared.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { mapOf } from "../../station/src/map-read.mjs";
import { SIGN_ORDER, signBook, pickSigns } from "../src/logic/map-rules.mjs";

const SEEDS = [3, 17, 41];

test("three seeds: the Station's reach for a cell equals the Companion's, at both tiers, and every start it accepts is one the place screen accepts", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  for (const seed of SEEDS) {
    p.run(`newWorld(${seed})`);
    // a save that has seen a block of land round the first light: not a first set-out
    p.run(`(() => { const s = cxy(G.spawns[0]); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (Math.abs(x - s.x) <= 5 && Math.abs(y - s.y) <= 5) S.seen.rev[y * MW + x] = 1; })()`);
    for (const tier of [1, 2]) {
      p.run(`S.tier = ${tier}`);
      const sv = JSON.parse(JSON.stringify(p.run(`serialize(S)`)));
      sv.tier = tier;
      const m = mapOf(sv);
      assert.ok(m, "seed " + seed + ": the save is a generator 7 world");
      assert.equal(m.range, p.run(`TIER[${tier}].range`));
      for (let c = 0; c < 320; c++) {
        if (!m.valid(c)) continue;
        assert.deepEqual([...m.reach(c)].sort((a, b) => a - b), p.run(`reachCells(${c}, TIER[${tier}].range).sort((a, b) => a - b)`), `seed ${seed} tier ${tier} cell ${c}: the same reach`);
      }
      for (let c = 0; c < 320; c++) assert.equal(m.valid(c), p.run(`placeValid(${c})`), `seed ${seed} cell ${c}: a start the room accepts is one the place screen accepts, and no other`);
    }
  }
});

test("a new world: no cell is known, so the room's valid starts are the lights alone", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  p.run(`newWorld(5)`);
  const sv = JSON.parse(JSON.stringify(p.run(`serialize(S)`))), m = mapOf(sv), lights = p.run(`startPlaces().slice()`);
  assert.equal(m.first, true);
  for (let c = 0; c < 320; c++) assert.equal(m.valid(c, lights), lights.includes(c));
});

test("the last start crosses the save as the region's map.lastPos", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  p.run(`newWorld(9)`);
  p.run(`S.seen.rev[G.spawns[0]] = 1; S.ui.lastPos = G.spawns[0]`);
  const sv = JSON.parse(JSON.stringify(p.run(`serialize(S)`)));
  assert.equal(mapOf(sv).lastPos, p.run(`G.spawns[0]`));
});

test("the place screen's cursor rests as built: the last start, even when a save still holds an old plan field", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  p.run(`newWorld(9)`);
  p.run(`(() => { const s = cxy(G.spawns[0]); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (Math.abs(x - s.x) <= 4 && Math.abs(y - s.y) <= 4) S.seen.rev[y * MW + x] = 1; S.ui.sel = 0; })()`);
  const cells = p.run(`(() => { const o = []; for (let c = 0; c < MW * MH; c++) if (placeValid(c)) o.push(c); return o; })()`);
  assert.ok(cells.length > 4);
  const last = cells[0], planned = cells[cells.length - 1];
  p.run(`S.ui.lastPos = ${last}; chooseType()`);
  assert.equal(p.run(`S.ui.cur`), last, "no plan: the last start, as built");
  p.run(`S.st = { wid: S.wid, plan: { region: S.here, start: ${planned}, aim: null, expN: 1 } }; chooseType()`);
  assert.equal(p.run(`S.ui.cur`), last, "an old plan field in the save is ignored: as built");
});

test("the marks: one kind at a cell is said once, in the page's order, and the cap keeps every mark of priority 9 and up", () => {
  const b = signBook();
  b.add(4, "pin", 10); b.add(4, "pin", 10); b.add(4, "skull", 11); b.add(5, "t", 3); b.add(6, "t", 3); b.add(7, "t", 3); b.add(8, "t", 3);
  assert.equal(b.entry(4).list.length, 2);
  const kept = b.pick(10);   // cap max(3, 4): 3 below priority 9 are left of the 4 tracks, the two priority 10 and 11 marks stay
  assert.deepEqual(kept.map(e => e.c), [4, 5, 6, 7]);
  assert.deepEqual(pickSigns([{ c: 1, pri: 3, list: [] }, { c: 2, pri: 9, list: [] }], 0).map(e => e.c), [2, 1]);
  assert.deepEqual(SIGN_ORDER.slice(0, 3), ["skull", "depot", "b"]);
});
