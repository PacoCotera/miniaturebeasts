// wild-beats-cause-1: a wild Loika that bolted from a walking approach is at ease again at her next haunt once he is well away, and plays a beat.
//   node --test prototypes/exploration/tests/wild-beats-after-bolt.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("on the page, seed 33: two walked steps near her bolt her (ease 3, gone); he backs off, and a few actions on she is at ease at her haunt and plays a beat", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(33); startExpedition('weather', G.spawns[0]);`);
  const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;
  const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place");
  const out = JSON.parse(p.run(`(() => {
    const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.named = S.named || {}; S.day.spent = 205;   // midday: no habit is due
    let live = curLive(); const c = live.cr.find(q => q.id === ${pick.id}), lay = curLay(), P = S.exp.patch; S.named[c.id] = c.ind.name; S.known = [0, ...S.known.filter(k => k !== 0)];
    c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; c.wet = 0; c.ind.go = null;
    for (let i = 0; i < 12; i++) { live.strike = null; S.exp.stray = null; advance('patch', { noise: 'act' }); }   // she settles at her haunt
    // he walks beside her: two heard steps bolt her
    const free = (x, y) => x >= 2 && y >= 2 && x < lay.w - 2 && y < lay.h - 2 && !!lay.reach[y * lay.w + x] && !T_BLOCK[lay.tiles[y * lay.w + x]] && !NOSTAND(lay.tiles[y * lay.w + x]) && !occupant(key, x, y, 'player');
    let near = null; for (let r = 2; r <= 2 && !near; r++) for (let dy = -r; dy <= r && !near; dy++) for (let dx = -r; dx <= r && !near; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(c.x + dx, c.y + dy) && free(c.x + dx + 1, c.y + dy)) near = { x: c.x + dx, y: c.y + dy };
    if (!near) return JSON.stringify({ bad: 1 });
    P.x = near.x; P.y = near.y; unveil(key, c.x, c.y, 8);
    const log = []; let n = 0;
    const ds = ['left', 'right', 'up', 'down'];
    while (!c.gone && n++ < 30) { live.strike = null; S.exp.stray = null; const s0 = S.day.spent, dx = c.x - P.x, dy = c.y - P.y;
      const dir = Math.max(Math.abs(dx), Math.abs(dy)) <= 2 ? ds[n % 2 + (dx < 0 ? 0 : 0)] : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      patchStep(dir, 'walk'); log.push(dir + ' P' + P.x + ',' + P.y + ' c' + c.x + ',' + c.y + ' e' + c.ease + ' ' + c.st + ' ' + P.key); if (S.day.spent === s0) advance('patch', { noise: 'act' }); }
    const bolted = { gone: !!c.gone, ease: c.ease, steps: n };
    // he backs off: more than 4 tiles away, in her sight and on the screen
    let far = null, bd = 99; for (let y = 2; y < lay.h - 2; y++) for (let x = 2; x < lay.w - 2; x++) { const d = Math.max(Math.abs(x - c.x), Math.abs(y - c.y)); const dt = Math.max(Math.abs(x - c.gone.t.x), Math.abs(y - c.gone.t.y)); if (d > 5 && dt > 5 && d < bd && free(x, y)) { const ox = P.x, oy = P.y; P.x = x; P.y = y; const ok = inSight(c.x, c.y) && onScreen(c.x, c.y); P.x = ox; P.y = oy; if (ok) { bd = d; far = { x, y }; } } }
    if (far) { P.x = far.x; P.y = far.y; }
    let freed = null, beat = null;
    for (let i = 0; i < 120 && !beat; i++) { live.strike = null; S.exp.stray = null; advance('patch', { noise: 'act' }); if (!c.gone && freed == null) freed = i; if (FX.beats && FX.beats[c.id]) beat = FX.beats[c.id].k; }
    return JSON.stringify({ at: [c.x, c.y, c.gone && c.gone.t, c.gone && c.gone.rest, P.x, P.y], bolted, far, freed, beat, ease: c.ease, gone: !!c.gone, st: c.st });
  })()`));
  if (out.bad) return;
  assert.ok(out.bolted.gone && out.bolted.ease === 3, "walking beside her bolted her: " + JSON.stringify(out));
  assert.ok(out.far, "he has a tile well away in her sight");
  assert.ok(out.freed != null, "she is at ease again with him away: " + JSON.stringify(out));
  assert.ok(out.beat, "she plays a beat once at ease at her haunt: " + JSON.stringify(out));
  assert.deepEqual(p.errors, []);
});
