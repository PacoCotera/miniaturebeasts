// Generator 7: a place's IR through the places bake (dual grid by terrain, open edges, tone) and the places renderer, at 16 or 48 px a tile. No compositing and no overlays: what this draws is
// what the bake gives (scheme Rule 1.8). The bake's context loads the committed test set once.
import { readFileSync } from 'node:fs';
import { paths, loadSets } from '../../places/src/bake/bake.mjs';
import { buildPlace, paletteRgb } from '../../places/src/bake/build.mjs';
import { renderView, lightState } from '../../places/src/ground.mjs';
import { indexedToRgba } from '../../places/src/indexed.mjs';

const CORE = JSON.parse(readFileSync(new URL('../../../art/companion-48/terrain/meadow/meadow-palette.json', import.meta.url), 'utf8')).entries.slice(0, 48);
const P = paths(new URL('../../places', import.meta.url).pathname);
let CTX = null;
export function bakeCtx() {
  if (CTX) return CTX;
  const terrains = JSON.parse(readFileSync(P.terrain, 'utf8')).terrains;
  const { sets, layersOf, errors } = loadSets(P, terrains, ['ninja-test']);
  if (errors.length) throw new Error(errors.join('\n'));
  return (CTX = { terrains, sets, layersOf });
}
// Bakes an IR; returns { place } or throws with the bake's messages.
export function bakeIR(ir) {
  const { place, errors } = buildPlace(ir, bakeCtx());
  if (errors) throw new Error(errors.map(e => e.message).join('\n'));
  return place;
}
// Renders an IR at `size` px a tile (16 or 48); win: { x, y, w, h } in pixels, default the whole place. Returns { img: { w, h, data RGBA }, place }.
// o: the renderer's own options (renderView): `level` here is a clear-light level for every cell (0 day, 1 storm, 2 night), lit by the walk's own light tables.
export function renderIR(ir, size = 16, win = null, o = {}) {
  const place = bakeIR(ir), ts = bakeCtx().sets.get(ir.tileset), W = win || { x: 0, y: 0, w: place.w * size, h: place.h * size };
  const { level, ...rest } = o, light = level ? lightState(place, { level: new Uint8Array(place.w * place.h).fill(level) }) : null;
  const pal = paletteRgb(ts);
  if (light) CORE.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });   // the light tables map onto the core colours too
  return { img: indexedToRgba(renderView(ts, place, size, W, light ? { ...rest, light } : rest), W.w, W.h, pal), place };
}
