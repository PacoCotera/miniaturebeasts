// owner-notes-fix-1 (owner notes #34 #41 #77; #75 #76 are in stone-full.test.mjs and gen7-press.test.mjs):
//   node --test prototypes/exploration/tests/owner-notes-fix-1.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage, PLACES } from "./page-harness.mjs";
import { genRegion7 } from "../src/gen7/region.mjs";
import { bakedCell, layout7 } from "../src/world7.mjs";
import { cellIR, TV } from "../src/gen7/place.mjs";

// #34: no wall stone or stump (a set piece's prop) on a road tile or the tile beside it; the Split Stone (a landmark) is no wall
test("#34 no set-piece stone on or beside the road, on the owner's cell and its ring (seed 7, cell 10,14)", () => {
  let walls = 0;
  for (let Y = 13; Y <= 15; Y++) for (let X = 9; X <= 11; X++) {
    const ir = cellIR(7, X, Y, undefined), w = ir.w, h = ir.h;
    for (const p of ir.props) {
      if (p.cluster !== -5 || p.fam === "landmark") continue;
      walls++;
      const x = p.tx - ir.origin.x, y = p.ty - ir.origin.y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx, v = y + dy; if (u < 0 || v < 0 || u >= w || v >= h) continue;
        assert.notEqual(ir.terrain[v * w + u], TV.PATH, `a ${p.kind} at ${p.tx},${p.ty} stands on or beside the road`);
      }
    }
  }
  assert.ok(walls >= 0);
});

// #41: a dropped fruit never lands under a prop's picture
test("#41 the layout knows the tiles a prop is drawn over (bush, boulder, crown)", () => {
  const [seed, cell] = [4260276819, 171];
  const G = genRegion7(seed, 2, 2), b = bakedCell(PLACES.ctx, seed, [2, 2], cell), lay = layout7(PLACES.ctx, G, seed, [2, 2], String(cell), undefined, undefined, b);
  assert.equal(typeof lay.coverAt, "function");
  let covered = 0, clear = 0, onFoot = 0, feet = 0;
  for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) lay.coverAt(x, y) ? covered++ : clear++;
  for (const p of b.place.props) {   // tall grass is walked through and covers nothing; every other prop covers its own foot tile
    const cx = Math.floor(p.x / 48) - 1, cy = Math.floor(p.y / 48) - 1; if (cx < 0 || cy < 0 || cx >= lay.w || cy >= lay.h || PLACES.ts.sprites[p.kind].kind === "tall-grass") continue;
    feet++; if (lay.coverAt(cx, cy)) onFoot++;
  }
  assert.ok(covered > 0 && clear > covered, `some tiles covered, most clear: ${covered} / ${clear}`);
  assert.ok(feet > 0 && onFoot === feet, `every prop's own foot tile is covered: ${onFoot} of ${feet}`);
});

test("#41 a fruit that drops lands on the nearest clear tile, never a covered one", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch();");
  // cover a block of ground round a bush's tile, as a big crown would, and drop from its middle
  const r = JSON.parse(p.run(`(() => { const key = S.exp.patch.key, lay = layout(key), w = lay.w;
    let c = null; for (let y = 4; y < lay.h - 4 && !c; y++) for (let x = 4; x < w - 4 && !c; x++) if (lay.reach[y * w + x] && !occupant(key, x, y)) c = { x, y };
    lay.coverAt = (x, y) => Math.abs(x - c.x) <= 1 && Math.abs(y - c.y) <= 1;
    const q = freeAround(key, c.x, c.y, null, true), old = freeAround(key, c.x, c.y, null);
    return JSON.stringify({ c, q, old, covered: q ? lay.coverAt(q.x, q.y) : null, d: q ? Math.max(Math.abs(q.x - c.x), Math.abs(q.y - c.y)) : null }); })()`));
  assert.ok(r.q, "a clear tile is found: " + JSON.stringify(r));
  assert.equal(r.covered, false, "not a covered tile: " + JSON.stringify(r));
  assert.equal(r.d, 2, "the nearest clear ring: " + JSON.stringify(r));
});

// #77: the dotted reach square is for the start pick; the plain map of a walk does not draw it
test("#77 the reach square is not drawn on the map of a walk, and is on the start pick", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); ensureMap();");
  const amber = p.run("HEX.indexOf(HEX[C.amber])");
  const countAmber = () => Array.from(p.run("scr").px()).filter(v => v === amber).length;
  const cell = p.run("[...Array(MW * MH).keys()].find(c => { const q = cxy(c); return q.x >= 3 && q.y >= 3 && q.x < MW - 3 && q.y < MH - 3; })");
  p.run(`S.ui.cur = ${cell}; S.ui.type = 'weather'; scr.px().fill(-1); drawMap('place', 0);`);
  const pick = countAmber();
  p.run(`startExpedition('weather', ${cell}); S.exp.fog = null; scr.px().fill(-1); drawMap('walk', 0);`);
  const walk = countAmber();
  assert.ok(pick > 40, "the start pick draws the dashed square: " + pick);
  assert.ok(walk < pick / 2, "the map of a walk does not: " + walk + " against " + pick);
});
