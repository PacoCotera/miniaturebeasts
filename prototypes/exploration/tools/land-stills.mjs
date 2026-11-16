// Stills of the land rule at the walking zoom (the game's own place view at 1x: 450 x 532, 48 px a tile), day, for one setting of the rule, drawn by the game's own bake and renderer from ONE checkout (tree).
// The tree holds either today's signed pieces or the greybox set (greybox-set.mjs rewrote its cliff pieces); the land rule is the tree's own levels.mjs.
//   node land-stills.mjs <tree> <outDir> <tag> --d 5200 --face 3 [--seeds 7,13,42] [--set wobbleReach=36,...] [--grid]
// Per seed: three frames on the fixed 4 x 3 cell window of land-windows.json (the longest south face, the longest side wall, the densest bends), the six cases of the spec's section 10, and one overview
// of the window (a code schematic: raised land, south faces by kind, the frames). --grid draws the 1 px darker line on every cell border (the greybox's schematic).
// One setting per process: the place maker keeps the stairs it found.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), [TREE, OUT, TAG] = args, opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const D = Number(opt('d', 5200)), FACE = Number(opt('face', 3)), GRID = args.includes('--grid'), BOTH = args.includes('--both'), SEEDS = String(opt('seeds', '7,13,42')).split(',').map(Number);
const ROOT = path.resolve(TREE), imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const levels = await imp('prototypes/exploration/src/gen7/levels.mjs'), place = await imp('prototypes/exploration/src/gen7/place.mjs'), render = await imp('prototypes/exploration/tools/gen7-render.mjs');
const ground = await imp('prototypes/places/src/ground.mjs'), idx = await imp('prototypes/places/src/indexed.mjs'), png = await imp('prototypes/places/src/png.mjs'), bakeBuild = await imp('prototypes/places/src/bake/build.mjs');
const { windowIR, raisedAt, stairsInfo } = place, { bakeCtx, bakeIR } = render, { renderView, lightState } = ground, { indexedToRgba } = idx, { encodePng } = png, { paletteRgb } = bakeBuild;
const { CW, CH } = levels;
// land-b3f-foot-1: --pawn puts the explorer's map sprite (the game's own file, its colours taken to the set's nearest) on the foot row of the face in frame, and a tree (the game's tree prop) on clear low grass: sprites, no drawing
const PAWN = args.includes('--pawn'), relief = await imp('prototypes/places/src/bake/relief.mjs'), blit = await imp('prototypes/places/src/blit.mjs');
function pawnActor(ts, x48, y48, remap) {
  const im = png.decodePng(readFileSync(path.join(ROOT, 'prototypes/exploration/art/props/pawn-down-0.png')));
  const rgb = ts.palette.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]), px = new Uint8Array(im.w * im.h);
  for (let p = 0; p < px.length; p++) {
    if (im.data[p * 4 + 3] < 128) continue;
    let best = 0, bd = 1e9; const r = im.data[p * 4], g = im.data[p * 4 + 1], b = im.data[p * 4 + 2];
    rgb.forEach((c, k) => { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = k; } });
    px[p] = 48 + best;
  }
  const rle = blit.encodeRle(px, im.w, im.h);
  return { sortY: y48, x: x48, draw: (buf, win) => blit.blitRle(buf, win.w, win.h, x48 - (im.w >> 1) - win.x, y48 - im.h + 2 - win.y, rle, 0, im.w, im.h, remap) };
}
const over = Object.fromEntries(String(opt('set', '')).split(',').filter(Boolean).map((p) => { const [k, v] = p.split('='); return [k, Number(v)]; }));
levels.setLandRule({ detail: D, faceRows: FACE, ...over });
mkdirSync(OUT, { recursive: true });
const WINDOWS = JSON.parse(readFileSync(path.join(ROOT, 'prototypes/exploration/tools/land-windows.json'), 'utf8'));
const FW = 450, FH = 532, CORE = JSON.parse(readFileSync(path.join(ROOT, 'art/companion-48/terrain/meadow/meadow-palette.json'), 'utf8')).entries.slice(0, 48);

