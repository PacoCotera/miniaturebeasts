// The Station's layered canvas renderer: three device-pixel canvases (art, painted, type) the size of the screen,
// painted from a Scene's dirty rectangles and composited whole onto the page's visible canvas. The art layer holds
// only palette colours; the painted layer the landed paintings as they came; the type layer glyphs blitted from the
// baked atlases (tinted in a palette colour, 4-bit coverage as alpha), with a run log of every string so the type
// check can read it. A node drawn later erases what it covers on the layers above its own, so the composite reads
// exactly as one surface painted in order (technical-architecture.md §3, §5.1).
//
// The primitive set is closed: fillRect, drawImage at integer pixels with a source rectangle (a sprite, a slice of a
// nine-slice, a glyph), and clearRect / destination-out to erase. A clip is arithmetic on rectangles, never a canvas
// path. No gradients, shadows, filters, transforms, global alpha, text API or smoothing exist here.
import { asset as assetOf, assetEntry } from "../assets.mjs";
import { rectIntersect, drawnRect } from "../scene.mjs";
import { maskPicture } from "./canvas-assets.mjs";

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const LAYER_ABOVE = { art: ["painted", "type"], painted: ["type"], type: [] };

export class StationCanvas {
  // type: a TypeSet (type.mjs); atlases: { <face id>: a canvas holding the atlas coverage }
  constructor({ w = 1024, h = 600, palette, type, atlases, canvases = null } = {}) {
    this.w = w; this.h = h; this.type = type; this.atlases = atlases;
    this.palette = palette; this.hex = Object.fromEntries(palette.colours);
    this.ok = new Set(palette.colours.map(([, hx]) => { const [r, g, b] = hexRGB(hx); return (r << 16) | (g << 8) | b; }));
    this.layers = {}; this.ctx = {};
    for (const name of ["art", "painted", "type"]) { const c = canvases?.[name] ?? makeCanvas(w, h); this.layers[name] = c; const g = c.getContext("2d", { willReadFrequently: name !== "painted" }); g.imageSmoothingEnabled = false; this.ctx[name] = g; }
    this.tinted = new Map(); this.env = { hex: (n) => this.colour(n), rgb: (n) => hexRGB(this.colour(n)), mask: (w, h, mask, colour) => maskPicture(w, h, mask, hexRGB(this.colour(colour))) };   // what a picture's builder may ask the page for
    this.runs = new Map(); this.frameLog = []; this.sizeErrors = []; this.missing = []; this.painted = 0; this.frame = 0; this.clipNow = null;
  }
  colour(name) { const hx = this.hex[name]; if (!hx) throw new Error("no palette colour named " + name); return hx; }
  measure(text, px) { return this.type.measure(text, px); }

