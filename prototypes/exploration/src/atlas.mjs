// The Companion's 48 px places, from the art director's meadow set. Pure and integer only:
// no page state, DOM, storage, clock, randomness, drawing or float. It reads names from the catalogue, never from file names, so
// meadow.json can rename a piece without a code change. C2a M1 holds what tools/atlas-check.mjs shares with the page: the exact
// colour decode (§4.5), the catalogue (§4.2) and the core set; the per-tile layers (§4.3) come in M3.

export const QUADS = ['nw', 'ne', 'se', 'sw'];
export const SHORE_STATES = ['fill', 'edgeh', 'edgev', 'outer', 'inner'];
export const LIP_STATES = ['fill', 'edgeh', 'edgev', 'edgev0', 'outer', 'outer0', 'inner'];

// §4.5: alpha 0 decodes to -1; alpha 255 with an RGB exactly in the table decodes to its index; anything else adds to bad.
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

// §4.2: the pieces grouped by their manifest fields; each list sorted by variant, then name (water by frame). A piece no key takes
// (the wall foot strips, the shore macros, lobes, beaches and bends: catalogued but unused in v1) is listed in `other`.
export function catalogue(pieces) {
  const water = {}, lip = { shadowN: [] };
  for (const q of QUADS) { water[q] = {}; for (const s of SHORE_STATES) water[q][s] = []; lip[q] = {}; for (const s of LIP_STATES) lip[q][s] = []; }
  const sideOf = () => ({ mid: [], top: [], foot: [], tail: [] });
  const cat = {
    lawn: [], sand: [], deep: [], material: { rock: [] }, decal: { tall: [], flowers: [] }, water, lip,
    face: { w3: [], w2: [], w1: [] }, cap: { w: [], e: [] }, cornerIn: { w: [], e: [] }, side: { e: sideOf(), w: sideOf() },
    stair: { S: [], N: [], E: [], W: [] }, landing: two(), foot2: two(), apronTop: two(),
    prop: { boulder: [], reeds: [], flowers: [] }, other: [],
  };
  const put = (list, p) => { if (list) { list.push(p); return true; } return false; };
  const part = p => (p.part === 0 || p.part === 1 ? p.part : -1);
  for (const p of pieces) {
    let ok = false;
    switch (p.kind) {
      case 'ground': ok = p.set === 'lawn' || p.set === 'sand' || p.set === 'deep' ? put(cat[p.set], p) : false; break;
      case 'material': ok = p.set === 'rock' && put(cat.material.rock, p); break;
      case 'decal': ok = (p.set === 'tall' || p.set === 'flowers') && put(cat.decal[p.set], p); break;
      case 'shore': ok = p.set === 'water' && QUADS.includes(p.quad) && SHORE_STATES.includes(p.state) && (p.frame === 1 || p.frame === 2) && put(water[p.quad][p.state], p); break;
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
  for (const q of QUADS) for (const s of SHORE_STATES) water[q][s].sort((a, b) => a.frame - b.frame || byKey(a.name, b.name));
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

// The biome palette: one index space, 0–47 the core (unchanged) and 48 … N − 1 the biome's entries, each with the five lookup
// tables the page draws through (dark, light, dark2, fog, fade; dark2 must be dark[dark[i]]). coreRGB and coreTables are the page's own 48. Returns the table's
// rgb and tables (arrays of length N), or { errors }.
export const PALETTE_MAX = 256;
export const TABLE_FIELDS = ['dark', 'light', 'dark2', 'fog', 'fade'];
export function paletteTable(coreRGB, coreTables, file) {
  const entries = file && Array.isArray(file.entries) ? file.entries : null;
  if (!entries) return { errors: ['no entries'] };
  const n = entries.length, errors = [], core = coreRGB.length;
  if (n > PALETTE_MAX) errors.push(n + ' entries (at most ' + PALETTE_MAX + ')');
  if (n < core) errors.push(n + ' entries: the core ' + core + ' are not all there');
  const rgb = [], seen = new Map(), out = { rgb };
  for (const f of TABLE_FIELDS) out[f] = [];
  for (let k = 0; k < n; k++) {
    const e = entries[k] || {};
    if (e.i !== k) errors.push('entry ' + k + ': i is ' + JSON.stringify(e.i) + ' (a gap or out of order)');
    const hex = typeof e.hex === 'string' ? e.hex.toLowerCase() : '';
    if (!/^#[0-9a-f]{6}$/.test(hex)) { errors.push('entry ' + k + ': hex ' + JSON.stringify(e.hex)); rgb.push([0, 0, 0]); }
    else {
      if (seen.has(hex)) errors.push('entry ' + k + ': hex ' + hex + ' repeats entry ' + seen.get(hex)); else seen.set(hex, k);
      rgb.push([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
    }
    for (const f of TABLE_FIELDS) {
      const v = e[f]; out[f].push(v);
      if (!Number.isInteger(v) || v < 0 || v >= n) errors.push('entry ' + k + ': ' + f + ' ' + JSON.stringify(v) + ' outside 0 … ' + (n - 1));
    }
    if (k < core) {
      const c = coreRGB[k], r = rgb[k];
      if (r[0] !== c[0] || r[1] !== c[1] || r[2] !== c[2]) errors.push('entry ' + k + ': hex ' + hex + ' differs from the core colour');
      for (const f of TABLE_FIELDS) if (e[f] !== coreTables[f][k]) errors.push('entry ' + k + ': ' + f + ' ' + JSON.stringify(e[f]) + ' differs from the core table (' + coreTables[f][k] + ')');
    }
  }
  for (let k = 0; k < n; k++) {   // dark2 is the dark of the dark, as the page builds its own DARK2
    const d = out.dark[k], dd = Number.isInteger(d) && d >= 0 && d < n ? out.dark[d] : undefined;
    if (dd !== undefined && out.dark2[k] !== dd) errors.push('entry ' + k + ': dark2 ' + JSON.stringify(out.dark2[k]) + ' is not dark[dark[' + k + ']] (' + dd + ')');
  }
  return errors.length ? { errors } : out;
}
