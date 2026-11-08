// The page's side of a baked place (place design A4.2, "the web host"): the indexed ground and light passes converted once per change to an
// ImageData through the page's palette, props and canopy as cached canvases (the page's usual sprite path), and the camera.
// The page owns the creatures, the partner, the explorer and the overlays; this module never draws them.
import { readPlace, readTileSet } from './format/read.mjs';
import { PlaceGroundCache, applyLight, lightState, tablesOf, LEVELS } from './ground.mjs';
import { cutOut, scaleTo, spriteFrame } from './sprites.mjs';
import { blitRle } from './blit.mjs';
import { newLook, lookTo, tellPull, cameraFor, TILE } from './camera.mjs';

const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Fetches the place and its tile set from `base` (the folder holding baked/).
export async function loadBaked(fetchBytes, base, id) {
  const place = readPlace(await fetchBytes(`${base}baked/${id}.mbplace`));
  const ts = readTileSet(await fetchBytes(`${base}baked/${place.set}.mbtiles`));
  return { place, ts };
}

const same = (a, b) => { if (!a || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

// core: the page's core colours [[r, g, b]] for indices 0..47 (the set's own colours come from the tile set); night: the veil dots' colour index.
export class BakedView {
  constructor(ts, place, { core, night = 2, ox = 0, oy = 0, mkCanvas }) {
    Object.assign(this, { ts, place, ox, oy, night, mkCanvas });
    this.size = 48;
    this.cache = new PlaceGroundCache(ts, place, 48);
    this.lut = new Uint32Array(256);                 // ABGR, little-endian ImageData
    const rgb = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
    for (let i = 1; i < 48; i++) this.lut[i] = rgb(...core[i]);
    ts.palette.forEach((c, k) => { this.lut[48 + k] = rgb((c >> 16) & 255, (c >> 8) & 255, c & 255); });
    this.colours = [...new Set(this.lut.slice(1, 48 + ts.palette.length))].map((v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255]);
    this.look = newLook();
    this.state = null; this.last = null; this.sprites = new Map(); this.scratch = null;
    this.landmarks = new Set(place.landmarks.map((l) => l.y * place.w + l.x));
  }

  // The colours the baked art can put on screen, for the page's off-palette check.
  paletteRgb() { return this.colours; }

  // ---- light: page cells in, one lightState out (kept while the bits stand, so the eighth grids are not rebuilt) ----
  // fns: { veiled(x, y), foggedFar(x, y), level(x, y) } in the page's cell coordinates.
  lightFor(fns) {
    const { w, h } = this.place, n = w * h, veil = new Uint8Array(n), fog = new Uint8Array(n), level = new Uint8Array(n);
    let anyV = 0, anyF = 0, anyL = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, px = x + this.ox, py = y + this.oy;
      if (fns.veiled(px, py)) { veil[i] = 1; anyV = 1; }
      if (fns.foggedFar(px, py)) { fog[i] = 1; anyF = 1; }
      const l = fns.level(px, py);
      if (l) { level[i] = l; anyL = 1; }
    }
    const s = this.state;
    if (s && same(s.veil || new Uint8Array(n), veil) && same(s.fog || new Uint8Array(n), fog) && same(s.level || new Uint8Array(n), level)) return s;
    return (this.state = lightState(this.place, { veil: anyV ? veil : null, fog: anyF ? fog : null, level: anyL ? level : null }));
  }

  // ---- pass 1 and 2 to the screen ----
  // win: the place pixels the view covers { x, y, w, h }; (sx, sy): where the view's top-left goes on the page's canvas.
  drawGround(g, sx, sy, win, clockMs, light) {
    const key = `${win.x},${win.y},${win.w},${win.h}|${this.cache.frameKey(clockMs)}|${light ? light.id ?? (light.id = (this.nextId = (this.nextId || 0) + 1)) : 0}`;
    if (!this.last || this.last.key !== key) {
      const buf = this.cache.get(win, clockMs);   // a fresh copy of the window, so the light can be applied in place
      if (light) applyLight(buf, win, 48, this.ts, light, { nightIndex: this.night });
      const img = g.createImageData(win.w, win.h), u = new Uint32Array(img.data.buffer);
      for (let i = 0; i < buf.length; i++) u[i] = buf[i] ? this.lut[buf[i]] : 0;
      this.last = { key, img };
    }
    g.putImageData(this.last.img, sx, sy);
  }

  // ---- sprites as cached canvases ----
  spriteCanvas(kind, frame, level, cut, cutKey) {
    const key = `${kind}|${frame}|${level}`;
    if (!cut && this.sprites.has(key)) return this.sprites.get(key);
    const s = this.ts.sprites[kind], T = tablesOf(this.ts), remap = level ? T[LEVELS[level]] : null;
    const buf = new Uint8Array(s.w48 * s.h48);
    blitRle(buf, s.w48, s.h48, 0, 0, this.ts.spriteAtlas48, s.frames48[s.frames48.length > 1 ? frame % s.frames48.length : 0], s.w48, s.h48, remap, cut);
    const cv = cut ? (this.scratch && this.scratch.width === s.w48 && this.scratch.height === s.h48 ? this.scratch : (this.scratch = this.mkCanvas(s.w48, s.h48))) : this.mkCanvas(s.w48, s.h48);
    const cg = cv.getContext('2d'), img = cg.createImageData(s.w48, s.h48), u = new Uint32Array(img.data.buffer);
    for (let i = 0; i < buf.length; i++) u[i] = buf[i] ? this.lut[buf[i]] : 0;
    cg.putImageData(img, 0, 0);
    if (!cut) this.sprites.set(key, cv);
    return cv;
  }

  // The props as sorted-list items { y, d } for the page's y-sort: y is on the page's scale (a creature in a tile sorts at tile top + 4).
  // org: { x, y } the screen position of the place's pixel (0, 0). visible(px, py) and level(px, py) take the page's cells.
  propItems(g, org, clockMs, visible, level) {
    const items = [], { w } = this.place;
    for (const p of this.place.props) {
      const cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48), px = cx + this.ox, py = cy + this.oy;
      if (!this.landmarks.has(cy * w + cx) && !visible(px, py)) continue;
      const s = this.ts.sprites[p.kind], frame = spriteFrame(s, clockMs), lv = level(px, py);
      items.push({ y: this.oy * 48 + p.sortY - 43, d: () => g.drawImage(this.spriteCanvas(p.kind, frame, lv), org.x + p.x - s.anchor48[0], org.y + p.y - s.anchor48[1]) });
    }
    return items;
  }

  // Pass 4: every crown over everything, dithered away in a disc round each pawn. pawns: [{ x, y }] page pixels of a pawn's centre.
  drawCanopy(g, org, clockMs, pawns, visible, level) {
    const local = pawns.map((q) => ({ x: q.x - this.ox * 48, y: q.y - this.oy * 48 }));
    const cutAt = cutOut(48, local), draw = (kind, x, y) => {
      const cx = Math.floor(x / 48), cy = Math.floor(y / 48), px = cx + this.ox, py = cy + this.oy;
      if (!visible(px, py)) return;
      const s = this.ts.sprites[kind], frame = spriteFrame(s, clockMs), lv = level(px, py);
      const left = x - s.anchor48[0], top = y - s.anchor48[1];
      let cut = null;
      if (cutAt && local.some((q) => q.x > left - 22 && q.x < left + s.w48 + 22 && q.y > top - 22 && q.y < top + s.h48 + 22)) cut = (dx, dy) => cutAt(dx + left, dy + top);
      g.drawImage(this.spriteCanvas(kind, frame, lv, cut), org.x + left, org.y + top);
    };
    for (const p of this.place.props) { const c = this.ts.sprites[p.kind].canopy; if (c >= 0) draw(c, p.x, p.y); }
    for (const c of this.place.canopy) draw(c.kind, c.x, c.y);
  }

  // ---- the camera, in page pixels ----
  // (px, py): the explorer's tile origin in page pixels (tweened); dir: 'up'..'right'; heart: the layout's heart ({ x, y, clues } in page cells) or null.
  camera(view, px, py, dir, nowMs, heart, found) {
    const ox = this.ox * TILE, oy = this.oy * TILE, d = DIR[dir] || [0, 0];
    const pawn = { x: px + 24 - ox, y: py + 24 - oy };
    const look = lookTo(this.look, d[0], d[1], nowMs);
    const centre = (c) => ({ x: (c.x - this.ox) * TILE + 24, y: (c.y - this.oy) * TILE + 24 });
    const pull = heart ? tellPull(pawn, [heart, ...(heart.clues || [])].map(centre), found) : { x: 0, y: 0 };
    const c = cameraFor(view, { pw: this.place.w * TILE, ph: this.place.h * TILE }, pawn, look, pull);
    return { x: c.x + ox, y: c.y + oy };
  }
}
