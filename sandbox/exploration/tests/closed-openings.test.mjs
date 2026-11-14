// Walk content B8: an opening never promises a way that is closed, and never is the way in. Generator 7 holds it in the cell's IR: a side the land refuses (wide water, a cliff) has no opening,
// and the way in (the layout's spawn point) is never on a refused side. The map's end is the atlas's edge and is held by the views audit (views-agree.test.mjs, tools/views-audit.mjs auditGen7).
// The closed look (the set's thicket over a refused opening) belonged to the baked-template adapter, which the page no longer uses; its test is gone with it. The range line still moves with the tier (range-line.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { sideKind } from "../src/world.mjs";

const DIR = { N: "up", S: "down", W: "left", E: "right" };

test("on every land cell of three worlds no opening stands on a side the land refuses, and the way in is never on one", () => {
  let cells = 0, shut = 0;
  for (const seed of [7, 13, 42]) {
    const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
    const G = p.run("G");
    const keys = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()");
    for (const c of keys) {
      const lay = p.run(`(() => { const l = layout('${c}'); return { open: l.openings.map(o => o.side), spawn: l.spawnPt, w: l.w, h: l.h }; })()`);
      cells++;
      for (const dir of ["up", "down", "left", "right"]) {
        const kind = sideKind(G, c, dir);
        if (kind !== "cliff" && kind !== "water") continue;   // the map's end (and a region's border) is the atlas's: the views audit
        shut++;
        assert.ok(!lay.open.some((s) => DIR[s] === dir), `seed ${seed} cell ${c}: an opening on the ${kind} side ${dir}`);
        const { x, y } = lay.spawn, onIt = dir === "up" ? y === 0 : dir === "down" ? y === lay.h - 1 : dir === "left" ? x === 0 : x === lay.w - 1;
        assert.ok(!onIt, `seed ${seed} cell ${c}: the way in is on the ${kind} side ${dir}`);
      }
    }
  }
  assert.ok(cells > 100 && shut > 0, `${cells} cells, ${shut} refused sides seen`);
});

// Owner 2026-11-11 17:41: within an expedition a place keeps the same wild mibis at the spots they had when you left, across a trip to the map and back; they change only when a world turn passes.
test("leaving a place and coming back in the same turn gives the same mibis, the same kinds at the same spots", () => {
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(7); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
  const cell = p.run(`(() => { for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER || !S.cr.some(w => w.c === c)) continue; S.exp.pos = c; enterPatch(); if (RT.view) endView(); if (ensureLive(String(c)).cr.length) return c; leavePatch(); } return -1; })()`);
  assert.ok(cell >= 0, "a place with wild mibis");
  const snap = () => p.run(`JSON.stringify(ensureLive('${cell}').cr.map(c => [c.id, c.sp, c.x, c.y]))`);
  p.run(`for (let i = 0; i < 4; i++) advance('patch', { noise: 'creep', moved: false });`);
  const left = snap();
  p.run(`leavePatch(); enterPatch(); if (RT.view) endView();`);
  assert.equal(snap(), left, "the same kinds at the same spots after the trip to the map and back");
  p.run(`leavePatch(); S.exp.pos = G.spawns[0]; enterPatch(); if (RT.view) endView(); leavePatch(); S.exp.pos = ${cell}; enterPatch(); if (RT.view) endView();`);
  assert.equal(snap(), left, "and after a visit to another place");
});