// ---- one still ----
function shoot(seed, wx, wy, name) {
  const X0 = Math.floor((wx - 10) / CW), Y0 = Math.floor((wy - 8) / CH), ir = windowIR(seed, X0, Y0, 2, 2), tx = wx - ir.origin.x, ty = wy - ir.origin.y;
  const win = { x: Math.max(0, Math.min(ir.w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(ir.h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH };
  // the pawn on the first walkable row under the face nearest the frame's middle (relief.mjs FOOT), the tree on clear grass in frame two or more tiles from it
  let pawn = null, treeAt = null, irB = ir;
  if (PAWN) {
    const A = relief.landOf(ir, null), fx0 = Math.floor(win.x / 48), fy0 = Math.floor(win.y / 48), fx1 = Math.floor((win.x + FW - 1) / 48), fy1 = Math.floor((win.y + FH - 1) / 48);
    let bd = 1e9; for (let y = fy0 + 1; y <= fy1 - 1; y++) for (let x = fx0 + 1; x <= fx1 - 1; x++) if (relief.partAt(A, x, y) === relief.PART.FOOT) { const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; pawn = [x, y]; } }
    if (!pawn) for (let y = ty; y <= fy1 - 1 && !pawn; y++) if (relief.partAt(A, tx, y) === relief.PART.LOW) pawn = [tx, y];
    // the tree on clear ground in frame: low grass or turf, or the raised top (a face leaves few clear rows below it), its crown clear of every rock cell (relief.mjs extentClear), 3 or more tiles from the pawn
    if (pawn) for (let r = 3; r < 12 && !treeAt; r++) for (let y = fy0 + 3; y <= fy1 && !treeAt; y++) for (let x = fx0 + 2; x <= fx1 - 2; x++) { const p = relief.partAt(A, x, y), t = ir.terrain[y * ir.w + x]; if (Math.abs(x - pawn[0]) + Math.abs(y - pawn[1]) >= r && ((p === relief.PART.LOW && (t === place.TV.GRASS || t === place.TV.TURF)) || p === relief.PART.TOP) && relief.extentClear(A, x, y, 'trees')) { treeAt = [x, y]; break; } }
    if (treeAt) irB = { ...ir, props: ir.props.concat([{ kind: 'tree-broad', x: treeAt[0] * 48 + 24, y: treeAt[1] * 48 + 40, sortY: treeAt[1] * 48 + 40, cx: treeAt[0], cy: treeAt[1] }]).sort((a, b) => a.sortY - b.sortY || a.x - b.x) };
  }
  let pl; try { pl = bakeIR(irB); } catch (e) { console.log('REFUSED', name, e.message); return null; }
  const ts = bakeCtx().sets.get(ir.tileset); let file = null;
  for (const [light, level] of BOTH ? [['day', 0], ['night', 2]] : [['day', 0]]) {
    const pal = paletteRgb(ts), lit = level ? lightState(pl, { level: new Uint8Array(pl.w * pl.h).fill(level) }) : null;
    CORE.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
    const actors = pawn ? [pawnActor(ts, pawn[0] * 48 + 24, pawn[1] * 48 + 40, level ? ground.tablesOf(ts).dark2 : null)] : [];
    const img = indexedToRgba(renderView(ts, pl, 48, win, { ...(lit ? { light: lit } : {}), ...(pawn ? { actors, pawns: [{ x: pawn[0] * 48 + 24, y: pawn[1] * 48 + 24 }] } : {}) }), win.w, win.h, pal);
    if (GRID) {   // a 1 px darker line on every cell border (cells are 48 px; the frame's offset is win.x, win.y)
      const dark = (x, y) => { const o = (y * img.w + x) * 4; for (let c = 0; c < 3; c++) img.data[o + c] = Math.floor(img.data[o + c] * 0.72); };
      for (let x = ((48 - (win.x % 48)) % 48); x < img.w; x += 48) for (let y = 0; y < img.h; y++) dark(x, y);
      for (let y = ((48 - (win.y % 48)) % 48); y < img.h; y += 48) for (let x = 0; x < img.w; x++) dark(x, y);
    }
    file = path.join(OUT, `${TAG}-s${seed}-${name}-${light}-1x.png`); writeFileSync(file, encodePng(img));
    writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ still: path.basename(file), tag: TAG, seed, world: [wx, wy], d: D, faceRows: FACE, ...over, zoom: 48, light, greybox: GRID, pawn: pawn ? [ir.origin.x + pawn[0], ir.origin.y + pawn[1]] : null, treeAt: treeAt ? [ir.origin.x + treeAt[0], ir.origin.y + treeAt[1]] : null, tree: ROOT, madeAt: new Date().toISOString() }, null, 1) + '\n');
    console.log(file);
  }
  return file;
}

