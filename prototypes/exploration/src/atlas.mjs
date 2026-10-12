// The Companion's 48 px places, from the art director's meadow set. Pure and integer only:
// no page state, DOM, storage, clock, randomness, drawing or float. It reads names from the catalogue, never from file names, so
// meadow.json can rename a piece without a code change: the exact colour decode, the catalogue, the core set, the biome palette and
// the per-tile layers each 48 px tile of a place is built from.
import { PW, PH, T, T_BLOCK, TERR, hash } from './world.mjs';

export const QUADS = ['nw', 'ne', 'se', 'sw'];
export const SHORE_STATES = ['fill', 'edgeh', 'edgev', 'outer', 'inner'];
export const LIP_STATES = ['fill', 'edgeh', 'edgev', 'edgev0', 'outer', 'outer0', 'inner'];

// The exact decode: alpha 0 decodes to -1; alpha 255 with an RGB exactly in the table decodes to its index; anything else adds to bad.
// No nearest colour, no dither, ever.
export function decodeExact(rgba, w, h, rgbTable) {
  const of = new Map(rgbTable.map((c, i) => [c[0] << 16 | c[1] << 8 | c[2], i]));
  const px = new Int16Array(w * h); let bad = 0;
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3];
    if (a === 0) { px[i] = -1; continue; }
    const k = a === 255 ? of.get(rgba[i * 4] << 16 | rgba[i * 4 + 1] << 8 | rgba[i * 4 + 2]) : undefined;
    if (k === undefined) { px[i] = -1; bad++; } else px[i] = k;
  }
  return { px, bad };
}

const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sortKey = (a, b) => byKey(String(a.variant ?? ''), String(b.variant ?? '')) || byKey(a.name, b.name);
const cellsAre = (p, w, h) => Array.isArray(p.cells) && p.cells[0] === w && p.cells[1] === h;
const two = () => [[], []];

