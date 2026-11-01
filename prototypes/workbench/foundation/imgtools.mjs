// Small image helpers for the sheets and the calibration tool: RGBA images are { width, height, data }. Node only (file reads).
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG } from "../framework/png.mjs";
import { encodeRGBA } from "../form/pngrgba.mjs";

export const loadImage = (file) => decodePNG(readFileSync(file));
export const saveImage = (file, img) => writeFileSync(file, encodeRGBA(img));
export const blank = (W, H, bg = [246, 243, 236]) => { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { d[i * 4] = bg[0]; d[i * 4 + 1] = bg[1]; d[i * 4 + 2] = bg[2]; d[i * 4 + 3] = 255; } return { width: W, height: H, data: d }; };
export function onBg(img, bg = [246, 243, 236]) {
  const o = new Uint8ClampedArray(img.width * img.height * 4);
  for (let i = 0; i < img.width * img.height; i++) { const a = img.data[i * 4 + 3] / 255; for (let c = 0; c < 3; c++) o[i * 4 + c] = img.data[i * 4 + c] * a + bg[c] * (1 - a); o[i * 4 + 3] = 255; }
  return { width: img.width, height: img.height, data: o };
}
export function crop(img, x0, y0, w, h) {
  const o = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= img.width || Y >= img.height) continue; for (let c = 0; c < 4; c++) o[(y * w + x) * 4 + c] = img.data[(Y * img.width + X) * 4 + c]; }
  return { width: w, height: h, data: o };
}
// nearest-neighbour zoom by an integer factor (pixels stay pixels: the way a 48 px tile has to be looked at)
export function zoom(img, k) {
  const W = img.width * k, H = img.height * k, o = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4; for (let c = 0; c < 4; c++) o[(y * W + x) * 4 + c] = img.data[s + c]; }
  return { width: W, height: H, data: o };
}
export function paste(dst, src, x0, y0) {
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= dst.width || Y >= dst.height) continue;
    const s = (y * src.width + x) * 4, d = (Y * dst.width + X) * 4; for (let c = 0; c < 4; c++) dst.data[d + c] = src.data[s + c];
  }
}
// a 3 x 5 pixel font (upper case, digits and a little punctuation)
const FONT = { A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110", ".": "000000000000010", "/": "001001010100100", ":": "000010000010000", "-": "000000111000000", " ": "000000000000000", "=": "000111000111000", "+": "000010111010000", "(": "001010010010001", ")": "100010010010100", ",": "000000000010100", "%": "101001010100101", "<": "001010100010001", ">": "100010001010100", "*": "101010111010101", "'": "010010000000000", "_": "000000000000111" };
export function drawText(img, x0, y0, text, color = [40, 36, 44], k = 2) {
  let x = x0;
  for (const ch of String(text).toUpperCase()) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === "1") for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const X = x + c * k + dx, Y = y0 + r * k + dy; if (X >= 0 && Y >= 0 && X < img.width && Y < img.height) { const i = (Y * img.width + X) * 4; img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2]; img.data[i + 3] = 255; }
    }
    x += 4 * k;
  }
  return x;
}
export const textWidth = (text, k = 2) => String(text).length * 4 * k;
// a grid over an image (for reading coordinates off a painting): a line every `step` source pixels, a label every `label`
export function gridOver(img, k, step = 10, label = 50, x0 = 0, y0 = 0) {
  const o = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  const put = (x, y, c, a) => { if (x < 0 || y < 0 || x >= o.width || y >= o.height) return; const i = (y * o.width + x) * 4; for (let q = 0; q < 3; q++) o.data[i + q] = o.data[i + q] * (1 - a) + c[q] * a; };
  for (let sx = Math.ceil(x0 / step) * step; (sx - x0) * k < o.width; sx += step) { const X = (sx - x0) * k; for (let y = 0; y < o.height; y++) put(X, y, sx % label === 0 ? [255, 0, 255] : [0, 160, 255], sx % label === 0 ? 0.55 : 0.25); if (sx % label === 0) drawText(o, X + 2, 2, String(sx), [255, 0, 255], 1); }
  for (let sy = Math.ceil(y0 / step) * step; (sy - y0) * k < o.height; sy += step) { const Y = (sy - y0) * k; for (let x = 0; x < o.width; x++) put(x, Y, sy % label === 0 ? [255, 0, 255] : [0, 160, 255], sy % label === 0 ? 0.55 : 0.25); if (sy % label === 0) drawText(o, 2, Y + 2, String(sy), [255, 0, 255], 1); }
  return o;
}
