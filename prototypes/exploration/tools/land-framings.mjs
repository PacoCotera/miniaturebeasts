// land-b3d-face3-1: where to shoot the four framings on a seed's fixed window (land-windows.json): a face with a way up, two plateaus meeting at a corner, a face beside water.
//   node land-framings.mjs [--seeds 7,13]   -> one JSON line per seed: { seed, diagonal: [x, y], wayup: [x, y], corner: [x, y], water: [x, y] } in world tiles (the frame's middle)
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, findWayup, tileLevel, CW, CH } from '../src/gen7/levels.mjs';
import { wetCell } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/world.mjs';
import { L as LAND } from '../src/world.mjs';

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const SEEDS = String(opt('seeds', '7,13')).split(',').map(Number), WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
for (const seed of SEEDS) {
  const w = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm), PW = w.w / CW, PH = w.h / CH, gx0 = w.X * CW, gy0 = w.Y * CH, out = { seed };
  // inner frame margin: the frame is 9.4 x 11 tiles, keep it inside the window
  const inside = (x, y) => x >= gx0 + 6 && y >= gy0 + 7 && x < gx0 + w.w - 6 && y < gy0 + w.h - 7;
  // a way up (the realm's stair: findWayup per stair in the window)
  const stairs = [...L.stairs.values()].filter(s => s.X >= w.X && s.X < w.X + PW && s.Y >= w.Y && s.Y < w.Y + PH);
  for (const s of stairs) { const wu = findWayup(L, s.X, s.Y, s.port); if (wu && inside(wu.x, wu.y)) { out.wayup = [wu.x + 1, wu.y]; break; } }
  const R = (x, y) => tileLevel(L, x, y) > 0 ? 1 : 0;
  // two plateaus meeting at a corner: a 2 x 2 raised block with another 2 x 2 raised block diagonally beyond it (a low 2 x 2 each side between them)
  const blk = (x, y, v) => R(x, y) === v && R(x + 1, y) === v && R(x, y + 1) === v && R(x + 1, y + 1) === v;
  find: for (let y = gy0 + 7; y < gy0 + w.h - 7; y++) for (let x = gx0 + 6; x < gx0 + w.w - 6; x++) {
    // a low 2 x 2 with a raised 2 x 2 diagonally beyond it each way (NW and SE, or NE and SW): a channel running past a corner of each plateau
    for (const s of [1, -1]) { if (blk(x, y, 0) && blk(x - 2 * s, y - 2, 1) && blk(x + 2 * s, y + 2, 1)) { out.corner = [x + 1, y + 1]; break find; } }
  }
  // a south face beside water: a south lip tile with a water tile within 3 tiles east or west of its run's end, or under it
  const wet = (x, y) => { const cx = Math.floor(x / CW), cy = Math.floor(y / CH); return !!wetCell(L, cx, cy)[(y - cy * CH) * CW + x - cx * CW]; };
  wat: for (let y = gy0 + 7; y < gy0 + w.h - 7; y++) for (let x = gx0 + 6; x < gx0 + w.w - 6; x++) {
    if (!(R(x, y) && !R(x, y + 1) && R(x + 1, y) && !R(x + 1, y + 1) && R(x + 2, y) && !R(x + 2, y + 1))) continue;
    for (let dy = 1; dy <= 8; dy++) for (let dx = -8; dx <= 9; dx++) if (wet(x + dx, y + dy)) { out.water = [x + 1 + (dx >> 1), y + 1 + (dy >> 1)]; break wat; }
  }
  // not in the window: the nearest raised cell of the whole realm with a water cell beside it, scanned the same way
  if (!out.water) {
    const re = L.realm, mid = [w.X + PW / 2, w.Y + PH / 2], cand = [];
    for (let Y = 3; Y < RH - 3; Y++) for (let X = 3; X < RW - 3; X++) { const c = Y * RW + X; if (re.level[c] < 1 || re.land[c] === LAND.WATER) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => re.land[(Y + dy) * RW + X + dx] === LAND.WATER && !re.ford[(Y + dy) * RW + X + dx])) cand.push([X, Y]); }
    cand.sort((a, b) => Math.hypot(a[0] - mid[0], a[1] - mid[1]) - Math.hypot(b[0] - mid[0], b[1] - mid[1]));
    wide: for (const [X, Y] of cand.slice(0, 60)) for (let ty = 8; ty < CH - 8; ty++) for (let tx = 8; tx < CW - 8; tx++) {
      const x = X * CW + tx, y = Y * CH + ty; if (!(R(x, y) && !R(x, y + 1) && R(x + 1, y) && !R(x + 1, y + 1) && R(x + 2, y) && !R(x + 2, y + 1))) continue;
      for (let dy = 1; dy <= 8; dy++) for (let dx = -8; dx <= 9; dx++) if (wet(x + dx, y + dy)) { out.water = [x + 1 + (dx >> 1), y + 1 + (dy >> 1)]; out.waterElsewhere = true; break wide; } }
  }
  console.log(JSON.stringify(out));
}
