// The Station's layered canvas renderer: three device-pixel canvases (art, painted, type) the size of the screen,
// painted from a Scene's dirty rectangles and composited whole onto the page's visible canvas. The art layer holds
// only palette colours (a rect, an indexed sprite, a pattern, a ring on whole pixels); the painted layer the landed
// paintings as they came; the type layer Inter through the canvas text API, anti-aliased, with a run log of every
// string so the type check can read it. A node drawn later erases what it covers on the layers above its own, so the
// composite reads exactly as one surface painted in order (technical-architecture.md §3, §5.1).
import { asset as assetOf, assetEntry } from "../assets.mjs";
import { rectIntersect, drawnRect } from "../scene.mjs";

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

export class StationCanvas {
  constructor({ w = 1024, h = 600, palette, family = "Inter", canvases = null } = {}) {
    this.w = w; this.h = h; this.family = family;
    this.palette = palette; this.hex = Object.fromEntries(palette.colours); this.ok = new Set(palette.colours.map(([, hx]) => { const [r, g, b] = hexRGB(hx); return (r << 16) | (g << 8) | b; }));
    this.layers = {}; this.ctx = {};
    for (const name of ["art", "painted", "type"]) { const c = canvases?.[name] ?? makeCanvas(w, h); this.layers[name] = c; const g = c.getContext("2d", { willReadFrequently: name !== "painted" }); g.imageSmoothingEnabled = false; this.ctx[name] = g; }
    this.typeLog = []; this.frameLog = []; this.sizeErrors = []; this.missing = []; this.rings = new Map(); this.painted = 0; this.frame = 0;
  }
  colour(name) { const hx = this.hex[name]; if (!hx) throw new Error("no palette colour named " + name); return hx; }
  font(px, weight) { return `${weight} ${px}px ${this.family}`; }
  measure(text, px, weight = 400) { const g = this.ctx.type; g.font = this.font(px, weight); return g.measureText(text).width; }
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
  // One node inside a rectangle (its clip chain and the dirty rect).
  draw(f, within) {
    const n = f.node, clip = rectIntersect(within, drawnRect(f)); if (!clip) return;
    const G = (name) => { const g = this.ctx[name]; g.save(); g.beginPath(); g.rect(clip[0], clip[1], clip[2], clip[3]); g.clip(); return g; };
    const done = (...gs) => { for (const g of gs) g.restore(); };
    const [x, y, w, h] = n.rect;
    if (n.kind === "rect") {
      const g = G("art"); g.fillStyle = this.colour(n.colour); g.fillRect(x, y, w, h); done(g);
      this.erase(["painted", "type"], clip, (g) => g.fillRect(x, y, w, h));
    } else if (n.kind === "sprite" || n.kind === "pattern") {
      const a = assetOf(n.asset), e = assetEntry(n.asset);
      if (!a) { this.missing.push(n.asset); this.flag(clip, n.rect); return; }
      if (n.kind === "sprite" && (a.w !== w || a.h !== h)) { this.sizeErrors.push({ asset: n.asset, slot: [w, h], asset_size: [a.w, a.h] }); this.flag(clip, n.rect); return; }
      const layer = e?.policy === "painted" ? "painted" : "art", cv = a.canvas();
      const g = G(layer);
      if (n.kind === "sprite") g.drawImage(cv, x, y);
      else { const p = g.createPattern(cv, "repeat"); g.fillStyle = p; g.fillRect(x, y, w, h); }
      done(g);
      const above = layer === "art" ? ["painted", "type"] : ["type"];
      this.erase(above, clip, (g) => { if (n.kind === "sprite") g.drawImage(cv, x, y); else { g.fillStyle = g.createPattern(cv, "repeat"); g.fillRect(x, y, w, h); } });
    } else if (n.kind === "ring") {
      const cv = this.ringArt(w, h, n.width ?? 2, n.radius ?? 6, n.shape ?? "round", this.colour(n.colour));
      const g = G("art"); g.drawImage(cv, x, y); done(g);
      this.erase(["painted", "type"], clip, (g) => g.drawImage(cv, x, y));
    } else if (n.kind === "text") {
      const px = n.px, weight = n.weight ?? 400, g = G("type");
      g.font = this.font(px, weight); g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = this.colour(n.colour);
      const tw = g.measureText(n.text).width, ax = n.align === "center" ? x - Math.round(tw / 2) : n.align === "right" ? x - Math.round(tw) : x;
      g.fillText(n.text, ax, y + Math.round(px * 0.78));   // the cap top sits on y
      done(g);
      const rec = { text: n.text, px, weight, family: this.family, frame: this.frame, id: n.id };
      this.typeLog.push(rec); this.frameLog.push(rec); if (this.typeLog.length > 4000) this.typeLog.splice(0, 1000);
    } else if (n.kind === "legacy") {
      const gs = ["art", "painted", "type"].map(G); try { n.draw(clip); } finally { done(...gs); }
    }
    // clip: nothing of its own; its children are nodes of the flat list
  }
  // Erase the footprint a node leaves on the layers above it (what it covers must not show through).
  erase(layers, clip, paint) { for (const name of layers) { const g = this.ctx[name]; g.save(); g.beginPath(); g.rect(clip[0], clip[1], clip[2], clip[3]); g.clip(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; paint(g); g.restore(); } }
  // A visible error in development: a magenta hairline where a sprite could not be placed at its size.
  flag(clip, rect) { const g = this.ctx.art; g.save(); g.beginPath(); g.rect(clip[0], clip[1], clip[2], clip[3]); g.clip(); g.strokeStyle = "#ff00ff"; g.lineWidth = 1; g.strokeRect(rect[0] + 0.5, rect[1] + 0.5, rect[2] - 1, rect[3] - 1); g.restore(); }
  // The focus ring on whole pixels: a rounded rectangle (or an ellipse) `width` thick, drawn by pixel-centre tests so
  // it stays on the palette (no anti-aliased stroke on the art layer). Cached by size, shape and colour.
  ringArt(w, h, width, radius, shape, hex) {
    const key = [w, h, width, radius, shape, hex].join(":"); let cv = this.rings.get(key); if (cv) return cv;
    cv = makeCanvas(w, h); const g = cv.getContext("2d"), id = g.createImageData(w, h), [R, Gc, B] = hexRGB(hex);
    const inRound = (px, py, x0, y0, x1, y1, r) => { if (px < x0 || py < y0 || px > x1 || py > y1) return false; const cx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px, cy = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py; return (px - cx) ** 2 + (py - cy) ** 2 <= r * r; };
    const inEll = (px, py, x0, y0, x1, y1) => { const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2; if (rx <= 0 || ry <= 0) return false; return ((px - (x0 + rx)) / rx) ** 2 + ((py - (y0 + ry)) / ry) ** 2 <= 1; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + 0.5, py = y + 0.5;
      const outer = shape === "ellipse" ? inEll(px, py, 0, 0, w, h) : inRound(px, py, 0, 0, w, h, radius);
      const inner = shape === "ellipse" ? inEll(px, py, width, width, w - width, h - width) : inRound(px, py, width, width, w - width, h - width, Math.max(0, radius - width));
      if (outer && !inner) { const o = (y * w + x) * 4; id.data[o] = R; id.data[o + 1] = Gc; id.data[o + 2] = B; id.data[o + 3] = 255; }
    }
    g.putImageData(id, 0, 0); this.rings.set(key, cv); return cv;
  }
  // The three layers onto a visible context, art under painted under type, on the void.
  composite(target, ground = null) {
    if (ground) { target.fillStyle = this.colour(ground); target.fillRect(0, 0, this.w, this.h); } else target.clearRect(0, 0, this.w, this.h);
    for (const name of ["art", "painted", "type"]) target.drawImage(this.layers[name], 0, 0);
  }
  // Pixels of a layer outside the palette (transparent pixels are not counted; `covered` tells how many are opaque).
  offPalette(layer = "art", rect = null) {
    const [x, y, w, h] = rect || [0, 0, this.w, this.h], d = this.ctx[layer].getImageData(x, y, w, h).data;
    let bad = 0, covered = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 0) continue; covered++; if (!this.ok.has((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])) bad++; }
    return { bad, covered, total: w * h };
  }
  // The composite as RGBA (the journey's screen capture, the grain check's input).
  capture() { const cv = makeCanvas(this.w, this.h); this.composite(cv.getContext("2d"), null); return cv; }
}
