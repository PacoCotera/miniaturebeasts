// The specks at the cliff foot (cliff-census-1): the end caps and the foot overlays under the end pieces carried bits painted apart from the rock (leaf rings, scraps, a rock chip) that floated in the grass.
// After the touch-up each of these images is one body, plus any part that touches its top or bottom row (those join the piece above or below), and the set's atlas holds the same pixels.
//   node --test prototypes/places/tests/cliff-specks.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../src/png.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), setDir = path.join(here, '../../../art/places/sets/ninja-test');
const KINDS = ['cliff-corner-e-5', 'cliff-corner-w-5', 'cliff-end1-e', 'cliff-end1-w', 'cliff-end2-e', 'cliff-end2-w', 'cliff-foot-e', 'cliff-foot-w'];
const png = (f) => decodePng(readFileSync(path.join(setDir, f)));

// the connected parts of the opaque pixels (8 neighbours): [{ n, y0, y1 }]
function parts(img) {
  const { w, h, data } = img, seen = new Uint8Array(w * h), out = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !data[s * 4 + 3]) continue;
    const st = [s]; seen[s] = 1; let n = 0, y0 = h, y1 = -1;
    while (st.length) {
      const i = st.pop(), x = i % w, y = (i / w) | 0; n++; y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (!seen[j] && data[j * 4 + 3]) { seen[j] = 1; st.push(j); }
      }
    }
    out.push({ n, y0, y1 });
  }
  return out.sort((a, b) => b.n - a.n);
}

for (const k of KINDS) {
  test(`${k}: no part floats apart from the rock`, () => {
    const img = png(k + '.png'), ps = parts(img), loose = ps.slice(1).filter((p) => p.y0 > 0 && p.y1 < img.h - 1);
    assert.deepEqual(loose, [], `${k} has ${loose.length} loose part(s)`);
  });
}

test('the atlas holds the touched-up pieces (the set\'s sprites.png rect equals each file)', () => {
  const set = JSON.parse(readFileSync(path.join(setDir, 'set.json'), 'utf8')), atlas = png('sprites.png');
  for (const k of KINDS) {
    const [rx, ry, rw, rh] = set.decals[k].rect, img = png(k + '.png');
    assert.equal(img.w, rw); assert.equal(img.h, rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const a = ((ry + y) * atlas.w + rx + x) * 4, b = (y * rw + x) * 4;
      assert.equal(atlas.data[a + 3] ? atlas.data.slice(a, a + 4).join() : '0', img.data[b + 3] ? img.data.slice(b, b + 4).join() : '0', `${k} pixel ${x},${y}`);
    }
  }
});
