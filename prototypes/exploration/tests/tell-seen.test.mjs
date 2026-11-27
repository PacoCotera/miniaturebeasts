// tell-seen-fix-1 (OWNER 2026-11-25 06:4x, design-loop-review-1 fix 5): a named Loika he has met starts her tell within ten tiles: the veil lifts on her tile and the tiles between, and her tell's line is the box's line.
//   node --test prototypes/exploration/tests/tell-seen.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;

for (const seed of [7, 13, 42]) {
  test("seed " + seed + ": her tell starts seven tiles off under the veil: her tile and the line to her are lifted, the box has her line", () => {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place");
    const out = JSON.parse(p.run(`(() => {
      const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch, col = lay.cell % MW;
      S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 50;
      c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; delete c.wary; c.wet = 1; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
      lay.easeG = { cov: new Set(), blk: new Set() };
      const W = windAt(S.seed, lay.cell, S.day.spent), vec = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[W]; const D = 7;
      for (let d = 1; d <= D; d++) { const x = c.x + vec[0] * d, y = c.y + vec[1] * d; if (x < 1 || y < 1 || x >= lay.w - 1 || y >= lay.h - 1) return JSON.stringify({ bad: 1 }); lay.tiles[y * lay.w + x] = T.REEDS; lay.reach[y * lay.w + x] = 1; }
      S.veil[key] = new Array(lay.h).fill(0);   // everything under the veil
      P.x = c.x + vec[0] * D; P.y = c.y + vec[1] * D; S.exp.storm = { x: col + .5 - 1.5 + 1.7 - 1.5, w: 3, dir: -1, v: .25, t: 0 };
      const before = unveiled(key, c.x, c.y), line = [];
      FX.notes = [{ text: 'a stone is here', pri: 2 }]; composeMsg();
      for (let i = 0; i < 40 && !c.hb; i++) { live.strike = null; S.exp.stray = null; advance('patch', { noise: 'act' }); }
      const n = Math.max(Math.abs(c.x - P.x), Math.abs(c.y - P.y)), near = n <= 10;
      for (let i = 0; i <= n; i++) line.push(unveiled(key, Math.round(P.x + (c.x - P.x) * i / (n || 1)), Math.round(P.y + (c.y - P.y) * i / (n || 1))));
      return JSON.stringify({ before, tell: !!c.hb, near, line, msg: FX.msg, dbg: [c.x, c.y, P.x, P.y, !!c.ind, S.known.includes(c.sp), key, S.exp.patch.key, JSON.stringify(S.veil[key]).slice(0, 80)] });
    })()`));
    if (out.bad) return;
    assert.equal(out.before, false, "her tile starts under the veil");
    assert.ok(out.tell, "her tell started");
    assert.ok(/ · /.test(out.msg) && out.msg !== "a stone is here", "the box has her tell's line, not the find's: " + out.msg);
    assert.ok(out.line.every(Boolean), "her tile and the line to him are lifted: " + JSON.stringify(out));
  });
}
