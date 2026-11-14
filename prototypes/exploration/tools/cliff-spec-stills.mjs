// Stills of the cliff cases of the cliff spec (map-system-audit-1 cliff-spec.md section 5), walking zoom (48 px a tile, 450 x 532), day and night, 1x and 4x, drawn by the game's own bake and renderer.
//   node tools/cliff-spec-stills.mjs find <views.json>                         scans seeds 7, 13 and 42 for one view of each case; MB_FACE_BIN=4 or 6 in the environment finds them on the land of that bin width
//   node tools/cliff-spec-stills.mjs shoot <outDir> <views.json> <tag> [tree]  draws each view; `tree` is another checkout of the game (the "before"), default this one; <tag> is in every file name
// Cases: e1 e2 e3 (a step of 1 row, of 2 rows, of 3 or more with the side cell above), run4 (a run of exactly 4 between two corners), litter and scree (a face standing on that ground), side1 (a one-cell side),
// sidetop (a side's top end), border-a and border-b (a run that crosses a cell border, drawn from each of the two cells). Each still gets a <still>.json sidecar (the art files drawn, zoom, light, time).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [WHICH, A, B, TAG, TREE] = process.argv.slice(2);
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');   // the game checkout holding this tool
const ROOT = TREE ? path.resolve(TREE) : HERE;
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const place = await imp('prototypes/exploration/src/gen7/place.mjs'), render = await imp('prototypes/exploration/tools/gen7-render.mjs');
const open = await imp('prototypes/places/src/bake/openedges.mjs'), ground = await imp('prototypes/places/src/ground.mjs'), idx = await imp('prototypes/places/src/indexed.mjs');
const png = await imp('prototypes/places/src/png.mjs'), setload = await imp('prototypes/places/src/setload.mjs'), still = await imp('prototypes/exploration/tools/still-art.mjs');
const bakeBuild = await imp('prototypes/places/src/bake/build.mjs'), world = await imp('prototypes/exploration/src/gen7/world.mjs');
const { windowIR, cellIR, TV, CW, CH } = place, { bakeCtx, bakeIR } = render, { cliffInfo } = open, { renderView, lightState } = ground, { indexedToRgba } = idx, { encodePng, scaleNearest } = png;
const { artHooks } = setload, { fileList, writeSidecar } = still, { paletteRgb } = bakeBuild;
const FW = 450, FH = 532, LIGHTS = [['day', 0], ['night', 2]];
const CORE = JSON.parse(readFileSync(path.join(ROOT, 'art/companion-48/terrain/meadow/meadow-palette.json'), 'utf8')).entries.slice(0, 48);
const frameAt = (ir, tx, ty) => ({ x: Math.max(0, Math.min(ir.w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(ir.h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH });
const irOf = (v) => (v.cell ? cellIR(v.seed, v.cell[0], v.cell[1]) : windowIR(v.seed, v.X0, v.Y0, 2, 2));

if (WHICH === 'find') {
  const { cliffDecals } = await imp('prototypes/places/src/bake/southruns.mjs'), { southRuns, landOf } = await imp('prototypes/places/src/bake/relief.mjs');
  const views = [], ctx = bakeCtx(), CASES = ['e1', 'e2', 'e3', 'run4', 'litter', 'scree', 'side1', 'sidetop', 'border'];
  for (const seed of [7, 13, 42]) {
    const got = new Map();
    const take = (name, v) => { if (!got.has(name)) got.set(name, { name: `seed${seed}-${name}`, seed, ...v }); };
    scan: for (let Y = 20; Y + 2 <= 90; Y += 2) for (let X = 12; X + 2 <= 70; X += 2) {
      if (CASES.every((c) => got.has(c))) break scan;
      const ir = windowIR(seed, X, Y, 2, 2), cliffs = cliffInfo(ir, ctx.terrains), runs = southRuns(ir, landOf(ir, cliffs)), L = ir.land, at = (x, y) => L.raised[(y + L.m) * L.w + x + L.m] === 1;
      const inside = (tx, ty) => tx >= 7 && tx < ir.w - 8 && ty >= 7 && ty < ir.h - 8;
      const ok = () => { try { bakeIR(ir); return true; } catch (e) { return false; } };
      for (const r of runs) {
        const n = r.x1 - r.x0 + 1;
        for (const [end, k, xb, xe] of [[r.east, r.ke, r.x1 + 1, r.x1], [r.west, r.kw, r.x0 - 1, r.x0]]) {
          if (!end || !inside(xb, r.y)) continue;
          if (k === 1) take('e1', { X0: X, Y0: Y, tx: xb, ty: r.y + 1 }); else if (k === 2) take('e2', { X0: X, Y0: Y, tx: xb, ty: r.y + 1 });
          else if (k >= 3 && at(xe, r.y - 3)) take('e3', { X0: X, Y0: Y, tx: xb, ty: r.y });
        }
        const mid = (r.x0 + r.x1) >> 1;
        if (n === 4 && r.east && r.west && inside(mid, r.y)) take('run4', { X0: X, Y0: Y, tx: mid, ty: r.y + 1 });
        if (n >= 4 && inside(mid, r.y + 2) && r.y + 3 < ir.h) {
          const all = (v) => { for (let x = r.x0; x <= r.x1; x++) for (let y = r.y + 2; y <= r.y + 3; y++) if (ir.terrain[y * ir.w + x] !== v) return false; return true; };
          if (all(TV.LITTER)) take('litter', { X0: X, Y0: Y, tx: mid, ty: r.y + 1 }); else if (all(TV.SCREE)) take('scree', { X0: X, Y0: Y, tx: mid, ty: r.y + 1 });
        }
        // a run that crosses a vertical cell border: the world column of the border, shot from the cell each side of it
        const wx0 = ir.origin.x + r.x0, wx1 = ir.origin.x + r.x1, bx = Math.floor(wx1 / CW) * CW;
        if (n >= 5 && bx > wx0 && bx <= wx1 && !got.has('border')) {
          const wy = ir.origin.y + r.y + 1, cx = Math.floor(bx / CW), cy = Math.floor(wy / CH);
          got.set('border', { name: `seed${seed}-border`, seed, border: [{ cell: [cx - 1, cy], world: [bx - 1, wy], tag: 'a' }, { cell: [cx, cy], world: [bx, wy], tag: 'b' }] });
        }
      }
      // the side cells: group the decals by hand and column
      const sides = new Map();
      for (const d of cliffDecals(ir, cliffs)) { const m = /^cliff-side-b-([ew])$/.exec(d.kind); if (m) { const k = m[1] + (d.x / 48); if (!sides.has(k)) sides.set(k, []); sides.get(k).push(d.y / 48); } }
      for (const ys of sides.values()) {
        ys.sort((p, q) => p - q);
        for (let i = 0, j = 0; i < ys.length; i = j) { j = i + 1; while (j < ys.length && ys[j] === ys[j - 1] + 1) j++; }
      }
      for (const [k, ys] of sides) {
        const x = +k.slice(1); let i = 0;
        while (i < ys.length) { let j = i + 1; while (j < ys.length && ys[j] === ys[j - 1] + 1) j++; const len = j - i; if (inside(x, ys[i])) { if (len === 1) take('side1', { X0: X, Y0: Y, tx: x, ty: ys[i] }); else if (len >= 3) take('sidetop', { X0: X, Y0: Y, tx: x, ty: ys[i] + 1 }); } i = j; }
      }
      for (const v of got.values()) if (v.X0 === X && v.Y0 === Y && !ok()) for (const [c, g] of got) if (g === v) got.delete(c);   // a window the bake refuses is no view
    }
    const border = got.get('border'); got.delete('border');
    for (const v of got.values()) views.push(v);
    if (border) for (const b of border.border) views.push({ name: `${border.name}-${b.tag}`, seed, cell: b.cell, tx: b.world[0] - (b.cell[0] * CW - 1), ty: b.world[1] - (b.cell[1] * CH - 1) });
    console.log(`seed ${seed}: found ${[...got.keys()].concat(border ? ['border'] : []).join(' ')}; missing ${CASES.filter((c) => !got.has(c) && !(c === 'border' && border)).join(' ') || 'none'}`);
  }
  writeFileSync(A, JSON.stringify(views, null, 1) + '\n');
} else if (WHICH === 'shoot' || WHICH === 'proving') {
  mkdirSync(A, { recursive: true });
  artHooks.seen = new Map();
  // `proving <outDir> <tag>`: the proving place (art/places/proving-place.json), one view per case and the whole place at 1x, labelled in the file names; `shoot <outDir> <views.json> <tag>`: the views of the file
  const PV = WHICH === 'proving' ? await imp('prototypes/places/src/bake/proving.mjs') : null;
  const views = WHICH === 'proving' ? [{ name: 'whole', proving: true, whole: true, tx: 0, ty: 0 }, ...PV.provingCases().map((c) => ({ name: c.id, proving: true, tx: c.at[0], ty: c.at[1], label: c.label }))] : JSON.parse(readFileSync(B, 'utf8'));
  const TAGN = WHICH === 'proving' ? B : TAG;
  for (const v of views) {
    const ir = v.proving ? PV.provingIR(bakeCtx().terrains) : irOf(v), win = v.whole ? { x: 0, y: 0, w: ir.w * 48, h: ir.h * 48 } : frameAt(ir, v.tx, v.ty), ts = bakeCtx().sets.get(ir.tileset);
    let place1; try { place1 = bakeIR(ir); } catch (e) { const f = `${A}/${TAGN}-${v.name}-REFUSED.txt`; writeFileSync(f, `the bake of this view is refused: ${e.message}\n`); console.log(f); continue; }   // today's branch refuses cells where the cliff meets leaf litter, scree, turf or dry grass (R1)
    for (const [light, level] of LIGHTS) {
      const lit = level ? lightState(place1, { level: new Uint8Array(place1.w * place1.h).fill(level) }) : null, pal = paletteRgb(ts);
      CORE.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
      const img = indexedToRgba(renderView(ts, place1, 48, win, { ...(lit ? { light: lit } : {}) }), win.w, win.h, pal);
      for (const [suffix, im, scale] of v.whole ? [['1x', img, 1]] : [['1x', img, 1], ['4x', scaleNearest(img, 4), 4]]) {   // the whole proving place is a 1728 px picture at 1x; every case view also at 4x
        const file = `${A}/${TAGN}-${v.name}-${light}-${suffix}.png`; writeFileSync(file, encodePng(im));
        writeSidecar(file, { tool: 'cliff-spec-stills', tag: TAGN, label: v.label || v.name, files: fileList([...artHooks.seen].map(([slot, x]) => ({ slot, ...x }))), swaps: [], view: v.name, seed: v.seed, cells: v.cell || [v.X0, v.Y0], tile: [v.tx, v.ty], zoom: 48, light, level, scale, tree: ROOT });
        console.log(file);
      }
    }
  }
} else throw new Error('usage: find <views.json> | shoot <outDir> <views.json> <tag> [tree] | proving <outDir> <tag>');