// ---- finding the places ----
function blockRaster(seed, gx0, gy0, w, h) { const r = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) r[y * w + x] = raisedAt(seed, gx0 + x, gy0 + y) ? 1 : 0; return r; }
function finders(r, w, h) {
  const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : r[y * w + x]), lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0, found = {}, take = (k, x, y) => { if (x >= 8 && y >= 8 && x < w - 8 && y < h - 8) (found[k] ||= []).push([x, y]); };
  for (let y = 6; y < h - 8; y++) for (let x = 6; x < w - 8; x++) {
    for (const s of [1, -1]) {
      if ([0, 1, 2, 3].every((i) => lip(x + s * i, y + i) && !lip(x + s * i + 1, y + i) && !lip(x + s * i - 1, y + i))) take('diagonal', x + s, y + 2);                          // 4 one-tile steps
      if (lip(x, y) && lip(x + s, y) && !lip(x - s, y) && lip(x + 2 * s, y + 1) && lip(x + 3 * s, y + 1) && !lip(x + 4 * s, y + 1) && lip(x + 4 * s, y + 2) && lip(x + 5 * s, y + 2)) take('slope', x + 2 * s, y + 1);   // runs of 2
    }
    for (const dx of [-1, 1]) {
      if (!lip(x, y) || lip(x + dx, y) || R(x + dx, y)) continue;
      const run2 = lip(x - dx, y) && lip(x - 2 * dx, y), up = (k) => !R(x + dx, y - k);
      if (run2 && up(0) && up(1) && !up(2)) take('twostep', x, y + 1);                                    // a face of 3+ ending beside a wall that is low for exactly 2 rows up
      if (!lip(x - dx, y) && up(0) && up(1) && up(2) && R(x, y - 1) && R(x, y - 2)) take('jog', x, y);     // one lip tile at the foot of a steep side (3+ rows)
    }
    if ([0, 1, 2, 3].every((i) => R(x + i, y - i) && !R(x + i, y - i - 1)) && R(x + 1, y) && !R(x, y - 1)) take('rim', x + 1, y - 1);                       // a back rim on a 45 degree stretch (a notch where the plateau has one)
  }
  return found;
}
const near = (list, cx, cy) => list && list.length ? list.slice().sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy))[0] : null;

