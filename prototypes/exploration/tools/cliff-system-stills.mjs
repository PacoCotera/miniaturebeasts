// The cliff system's greybox in whole places (pixel desk spec cliff-system.md; the designer signs these before any paint): 450 x 600 frames at walking zoom (48 px a tile), 1x, day and night, the pawn
// and a tree in frame, drawn by the game's own bake and renderer with the system's set switched on (cliffsystem.mjs useCliffSet) and the greybox pieces cut from the template (tools/cliff-template.mjs).
//   node tools/cliff-system-stills.mjs find <views.json> <check.json>           seeds 7, 13 and 42: one view of each case, and the relief-part check (every part a piece, the parts with none listed)
//   node tools/cliff-system-stills.mjs shoot <outDir> <views.json> <cutDir> <tag>  the views of the file
//   node tools/cliff-system-stills.mjs mock <outDir> <templateDir> <cutDir> <tag>   the cases the seeds lack, from the template's mock places (T7 stacked: the land has one raised level)
// Cases: run13 (13+ straight middles), k1 k2 k3 (a step-down of each k), convex, concave, rim (a back rim with both side walls), way, diag (3+ steps), seam (a 6-column block boundary on a cell edge, from both cells).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { windowIR, cellIR, CW, CH } from '../src/gen7/place.mjs';
import { bakeCtx, bakeIR } from './gen7-render.mjs';
import { cliffInfo } from '../../places/src/bake/openedges.mjs';
import { landOf, partAt, PART, extentClear } from '../../places/src/bake/relief.mjs';
import { TABLE, placeBoundary, installPieces, useCliffSet, kindOf, sortItems, FALLBACK, middleOf } from '../../places/src/bake/cliffsystem.mjs';
import { renderView, lightState, tablesOf } from '../../places/src/ground.mjs';
import { blitRle, encodeRle } from '../../places/src/blit.mjs';
import { paletteRgb } from '../../places/src/bake/build.mjs';
import { indexedToRgba } from '../../places/src/indexed.mjs';
import { decodePng, encodePng, scaleNearest } from '../../places/src/png.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
const [WHICH, A1, A2, A3, A4] = process.argv.slice(2);
const FW = 450, FH = 600, LIGHTS = [['day', 0], ['night', 2]], SEEDS = [7, 13, 42];
const CORE = JSON.parse(readFileSync(path.join(ROOT, 'art/companion-48/terrain/meadow/meadow-palette.json'), 'utf8')).entries.slice(0, 48);
const sha = (b) => createHash('sha256').update(b).digest('hex');

// ---- the set switch: the greybox pieces cut from the template, installed in the baked tile set ----
function install(cutDir) {
  const pieces = [];
  for (const p of TABLE.pieces) for (const level of [1, 2]) {
    const f = path.join(cutDir, `${p.id}${level > 1 ? '@' + level : ''}.png`);
    if (!existsSync(f)) continue;
    pieces.push({ kind: kindOf(p.id, level), img: scaleNearest(decodePng(readFileSync(f)), TABLE.scale) });
  }
  for (const ts of bakeCtx().sets.values()) installPieces(ts, pieces);
  useCliffSet('system-greybox');
  return pieces.length;
}

// ---- the pawn (the explorer's map sprite, a stand-in on the stills) as an actor, its colours taken to the set's nearest ----
function pawnActor(ts, x48, y48, remap) {
  const im = decodePng(readFileSync(path.join(ROOT, 'prototypes/exploration/art/props/pawn-down-0.png')));
  const rgb = ts.palette.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]), px = new Uint8Array(im.w * im.h);
  for (let p = 0; p < px.length; p++) {
    if (im.data[p * 4 + 3] < 128) continue;
    let best = 0, bd = 1e9; const r = im.data[p * 4], g = im.data[p * 4 + 1], b = im.data[p * 4 + 2];
    rgb.forEach((c, k) => { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = k; } });
    px[p] = 48 + best;
  }
  const rle = encodeRle(px, im.w, im.h);
  return { sortY: y48, x: x48, draw: (buf, win) => blitRle(buf, win.w, win.h, x48 - (im.w >> 1) - win.x, y48 - im.h + 2 - win.y, rle, 0, im.w, im.h, remap) };
}
const treeProp = (cx, cy) => ({ kind: 'tree-broad', x: cx * 48 + 24, y: cy * 48 + 40, sortY: cy * 48 + 40, cx, cy });

