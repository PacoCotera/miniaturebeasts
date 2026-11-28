// first-walk-teach-approach-1: the first walk's teaching line says how to come near a named Loika, and shows nowhere else.
//   node --test prototypes/exploration/tests/first-walk-teach-approach.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { newPage } from "../tools/walker.mjs";
import { WORDS } from "../src/data/words.mjs";

const W = WORDS.teachWalk;
const setup = `(() => { const m = __mb, S = m.S; m.startExpedition('weather', G.spawns[0]);
  for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), live = ensureLive(key); const q = live.cr.find(x => x.sp === 0 && x.ind);
    if (!q) continue; S.exp.pos = key; enterPatch(key); S.known = [0, ...S.known.filter(k => k !== 0)]; const c2 = curLive().cr.find(x => x.id === q.id), P = S.exp.patch; P.x = c2.x + 6; P.y = c2.y; P.dir = "left"; lightningLift(key, c2.x, c2.y, 8);
    return true; } return false; })()`;

test("a named Loika in sight that has not heard you: step slowly; once she hears you: keep still; both only on a first walk", () => {
  const p = newPage(7, { calm: true });
  assert.ok(p.run(setup));
  assert.equal(p.run("teachStep()"), W.near);
  p.run("indInSight().ease = 1");
  assert.equal(p.run("teachStep()"), W.heard);
  p.run("indInSight().ease = 0");
  p.run("S.found.push('teach:near', 'teach:heard')");
  assert.notEqual(p.run("teachStep()"), W.near, "each line once per save");
  p.run("S.found.length = 0; S.mibis.push({ id: 'x' })");   // a mibi on the Companion: no longer a first walk
  assert.equal(p.run("firstWalk()"), false);
  assert.equal(p.run("(() => { const c = curLive().cr.find(x => x.ind); c.ease = 0; return approachTeach(c) && firstWalk() ? 'shown' : 'none'; })()"), "none");
});

test("her prints are offered only within one tile of them", () => {
  const p = newPage(7, { calm: true });
  assert.ok(p.run(setup));
  const far = p.run("(() => { const P = S.exp.patch; return printsHere().filter(q => Math.max(Math.abs(P.x - (q.mark || q.stand).x), Math.abs(P.y - (q.mark || q.stand).y)) > 1).length === 0 || !printsToRead(); })()");
  assert.equal(far, true);
});

test("mid range and still: her tell comes first, once per save", () => {
  const p = newPage(7, { calm: true });
  assert.ok(p.run(setup));
  p.run("(() => { const c = indInSight(); S.exp.patch.x = c.x + 4; S.exp.patch.y = c.y; c.st = 'idle'; c.hb = 0; })()");
  assert.equal(p.run("teachStep()"), W.tell);
  p.run("S.found.push('teach:tell')");
  assert.notEqual(p.run("teachStep()"), W.tell);
});

test("a named Loika within her stay: ✓ is hers, never Pick up the tuft", () => {
  const p = newPage(7, { calm: true });
  assert.ok(p.run(setup));
  const r = p.run(`(() => { const c = indInSight(), P = S.exp.patch; P.x = c.x + 2; P.y = c.y; P.dir = 'left'; c.ease = 0; c.st = 'idle'; c.hb = 0;
    const f = frontOf(P); curLive().tf.push({ id: 999, x: f.x, y: f.y }); const near = patchAction().label;
    P.x = c.x + 6; const f2 = frontOf(P); curLive().tf.push({ id: 998, x: f2.x, y: f2.y }); const far = patchAction().label; return { near, far }; })()`);
  assert.notEqual(r.near, "Pick up the tuft");
  assert.equal(r.far, "Pick up the tuft", "out of the stay the tuft is offered again");
});