// ---- the overview: a schematic of the window: raised land, south faces by kind (straight: brown; bend: amber; 9+: red), the frames ----
function overview(seed, wv, bits, frames, file, marks = { ways: [], pockets: [] }) {
  const S = 5, w = wv.w, h = wv.h, img = png.newImage(w * S, h * S), R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x]), lip = (x, y) => R(x, y) && !R(x, y + 1) && y + 1 < h;
  const put = (x, y, c) => { for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) img.data.set([...c, 255], ((y * S + j) * img.w + x * S + i) * 4); };
  const run = new Map(); for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!lip(x, y)) { x++; continue; } let x1 = x; while (x1 < w && lip(x1, y)) x1++; for (let k = x; k < x1; k++) run.set(y * w + k, x1 - x); x = x1; } }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = run.get(y * w + x); put(x, y, n ? (n === 1 ? [240, 150, 30] : n >= 9 ? [214, 40, 40] : [128, 82, 48]) : R(x, y) ? [150, 180, 112] : [234, 230, 214]); }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (x % (CW * S) === 0 || y % (CH * S) === 0) img.data.set([200, 200, 200, 255], (y * img.w + x) * 4);   // the cell lines
  for (const [fx, fy] of frames) { const x0 = Math.round((fx - 4.7) * S), y0 = Math.round((fy - 5.5) * S), x1 = Math.round((fx + 4.7) * S), y1 = Math.round((fy + 5.5) * S); for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (x >= 0 && y >= 0 && x < img.w && y < img.h) img.data.set([20, 20, 20, 255], (y * img.w + x) * 4); for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (x >= 0 && y >= 0 && x < img.w && y < img.h) img.data.set([20, 20, 20, 255], (y * img.w + x) * 4); }
  const box = (x0, y0, x1, y1, c) => { for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (x >= 0 && y >= 0 && x < img.w && y < img.h) img.data.set([...c, 255], (y * img.w + x) * 4); for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (x >= 0 && y >= 0 && x < img.w && y < img.h) img.data.set([...c, 255], (y * img.w + x) * 4); };
  for (const [x, y, own] of marks.ways) { const cx = Math.round((x + 1) * S), cy = Math.round((y + 0.5) * S); for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const X = cx + i, Y = cy + j; if (X >= 0 && Y >= 0 && X < img.w && Y < img.h && (Math.abs(i) <= 7 && Math.abs(j) <= 7)) img.data.set(Math.abs(i) >= 6 || Math.abs(j) >= 6 ? [20, 20, 20, 255] : own ? [255, 225, 60, 255] : [60, 200, 255, 255], (Y * img.w + X) * 4); } }
  for (const [x0, y0, x1, y1] of marks.pockets) box(Math.round(x0 * S) - 3, Math.round(y0 * S) - 3, Math.round((x1 + 1) * S) + 3, Math.round((y1 + 1) * S) + 3, [220, 0, 200]);
  writeFileSync(file, encodePng(img)); console.log(file);
}

