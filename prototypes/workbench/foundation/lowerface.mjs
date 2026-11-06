// The lower face sheet (fix round 8): the master, fix 7 and fix 8 side by side at 304 (3x) and 96 (6x) on a 10 px grid, the AD's pixel numbers (ad-review-fix7, section 4 and
// ad-fix7-crops/measure.py) read off the three pictures the same way, in the master's frame (each build laid on the master by the middle of its eyes). The fix 7 picture is
// the build at fc80e5312 at H/S 0.47, rendered from that commit's own code (tiles-fix7/).
import path from "node:path";
import { loadImage, crop, zoom } from "./imgtools.mjs";
import { irisCentres, screenMeasures } from "./headcontract.mjs";
import { sheet } from "./page.mjs";
import { makeTile, masterOf } from "./sheets.mjs";
import { RESULTS } from "./paths.mjs";

const cream = (img, x, y) => { if (x < 0 || y < 0 || x >= img.width || y >= img.height) return false; const i = (y * img.width + x) * 4, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]; return img.data[i + 3] > 200 && r > 150 && r - b > 15 && (r + g + b) / 3 > 150; };
const leftAt = (img, y) => { for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > 128) return x; return null; };
const lum = (img, x, y) => { const i = (y * img.width + x) * 4; return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]; };
// the AD's numbers on one 304 picture, in the master's frame: `m` is the master's iris centres (the frame), null for the master itself
export function lowerNumbers(img, frame = null) {
  const I = irisCentres(img), sx = frame ? Math.round(((frame.far.x + frame.near.x) - (I.far.x + I.near.x)) / 2) : 0, sy = frame ? Math.round(((frame.far.y + frame.near.y) - (I.far.y + I.near.y)) / 2) : 0;
  const front = (y) => { const v = leftAt(img, y - sy); return v === null ? null : v + sx; }, cr = (x, y) => cream(img, x - sx, y - sy);
  const down = (x, y0) => { for (let y = y0; y < 300; y++) if (cr(x, y)) return y; return null; }, right = (y) => { for (let x = 0; x < 304; x++) if (cr(x, y)) return x; return null; };
  let area = 0; for (let y = 120; y < 300; y++) for (let x = 0; x < 304; x++) if (cr(x, y)) area++;
  let under = 0; for (let y = 178; y < 195; y++) for (let x = 121; x < 151; x++) if (cr(x, y)) under++;
  const sm = screenMeasures(img), tip = Math.min(...[150, 154, 158, 162, 166].map((y) => front(y) ?? 999)), ring = front(130);
  const rows = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];
  return { shift: [sx, sy], front, rows, tip, ring, forwardRow: sm.forward.y - sy, area, under, edge100: down(100, 172), edge110: down(110, 172), bib218: right(218), bib250: right(250), leg: [226, 242, 250].map(front) };
}
// a grid over a zoomed crop, no text (a label in a 3 x 5 pixel font is not readable at 1x; the sheet's caption says where the grid starts): a light line every 10 source pixels, a heavy one every 50
const gridOver = (img, k, step, label, x0, y0) => {
  const o = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  const put = (x, y, c, a) => { if (x < 0 || y < 0 || x >= o.width || y >= o.height) return; const i = (y * o.width + x) * 4; for (let q = 0; q < 3; q++) o.data[i + q] = o.data[i + q] * (1 - a) + c[q] * a; };
  for (let sx = Math.ceil(x0 / step) * step; (sx - x0) * k < o.width; sx += step) { const X = (sx - x0) * k, h = sx % label === 0; for (let y = 0; y < o.height; y++) put(X, y, h ? [255, 0, 255] : [0, 160, 255], h ? 0.55 : 0.25); }
  for (let sy = Math.ceil(y0 / step) * step; (sy - y0) * k < o.height; sy += step) { const Y = (sy - y0) * k, h = sy % label === 0; for (let x = 0; x < o.width; x++) put(x, Y, h ? [255, 0, 255] : [0, 160, 255], h ? 0.55 : 0.25); }
  return o;
};
const f0 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "-" : String(Math.round(v)));
const lines = (n, name, sub, master) => {
  const m = master, fr = (y) => f0(n.front(y)), err = master ? Math.sqrt(n.rows.reduce((a, y) => a + (n.front(y) - m.front(y)) ** 2, 0) / n.rows.length) : null;
  const L = [[name, "name"], [sub, "dim"]];
  L.push([`Front outline x at y 178, 194, 210: ${fr(178)}, ${fr(194)}, ${fr(210)} (AD: 29, 48, 59)`, n.front(178) !== null && (Math.abs(n.front(178) - 29) > 4 || Math.abs(n.front(194) - 48) > 4 || Math.abs(n.front(210) - 59) > 4) ? "bad" : "dim"]);
  L.push([`Lobe tip x ${f0(n.tip)} at row ${f0(n.forwardRow)} (AD: x 20, row 155 to 165); far ring's outline x ${f0(n.ring)}`, n.forwardRow < 155 || n.forwardRow > 165 ? "bad" : "dim"]);
  L.push([`Far leg's front x at y 226, 242, 250: ${n.leg.map(f0).join(", ")} (AD: 52, 46, 44)`, "dim"]);
  L.push([`Bib's front x at y 218 and 250: ${f0(n.bib218)} and ${f0(n.bib250)} (AD: 65, 85)`, Math.abs(n.bib218 - 65) > 6 || Math.abs(n.bib250 - 85) > 8 ? "bad" : "dim"]);
  L.push([`Bib's near edge at x 100 and 110, first cream under y 172: y ${f0(n.edge100)} and ${f0(n.edge110)} (AD: 180 +- 5, 186 +- 6); cream right of x 120 above y 195: ${n.under} px`, Math.abs(n.edge100 - 180) > 5 ? "bad" : "dim"]);
  L.push([`Cream area ${n.area} px (AD: ${m ? m.area : "9846"} +- 10 %)`, m && Math.abs(n.area / m.area - 1) > 0.1 ? "bad" : "dim"]);
  if (err !== null) L.push([`Front outline against the master, y 100 to 190: ${err.toFixed(1)} px rms (AD: 5 or less)`, err > 5 ? "bad" : "dim"]);
  return L;
};
export function lowerFaceSheet(house, spec, outDir) {
  const M = masterOf("S01"), mI = irisCentres(M[304]), t8 = makeTile(house, spec, { label: "fix 8", sizes: [304, 96] });
  const f7 = { 304: loadImage(path.join(RESULTS, "tiles-fix7", "fix7-hs47-304x312.png")), 96: loadImage(path.join(RESULTS, "tiles-fix7", "fix7-hs47-96x88.png")) };
  const num = { m: lowerNumbers(M[304]), a: lowerNumbers(f7[304], mI), b: lowerNumbers(t8.r[304], mI) };
  const box = [0, 115, 200, 160], pic304 = (img, n, shift = n.shift) => { const c = crop(img, box[0] - shift[0], box[1] - shift[1], box[2], box[3]); return gridOver(zoom(c, 3), 3, 10, 50, box[0], box[1]); };
  const pic96 = (img, s304) => { const sx = Math.round(s304[0] * 0.276), sy = Math.round(s304[1] * 0.276), c = crop(img, 0 - sx, 24 - sy, 72, 48); return gridOver(zoom(c, 6), 6, 10, 50, 0, 24); };
  const cells = [
    { pics: [[{ img: pic304(M[304], num.m) }], [{ img: pic96(M[96], num.m.shift) }]], lines: lines(num.m, "Master Loika", "Signed art; the frame the numbers are read in", null) },
    { pics: [[{ img: pic304(f7[304], num.a) }], [{ img: pic96(f7[96], num.a.shift) }]], lines: lines(num.a, "Fix 7 at H/S 0.47", "Commit fc80e5312, its own code", num.m) },
    { pics: [[{ img: pic304(t8.r[304], num.b) }], [{ img: pic96(t8.r[96], num.b.shift) }]], lines: lines(num.b, "Fix 8 at H/S 0.47", "The build now", num.m) },
  ];
  return { spec: sheet("The lower face: the master, fix 7 and fix 8 at 304 (3x) and 96 (6x), on a 10 px grid", cells, 3, { cellW: 600, note: "The two builds are laid on the master by the middle of their eyes; the grid is in the master's own pixels (x from 0, y from 115 at 304; y from 24 at 96), a heavy line every 50. The AD's numbers are read off each picture the same way, by the code of measure.py's mask (cream: opaque, red over 150, red over blue by 15, mean over 150)." }), num, tile: t8 };
}
