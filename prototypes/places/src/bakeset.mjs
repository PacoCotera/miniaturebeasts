// A loaded tile set (set.json and its PNGs) -> the TileSet object that format/write.mjs turns into a .mbtiles blob (place design A1.5).
// Also the 24 px derivation: each 48 px tile reduced by 2 x 2 blocks, keeping the most frequent palette index in each block, ties to the darker
// colour (so outlines survive); a block of sprite pixels is transparent unless at least half of its pixels are opaque.
import { createHash } from 'node:crypto';
import { crop } from './png.mjs';
import { paletteOf, indexImage } from './indexed.mjs';
import { fillTiles, layerTiles, kindFullTiles, layerRows, sheetTiles } from './setload.mjs';
import { encodeRle } from './blit.mjs';
import { FORMAT_VERSION } from './format/write.mjs';
import { TABLE_NAMES } from './lighttables.mjs';

const lumOf = (rgb) => 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];

// pixels: Uint8Array w*h of palette indices (0 transparent). Returns { data, w: ceil(w/2), h: ceil(h/2) }.
export function halve(pixels, w, h, pal) {
  const w2 = (w + 1) >> 1, h2 = (h + 1) >> 1;
  const data = new Uint8Array(w2 * h2);
  const lum = pal.rgb.map(lumOf);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const counts = new Map();
    let n = 0, opaque = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = x * 2 + dx, sy = y * 2 + dy;
      if (sx >= w || sy >= h) continue;
      n++;
      const v = pixels[sy * w + sx];
      if (v === 0) continue;
      opaque++;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    if (opaque * 2 < n) continue;
    let best = 0, bc = 0;
    for (const [v, c] of counts) {
      if (c > bc || (c === bc && (lum[v] < lum[best] || (lum[v] === lum[best] && v < best)))) { best = v; bc = c; }
    }
    data[y * w2 + x] = best;
  }
  return { data, w: w2, h: h2 };
}

const hex6 = (c) => (c[0] << 16) | (c[1] << 8) | c[2];

