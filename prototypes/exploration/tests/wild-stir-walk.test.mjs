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
  // 138-9: #145's load re-chooses his save's stored haunts, so on load these Loikas walk to their new stands; that routine walk is not a stir. Settle first (Waits, he does not move) until every one in sight stands within a tile of her routine stand, then take the baseline.
  const settled = () => q.run(`curLive().cr.filter(c => c.sp === 0 && !c.hide && inSight(c.x, c.y) && c.ease === 0).every(c => { const a = c.ind ? routineSpot(c, curLay(), S.exp.patch.key) : null; return !a || man(a, c) <= 1; })`);
  for (let i = 0; i < 60 && !settled(); i++) q.run("waitTick('patch')");
  assert.ok(settled(), "his Loikas reach their routine stands before the walk");
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

// 138-6 (QA verify-live-110: 20 of 76 stir moves ended nearer): 200 walk steps on his save; every stir is checked where he stands after his step.
test("200 walk steps: no stir ends nearer to him, none ends within ring+3", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.store[p.KEY] = raw;
  const q = makePage({ gen: 7, store: { ...p.store }, console: "collect", els: true, canvas: true, raf: "count" });
  q.run(`curLive().cr.forEach(c => { if (c.sp === 0) { c.ease = 0; c.quiet = 0; c.crowd = 0; } }); window.__stirs = []; const __orig = stirStep;
    stirStep = function (c, X, bx, by) { const was = { x: c.x, y: c.y }; __orig(c, X, bx, by);
      if (c.x !== was.x || c.y !== was.y) { const hr = easeCarryAt(X.ease, c, X.P.x, X.P.y, X.noise === 'walk' ? 'walk' : 'creep', c.wary || 0).v + 3;
        window.__stirs.push({ walk: !!X.moved, ch0: Math.max(Math.abs(was.x - X.P.x), Math.abs(was.y - X.P.y)), ch1: Math.max(Math.abs(c.x - X.P.x), Math.abs(c.y - X.P.y)),
          r0: (was.x - X.P.x) ** 2 + (was.y - X.P.y) ** 2, r1: (c.x - X.P.x) ** 2 + (c.y - X.P.y) ** 2, hr2: hr * hr }); } };`);
  const dirs = ["left", "right", "up", "down"];
  for (let i = 0; i < 200; i++) { q.run("curLive().cr.forEach(c => { if (c.sp === 0 && !c.hide && !c.home && !c.visit && c.st !== 'flee') { c.st = 'idle'; c.ease = 0; c.quiet = 0; c.crowd = 0; } })"); q.key(dirs[(i >> 1) % 4]); q.pass(1200); }
  const st = JSON.parse(q.run("JSON.stringify(window.__stirs)")).filter(s => s.walk);
  assert.ok(st.length >= 1, "control: some stirs happen");
  assert.deepEqual(st.filter(s => s.ch1 < s.ch0 || s.r1 < s.r0), [], "none ends nearer");
  assert.deepEqual(st.filter(s => s.r1 <= s.hr2), [], "none ends within ring+3");
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

// Round 4 (designer, bus 07b13c410b): she stirs only while more than three tiles outside the real hearing ring, at ease 0; ease 3 (gone) never stirs.
test("ring+3 and ease 3: no stir inside ring+3, stir beyond it, gone never", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.store[p.KEY] = raw;
  const q = makePage({ gen: 7, store: { ...p.store }, console: "collect", els: true, canvas: true, raf: "count" });
  // off: the explorer's distance from her; ease: her ease; returns how many of 90 actions stirred some Loika in sight
  const run = (off, ease) => q.run(`(() => { const ex = S.exp, live = curLive(), P = ex.patch; let n = 0;
    const X = Object.assign({ lay: curLay(), live, key: P.key, P, carry: ex.carry, ease: easeEnvOf(curLay(), false, false), noise: 'walk', moved: true, away: () => false }, ptCtx());
    for (let a = 0; a < 90; a++) { ex.actions = 1000 + a;
      for (const c of live.cr) { if (c.sp !== 0 || c.hide || !inSight(c.x, c.y)) continue; c.st = 'idle'; c.ease = ${ease}; c.crowd = 0;
        X.P = { x: c.x + ${off}, y: c.y, key: P.key };
        const bx = c.x, by = c.y; stirStep(c, X, bx, by); if (c.x !== bx || c.y !== by) n++; } }
    return n; })()`);
  assert.ok(run(9, 0) > 0, "control: ease 0 far beyond ring+3 stirs on a walk step");
  assert.equal(run(1, 0), 0, "inside ring+3: no stir");
  assert.equal(run(3, 0), 0, "three tiles off: still inside ring+3");
  assert.equal(run(9, 3), 0, "ease 3 (gone) never stirs");
});
