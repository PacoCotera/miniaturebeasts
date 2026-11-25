// Bug #171 (owner 2026-11-25: "i spawned in water and can't walk", patch 11,13 tile 12,25): a step over a tile-decided side landed on the tile straight across even where that tile lies
// off the place's walkable ground (a cut-off pocket, or no reach at all). Rule 16b at that one place: he never lands on a tile from which no walkable path leads to the place's edge;
// the landing takes the nearest standable tile on the place's walkable ground. Scan: seeds 7, 13, 42, every land place, every side, every edge tile that crossLanding allows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("a save that stores him on a tile off the walkable ground moves him to the nearest standable tile of the main ground", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(7); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);");
  const r = p.run(`(() => { const c = G.spawns[0]; S.exp.pos = c; enterPatch(); if (RT.view) endView(); const lay = layout(String(c)), P = S.exp.patch;
    let off = -1; for (let i = 0; i < lay.w * lay.h; i++) if (!lay.reach[i]) { off = i; break; }
    if (off < 0) return { none: true };
    P.x = off % lay.w; P.y = (off / lay.w) | 0; const moved = groundSnap(), j = P.y * lay.w + P.x;
    return { moved, reach: !!lay.reach[j], main: lay.compId[j] === lay.mainComp }; })()`);
  assert.ok(!r.none, "a cell with an off-ground tile");
  assert.ok(r.moved && r.reach && r.main, JSON.stringify(r));
});

for (const seed of [7, 13, 42]) {
  test(`seed ${seed}: no landing over a place's side is a tile cut off from the ground its way in leads to`, () => {
    const p = makePage({ gen: 7, console: "silent" });
    p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
    const r = p.run(`(() => { const out = { landings: 0, bad: [] }; const OPP = { up: 'S', down: 'N', left: 'E', right: 'W' };
      for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER) continue;
        for (const dir of ['up', 'down', 'left', 'right']) {
          const n = stepCell(c, dir); if (n < 0 || !G.comp[n] || G.land[n] === L.WATER) continue;
          S.exp.pos = c; enterPatch(); if (RT.view) endView(); const la = layout(String(c)); if (!la.tiles) continue;
          const len = dir === 'up' || dir === 'down' ? la.w : la.h;
          for (let k = 0; k < len; k++) {
            const x = dir === 'left' ? 0 : dir === 'right' ? la.w - 1 : k, y = dir === 'up' ? 0 : dir === 'down' ? la.h - 1 : k;
            S.exp.patch.x = x; S.exp.patch.y = y; const land = crossLanding(dir); if (!land) continue;
            const lb = layout(String(n)); ensureLive(String(n)); LAND = { key: String(n), x: land.x, y: land.y }; ALONG = { key: String(n), k };
            const e = entryPoint(lb, String(n), dir); LAND = null; ALONG = null; out.landings++;
            const i = e.y * lb.w + e.x, want = lb.compOfSide ? (lb.compOfSide[OPP[dir]] ?? lb.mainComp) : 0;
            if (!lb.reach[i] || (want && lb.compId[i] !== want)) out.bad.push([c, dir, x, y, n, e.x, e.y]);
          } } }
      return out; })()`);
    assert.ok(r.landings > 100, "landings were scanned: " + r.landings);
    assert.equal(r.bad.length, 0, "cut-off landings (cell, dir, from x, y, into cell, x, y): " + JSON.stringify(r.bad.slice(0, 5)));
  });
}
