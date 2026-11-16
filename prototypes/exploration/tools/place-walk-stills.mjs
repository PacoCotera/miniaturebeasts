// place-walk-1: stills at the walking zoom (the game's own place view at 1x: 450 x 532, 48 px a tile, day) round named world tiles, from one checkout (tree), by the game's own bake and renderer.
//   node place-walk-stills.mjs <tree> <outDir> <tag> <seed> <wx,wy> [<wx,wy> ...]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [TREE, OUT, TAG, seedArg, ...pts] = process.argv.slice(2), seed = +seedArg, ROOT = path.resolve(TREE), imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const place = await imp('prototypes/exploration/src/gen7/place.mjs'), render = await imp('prototypes/exploration/tools/gen7-render.mjs');
const ground = await imp('prototypes/places/src/ground.mjs'), idx = await imp('prototypes/places/src/indexed.mjs'), png = await imp('prototypes/places/src/png.mjs'), bakeBuild = await imp('prototypes/places/src/bake/build.mjs');
const { windowIR, CW, CH } = place, { bakeCtx, bakeIR } = render, { renderView } = ground, { indexedToRgba } = idx, { encodePng } = png, { paletteRgb } = bakeBuild;
mkdirSync(OUT, { recursive: true });
const FW = 450, FH = 532, CORE = JSON.parse(readFileSync(path.join(ROOT, 'art/companion-48/terrain/meadow/meadow-palette.json'), 'utf8')).entries.slice(0, 48);
for (const p of pts) {
  const [wx, wy] = p.split(',').map(Number), X0 = Math.floor((wx - 10) / CW), Y0 = Math.floor((wy - 8) / CH), ir = windowIR(seed, X0, Y0, 2, 2), tx = wx - ir.origin.x, ty = wy - ir.origin.y;
  const win = { x: Math.max(0, Math.min(ir.w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(ir.h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH };
  let pl; try { pl = bakeIR(ir); } catch (e) { console.log('REFUSED', p, e.message); continue; }
  const ts = bakeCtx().sets.get(ir.tileset), pal = paletteRgb(ts);
  CORE.forEach(e => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
  const img = indexedToRgba(renderView(ts, pl, 48, win, {}), win.w, win.h, pal), file = path.join(OUT, `${TAG}-s${seed}-${wx}-${wy}-1x.png`);
  writeFileSync(file, encodePng(img)); console.log(file);
}