// Owner 2026-11-11 16:2x: walking off a region side into a region already open carries straight on in the same expedition; the hold, the clock and the mibis kept per place stay.
// Where the far side cannot be crossed the side says which region lies there; a side facing land not yet open says more land opens as you explore.
test("walking off a region side into an open neighbour goes on in the same expedition and back again: the hold, the clock and the place's mibis stay", () => {
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(13); TEST.calm = true; S.tier = 2;`);
  const id = p.run(`openRegion([3, 2])`);   // the region east of region 1
  p.run(`startExpedition('weather', G.spawns[0]);`);
  const cell = p.run(`(() => { for (let y = 0; y < MH; y++) { const c = y * MW + MW - 1; if (!G.comp[c] || G.land[c] === L.WATER || G.island[c] || !seamCross(c, 'right')) continue;
    S.exp.pos = c; enterPatch(); if (RT.view) endView(); const ok = layout(String(c)).openings.some(o => o.side === 'E'); leavePatch(); if (ok) return c; } return -1; })()`);
  assert.ok(cell >= 0, "an east-edge cell that can be crossed");
  const eastReason = p.run(`crossReason(${cell}, 'right')`);
  assert.equal(eastReason, null, "a crossable region side is no refusal");
  const shut = p.run(`(() => { for (let y = 0; y < MH; y++) { const c = y * MW + MW - 1; if (!seamCross(c, 'right')) return crossReason(c, 'right'); } return null; })()`);
  assert.match(shut ?? "", /start an expedition there$/, "where crossing is impossible the open neighbour is named: " + shut);
  assert.equal(p.run(`crossReason(3, 'up')`), "More land · opens as you explore", "a side facing land not yet open");
  p.run(`S.exp.pos = ${cell}; S.exp.cargo.e = 3; S.exp.cargo.d = 2; enterPatch(); if (RT.view) endView();`);
  const key = String(cell), snap = () => p.run(`JSON.stringify(ensureLive('${key}').cr.map(c => [c.id, c.sp, c.x, c.y]))`);
  p.run(`for (let i = 0; i < 3; i++) advance('patch', { noise: 'creep', moved: false });`);
  const mibis = snap(), actions = p.run("S.exp.actions"), n = p.run("S.exp.n"), shield = p.run("S.exp.shield");
  // stand on the east edge in the middle of the opening and step off it
  p.run(`(() => { const lay = layout('${key}'), o = lay.openings.find(q => q.side === 'E'), P = S.exp.patch; P.x = lay.w - 1; P.y = (o.from + o.to) >> 1; P.dir = 'right'; patchStep('right', 'creep'); })()`);
  assert.equal(p.run("S.here"), id, "the far region is mounted");
  assert.equal(p.run("S.exp && S.exp.n"), n, "the same expedition");
  assert.equal(p.run("S.phase"), "patch", "and you are walking in a place there");
  assert.equal(p.run("S.exp.rg"), id);
  assert.equal(p.run("S.exp.cargo.e + ':' + S.exp.cargo.d"), "3:2", "the hold goes with you");
  assert.equal(p.run("S.exp.shield"), shield);
  assert.equal(p.run("S.exp.actions"), actions + 1, "the clock goes on; the step is one map action");
  assert.equal(p.run("S.exp.patch.x"), 0, "in at the far side's west edge");
  assert.equal(p.run("S.exp.pos"), p.run(`((${cell} / MW | 0) * MW)`), "on the same row, in the west column");
  assert.equal(p.run("S.exp.start"), p.run("S.exp.pos"), "the reach is counted from where you came in");
  // and back again
  p.run(`(() => { const P = S.exp.patch, lay = layout(P.key); P.x = 0; P.dir = 'left'; patchStep('left', 'creep'); })()`);
  assert.equal(p.run("S.here"), "g1", "back in region 1");
  assert.equal(p.run("S.exp.rg"), undefined, "region 1 names nothing");
  assert.equal(p.run("S.exp.n"), n, "still the same expedition");
  assert.equal(p.run("S.exp.pos"), cell, "in the cell you left");
  assert.equal(p.run("S.exp.cargo.e + ':' + S.exp.cargo.d"), "3:2", "the hold stayed");
  assert.equal(p.run("S.exp.actions"), actions + 2);
  assert.equal(snap(), mibis, "the place keeps its wild mibis at the same spots");
});

// The coast: from the beach or the shallows a step into the deep water is refused, row after row; the explorer never stands in water.
test("on the coast a step from the beach or the shallows into the deep water is refused: every row ends on the shore, never in the water", () => {
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(13); TEST.calm = true; S.tier = 2;`);
  const id = p.run(`openRegion([0, 2])`); p.run(`mountRegion(${JSON.stringify(id)})`);
  p.run(`S.revealed.fill(1); startExpedition('weather', 1); S.exp.range = 12; S.exp.reach = reachCells(1, 12); S.exp.pos = 1; enterPatch(); if (RT.view) endView();`);
  const r = p.run(`(() => { const lay = layout('1'), W = lay.w, P = S.exp.patch, wet = t => t === T.WATER || t === T.DEEP || t === T.ISLE, out = { rows: 0, wetStood: 0, refused: 0 };
    for (let y = 2; y < lay.h - 2; y++) {
      let x0 = -1; for (let x = 12; x >= 5; x--) if (!T_BLOCK[lay.tiles[y * W + x]] && !wet(lay.tiles[y * W + x]) && lay.tiles[y * W + x - 1] !== undefined && !wet(lay.tiles[y * W + x])) { x0 = x; break; }
      if (x0 < 0) continue;
      P.x = x0; P.y = y; P.dir = 'left'; out.rows++;
      for (let i = 0; i < 20; i++) { FX.lockUntil = 0; const px = P.x; patchStep('left', 'creep'); if (wet(lay.tiles[S.exp.patch.y * W + S.exp.patch.x])) out.wetStood++; if (S.exp.patch.x === px && i > 0) { if (wet(lay.tiles[y * W + px - 1])) out.refused++; break; } }
    }
    return out; })()`);
  assert.ok(r.rows > 10, "rows walked: " + r.rows);
  assert.equal(r.wetStood, 0, "the explorer never stands in water");
  assert.ok(r.refused > 5, "rows that ended against the water: " + r.refused);
});

