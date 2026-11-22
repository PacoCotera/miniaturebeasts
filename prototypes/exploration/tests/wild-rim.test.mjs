// Owner bug #107 (owner-notes-fix-107b): a wild mibi never steps across a drawn rim line, as the explorer never does.
//   node --test prototypes/exploration/tests/wild-rim.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

// the first cell in reach of the start whose place has rim lines; wild mibis put on and beside those cells; the page stands still (a wait) for the ticks
const SETUP = (seed) => `(() => {
  newWorld(${seed}); TEST.calm = true; S.known = [0, 1, 2, 3, 4, 7, 11, 16, 19]; S.tier = 2; startExpedition('weather', G.spawns[0]);
  const st = S.exp.start, sx = st % MW, sy = (st / MW) | 0;
  for (let cy = Math.max(0, sy - 4); cy <= Math.min(MH - 1, sy + 4); cy++) for (let cx = Math.max(0, sx - 4); cx <= Math.min(MW - 1, sx + 4); cx++) {
    S.exp.pos = cy * MW + cx; enterPatch(); if (RT.view) endView();
    const lay = layout(S.exp.patch.key); if (!lay || !lay.rimSteps || lay.cave) continue;
    let any = false; for (let i = 0; i < lay.rimSteps.length; i++) if (lay.rimSteps[i]) { any = true; break; } if (!any) continue;
    const key = S.exp.patch.key, live = curLive(); live.cr.length = 0; S.cr.length = 0; indexCreatures();
    const spots = []; for (let y = 1; y < lay.h - 1; y++) for (let x = 1; x < lay.w - 1; x++) { if (!lay.rimSteps[y * lay.w + x]) continue;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, i = Y * lay.w + X;
        if (lay.reach[i] && !NOSTAND(lay.tiles[i]) && !spots.some(o => o.x === X && o.y === Y) && Math.abs(X - S.exp.patch.x) + Math.abs(Y - S.exp.patch.y) > 3) spots.push({ x: X, y: Y }); } }
    const sp = [1, 3, 4, 2, 1, 3], n = Math.min(6, spots.length), step = Math.max(1, Math.floor(spots.length / 6));
    for (let k = 0; k < n; k++) { const s = spots[k * step], id = 9001 + k; S.cr.push({ id, sp: sp[k], c: lay.cell, cv: 0, b: .2, s: 0 }); indexCreatures();
      live.cr.push({ id, sp: sp[k], x: s.x, y: s.y, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: .2, face: 1, ready: true }); }
    return n; }
  return 0; })()`;

test("#107: over 500 ticks on 20 seeds no wild mibi steps across a rim line", () => {
  let places = 0, crossings = 0, steps = 0, first = null;
  for (let seed = 1; seed <= 20; seed++) {
    const p = makePage({ gen: 7, console: "silent" });
    const n = p.run(SETUP(seed)); if (!n) continue; places++;
    for (let t = 0; t < 500; t++) {
      const before = JSON.parse(p.run(`JSON.stringify(curLive().cr.map(c => [c.x, c.y, c.hide]))`));
      p.run(`advance('patch', { noise: ${t % 7 === 0 ? "'act'" : "'wait'"} })`);
      const bad = p.run(`(() => { const b = ${JSON.stringify(before)}, lay = curLay(), bad = [];
        curLive().cr.forEach((c, k) => { const a = b[k]; if (!a || c.hide || a[2]) return; const dx = c.x - a[0], dy = c.y - a[1], d = Math.abs(dx) + Math.abs(dy); if (!d || d > 2) return;
          const R = (fx, fy, tx, ty) => rimRefuses(lay, fx, fy, tx, ty); let ok;
          if (d === 1) ok = !R(a[0], a[1], c.x, c.y);
          else if (dx === 0 || dy === 0) { const mx = a[0] + dx / 2, my = a[1] + dy / 2; ok = !R(a[0], a[1], mx, my) && !R(mx, my, c.x, c.y); }
          else ok = (!R(a[0], a[1], c.x, a[1]) && !R(c.x, a[1], c.x, c.y)) || (!R(a[0], a[1], a[0], c.y) && !R(a[0], c.y, c.x, c.y));
          if (!ok) bad.push([k, a, c.x, c.y]); });
        return JSON.stringify(bad); })()`);
      const nb = JSON.parse(bad).length; if (nb) { crossings += nb; first = first || { seed, t, bad }; }
      steps += before.length;
    }
  }
  assert.ok(places > 0, "some seed has a place with a rim line");
  assert.equal(crossings, 0, JSON.stringify(first));
});
