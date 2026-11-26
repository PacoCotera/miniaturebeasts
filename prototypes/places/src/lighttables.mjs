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

// ---- the night table (dark2): every colour keeps its hue family (art director, 2026-11-09 20:4x) ----
// green (grass, tone, reeds, shrubs, leaves) -> a dark green, never red-brown; water and teal -> a dark blue-teal, never purple; sand, earth, path, trunk -> a dark warm brown; stone -> a dark grey;
// the tree crowns and bushes (the leaf ramp) go to no lighter a green than the night grass; the sunlit grass tone goes to the next green a touch lighter than the night grass. Anything else (pinks, whites,
// the core's blues and purples) goes to the nearest colour of the whole palette as before.
export const NIGHT_TABLES = ['dark2'];

// ---- the night colour table (owner bug #113; art director: night must be darker AND cooler than dark2 and tell from dusk) ----
// Hand-set look: grass about (26,50,56); every colour steps down toward the cool night greys, reds, oranges and creams lose most of their warmth, light things stay the lightest.
// A colour keeps 40% of its own chroma (the rest goes to its grey), is scaled by the night's red, green, blue factors and lifted a little in blue, then takes the nearest colour of the palette
// (the set holds no spare index: every colour of the night table is a colour already there). dark2, the storm and the veil are untouched; this is the table the place draws through at night.
export const NIGHT_LOOK = { keep: 0.4, scale: [0.22, 0.31, 0.36], blueLift: 14, grass: [26, 50, 56], grassLum: 146 };   // grass: the night grass (the day grass's luminance is grassLum)
export function nightTable(rgb) {
  const L = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const pool = [];
  rgb.forEach((c, i) => { if (i > 0 && !Object.values(STONE_TONES).some((t) => Object.values(t).some((v) => v[0] === c[0] && v[1] === c[1] && v[2] === c[2]))) pool.push([i, c]); });
  const { keep, scale, blueLift } = NIGHT_LOOK;
  const isGreen = (c) => c[1] >= c[0] && c[1] >= c[2] && c[1] - Math.min(c[0], c[2]) > 8 && c[2] < 0.8 * c[1];   // green leads (a blue-grey that family() calls teal is not: the water's teals, #3a8785 and the like, took the night grass at night, so water read as ground; bug #171)
  const greens = pool.filter(([, c]) => isGreen(c) && lumOf(c) < 90);
  const map = new Array(rgb.length).fill(0);
  for (let i = 1; i < rgb.length; i++) {
    const c = rgb[i], g = L(c), m = c.map((v) => g + (v - g) * keep);
    const t = [m[0] * scale[0], m[1] * scale[1], m[2] * scale[2] + blueLift];
    // a green (grass, leaves, olives) stays a green-teal: its target is the night grass anchor, lighter or darker as the day colour is, and it takes the nearest green or teal of the palette
    const green = isGreen(c) && c[1] - Math.min(c[0], c[2]) > 25 && g > 60, anchorK = Math.min(1.9, Math.max(0.45, g / NIGHT_LOOK.grassLum)) ** 0.4;
    const aim = green ? NIGHT_LOOK.grass.map((v) => v * anchorK) : t, from = green ? greens : pool;
    let best = i, bd = Infinity;
    for (const [j, q] of from) { const d = 3 * (q[0] - aim[0]) ** 2 + 4 * (q[1] - aim[1]) ** 2 + 2 * (q[2] - aim[2]) ** 2; if (d < bd) { bd = d; best = j; } }
    map[i] = best;
  }
  return map;
}
export function family(rgb) {
  const [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn <= 30 && r >= b - 4) return 'grey';
  if (g >= r && g >= b) return b >= 0.8 * g ? 'teal' : 'green';
  if (b > g && b > r && g >= r) return b <= 1.25 * g ? 'teal' : 'blue';   // a teal leans no more than a quarter to blue; the core's deep blues are their own family
  if (r >= g && g >= b) return 'warm';
  return null;
}
const lumOf = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const sat = (c) => (Math.max(...c) - Math.min(...c)) / Math.max(...c, 1);
// a pale, low-saturation yellow-warm colour: sand, dry grass (not the oranges, browns and reds, nor the bright yellows)
const khaki = (c) => lumOf(c) >= 100 && sat(c) <= 0.5 && c[1] >= 0.85 * c[0];
const muted = (t) => { const g = lumOf(t); return [t[0] + (g - t[0]) * 0.5, t[1] + (g - t[1]) * 0.5, t[2] + (g - t[2]) * 0.5]; };

