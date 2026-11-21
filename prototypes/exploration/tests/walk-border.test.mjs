// Owner bugs #101, #102, #103 (walk-border-1): the walk refuses every border the page draws.
//   #102: the Probe's dashed range line is drawn on every side of the range square that faces ground outside it, but the blocks came only from a place's listed openings:
//         a side the square shuts with no opening on it (seed 7 patch 12,2 east) had the line and no blocks, so the hero walked the 3 tiles past it.
//   #103/#101: the page read the rim line's step bits from lay.rim, which a place with mud or scree overwrote with the list of those tiles (lay.rim is the drawn tiles); the bits are lay.rimSteps now.
//   node --test prototypes/exploration/tests/walk-border.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

function world(seed, start, range) {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.start = ${start}; S.exp.range = ${range};`);
  return p;
}
function at(p, cell, x, y, dir) {
  p.run(`S.exp.pos = ${cell}; enterPatch(); if (RT.view) endView(); S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; patchStep('${dir}', 'tap');`);
  return p.run("S.exp.patch.x + ',' + S.exp.patch.y");
}

test("#101 and #103 (seed 44 patch 11,1 and 9,2): the rim line is not crossed east", () => {
  const p = world(44, 41, 4);
  assert.equal(at(p, 27, 8, 21, "right"), "8,21", "#103: tile 8,21 east stops at the rim line");
  assert.equal(at(p, 27, 9, 21, "left"), "9,21", "and not from the far side");
  assert.equal(at(p, 41, 2, 12, "right"), "2,12", "#101: tile 2,12 east stops");
});

test("#102 (seed 7 patch 12,2, start 72): a range side with no opening is blocked where the line is drawn", () => {
  const p = world(7, 72, 4);
  for (const y of [18, 19, 26, 27]) assert.equal(at(p, 44, 21, y, "right"), "21," + y, "tile 21," + y + " east stops at the Probe range line");
});

// every drawn border of every cell in reach, two seeds: a step across a cliff-rim edge or into the band behind a range line never moves the hero (a way up's own steps are the ramp's and walk)
const SWEEP = (range) => `(() => {
  const out = { cells: 0, rim: 0, rng: 0, rimWalk: [], rngWalk: [] }, st = S.exp.start, sx = st % MW, sy = (st / MW) | 0;
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (let cy = Math.max(0, sy - ${range}); cy <= Math.min(MH - 1, sy + ${range}); cy++) for (let cx = Math.max(0, sx - ${range}); cx <= Math.min(MW - 1, sx + ${range}); cx++) {
    const cell = cy * MW + cx; S.exp.pos = cell; enterPatch(); if (RT.view) endView();
    const lay = layout(S.exp.patch.key); if (!lay || !lay.baked || lay.cave) continue; out.cells++;
    const pl = lay.baked.place, ox = lay.baked.ox, oy = lay.baked.oy, w = lay.w, h = lay.h, shut = {};
    for (const d of Object.keys(D)) { const n = stepCell(cell, d); shut[d] = n >= 0 && !inRange(n); }
    const band = (X, Y) => { const px = X - ox, py = Y - oy; return (shut.up && py < 3) || (shut.down && py > pl.h - 4) || (shut.left && px < 3) || (shut.right && px > pl.w - 4); };
    const ramp = (d) => { const n = stepCell(cell, d); return n >= 0 && edgeKind(cell, d) === EDGE.RAMP; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (const d of Object.keys(D)) {
      const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const a = pl.terrain[(y - oy) * pl.w + (x - ox)], b = pl.terrain[(ny - oy) * pl.w + (nx - ox)];
      const rimEdge = (a === 8) !== (b === 8), rngEdge = !band(x, y) && band(nx, ny);
      if (!rimEdge && !rngEdge) continue;
      if (T_BLOCK[lay.tiles[y * w + x]] || (lay.lines && lay.lines.cells.has(y * w + x))) continue;
      if (rimEdge) out.rim++; if (rngEdge) out.rng++;
      S.exp.patch.x = x; S.exp.patch.y = y; patchStep(d, 'tap');
      if (S.exp.patch.x !== x || S.exp.patch.y !== y) { if (rngEdge) out.rngWalk.push([cell, x, y, d]); else out.rimWalk.push([cell, x, y, d]); }
    }
  }
  return JSON.stringify(out);
})()`;
for (const [seed, start, range] of [[44, 41, 3], [7, 72, 4]]) {
  test(`sweep seed ${seed}: no rim or range edge walks (only the ramps' own stairs)`, () => {
    const p = world(seed, start, range), r = JSON.parse(p.run(SWEEP(range)));
    assert.ok(r.cells > 20 && r.rim > 500 && r.rng > 100, "the sweep covers the reach: " + JSON.stringify({ cells: r.cells, rim: r.rim, rng: r.rng }));
    assert.deepEqual(r.rngWalk, [], "range edges that walk");
    // a way up is two tiles wide in a rim edge (the stairs); every other rim edge refuses
    const stairs = r.rimWalk.filter(([c, x, y, d]) => r.rimWalk.some(([c2, x2, y2, d2]) => c2 === c && d2 === d && (d === "up" || d === "down" ? y2 === y && Math.abs(x2 - x) === 1 : x2 === x && Math.abs(y2 - y) === 1)));
    assert.deepEqual(r.rimWalk.filter((e) => !stairs.includes(e)), [], "rim edges that walk, apart from the stairs");
  });
}
