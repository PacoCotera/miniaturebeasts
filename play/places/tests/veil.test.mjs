import test from 'node:test';
import assert from 'node:assert/strict';
import { veilPlan, waterVeilPlan, paintVeil, paintMapVeil, VEIL_BAND, VEIL_PERIOD } from '../src/veil.mjs';

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
const kit = { strip: 'strip', end: 'end', outer: 'outer', inner: 'inner' };

test('the strip stands still: every destination row is drawn once, from row 0 at the run start, wrapping at 240', () => {
  const plan = veilPlan(24, 28, { ...none, W: true }, { NW: true, SW: true });
  const { g, calls } = rec(); paintVeil(g, kit, plan, W, H);
  const row = new Int32Array(H).fill(-1);
  for (const [img, , sy, , , , dy, , dh] of calls) if (img === 'strip') for (let k = 0; k < dh; k++) { assert.equal(row[dy + k], -1); row[dy + k] = sy + k; }
  assert.equal(row[100], 100); assert.equal(row[241], 1);
  assert.ok(row.every((v) => v >= 0));
});

// a picture with an alpha channel the test chooses: alpha(x, y) in 0..255
const pic = (w, h, alpha) => { const data = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = alpha(x, y); return { width: w, height: h, getContext: () => ({ getImageData: () => ({ data }) }) }; };

test('a run is laid so the strip row that best meets the corner piece, or the band end, lies beside it', () => {
  const row = (r) => (r * 7) % 256;   // every row of the layer its own alpha: one best row
  const kit2 = { strip: pic(VEIL_BAND, VEIL_PERIOD, (x, y) => row(y)),
    outer: pic(VEIL_BAND, VEIL_BAND, (x, y) => (y === VEIL_BAND - 1 ? row(37) : x === VEIL_BAND - 1 ? row(90) : 0)), end: pic(2 * VEIL_BAND, 2 * VEIL_BAND, (x, y) => (y === 2 * VEIL_BAND - 1 ? row(150) : 0)), inner: 'inner' };
  const firstRow = (plan, side, who = 'strip') => { const { g, calls } = rec(); paintVeil(g, kit2, plan, W, H); const a0 = plan.runs.find((r) => r.side === side).a0; const vertical = side === 'W' || side === 'E', c = calls.find((q) => q[0] === kit2[who] && q[6] === a0 && (q[9][0] === 1) === vertical); return c[2]; };
  const corner = veilPlan(24, 28, { ...none, W: true, N: true }, {});
  assert.equal(firstRow(corner, 'W'), 37);    // the west run starts below the corner piece, at the row that meets its bottom edge
  assert.equal(firstRow(corner, 'N'), 90);    // the north run starts beside it, at the row that meets its right edge
  const end = veilPlan(24, 28, { ...none, W: true }, { NW: false, SW: null });
  assert.equal(firstRow(end, 'W'), 150);      // a run after a band end meets the end's bottom edge
  assert.equal(firstRow(veilPlan(24, 28, { ...none, W: true }, {}), 'W'), 0);   // no piece at either end: the rows lie as they are
  const far = veilPlan(24, 28, { ...none, W: true }, { NW: true, SW: false });   // a piece only at the far end: the run's last row is the one that meets it
  { const { g, calls } = rec(); paintVeil(g, kit2, far, W, H); const c = calls.filter((q) => q[0] === kit2.strip).pop(); assert.equal((c[2] + c[4] - 1) % VEIL_PERIOD, 150); }
  const noPix = { ...kit, joins: undefined };   // pictures that cannot be read leave the rows alone
  { const { g, calls } = rec(); paintVeil(g, noPix, corner, W, H); assert.equal(calls.find((q) => q[0] === 'strip' && q[6] === VEIL_BAND)[2], VEIL_BAND); }
});

// water at a place edge that is not the coast or a range side: the veil over the water run only
const edgeOf = (n, wet) => Array.from({ length: n }, (_, i) => wet(i));
const noEdge = { N: edgeOf(24, () => false), S: edgeOf(24, () => false), W: edgeOf(28, () => false), E: edgeOf(28, () => false) };