// The pieces grouped by their manifest fields; each list sorted by variant, then name (water by frame). A piece no key takes
// (the wall foot strips, the shore macros, lobes, beaches and bends: catalogued but unused in v1) is listed in `other`.
export function catalogue(pieces, levelTone = null) {
  const water = {}, waterSand = {}, lip = { shadowN: [] }, waterMacro = {}, waterMacroSand = {}, sandShore = {}, shadow = { e: [], s: [], es: [], c: [] };
  for (const q of QUADS) { water[q] = {}; waterSand[q] = {}; for (const s of SHORE_STATES) { water[q][s] = []; waterSand[q][s] = []; } lip[q] = {}; for (const s of LIP_STATES) lip[q][s] = []; waterMacro[q] = { 42: [], 60: [] }; waterMacroSand[q] = { 42: [], 60: [] }; sandShore[q] = {}; for (const s of SHORE_STATES) sandShore[q][s] = []; }
  const sideOf = () => ({ mid: [], top: [], foot: [], tail: [] });
  const cat = {
    lawn: [], sand: [], deep: [], material: { rock: [] }, decal: { tall: [], flowers: [] }, water, waterSand, waterMacro, waterMacroSand, lip,
    face: { w3: [], w2: [], w1: [] }, cap: { w: [], e: [] }, cornerIn: { w: [], e: [] }, side: { e: sideOf(), w: sideOf() },
    stair: { S: [], N: [], E: [], W: [] }, landing: two(), foot2: two(), apronTop: two(),
    prop: { boulder: [], reeds: [], flowers: [] }, sandShore, shadow, other: [],
  };
  const LT = Array.isArray(levelTone) ? levelTone : [];
  const levelToneOut = [0, 1, 2].map(k => (LT[k] === 'light' || LT[k] === 'dark' ? LT[k] : 'none'));
  const put = (list, p) => { if (list) { list.push(p); return true; } return false; };
  const part = p => (p.part === 0 || p.part === 1 ? p.part : -1);
  for (const p of pieces) {
    let ok = false;
    switch (p.kind) {
      case 'ground': ok = p.set === 'lawn' || p.set === 'sand' || p.set === 'deep' ? put(cat[p.set], p) : false; break;
      case 'material': ok = p.set === 'rock' && put(cat.material.rock, p); break;
      case 'decal': ok = (p.set === 'tall' || p.set === 'flowers') && put(cat.decal[p.set], p); break;
      case 'shadow': ok = p.set === 'cast' && p.state in shadow && put(shadow[p.state], p); break;
      case 'shore': { const q4 = QUADS.includes(p.quad) && SHORE_STATES.includes(p.state), fr2 = p.frame === 1 || p.frame === 2;   // sets: water (lawn margin), water-sand (sand margin), sand (the sand's own edge)
        ok = p.set === 'sand' ? q4 && put(sandShore[p.quad][p.state], p) : p.set === 'water' ? q4 && fr2 && put(water[p.quad][p.state], p) : p.set === 'water-sand' && q4 && fr2 && put(waterSand[p.quad][p.state], p); break; }
      case 'shore-macro': ok = (p.set == null || p.set === 'sand-margin') && QUADS.includes(p.quad) && (p.radius === 42 || p.radius === 60) && (p.frame === 1 || p.frame === 2) && cellsAre(p, 2, 2) && put((p.set == null ? waterMacro : waterMacroSand)[p.quad][p.radius], p); break;
      case 'lip': ok = p.set === 'shadow-n' ? put(lip.shadowN, p) : QUADS.includes(p.quad) && LIP_STATES.includes(p.state) && put(lip[p.quad][p.state], p); break;
      case 'face': ok = cellsAre(p, 3, 2) ? put(cat.face.w3, p) : cellsAre(p, 2, 2) ? put(cat.face.w2, p) : cellsAre(p, 1, 2) ? put(cat.face.w1, p) : false; break;
      case 'cap': ok = (p.side === 'w' || p.side === 'e') && put(cat.cap[p.side], p); break;
      case 'corner-in': ok = (p.side === 'w' || p.side === 'e') && put(cat.cornerIn[p.side], p); break;
      case 'side': { const end = p.end == null || p.end === 'none' ? 'mid' : p.end;
        ok = (p.side === 'w' || p.side === 'e') && ['mid', 'top', 'foot', 'tail'].includes(end) && put(cat.side[p.side][end], p); break; }
      case 'stair': ok = ['S', 'N', 'E', 'W'].includes(p.facing) && put(cat.stair[p.facing], p); break;
      case 'landing': ok = part(p) >= 0 && put(cat.landing[part(p)], p); break;
      case 'foot': ok = cellsAre(p, 1, 1) && part(p) >= 0 && put(cat.foot2[part(p)], p); break;
      case 'apron-top': ok = part(p) >= 0 && put(cat.apronTop[part(p)], p); break;
      case 'prop': ok = (p.type === 'boulder' || p.type === 'reeds' || p.type === 'flowers') && put(cat.prop[p.type], p); break;
    }
    if (!ok) cat.other.push(p);
  }
  const sortAll = o => { if (Array.isArray(o)) { if (o.length && !Array.isArray(o[0])) o.sort(sortKey); else o.forEach(sortAll); } else for (const k in o) sortAll(o[k]); };
  sortAll(cat);
  for (const q of QUADS) { for (const s of SHORE_STATES) { water[q][s].sort((a, b) => a.frame - b.frame || byKey(a.name, b.name)); waterSand[q][s].sort((a, b) => a.frame - b.frame || byKey(a.name, b.name)); } for (const r of [42, 60]) { waterMacro[q][r].sort((a, b) => a.frame - b.frame || byKey(a.name, b.name)); waterMacroSand[q][r].sort((a, b) => a.frame - b.frame || byKey(a.name, b.name)); } }
  Object.defineProperty(cat, 'levelTone', { value: levelToneOut, enumerable: false });   // the manifest's level tones (not a piece list)
  return cat;
}

// The core set: lawn with at least 3 pieces, sand, and water complete: frames 1 and 2 exactly in every quarter and shore state
// (the page's fr 0 is frame 1, fr 1 frame 2; a shore piece with another frame number is not catalogued as water).
// Without it the page draws places at 32 px. coreMissing names what is absent; coreSet is the page's test.
export function coreMissing(cat) {
  const out = [];
  if (cat.lawn.length < 3) out.push('lawn (' + cat.lawn.length + ' of 3)');
  if (!cat.sand.length) out.push('sand');
  for (const q of QUADS) for (const s of SHORE_STATES) { const no = [1, 2].filter(f => !cat.water[q][s].some(p => p.frame === f));
    if (no.length) out.push('water.' + q + '.' + s + ' (frame' + (no.length > 1 ? 's ' : ' ') + no.join(' and ') + ' missing)'); }
  return out;
}
export function coreSet(cat) { return coreMissing(cat).length === 0; }

