// #156 QA verify-live-149: her name tag under her whether faced or not, ← says her page only where a line names her, the Log's ▲▼ move the mark entry to entry.
//   node --test prototypes/exploration/tests/her-page-fix-156.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { syntheticPieces, SYNTH_TONE, fnv as fnvStr } from "../tools/world-vectors.mjs";

const SYN = syntheticPieces().map(q => ({ ...q, fill: parseInt(fnvStr(q.name), 16) % 40 + 4 }));
const start = () => {
  const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`atlasInstall(${JSON.stringify(SYN)}.map(q => { const px = new Int16Array(q.w * q.h).fill(q.fill);
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (!x || !y || x === q.w - 1 || y === q.h - 1) px[y * q.w + x] = C.ink; return Object.assign(q, { px }); }), null, ${JSON.stringify(SYNTH_TONE)})`);
  p.run("newWorld(13); TEST.calm = true; startExpedition('weather', G.spawns[0]); HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch'; S.known = [0];");
  p.run("{ for (const c of curLive().cr) c.hide = 1; S.named = {}; S.metIds = []; S.book = []; S.pages = {}; }");
  return p;
};

test("her name tag stands under her when the bottom line names her and the hero does not face her", () => {
  const p = start();
  p.run(`{ const P = S.exp.patch, c = curLive().cr.find(q => q.id === 36); P.dir = 'up'; c.x = P.x; c.y = P.y - 3; c.st = 'idle'; c.ease = 0; c.hide = 0;
    S.named[36] = 'Cinder'; S.metIds.push('36'); S.veil[P.key] = new Array(PH).fill(0x0fffffff); RT.pl = null; RT.key = null; NOW = 5000; FX.msg = ''; }`);
  assert.equal(p.run("herInSight()"), "36");
  p.run("var SPOT = 'none'; { const d0 = drawTag; drawTag = s => { SPOT = s; d0(s); }; }");
  p.run("scr.px().fill(-1); render(5)");
  const s = JSON.parse(p.run("JSON.stringify(SPOT)")), cell = JSON.parse(p.run("JSON.stringify(RT.tagW)"));
  assert.ok(s && s.wild, "her tag is drawn");
  assert.ok(s.panel.y > cell.y + 24 && s.ptr.w === 2 && Math.abs(s.panel.x + (s.panel.w >> 1) - cell.x) < 24, "under her cell, not beside it: panel " + JSON.stringify(s.panel) + " cell y " + cell.y);
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("← says her page only where a line names her: her name squeezed off the bottom line leaves ← as it was", () => {
  const p = start();
  p.run(`{ const P = S.exp.patch, c = curLive().cr.find(q => q.id === 36); P.dir = 'up'; c.x = P.x; c.y = P.y - 3; c.st = 'idle'; c.ease = 0; c.hide = 0; S.named[36] = 'Cinder'; S.metIds.push('36'); }`);
  assert.equal(p.run("herInSight()"), "36");
  assert.equal(p.run("herBack({ ok: 'Offer fruit · Loika fruit eater more', ctx: ['Cinder · a wild Loika · grazing', 'Cinder'], back: 'Leave', dim: false })"), null);
  assert.equal(p.run("herBack({ ok: 'Keep still', ctx: ['Cinder'], back: 'Leave', dim: false })"), "her page");
});

test("the Log: ▲▼ move the mark entry to entry, over three presses, and the page follows it", () => {
  const p = start();
  p.run("S.named = { 36: 'Cinder' }; S.book = []; for (let i = 0; i < 9; i++) S.book.push({ d: 1, part: 'morning', place: 'meadow', from: 'at the flag', t: 1, id: i === 4 ? 36 : 100 + i, who: 'a Loika', kind: 'prints', text: 'Prints in the grass. a Loika was here this morning ' + i, at: i }); openLog();");
  const mark = () => p.run("logMarkAt(logDays()[0])");
  const m0 = mark(); p.key("down"); p.key("down"); p.key("down");
  assert.equal(mark(), m0 + 3, "three ▼ move the mark three entries");
  assert.ok(p.run("logFits(logDays()[0], S.ui.logTop | 0, logMarkAt(logDays()[0]))"), "the mark is on the page");
  p.key("up"); assert.equal(mark(), m0 + 2);
});
