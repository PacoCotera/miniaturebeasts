// The ground pass and the light and veil pass (place design A4.1 passes 1 and 2), and the composition of a whole view.
// Pure over indexed buffers (index 0 = transparent), so the node goldens, the sandbox and the firmware run the same logic.
// A `win` is { x, y, w, h }: the place pixels, at the drawn size (48 or 24), that a buffer covers.
import { blitTile } from './blit.mjs';
import { sixteenOf } from './sixteen.mjs';
import { blitPlaced, propItems, sortItems, drawItems, canopyPass, walkFrame } from './sprites.mjs';
import { duskTable, duskLitRgb } from '../../exploration/src/dusk.mjs';
import { BAYER4 } from '../../exploration/src/render/view.mjs';
import { NB9, eighthGrid, coverE, stormStep, stormBandHit, fogBandHit, fogVeilKeep, FOG_BAND_PX } from '../../exploration/src/render/edge.mjs';

// Light levels per cell, as the page numbers them (REMAP_PLACE): 0 clear, 1 storm, 2 dark2, 3 fog, 4 fade, 5 night (the clock's night: the page gives the set its nightMap; none given, it is dark2), 6 dark (the clock's dusk, the one-step table).
export const LEVELS = [null, 'storm', 'dark2', 'fog', 'fade', 'night', 'dusk'];

// The dusk tables (level 6) come from the one shared source, exploration/src/dusk.mjs (the page's buildDusk reads it too): the lean (10%), the lit step (20%) and the palette rule are stated there.
// duskOf: the unseen land's table over the set's palette, each colour snapped to the nearest colour of the set (rgb[i] = [r, g, b] of palette index i: core 1..47, then the set's, or undefined).
export function duskOf(rgb, dark) {
  const have = []; for (let i = 1; i < rgb.length; i++) if (rgb[i]) have.push(i);
  const near = (c) => { let best = 0, bd = Infinity; for (const i of have) { const d = 3 * (rgb[i][0] - c[0]) ** 2 + 4 * (rgb[i][1] - c[1]) ** 2 + 2 * (rgb[i][2] - c[2]) ** 2; if (d < bd) { bd = d; best = i; } } return best; };
  const amber = near([255, 168, 63]), w = rgb[dark[amber]] || rgb[amber], out = Uint8Array.from(duskTable(256, dark, (i) => rgb[i], w, (i, c) => near(c)));
  out[0] = 0;
  return out;
}

// The seen land at dusk: one colour-to-colour map, no nearest-match: each source colour i goes to its own new colour (duskLitRgb), so the same colour is the same on every tile and two greens stay two greens.
// `extra` receives { index, rgb } for each new colour (the page adds them to its colour table). Out of free indices: that colour keeps the dusk table's colour.
export function duskLitOf(rgb, dusk, dark, extra = []) {
  const out = new Uint8Array(256); let next = 1; for (let i = 1; i < rgb.length; i++) if (rgb[i]) next = i + 1;
  const amber = rgb[dark[[...rgb.keys()].filter((i) => rgb[i]).reduce((b, i) => (Math.abs(rgb[i][0] - 255) + Math.abs(rgb[i][1] - 168) + Math.abs(rgb[i][2] - 63) < Math.abs(rgb[b][0] - 255) + Math.abs(rgb[b][1] - 168) + Math.abs(rgb[b][2] - 63) ? i : b), 1)]];
  for (let i = 1; i < 256; i++) {
    const a = rgb[i], b = rgb[dark[i]];
    if (!a || !b || next > 255) { out[i] = dusk[i]; continue; }
    out[i] = next; extra.push({ index: next, rgb: duskLitRgb(a, amber) }); next++;
  }
  return out;
}

const tableCache = new WeakMap();
// The tile set's light tables by name: { dark, light, dark2, fog, fade, storm, veil, night } -> Uint8Array(256).
export function tablesOf(ts) {
  let t = tableCache.get(ts);
  if (!t || t.nm !== ts.nightMap) {
    t = Object.fromEntries(ts.lightTables.map((r) => [r.name, Uint8Array.from(r.map)]));
    if (!t.night) t.night = ts.nightMap ? Uint8Array.from(ts.nightMap) : t.dark2;
    Object.defineProperty(t, 'nm', { value: ts.nightMap, enumerable: false });
    tableCache.set(ts, t);
  }
  t.dusk = ts.duskMap || t.dark;   // set by the view from the page's colours (BakedView); until then the one-step dark
  t.duskLit = ts.duskLitMap || t.dusk;
  return t;
}

