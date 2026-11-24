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
  // round 3: on his save every Loika in sight has already heard him (ease 3), and a heard one holds her tile; the walk is read with them unaware (grazing), as at a fresh meeting
  q.run(`curLive().cr.forEach(c => { if (c.sp === 0 && Math.max(Math.abs(c.x - S.exp.patch.x), Math.abs(c.y - S.exp.patch.y)) >= 5) { c.ease = 0; c.quiet = 0; c.crowd = 0; } })`);   // the far ones only: the near ones keep the hearing and routine moves of the old rules
  const snap = () => JSON.parse(q.run(`JSON.stringify({ P: { x: S.exp.patch.x, y: S.exp.patch.y }, cr: curLive().cr.filter(c => c.sp === 0 && !c.hide && inSight(c.x, c.y) && c.ease === 0).map(c => ({ id: c.id, x: c.x, y: c.y })) })`));
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

// Round 3 (designer, bus 431735): she stirs only while unaware: once heard (ease up) or while the stay counts, she holds her tile.
test("heard, or the stay counting: no stir", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.store[p.KEY] = raw;
  const q = makePage({ gen: 7, store: { ...p.store }, console: "collect", els: true, canvas: true, raf: "count" });
  // ctl: 0 unaware, 1 heard (ease 1), 2 stay counting (crowd 3); returns how many of 90 actions stirred some Loika in sight (P moved to the far side of the ring so the ring never blocks)
  const run = ctl => q.run(`(() => { const ex = S.exp, live = curLive(), P = ex.patch; let n = 0;
    const X = Object.assign({ lay: curLay(), live, key: P.key, P, carry: ex.carry, ease: easeEnvOf(curLay(), false, false), noise: 'act', moved: true, away: () => false }, ptCtx());
    for (let a = 0; a < 90; a++) { ex.actions = 1000 + a;
      for (const c of live.cr) { if (c.sp !== 0 || c.hide || !inSight(c.x, c.y)) continue; c.st = 'idle'; c.ease = ${ctl === 1 ? 1 : 0}; c.crowd = ${ctl === 2 ? 3 : 0};
        X.P = { x: c.x + 9, y: c.y, key: P.key };   // the explorer 9 tiles off: outside any ring
        const bx = c.x, by = c.y; stirStep(c, X, bx, by); if (c.x !== bx || c.y !== by) n++; } }
    return n; })()`);
  assert.ok(run(0) > 0, "control: unaware, they stir");
  assert.equal(run(1), 0, "heard: no stir");
  assert.equal(run(2), 0, "stay counting: no stir");
});