// The signed rock family (the grey body, outlines and highlights) in the dark: a moonlit grey-blue ramp of three steps, so a stone and a boulder keep their form without glowing on the dark ground.
// dark2 is the night (art director 2026-11-10: #474d55, highlight #555c64); storm is the storm's dim light, a touch brighter since its ground is.
export const STONE_TONES = {
  dark2: { line: [0x34, 0x38, 0x40], mid: [0x47, 0x4d, 0x55], hi: [0x55, 0x5c, 0x64] },
  storm: { line: [0x3e, 0x44, 0x4e], mid: [0x5a, 0x64, 0x70], hi: [0x6c, 0x76, 0x82] },
};
// The rock ramp at night (art director 2026-11-12): a darker day grey never maps lighter at night, and the rock keeps four or more separate values. Day colour -> night colour, both of the palette;
// the dark end of the rock (the cracks, the outlines) goes to the darkest greys and the body steps climb from there, in the day order. Applied to the night table only, where the day colour is in the set.
export const NIGHT_ROCK = [['242626', '141b1b'], ['2a3834', '141b1b'], ['343840', '1d2531'], ['3e444e', '1d2531'], ['474d55', '1d2531'], ['555c64', '1d2531'], ['5a6470', '242c38'], ['6c7682', '242c38'], ['8497a5', '2b333f'], ['9eadb9', '333b47'], ['acbfc5', '3e444e']];   // rock ramp rev 2, second pass (art director 2026-11-15): cool grey night steps #1d2531 (.26), #242c38 (.29), #2b333f (.32), #333b47 (.35), #3e444e (.385) at the hue of #333b47; no rock face below .26; the cracks stay darkest
// The olive meadow ramp at night (art director 2026-11-12): day colour -> the dark olive green its two lighter steps already take (#54603e). Table entries only; applied only where the step's night colour is not green.
export const NIGHT_OLIVE = [['667b59', '54603e'], ['79875b', '54603e'], ['8b9561', '54603e'], ['4f6a53', '244523']];   // #4f6a53, the dark tuft green of the widening, takes the night green of the olives below it
// The sea-fog veil tone (art director 2026-11-12): day colour -> its night colour; both are set colours no other row points at.
export const NIGHT_VEIL = [['4a5f78', '1e2a3e']];
// opts.bank, opts.bankTo: the bank earth and the trunk brown it takes at night (below). opts.ground: palette indices of the plain grass fill's colours; opts.tone: of the sunlit tone patch; opts.crowns: of the tree, bush and shrub leaf ramp; opts.stone: of the rocks, boulders and cliff stone, outlines included; opts.stoneHi: of the rock's two lightest greys, which go one step lighter; opts.stoneLine: of its outlines, which go one step darker (all core-and-set indices).
export function computeTables(coreRgb, setRgb, opts = {}) {
  const cand = [];
  for (let i = 1; i < coreRgb.length; i++) cand.push([i, coreRgb[i]]);
  // opts.noTarget: palette indices of colours added to widen the meadow ramp; they get their own rows but no other colour's row points at them, so every existing colour steps exactly as before
  const noTarget = new Set(opts.noTarget || []);
  setRgb.forEach((rgb, k) => { if (!noTarget.has(coreRgb.length + k)) cand.push([coreRgb.length + k, rgb]); });
  // the stone tones are pinned in the palette for the stone ramp alone: no other colour snaps to them
  const isTone = (rgb) => Object.values(STONE_TONES).some((t) => Object.values(t).some((v) => v[0] === rgb[0] && v[1] === rgb[1] && v[2] === rgb[2]));
  const candAll = cand.slice(); cand.splice(0, cand.length, ...candAll.filter(([, rgb]) => !isTone(rgb)));
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
  const ground = new Set(opts.ground || []), tone = new Set(opts.tone || []), crowns = new Set(opts.crowns || []), stone = new Set(opts.stone || []), stoneHi = new Set(opts.stoneHi || []), stoneLine = new Set(opts.stoneLine || []);
  const bank = new Set(opts.bank || []), bankTo = opts.bankTo ?? -1;   // opts.bank: palette indices of the bank earth (the earth sheets' colours no other sheet uses); opts.bankTo: the night colour they take
  const trunkLit = new Set(opts.trunkLit || []), trunkShade = new Set(opts.trunkShade || []), trunkLitTo = opts.trunkLitTo ?? -1, trunkShadeTo = opts.trunkShadeTo ?? -1;   // opts.trunkShade / opts.trunkLit: palette indices of the tree trunk's two darker and two lighter browns; opts.trunkShadeTo / opts.trunkLitTo: the two low-saturation browns they take at night, so the trunk keeps its form steps
  const litter = new Set(opts.litter || []), litterTo = opts.litterTo ?? -1;   // opts.litter: palette indices of the woods litter's orange specks; opts.litterTo: the dull brown they take at night
  const glint = opts.glint || [], glintTo = opts.glintTo || [];   // opts.glint: the water ripple's glint colours, darker first; opts.glintTo: the cool pale grey-blues they take at night, in the same order
  const used = coreRgb.length + setRgb.length;
  const tables = {};
  for (const name of TABLE_NAMES) {
    const map = new Array(256), night = NIGHT_TABLES.includes(name);
    // the night grass: the green the plain grass fill goes to; the crowns stay at or below its lightness, the tone goes to the green just above it
    let g0 = -1, lim = Infinity, up = -1, groundLum = Infinity;
    if (night && ground.size) {
      const gi = [...ground][0]; g0 = nearest(TRANSFORMS[name](rgbAt(gi)), pools.green); lim = lumOf(rgbAt(g0)); groundLum = lumOf(rgbAt(gi));
      // the sunlit tone: at most one small step above the night grass and low in saturation (art director 2026-11-09: no glowing patches); the step is weighed with the saturation
      let bs = Infinity; for (const [i, rgb] of pools.green) { const l = lumOf(rgb); if (l > lim) { const s = (Math.max(...rgb) - Math.min(...rgb)) / Math.max(...rgb), score = (l - lim) + 60 * s; if (score < bs) { bs = score; up = i; } } }
    }
    const tones = STONE_TONES[name], coolGrey = candAll.filter(([, c]) => Math.max(...c) - Math.min(...c) <= 45 && c[2] >= c[0] - 4 && c[1] <= c[2] + 4), ramp = (c) => nearest(c, coolGrey.length ? coolGrey : candAll);   // the quiet cool colours: neutral greys and blue-greys, never a green or a warm grey
    const stoneTo = tones && stone.size ? ramp(tones.mid) : -1, stoneHiTo = tones && stoneHi.size ? ramp(tones.hi) : -1, stoneLineTo = tones && stoneLine.size ? ramp(tones.line) : -1;
    // the other greens keep their order against the grass: a green darker than the plain grass (the scrub, the reeds, the shades) goes to a green darker than the night grass, a lighter one to one at least as light
    // dry grass, sand and the pale warm colours (yellow-khaki, low in saturation) go to a dark olive-khaki of low saturation, never brick red; the scree's warm greys to a dark neutral grey (art director 2026-11-10 23:08)
    const khakiPool = cand.filter(([, c]) => sat(c) >= 0.2 && sat(c) <= 0.4 && lumOf(c) >= 45 && lumOf(c) <= 105 && c[0] >= 0.85 * c[1] && c[1] > c[2] * 1.1 && c[1] >= c[0]);
    const warmGreyPool = cand.filter(([, c]) => family(c) === 'grey' && c[0] <= c[2] + 4 && lumOf(c) >= 50 && lumOf(c) <= 95);
    const warmGreyTo = warmGreyPool.length ? 1 : -1;
    const darkGreens =pools.green.filter(([, c]) => lumOf(c) < lim), lightGreens = pools.green.filter(([, c]) => lumOf(c) >= lim);
    for (let i = 0; i < 256; i++) {
      if (i === 0) { map[i] = 0; continue; }
      if (i >= used) { map[i] = i; continue; }
      const rgb = rgbAt(i), t = TRANSFORMS[name](rgb), f = night ? family(rgb) : null;
      if (tones && stoneHi.has(i) && stoneHiTo > 0) map[i] = stoneHiTo;
      else if (tones && stoneLine.has(i) && stoneLineTo > 0) map[i] = stoneLineTo;
      else if (tones && stone.has(i) && stoneTo > 0) map[i] = stoneTo;
      else if (night && bank.has(i) && bankTo > 0) map[i] = bankTo;   // the thin earth band at the water's edge: the darkest low-saturation trunk brown, never a rust red (art director 2026-11-11)
      else if (night && trunkShade.has(i) && trunkShadeTo > 0) map[i] = trunkShadeTo;   // the tree trunk's shade side at night: a dark low-saturation brown, no red cast (art director 2026-11-11)
      else if (night && trunkLit.has(i) && trunkLitTo > 0) map[i] = trunkLitTo;   // its lit side: a lighter low-saturation brown, so the trunk keeps its form steps (art director 2026-11-11)
      else if (night && litter.has(i) && litterTo > 0) map[i] = litterTo;   // the woods litter's orange specks at night: a dull brown (art director 2026-11-11)
      else if (night && glint.includes(i) && glintTo.length) map[i] = glintTo[Math.min(glint.indexOf(i), glintTo.length - 1)];   // the ripple's glints at night: a cool pale grey-blue, never pink or mauve (art director 2026-11-11)
      else if (!night || !f) map[i] = nearest(t);
      else if (f === 'warm' && khakiPool.length && khaki(rgb)) map[i] = nearest(muted(t), khakiPool);
      else if (f === 'grey' && rgb[0] > rgb[2] + 8 && warmGreyTo > 0) { const x = lumOf(rgb) * 0.55; map[i] = nearest([x, x + 2, x], warmGreyPool); }
      else if (tone.has(i) && up >= 0 && f === 'green') map[i] = up;
      else if (crowns.has(i) && f === 'green') map[i] = nearest(t, pools.green.filter(([, c]) => lumOf(c) <= lim));
      else if (f === 'green' && ground.size && !ground.has(i)) { const pool = lumOf(rgb) < groundLum ? darkGreens : lightGreens; map[i] = nearest(t, pool.length ? pool : pools.green); }
      else map[i] = nearest(t, pools[f]);
    }
    if (night) {
      const at = (h) => { for (let i = 1; i < used; i++) { const c = rgbAt(i); if (c[0] === parseInt(h.slice(0, 2), 16) && c[1] === parseInt(h.slice(2, 4), 16) && c[2] === parseInt(h.slice(4, 6), 16)) return i; } return -1; };
      for (const [day, to] of NIGHT_ROCK) { const d = at(day), t = at(to); if (d > 0 && t > 0) map[d] = t; }
    }
    if (night || name === 'dark') {   // the olive meadow steps never go brown-grey at night (art director 2026-11-12): one whose night step left the green family takes the green its sibling steps take
      const at = (h) => { for (let i = 1; i < used; i++) { const c = rgbAt(i); if (c[0] === parseInt(h.slice(0, 2), 16) && c[1] === parseInt(h.slice(2, 4), 16) && c[2] === parseInt(h.slice(4, 6), 16)) return i; } return -1; };
      for (const [day, to] of NIGHT_OLIVE) { const d = at(day), t = at(to); if (d > 0 && t > 0 && family(rgbAt(map[d])) !== 'green') map[d] = t; }
    }
    if (night || name === 'dark') {   // the sea-fog veil tone has its own night entry (art director 2026-11-12), in the dark and dark2 tables
      const at = (h) => { for (let i = 1; i < used; i++) { const c = rgbAt(i); if (c[0] === parseInt(h.slice(0, 2), 16) && c[1] === parseInt(h.slice(2, 4), 16) && c[2] === parseInt(h.slice(4, 6), 16)) return i; } return -1; };
      for (const [day, to] of NIGHT_VEIL) { const d = at(day), t = at(to); if (d > 0 && t > 0) map[d] = t; }
    }
    tables[name] = map;
  }
  return tables;
}