// ---- one frame: day and night, the sidecar ----
function shootFrame(outDir, name, tag, place, ts, win, pawn, info) {
  const files = [];
  for (const [light, level] of LIGHTS) {
    const lit = level ? lightState(place, { level: new Uint8Array(place.w * place.h).fill(level) }) : null;
    const remap = level ? tablesOf(ts).dark2 : null, pal = paletteRgb(ts);
    CORE.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
    const actors = pawn ? [pawnActor(ts, pawn[0] * 48 + 24, pawn[1] * 48 + 40, remap)] : [];
    const buf = renderView(ts, place, 48, win, { ...(lit ? { light: lit } : {}), actors, pawns: pawn ? [{ x: pawn[0] * 48 + 24, y: pawn[1] * 48 + 24 }] : [] });
    const png = encodePng(indexedToRgba(buf, win.w, win.h, pal)), file = path.join(outDir, `${tag}-${name}-${light}-1x.png`);
    writeFileSync(file, png);
    const kinds = [...new Set(place.decals.map((d) => ts.sprites[d.kind].kind).filter((k) => k.startsWith('cs-')))].sort();
    writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ still: path.basename(file), tool: 'cliff-system-stills', tag, set: 'system-greybox (cut from the template; no paint)', light, zoom: 48, frame: [win.w, win.h], window: [win.x, win.y], scale: 1, ...info, pieces: kinds, fallbacks: kinds.includes(FALLBACK), stillSha256: sha(png), madeAt: new Date().toISOString() }, null, 1) + '\n');
    files.push(file); console.log(file);
  }
  return files;
}
const frameAt = (w, h, tx, ty) => ({ x: Math.max(0, Math.min(w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH });

if (WHICH === 'find') {
  // the relief-part check and the views, window by window (2 x 2 cells), over the realm's land
  const ctx = bakeCtx(), views = [], check = { seeds: SEEDS, windows: 0, cells: 0, parts: {}, missing: {}, examples: [] };
  for (const seed of SEEDS) {
    const got = new Map();
    for (let Y = 2; Y + 2 <= 108; Y += 2) for (let X = 2; X + 2 <= 80; X += 2) {
      let ir; try { ir = windowIR(seed, X, Y, 2, 2); } catch (e) { continue; }
      const A = landOf(ir, cliffInfo(ir, ctx.terrains));
      let any = false; for (let y = 0; y < ir.h && !any; y++) for (let x = 0; x < ir.w; x++) if (A.raised(x, y)) { any = true; break; }
      if (!any) continue;
      check.windows++;
      const key = `${ir.seed}`, { items, missing } = placeBoundary(A, { x0: 0, y0: 0, x1: ir.w - 1, y1: ir.h - 1, wx0: ir.origin.x, wy0: ir.origin.y, key, level: 1 });
      for (let y = 0; y < ir.h; y++) for (let x = 0; x < ir.w; x++) { const p = partAt(A, x, y); if (p !== PART.LOW) { const n = Object.keys(PART).find((k) => PART[k] === p); check.parts[n] = (check.parts[n] || 0) + 1; check.cells++; } }
      for (const m of missing) {
        const sig = [-1, 0, 1].map((dy) => [-1, 0, 1].map((dx) => (A.raised(m.x + dx, m.y + dy) ? '1' : '.')).join('')).join('/');
        const k = `${m.part} ${sig}`; check.missing[k] = (check.missing[k] || 0) + 1;
        if (check.examples.length < 40) check.examples.push({ seed, world: [ir.origin.x + m.x, ir.origin.y + m.y], part: m.part, around: sig });
      }
      const inside = (tx, ty, mx = 6, my = 7) => tx >= mx && tx < ir.w - mx && ty >= my && ty < ir.h - my;
      const ok = () => { try { bakeIR(ir); return true; } catch (e) { return false; } };
      const take = (name, tx, ty, extra = {}) => { if (got.has(name) || !inside(tx, ty)) return; if (!ok()) return; got.set(name, { name: `seed${seed}-${name}`, seed, X0: X, Y0: Y, tx, ty, ...extra }); };
      const at = new Map(items.map((it) => [`${it.x},${it.y}`, it]));
      for (const it of items) {
        if (/^end-[ew]-[123]$/.test(it.id)) take(`k${it.id.slice(-1)}`, it.x, it.y + 1);
        else if (/^convex-/.test(it.id)) take('convex', it.x, it.y);
        else if (/^concave-/.test(it.id)) take('concave', it.x, it.y + 2);
        else if (it.id === 'way-l') take('way', it.x, it.y + 1);
        else if (/^d[rl]-mid$/.test(it.id)) take('diag', it.x, it.y + 1);
        else if (it.id === 'rim-nw') {   // a back rim with both side walls: rim-nw ... rim-ne on one row, at most 8 apart, walls under both corners
          let x = it.x + 1; while (at.get(`${x},${it.y}`)?.id === 'rim-n') x++;
          const ne = at.get(`${x},${it.y}`);
          if (ne && ne.id === 'rim-ne' && x - it.x <= 8 && /^wall-w/.test(at.get(`${it.x - 1},${it.y}`)?.id || '') && /^wall-e/.test(at.get(`${x + 1},${it.y}`)?.id || '')) take('rim', (it.x + x) >> 1, it.y + 3);
        } else if (/^mid-/.test(it.id) && !got.has('run13')) {   // 13 straight middles in a row
          let n = 0; while (/^mid-/.test(at.get(`${it.x + n},${it.y}`)?.id || '')) n++;
          if (n >= 13 && !/^mid-/.test(at.get(`${it.x - 1},${it.y}`)?.id || '')) take('run13', it.x + 6, it.y + 2);
        }
        // a block boundary on a cell edge: the letter A at a world x that is a cell's west edge, on a straight run crossing it
        if (/^mid-.A$/.test(it.id) && !got.has('seam')) {
          const wx = ir.origin.x + it.x;
          if (wx % CW === 0 && /^mid-/.test(at.get(`${it.x - 1},${it.y}`)?.id || '') && /^mid-/.test(at.get(`${it.x + 1},${it.y}`)?.id || '')) {
            const wy = ir.origin.y + it.y, cx = Math.floor(wx / CW), cy = Math.floor(wy / CH);
            got.set('seam', { name: `seed${seed}-seam`, seed, seam: [{ cell: [cx - 1, cy], world: [wx - 1, wy + 2], tag: 'west' }, { cell: [cx, cy], world: [wx, wy + 2], tag: 'east' }] });
          }
        }
      }
    }
    for (const v of got.values()) views.push(v);
    console.log(`seed ${seed}: found ${[...got.keys()].join(' ')}`);
  }
  const all = ['run13', 'k1', 'k2', 'k3', 'convex', 'concave', 'rim', 'way', 'diag', 'seam'], have = new Set(views.map((v) => v.name.replace(/^seed\d+-/, '')));
  check.casesMissing = all.filter((c) => !have.has(c));
  console.log(`cases missing on seeds 7, 13, 42: ${check.casesMissing.join(' ') || 'none'}`);
  console.log(`check: ${check.windows} windows, ${check.cells} relief cells (not low), parts with no piece: ${Object.values(check.missing).reduce((s, n) => s + n, 0)} ${JSON.stringify(check.missing)}`);
  writeFileSync(A1, JSON.stringify(views, null, 1) + '\n');
  writeFileSync(A2, JSON.stringify(check, null, 1) + '\n');
} else if (WHICH === 'shoot') {
  const [outDir, viewsFile, cutDir, tag] = [A1, A2, A3, A4];
  mkdirSync(outDir, { recursive: true });
  const n = install(cutDir), ctx = bakeCtx(), views = JSON.parse(readFileSync(viewsFile, 'utf8'));
  console.log(`installed ${n} greybox pieces`);
  for (const v of views) {
    const shots = v.seam ? v.seam.map((s) => ({ name: `${v.name}-${s.tag}`, ir: cellIR(v.seed, s.cell[0], s.cell[1]), tx: s.world[0] - s.cell[0] * CW, ty: s.world[1] - s.cell[1] * CH, cells: s.cell })) : [{ name: v.name, ir: windowIR(v.seed, v.X0, v.Y0, 2, 2), tx: v.tx, ty: v.ty, cells: [v.X0, v.Y0] }];
    for (const s of shots) {
      let { ir } = s; const A = landOf(ir, cliffInfo(ir, ctx.terrains)), win = frameAt(ir.w, ir.h, s.tx, s.ty);
      const fx0 = Math.floor(win.x / 48), fy0 = Math.floor(win.y / 48), fx1 = Math.floor((win.x + FW - 1) / 48), fy1 = Math.floor((win.y + FH - 1) / 48);
      // the pawn: on a foot row in front of a face in frame (GD 3), else on low ground near the frame's middle; a tree in frame (one is added on clear low ground when none stands there)
      let pawn = null;
      for (let y = fy0 + 2; y <= fy1 - 1 && !pawn; y++) for (let x = fx0 + 2; x <= fx1 - 2; x++) if (partAt(A, x, y) === PART.FOOT && A.raised(x, y - 3) && Math.abs(x - s.tx) <= 3) { pawn = [x, y]; break; }
      if (!pawn) for (let r = 0; r < 6 && !pawn; r++) for (let y = s.ty - r; y <= s.ty + r && !pawn; y++) for (let x = s.tx - r; x <= s.tx + r; x++) if (partAt(A, x, y) === PART.LOW && y > fy0 + 1 && y < fy1) { pawn = [x, y]; break; }
      const hasTree = ir.props.some((p) => /^tree-/.test(p.kind) && p.x >= win.x - 24 && p.x < win.x + FW + 24 && p.y >= win.y && p.y < win.y + FH + 96);
      let added = null;
      if (!hasTree) for (let r = 2; r < 9 && !added; r++) for (const [dx, dy] of [[r, 2], [-r, 2], [r, 4], [-r, 4], [r, -2], [-r, -2]]) {
        const cx = s.tx + dx, cy = s.ty + dy;
        if (cx < fx0 + 1 || cx > fx1 - 1 || cy < fy0 + 3 || cy > fy1 - 1) continue;
        if (extentClear(A, cx, cy, 'trees') && (!pawn || Math.abs(cx - pawn[0]) + Math.abs(cy - pawn[1]) > 2)) { added = [cx, cy]; break; }
      }
      if (added) ir = { ...ir, props: ir.props.concat([treeProp(added[0], added[1])]).sort((a, b) => a.sortY - b.sortY || a.x - b.x) };
      const place = bakeIR(ir), ts = ctx.sets.get(ir.tileset);
      const missing = (place.decals.missing || []);
      shootFrame(outDir, s.name, tag, place, ts, win, pawn, { case: s.name.replace(/^seed\d+-/, ''), seed: v.seed, cells: s.cells, tile: [s.tx, s.ty], world: ir.origin ? [ir.origin.x + s.tx, ir.origin.y + s.ty] : null, pawn, treeAdded: added, tree: ROOT });
      void missing;
    }
  }
} else if (WHICH === 'mock') {
  // a template zone as a place: low ground of the set's meadow fill, the zone's land placed by the same piece table (both level boundaries), a tree and the pawn
  const [outDir, tplDir, cutDir, tag] = [A1, A2, A3, A4];
  mkdirSync(outDir, { recursive: true });
  install(cutDir);
  const ctx = bakeCtx(), ts = [...ctx.sets.values()][0], desc = [...ctx.layersOf.values()][0], grass = ctx.terrains.find((t) => t.id === 'grass').value;
  const fillTile = ts.pairs[desc.layers.get(grass).fillRow].fullVariants;
  const zones = JSON.parse(readFileSync(path.join(tplDir, 'zones.json'), 'utf8'));
  // which mocks: every case named on the command line after the tag (stacked always): run13 -> T1, rim -> T4, diag -> T6a
  const MOCKS = [
    { case: 'stacked', zone: 'T7', name: 'mock-stacked', pad: [7, 9], pawn: [3, 7], tree: [1, 13], centre: 8 },
    { case: 'run13', zone: 'T1', name: 'mock-run13', pad: [6, 9], pawn: [12, 6], tree: [8, 10], centre: 5, cx: 12 },
    // T4's land with the block 6 wide (8 wide and both walls is 480 px: wider than the frame)
    { case: 'rim', zone: 'T4', name: 'mock-rim', pad: [6, 9], pawn: [5, 3], tree: [1, 11], centre: 6, cx: 5, rows: ['............', ...Array(6).fill('...111111...'), ...Array(5).fill('............')] },
    { case: 'diag', zone: 'T6a', name: 'mock-diag', pad: [6, 9], pawn: [2, 6], tree: [9, 13], centre: 7 },
  ].filter((m) => m.case === 'stacked' || process.argv.slice(7).includes(m.case));
  for (const m of MOCKS) {
    const rows0 = m.rows || zones.find((z) => z.id === m.zone).rows, zw = rows0[0].length, zh = rows0.length, [px, py] = m.pad;
    // the zone in the middle of a wider meadow: its rows run on to the left and right (as the template's land does past its edge), low ground below
    const W = zw + 2 * px, H = zh + py;
    const ch = (x, y) => { const zx = Math.max(0, Math.min(zw - 1, x - px)), zy = y; return zy < 0 ? rows0[0][zx] : zy >= zh ? '.' : rows0[zy][zx]; };
    const lv = (x, y) => { const c = ch(x, y); return c === '2' ? 2 : c === '1' ? 1 : 0; };
    let items = [];
    for (const level of [1, 2]) {
      const A = { raised: (x, y) => lv(x, y) >= level, low: (x, y) => lv(x, y) < level, way: () => false, inside: () => true };
      items.push(...placeBoundary(A, { x0: 0, y0: 0, x1: W - 1, y1: H - 1, key: `mock/${m.zone}`, level }).items);
    }
    items = items.sort((a, b) => a.line - b.line || a.cls - b.cls || a.level - b.level || a.x - b.x || a.y - b.y);
    const idx = (kind) => ts.sprites.findIndex((s) => s.group === 'decal' && s.kind === kind);
    const decals = items.map((it) => { const k = idx(kindOf(it.id, it.level)); return { kind: k >= 0 ? k : idx(FALLBACK), x: (it.x * 16 + it.box[0]) * 3, y: (it.y * 16 + it.box[1]) * 3, sortY: 0 }; });
    const tIdx = ts.sprites.findIndex((s) => s.group === 'prop' && s.kind === 'tree-broad'), tr = [m.tree[0] + px, m.tree[1]];
    const place = { w: W, h: H, ground: [{ tiles: Uint16Array.from({ length: (W + 1) * (H + 1) }, (_, i) => fillTile[i % fillTile.length]) }], decals, props: [{ kind: tIdx, x: tr[0] * 48 + 24, y: tr[1] * 48 + 40, sortY: tr[1] * 48 + 40 }], canopy: [], landmarks: [] };
    const pawn = [m.pawn[0] + px, m.pawn[1]], win = frameAt(W, H, px + (m.cx ?? (zw >> 1)), m.centre), z = zones.find((q) => q.id === m.zone);
    const why = m.case === 'stacked' ? 'the land has one raised level' : 'seeds 7, 13 and 42 have no such case';
    shootFrame(outDir, m.name, tag, place, ts, win, pawn, { case: m.case, from: `template zone ${m.zone} as a mock place (${why}); middles by the world pick`, zone: { id: z.id, label: z.label }, pawn, tree: ROOT });
  }
  void middleOf; void sortItems;
} else throw new Error('usage: find <views.json> <check.json> | shoot <outDir> <views.json> <cutDir> <tag> | mock <outDir> <templateDir> <cutDir> <tag>');
