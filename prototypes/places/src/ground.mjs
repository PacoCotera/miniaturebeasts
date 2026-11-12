// The ground pass and the light and veil pass (place design A4.1 passes 1 and 2), and the composition of a whole view.
// Pure over indexed buffers (index 0 = transparent), so the node goldens, the sandbox and the firmware run the same logic.
// A `win` is { x, y, w, h }: the place pixels, at the drawn size (48 or 24), that a buffer covers.
import { blitTile } from './blit.mjs';
import { sixteenOf } from './sixteen.mjs';
import { blitPlaced, propItems, sortItems, drawItems, canopyPass, walkFrame } from './sprites.mjs';
import { BAYER4, eighthGrid, coverE, stormStep } from '../../exploration/src/view.mjs';

// Light levels per cell, as the page numbers them (REMAP_PLACE): 0 clear, 1 storm, 2 dark2, 3 fog, 4 fade.
export const LEVELS = [null, 'storm', 'dark2', 'fog', 'fade'];
const NB9 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]; // N, NE, E, SE, S, SW, W, NW (view.mjs's order)

const tableCache = new WeakMap();
// The tile set's light tables by name: { dark, light, dark2, fog, fade, storm, veil } -> Uint8Array(256).
export function tablesOf(ts) {
  let t = tableCache.get(ts);
  if (!t) { t = Object.fromEntries(ts.lightTables.map((r) => [r.name, Uint8Array.from(r.map)])); tableCache.set(ts, t); }
  return t;
}

// The tile at `clockMs`: animated tiles all take their frame from the one clock, so water moves together.
export function tileSlot(ts, id, clockMs = 0) {
  const t = ts.tiles[id], n = t.frames.length;
  return n === 1 ? t.frames[0] : t.frames[Math.floor(clockMs / t.frameMs) % n];
}

// Pass 1: the dual-grid layers, then the decals, into a fresh buffer covering win. Tile (i, j) of a layer sits at (i*size - size/2, j*size - size/2).
export function renderGround(ts, place, size, win, clockMs = 0) {
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
  const gV = gridOf(state, 'veil'), gF = gridOf(state, 'fog'), lvl = state.level;
  if (!gV && !gF && !lvl) return buf;
  const T = tablesOf(ts), night = opts.nightIndex ?? 2, eb = size >> 2, pw = state.w, EW = 4 * state.w, EH = 4 * state.h;
  const ebx0 = Math.floor(win.x / eb), ebx1 = Math.floor((win.x + win.w - 1) / eb), eby0 = Math.floor(win.y / eb), eby1 = Math.floor((win.y + win.h - 1) / eb);
  for (let ey = Math.max(0, eby0); ey <= Math.min(EH - 1, eby1); ey++) for (let ex = Math.max(0, ebx0); ex <= Math.min(EW - 1, ebx1); ex++) {
    const cx = ex >> 2, cy = ey >> 2, L = lvl ? lvl[cy * pw + cx] : 0;
    const mV = gV ? m9(gV, EW, EH, ex, ey) : 0, mF = gF ? m9(gF, EW, EH, ex, ey) : 0;
    let side = null;
    if (lvl && L === 0) side = cx > 0 && lvl[cy * pw + cx - 1] === 1 ? 'W' : cx < pw - 1 && lvl[cy * pw + cx + 1] === 1 ? 'E' : null;
    if (!L && !mV && !mF && !side) continue;
    const tL = L ? T[LEVELS[L]] : null;
    const cV = mV && mV !== 511 ? coverE(mV) : null, cF = mF && mF !== 511 ? coverE(mF) : null;
    const px0 = Math.max(ex * eb, win.x), px1 = Math.min(ex * eb + eb, win.x + win.w), py0 = Math.max(ey * eb, win.y), py1 = Math.min(ey * eb + eb, win.y + win.h);
    for (let py = py0; py < py1; py++) for (let px = px0; px < px1; px++) {
      const o = (py - win.y) * win.w + (px - win.x), c = buf[o];
      if (c === 0) continue;
      const k = (((py - ey * eb) * 12 / eb) | 0) * 12 + (((px - ex * eb) * 12 / eb) | 0);
      if (mF === 511 || (cF && cF[k])) { buf[o] = T.fog[c]; continue; }
      let base = tL ? tL[c] : c;
      if (side) {
        const lx = (px - cx * size) * (48 / size);
        if (stormStep(side === 'W' ? lx : 47 - lx, px, py)) base = T.storm[c];
      }
      buf[o] = mV === 511 || (cV && cV[k]) ? veilPx(base, px, py, T.dark, night) : base;
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
