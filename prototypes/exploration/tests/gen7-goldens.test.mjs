// Generator 7, chunk G2: the goldens the art director looks at (3 windows of 3 x 3 cells at 16 px, 2 frames at 48 px straddling cell borders), compared by decoded pixels.
// MB_UPDATE_GOLDENS=1 rewrites them on purpose; a human (the art director) looks at every changed one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { goldenImages } from '../tools/gen7-goldens.mjs';
import { decodePng, encodePng } from '../../places/src/png.mjs';

const dir = new URL('./golden/gen7-g2/', import.meta.url).pathname;

test('the six G2 goldens match', { timeout: 300000 }, () => {
  const imgs = goldenImages();
  assert.equal(imgs.length, 6);
  if (process.env.MB_UPDATE_GOLDENS) { mkdirSync(dir, { recursive: true }); for (const { name, img } of imgs) writeFileSync(dir + name, encodePng(img)); return; }
  for (const { name, img } of imgs) {
    assert.ok(existsSync(dir + name), name + ' is missing');
    const want = decodePng(readFileSync(dir + name));
    assert.equal(img.w, want.w, name + ' width'); assert.equal(img.h, want.h, name + ' height');
    assert.ok(Buffer.from(img.data).equals(Buffer.from(want.data)), name + ': pixels differ');
  }
});
