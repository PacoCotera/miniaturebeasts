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

// ---- the night table (dark2): every colour keeps its hue family (art director, 2026-11-09 20:4x) ----
// green (grass, tone, reeds, shrubs, leaves) -> a dark green, never red-brown; water and teal -> a dark blue-teal, never purple; sand, earth, path, trunk -> a dark warm brown; stone -> a dark grey;
// the tree crowns and bushes (the leaf ramp) go to no lighter a green than the night grass; the sunlit grass tone goes to the next green a touch lighter than the night grass. Anything else (pinks, whites,
// the core's blues and purples) goes to the nearest colour of the whole palette as before.
export const NIGHT_TABLES = ['dark2'];
export function family(rgb) {
  const [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn <= 30 && r >= b - 4) return 'grey';
  if (g >= r && g >= b) return b >= 0.8 * g ? 'teal' : 'green';
  if (b > g && b > r && g >= r) return b <= 1.25 * g ? 'teal' : 'blue';   // a teal leans no more than a quarter to blue; the core's deep blues are their own family
  if (r >= g && g >= b) return 'warm';
  return null;
}
const lumOf = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

// opts.ground: palette indices of the plain grass fill's colours; opts.tone: of the sunlit tone patch; opts.crowns: of the tree, bush and shrub leaf ramp (all core-and-set indices).
export function computeTables(coreRgb, setRgb, opts = {}) {
  const cand = [];
  for (let i = 1; i < coreRgb.length; i++) cand.push([i, coreRgb[i]]);
  setRgb.forEach((rgb, k) => cand.push([coreRgb.length + k, rgb]));
  const rgbAt = (i) => (i < coreRgb.length ? coreRgb[i] : setRgb[i - coreRgb.length]);
  const nearest = (c, pool = cand) => {
    let best = -1, bd = Infinity;
    for (const [i, rgb] of pool) {
      const d = (rgb[0] - c[0]) ** 2 + (rgb[1] - c[1]) ** 2 + (rgb[2] - c[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const pools = {};
  for (const f of ['green', 'teal', 'blue', 'warm', 'grey']) pools[f] = cand.filter(([, rgb]) => family(rgb) === f);
  const ground = new Set(opts.ground || []), tone = new Set(opts.tone || []), crowns = new Set(opts.crowns || []);
  const used = coreRgb.length + setRgb.length;
  const tables = {};
  for (const name of TABLE_NAMES) {
    const map = new Array(256), night = NIGHT_TABLES.includes(name);
    // the night grass: the green the plain grass fill goes to; the crowns stay at or below its lightness, the tone goes to the green just above it
    let g0 = -1, lim = Infinity, up = -1;
    if (night && ground.size) {
      const gi = [...ground][0]; g0 = nearest(TRANSFORMS[name](rgbAt(gi)), pools.green); lim = lumOf(rgbAt(g0));
      let bl = Infinity; for (const [i, rgb] of pools.green) { const l = lumOf(rgb); if (l > lim && l < bl) { bl = l; up = i; } }
    }
    for (let i = 0; i < 256; i++) {
      if (i === 0) { map[i] = 0; continue; }
      if (i >= used) { map[i] = i; continue; }
      const rgb = rgbAt(i), t = TRANSFORMS[name](rgb), f = night ? family(rgb) : null;
      if (!night || !f) map[i] = nearest(t);
      else if (tone.has(i) && up >= 0 && f === 'green') map[i] = up;
      else if (crowns.has(i) && f === 'green') map[i] = nearest(t, pools.green.filter(([, c]) => lumOf(c) <= lim));
      else map[i] = nearest(t, pools[f]);
    }
    tables[name] = map;
  }
  return tables;
}

