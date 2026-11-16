// F6 greybox stills: plain colour blocks (a schematic, rule 18: diagrams may be code), walking zoom (450 x 600 at 48 px a tile, the game's own place view) with the pawn in frame, and the whole place beside it at 14 px a tile.
// Each still names and keys itself. The empty slots (`falls`, `ford-ground`, `bridge`) are labelled blocks.
//   node f6-stills.mjs <seed> <outdir> [root]          writes <outdir>/<seed>-<scene>.png and scenes.json (the cells and tiles chosen)
import path from 'node:path';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
const [seedS, outDir, rootArg] = process.argv.slice(2), seed = +seedS;
const root = rootArg || path.resolve(new URL('../../..', import.meta.url).pathname), imp = f => import(path.join(root, 'prototypes/exploration/src/gen7', f));
const require = createRequire(path.join(root, 'prototypes/exploration/package.json')), PI = require('pureimage');
mkdirSync(outDir, { recursive: true });
const P = await imp('place.mjs'), PL = await imp('places.mjs'), { realm7 } = await imp('region.mjs'), { CW, CH } = P, RW = 80;
const re = realm7(seed).realm, feats = re.features || [];
const font = PI.registerFont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'LS'); font.loadSync();
const COL = { 1: '#1b3a66', 2: '#4f86c6', 3: '#e0c98a', 5: '#b58a55', 6: '#6fa44a', 7: '#9a7453', 8: '#8d977f', 9: '#2c5030', 10: '#93a332', 11: '#8a6a3c', 12: '#b8a85a', 13: '#7fae5e', 14: '#a9a39a', 20: '#d9ead3', 21: '#6b4a2a' };
const NAME = { 1: 'deep water', 2: 'water', 3: 'sand', 5: 'path', 6: 'grass', 8: 'raised land', 9: 'thicket', 10: 'scrub', 11: 'leaf litter', 12: 'dry grass', 13: 'turf', 14: 'scree', 20: 'ford-ground [art slot]', 21: 'bridge [art slot]' };
const cellOf = (X, Y) => P.cellTerrain(seed, X, Y);
// the tile (world) of any cell's own area, through the cell's own array (apron included)
const tileAt = (gx, gy) => { const X = Math.floor(gx / CW), Y = Math.floor(gy / CH), c = cellOf(X, Y); return c.terrain[(gy - c.y0) * c.w + gx - c.x0]; };
const scenes = [];
// ---- find the scenes ----
const fall = feats.filter(f => f.kind === 'falls').map(f => { const fx = f.links.foot % RW, fy = (f.links.foot / RW) | 0; for (const [X, Y] of [[fx, fy], [fx, fy - 1]]) for (const s of cellOf(X, Y).falls || []) return { X: fx, Y: fy, s, f }; return null; }).filter(Boolean);
const overhangFall = fall.find(q => { const pl = PL.planOf(seed, q.X, q.Y); return pl && pl.spots.some(s => s.id === 'overhang'); });
if (overhangFall || fall.length) { const q = overhangFall || fall[0]; scenes.push({ name: 'falls', title: 'a stream with its falls' + (overhangFall ? ' and the overhang beside them' : ''), cx: q.s.x + 1, cy: q.s.y + 6, cell: [q.X, q.Y], slots: [{ k: 'falls', x: q.s.x, y: q.s.y, w: 2, h: 1 }] }); }
const fordCells = [];
for (const c of feats.filter(f => f.kind === 'stream').flatMap(f => f.cells)) { const X = c % RW, Y = (c / RW) | 0; if (X < 2 || Y < 2 || X > RW - 3 || Y > 97) continue; const ct = cellOf(X, Y), T = ct.terrain; let trailFord = false, fords = 0, plain = 0;
  for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) { if (T[y * ct.w + x] !== 20) continue; fords++; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T[(y + dy) * ct.w + x + dx] === 5)) trailFord = true; }
  if (fords >= 6 && trailFord) fordCells.push({ X, Y, fords }); }
if (fordCells.length) { const q = fordCells[Math.floor(fordCells.length / 2)], ct = cellOf(q.X, q.Y); let sx = 0, sy = 0, n = 0; for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) if (ct.terrain[y * ct.w + x] === 20) { sx += ct.x0 + x; sy += ct.y0 + y; n++; } scenes.push({ name: 'fords', title: 'a trail ford and the extra ford', cx: Math.round(sx / n), cy: Math.round(sy / n), cell: [q.X, q.Y], slots: [] }); }
feats.filter(f => f.kind === 'bridge').slice(0, 2).forEach((f, i) => { const c = f.cells[0], X = c % RW, Y = (c / RW) | 0, ct = cellOf(X, Y); let sx = 0, sy = 0, n = 0; for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) if (ct.terrain[y * ct.w + x] === 21) { sx += ct.x0 + x; sy += ct.y0 + y; n++; }
  if (n) scenes.push({ name: 'bridge' + (i + 1), title: 'a bridge with its trail', cx: Math.round(sx / n), cy: Math.round(sy / n), cell: [X, Y], slots: [] }); });
