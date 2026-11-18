// The light 3 px edge columns inside the south faces and corners (cliff-census-1 seam finding, cliff-fix-2): a piece's edge columns were lighter than its interior, so the pieces
// showed a light seam where they meet. The fixed pieces carry a recorded levels step in those columns (steps.json), and now their rock in the 3 edge columns is no lighter
// than the interior by more than STEP (luminance 0..255); the set's atlas holds the same pixels.
//   node --test prototypes/places/tests/cliff-seams.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../src/png.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), setDir = path.join(here, '../../../art/places/sets/ninja-test');
const STEP = 5;                       // edge lighter than the interior by more than this got the levels step (cliff-fix-2)
const FIXED = { 'cliff-corner-e-0': 'R', 'cliff-corner-w-0': 'L', 'cliff-corner-e-1': 'L', 'cliff-corner-e-2': 'R', 'cliff-corner-e-4': 'L', 'cliff-corner-w-1': 'R', 'cliff-corner-w-2': 'L',
  'cliff-corner-w-4': 'R', 'cliff-south-5': 'L', 'cliff-south-6': 'R' };
// light by 5..8 but left as signed: the set palette's rock greys are too far apart for any gain to bring these few edge pixels (a handful of pixels) nearer the interior, so no step was recorded
const LEFT_AS_SIGNED = ['cliff-south-4 R'];
const png = (f) => decodePng(readFileSync(path.join(setDir, f)));
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

// rock pixels = opaque and grey (green - red < 14). The rows are the rock rows of the 3 edge columns; interior = columns 6..w-7 over the same rows.
function edgeVsInterior(img, side) {
  const { w, h, data } = img, cols = side === 'L' ? [0, 1, 2] : [w - 3, w - 2, w - 1];
  const rock = (x, y) => { const i = (y * w + x) * 4; return data[i + 3] > 0 && data[i + 1] - data[i] < 14; };
  let y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) if (cols.some((x) => rock(x, y))) { y0 = Math.min(y0, y); y1 = y + 1; }
  let es = 0, en = 0, is = 0, inn = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    if (!rock(x, y)) continue; const v = lum(data, (y * w + x) * 4);
    if (cols.includes(x)) { es += v; en++; } else if (x >= 6 && x < w - 6) { is += v; inn++; }
  }
  return { edge: es / en, interior: is / inn, n: en };
}

for (const [k, side] of Object.entries(FIXED)) {
  test(`${k}: the ${side === 'L' ? 'left' : 'right'} edge columns are no lighter than the interior (step ${STEP})`, () => {
    const r = edgeVsInterior(png(k + '.png'), side);
    assert.ok(r.n > 100, 'enough rock in the edge columns');
    assert.ok(r.edge - r.interior <= STEP, `${k} ${side}: edge ${r.edge.toFixed(1)} vs interior ${r.interior.toFixed(1)}`);
  });
  test(`${k}: the fix is a recorded step list from the signed file (levels in the edge columns, then the snap)`, () => {
    const rec = JSON.parse(readFileSync(path.join(setDir, k + '.steps.json'), 'utf8')), ops = rec.steps.map((s) => s[0]);
    assert.deepEqual(ops, ['levels', 'snap']);
    assert.ok(rec.parent && rec.parent.ledger_id && rec.parent.sha256 === rec.source_sha256);
  });
}

test('every light edge in the south faces and corners is covered (the test pieces are the whole list of light edges over the step)', () => {
  for (const k of ['cliff-south-1', 'cliff-south-2', 'cliff-south-3', 'cliff-south-4', 'cliff-south-5', 'cliff-south-6', 'cliff-corner-e-0', 'cliff-corner-e-1', 'cliff-corner-e-2', 'cliff-corner-e-3',
    'cliff-corner-e-4', 'cliff-corner-w-0', 'cliff-corner-w-1', 'cliff-corner-w-2', 'cliff-corner-w-3', 'cliff-corner-w-4']) {
    const img = png(k + '.png');
    for (const side of ['L', 'R']) {
      let r; try { r = edgeVsInterior(img, side); } catch { continue; }
      if (!(r.n > 100)) continue;
      const limit = LEFT_AS_SIGNED.includes(k + ' ' + side) ? 8 : STEP;
      assert.ok(r.edge - r.interior <= limit, `${k} ${side} is still light: ${r.edge.toFixed(1)} vs ${r.interior.toFixed(1)}`);
    }
  }
});

test('the atlas holds the fixed pieces (sprites.png rect equals each file)', () => {
  const set = JSON.parse(readFileSync(path.join(setDir, 'set.json'), 'utf8')), atlas = png('sprites.png');
  for (const k of Object.keys(FIXED)) {
    const [rx, ry, rw, rh] = set.decals[k].rect, img = png(k + '.png');
    assert.equal(img.w, rw); assert.equal(img.h, rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const a = ((ry + y) * atlas.w + rx + x) * 4, b = (y * rw + x) * 4;
      assert.equal(atlas.data[a + 3] ? atlas.data.slice(a, a + 4).join() : '0', img.data[b + 3] ? img.data.slice(b, b + 4).join() : '0', `${k} pixel ${x},${y}`);
    }
  }
});
