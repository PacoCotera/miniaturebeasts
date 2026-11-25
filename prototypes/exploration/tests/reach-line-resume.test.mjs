// ui-reach-line-157-2 (owner #157): a place the game resumed in (a reload, no enterPatch) still stops the hero at the reach line: the line is drawn where the walk stops.
//   node --test prototypes/exploration/tests/reach-line-resume.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const fresh = () => {
  const p = makePage({ gen: 7, console: "collect" });
  p.run("newWorld(13); TEST.calm = true; S.tier = 1; startExpedition('weather', G.spawns[0]);");
  const c = p.run(`(() => { for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER || G.island[c]) continue; S.exp.pos = c; enterPatch(); if (RT.view) endView(); const lay = layout(String(c)); if (lay.baked && !lay.cave && ['N', 'E', 'S', 'W'].some(s => openingKind(lay, { side: s }).kind === 'range')) return c; leavePatch(); } return -1; })()`);
  assert.ok(c >= 0, "a place with a shut side exists in seed 13");
  return p;
};
// per side: its kind, and whether the walk's cell on the place's own edge, mid-side, is under a line
const BLOCKED = "(() => { const lay = layout(S.exp.patch.key), out = {}; for (const s of ['N', 'E', 'S', 'W']) { const k = openingKind(lay, { side: s }).kind; const mid = s === 'N' ? [lay.w >> 1, 0] : s === 'S' ? [lay.w >> 1, lay.h - 1] : s === 'W' ? [0, lay.h >> 1] : [lay.w - 1, lay.h >> 1]; out[s] = [k, lay.lines ? lay.lines.cells.has(mid[1] * lay.w + mid[0]) : null]; } return JSON.stringify(out); })()";

test("#157 a resumed place blocks every shut side the walk's line is drawn on; an open side none", () => {
  const p = fresh();
  p.run("{ const lay = layout(S.exp.patch.key); for (const [i, t] of lay.lineSaved || []) lay.tiles[i] = t; lay.lineSaved = []; lay.lines = undefined; }");   // as a page reload leaves it
  assert.equal(JSON.parse(p.run(BLOCKED)).N[1], null, "the resumed place starts with no lines");
  p.run("hazeSync(layout(S.exp.patch.key))");
  const r = JSON.parse(p.run(BLOCKED));
  for (const [s, [k, blocked]] of Object.entries(r)) assert.equal(blocked, k === "range", `side ${s} (${k}) blocked: ${blocked}`);
  assert.ok(Object.values(r).some(([k]) => k === "range"), "a shut side was tested");
});
