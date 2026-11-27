// satchel-stack-build-1 on the page: a near note of a sleeper gives her keepsake while her kind's stack is under 9; the 10th stays in the world.
//   node --test prototypes/exploration/tests/satchel-stack-page.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, WORDS } from "../src/words.mjs";

const nightAt = DAY.parts.slice(0, -1).reduce((a, q) => a + q[1], 0) + 5;
const seed = 7;
const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;
const setup = (p, pick, have) => p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; S.exp.fog = null; const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id});
  S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = ${nightAt}; live.strike = null; S.exp.stray = null; lay.easeG = { cov: new Set(), blk: new Set() }; c.ind.doings.late = 0;
  c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; c.hb = null; delete c.wary;
  const bed = hauntStand(hauntAt(c.ind.hs, c.ind.doings, dayPart()), hauntFree(lay, key, null)); c.x = bed.x; c.y = bed.y; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
  habDay()[habKey(c, 'sleep')] = 'played'; S.exp.cargo.samples = Array.from({ length: ${have} }, (_, i) => ({ id: 'old' + i, lo: 900 + i, name: 'Old', sp: 0, habit: 'sleep', item: 'claw', chapter: 'legs-tail', turn: 1 })); return 1; })()`);
const stand = (p, pick, d) => p.run(`(() => { const lay = curLay(), P = S.exp.patch, c = curLive().cr.find(q => q.id === ${pick.id});
  for (const dir of ['up', 'down', 'left', 'right']) { const [fx, fy] = DIRS[dir], x = c.x - fx * ${d}, y = c.y - fy * ${d}; let ok = x >= 1 && y >= 1 && x < lay.w - 1 && y < lay.h - 1;
    for (let k = 0; ok && k <= ${d}; k++) { const tx = c.x - fx * k, ty = c.y - fy * k; if (!lay.reach[ty * lay.w + tx] || T_BLOCK[lay.tiles[ty * lay.w + tx]]) ok = false; }
    if (ok) { P.x = x; P.y = y; P.dir = dir; unveil(P.key, P.x, P.y, 12); return true; } } return false; })()`);
const note = (p, pick) => JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}), rec = () => (S.habits[c.id] || {}).sleep || {};
  const line = noteHabit(c); return JSON.stringify({ line, sample: rec().sample || null, n: S.exp.cargo.samples.length, claws: S.exp.cargo.samples.filter(q => q.item === 'claw').length }); })()`));
const start = p => { p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`); const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place"); return pick; };

test("the 9th of a kind goes into its slot; the slot reads 9", () => {
  const p = page(), pick = start(p); setup(p, pick, 8);
  assert.ok(stand(p, pick, 2), "two free tiles in a line from her bed");
  const r = note(p, pick);
  assert.ok(r.sample, "the keepsake is taken: " + JSON.stringify(r)); assert.equal(r.claws, 9, "the stack reads 9"); assert.ok(!r.line.includes(WORDS.habit.noRoom));
  assert.deepEqual(p.errors, []);
});

test("the 10th of a kind stays in the world: the stack stays 9, the line says the satchel is full, her record keeps the keepsake unsampled", () => {
  const p = page(), pick = start(p); setup(p, pick, 9);
  assert.ok(stand(p, pick, 2), "two free tiles in a line from her bed");
  const r = note(p, pick);
  assert.equal(r.claws, 9, "the stack stays 9: " + JSON.stringify(r)); assert.equal(r.n, 9); assert.equal(r.sample, null, "the keepsake stays with her");
  assert.ok(r.line.includes(WORDS.habit.noRoom), r.line);
  assert.deepEqual(p.errors, []);
});
