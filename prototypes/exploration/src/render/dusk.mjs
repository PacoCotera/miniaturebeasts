// The clock's dusk (level 6): the ONE source of its colours. The sandbox page (index.html buildDusk) and the places view (places/src/ground.mjs duskOf, duskLitOf) both read this file.
// Two tables, both flat (the veil at dusk is a tone shift, no dither):
//   unseen land (duskTable): each colour's one-step dark, leaned DUSK_LEAN (10%) of the way toward the amber's dark, then snapped to the nearest colour of the palette (the caller's snap).
//   seen land (duskLitTable): each source colour itself, darkened DUSK_LIT_STEP (20%), leaned DUSK_LEAN toward the same amber: an exact colour, never snapped, so two greens stay two greens
//     and a tree keeps its crowns (the page adds these colours to its table; its index map is only a flag and a fallback).
export const DUSK_LEAN = 0.1;
export const DUSK_LIT_STEP = 0.2;

// n colours; dark[i] = the one-step dark of colour i; rgbAt(i) = [r, g, b] or undefined; w = the amber's dark rgb; snap(i, [r, g, b]) = the palette index to use.
export function duskTable(n, dark, rgbAt, w, snap) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = rgbAt(dark[i]);
    out.push(d ? snap(i, d.map((v, k) => v + (w[k] - v) * DUSK_LEAN)) : dark[i]);
  }
  return out;
}

// The exact rgb of the seen land's colour a (the source colour itself, not the dusk table's snapped colour).
export const duskLitRgb = (a, w) => a.map((v) => v * (1 - DUSK_LIT_STEP)).map((v, k) => Math.round(v + (w[k] - v) * DUSK_LEAN));
