// The all-cases map (place design A5 test 2): a small binary terrain map ('1' = the pair's upper terrain) whose interior dual tiles show all
// 16 corner indices and every legal horizontal and vertical neighbour pair. Found once by a seeded search and committed as src/allcases.json.
//   node find-allcases.mjs [--check]     (--check: the committed map still covers everything)
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cornerIndex } from '../src/dualgrid.mjs';
import { legalAdjacencies } from '../src/seams.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'src', 'allcases.json');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function coverOf(cells, w, h) {
  const inUp = (v) => v === 1;
  const ci = (i, j) => cornerIndex(cells, w, h, i, j, inUp);
  const idx = new Set(), horiz = new Set(), vert = new Set();
  for (let j = 1; j < h; j++) for (let i = 1; i < w; i++) {
    const a = ci(i, j);
    idx.add(a);
    if (i + 1 < w) horiz.add(a * 16 + ci(i + 1, j));
    if (j + 1 < h) vert.add(a * 16 + ci(i, j + 1));
  }
  return { idx, horiz, vert };
}
export function missing(cells, w, h) {
  const need = legalAdjacencies();
  const c = coverOf(cells, w, h);
  let n = 0;
  for (let k = 0; k < 16; k++) if (!c.idx.has(k)) n++;
  for (const a of need.horiz) if (!c.horiz.has(a)) n++;
  for (const a of need.vert) if (!c.vert.has(a)) n++;
  return n;
}

export function search(w, h, seed) {
  const rnd = mulberry32(seed);
  const cells = new Uint8Array(w * h);
  for (let k = 0; k < cells.length; k++) cells[k] = rnd() < 0.5 ? 1 : 0;
  let best = missing(cells, w, h);
  for (let it = 0; it < 400000 && best > 0; it++) {
    const k = (rnd() * cells.length) | 0;
    cells[k] ^= 1;
    const m = missing(cells, w, h);
    if (m <= best) best = m; else cells[k] ^= 1;
  }
  return { cells, missing: best };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--check')) {
  const m = JSON.parse(readFileSync(file, 'utf8'));
  const cells = Uint8Array.from(m.rows.join('').split('').map(Number));
  const left = missing(cells, m.w, m.h);
  console.log(left === 0 ? 'all-cases map covers everything' : `all-cases map misses ${left}`);
  process.exit(left === 0 ? 0 : 1);
}
if (isMain && !process.argv.includes('--check')) {
  const w = 20, h = 20;
  let seed = 1, r;
  for (;; seed++) { r = search(w, h, seed); if (r.missing === 0) break; }
  const rows = [];
  for (let y = 0; y < h; y++) rows.push(Array.from(r.cells.slice(y * w, (y + 1) * w)).join(''));
  writeFileSync(file, JSON.stringify({ note: 'all-cases map for the seam proofs; 1 = the pair\'s upper terrain; found by tools/find-allcases.mjs', seed, w, h, rows }, null, 1) + '\n');
  console.log(`found with seed ${seed}`);
}
