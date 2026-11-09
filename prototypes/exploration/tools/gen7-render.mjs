// Generator 7: a place's IR through the places bake (dual grid, open edges, ground patches) and the places renderer, at 16 or 48 px a tile. No compositing and no overlays: what this draws is
// what the bake gives (scheme Rule 1.8). The bake's context loads the committed test set once.
import { readFileSync } from 'node:fs';
import { paths, loadSets } from '../../places/src/bake/bake.mjs';
import { buildPlace, paletteRgb } from '../../places/src/bake/build.mjs';
import { renderView } from '../../places/src/ground.mjs';
import { indexedToRgba } from '../../places/src/indexed.mjs';

const P = paths(new URL('../../places', import.meta.url).pathname);
let CTX = null;
export function bakeCtx() {
  if (CTX) return CTX;
  const terrains = JSON.parse(readFileSync(P.terrain, 'utf8')).terrains;
  const { sets, pairsOf, errors } = loadSets(P, terrains, ['ninja-test']);
  if (errors.length) throw new Error(errors.join('\n'));
  return (CTX = { terrains, sets, pairsOf });
}
// Bakes an IR; returns { place } or throws with the bake's messages.
export function bakeIR(ir) {
  const { place, errors } = buildPlace(ir, bakeCtx());
  if (errors) throw new Error(errors.map(e => e.message).join('\n'));
  return place;
}
// Renders an IR at `size` px a tile (16 or 48); win: { x, y, w, h } in pixels, default the whole place. Returns { img: { w, h, data RGBA }, place }.
export function renderIR(ir, size = 16, win = null) {
  const place = bakeIR(ir), ts = bakeCtx().sets.get(ir.tileset), W = win || { x: 0, y: 0, w: place.w * size, h: place.h * size };
  return { img: indexedToRgba(renderView(ts, place, size, W), W.w, W.h, paletteRgb(ts)), place };
}
