// One LIVE still (the set switch off: the signed live art, the live cliffs) day and night, for the night-table diff against another tree (paint-2: the night table edits touch only the cliff set's own colours).
//   node tools/cliff-live-still.mjs <outDir> <tag> [seed X0 Y0 tx ty]     (default seed 7, window 18,2, tile 8,29: the seed7-k1 view)
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { windowIR } from '../src/gen7/place.mjs';
import { bakeCtx, bakeIR } from './gen7-render.mjs';
import { renderView, lightState, tablesOf } from '../../places/src/ground.mjs';
import { paletteRgb } from '../../places/src/bake/build.mjs';
import { indexedToRgba } from '../../places/src/indexed.mjs';
import { encodePng } from '../../places/src/png.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
const [OUT, TAG, S = '7', X0 = '18', Y0 = '2', TX = '8', TY = '29'] = process.argv.slice(2);
const CORE = JSON.parse(readFileSync(path.join(ROOT, 'art/companion-48/terrain/meadow/meadow-palette.json'), 'utf8')).entries.slice(0, 48);
mkdirSync(OUT, { recursive: true });
const ctx = bakeCtx(), ir = windowIR(+S, +X0, +Y0, 2, 2), place = bakeIR(ir), ts = ctx.sets.get(ir.tileset);
const FW = 450, FH = 600, tx = +TX, ty = +TY;
const win = { x: Math.max(0, Math.min(ir.w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(ir.h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH };
for (const [light, level] of [['day', 0], ['night', 2]]) {
  const lit = level ? lightState(place, { level: new Uint8Array(place.w * place.h).fill(level) }) : null, pal = paletteRgb(ts);
  CORE.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
  const buf = renderView(ts, place, 48, win, { ...(lit ? { light: lit } : {}), actors: [], pawns: [] });
  const file = path.join(OUT, `${TAG}-live-${light}-1x.png`);
  writeFileSync(file, encodePng(indexedToRgba(buf, win.w, win.h, pal))); console.log(file);
}