// Owner 2026-11-11 note 18: every zoom is drawn from the same land. The map between expeditions (and so the band inset) is the overview raster shrunk, once the raster is there; the edge marks follow straight cell borders then.
test("the map between expeditions is painted from the overview raster once it is there, the cell labels until then", async () => {
  const { presetOverview, overviewOf, OV, CW, CH } = await import("../src/gen7/place.mjs");
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(13);`);
  const colors = p.run(`(() => { const pb = buildMapPB(); return { ready: !!overviewNow() }; })()`);
  assert.equal(colors.ready, false, "no raster yet: the cell labels draw the map");
  const rows = p.run(`(() => { const R = hereRegion(); return [S.regions[0].seed, R.slot[0], R.slot[1]]; })()`);
  const ov = overviewOf(rows[0], rows[1], rows[2]); presetOverview(rows[0], rows[1], rows[2], ov);
  const q = p.run(`(() => { const ovr = overviewNow(), pb = buildMapPB(); const want = (x, y) => ovr[Math.floor(y * ${CH} / CELL) * (MW * ${CW}) + Math.floor(x * ${CW} / CELL)];   // the raster: the cell's 24 x 28 tiles a cell, row by row
    let bad = 0, n = 0, water = 0, raised = 0; for (let y = 0; y < MH * CELL; y += 3) for (let x = 0; x < MW * CELL; x += 3) { const v = want(x, y), c = pb.get(x, y); n++; if ((v & 15) === 2) { water++; if (c !== C.river) bad++; } if (v & 8) raised++; }
    const cellOf = landCellOf(72); return { ready: !!ovr, bad, n, water, raised, c0: cellOf(100, 100), c1: cellOf(71, 71), c2: cellOf(72, 72) }; })()`);
  assert.equal(q.ready, true); assert.equal(q.bad, 0, "every water tile of the raster is water on the map (of " + q.water + ")");
  assert.ok(q.n > 1000 && q.water + q.raised > 0, "the sample read the raster");
  assert.deepEqual([q.c0, q.c1, q.c2], [1 + 1 * 16, 0, 1 + 1 * 16], "from the raster the cell borders are the straight lines");
  assert.ok(OV.RAISED === 8);
});

// Walk fixes (owner's notes of 2026-11-10, 14-15 and 25-32): over 200 places at tier 1 (so range hazes stand) no thing the explorer can act on lies where the explorer cannot walk to it, a bush or a mark
// is never under a crown or on a blocking tile, decor keeps its gap round every find, and the walk and the hold-Call (whole place) view read one uncovered set.
const CHECK = `(() => {
  const bad = [], key = String(__C__), r0 = S.exp.range; S.exp.pos = __C__;
  S.exp.range = r0 + 1; enterPatch(); if (RT.view) endView(); leavePatch(); S.exp.range = r0; S.exp.pos = __C__;   // the last visit led one ring further (a Tuliko along): the layout is cached for those open sides
  enterPatch(); if (RT.view) endView();
  const lay = layout(key); if (lay.shutSig !== shutSig(key)) bad.push('the cached layout was made for other open sides: ' + lay.shutSig + ' / ' + shutSig(key));
  const W = lay.w, H = lay.h, N = W * H, lc = lay.lines ? lay.lines.cells : new Map(), blocked = i => T_BLOCK[lay.tiles[i]] || lc.has(i);
  const seen = new Uint8Array(N), q = [];   // a walk from the entries over open ground (the haze and closed bands do not walk)
  for (const o of lay.openings) for (let k = o.from - 1; k <= o.to - 1; k++) { const x = o.side === 'W' ? 0 : o.side === 'E' ? W - 1 : k, y = o.side === 'N' ? 0 : o.side === 'S' ? H - 1 : k, i = y * W + x; if (!seen[i] && !blocked(i)) { seen[i] = 1; q.push(i); } }
  { const i = lay.spawnPt.y * W + lay.spawnPt.x; if (!seen[i] && !blocked(i)) { seen[i] = 1; q.push(i); } }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const X = x + dx, Y = y + dy, j = Y * W + X; if (X >= 0 && Y >= 0 && X < W && Y < H && !seen[j] && !blocked(j)) { seen[j] = 1; q.push(j); } } }
  const near = (x, y) => [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && seen[Y * W + X]; });
  const things = lay.feats.filter(f => 'buqk'.includes(f.kind)).map(f => ({ what: f.kind, x: f.x, y: f.y })).concat(S.pods.filter(p => p.k === key && p.x >= 0).map(p => ({ what: 'pod', x: p.x, y: p.y })));
  for (const t of things) {
    if (q.length && !near(t.x, t.y)) bad.push('unreachable ' + t.what + ' ' + t.x + ',' + t.y);
    if (lc.has(t.y * W + t.x)) bad.push(t.what + ' in the haze ' + t.x + ',' + t.y);
    if ((t.what === 'b' || t.what === 'q') && (!lay.clear[t.y * W + t.x] || T_BLOCK[lay.tiles[t.y * W + t.x]])) bad.push(t.what + ' under a crown or on a blocking tile ' + t.x + ',' + t.y);
  }
  for (const t of things) for (const d of lay.baked.place.decals) { const dx = Math.floor(d.x / 48) - 1 - t.x, dy = Math.floor(d.y / 48) - 1 - t.y; if (t.what !== 'pod' && Math.abs(dx) <= 1 && dy >= -1 && dy <= 2) bad.push('decor over ' + t.what + ' ' + t.x + ',' + t.y); }
  { const left = leftItemsAll(lay.cell).filter(i => !i.cave); for (const i of left) if (q.length && !near(i.x, i.y)) bad.push('counted but unreachable ' + i.k + ' ' + i.x + ',' + i.y); }
  // one fog record: lift every other row, then compare the whole view's veil (apron included) with the walk's uncovered set
  S.veil[key] = Array.from({ length: H }, (_, y) => (y % 2 ? 0 : -1) >>> 0);
  const wv = placeVeil(lay), P = lay.baked.place;
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const px = x + lay.baked.ox, py = y + lay.baked.oy, inside = px >= 0 && py >= 0 && px < W && py < H, want = inside ? !unveiled(key, px, py) : false; if ((wv[y * P.w + x] === 1) !== want) bad.push('fog differs at ' + px + ',' + py); }
  S.veil[key] = Array.from({ length: H }, () => 0xffffff >>> 0);
  { const all = placeVeil(lay); for (let i = 0; i < all.length; i++) if (all[i]) { bad.push('fog left with the walk all clear at ' + (i % P.w) + ',' + ((i / P.w) | 0)); break; } }
  delete S.veil[key]; leavePatch();
  return bad;
})()`;

test("over 200 places nothing to act on lies where it cannot be walked to, no bush or mark sits under a crown, decor keeps its gap, and the walk and hold-Call views read one fog record", () => {
  let places = 0; const bad = [];
  for (const seed of [7, 13, 42, 5]) {
    if (places >= 200) break;
    const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 1; startExpedition('weather', G.spawns[0]);`);
    const cells = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && !G.island[c]) out.push(c); return out; })()");
    for (const c of cells) {
      if (places >= 200) break;
      for (const b of p.run(CHECK.replaceAll("__C__", String(c)))) bad.push(`seed ${seed} cell ${c}: ${b}`);
      places++;
    }
  }
  assert.equal(places, 200, `${places} places checked`);
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length} faults`);
});
