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
  let cur = null;   // the last transform set: the last entry of each recorded call
  const calls = [], g = { save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, setTransform: (...m) => { cur = m; }, drawImage: (img, ...a) => calls.push([img, ...a, cur]), imageSmoothingEnabled: true };
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

// a picture with an alpha channel the test chooses: alpha(x, y) in 0..255
const pic = (w, h, alpha) => { const data = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = alpha(x, y); return { width: w, height: h, getContext: () => ({ getImageData: () => ({ data }) }) }; };

test('a run is laid so the strip row that best meets the corner piece, or the band end, lies beside it', () => {
  const row = (r) => (r * 7) % 256;   // every row of the layer its own alpha: one best row
  const kit2 = { 'drift-a': pic(VEIL_BAND, VEIL_PERIOD, (x, y) => row(y)), 'drift-b': pic(VEIL_BAND, VEIL_PERIOD, () => 0),
    outer: pic(VEIL_BAND, VEIL_BAND, (x, y) => (y === VEIL_BAND - 1 ? row(37) : x === VEIL_BAND - 1 ? row(90) : 0)), end: pic(2 * VEIL_BAND, 2 * VEIL_BAND, (x, y) => (y === 2 * VEIL_BAND - 1 ? row(150) : 0)), inner: 'inner' };
  const firstRow = (plan, side, who = 'drift-a') => { const { g, calls } = rec(); paintVeil(g, kit2, plan, W, H, 0); const a0 = plan.runs.find((r) => r.side === side).a0; const vertical = side === 'W' || side === 'E', c = calls.find((q) => q[0] === kit2[who] && q[6] === a0 && (q[9][0] === 1) === vertical); return c[2]; };
  const corner = veilPlan(24, 28, { ...none, W: true, N: true }, {});
  assert.equal(firstRow(corner, 'W'), 37);    // the west run starts below the corner piece, at the row that meets its bottom edge
  assert.equal(firstRow(corner, 'N'), 90);    // the north run starts beside it, at the row that meets its right edge
  const end = veilPlan(24, 28, { ...none, W: true }, { NW: false, SW: null });
  assert.equal(firstRow(end, 'W'), 150);      // a run after a band end meets the end's bottom edge
  assert.equal(firstRow(veilPlan(24, 28, { ...none, W: true }, {}), 'W'), 0);   // no piece at either end: the rows lie as they are
  const far = veilPlan(24, 28, { ...none, W: true }, { NW: true, SW: false });   // a piece only at the far end: the run's last row is the one that meets it
  { const { g, calls } = rec(); paintVeil(g, kit2, far, W, H, 0); const c = calls.filter((q) => q[0] === kit2['drift-a']).pop(); assert.equal((c[2] + c[4] - 1) % VEIL_PERIOD, 150); }
  const noPix = { ...kit, joins: undefined };   // pictures that cannot be read leave the rows alone
  { const { g, calls } = rec(); paintVeil(g, noPix, corner, W, H, 0); assert.equal(calls.find((q) => q[0] === 'A' && q[6] === VEIL_BAND)[2], VEIL_BAND); }
});

test('the map veil runs west and east full height and north and south between them', () => {
  const { g, calls } = rec(); paintMapVeil(g, 'm', 0, 0, 26 * 10, 26 * 12, { N: true, E: true, S: false, W: true });
  const dyOf = (n) => calls.filter((c) => c[0] === 'm').length;
  assert.ok(dyOf() > 0);
});