// terrains: art/places/terrain.json's list (to turn a pair's terrain ids into IntGrid values)
export function bakeTileSet(loaded, terrains) {
  const { set } = loaded;
  const pal = paletteOf(loaded.palette);
  const S = set.sourceTile * set.scale; // 48
  if (S !== 48) throw new Error(`tile size ${S} is not 48`);
  const valueOf = new Map(terrains.map((t) => [t.id, t.value]));

  // atlas: unique 48 px tiles by content
  const slotOf = new Map();
  const slots48 = [];
  const slotFor = (img48) => {
    const px = indexImage(img48, pal);
    const key = createHash('sha1').update(px).digest('hex');
    if (!slotOf.has(key)) { slotOf.set(key, slots48.length); slots48.push(px); }
    return slotOf.get(key);
  };
  const tileList = [], tileKey = new Map();
  const tileId = (frames, frameMs) => {
    const unique = frames.every((s) => s === frames[0]) ? [frames[0]] : frames;
    const key = unique.join(',') + '/' + (unique.length > 1 ? frameMs : 0);
    if (!tileKey.has(key)) { tileKey.set(key, tileList.length); tileList.push({ frames: unique, frameMs: unique.length > 1 ? frameMs : 0 }); }
    return tileKey.get(key);
  };

  // The rows of the tile set (setload.layerRows order): per terrain its fill row and one row per over kind, then the extras (cliff faces, scrub variants, way-up pieces), then the tone row.
  // A fill row holds the fill variants (animated when the fill has frames); an over row holds 16 tile ids by corner index with slot 0 empty (0xFFFF) and the all-upper variants when the terrain has a ground.
  const val = (id, where) => { if (!valueOf.has(id)) throw new Error(`${where}: terrain ${id} is not in terrain.json`); return valueOf.get(id); };
  const layers = set.layers || {}, EMPTY_TILE = 0xFFFF;
  const sixteen = (frames, frameMs) => Array.from({ length: 16 }, (_, k) => (k === 0 ? EMPTY_TILE : tileId(frames.map((f) => f[k]), frameMs)));
  const pairs = layerRows(set).map((r) => {
    const T = r.terrain === 'tone' ? val(set.tone.of, 'tone') : val(r.terrain, 'layers');
    const kind = r.kind === undefined ? null : layers[r.terrain].over.find((k) => k.kind === r.kind);
    if (r.type === 'fill') {
      const frames = r.sheets.map((_, f) => fillTiles(loaded, r.terrain, f, true).map(slotFor)), ms = layers[r.terrain].fill.frameMs || 0;
      return { lower: T, upper: T, mode: 'opaque', tiles: [], fullVariants: frames[0].map((_, v) => tileId(frames.map((f) => f[v]), ms)), emptyVariants: [] };
    }
    if (r.type === 'over') {
      const frames = r.sheets.map((_, f) => layerTiles(loaded, r.terrain, r.kind, f, true).map(slotFor));
      return { lower: 0, upper: T, mode: 'over', tiles: sixteen(frames, kind.frameMs || 0), fullVariants: kindFullTiles(loaded, r.terrain, r.kind, true).map((img) => tileId([slotFor(img)], 0)), emptyVariants: [] };
    }
    if (r.type === 'tone') {
      const frames = r.sheets.map((_, f) => layerTiles(loaded, 'tone', 0, f, true).map(slotFor));
      return { lower: 0, upper: T, mode: 'over', tiles: sixteen(frames, set.tone.frameMs || 0), fullVariants: [], emptyVariants: [] };
    }
    if (r.type === 'wayup') return { lower: 0, upper: T, mode: 'over', tiles: sheetTiles(loaded, r.sheets[0], true).map((img) => tileId([slotFor(img)], 0)), fullVariants: [], emptyVariants: [] };
    if (r.type === 'back') {   // one 16 px tile per listed slot, each its own file; every other slot of the row empty
      const frames = [Array.from({ length: 16 }, (_, k) => (r.slots[k] ? slotFor(sheetTiles(loaded, r.slots[k], true)[0]) : null))];
      return { lower: 0, upper: T, mode: 'over', tiles: Array.from({ length: 16 }, (_, k) => (frames[0][k] === null ? EMPTY_TILE : tileId([frames[0][k]], 0))), fullVariants: [], emptyVariants: [] };
    }
    // tall, variant: 16-slot sheets sharing the kind's edge lines
    const frames = r.sheets.map((sh) => sheetTiles(loaded, sh, true).map(slotFor));
    return { lower: 0, upper: T, mode: 'over', tiles: sixteen(frames, 0), fullVariants: [], emptyVariants: [] };
  });

  const atlas48 = new Uint8Array(slots48.length * S * S);
  const atlas24 = new Uint8Array(slots48.length * 24 * 24);
  slots48.forEach((px, s) => { atlas48.set(px, s * S * S); atlas24.set(halve(px, S, S, pal).data, s * 24 * 24); });

  // sprites: canopy pieces first so a prop can name its canopy by index, then props, then decals
  const sheet = loaded.png(set.spriteSheet);
  const order = [...Object.entries(set.canopy).map(([k, v]) => ['canopy', k, v]), ...Object.entries(set.props).map(([k, v]) => ['prop', k, v]), ...Object.entries(set.decals).map(([k, v]) => ['decal', k, v])];
  const canopyIndex = new Map(Object.keys(set.canopy).map((k, i) => [k, i]));
  const rle48 = [], rle24 = [];
  let off48 = 0, off24 = 0;
  const sprites = order.map(([group, kind, s]) => {
    const [x, y, w, h] = s.rect;
    const frames = s.frames || 1;
    const f48 = [], f24 = [];
    let w48 = 0, h48 = 0, w24 = 0, h24 = 0;
    for (let k = 0; k < frames; k++) {
      const big = crop(sheet, x + k * w, y, w, h);   // a sprite is drawn at 1x, one art pixel to one screen pixel (only the terrain tiles are scaled to 48)
      const px = indexImage(big, pal);
      const small = halve(px, big.w, big.h, pal);
      w48 = big.w; h48 = big.h; w24 = small.w; h24 = small.h;
      const r48 = encodeRle(px, w48, h48), r24 = encodeRle(small.data, w24, h24);
      f48.push(off48); f24.push(off24);
      rle48.push(r48); rle24.push(r24);
      off48 += r48.length; off24 += r24.length;
    }
    const ax = s.anchor[0], ay = s.anchor[1];
    return {
      kind, group, w48, h48, w24, h24, anchor48: [ax, ay], anchor24: [Math.round(ax / 2), Math.round(ay / 2)],
      footprint: (s.footprint || []).flat(), frames48: f48, frames24: f24, frameMs: s.frameMs || 0,
      canopy: s.canopy ? canopyIndex.get(s.canopy) : -1,
    };
  });
  const cat = (parts, n) => { const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

  return {
    id: set.id, formatVersion: FORMAT_VERSION, tile: 48, half: 24,
    palette: loaded.palette.colours.map((c) => hex6([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)])),
    lightTables: TABLE_NAMES.map((name) => ({ name, map: Uint8Array.from(loaded.palette.tables[name]) })),
    atlas48, atlas24, tiles: tileList, pairs, sprites,
    spriteAtlas48: cat(rle48, off48), spriteAtlas24: cat(rle24, off24), cycles: [],
    licence: { spdx: set.licence.spdx, author: set.licence.author, source: set.licence.source, fetched: set.licence.fetched },
  };
}
