// Computed light tables for a tile set's palette (place design A3.1: "a set that does not give tables gets computed ones").
// A table is 256 entries: palette index -> palette index. Index 0 (transparent) maps to 0. Indices 1..47 are the core palette,
// 48..48+n-1 the set's colours; indices beyond that map to themselves. The target of a transformed colour is the nearest colour
// (squared RGB distance, ties to the lower index) among the core and the set colours.

export const TABLE_NAMES = ['dark', 'light', 'dark2', 'fog', 'fade', 'storm', 'veil'];

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c, to, t) => [lerp(c[0], to[0], t), lerp(c[1], to[1], t), lerp(c[2], to[2], t)];

// The core palette's own anchors: mist #8d8aa6 (fog), night #29253a (fade), ink #1a1725 (veil).
export const TRANSFORMS = {
  dark: (c) => [c[0] * 0.66, c[1] * 0.66, c[2] * 0.7],
  light: (c) => mix(c, [255, 255, 255], 0.25),
  dark2: (c) => [c[0] * 0.42, c[1] * 0.42, c[2] * 0.48],
  fog: (c) => mix(c, [141, 138, 166], 0.55),
  fade: (c) => mix(c, [41, 37, 58], 0.35),
  storm: (c) => { const g = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; const m = mix(c, [g, g, g], 0.55); return [m[0] * 0.78, m[1] * 0.8, m[2] * 0.9 + 8]; },
  veil: (c) => mix(c, [26, 23, 37], 0.62),
};

// Adds the entries of extra colours (the haze ramp, at palette indices first..) to tables already computed: each goes to the nearest colour of
// the core, the set and the extras, as computeTables does. tables: { name: Uint8Array(256) | array }, changed in place.
export function extendTables(tables, coreRgb, setRgb, first, extraRgb) {
  const cand = [];
  for (let i = 1; i < coreRgb.length; i++) cand.push([i, coreRgb[i]]);
  setRgb.forEach((rgb, k) => cand.push([coreRgb.length + k, rgb]));
  extraRgb.forEach((rgb, k) => cand.push([first + k, rgb]));
  for (const name of TABLE_NAMES) {
    if (!tables[name]) continue;
    extraRgb.forEach((rgb, k) => {
      const c = TRANSFORMS[name](rgb);
      let best = -1, bd = Infinity;
      for (const [i, r] of cand) { const d = (r[0] - c[0]) ** 2 + (r[1] - c[1]) ** 2 + (r[2] - c[2]) ** 2; if (d < bd) { bd = d; best = i; } }
      tables[name][first + k] = best;
    });
  }
  return tables;
}

// A green: more green than red and than blue. The night table sends the grass-tone colours to a green only (terrain-layers-c: they went to brown).
export const isGreen = (rgb) => rgb[1] > rgb[0] && rgb[1] > rgb[2];
export const GREEN_ONLY_TABLES = ['dark2'];

// opts.greenOnly: palette indices (core and set colours) whose target in GREEN_ONLY_TABLES is the nearest green among the candidates, not the nearest colour.
export function computeTables(coreRgb, setRgb, opts = {}) {
  const cand = [];
  for (let i = 1; i < coreRgb.length; i++) cand.push([i, coreRgb[i]]);
  setRgb.forEach((rgb, k) => cand.push([coreRgb.length + k, rgb]));
  const greenOnly = new Set(opts.greenOnly || []);
  const nearest = (c, pool = cand) => {
    let best = -1, bd = Infinity;
    for (const [i, rgb] of pool) {
      const d = (rgb[0] - c[0]) ** 2 + (rgb[1] - c[1]) ** 2 + (rgb[2] - c[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const rgbAt = (i) => (i < coreRgb.length ? coreRgb[i] : setRgb[i - coreRgb.length]);
  // opts.greenKeep: indices of the plain ground colour (the grass fill): the greens they go to are left out of the pool, so the tone stays a patch beside it
  const greenPool = (name) => {
    const keep = new Set((opts.greenKeep || []).map((i) => nearest(TRANSFORMS[name](rgbAt(i)))));
    return cand.filter(([i, rgb]) => isGreen(rgb) && !keep.has(i));
  };
  const used = coreRgb.length + setRgb.length;
  const tables = {};
  for (const name of TABLE_NAMES) {
    const map = new Array(256);
    const pool = GREEN_ONLY_TABLES.includes(name) ? greenPool(name) : null;
    for (let i = 0; i < 256; i++) {
      if (i === 0) map[i] = 0;
      else if (i >= used) map[i] = i;
      else map[i] = nearest(TRANSFORMS[name](rgbAt(i)), pool && greenOnly.has(i) ? pool : cand);
    }
    tables[name] = map;
  }
  return tables;
}