const report = [];
// --at seed:name:wx:wy,...  extra frames at world tiles; --only-at: nothing else
const AT = String(opt('at', '')).split(',').filter(Boolean).map((s) => s.split(':')), ONLY = args.includes('--only-at');
for (const seed of SEEDS) {
  for (const [s, name, x, y] of AT) if (Number(s) === seed) shoot(seed, Number(x), Number(y), name);
  if (ONLY) continue;
  const wv = WINDOWS.find((v) => v.seed === seed), gx0 = wv.X * CW, gy0 = wv.Y * CH, PADX = 2 * CW, PADY = 2 * CH;
  const bx = gx0 - PADX, by = gy0 - PADY, bw = wv.w + 2 * PADX, bh = wv.h + 2 * PADY, block = blockRaster(seed, bx, by, bw, bh);
  // the three frames of the window: the longest south face, the longest side wall, the densest bends (inside the window)
  const R = (x, y) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : block[y * bw + x]), lip = (x, y) => R(x, y) && !R(x, y + 1);
  let bestS = [0, null], bestW = [0, null], bestB = [-1, null];
  for (let y = PADY + 8; y < PADY + wv.h - 8; y++) {
    for (let x = PADX + 6; x < PADX + wv.w - 6;) { if (!lip(x, y)) { x++; continue; } let x1 = x; while (lip(x1, y)) x1++; if (x1 - x > bestS[0]) bestS = [x1 - x, [(x + x1) >> 1, y + 1]]; x = x1; }
  }
  for (let x = PADX + 6; x < PADX + wv.w - 6; x++) for (const dx of [-1, 1]) for (let y = PADY + 8; y < PADY + wv.h - 8;) { if (!(R(x, y) && !R(x + dx, y))) { y++; continue; } let y1 = y; while (R(x, y1) && !R(x + dx, y1)) y1++; if (y1 - y > bestW[0]) bestW = [y1 - y, [x, (y + y1) >> 1]]; y = y1; }
  for (let y = PADY + 10; y < PADY + wv.h - 10; y += 4) for (let x = PADX + 8; x < PADX + wv.w - 8; x += 4) { let n = 0; for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (lip(x + i, y + j) && !lip(x + i - 1, y + j) && !lip(x + i + 1, y + j)) n++; if (n > bestB[0]) bestB = [n, [x, y]]; }
  const frames = [['face', bestS], ['side', bestW], ['bends', bestB]].filter(([, b]) => b[1]);
  const got = [];
  for (const [nm, b] of frames) { const f = shoot(seed, bx + b[1][0], by + b[1][1], nm); if (f) got.push(nm); }
  // the six cases (section 10), found on a block round the window; nearest the window's middle
  const cases = finders(block, bw, bh), mid = [bw / 2, bh / 2], missing = [];
  for (const c of ['diagonal', 'slope', 'jog', 'twostep', 'rim']) { const p = near(cases[c], mid[0], mid[1]); if (p) { shoot(seed, bx + p[0], by + p[1], 'case-' + c); got.push('case-' + c); } else missing.push(c); }
  // a way up between bends: a stair of this land whose site has a bend (a lip one row off) on both sides
  let wayFound = false;
  try {
    const st = stairsInfo(seed).filter((s) => s.wayup && Math.abs(s.wayup.x - (gx0 + wv.w / 2)) < 3 * CW && Math.abs(s.wayup.y - (gy0 + wv.h / 2)) < 3 * CH);
    const bendsBoth = (s) => { const { x, y } = s.wayup, L = (a, b) => raisedAt(seed, a, b) && !raisedAt(seed, a, b + 1), bend = (a) => !L(a, y) && (L(a, y - 1) || L(a, y + 1)); return bend(x - 1) && bend(x + 2); };
    const pick = st.find(bendsBoth);
    if (pick) { shoot(seed, pick.wayup.x, pick.wayup.y, 'case-wayup-bends'); wayFound = true; got.push('case-wayup-bends'); }
    else if (st.length) { shoot(seed, st[0].wayup.x, st[0].wayup.y, 'case-wayup-plain'); got.push('case-wayup-plain'); missing.push('wayup-between-bends'); }
    else missing.push('wayup');
  } catch (e) { missing.push('wayup (' + e.message + ')'); }
  const bits = new Uint8Array(wv.w * wv.h); for (let y = 0; y < wv.h; y++) for (let x = 0; x < wv.w; x++) bits[y * wv.w + x] = block[(y + PADY) * bw + x + PADX];
  // the ways up of the window (the realm's: yellow; a pocket stair the land rule made: cyan) and the closed pockets it left (magenta outlines)
  const marks = { ways: [], pockets: [] };
  try {
    const inWin = (x, y) => x >= gx0 && y >= gy0 && x < gx0 + wv.w && y < gy0 + wv.h;
    for (const s of stairsInfo(seed)) if (s.wayup && inWin(s.wayup.x, s.wayup.y)) marks.ways.push([s.wayup.x - gx0, s.wayup.y - gy0, true]);
    if (levels.pocketWayups && levels.windowInfo) { const L = levels.levelsOf(place.realmOf ? place.realmOf(seed) : (await imp('prototypes/exploration/src/gen7/region.mjs')).realm7(seed).realm);
      for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
        for (const w of levels.pocketWayups(L, wv.X + i, wv.Y + j)) if (inWin(w.x, w.y)) marks.ways.push([w.x - gx0, w.y - gy0, false]);
        for (const p of levels.windowInfo(L, wv.X + i, wv.Y + j).pk || []) { const m = /\[(\d+),(\d+)-(\d+),(\d+)\]/.exec(p); if (m && inWin(+m[1], +m[2])) marks.pockets.push([+m[1] - gx0, +m[2] - gy0, +m[3] - gx0, +m[4] - gy0]); } } }
  } catch (e) { console.log('marks:', e.message); }
  overview(seed, wv, bits, frames.map(([, b]) => [b[1][0] - PADX, b[1][1] - PADY]), path.join(OUT, `${TAG}-s${seed}-overview.png`), marks);
  report.push({ seed, got, missing });
}
writeFileSync(path.join(OUT, `${TAG}-report.json`), JSON.stringify({ tag: TAG, d: D, faceRows: FACE, ...over, report }, null, 1) + '\n');
console.log(JSON.stringify(report));
