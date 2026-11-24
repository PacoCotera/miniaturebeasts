// Issue #138: wild ones in sight stir while you walk, not only while you wait. On the owner's save at his spot (patch 11,7 tile 4,4), ten walk steps with no Wait:
// at least one Loika in sight changes tile, none ends more than one tile from its stand, none steps toward him.
//   node --test prototypes/exploration/tests/wild-stir-walk.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";

const raw = readFileSync(new URL("./owner138.save", import.meta.url), "utf8");
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));   // "toward" in tiles of reach: a stir step never closes the gap (a sidestep keeps it)

test("his save: ten walk steps, the Loikas in sight stir within one tile, never toward him", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.store[p.KEY] = raw;
  const q = makePage({ gen: 7, store: { ...p.store }, console: "collect", els: true, canvas: true, raf: "count" });
  assert.ok(q.run("!!(S.exp && S.exp.patch)"), "his save opens in the place");
  const snap = () => JSON.parse(q.run(`JSON.stringify({ P: { x: S.exp.patch.x, y: S.exp.patch.y }, cr: curLive().cr.filter(c => c.sp === 0 && !c.hide && inSight(c.x, c.y)).map(c => ({ id: c.id, x: c.x, y: c.y })) })`));
  const start = snap(); assert.ok(start.cr.length, "a Loika is in sight at his spot");
  const home = new Map(start.cr.map(c => [c.id, c])), moved = new Set(), toward = [], far = [];
  for (const d of ["left", "right", "up", "down", "left", "right", "up", "down", "left", "right"]) {
    const before = snap(); q.key(d); q.pass(1200); const after = snap();
    const was = new Map(before.cr.map(c => [c.id, c]));
    for (const c of after.cr) { const o = was.get(c.id); if (!o) continue;
      if (home.has(c.id) && man(c, home.get(c.id)) > 1) far.push([c.id, home.get(c.id), c]);
      if (o.x === c.x && o.y === c.y) continue; moved.add(c.id);
      const back = home.has(c.id) && home.get(c.id).x === c.x && home.get(c.id).y === c.y;   // her routine walking her back to her stand is not a stir
      if (!back && cheb(c, after.P) < cheb(o, after.P)) toward.push([c.id, o, c, after.P]); } }
  assert.ok(moved.size >= 1, "at least one Loika in sight changed tile");
  assert.deepEqual(far, [], "none ends more than one tile from its stand");
  assert.deepEqual(toward, [], "none steps toward him");
});
