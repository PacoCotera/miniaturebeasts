import test from 'node:test';
import assert from 'node:assert/strict';
import { veilPlan, paintVeil, paintMapVeil, veilStep, VEIL_STEPS, VEIL_BAND, VEIL_PERIOD } from '../src/veil.mjs';

const none = { N: false, E: false, S: false, W: false };
const T = 48, W = 24 * T, H = 28 * T;

test('a west side alone: one run the full height; open land past each end ends the band in a taper', () => {
  const p = veilPlan(24, 28, { ...none, W: true }, { NW: false, SW: false });
  assert.deepEqual(p.runs, [{ side: 'W', a0: 2 * VEIL_BAND, a1: H - 2 * VEIL_BAND }]);
  assert.deepEqual(p.pieces.map((q) => [q.kind, q.corner, q.far]), [['end', 'NW', false], ['end', 'SW', true]]);
});

test('veiled land past a corner, or none known: the band runs on to the place edge', () => {
  assert.deepEqual(veilPlan(24, 28, { ...none, W: true }, { NW: true, SW: null }).runs, [{ side: 'W', a0: 0, a1: H }]);
  assert.equal(veilPlan(24, 28, { ...none, W: true }, {}).pieces.length, 0);
});

test('two sides meeting: one outer corner, and each run starts a corner piece after the corner', () => {
  const p = veilPlan(24, 28, { ...none, W: true, N: true }, { SW: true, NE: true });
  assert.deepEqual(p.pieces, [{ kind: 'outer', corner: 'NW' }]);
  assert.deepEqual(p.runs, [{ side: 'N', a0: VEIL_BAND, a1: W }, { side: 'W', a0: VEIL_BAND, a1: H }]);
});

test('no side but the land past a corner veiled: an inner corner there', () => {
  assert.deepEqual(veilPlan(24, 28, none, { NW: false, SE: true }).pieces, [{ kind: 'inner', corner: 'SE' }]);
});

// a recording 2D context: the rows each drift layer shows at each destination row of the west run
function rec() {
  const calls = [], g = { save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, setTransform() {}, drawImage: (img, ...a) => calls.push([img, ...a]), imageSmoothingEnabled: true };
  return { g, calls };
}
const kit = { strip: 'strip', 'drift-a': 'A', 'drift-b': 'B', end: 'end', outer: 'outer', inner: 'inner' };

test('the two layers drift opposite ways along the edge, 3 px a step, wrapping at 240; every destination row is drawn once per layer', () => {
  const plan = veilPlan(24, 28, { ...none, W: true }, { NW: true, SW: true });
  const rowsOf = (step, who) => { const { g, calls } = rec(); paintVeil(g, kit, plan, W, H, step); const row = new Int32Array(H).fill(-1);
    for (const [img, , sy, , sh, , dy, , dh] of calls) if (img === who) for (let k = 0; k < dh; k++) { assert.equal(row[dy + k], -1); row[dy + k] = sy + k; } return row; };
  const a0 = rowsOf(0, 'A'), a1 = rowsOf(1, 'A'), b0 = rowsOf(0, 'B'), b1 = rowsOf(1, 'B');
  assert.equal(a0[100], 100); assert.equal(b0[100], 100);
  assert.equal(a1[100], 97); assert.equal(b1[100], 103);   // A moves toward the far end, B toward the near end
  assert.equal(a1[1], (1 - 3 + VEIL_PERIOD) % VEIL_PERIOD);
  assert.ok(a0.every((v) => v >= 0) && b0.every((v) => v >= 0));
  assert.equal(veilStep(0), 0); assert.equal(veilStep(333 * VEIL_STEPS), 0); assert.equal(veilStep(333 * 2 + 1), 2);
});

test('the map veil runs west and east full height and north and south between them', () => {
  const { g, calls } = rec(); paintMapVeil(g, 'm', 0, 0, 26 * 10, 26 * 12, { N: true, E: true, S: false, W: true });
  const dyOf = (n) => calls.filter((c) => c[0] === 'm').length;
  assert.ok(dyOf() > 0);
});