// The tile at `clockMs`: animated tiles all take their frame from the one clock, so water moves together.
export function tileSlot(ts, id, clockMs = 0) {
  const t = ts.tiles[id], n = t.frames.length;
  return n === 1 ? t.frames[0] : t.frames[Math.floor(clockMs / t.frameMs) % n];
}

// Pass 1: the dual-grid layers, then the decals, into a fresh buffer covering win. Tile (i, j) of a layer sits at (i*size - size/2, j*size - size/2).
export function renderGround(ts, place, size, win, clockMs = 0, decals = true) {
  const buf = new Uint8Array(win.w * win.h), half = size >> 1, w1 = place.w + 1;
  const atlas = size === 48 ? ts.atlas48 : size === 24 ? ts.atlas24 : sixteenOf(ts).atlas16;
  const i0 = Math.max(0, Math.floor((win.x + half) / size)), i1 = Math.min(place.w, Math.floor((win.x + win.w - 1 + half) / size));
  const j0 = Math.max(0, Math.floor((win.y + half) / size)), j1 = Math.min(place.h, Math.floor((win.y + win.h - 1 + half) / size));
  for (const layer of place.ground) {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const id = layer.tiles[j * w1 + i];
      if (id === 0xFFFF) continue;
      blitTile(buf, win.w, win.h, i * size - half - win.x, j * size - half - win.y, atlas, tileSlot(ts, id, clockMs), size);
    }
  }
  if (decals) addDecals(buf, ts, place, size, win, clockMs);
  return buf;
}
// The place's decals over a ground buffer covering win. A ground made elsewhere without them (the page's worker: the page keeps only the decals its finds leave) takes them here.
export function addDecals(buf, ts, place, size, win, clockMs = 0) {
  for (const d of place.decals) { blitPlaced(buf, win, ts, size, d.kind, d.x, d.y, walkFrame(ts.sprites[d.kind], clockMs)); }
  return buf;
}

// ---- pass 2: light and veil on 12 px blocks (eighths of a tile; 6 px at 24) ----
// state = lightState(place, { veil, fog, level }):  veil[cell] 1 = hidden by the survey veil; fog[cell] 1 = beyond sight in a fog bank;
// level[cell] = 0..4 the cell's clear light (storm under overcast, fade, ...). Any of the three may be null.
export function lightState(place, { veil = null, fog = null, level = null } = {}) {
  return { w: place.w, h: place.h, veil, fog, level, eg: {} };
}
function gridOf(state, which) {
  if (!state[which]) return null;
  return state.eg[which] || (state.eg[which] = eighthGrid(state[which], state.w, state.h)); // opened by a disc of 2 tiles, cut-only; kept while the bits stand
}
// The far state of an eighth (bit 8) and its 8 neighbours (bits 0-7, NB9's order). Past the place's edge an eighth reads as the nearest edge
// eighth (clamp, as the dual grid does), so a veiled or fogged edge stays whole to the border instead of dithering into clear.
function m9(grid, EW, EH, ex, ey) {
  let m = grid[ey * EW + ex] ? 256 : 0;
  for (let b = 0; b < 8; b++) {
    const x = Math.min(EW - 1, Math.max(0, ex + NB9[b][0])), y = Math.min(EH - 1, Math.max(0, ey + NB9[b][1]));
    if (grid[y * EW + x]) m |= 1 << b;
  }
  return m;
}

// The veil's pixel: the dither dots (night) and the dark table, as the page draws it (veilPx).
const veilPx = (c, x, y, dark, night) => (BAYER4[(y & 3) * 4 + (x & 3)] < 4 ? night : dark[c]);

