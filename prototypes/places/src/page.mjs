// The page's side of a baked place (place design A4.2, "the web host"): the indexed ground and light passes converted once per change to an
// ImageData through the page's palette, props and canopy as cached canvases (the page's usual sprite path), and the camera.
// The page owns the creatures, the partner, the explorer and the overlays; this module never draws them.
import { readPlace, readTileSet } from './format/read.mjs';
import { PlaceGroundCache, GroundCache, applyLight, lightState, tablesOf, LEVELS, renderHalfView, renderViewSteps, wholeScale } from './ground.mjs';
import { BAYER4 } from '../../exploration/src/view.mjs';
import { cutOut, scaleTo, walkFrame } from './sprites.mjs';
import { blitRle } from './blit.mjs';
import { stepCamera, newCam, TILE } from './camera.mjs';
import { applyHaze, layHaze } from './haze.mjs';
import { extendTables } from './lighttables.mjs';

export { FrameRing } from './ground.mjs';

// Fetches the place and its tile set from `base` (the folder holding baked/).
export async function loadBaked(fetchBytes, base, id) {
  const place = readPlace(await fetchBytes(`${base}baked/${id}.mbplace`));
  const ts = readTileSet(await fetchBytes(`${base}baked/${place.set}.mbtiles`));
  return { place, ts };
}

