import test from 'node:test';
import assert from 'node:assert/strict';
import { standNudge, STAND_NUDGE, crownAt } from '../src/standnudge.mjs';
import { CROWN } from '../src/standlip.mjs';

// a 6x5 land: raised everywhere but the south-west corner (low); steep = the ring (raised, a low cell beside) and the face/flank (low)
const w = 6, h = 5, raised = (x, y) => !(x < 3 && y >= 3);
const steep = new Uint8Array(w * h);
for (const [x, y] of [[0, 2], [1, 2], [2, 2], [3, 3], [3, 4]]) steep[y * w + x] = 1;   // ring on the north lip (row 2) and the east lip (column 3)
const lay = { w, h, steep, raisedFn: raised };

test('a pawn beside the lip ring is drawn nearer it, toward the ring only', () => {
  assert.deepEqual(standNudge(lay, 1, 1), [0, 0]);   // drop to the SOUTH: the lip is the ring below (a mound drawn over the ring's top): no nudge
  assert.deepEqual(standNudge(lay, 4, 3), [-STAND_NUDGE, 0]);   // the ring is to the west
  assert.deepEqual(standNudge(lay, 4, 4), [-STAND_NUDGE, 0]);
  assert.deepEqual(standNudge(lay, 5, 3), [0, 0]);   // two tiles from the ring: none
});

test('north drop: the ring is above the pawn', () => {
  const l = { w: 3, h: 4, steep: Uint8Array.from([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]), raisedFn: (x, y) => y >= 1 };
  assert.deepEqual(standNudge(l, 1, 2), [0, -STAND_NUDGE]);
});

test('the nudge is small: it never reaches the ring tile (stop gap stays under the 48 px tile)', () => {
  assert.ok(STAND_NUDGE > 0 && STAND_NUDGE < 24);
});

// a drawn crown as a pixel probe: grass left of the edge column ex(dy) (a diagonal edge when ex changes with dy), face right of it
const edge = (ex) => (dx, dy) => dx < ex(dy);

test('diagonal east edge: the nudged foot row stays on crown grass, the row under it too', () => {
  const grass = edge(dy => 9 - dy);   // the edge runs back a pixel a row: the foot row's grass ends at x 8, the row under it at x 7
  const [nx, ny] = standNudge(lay, 4, 3, edge(() => 100));   // plenty of grass: the full nudge (west ring here)
  assert.deepEqual([nx, ny], [-STAND_NUDGE, 0]);
  const l = { w: 6, h: 3, steep: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]), raisedFn: () => true };   // the ring on the east, column 4
  const [ex] = standNudge(l, 3, 1, grass);
  assert.ok(ex > 0 && ex < STAND_NUDGE, `clamped to ${ex}`);
  assert.ok(grass(ex, 0) && grass(ex, 1));   // the foot pixel and the one under it on grass
  assert.ok(!(grass(ex + 1, 0) && grass(ex + 1, 1)), 'one more px would leave the grass');
  assert.deepEqual(standNudge(l, 3, 1, edge(dy => 2 - dy)), [0, 0]);   // the edge already at his feet (grass under the foot, face one pixel on): no nudge at all
  assert.deepEqual(standNudge(l, 3, 1, edge(() => 100)), [STAND_NUDGE, 0]);   // with grass all the way: unchanged
  assert.deepEqual(standNudge(l, 3, 1, edge(() => -50)), [0, 0]);   // the data does not vouch for even his own spot: no nudge (cliff-stand-3: never the floating one)
});

