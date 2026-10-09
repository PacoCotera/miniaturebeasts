// The drawing half of the old pixel layer (frozen, lvgl-switch.md §5): the primitives the screens not yet on the face still draw with (R, blit, text, panel, ditherFill, focusRing), the type
// measure that rides on the renderer, and the canvas a buffer is drawn from. The pixel core (the palette, PB and its helpers) is pixels.mjs. Deleted at L3, a screen at a time before that.
import { PB, C, RGB, PALETTE, bay, art, clock, motion } from "./pixels.mjs";

// The canvas a buffer draws from (the browser's), kept on the buffer.
function canvasOf(pb) {
  if (pb.cv) return pb.cv;
  const cv = document.createElement("canvas"); cv.width = pb.w; cv.height = pb.h;
  const g2 = cv.getContext("2d"), id = g2.createImageData(pb.w, pb.h);
  for (let i = 0; i < pb.p.length; i++) { const c = pb.p[i]; if (c < 0) continue; const rgb = RGB[c], o = i * 4; id.data[o] = rgb[0]; id.data[o + 1] = rgb[1]; id.data[o + 2] = rgb[2]; id.data[o + 3] = 255; }
  g2.putImageData(id, 0, 0); pb.cv = cv; return cv;
}
// The layered renderer and the face's picture env ask a built buffer for its canvas (`a.canvas()`): this module, imported by the page before anything draws, gives every buffer the method, so pixels.mjs holds none.
PB.prototype.canvas = function () { return canvasOf(this); };

// ---------- The renderer behind the old primitives ----------
// The Station page draws through prototypes/ui's layered renderer (technical-architecture.md §5). The screens not yet
// moved to the screen layer keep calling R, blit, text and panel as before; those calls now land on the renderer's
// immediate primitives (a rectangle, a sprite at its size, a glyph run from the Inter atlas), on the art, painted and
// type layers (the adapter of T1). Nothing here uses a canvas text API, path, gradient or transform.
let SC = null;
export const bindCanvas = (sc) => { SC = sc; };
export const canvas = () => SC;
const name = (c) => PALETTE[c][0];

// ---------- Type: Inter from the baked atlases, at the style guide's Station sizes (16 px body and readouts, 20 px
// titles, 28 px names). The size argument keeps the old scale numbers: 2 body, 3 title, 4 name; 1 (13 px, which the
// style guide forbids) is set at 16, the nearest face the atlases have.
export const FONT_PX = { 1: 16, 2: 16, 3: 20, 4: 28 };
export const ICON_GLYPH = { "⚡": "energy", "◆": "data", "❀": "essence", "★": "star", "✕": "cross" };   // drawn as the material icons inside text
let iconsOf = () => null;   // art.mjs registers the material icons (name, px)
export const setIcons = (fn) => { iconsOf = fn; };
const iconPx = (s) => Math.round((FONT_PX[s] || 16) * 0.9);
function runs(str) { const out = []; let cur = ""; for (const ch of str) { if (ICON_GLYPH[ch]) { if (cur) out.push(cur); out.push({ icon: ICON_GLYPH[ch] }); cur = ""; } else cur += ch; } if (cur) out.push(cur); return out; }
export function textW(str, s) {
  s = s || 2; const px = FONT_PX[s] || 16; let w = 0;
  for (const r of runs(str)) w += typeof r === "string" ? SC.measure(r, px) : iconPx(s) + 2;
  return Math.round(w);
}
export function wrapText(str, maxW, s) { const words = str.split(" "), lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (textW(t, s) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } } if (cur) lines.push(cur); return lines; }
export function clipText(str, maxW, s) { if (textW(str, s) <= maxW) return str; while (str.length > 1 && textW(str + "…", s) > maxW) str = str.slice(0, -1); return str + "…"; }

// ---------- The frame: 1024×600 at 1:1 device pixels ----------
export const R = (x, y, w, h, c) => SC.fillRect([Math.floor(x), Math.floor(y), Math.round(w), Math.round(h)], name(c));
export const blit = (pb, x, y) => SC.part(pb.layer || "art", pb.canvas(), 0, 0, pb.w, pb.h, Math.round(x), Math.round(y));
export function text(str, x, y, col, s, align) {
  s = s || 2; x = Math.round(x); y = Math.round(y); const w = textW(str, s), px = FONT_PX[s] || 16;
  if (align === "center") x -= Math.round(w / 2); else if (align === "right") x -= w;
  for (const r of runs(str)) {
    if (typeof r === "string") { x += SC.glyphs({ text: r, px, colour: name(col), rect: [x, y, 0, 0], align: "left", id: "legacy" }, null); }
    else { const n = iconPx(s), ic = iconsOf(r.icon, n); if (ic) blit(ic, x + 1, y + SC.type.face(px).cap - n + Math.round(n * 0.12)); x += n + 2; }
  }
  return w;
}
// A panel with cut corners (plates, cards, the ribbon).
export function panel(x, y, w, h, fill, border) {
  if (border != null) { R(x + 2, y, w - 4, h, border); R(x + 1, y + 1, w - 2, h - 2, border); R(x, y + 2, w, h - 4, border); x++; y++; w -= 2; h -= 2; }
  R(x + 2, y, w - 4, h, fill); R(x + 1, y + 1, w - 2, h - 2, fill); R(x, y + 2, w, h - 4, fill);
}
function ditherArt(col, level) { return art("dith" + col + ":" + level, () => { const pb = new PB(64, 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (bay(x, y) < level) pb.set(x, y, C[col]); return pb; }); }
export function ditherFill(x, y, w, h, col, level) {
  if (level <= 0) return; if (level >= 16) { R(x, y, w, h, C[col]); return; }
  const cv = ditherArt(col, level).canvas(), clip = [Math.floor(x), Math.floor(y), Math.round(w), Math.round(h)];
  for (let ty = Math.floor(y / 64) * 64; ty < y + h; ty += 64) for (let tx = Math.floor(x / 64) * 64; tx < x + w; tx += 64) SC.part("art", cv, 0, 0, 64, 64, tx, ty, clip);
}
// The old warm focus ring (the screens not yet moved): a 3 px amber ring with cut corners around the focused thing.
export function focusRing(x, y, w, h) {
  const pulse = motion() ? Math.floor(clock.now / 500) % 2 : 0, c = pulse ? C.amber : C.orange;
  R(x + 4, y - 3, w - 8, 3, c); R(x + 4, y + h, w - 8, 3, c); R(x - 3, y + 4, 3, h - 8, c); R(x + w, y + 4, 3, h - 8, c);
  R(x, y - 1, 4, 2, c); R(x - 1, y, 2, 4, c); R(x + w - 4, y - 1, 4, 2, c); R(x + w - 1, y, 2, 4, c);
  R(x, y + h - 1, 4, 2, c); R(x - 1, y + h - 4, 2, 4, c); R(x + w - 4, y + h - 1, 4, 2, c); R(x + w - 1, y + h - 4, 2, 4, c);
}
// Pixels outside the palette on the art layer (0 on every screen; the test hook). The type layer is anti-aliased by decision.
export const offPalette = () => SC.offPalette("art").bad;
