// play-note-replay-1: a play note carries enough state to replay it (the pawn's last 20 steps, tier, partner, the Companion's save), so a crossing like owner bug #103 can be reproduced.
//   node --test prototypes/exploration/tests/play-note-replay.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

function world() {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(44); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.start = 41; S.exp.range = 4; S.exp.pos = 27; enterPatch(); if (RT.view) endView(); S.exp.patch.x = 3; S.exp.patch.y = 21;`);
  return p;
}
const tile = (p) => p.run("S.exp.patch.x + ',' + S.exp.patch.y");

test("a note taken after a scripted walk carries the last 20 steps, and replaying them from the first one's tile ends on the same tile", () => {
  const p = world();
  const dirs = ["right", "right", "right", "right", "right", "right", "right", "right", "up", "down"];
  for (const d of dirs) p.run(`patchStep('${d}', 'tap');`);
  const note = JSON.parse(p.run("JSON.stringify(playNoteState())"));
  const r = note.replay;
  assert.equal(r.v, 1);
  assert.equal(r.tier, 2);
  assert.equal(r.steps.length, dirs.length);
  assert.ok(r.steps.some((s) => !s.moved && s.check), "a refused step names the check that stopped it");
  assert.ok(r.steps.every((s) => typeof s.check === "string" && s.check && Array.isArray(s.from) && Array.isArray(s.to)));
  assert.equal(r.patch.x + "," + r.patch.y, tile(p));
  assert.ok(typeof r.save === "string", "the Companion's save for the slot");
  // replay: a fresh page, put at the first step's tile, runs the same directions
  const q = world();
  q.run(`S.exp.patch.x = ${r.steps[0].from[0]}; S.exp.patch.y = ${r.steps[0].from[1]};`);
  for (const s of r.steps) q.run(`patchStep('${s.dir}', 'tap');`);
  assert.equal(tile(q), r.patch.x + "," + r.patch.y, "the replay ends on the note's tile");
  const again = JSON.parse(q.run("JSON.stringify(playNoteState().replay.steps)"));
  assert.deepEqual(again.map((s) => [s.dir, s.from, s.to, s.moved, s.check]), r.steps.map((s) => [s.dir, s.from, s.to, s.moved, s.check]), "and every step passes or stops on the same check");
});

test("only the last 20 steps are kept", () => {
  const p = world();
  for (let i = 0; i < 30; i++) p.run(`patchStep('${i % 2 ? "left" : "up"}', 'tap');`);
  assert.equal(JSON.parse(p.run("JSON.stringify(playNoteState().replay.steps)")).length, 20);
});