  // ---- the immediate primitives (nodes call them; so does the legacy adapter) ----
  // Pixels of `src` (a canvas) at [sx, sy, w, h] to (dx, dy) on a layer, inside the clip; 1:1 and whole pixels.
  part(layer, src, sx, sy, w, h, dx, dy, clip) {
    let r = [dx, dy, w, h]; if (clip) r = rectIntersect(r, clip); if (this.clipNow) r = r && rectIntersect(r, this.clipNow); if (!r) return;
    const ox = r[0] - dx, oy = r[1] - dy;
    this.ctx[layer].drawImage(src, sx + ox, sy + oy, r[2], r[3], r[0], r[1], r[2], r[3]);
    for (const up of LAYER_ABOVE[layer]) { const g = this.ctx[up]; g.globalCompositeOperation = "destination-out"; g.drawImage(src, sx + ox, sy + oy, r[2], r[3], r[0], r[1], r[2], r[3]); g.globalCompositeOperation = "source-over"; }
  }
  fillRect(rect, colour, clip) {
    let r = rect.map(Math.round); if (clip) r = rectIntersect(r, clip); if (this.clipNow) r = r && rectIntersect(r, this.clipNow); if (!r) return;
    const g = this.ctx.art; g.fillStyle = this.colour(colour); g.fillRect(r[0], r[1], r[2], r[3]);
    this.ctx.painted.clearRect(r[0], r[1], r[2], r[3]); this.ctx.type.clearRect(r[0], r[1], r[2], r[3]);
  }
  layerOf(id) { return assetEntry(id)?.policy === "painted" ? "painted" : "art"; }
  sprite(id, rect, clip) {
    const a = assetOf(id, this.env), [x, y, w, h] = rect;
    if (!a) { this.missing.push(id); this.flag(rect); return; }
    if (a.w !== w || a.h !== h) { this.sizeErrors.push({ asset: id, slot: [w, h], asset_size: [a.w, a.h] }); this.flag(rect); return; }
    this.part(this.layerOf(id), a.canvas(), 0, 0, w, h, x, y, clip);
  }
  // A picture with insets [l, t, r, b]: corners 1:1, edges and middle tiled (a uniform strip tiled is exact; nothing is scaled).
  nineSlice(id, rect, clip) {
    const a = assetOf(id, this.env), e = assetEntry(id);
    if (!a || !e?.slice) { this.missing.push(id); this.flag(rect); return; }
    const [l, t, r, b] = e.slice, [x, y, w, h] = rect, cv = a.canvas(), layer = this.layerOf(id);
    if (w < l + r || h < t + b) { this.sizeErrors.push({ asset: id, slot: [w, h], asset_size: [a.w, a.h] }); this.flag(rect); return; }
    const cols = [[0, l, x, l], [l, a.w - l - r, x + l, w - l - r], [a.w - r, r, x + w - r, r]], rows = [[0, t, y, t], [t, a.h - t - b, y + t, h - t - b], [a.h - b, b, y + h - b, b]];
    for (const [sy, sh, dy, dh] of rows) for (const [sx, sw, dx, dw] of cols) {
      if (!sw || !sh || !dw || !dh) continue;
      for (let ty = 0; ty < dh; ty += sh) for (let tx = 0; tx < dw; tx += sw) this.part(layer, cv, sx, sy, Math.min(sw, dw - tx), Math.min(sh, dh - ty), dx + tx, dy + ty, clip);
    }
  }
  // The atlas of a face tinted in a palette colour (white coverage becomes the colour, alpha kept): cached.
  tint(face, colour) {
    const key = face.id + ":" + colour; let cv = this.tinted.get(key); if (cv) return cv;
    const src = this.atlases[face.id], [W, H] = face.size; cv = makeCanvas(W, H);
    const g = cv.getContext("2d"), id = g.getImageData(0, 0, W, H), cover = src.getContext("2d").getImageData(0, 0, W, H).data, [R, G, B] = hexRGB(this.colour(colour));
    for (let i = 0; i < W * H; i++) { id.data[i * 4] = R; id.data[i * 4 + 1] = G; id.data[i * 4 + 2] = B; id.data[i * 4 + 3] = cover[i * 4 + 3]; }
    g.putImageData(id, 0, 0); this.tinted.set(key, cv); return cv;
  }
  // A glyph run: the string laid out from the atlas metrics, the cap top on rect y, x the anchor by align.
  glyphs(n, clip) {
    const { glyphs, width, face } = this.type.layout(n.text, n.px), [x, y] = n.rect;
    const ax = n.align === "center" ? x - Math.round(width / 2) : n.align === "right" ? x - width : x, tin = this.tint(face, n.colour);
    for (const g of glyphs) this.part("type", tin, g.sx, g.sy, g.w, g.h, ax + g.dx, y + g.dy, clip);
    const rec = { text: n.text, face: face.id, family: face.family, px: face.px, weight: face.weight, atlas: face.atlas, id: n.id ?? null, frame: this.frame, width };
    const key = rec.face + "|" + rec.text, seen = this.runs.get(key); if (seen) seen.count++; else this.runs.set(key, { ...rec, count: 1 });   // the log holds each distinct run once, with how many times it was set
    this.frameLog.push(rec);
    return width;
  }
  // A visible error in development: a magenta hairline where a sprite could not be placed at its size (counted, and 0 in CI).
  flag(rect) { const [x, y, w, h] = rect, g = this.ctx.art; g.fillStyle = "#ff00ff"; for (const r of [[x, y, w, 1], [x, y + h - 1, w, 1], [x, y, 1, h], [x + w - 1, y, 1, h]]) g.fillRect(r[0], r[1], r[2], r[3]); }

  // ---- the scene ----
  // Paint every dirty rectangle of the scene: clear it on the three layers, draw the nodes that touch it in order.
  paint(scene) {
    this.frame++; this.frameLog = [];
    const rects = scene.dirtyRects(); if (!rects.length) return 0;
    let px = 0;
    for (const d of rects) {
      px += d[2] * d[3];
      for (const name of ["art", "painted", "type"]) this.ctx[name].clearRect(d[0], d[1], d[2], d[3]);
      for (const f of scene.nodesIn(d)) this.draw(f, d);
    }
    scene.clearDirty(); this.painted += px; return px;
  }
  draw(f, within) {
    const n = f.node, clip = rectIntersect(within, drawnRect(f)); if (!clip) return;
    if (n.kind === "rect") this.fillRect(n.rect, n.colour, clip);
    else if (n.kind === "sprite") this.sprite(n.asset, n.rect, clip);
    else if (n.kind === "nineSlice") this.nineSlice(n.asset, n.rect, clip);
    else if (n.kind === "text") this.glyphs(n, clip);
    else if (n.kind === "legacy") { this.clipNow = clip; try { n.draw(clip); } finally { this.clipNow = null; } }
    else if (n.kind !== "clip") throw new Error(`unknown scene node kind "${n.kind}" (${n.id})`);   // a clip has nothing of its own: its children are nodes of the flat list
  }
  // The three layers onto a visible context, art under painted under type, on the ground colour.
  composite(target, ground = null) {
    if (ground) { target.fillStyle = this.colour(ground); target.fillRect(0, 0, this.w, this.h); } else target.clearRect(0, 0, this.w, this.h);
    for (const name of ["art", "painted", "type"]) target.drawImage(this.layers[name], 0, 0);
  }
  // Pixels of a layer outside the palette (transparent pixels are not counted; `covered` tells how many are opaque).
  // On the type layer a pixel counts off palette only by its colour, never its alpha: the glyphs are tinted in a palette colour.
  offPalette(layer = "art", rect = null) {
    const [x, y, w, h] = rect || [0, 0, this.w, this.h], d = this.ctx[layer].getImageData(x, y, w, h).data;
    let bad = 0, covered = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 0) continue; covered++; if (!this.ok.has((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])) bad++; }
    return { bad, covered, total: w * h };
  }
  get typeLog() { return [...this.runs.values()]; }
  // A layer as RGBA (the checks read it back).
  layerData(layer) { return this.ctx[layer].getImageData(0, 0, this.w, this.h); }
  capture() { const cv = makeCanvas(this.w, this.h); this.composite(cv.getContext("2d"), null); return cv; }
}