// Applies the light in place to a ground buffer covering win. opts.nightIndex: the core palette's night colour (2).
// Per pixel: beyond fog sight -> the fog table; else the cell's clear light; the 6 px storm step beside a storm column; the veil's dots where veiled.
export function applyLight(buf, win, size, ts, state, opts = {}) {
  const fe = state.fogEdge || null, gV = gridOf(state, 'veil'), gF = fe ? null : gridOf(state, 'fog'), lvl = state.level;   // fe: the fog sight's soft edge (state.fogEdge = { cx, cy, r, seed }), drawn per pixel instead of the fog grid
  if (!gV && !gF && !fe && !lvl && !state.storm) return buf;
  const T = tablesOf(ts), night = opts.nightIndex ?? 2, eb = size >> 2, pw = state.w, EW = 4 * state.w, EH = 4 * state.h;
  const ebx0 = Math.floor(win.x / eb), ebx1 = Math.floor((win.x + win.w - 1) / eb), eby0 = Math.floor(win.y / eb), eby1 = Math.floor((win.y + win.h - 1) / eb);
  for (let ey = Math.max(0, eby0); ey <= Math.min(EH - 1, eby1); ey++) for (let ex = Math.max(0, ebx0); ex <= Math.min(EW - 1, ebx1); ex++) {
    const cx = ex >> 2, cy = ey >> 2, L = lvl ? lvl[cy * pw + cx] : 0;
    const mV = gV ? m9(gV, EW, EH, ex, ey) : 0, mF = gF ? m9(gF, EW, EH, ex, ey) : 0;
    let side = null;
    if (lvl && L === 0) side = cx > 0 && lvl[cy * pw + cx - 1] === 1 ? 'W' : cx < pw - 1 && lvl[cy * pw + cx + 1] === 1 ? 'E' : null;
    // the approaching storm's soft edge (state.storm = { darkW, left, seed, level }): per pixel, screen-side distance, world-anchored dither
    const bx0 = Math.max(ex * eb, win.x) - win.x, bx1 = Math.min(ex * eb + eb, win.x + win.w) - win.x;
    const sb = state.storm && (state.storm.left ? bx0 < state.storm.darkW + 97 : bx1 > win.w - state.storm.darkW - 97) ? state.storm : null;
    // the fog edge's block class: 0 all clear, 1 all fog, 2 mixed (per pixel); the wobble keeps the band's start within r .. r + 48
    let fc = 0;
    if (fe) { const bcx = ex * eb + eb / 2 - fe.cx, bcy = ey * eb + eb / 2 - fe.cy, dc = Math.hypot(bcx, bcy), hb = eb * 0.71; fc = dc + hb < fe.r ? 0 : dc - hb > fe.r + 48 + FOG_BAND_PX ? 1 : 2; }
    if (!L && !mV && !mF && !side && !sb && !fc) continue;
    const tL = L ? T[LEVELS[L]] : null, tS = sb ? T[LEVELS[sb.level]] : null;
    const cV = mV && mV !== 511 ? coverE(mV) : null, cF = mF && mF !== 511 ? coverE(mF) : null;
    const px0 = Math.max(ex * eb, win.x), px1 = Math.min(ex * eb + eb, win.x + win.w), py0 = Math.max(ey * eb, win.y), py1 = Math.min(ey * eb + eb, win.y + win.h);
    for (let py = py0; py < py1; py++) for (let px = px0; px < px1; px++) {
      const o = (py - win.y) * win.w + (px - win.x), c = buf[o];
      if (c === 0) continue;
      const k = (((py - ey * eb) * 12 / eb) | 0) * 12 + (((px - ex * eb) * 12 / eb) | 0);
      if (mF === 511 || (cF && cF[k]) || fc === 1 || (fc === 2 && fogBandHit(px, py, fe))) { buf[o] = T.fog[c]; continue; }
      let base = L === 6 ? T.duskLit[c] : tL ? tL[c] : c;
      if (side) {
        const lx = (px - cx * size) * (48 / size);
        if (stormStep(side === 'W' ? lx : 47 - lx, px, py)) base = T.storm[c];
      }
      if (sb) { const sx = px - win.x; if (stormBandHit(sb.left ? sx : win.w - 1 - sx, py, px, sb.darkW, sb.seed)) base = tS[c]; }
      // in the fog band the veil thins out with the clear ground (a second Bayer test at the band's share), gone where the fog takes over
      // dusk (6): the veil is a flat tone shift, no dither dots over the land and sea (dusk-mesh-fix-1)
      buf[o] = (mV === 511 || (cV && cV[k])) && (fc !== 2 || fogVeilKeep(px, py, fe)) ? (L === 6 ? T.dark[T.dusk[c]] : veilPx(base, px, py, T.dark, night)) : base;
    }
  }
  return buf;
}

