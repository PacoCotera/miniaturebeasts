// The grass-to-scree edge sheet: 16 slots (NW*8+NE*4+SW*2+SE, upper = scree), the grass keyed to transparent, the scree kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePng } from '../src/png.mjs';

const dir = new URL('../../../art/places/sets/ninja-test/', import.meta.url);
const sheet = decodePng(readFileSync(new URL('over-scree-grass.png', dir)));
const set = JSON.parse(readFileSync(new URL('set.json', dir), 'utf8'));
const at = (x, y) => sheet.data[(y * sheet.w + x) * 4 + 3];

test('the sheet is 4 x 4 tiles of 16 px', () => {
  assert.equal(sheet.w, 64);
  assert.equal(sheet.h, 64);
});

test('each slot keeps scree in its upper corners and shows grass (transparent) in its lower corners', () => {
  const corners = [[8, 1, 1], [4, 14, 1], [2, 1, 14], [1, 14, 14]];   // bit, x, y inside the tile (one tile in from the corner)
  for (let m = 0; m < 16; m++) {
    const ox = (m % 4) * 16, oy = Math.floor(m / 4) * 16;
    for (const [bit, x, y] of corners) {
      const a = at(ox + x, oy + y);
      if (m & bit) assert.equal(a, 255, `slot ${m}: the ${bit} corner is scree (opaque)`);
      else assert.equal(a, 0, `slot ${m}: the ${bit} corner is grass (transparent)`);
    }
  }
});

test('slot 0 (all grass) is empty and the edge slots 1..14 hold both scree and grass', () => {
  const count = (m) => { let n = 0; const ox = (m % 4) * 16, oy = Math.floor(m / 4) * 16; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (at(ox + x, oy + y) > 0) n++; return n; };
  assert.equal(count(0), 0);
  for (let m = 1; m < 15; m++) { const n = count(m); assert.ok(n > 0 && n < 256, `slot ${m} opaque px ${n}`); }
});

test('the set draws scree over grass with this sheet and keeps the old sheet for the other lowers', () => {
  const over = set.layers.scree.over;
  const g = over.find((k) => k.lowers.includes('grass'));
  assert.deepEqual(g.sheets, ['over-scree-grass.png']);
  assert.deepEqual(over.filter((k) => k !== g).flatMap((k) => k.lowers).sort(), ['drygrass', 'litter', 'sand', 'turf', 'water']);
  assert.equal(new Set(over.map((k) => k.kind)).size, over.length, 'kind names are unique (rows are found by kind name)');
});