const same = (a, b) => { if (!a || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

// core: the page's core colours [[r, g, b]] for indices 0..47 (the set's own colours come from the tile set); night: the veil dots' colour index.
export class BakedView {
  constructor(ts, place, { core, night = 2, ox = 0, oy = 0, mkCanvas, ring = null, haze = null }) {   // ring: a FrameRing shared by the page's views (the ground's animation frames kept, across all of them, up to its bound); haze: the range haze kit
    Object.assign(this, { ts, place, ox, oy, night, mkCanvas });
    this.hazeKit = haze; this.hazeMaps = null; this.hazeLv = null; this.hazeId = '';
    this.size = 48;
    this.cache = new PlaceGroundCache(ts, place, 48, ring);
    this.half = new GroundCache(ts, place, wholeScale(place));   // the whole-place picture's ground (clock 0, no veil): made once for the place, whatever the veil, so each arrival look and Look pays only the light and the sprites
    this.lut = new Uint32Array(256);                 // ABGR, little-endian ImageData
    const rgb = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
    for (let i = 1; i < 48; i++) this.lut[i] = rgb(...core[i]);
    ts.palette.forEach((c, k) => { this.lut[48 + k] = rgb((c >> 16) & 255, (c >> 8) & 255, c & 255); });
    if (haze) {   // the haze's extra colours (the open-edges 7 its tables can answer with, then the 6 ramp colours) join the screen's palette, and the light tables learn them (shared, once per tile set)
      haze.extra.rgb.forEach((c, k) => { this.lut[haze.extra.first + k] = rgb(...c); });
      const T = tablesOf(ts);
      if (!T.__haze) { extendTables(T, core, ts.palette.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]), haze.extra.first, haze.extra.rgb); Object.defineProperty(T, '__haze', { value: true }); }
    }
    this.colours = [...new Set(this.lut.slice(1, 48 + ts.palette.length))].map((v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255]);
    if (haze) haze.extra.rgb.forEach((c) => this.colours.push(c.slice()));
    this.state = null; this.states = new Map(); this.last = null; this.sprites = new Map(); this.scratch = null;
    this.landmarks = new Set(place.landmarks.map((l) => l.y * place.w + l.x));
  }

  // The colours the baked art can put on screen, for the page's off-palette check.
  paletteRgb() { return this.colours; }

  // ---- light: page cells in, one lightState out (kept while the bits stand, so the eighth grids are not rebuilt) ----
  // fns: { veiled(x, y), foggedFar(x, y), level(x, y) } in the page's cell coordinates.
  // slot: whose light it is (the page passes the cell's key), so cells that share this view each keep their own state and its grids; at most eight are kept.
  lightFor(fns, slot = '') {
    const { w, h } = this.place, n = w * h, veil = new Uint8Array(n), fog = new Uint8Array(n), level = new Uint8Array(n);
    let anyV = 0, anyF = 0, anyL = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, px = x + this.ox, py = y + this.oy;
      if (fns.veiled(px, py)) { veil[i] = 1; anyV = 1; }
      if (fns.foggedFar(px, py)) { fog[i] = 1; anyF = 1; }
      const l = fns.level(px, py);
      if (l) { level[i] = l; anyL = 1; }
    }
    const s = this.states.get(slot);
    if (s && same(s.veil || new Uint8Array(n), veil) && same(s.fog || new Uint8Array(n), fog) && same(s.level || new Uint8Array(n), level)) return s;
    const st = lightState(this.place, { veil: anyV ? veil : null, fog: anyF ? fog : null, level: anyL ? level : null });
    this.states.delete(slot); this.states.set(slot, st); while (this.states.size > 8) this.states.delete(this.states.keys().next().value);
    return (this.state = st);
  }
  // Opens a light state's eighth grids now (they are otherwise made by the first draw that uses it): the page does this in idle time for a cell it is about to enter.
  prepareLight(st) { if (st) applyLight(new Uint8Array(1), { x: 0, y: 0, w: 1, h: 1 }, 48, this.ts, st, { nightIndex: this.night }); }

  // ---- pass 1 and 2 to the screen ----
  // win: the place pixels the view covers { x, y, w, h }; (sx, sy): where the view's top-left goes on the page's canvas.
  // Ground patches: whole 48 px cells of the ground replaced by the ground of another cell of the same place (the set's own pixels), for a stop-gap look such as a
  // closed opening's path drawn as grass. list: [{ x, y, from: { x, y } }] in place cells; id names the list (the cache key).
  setPatches(list, id = '') { this.patches = list || []; this.patchId = this.patches.length ? id : ''; }
  // The range haze: levels = Uint8Array(place.w * place.h) of 0..3 per place cell (3 = the edge row), or null for none; id names the grid (the cache key); pid seeds the lumps.
  // Props and crowns whose anchor cell is hazed fade with the land (spriteCanvas); everything the page draws itself (explorer, creatures) never does.
  setHaze(levels, id = '', pid = '') {
    if (!this.hazeKit || !levels) { this.hazeMaps = null; this.hazeLv = null; this.hazeId = ''; return; }
    if (id === this.hazeId && this.hazeMaps) return;
    this.hazeId = id; this.hazeLv = levels; this.hazeMaps = layHaze(this.hazeKit, levels, this.place.w, this.place.h, pid);
  }
  drawGround(g, sx, sy, win, clockMs, light) {
    const key = `${win.x},${win.y},${win.w},${win.h}|${this.cache.frameKey(clockMs)}|${light ? light.id ?? (light.id = (this.nextId = (this.nextId || 0) + 1)) : 0}|${this.patchId || ''}|${this.hazeId}`;
    if (!this.last || this.last.key !== key) {
      const buf = this.cache.get(win, clockMs);   // a fresh copy of the window, so the light can be applied in place
      for (const p of this.patches || []) {
        const donor = this.cache.get({ x: p.from.x * 48, y: p.from.y * 48, w: 48, h: 48 }, clockMs);
        for (let j = 0; j < 48; j++) for (let i = 0; i < 48; i++) {
          const X = p.x * 48 + i - win.x, Y = p.y * 48 + j - win.y;
          if (X >= 0 && Y >= 0 && X < win.w && Y < win.h) buf[Y * win.w + X] = donor[j * 48 + i];
        }
      }
      if (this.hazeMaps) applyHaze(buf, win, 48, this.hazeKit, this.hazeMaps);   // the range haze, before the light so fog, storm and veil act on it too
      if (light) applyLight(buf, win, 48, this.ts, light, { nightIndex: this.night });
      const img = g.createImageData(win.w, win.h), u = new Uint32Array(img.data.buffer);
      for (let i = 0; i < buf.length; i++) u[i] = buf[i] ? this.lut[buf[i]] : 0;
      this.last = { key, img };
    }
    g.putImageData(this.last.img, sx, sy);
  }

  // ---- the whole place at 24 px (the arrival look, Look over the place, the reveal): C6's half-scale render ----
  // veil: Uint8Array(place.w * place.h), 1 = veiled, or null for the clear place. Returns the indexed buffer (place.w * 24 by place.h * 24).
  wholeSize() { return wholeScale(this.place); }   // 16 for a place larger than 18 x 22, else 24
  // cut: { props, canopy } the lists a cell shows instead of the template's (the world's edges take trees away and add a wall's clones); none: the template's own.
  overviewBuf(veil, clockMs = 0, cut = null) {
    const it = this.overviewSteps(veil, clockMs, cut);
    for (;;) { const r = it.next(); if (r.done) return r.value; }
  }
  // The same picture in steps (a generator: each next() does one step, the last returns the buffer), for a page that builds it in its idle time.
  overviewSteps(veil, clockMs = 0, cut = null) {
    const light = veil && veil.some((v) => v) ? lightState(this.place, { veil }) : null, place = cut ? { ...this.place, props: cut.props, canopy: cut.canopy } : this.place;
    const it = renderViewSteps(this.ts, place, wholeScale(this.place), { x: 0, y: 0, w: this.place.w * wholeScale(this.place), h: this.place.h * wholeScale(this.place) }, { clockMs, light, nightIndex: this.night, cache: this.half });
    const stamp = cut && cut.patches && cut.patches.length ? cut.patches : null; if (!stamp) return it;
    const s = wholeScale(this.place), Wd = this.place.w * s;   // the closed sides' ground (a thicket stamped over the map's end) in the whole view too: each patch is a cell of the donor's pixels
    return (function* () { for (;;) { const r = it.next(); if (!r.done) { yield r.value; continue; }
      const buf = r.value; for (const p of stamp) for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) buf[(p.y * s + j) * Wd + p.x * s + i] = buf[(p.from.y * s + j) * Wd + p.from.x * s + i];
      return buf; } })();
  }
  // The dissolve: pixel by pixel the veiled picture, until the Bayer threshold `step` (0..16) passes it and the clear one shows.
  dissolveBuf(veiled, clear, step) {
    const out = new Uint8Array(veiled.length), W = this.place.w * this.wholeSize();
    for (let i = 0; i < out.length; i++) out[i] = BAYER4[(((i / W) | 0) & 3) * 4 + ((i % W) & 3)] >= step ? veiled[i] : clear[i];
    return out;
  }
  bufCanvas(buf, w, h) {
    const cv = this.mkCanvas(w, h), cg = cv.getContext('2d'), img = cg.createImageData(w, h), u = new Uint32Array(img.data.buffer);
    for (let i = 0; i < buf.length; i++) u[i] = buf[i] ? this.lut[buf[i]] : 0;
    cg.putImageData(img, 0, 0); return cv;
  }
  // ---- sprites as cached canvases ----
  // at: { left, top } the sprite's place pixel when its anchor cell is hazed (the haze is then washed into it)
  spriteCanvas(kind, frame, level, cut, cutKey, at = null) {
    const key = `${kind}|${frame}|${level}` + (at ? `|h${this.hazeId}@${at.left},${at.top}` : '');
    if (!cut && this.sprites.has(key)) return this.sprites.get(key);
    const s = this.ts.sprites[kind], T = tablesOf(this.ts), remap = level ? T[LEVELS[level]] : null;
    const buf = new Uint8Array(s.w48 * s.h48);
    blitRle(buf, s.w48, s.h48, 0, 0, this.ts.spriteAtlas48, s.frames48[s.frames48.length > 1 ? frame % s.frames48.length : 0], s.w48, s.h48, remap, cut);
    if (at && this.hazeMaps) applyHaze(buf, { x: at.left, y: at.top, w: s.w48, h: s.h48 }, 48, this.hazeKit, this.hazeMaps);
    const cv = cut ? (this.scratch && this.scratch.width === s.w48 && this.scratch.height === s.h48 ? this.scratch : (this.scratch = this.mkCanvas(s.w48, s.h48))) : this.mkCanvas(s.w48, s.h48);
    const cg = cv.getContext('2d'), img = cg.createImageData(s.w48, s.h48), u = new Uint32Array(img.data.buffer);
    for (let i = 0; i < buf.length; i++) u[i] = buf[i] ? this.lut[buf[i]] : 0;
    cg.putImageData(img, 0, 0);
    if (!cut) this.sprites.set(key, cv);
    return cv;
  }

  // The props as sorted-list items { y, d } for the page's y-sort: y is on the page's scale (a creature in a tile sorts at tile top + 4).
  // org: { x, y } the screen position of the place's pixel (0, 0). visible(px, py) and level(px, py) take the page's cells.
  propItems(g, org, clockMs, visible, level, cut = null) {
    const items = [], { w } = this.place;
    for (const p of cut ? cut.props : this.place.props) {
      const cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48), px = cx + this.ox, py = cy + this.oy;
      if (!this.landmarks.has(cy * w + cx) && !visible(px, py)) continue;
      const s = this.ts.sprites[p.kind], frame = walkFrame(s, clockMs), lv = level(px, py);
      const at = this.hazeLv && this.hazeLv[cy * w + cx] ? { left: p.x - s.anchor48[0], top: p.y - s.anchor48[1] } : null;
      items.push({ y: this.oy * 48 + p.sortY - 43, d: () => g.drawImage(this.spriteCanvas(p.kind, frame, lv, null, undefined, at), org.x + p.x - s.anchor48[0], org.y + p.y - s.anchor48[1]) });
    }
    return items;
  }

  // Pass 4: every crown over everything, dithered away in a disc round each pawn. pawns: [{ x, y }] page pixels of a pawn's centre.
  drawCanopy(g, org, clockMs, pawns, visible, level, cut = null) {
    const local = pawns.map((q) => ({ x: q.x - this.ox * 48, y: q.y - this.oy * 48 }));
    const cutAt = cutOut(48, local), draw = (kind, x, y) => {
      const cx = Math.floor(x / 48), cy = Math.floor(y / 48), px = cx + this.ox, py = cy + this.oy;
      if (!visible(px, py)) return;
      const s = this.ts.sprites[kind], frame = walkFrame(s, clockMs), lv = level(px, py);
      const left = x - s.anchor48[0], top = y - s.anchor48[1];
      let cut = null;
      if (cutAt && local.some((q) => q.x > left - 22 && q.x < left + s.w48 + 22 && q.y > top - 22 && q.y < top + s.h48 + 22)) cut = (dx, dy) => cutAt(dx + left, dy + top);
      const at = this.hazeLv && this.hazeLv[cy * this.place.w + cx] ? { left, top } : null;
      g.drawImage(this.spriteCanvas(kind, frame, lv, cut, undefined, at), org.x + left, org.y + top);
    };
    for (const p of cut ? cut.props : this.place.props) { const c = this.ts.sprites[p.kind].canopy; if (c >= 0) draw(c, p.x, p.y); }
    for (const c of cut ? cut.canopy : this.place.canopy) draw(c.kind, c.x, c.y);
  }

  // ---- the camera, in page pixels: half-screen steps (camera.mjs) ----
  // state: the caller's newCam(); tile: the explorer's tile in page cells (not the tween); span: an optional cell { x, y } to hold in view too (the heart at the reveal's spot).
  newCam() { return newCam(); }
  camera(state, view, tile, nowMs, motion, span = null) {
    const ox = this.ox * TILE, oy = this.oy * TILE;
    const extra = span ? { x0: (span.x - this.ox) * TILE, y0: (span.y - this.oy) * TILE, x1: (span.x - this.ox + 1) * TILE, y1: (span.y - this.oy + 1) * TILE } : null;
    const c = stepCamera(state, view, { pw: this.place.w * TILE, ph: this.place.h * TILE }, { x: tile.x - this.ox, y: tile.y - this.oy }, nowMs, motion, extra);
    return { x: c.x + ox, y: c.y + oy };
  }
}