const rav = feats.find(f => f.kind === 'stream' && f.links.drop === 'ravine'); if (rav) { const c = rav.cells[rav.links.seen], X = c % RW, Y = (c / RW) | 0; scenes.push({ name: 'ravine-head', title: 'a ravine head: the stream comes out of the rock', cx: X * CW + 12, cy: Y * CH + 10, cell: [X, Y], slots: [] }); }
const pass = (re.destinations || []).find(d => d.kind === 'pass' && d.c % RW > 1 && d.c % RW < RW - 2); if (pass) { const X = pass.c % RW, Y = (pass.c / RW) | 0, ir = P.cellIR(seed, X, Y), b = (ir.traces || []).find(t => t.kind === 'beacon') || (ir.traces || [])[0]; scenes.push({ name: 'pass', title: 'a pass with its post' + (b ? '' : ' (no post stands in this place yet)'), cx: b ? ir.origin.x + b.x : X * CW + 12, cy: b ? ir.origin.y + b.y : Y * CH + 14, cell: [X, Y], slots: b ? [{ k: 'post', x: ir.origin.x + b.x, y: ir.origin.y + b.y, w: 1, h: 1 }] : [] }); }
// ---- draw ----
async function draw(sc) {
  const VW = 450, VH = 600, TS = 48, ox = sc.cx - VW / TS / 2, oy = sc.cy - VH / TS / 2 - 1;
  const img = PI.make(VW + 14 * (CW + 2) + 30, Math.max(VH, 14 * (CH + 2)) + 80), g = img.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, img.width, img.height);
  g.fillStyle = '#fff'; g.font = '15pt LS'; g.fillText(`seed ${seed}  ${sc.title}  (place ${sc.cell[0]},${sc.cell[1]})`, 8, 24);
  // walking view
  const y0 = 36;
  for (let ty = Math.floor(oy); ty < oy + VH / TS + 1; ty++) for (let tx = Math.floor(ox); tx < ox + VW / TS + 1; tx++) {
    const v = tileAt(tx, ty), px = Math.round((tx - ox) * TS), py = Math.round((ty - oy) * TS) + y0; g.fillStyle = COL[v] || '#f0f'; g.fillRect(px, py, TS - 1, TS - 1);
  }
  g.fillStyle = '#222'; g.fillRect(VW, 0, img.width - VW, img.height); g.fillRect(0, y0 + VH, VW + 1, img.height - y0 - VH); g.fillRect(0, 28, VW, 8);   // the tiles drawn past the 450 x 600 frame are cut off
  g.fillStyle = '#fff'; g.font = '15pt LS'; g.fillText(`seed ${seed}  ${sc.title}  (place ${sc.cell[0]},${sc.cell[1]})`, 8, 24);
  for (const s of sc.slots) { const px = (s.x - ox) * TS, py = (s.y - oy) * TS + y0; g.fillStyle = '#ffd400'; g.fillRect(px, py, s.w * TS - 1, s.h * TS * 2 - 1); g.fillStyle = '#000'; g.font = '11pt LS'; g.fillText('[' + s.k + ']', px + 2, py + 18); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc((sc.cx - ox + 0.5) * TS, (sc.cy - oy + 0.5) * TS + y0 + 4 * TS * 0, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#000'; g.font = '9pt LS'; g.fillText('pawn', (sc.cx - ox) * TS - 2, (sc.cy - oy + 1.15) * TS + y0);
  g.strokeStyle = '#fff'; g.strokeRect(0, y0, VW, VH);
  // the whole place
  const [X, Y] = sc.cell, ct = cellOf(X, Y), wx = VW + 24, wy = y0, S = 14;
  for (let y = 0; y < ct.h; y++) for (let x = 0; x < ct.w; x++) { g.fillStyle = COL[ct.terrain[y * ct.w + x]] || '#f0f'; g.fillRect(wx + x * S, wy + y * S, S - 1, S - 1); }
  for (const s of sc.slots) if (s.x >= ct.x0 && s.x < ct.x0 + ct.w && s.y >= ct.y0 && s.y < ct.y0 + ct.h) { g.fillStyle = '#ffd400'; g.fillRect(wx + (s.x - ct.x0) * S, wy + (s.y - ct.y0) * S, s.w * S - 1, S - 1); }
  g.strokeStyle = '#fff'; g.strokeRect(wx, wy, ct.w * S, ct.h * S); g.fillStyle = '#fff'; g.font = '9pt LS'; g.fillText('the whole place (its tiles and the one-tile apron), 14 px a tile', wx, wy + ct.h * S + 14);
  // the key
  let ky = wy + ct.h * S + 30; const used = new Set(); for (let y = 0; y < ct.h; y++) for (let x = 0; x < ct.w; x++) used.add(ct.terrain[y * ct.w + x]);
  g.font = '9pt LS'; let kx = wx; for (const v of [...used].sort((a, b) => a - b)) { if (kx + 150 > img.width) { kx = wx; ky += 16; } g.fillStyle = COL[v] || '#f0f'; g.fillRect(kx, ky - 9, 11, 11); g.fillStyle = '#fff'; g.fillText(NAME[v] || 'ground ' + v, kx + 15, ky); kx += 150; }
  const file = path.join(outDir, `${seed}-${sc.name}.png`);
  await PI.encodePNGToStream(img, createWriteStream(file)); return file;
}
// the pawn stands on the walkable tile nearest to the scene's centre (never in water, thicket or on raised land), and the view is centred on it
const WALKV = new Set([3, 5, 6, 7, 10, 11, 12, 13, 14, 20, 21]);
for (const sc of scenes) { let best = null, bd = 1e9; for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) { const d = Math.abs(dx) + Math.abs(dy); if (d < bd && WALKV.has(tileAt(sc.cx + dx, sc.cy + dy))) { bd = d; best = [sc.cx + dx, sc.cy + dy]; } } if (best) { sc.px = best[0]; sc.py = best[1]; } else { sc.px = sc.cx; sc.py = sc.cy; } sc.cx = sc.px; sc.cy = sc.py; }
const out = [];
for (const sc of scenes) out.push({ scene: sc.name, cell: sc.cell, centre: [sc.cx, sc.cy], file: await draw(sc) });
writeFileSync(path.join(outDir, `${seed}-scenes.json`), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out.map(o => o.scene + ' ' + o.cell)));
