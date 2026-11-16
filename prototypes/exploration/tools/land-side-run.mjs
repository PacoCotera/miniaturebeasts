// land-b3c: the longest straight side wall of a seed's window in a rasters file (land-measure --out), as world tiles
//   node land-side-run.mjs <rasters.json> <seed>
import { readFileSync } from 'node:fs';
const [file, seedS] = process.argv.slice(2), r = JSON.parse(readFileSync(file, 'utf8')).find(v => v.seed === +seedS), { w, h, raised, gx0, gy0 } = r;
const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : raised[y * w + x] === '1' ? 1 : 0);
let best = { n: 0 };
for (let x = 1; x < w - 1; x++) for (const dx of [-1, 1]) for (let y = 1; y < h - 1;) {
  if (!(R(x, y) && !R(x + dx, y))) { y++; continue; }
  let y1 = y; while (y1 < h - 1 && R(x, y1) && !R(x + dx, y1)) y1++;
  if (y1 - y > best.n) best = { n: y1 - y, x: gx0 + x, y0: gy0 + y, y1: gy0 + y1 - 1, dx };
  y = y1;
}
console.log(JSON.stringify({ seed: +seedS, ...best, mid: [best.x, (best.y0 + best.y1) >> 1] }));
