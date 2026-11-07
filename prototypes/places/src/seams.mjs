// Seam proofs (arch.md A5). Pure functions over RGBA tile images, so the same checks run at 48 px and at the derived 24 px.
import { NW, NE, SW, SE } from './dualgrid.mjs';

// Corner bits on each edge of dual tile k, as a 2-bit state.
export const EDGES = {
  N: (k) => ((k & NW ? 2 : 0) | (k & NE ? 1 : 0)),   // read west to east
  S: (k) => ((k & SW ? 2 : 0) | (k & SE ? 1 : 0)),
  W: (k) => ((k & NW ? 2 : 0) | (k & SW ? 1 : 0)),   // read north to south
  E: (k) => ((k & NE ? 2 : 0) | (k & SE ? 1 : 0)),
};

// The outermost line of pixels of an edge, as an array of 'rgba' strings (so a difference can name its position).
export function edgeLine(tile, edge) {
  const { w, h, data } = tile;
  const px = (x, y) => { const i = (y * w + x) * 4; return data[i + 3] === 0 ? '-' : `${data[i]},${data[i + 1]},${data[i + 2]}`; };
  const line = [];
  if (edge === 'N') for (let x = 0; x < w; x++) line.push(px(x, 0));
  if (edge === 'S') for (let x = 0; x < w; x++) line.push(px(x, h - 1));
  if (edge === 'W') for (let y = 0; y < h; y++) line.push(px(0, y));
  if (edge === 'E') for (let y = 0; y < h; y++) line.push(px(w - 1, y));
  return line;
}

// frames: array of 16-tile arrays (one per animation frame); fullVariants / emptyVariants: extra tile images that stand in for
// index 15 / index 0. Returns [] when every tile sharing an edge state has the same boundary line in every frame.
export function edgeSignatureFailures(frames, fullVariants = [], emptyVariants = []) {
  const failures = [];
  const members = []; // { label, k, tile }
  frames.forEach((tiles, f) => tiles.forEach((tile, k) => members.push({ label: `tile ${k}` + (frames.length > 1 ? ` frame ${f}` : ''), k, tile })));
  fullVariants.forEach((tile, v) => members.push({ label: `full variant ${v}`, k: 15, tile }));
  emptyVariants.forEach((tile, v) => members.push({ label: `empty variant ${v}`, k: 0, tile }));
  for (const edge of ['N', 'E', 'S', 'W']) {
    const ref = new Map(); // state -> { label, line }
    for (const m of members) {
      const state = EDGES[edge](m.k);
      const line = edgeLine(m.tile, edge);
      const r = ref.get(state);
      if (!r) { ref.set(state, { label: m.label, line }); continue; }
      const at = line.findIndex((v, i) => v !== r.line[i]);
      if (at >= 0) failures.push(`${edge} edge, corner state ${state}: ${m.label} differs from ${r.label} at pixel ${at} (${line[at]} against ${r.line[at]})`);
    }
  }
  return failures;
}

// Coverage of a terrain map by dual tiles: the corner indices present and the adjacencies (a left of b, a above b) of two tiles.
// layerCodes: Uint16Array of codes (local to one pair), w1 x h1; interior only (the clamped border repeats the edge cells).
export function coverage(codes, w1, h1, classify) {
  const idx = new Set();
  const horiz = new Set(), vert = new Set();
  for (let j = 1; j < h1 - 1; j++) for (let i = 1; i < w1 - 1; i++) {
    const a = classify(codes[j * w1 + i]);
    idx.add(a);
    if (i + 1 < w1 - 1) horiz.add(a * 16 + classify(codes[j * w1 + i + 1]));
    if (j + 1 < h1 - 1) vert.add(a * 16 + classify(codes[(j + 1) * w1 + i]));
  }
  return { idx, horiz, vert };
}

// Every legal adjacency: a left of b needs E(a) == W(b); a above b needs S(a) == N(b).
export function legalAdjacencies() {
  const horiz = [], vert = [];
  for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) {
    if (EDGES.E(a) === EDGES.W(b)) horiz.push(a * 16 + b);
    if (EDGES.S(a) === EDGES.N(b)) vert.push(a * 16 + b);
  }
  return { horiz, vert };
}
