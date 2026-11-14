// The walk check across places (land-b3b-landrule-2): on the 4 x 3 places of each seed's window, every walkable tile reaches every other, through each place's own ways in, the borders and the ways up.
//   node land-walk-window.mjs [--seeds 7,13]
// Walk mask per place: the game's own (water, deep water, thicket and the cliff's lip, face and flank block; a way up's cells walk), as land-walk.mjs. A border is crossed where land-b1-crossing-2's tile
// rule holds: a run of two or more neighbouring tile pairs across the border that both walk and are both raised or both low. Output: per seed the components of walkable tiles, with size and place for each pocket.
import { readFileSync } from 'node:fs';
import { CW, CH, levelsOf, raised } from '../src/gen7/levels.mjs';
import { realm7, genRegion7 } from '../src/gen7/region.mjs';
import { MW, MH } from '../src/world.mjs';
import { cellIR, TV } from '../src/gen7/place.mjs';
import { bakeCtx } from './gen7-render.mjs';
import { cliffInfo } from '../../places/src/bake/openedges.mjs';

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const SEEDS = String(opt('seeds', '7,13')).split(',').map(Number), WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
const terrains = bakeCtx().terrains;
for (const seed of SEEDS) {
  const wv = WINDOWS.find(v => v.seed === seed), LV = levelsOf(realm7(seed).realm), PW = wv.w / CW, PH = wv.h / CH, W = wv.w, H = wv.h;
  const walk = new Uint8Array(W * H), up = new Uint8Array(W * H);
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
    const X = wv.X + i, Y = wv.Y + j, ir = cellIR(seed, X, Y), cl = cliffInfo(ir, terrains), G = genRegion7(seed, Math.floor(X / MW), Math.floor(Y / MH)), ford = G.ford[(Y % MH) * MW + (X % MW)];   // the water of a ford cell is the ford: shallow, walked
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
      const k = (ty + 1) * ir.w + tx + 1, w = ![TV.DEEP, ...(ford ? [] : [TV.WATER]), TV.THICKET].includes(ir.terrain[k]) && (!cl.blockCells.has(k) || cl.wayup.has(k));
      walk[(j * CH + ty) * W + i * CW + tx] = w ? 1 : 0; up[(j * CH + ty) * W + i * CW + tx] = raised(LV, wv.X * CW + i * CW + tx, wv.Y * CH + j * CH + ty) ? 1 : 0;
    }
  }
  const par = new Int32Array(W * H).map((_, i) => i), find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }, join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[b] = a; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!walk[y * W + x]) continue;
    // inside one place (and along a border, only through the tile rule below)
    if (x + 1 < W && walk[y * W + x + 1] && (x + 1) % CW) join(y * W + x, y * W + x + 1);
    if (y + 1 < H && walk[(y + 1) * W + x] && (y + 1) % CH) join(y * W + x, (y + 1) * W + x);
  }
  const run = (pairs) => { let n = 0; for (const [a, b] of pairs) { if (walk[a] && walk[b] && up[a] === up[b]) { n++; if (n >= 2) return true; } else n = 0; } return false; };
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
    if (i + 1 < PW) { const pairs = []; for (let ty = 0; ty < CH; ty++) { const y = j * CH + ty, x = (i + 1) * CW - 1; pairs.push([y * W + x, y * W + x + 1]); }
      for (let k = 0; k < pairs.length; k++) { const [a, b] = pairs[k]; if (!(walk[a] && walk[b] && up[a] === up[b])) continue; const prev = k && walk[pairs[k - 1][0]] && walk[pairs[k - 1][1]] && up[pairs[k - 1][0]] === up[pairs[k - 1][1]], next = k + 1 < pairs.length && walk[pairs[k + 1][0]] && walk[pairs[k + 1][1]] && up[pairs[k + 1][0]] === up[pairs[k + 1][1]]; if (prev || next) join(a, b); } }
    if (j + 1 < PH) { const pairs = []; for (let tx = 0; tx < CW; tx++) { const x = i * CW + tx, y = (j + 1) * CH - 1; pairs.push([y * W + x, (y + 1) * W + x]); }
      for (let k = 0; k < pairs.length; k++) { const [a, b] = pairs[k]; if (!(walk[a] && walk[b] && up[a] === up[b])) continue; const prev = k && walk[pairs[k - 1][0]] && walk[pairs[k - 1][1]] && up[pairs[k - 1][0]] === up[pairs[k - 1][1]], next = k + 1 < pairs.length && walk[pairs[k + 1][0]] && walk[pairs[k + 1][1]] && up[pairs[k + 1][0]] === up[pairs[k + 1][1]]; if (prev || next) join(a, b); } }
  }
  void run; if (opt('rows', '')) for (let y = +opt('rows', 0); y < +opt('rows', 0) + 8; y++) { let s = ''; for (let x = 16; x < 36; x++) s += walk[y * W + x] ? (up[y * W + x] ? 'U' : 'w') : (up[y * W + x] ? '^' : '.'); console.log(y, s); } if (opt('map', '')) { const ids = new Map(); let out = ''; for (let y = 0; y < H; y += 3) { for (let x = 0; x < W; x += 2) { const i = y * W + x; if (!walk[i]) { out += up[i] ? '^' : '.'; continue; } const r = find(i); if (!ids.has(r)) ids.set(r, ids.size); out += 'ABCDEFGHIJKLMNOP'[ids.get(r) % 16]; } out += '\n'; } console.log(out); }
  const comp = new Map(); for (let i = 0; i < W * H; i++) if (walk[i]) { const r = find(i); let c = comp.get(r); if (!c) comp.set(r, c = { n: 0, cells: new Map(), up: 0 }); c.n++; c.up += up[i]; const key = `${wv.X + Math.floor((i % W) / CW)},${wv.Y + Math.floor(((i / W) | 0) / CH)}`; c.cells.set(key, (c.cells.get(key) || 0) + 1); }
  const list = [...comp.values()].sort((a, b) => b.n - a.n), total = list.reduce((s, c) => s + c.n, 0);
  console.log(`seed ${seed}: ${total} walkable tiles, ${list.length} component(s); main ${list[0].n} (${(100 * list[0].n / total).toFixed(1)}%)`);
  for (const c of list.slice(1)) console.log(`  pocket ${c.n} tiles (${c.up ? 'raised' : 'low'}${c.up && c.up < c.n ? ' part' : ''}) in place(s) ${[...c.cells].map(([k, n]) => k + 'x' + n).join(' ')}`);
}
