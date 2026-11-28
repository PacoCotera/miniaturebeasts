// The frame (rendering): the one 450×600 picture every screen draws on, 1:1 device pixels, and what the screens draw on it with.
// The pixel core is still the page's: it hands in once, as `env`, the document that makes the canvases, the palette (HEX, C), the picture class
// and its cache (PB, art), the dither pictures, the effects' record (FX; read for hitAt, when the shield was last hit), and two readers
// of the moment: now() (the frame's time, ms) and motion() (false when the player asked for reduced motion).
import { BAYER4 } from "./view.mjs";
import { clamp } from "../logic/world.mjs";
import { SCR_W, SCR_H, VIEW_Y, VIEW_H } from "../data/screen.mjs";

const GLINT_DIM = .4;   // a standing glint between its pulses
const SHAKE = [[3, 0], [-3, 1], [2, -1], [-2, 0], [1, 1], [-1, 0]];   // the view's offset after a shield hit, 45 ms each

export function makeFrame(env) {
  const { document, HEX, C, PB, art, ditherArt, FX, now, motion } = env;
  const scr = document.createElement('canvas'); scr.width = SCR_W; scr.height = SCR_H;
  const g = scr.getContext('2d'); g.imageSmoothingEnabled = false;

  // A canvas cannot say how deep its save stack is, and its own reset() clears the picture. The frame counts the saves, so a drawing that threw
  // between a save and its restore is put right with the picture kept.
  let depth = 0; const save = g.save.bind(g), restore = g.restore.bind(g);
  g.save = () => { depth++; save(); }; g.restore = () => { if (depth > 0) { depth--; restore(); } };
  // The canvas state a frame starts from: no clip, no transform, no pending save, sharp pixels.
  function resetCanvas() { while (depth > 0) g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; }

  const R = (x, y, w, h, c) => { g.fillStyle = HEX[c]; g.fillRect(Math.floor(x), Math.floor(y), Math.round(w), Math.round(h)); };
  const blit = (pb, x, y, rm, flip, chk) => g.drawImage(pb.canvas(rm, flip, chk), Math.round(x) + (pb.dx || 0), Math.round(y) + (pb.dy || 0));
  // A standing glint is always drawn: full for its pulse, the same picture dimmer between pulses.
  const glintBlit = (pb, x, y, bright) => { if (bright || !motion()) { blit(pb, x, y); return; } g.save(); g.globalAlpha = GLINT_DIM; blit(pb, x, y); g.restore(); };
  function circ(cx, cy, r, c, dotted) { // midpoint circle, 2 px thick
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r); g.fillStyle = HEX[c];
    for (const rr of [r, r - 1]) { let x = rr, y = 0, e = 1 - rr, i = 0;
      while (x >= y) { if (!dotted || (i++ & 2)) for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) g.fillRect(cx + a, cy + b, 1, 1);
        y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; } } }
  }
  function pline(x0, y0, x1, y1, c, th) { // Bresenham, th×th pen
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); g.fillStyle = HEX[c];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { g.fillRect(x0, y0, th, th); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // An ordered-dither fill: `level` of the 16 pixels in each 4×4 take the colour (a name of the palette).
  function ditherFill(x, y, w, h, col, level) {
    if (level <= 0) return; if (level >= 16) { R(x, y, w, h, C[col]); return; }
    const cv = ditherArt(64, 64, col, level).canvas();
    g.save(); g.beginPath(); g.rect(Math.floor(x), Math.floor(y), Math.round(w), Math.round(h)); g.clip();
    for (let ty = Math.floor(y / 64) * 64; ty < y + h; ty += 64) for (let tx = Math.floor(x / 64) * 64; tx < x + w; tx += 64) g.drawImage(cv, tx, ty);
    g.restore();
  }
  // The lamp's circle: the night ground as it is inside; outside, the same ground under a 62% void dither (the palette's darkest, so darker than the
  // ground; its shapes still there), round by pixel, the dither growing from nothing over one tile at the rim (no rim line). cx, cy: the lamp on the
  // screen; r: its reach; band: one tile. The overlay is the dither's ink pixels only, kept until the lamp moves.
  let lamp = null;
  function lampCircle(cx, cy, r, band) {
    const w = SCR_W, h = VIEW_H, key = Math.round(cx) + ',' + Math.round(cy) + ',' + r + ',' + band;
    if (!lamp || lamp.key !== key) {
      const cv = lamp ? lamp.cv : document.createElement('canvas'); cv.width = w; cv.height = h;
      const c2 = cv.getContext('2d'), img = c2.createImageData(w, h), u = new Uint32Array(img.data.buffer), hex = HEX[C.void], ink = (255 << 24) | (parseInt(hex.slice(5, 7), 16) << 16) | (parseInt(hex.slice(3, 5), 16) << 8) | parseInt(hex.slice(1, 3), 16);
      const lx = Math.round(cx), ly = Math.round(cy) - VIEW_Y;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = clamp((Math.hypot(x + .5 - lx, y + .5 - ly) - (r - band)) / band, 0, 1);
        if (t > 0 && BAYER4[(y & 3) * 4 + (x & 3)] < t * 10) u[y * w + x] = ink;
      }
      c2.putImageData(img, 0, 0); lamp = { key, cv };
    }
    g.drawImage(lamp.cv, 0, VIEW_Y);
  }
  function clipView() { g.save(); g.beginPath(); g.rect(0, VIEW_Y, SCR_W, VIEW_H); g.clip(); }
  // A shield hit: the view shakes for 260 ms (not when motion is reduced) …
  function shakeOff() {
    const a = now() - FX.hitAt; if (a < 0 || a > 260 || !motion()) return [0, 0];
    return SHAKE[Math.floor(a / 45) % 6];
  }
  // … and takes a short bright frame, then a thinner one to 420 ms; the thin one alone, steady, when motion is reduced.
  function hitFrame() {
    const a = now() - FX.hitAt; if (a < 0 || a > 420) return;
    const bright = motion() && a < 90, th = bright ? 6 : 3, c = bright ? C.cream : C.coral;
    R(0, VIEW_Y, SCR_W, th, c); R(0, VIEW_Y + VIEW_H - th, SCR_W, th, c); R(0, VIEW_Y, th, VIEW_H, c); R(SCR_W - th, VIEW_Y, th, VIEW_H, c);
  }
  // Tweens: logical moves are instant; the drawn position slides linearly so held walking reads as one smooth walk.
  // rx, ry: the whole-pixel position the camera and the map pawn read; x, y stay exact (a retarget starts from them, and the floored overlays take them).
  function tween(o, tx, ty, dur) {
    if (!o) return { x: tx, y: ty, fx: tx, fy: ty, tx, ty, at: now(), dur, rx: Math.round(tx), ry: Math.round(ty) };
    if (o.tx !== tx || o.ty !== ty) { o.fx = o.x; o.fy = o.y; o.tx = tx; o.ty = ty; o.at = now(); o.dur = dur; }
    const k = motion() ? clamp((now() - o.at) / o.dur, 0, 1) : 1;
    o.x = o.fx + (o.tx - o.fx) * k; o.y = o.fy + (o.ty - o.fy) * k;
    o.rx = Math.round(o.x); o.ry = Math.round(o.y); return o;
  }
  // The view's ground under a screen: one colour, or the night tile with its slate dots.
  function viewBg(col) {
    if (col != null) { R(0, VIEW_Y, SCR_W, VIEW_H, col); return; }
    const cv = art('bg', () => { const pb = new PB(64, 64); pb.rect(0, 0, 64, 64, C.night); for (let i = 0; i < 64; i += 8) for (let j = 0; j < 64; j += 8) if (((i + j) / 8) % 2 === 0) pb.set(i + 3, j + 3, C.slate); return pb; }).canvas();
    for (let y = VIEW_Y; y < VIEW_Y + VIEW_H; y += 64) for (let x = 0; x < SCR_W; x += 64) g.drawImage(cv, x, y);
  }
  return { scr, g, resetCanvas, R, blit, glintBlit, circ, pline, ditherFill, lampCircle, clipView, shakeOff, hitFrame, tween, viewBg };
}