// The remap a sprite takes from the cell under its anchor (null = none): fog beyond sight, else the cell's clear light.
export function remapAtFor(ts, state) {
  if (!state) return null;
  const T = tablesOf(ts);
  return (cx, cy) => {
    const i = cy * state.w + cx;
    if (state.fog && state.fog[i]) return T.fog;
    const L = state.level ? state.level[i] : 0;
    return L ? T[LEVELS[L]] : null;
  };
}

// The ground cache: pass 1 is redone only when the camera crosses a pixel or an animated tile changes frame.
export class GroundCache {
  constructor(ts, place, size) { this.ts = ts; this.place = place; this.size = size; this.key = null; this.buf = null; }
  frameKey(clockMs) {
    // one number for every animated tile's current frame: the shared clock, reduced to the steps that matter
    let k = 0;
    for (const t of this.ts.tiles) if (t.frames.length > 1) k = k * 31 + (Math.floor(clockMs / t.frameMs) % t.frames.length) + 1;
    return k;
  }
  // A ground rendered elsewhere (the page's worker, without the decals) for the whole window at this clock: the place's decals go over it here, and get() then finds it made.
  preset(win, clockMs, buf) { addDecals(buf, this.ts, this.place, this.size, win, clockMs); this.key = `${win.x},${win.y},${win.w},${win.h}|${this.frameKey(clockMs)}`; this.buf = buf; }
  get(win, clockMs = 0) {
    const key = `${win.x},${win.y},${win.w},${win.h}|${this.frameKey(clockMs)}`;
    if (key !== this.key) { this.buf = renderGround(this.ts, this.place, this.size, win, clockMs); this.key = key; this.redone = (this.redone || 0) + 1; }
    return this.buf;
  }
}

// The survey veil hides what stands on a veiled cell until a Call lifts it; the landmarks always show.
export function veilVisible(place, state) {
  if (!state || !state.veil) return undefined;
  const marks = new Set(place.landmarks.map((l) => l.y * place.w + l.x));
  return (cx, cy) => !state.veil[cy * place.w + cx] || marks.has(cy * place.w + cx);
}

// The web host's ground cache: the whole place (864 x 1056 at 48 px, under a megabyte) rendered once per animation frame, a camera window
// cut from it by row copies. The device keeps the window-sized GroundCache above (its PSRAM budget has no room for the whole place twice).
// ring (optional): a FrameRing shared by the caches of one page. With it the renders of the animation frames a cache has seen are kept (a place's water cycles through four), so a
// flip back to one costs a row copy and not a render; the ring holds at most `max` renders across all its caches, the oldest dropped first. Without it, one render is kept (the device).
export class FrameRing {
  constructor(max = 16) { this.max = max; this.list = []; }
  touch(cache, key) {
    const i = this.list.findIndex((e) => e.cache === cache && e.key === key); if (i >= 0) this.list.splice(i, 1);
    this.list.push({ cache, key });
    while (this.list.length > this.max) { const o = this.list.shift(); o.cache.frames.delete(o.key); }
  }
}
export class PlaceGroundCache {
  constructor(ts, place, size, ring = null) { this.helper = new GroundCache(ts, place, size); this.ts = ts; this.place = place; this.size = size; this.key = null; this.full = null; this.redone = 0; this.ring = ring; this.frames = new Map(); }
  frameKey(clockMs) { return this.helper.frameKey(clockMs); }
  // The clocks (ms) that show each animation frame the ground has, one per frame: what the page renders ahead so no flip costs a render.
  frameClocks() {
    if (this.clocks) return this.clocks;
    const ms = this.ts.tiles.filter((t) => t.frames.length > 1).map((t) => t.frameMs), step = ms.length ? Math.min(...ms) : 1, seen = new Set(), out = [];
    for (let k = 0; k < 64; k++) { const key = this.frameKey(k * step); if (seen.has(key)) break; seen.add(key); out.push(k * step); }
    return (this.clocks = out);
  }
  // A frame of the whole ground rendered elsewhere (the page's worker, without the decals): the decals go over it here, and the frame is kept as one the cache made.
  preset(clockMs, buf) {
    const key = this.frameKey(clockMs); if (this.frames.has(key) || key === this.key) return;
    addDecals(buf, this.ts, this.place, this.size, { x: 0, y: 0, w: this.place.w * this.size, h: this.place.h * this.size }, clockMs);
    if (this.ring) { this.frames.set(key, buf); this.ring.touch(this, key); } else { this.full = buf; this.key = key; }
  }
  get(win, clockMs = 0) {
    const key = this.frameKey(clockMs), W = this.place.w * this.size, H = this.place.h * this.size;
    if (key !== this.key) {
      const kept = this.ring && this.frames.get(key);
      if (kept) this.full = kept; else { this.full = renderGround(this.ts, this.place, this.size, { x: 0, y: 0, w: W, h: H }, clockMs); this.redone++; }
      this.key = key; if (this.ring) { this.frames.set(key, this.full); this.ring.touch(this, key); }
    } else if (this.ring) this.ring.touch(this, key);
    const out = new Uint8Array(win.w * win.h);
    for (let y = 0; y < win.h; y++) {
      const sy = win.y + y;
      if (sy < 0 || sy >= H) continue;
      const x0 = Math.max(0, win.x), x1 = Math.min(W, win.x + win.w);
      if (x0 < x1) out.set(this.full.subarray(sy * W + x0, sy * W + x1), y * win.w + (x0 - win.x));
    }
    return out;
  }
}