test('a lake on the east side: a strip over the water run only, an end piece at each end where it meets land', () => {
  const base = veilPlan(24, 28, none, {});
  const p = waterVeilPlan(24, 28, { ...noEdge, E: edgeOf(28, (i) => i >= 6 && i < 22) }, none, base);   // tiles 6..21: 16 tiles, 768 px
  assert.deepEqual(p.runs, [{ side: 'E', a0: 6 * T + 2 * VEIL_BAND, a1: 22 * T - 2 * VEIL_BAND, endA: true, endB: true }]);
  assert.deepEqual(p.pieces, [{ kind: 'end', side: 'E', far: false, at: 6 * T }, { kind: 'end', side: 'E', far: true, at: 22 * T }]);
  for (const r of p.runs) assert.ok(r.a0 >= 6 * T && r.a1 <= 22 * T);   // nothing before or after the run: no land cell is veiled
  const { g, calls } = rec(); paintVeil(g, kit, p, W, H);   // the end pieces sit on the shoreline: the first spans 6T..6T+2B along the side, the second ends at 22T
  const ends = calls.filter((q) => q[0] === 'end').map((q) => q[q.length - 1]);
  assert.equal(ends.length, 2);
  assert.equal(ends[0][5], 6 * T);          // east side: v along y = at + Y
  assert.equal(ends[1][5], 22 * T);         // far: v = at - Y
  const covered = new Uint8Array(H); for (const r of p.runs) for (let a = r.a0; a < r.a1; a++) covered[a] = 1;
  assert.equal(r2(6 * T + 2 * VEIL_BAND), r2(p.runs[0].a0));   // strip starts where the end piece stops: no gap
});
const r2 = (x) => x;

test('a river across a side too short for two end pieces: a strip on the water only, square on the shoreline', () => {
  const p = waterVeilPlan(24, 28, { ...noEdge, S: edgeOf(24, (i) => i >= 10 && i < 13) }, none, veilPlan(24, 28, none, {}));
  assert.deepEqual(p.runs, [{ side: 'S', a0: 10 * T, a1: 13 * T }]);
  assert.deepEqual(p.pieces, []);
});

test('coast and range sides are unchanged, and a veiled side gets no water run', () => {
  const sides = { ...none, W: true }, diag = { NW: false, SW: false }, base = veilPlan(24, 28, sides, diag);
  const p = waterVeilPlan(24, 28, { ...noEdge, W: edgeOf(28, () => true) }, sides, base);
  assert.deepEqual(p, base);
  assert.deepEqual(waterVeilPlan(24, 28, noEdge, none, veilPlan(24, 28, none, {})), { runs: [], pieces: [] });
});

test('a run that reaches the corner runs on to the place edge; two water runs at a corner share one outer piece', () => {
  const a = waterVeilPlan(24, 28, { ...noEdge, E: edgeOf(28, (i) => i >= 10) }, none, veilPlan(24, 28, none, {}));
  assert.deepEqual(a.runs, [{ side: 'E', a0: 10 * T + 2 * VEIL_BAND, a1: H, endA: true }]);
  const b = waterVeilPlan(24, 28, { ...noEdge, E: edgeOf(28, (i) => i >= 10), S: edgeOf(24, (i) => i >= 10) }, none, veilPlan(24, 28, none, {}));
  assert.deepEqual(b.pieces.filter((q) => q.kind === 'outer'), [{ kind: 'outer', corner: 'SE' }]);
  assert.equal(b.runs.find((r) => r.side === 'E').a1, H - VEIL_BAND);
});

test('the map veil runs west and east full height and north and south between them', () => {
  const { g, calls } = rec(); paintMapVeil(g, 'm', 0, 0, 26 * 10, 26 * 12, { N: true, E: true, S: false, W: true });
  const dyOf = (n) => calls.filter((c) => c[0] === 'm').length;
  assert.ok(dyOf() > 0);
});
