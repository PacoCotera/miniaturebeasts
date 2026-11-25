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
  for (let s = 157 + 25; s < 420; s += 25) { p.run(`S.day.spent = ${s}; advance('patch', { noise: 'creep' })`); p.pass(1200); last = me(); }
  assert.equal(last.part, "afternoon");
  assert.deepEqual([last.x, last.y], [last.want.x, last.want.y], "she is at her afternoon haunt");
  assert.notDeepEqual([last.x, last.y], [15, 2], "she is no longer on her midday tile");
  assert.equal(last.gone, false, "the day-time gone has ended");   // first.part is morning; midday's haunt is her own tile 15,2 (#145 follow-up: released at the midday turn, so by the afternoon the player's noise is heard again and she may be alert)
});

// Follow-up (#145, 2): the gone ends at the FIRST part-of-day turn after the bolt, not one part later.
const hazel = p => JSON.parse(p.run(`JSON.stringify((c => ({ part: dayPart(), x: c.x, y: c.y, gone: !!c.gone, gp: c.gone ? c.gone.part : null }))(curLive().cr.find(c => c.ind && c.ind.name === 'Hazel')))`));
const load = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count", store: { "mb-save-v8": raw } });
const setGone = (p, part) => p.run(`curLive().cr.find(c => c.ind && c.ind.name === 'Hazel').gone = { t: { x: 15, y: 2 }, night: null${part ? `, part: '${part}'` : ""} }`);
const upTo = (p, part) => { let h = hazel(p); for (let s = 182; h.part !== part && s < 420; s += 5) { p.run(`S.day.spent = ${s}; advance('patch', { noise: 'act' })`); p.pass(1200); h = hazel(p); } return h; };
test("his save (a gone with no part) is released at the midday turn", () => {
  const p = load();
  setGone(p, null);
  const h = upTo(p, "midday");
  assert.equal(h.part, "midday");
  assert.equal(h.gone, false, "released at the midday turn");
});
test("bolted in the morning: released at the midday turn, not held through it", () => {
  const p = load();
  setGone(p, "morning");
  assert.equal(hazel(p).gone, true);
  const h = upTo(p, "midday");
  assert.equal(h.gone, false, "released at the midday turn");
});
test("bolted at midday: still gone within midday, released at the afternoon turn", () => {
  const p = load();
  upTo(p, "midday");
  setGone(p, "midday");
  p.run(`advance('patch', { noise: 'act' })`); p.pass(1200);
  assert.equal(hazel(p).gone, true, "held within midday");
  const h = upTo(p, "afternoon");
  assert.equal(h.gone, false, "released at the afternoon turn");
});