// The biome palette: one index space, 0–47 the core (unchanged) and 48 … N − 1 the biome's entries, each with the lookup tables
// the page draws through (dark, light, dark2, fog, fade; dark2 must be dark[dark[i]]) and an optional storm table (default: its dark).
// coreRGB and coreTables are the page's own 48 (coreTables also carries the core names: the page addresses colours by name).
// A core entry's name, hex, dark, light and dark2 must equal the page's; its fog, fade and storm may differ: the place overrides,
// which the place view alone draws through. Returns the core-true tables (rgb, dark, light, dark2, fog, fade, the page's own values
// at 0–47) plus the place tables placeFog, placeFade and placeStorm (the file's values everywhere), all of length N; or { errors }.
export const PALETTE_MAX = 256;
export const TABLE_FIELDS = ['dark', 'light', 'dark2', 'fog', 'fade'];
export const PLACE_OVERRIDES = ['fog', 'fade', 'storm'];
const PLACE_KEY = { fog: 'placeFog', fade: 'placeFade', storm: 'placeStorm' };
export function paletteTable(coreRGB, coreTables, file) {
  const entries = file && Array.isArray(file.entries) ? file.entries : null;
  if (!entries) return { errors: ['no entries'] };
  const n = entries.length, errors = [], core = coreRGB.length;
  if (n > PALETTE_MAX) errors.push(n + ' entries (at most ' + PALETTE_MAX + ')');
  if (n < core) errors.push(n + ' entries: the core ' + core + ' are not all there');
  const rgb = [], seen = new Map(), out = { rgb }, raw = { storm: [] };
  for (const f of TABLE_FIELDS) { out[f] = []; raw[f] = []; }
  out.mat = [];
  for (let k = 0; k < n; k++) {
    const e = entries[k] || {};
    if (e.i !== k) errors.push('entry ' + k + ': i is ' + JSON.stringify(e.i) + ' (a gap or out of order)');
    const hex = typeof e.hex === 'string' ? e.hex.toLowerCase() : '';
    if (!/^#[0-9a-f]{6}$/.test(hex)) { errors.push('entry ' + k + ': hex ' + JSON.stringify(e.hex)); rgb.push([0, 0, 0]); }
    else {
      if (seen.has(hex)) errors.push('entry ' + k + ': hex ' + hex + ' repeats entry ' + seen.get(hex)); else seen.set(hex, k);
      rgb.push([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
    }
    out.mat.push(typeof e.mat === 'string' ? e.mat : null);
    for (const f of TABLE_FIELDS.concat(e.storm === undefined ? [] : ['storm'])) {
      const v = e[f]; raw[f].push(v);
      if (!Number.isInteger(v) || v < 0 || v >= n) errors.push('entry ' + k + ': ' + f + ' ' + JSON.stringify(v) + ' outside 0 … ' + (n - 1));
    }
    if (e.storm === undefined) raw.storm.push(e.dark);   // the storm's table defaults to dark
    for (const f of TABLE_FIELDS) out[f].push(k < core && PLACE_OVERRIDES.includes(f) ? coreTables[f][k] : e[f]);
    if (k < core) {
      const c = coreRGB[k], r = rgb[k];
      if (r[0] !== c[0] || r[1] !== c[1] || r[2] !== c[2]) errors.push('entry ' + k + ': hex ' + hex + ' differs from the core colour');
      if (e.name !== coreTables.names[k]) errors.push('entry ' + k + ': name ' + JSON.stringify(e.name) + ' differs from the core name (' + coreTables.names[k] + ')');
      for (const f of TABLE_FIELDS) if (!PLACE_OVERRIDES.includes(f) && e[f] !== coreTables[f][k]) errors.push('entry ' + k + ': ' + f + ' ' + JSON.stringify(e[f]) + ' differs from the core table (' + coreTables[f][k] + ')');
    }
  }
  for (let k = 0; k < n; k++) {   // dark2 is the dark of the dark, as the page builds its own DARK2
    const d = out.dark[k], dd = Number.isInteger(d) && d >= 0 && d < n ? out.dark[d] : undefined;
    if (dd !== undefined && out.dark2[k] !== dd) errors.push('entry ' + k + ': dark2 ' + JSON.stringify(out.dark2[k]) + ' is not dark[dark[' + k + ']] (' + dd + ')');
  }
  for (const f of PLACE_OVERRIDES) out[PLACE_KEY[f]] = raw[f];
  if (errors.length) return { errors };
  out.lightGrass = out.light.map((v, i) => (out.mat[i] === 'grass' ? v : i));   // the level tone's tables: only grass-material colours move
  out.darkGrass = out.dark.map((v, i) => (out.mat[i] === 'grass' ? v : i));
  return out;
}

// ---- the per-tile layers of a 48 px place ----
const TS48 = 48, Q = 24;
const QE = { nw: 0, ne: 1, se: 1, sw: 0 }, QS = { nw: 0, ne: 0, se: 1, sw: 1 };   // a quarter's east and south halves
// The quarter's state from an 8-neighbour mask (bits N 0, NE 1, E 2, SE 3, S 4, SW 5, W 6, NW 7): the vertical side a, the
// horizontal side b, the diagonal d. Lips add the suffix 0 to outer and edgev beside a face; water never does.
const QBITS = { nw: [0, 6, 7], ne: [0, 2, 1], se: [4, 2, 3], sw: [4, 6, 5] };
function quarterState(m, q) { const [a, b, d] = QBITS[q].map(k => (m >> k) & 1); return a && b ? 'outer' : a ? 'edgeh' : b ? 'edgev' : d ? 'inner' : 'fill'; }
export function shoreState(m, q) { return quarterState(m, q); }
export function lipState(m, q, zero) { const s = quarterState(m, q); return zero && (s === 'outer' || s === 'edgev') ? s + '0' : s; }

// The lawn variant of every tile: hashed, then stepped so no tile shares a variant with the tile left of it or above it.
export function lawnVariants(lay, seed, n) {
  const v = new Array(PW * PH).fill(0); if (!n) return v;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x;
    v[i] = hash(seed, 'lawn', lay.key, x, y) % n;
    while (n >= 3 && ((x > 0 && v[i] === v[i - 1]) || (y > 0 && v[i] === v[i - PW]))) v[i] = (v[i] + 1) % n; }
  return v;
}

// A list's piece by hash, or null when the list is empty (the caller falls back).
const pick = (list, h) => (list && list.length ? list[h % list.length] : null);
const first = (...lists) => lists.find(l => l && l.length) || null;   // the first list that has pieces, in fallback order
// The part of a piece over one cell: the piece's rect sits at its offset from its anchor cell; (cx, cy) is the cell of the piece
// this tile shows, counted from the anchor. The layer is the rect's overlap with that cell, so every layer lies in 0–47.
function cellLayer(p, cx, cy) {
  const o = Array.isArray(p.offset) ? p.offset : [0, 0], x0 = cx * TS48, y0 = cy * TS48;
  const ax = Math.max(o[0], x0), ay = Math.max(o[1], y0), bx = Math.min(o[0] + p.w, x0 + TS48), by = Math.min(o[1] + p.h, y0 + TS48);
  return bx > ax && by > ay ? { id: p.name, sx: ax - o[0], sy: ay - o[1], w: bx - ax, h: by - ay, dx: ax - x0, dy: ay - y0, tone: null } : null;
}
// A piece placed at (dx, dy) in the tile, clipped to the tile.
function atLayer(p, dx, dy) {
  const ax = Math.max(0, dx), ay = Math.max(0, dy), bx = Math.min(TS48, dx + p.w), by = Math.min(TS48, dy + p.h);
  return bx > ax && by > ay ? { id: p.name, sx: ax - dx, sy: ay - dy, w: bx - ax, h: by - ay, dx: ax, dy: ay, tone: null } : null;
}
const quarterLayer = (p, q, sx, sy, tone) => ({ id: p.name, sx: sx || 0, sy: sy || 0, w: Q, h: Q, dx: QE[q] * Q, dy: QS[q] * Q, tone: tone || null });

// The FACE run [a, b] on row 0, split into pieces: the ends (a cap, or an inner corner, for mask bits 1 / 3 at a and 2 / 4 at b),
// then the middle filled from the left with 3- and 2-wide pieces. Returns [{ x, piece, j }] per column (j: the column inside the piece).
export function faceRunSplit(cat, seed, key, a, b, maskA, maskB) {
  const out = [], put = (x, p, j) => { if (p) out.push({ x, piece: p, j }); };
  if (maskA & 2) { put(a, pick(first(cat.cap.w, cat.face.w1), hash(seed, 'fc', key, a)), 0); a++; }
  else if (maskA & 8) { put(a, pick(first(cat.cornerIn.w, cat.face.w1), hash(seed, 'fc', key, a)), 0); a++; }
  if (b >= a) {
    if (maskB & 4) { put(b, pick(first(cat.cap.e, cat.face.w1), hash(seed, 'fc', key, b)), 0); b--; }
    else if (maskB & 16) { put(b, pick(first(cat.cornerIn.e, cat.face.w1), hash(seed, 'fc', key, b)), 0); b--; }
  }
  const prev = {};
  for (let x = a; x <= b;) {
    const rem = b - x + 1; let W = rem >= 5 ? (hash(seed, 'fw', key, x) & 1 ? 3 : 2) : rem === 4 ? 2 : rem;
    while (W > 0 && !cat.face['w' + W].length) W--;
    if (!W) { x++; continue; }   // no face piece at all: the column keeps its ground (the stand-in rule takes it)
    const list = cat.face['w' + W]; let k = hash(seed, 'fv', key, x) % list.length;
    if (list.length > 1 && prev[W] === k) k = (k + 1) % list.length;
    prev[W] = k; for (let j = 0; j < W; j++) put(x + j, list[k], j); x += W;
  }
  return out.sort((p, q) => p.x - q.x);
}

const WETT = t => t === T.WATER || t === T.STEP || t === T.DEEP;
// The shore macros: 2 × 2 blocks of open water whose outer corner meets land on its five outer tiles, scanned row by row; the first
// quarter (nw, ne, sw, se) that matches wins and its four tiles are taken. at(x, y) gives the tile code (off the grid counts as
// water). Returns [{ x, y, q, radius }] with the radius by the parity rule.
const MACRO_Q = [['nw', -1, -1], ['ne', -1, 1], ['sw', 1, -1], ['se', 1, 1]];
export function shoreMacros(at, w, h) {
  const out = [], used = new Set(), land = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !WETT(at(x, y)), water = (x, y) => x >= 0 && y >= 0 && x < w && y < h && at(x, y) === T.WATER;
  for (let y = 0; y <= h - 2; y++) for (let x = 0; x <= w - 2; x++) {
    const four = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
    if (!four.every(([a, b]) => water(a, b) && !used.has(b * w + a))) continue;
    for (const [q, dy, dx] of MACRO_Q) { const ro = dy < 0 ? y - 1 : y + 2, co = dx < 0 ? x - 1 : x + 2;
      if (land(x, ro) && land(x + 1, ro) && land(co, y) && land(co, y + 1) && land(co, ro)) {
        out.push({ x, y, q, radius: (7 * y + 3 * x) & 1 ? 42 : 60 }); for (const [a, b] of four) used.add(b * w + a); break; } }
  }
  return out;
}
// The cast shadow's state of a lawn tile, as the art director's proof picks it: e when the west tile is raised, s when the north tile
// is a face's foot, es for both, else c when the north-west tile is raised, else none. Off the place is never raised.
export function castState(raised, foot, x, y) { const e = raised(x - 1, y), s = foot(x, y - 1); return e && s ? 'es' : e ? 'e' : s ? 's' : raised(x - 1, y - 1) ? 'c' : null; }
const GRASSY = [T.GRASS, T.TALL, T.FLOWERS];
// placeLayers(lay, seed, cat, fr, level): every tile's layers ({ id, sx, sy, w, h, dx, dy, tone } from a piece, or { stand, dx, dy }
// for a 32 px code stand-in) over its ground, with dark: 1 for dark lawn, and the pieces taller than a cell as foot-anchored sprites.
// level is the place's height level (generator 2, 0–2) or null; the catalogue's levelTone lifts the lawn and its tall-grass decals of
// a level ('light' or 'dark'), and lip quarters take the tone of the level below. { ok: false } when a blocking tile needs the rock
// stand-in and face.w1 or material.rock is empty: that place stays at 32.
// The rules in effect: shore macros, and the face and water tones. Only the vectors' check of digests captured before them turns them off.
export const PLACE_RULES = { macros: true, faceTone: true, waterTone: true, shadow: true, reedStagger: true, g1Runs: true, sandShore: true, waterSand: true, darkShadow: true };
export function placeLayers(lay, seed, cat, fr, level = null, rules = PLACE_RULES) {
  const toneOf = L => { const t = L == null || !cat.levelTone ? null : cat.levelTone[L]; return t === 'light' || t === 'dark' ? t : null; };
  const lawnTone = toneOf(level), lipTone = level == null ? null : toneOf(level - 1), faceTone = rules.faceTone && level != null ? toneOf(level + 1) : null, waterTone = rules.waterTone ? lawnTone : null;
  const key = lay.key, N = PW * PH, tiles = new Array(N), sprites = [], at = (x, y) => (x < 0 || y < 0 || x >= PW || y >= PH ? -1 : lay.tiles[y * PW + x]);
  const terr = lay.terr || null, tmask = lay.tmask || null, frame = fr ? 1 : 0;
  const sandG = (x, y) => { const t = at(x, y); return t === T.SAND || (t === T.REEDS && lay.base === T.SAND); };   // sand ground: sand, or reeds on a sand base
  const lv = lawnVariants(lay, seed, cat.lawn.length), lawnIdx = (i) => (rules.lawnPick ? rules.lawnPick(i % PW, (i / PW) | 0, lv[i]) : lv[i]);   // lawnPick: the proof check's own picks
  const faceAt = new Map();   // FACE columns on row 0: x → { piece, j }
  if (terr) for (let x = 0; x < PW;) {
    if (terr[x] !== TERR.FACE) { x++; continue; } let b = x; while (b + 1 < PW && terr[b + 1] === TERR.FACE) b++;
    for (const c of faceRunSplit(cat, seed, key, x, b, tmask[x], tmask[b])) faceAt.set(c.x, c); x = b + 1;
  }
  const sideMid = { e: [], w: [] };   // the side mid chosen per row, per column side
  const macroAt = new Map();   // tile → its macro slice layer (falls back to the other radius, else the quarter rule)
  if (rules.macros) for (const mc of shoreMacros(at, PW, PH)) {
    const list = cat.waterMacro[mc.q], [, dy, dx] = MACRO_Q.find(m => m[0] === mc.q), ro = dy < 0 ? mc.y - 1 : mc.y + 2, co = dx < 0 ? mc.x - 1 : mc.x + 2;
    // a macro whose four side tiles meet sand takes the sand-margin form (the corner tile does not decide); a missing form falls back to the lawn-margin one
    const sandy = rules.waterSand && [[mc.x, ro], [mc.x + 1, ro], [co, mc.y], [co, mc.y + 1]].some(([a, b]) => sandG(a, b)), sl = cat.waterMacroSand[mc.q];
    const p = (sandy ? (sl[mc.radius] || [])[frame] : null) || (list[mc.radius] || [])[frame] || (list[mc.radius === 60 ? 42 : 60] || [])[frame];
    if (p) for (let j = 0; j < 4; j++) { const tx = mc.x + (j & 1), ty = mc.y + (j >> 1); macroAt.set(ty * PW + tx, Object.assign(cellLayer(p, tx - mc.x, ty - mc.y), { tone: waterTone })); }
  }
  // generator 1's cliff bands, laid as runs: the top row and the foot row split like the faces, rock between, open sides
  const g1 = new Map(), isCliff = (x, y) => at(x, y) === T.CLIFF, onP = (x, y) => at(x, y) !== -1;
  if (!terr && rules.g1Runs) {
    const top = (x, y) => isCliff(x, y) && onP(x, y - 1) && !isCliff(x, y - 1), foot = (x, y) => isCliff(x, y) && onP(x, y + 1) && !isCliff(x, y + 1);
    for (let y = 0; y < PH; y++) for (const [rowOf, sy] of [[top, 0], [(x, yy) => foot(x, yy) && !top(x, yy), 1]]) for (let x = 0; x < PW;) {
      if (!rowOf(x, y)) { x++; continue; } let b = x; while (b + 1 < PW && rowOf(b + 1, y)) b++;
      for (const c of faceRunSplit(cat, seed, key + '|g1|' + y, x, b, x > 0 ? 2 : 0, b < PW - 1 ? 4 : 0)) g1.set(y * PW + c.x, { piece: c.piece, j: c.j, sy });
      x = b + 1; }
  }
  // the cast shadow's state of a lawn tile: e (raised to the west), s (a face's foot to the north), es, or c (raised only to the north-west)
  const raised = (x, y) => { const t = at(x, y); return terr ? t === T.FACE : t === T.CLIFF; };
  const footAt = (x, y) => terr ? at(x, y) === T.FACE && terr[y * PW + x] === TERR.FACE && (tmask[y * PW + x] & 1) === 1 : isCliff(x, y) && onP(x, y + 1) && !isCliff(x, y + 1);
  const shadowState = (x, y) => castState(raised, footAt, x, y);
  const lawnBase = lay.base === T.GRASS || lay.base === T.DARK;
  for (let i = 0; i < N; i++) {
    const x = i % PW, y = (i / PW) | 0, t = lay.tiles[i], kind = terr ? terr[i] : 0, m = tmask ? tmask[i] : 0;
    const L = [], tile = { layers: L, dark: 0 }; tiles[i] = tile;
    // ground: lawn (dark lawn on a dark base), sand, or none for water
    const mac = macroAt.get(i) || null;
    const g = kind === TERR.SHADOW || mac ? lay.base : GRASSY.includes(t) ? T.GRASS : t === T.DARK ? T.DARK : t === T.SAND ? T.SAND : WETT(t) ? -1 : lay.base;   // terrain pieces and shore macros sit on the place's base
    if (g === T.SAND) { const p = pick(cat.sand, hash(seed, 'sd', key, x, y)); if (p) L.push(cellLayer(p, 0, 0)); }
    else if (g !== -1) { const p = cat.lawn[lawnIdx(i)]; if (p) L.push(Object.assign(cellLayer(p, 0, 0), { tone: lawnTone })); if (g === T.DARK) tile.dark = 1; }
    const sandGround = g === T.SAND && (t === T.SAND || t === T.REEDS);
    if (sandGround && rules.sandShore) {   // the sand shore: quarters toward other ground (water counts as sand; off the place too)
      const sandish = (xx, yy) => { const n = at(xx, yy); return n === -1 || WETT(n) || n === T.SAND || (n === T.REEDS && lay.base === T.SAND); };
      let sm = 0; [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].forEach(([dx, dy], b) => { if (!sandish(x + dx, y + dy)) sm |= 1 << b; });
      const st = QUADS.map(q => shoreState(sm, q)), ps = QUADS.map((q, k) => pick(cat.sandShore[q][st[k]], 0));
      if (st.some(v => v !== 'fill') && ps.every(Boolean)) QUADS.forEach((q, k) => L.push(quarterLayer(ps[k], q, 0, 0, waterTone)));
    }
    if (rules.shadow && !kind && (GRASSY.includes(t) || (rules.darkShadow && t === T.DARK) || ((t === T.ROCK || t === T.TRUNK || t === T.REEDS) && lawnBase))) {
      const sh = shadowState(x, y), p = sh ? pick(cat.shadow[sh], 0) : null; if (p) L.push(Object.assign(cellLayer(p, 0, 0), { tone: lawnTone }));
    }
    const ground = L.length;
    // by tile code
    if (t === T.TALL) for (let k = 0; k < 2; k++) { const p = pick(cat.decal.tall, hash(seed, 'td', key, x, y, k));
      if (p) { const l = atLayer(p, hash(seed, 'tx', key, x, y, k) % (49 - Math.min(p.w, 48)), hash(seed, 'ty', key, x, y, k) % (49 - Math.min(p.h, 48))); if (l) L.push(Object.assign(l, { tone: lawnTone })); } }
    else if (t === T.FLOWERS) { const p = pick(cat.prop.flowers, hash(seed, 'pf', key, x, y)); if (p) { const l = atLayer(p, (TS48 - p.w) >> 1, TS48 - p.h); if (l) L.push(l); } }
    else if (t === T.ROCK) { const p = pick(cat.prop.boulder.filter(q => q.w <= TS48 && q.h <= TS48), hash(seed, 'pb', key, x, y)); if (p) { const l = atLayer(p, (TS48 - p.w) >> 1, TS48 - p.h); if (l) L.push(l); } }
    else if (t === T.REEDS) { const p = pick(cat.prop.reeds, hash(seed, 'pr', key, x, y)), on = !rules.reedStagger || (hash(seed, 'rk', key, x, y) & 1), off = rules.reedStagger ? (hash(seed, 'rx', key, x, y) % 17) - 8 : 0;
      if (p && on) sprites.push({ id: p.name, tx: x, ty: y, x: x * TS48 + (TS48 >> 1) - (p.w >> 1) + off, y: y * TS48 + TS48 - p.h, sortY: y * TS48 + 2 }); }
    else if (t === T.TRUNK) L.push({ stand: 'trunk', dx: 8, dy: 16 });
    else if (mac) L.push(mac);
    else if (WETT(t)) {
      let wm = 0; [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].forEach(([dx, dy], b) => { const n = at(x + dx, y + dy); if (n !== -1 && !WETT(n)) wm |= 1 << b; });
      const sandBank = rules.waterSand && [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => sandG(x + dx, y + dy));   // an orthogonal neighbour of sand ground: the quarters with a sand margin
      const deepP = t === T.DEEP ? pick(cat.deep, hash(seed, 'dp', key, x, y)) : null;
      for (const q of QUADS) { const st = shoreState(wm, q);
        if (deepP && st === 'fill') L.push(quarterLayer(deepP, q, QE[q] * Q, QS[q] * Q, waterTone));
        else { const p = (sandBank ? (cat.waterSand[q][st] || [])[frame] : null) || (cat.water[q][st] || [])[frame]; if (p) L.push(quarterLayer(p, q, 0, 0, waterTone)); } }
      if (t === T.STEP) L.push({ stand: 'step', dx: 8, dy: 16 });
    }
    else if (t === T.CLIFF && !terr && rules.g1Runs) {   // generator 1's band: its runs' slices on the top and foot rows, rock between
      const r = g1.get(i);
      if (r) { const l = cellLayer(r.piece, r.j, r.sy); if (l) L.push(l); }
      else { const p = pick(cat.material.rock, hash(seed, 'g1r', key, x, y)); if (p) L.push(cellLayer(p, 0, 0));
        for (const [dx, sd] of [[1, 'e'], [-1, 'w']]) if (onP(x + dx, y) && !isCliff(x + dx, y)) { const sp = pick(cat.side[sd].mid, hash(seed, 'sv', key + '|g1', x, y)); if (sp) { const l = cellLayer(sp.offset ? sp : Object.assign({}, sp, { offset: sd === 'e' ? [0, 0] : [TS48 - sp.w, 0] }), 0, 0); if (l) L.push(l); } } }
    }
    else if (t === T.CLIFF && !terr) {   // (before runs) the band's top and foot from face.w1, its middle rock
      const top = at(x, y - 1) !== T.CLIFF && at(x, y - 1) !== -1, foot = at(x, y + 1) !== T.CLIFF && at(x, y + 1) !== -1;
      if (top || foot) { const p = pick(cat.face.w1, hash(seed, 'g1c', key, x)); if (p) { const l = cellLayer(p, 0, top ? 0 : 1); if (l) L.push(l); } }
      else { const p = pick(cat.material.rock, hash(seed, 'g1r', key, x, y)); if (p) L.push(cellLayer(p, 0, 0)); }
    }
    // by terrain kind (generator 2)
    if (kind === TERR.LIP) for (const q of QUADS) {
      const zero = at(x + (QE[q] ? 1 : -1), y) === T.FACE, p = pick(cat.lip[q][lipState(m, q, zero)], 0); if (p) L.push(quarterLayer(p, q, 0, 0, lipTone)); }
    else if (kind === TERR.FACE) { const c = faceAt.get(x); if (c) { const l = cellLayer(c.piece, c.j, y); if (l) L.push(Object.assign(l, { tone: faceTone })); } }
    else if (kind === TERR.SIDE) {
      const s = m & 1 ? 'e' : 'w', SD = cat.side[s], dflt = p => p.offset ? p : Object.assign({}, p, { offset: s === 'e' ? [0, 0] : [TS48 - p.w, 0] });
      const tail = m & 16 ? pick(first(SD.tail, SD.mid), 0) : null;
      if (tail) { const l = cellLayer(dflt(tail), 0, y); if (l) L.push(l); }
      else {
        let k = SD.mid.length ? hash(seed, 'sv', key, y) % SD.mid.length : -1;
        if (k >= 0 && SD.mid.length > 1 && sideMid[s][y - 1] === k) k = (k + 1) % SD.mid.length;
        if (k >= 0) { sideMid[s][y] = k; const l = cellLayer(dflt(SD.mid[k]), 0, 0); if (l) L.push(l); }
        if (m & 2) { const p = pick(SD.top, 0); if (p) { const l = cellLayer(dflt(p), 0, 0); if (l) L.push(l); } }
        if ((m & 4) && !(m & 8)) { const p = pick(SD.foot, 0); if (p) { const l = cellLayer(p.offset ? p : Object.assign({}, dflt(p), { offset: [dflt(p).offset[0], 24] }), 0, 0); if (l) L.push(l); } }
      }
    }
    else if (kind === TERR.SHADOW) { const p = pick(cat.lip.shadowN, 0); if (p) L.push(cellLayer(p, 0, 0)); }
    else if (kind === TERR.STAIR) {
      const ps = m & 3, f = (m >> 4) & 3;
      const p = f === 0 ? pick(cat.stair.S, hash(seed, 'st', key, x - (ps & 1))) : pick(cat.stair[['S', 'N', 'E', 'W'][f]], 0);
      if (p) { const l = cellLayer(p, ps & 1, ps >> 1); if (l) L.push(l); }
    }
    else if (kind === TERR.LANDING || kind === TERR.FOOT || kind === TERR.APRON_TOP) {
      const list = { [TERR.LANDING]: cat.landing, [TERR.FOOT]: cat.foot2, [TERR.APRON_TOP]: cat.apronTop }[kind][m & 1];
      const side = y >= 3 && y <= PH - 4, p = side ? null : pick(list, 0), sand = pick(cat.sand, hash(seed, 'sd', key, x, y));
      if (p) { const l = cellLayer(p, 0, 0); if (l) L.push(l); } else if (sand) { L.length = 0; tile.dark = 0; L.push(cellLayer(sand, 0, 0)); }
    }
    tile.needStand = T_BLOCK[t] === 1 && t !== T.WATER && t !== T.DEEP && t !== T.ISLE && L.length <= ground;
  }
  // a blocking tile never draws as lawn: the rock stand-in, generator 1's cliff rule over its blocking neighbours
  const blocks = (x, y) => { const t = at(x, y); return t !== -1 && T_BLOCK[t] === 1; };
  for (let i = 0; i < N; i++) { const tile = tiles[i]; if (!tile.needStand) { delete tile.needStand; continue; } delete tile.needStand;
    const x = i % PW, y = (i / PW) | 0;
    if (!cat.face.w1.length || !cat.material.rock.length) return { ok: false };
    if (!blocks(x, y - 1)) tile.layers.push(cellLayer(pick(cat.face.w1, hash(seed, 'sr', key, x)), 0, 0));
    else if (!blocks(x, y + 1)) tile.layers.push(cellLayer(pick(cat.face.w1, hash(seed, 'sr', key, x)), 0, 1));
    else tile.layers.push(cellLayer(pick(cat.material.rock, hash(seed, 'sr2', key, x, y)), 0, 0));
  }
  return { ok: true, tiles, sprites };
}
// How many core entries a palette's place tables override, per field (storm against the core's dark): what atlas-check prints.
export function overrideCounts(table, coreTables) {
  const o = {}; for (const f of PLACE_OVERRIDES) { const core = f === 'storm' ? coreTables.dark : coreTables[f], t = table[PLACE_KEY[f]]; let c = 0;
    for (let k = 0; k < core.length; k++) if (t[k] !== core[k]) c++; o[f] = c; }
  return o;
}