// One whole view as an indexed buffer: the ground (a fresh copy of the cache's, so the light can be applied), the light, the sorted sprites
// (props and `actors`: [{ sortY, x, draw(buf, win) }]), then the canopy with the cut-out around `pawns`.
//   o: { clockMs, light (lightState), nightIndex, visible(cx, cy), actors, pawns, cache (GroundCache) }
export function renderView(ts, place, size, win, o = {}) {
  const it = renderViewSteps(ts, place, size, win, o);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}
// The same view in four steps (ground, light, sprites, canopy), a yield between each, so a page can spend its idle time on one step at a time. Returns the buffer.
export function* renderViewSteps(ts, place, size, win, o = {}) {
  const clockMs = o.clockMs || 0;
  const buf = o.cache ? Uint8Array.from(o.cache.get(win, clockMs)) : renderGround(ts, place, size, win, clockMs);
  yield;
  if (o.light) applyLight(buf, win, size, ts, o.light, o);
  const remapAt = remapAtFor(ts, o.light);
  const visible = o.visible || veilVisible(place, o.light);
  yield;
  drawItems(buf, win, sortItems([...propItems(ts, place, size, { remapAt, visible, clockMs }), ...(o.actors || [])]));
  yield;
  canopyPass(buf, win, ts, place, size, { pawns: o.pawns, remapAt, visible, clockMs });
  return buf;
}

// The whole place (the reveal, the arrival look, Look over the place, the peek), no camera. A place larger than 18 x 22 is drawn at 16 px (the kit's own
// pixel, exact thirds of 48: a 24 x 28 place is 384 x 448 and fits the 450 x 532 view); today's 18 x 22 places stay at 24 px (432 x 528).
export const HALF_W = 432, HALF_H = 528;
export const wholeScale = (place) => (place.w > 18 || place.h > 22 ? 16 : 24);
export function renderHalfView(ts, place, o = {}) {
  const s = o.size || wholeScale(place);
  return renderView(ts, place, s, { x: 0, y: 0, w: place.w * s, h: place.h * s }, o);
}

// Palette cycling at the palette stage: rotates each cycle's range of RGB entries by the steps of the clock. rgb: array of 256 [r, g, b];
// returns a new array (the input is untouched).
export function applyCycles(rgb, cycles, clockMs) {
  const out = rgb.slice();
  for (const { first, count, stepMs } of cycles) {
    if (count < 2 || !stepMs) continue;
    const s = Math.floor(clockMs / stepMs) % count;
    for (let k = 0; k < count; k++) out[first + k] = rgb[first + ((k + s) % count)];
  }
  return out;
}
