// Owner note mwv13edw56f3bf (#145): "that loika is stuck". His save: Hazel at her water haunt on a grass tile beside the pond (15,2), morning, patch 153.
// Her stand is plain grass with two free neighbours; what held her was `gone`: she had bolted to her "next haunt" (the same tile) and a day-time gone never ended, so no part of day moved her.
// Now a day-time gone lasts to the next part of day, then her routine has her: she is at the afternoon haunt after the part turns.
//   node --test prototypes/exploration/tests/owner-notes-fix-145.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";

const raw = readFileSync(new URL("./fixtures/owner-note-145-hazel.save.json", import.meta.url), "utf8");
test("his save: Hazel stands on land, can step off, and is at her next haunt once the part of day turns", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count", store: { "mb-save-v8": raw } });
  const me = () => JSON.parse(p.run(`JSON.stringify((c => ({ part: dayPart(), x: c.x, y: c.y, gone: !!c.gone, tile: curLay().tiles[c.y * curLay().w + c.x] === T.GRASS,
    free: [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => hauntFree(curLay(), S.exp.patch.key, c)(c.x + dx, c.y + dy)).length,
    want: (h => h && hauntStand(h, hauntFree(curLay(), S.exp.patch.key, c)))(hauntAt(c.ind.hs, c.ind.doings, dayPart())) }))(curLive().cr.find(c => c.ind && c.ind.name === 'Hazel')))`));
  const first = me();
  assert.deepEqual([first.x, first.y, first.tile], [15, 2, true], "she stands on a grass tile");
  assert.ok(first.free >= 1, "she can step off it");
  let last = first;
  for (let s = 157 + 25; s < 420; s += 25) { p.run(`S.day.spent = ${s}; advance('patch', { noise: 'act' })`); p.pass(1200); last = me(); }
  assert.equal(last.part, "afternoon");
  assert.equal(last.gone, false, "the day-time gone has ended");
  assert.deepEqual([last.x, last.y], [last.want.x, last.want.y], "she is at her afternoon haunt");
});