// cliff-stand-3: the same clamp from the pieces' tile data (src/standlip.mjs), with no light or screen input at all
const run = (s) => { const r = []; let x = 0; for (const [, c, n] of s.matchAll(/([tgx])(\d+)/g)) { r.push([c, x, x + +n]); x += +n; } return r; };
test('crownAt: the last-drawn opaque piece decides; transparent shows the ground; no row data is rock; a non-crown piece draws nothing', () => {
  const kind = Object.keys(CROWN).find(k => k.startsWith('cliff-corner-e-4'));
  assert.ok(kind, 'the corner piece has a table');
  const p = CROWN[kind], ds = [{ kind, x0: 100, y0: 200, w: p.w, h: p.h }];
  assert.equal(crownAt([], 5, 5), 'g');
  assert.equal(crownAt(ds, 99, 200), 'g');   // outside the piece: open ground
  assert.equal(crownAt([{ kind: 'cliff-foot-3', x0: 0, y0: 0, w: 72, h: 192 }], 5, 5), 'g');   // a foot overlay is no crown
  assert.equal(crownAt(ds, 100, 200 + 200), 'x');   // under the kept rows: the face, rock
  const rows = p.rows.map(run);
  for (const y of [40, 60, 80, 100]) for (let x = 0; x < p.w; x++) {   // every pixel agrees with the runs, whatever the light
    const c = rows[y].find(([, a, b]) => x >= a && x < b)[0];
    assert.equal(crownAt(ds, 100 + x, 200 + y), c === 'x' ? 'x' : 'g');
  }
  const over = [...ds, { kind: 'cliff-south-1', x0: 100, y0: 200, w: 48, h: 288 }];   // a later piece over it decides where it is opaque
  const t = CROWN['cliff-south-1'].rows.map(run);
  for (let x = 0; x < 48; x++) { const c = t[50].find(([, a, b]) => x >= a && x < b)[0]; if (c !== 't') assert.equal(crownAt(over, 100 + x, 250), c === 'x' ? 'x' : 'g'); }
});

test('a pawn on a real corner piece stops where the crown ends, the same by day, night and storm (no light input)', () => {
  const kind = 'cliff-corner-e-4', p = CROWN[kind], ds = [{ kind, x0: 0, y0: 0, w: p.w, h: p.h }];
  const l = { w: 4, h: 3, steep: Uint8Array.from([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]), raisedFn: () => true };   // the ring on the east, column 2: he stands on column 1
  const rows = p.rows.map(run), yy = rows.findIndex(r => r.some(([c]) => c === 'x') && r.some(([c]) => c === 'g'));   // a row where the crown ends inside the piece
  assert.ok(yy > 0, 'a crown edge row exists');
  const foot = 20, probe = (dx, dy) => crownAt(ds, foot + dx, yy + dy) === 'g';
  const a = standNudge(l, 1, 1, probe), b = standNudge(l, 1, 1, probe);   // the same call again: nothing but the tile data enters
  assert.deepEqual(a, b);
  assert.ok(a[0] >= 0 && a[0] <= STAND_NUDGE);
  assert.ok(probe(a[0], 0) && probe(a[0], 1), 'his foot row and the one under it stay on grass');
  if (a[0] < STAND_NUDGE) assert.ok(!(probe(a[0] + 1, 0) && probe(a[0] + 1, 1)), 'one more px would leave the grass');
});

test('src/standlip.mjs is what tools/standlip-gen.mjs makes from the piece files (a repaint must be followed by the script)', async (t) => {
  let gen; try { gen = await import('../tools/standlip-gen.mjs'); } catch (e) { return t.skip('pngjs is not installed here'); }
  const tree = new URL('../../..', import.meta.url).pathname;
  assert.deepEqual(gen.crownTable(tree), CROWN, 'run: node prototypes/exploration/tools/standlip-gen.mjs <tree>');
});

test('west, north and south nudges are those of cliff-stand-1 when the ground under his feet is grass', () => {
  const all = () => true;
  assert.deepEqual(standNudge(lay, 1, 1, all), [0, 0]);
  assert.deepEqual(standNudge(lay, 4, 3, all), [-STAND_NUDGE, 0]);
  const n = { w: 3, h: 4, steep: Uint8Array.from([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]), raisedFn: (x, y) => y >= 1 };
  assert.deepEqual(standNudge(n, 1, 2, all), [0, -STAND_NUDGE]);
});

test('no pawn on a steep tile and nothing without a raised land', () => {
  assert.deepEqual(standNudge(lay, 0, 2), [0, 0]);
  assert.deepEqual(standNudge({ w, h, steep }, 1, 1), [0, 0]);
});
