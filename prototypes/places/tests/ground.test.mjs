// C6: the ground pass, the light and veil pass, the shared animation clock, palette cycles, the half-scale view, and the render goldens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tileSlot, renderGround, renderView, renderHalfView, lightState, applyLight, tablesOf, GroundCache, applyCycles, HALF_W, HALF_H } from '../src/ground.mjs';
import { cameraFor } from '../src/camera.mjs';
import { compareGolden } from '../src/golden.mjs';
import { ts, place, NIGHT, toImage, goldenFile, cells } from './render-helpers.mjs';
import { BAYER4 } from '../../exploration/src/view.mjs';

const VIEW = { w: 450, h: 532 };
const W48 = place.w * 48, H48 = place.h * 48;
const T = tablesOf(ts);
const winAt = (c, size = 48) => ({ x: c.x, y: c.y, w: VIEW.w, h: VIEW.h, size });
const cam = (px, py) => cameraFor(VIEW, { pw: W48, ph: H48 }, { x: px, y: py });
const golden = (name, buf, w, h) => { const r = compareGolden(goldenFile(name), toImage(buf, w, h)); assert.ok(r.ok, r.message); };

test('animated tiles take their frame from the one clock, static tiles never change', () => {
  const animated = ts.tiles.map((t, id) => [t, id]).filter(([t]) => t.frames.length > 1);
  assert.ok(animated.length >= 2, 'the all-water tiles are animated');
  for (const [t, id] of animated) {
    assert.equal(tileSlot(ts, id, 0), t.frames[0]);
    assert.equal(tileSlot(ts, id, t.frameMs), t.frames[1]);
    assert.equal(tileSlot(ts, id, t.frameMs - 1), t.frames[0]);
    assert.equal(tileSlot(ts, id, t.frames.length * t.frameMs), t.frames[0], 'the clock wraps');
    assert.equal(tileSlot(ts, id, 2 * t.frameMs), t.frames[2 % t.frames.length]);
  }
  const still = ts.tiles.findIndex((t) => t.frames.length === 1);
  assert.equal(tileSlot(ts, still, 123456), ts.tiles[still].frames[0]);
  assert.ok(new Set(animated.map(([t]) => t.frameMs)).size === 1, 'one step for every animated tile');
});

test('the ground is complete (no hole) at 48 and 24 px, and a window shows what the whole place shows', () => {
  for (const size of [48, 24]) {
    const w = place.w * size, h = place.h * size;
    const full = renderGround(ts, place, size, { x: 0, y: 0, w, h });
    assert.equal(full.indexOf(0), -1, `size ${size}: a pixel with no ground`);
    const ww = Math.min(450, w), hh = Math.min(532, h);
    for (const win of [{ x: 0, y: 0, w: ww, h: hh }, { x: w - ww, y: h - hh, w: ww, h: hh }, { x: 101 >> (size === 24 ? 1 : 0), y: 203 >> (size === 24 ? 1 : 0), w: 333 >> (size === 24 ? 1 : 0), h: 300 }, { x: 0, y: h - 100, w: 200, h: 100 }]) {
      const part = renderGround(ts, place, size, win);
      for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) assert.equal(part[y * win.w + x], full[(y + win.y) * w + x + win.x], `${size}: ${x},${y}`);
    }
  }
});

test('the ground cache redoes pass 1 only when the window or an animated frame changes', () => {
  const c = new GroundCache(ts, place, 48);
  const win = { x: 10, y: 20, w: 450, h: 532 };
  c.get(win, 0); c.get(win, 10); c.get(win, 200);
  assert.equal(c.redone, 1, 'same window, same frame');
  c.get({ ...win, x: 11 }, 200);
  assert.equal(c.redone, 2, 'the camera crossed a pixel');
  c.get({ ...win, x: 11 }, 260);
  assert.equal(c.redone, 3, 'the water changed frame (250 ms)');
  c.get({ ...win, x: 11 }, 270);
  assert.equal(c.redone, 3);
});

const farFrom = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 > r * r;

test('the veil: a lifted disc is clear in its core, veiled outside, dithered at the edge, and never shows more than the per-tile rule', () => {
  for (const size of [48, 24]) {
    const w = place.w * size, h = place.h * size, win = { x: 0, y: 0, w, h };
    const ground = renderGround(ts, place, size, win);
    const veil = cells(place, farFrom(8, 10, 5.5));
    const buf = Uint8Array.from(ground);
    applyLight(buf, win, size, ts, lightState(place, { veil }), { nightIndex: NIGHT });
    let mixed = 0;
    for (let cy = 0; cy < place.h; cy++) for (let cx = 0; cx < place.w; cx++) {
      let same = 0, veiled = 0, n = 0;
      for (let y = cy * size; y < (cy + 1) * size; y++) for (let x = cx * size; x < (cx + 1) * size; x++) {
        const o = y * w + x, c = ground[o], expect = BAYER4[(y & 3) * 4 + (x & 3)] < 4 ? NIGHT : T.dark[c];
        n++;
        if (buf[o] === c) same++;
        if (buf[o] === expect) veiled++;
      }
      const ringFar = [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => veil[Math.min(place.h - 1, Math.max(0, cy + dy)) * place.w + Math.min(place.w - 1, Math.max(0, cx + dx))]));
      if (ringFar) assert.equal(veiled, n, `${size}: veiled cell ${cx},${cy} is veiled whole`);
      else if (Math.hypot(cx - 8, cy - 10) <= 2.5) assert.equal(same, n, `${size}: the core cell ${cx},${cy} is clear`);
      if (same !== n && veiled !== n) mixed++;
    }
    assert.ok(mixed >= 10, `${size}: the disc's edge is dithered over ${mixed} cells`);
    // an all-clear state changes nothing
    const clear = Uint8Array.from(ground);
    applyLight(clear, win, size, ts, lightState(place, { veil: new Uint8Array(place.w * place.h) }));
    assert.ok(Buffer.compare(clear, ground) === 0, 'an all-clear veil changes no pixel');
  }
});

test('the fog bank: beyond sight the land takes the fog table, inside it the clear light', () => {
  const win = { x: 0, y: 0, w: W48, h: H48 };
  const ground = renderGround(ts, place, 48, win);
  const fog = cells(place, farFrom(8, 10, 4.5));
  const buf = Uint8Array.from(ground);
  applyLight(buf, win, 48, ts, lightState(place, { fog }), { nightIndex: NIGHT });
  let foggedCells = 0;
  for (let cy = 0; cy < place.h; cy++) for (let cx = 0; cx < place.w; cx++) {
    const ring = [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => fog[Math.min(place.h - 1, Math.max(0, cy + dy)) * place.w + Math.min(place.w - 1, Math.max(0, cx + dx))]));
    if (!ring) continue;    // a fogged cell beside clear ones dithers into them
    foggedCells++;
    for (let y = cy * 48; y < cy * 48 + 48; y++) for (let x = cx * 48; x < cx * 48 + 48; x++) assert.equal(buf[y * W48 + x], T.fog[ground[y * W48 + x]]);
  }
  assert.ok(foggedCells > 100);
  assert.equal(buf[(10 * 48 + 24) * W48 + 8 * 48 + 24], ground[(10 * 48 + 24) * W48 + 8 * 48 + 24], 'the sight centre is clear');
});

test('the storm: cells under it take the storm table and the clear column beside it steps into it over 6 px with the Bayer dither', () => {
  for (const size of [48, 24]) {
    const w = place.w * size, h = place.h * size, win = { x: 0, y: 0, w, h };
    const ground = renderGround(ts, place, size, win);
    const level = new Uint8Array(place.w * place.h);
    for (let y = 0; y < place.h; y++) for (let x = 0; x < 4; x++) level[y * place.w + x] = 1;
    const buf = Uint8Array.from(ground);
    applyLight(buf, win, size, ts, lightState(place, { level }));
    for (let y = 0; y < h; y += 5) for (let x = 0; x < 4 * size; x += 3) assert.equal(buf[y * w + x], T.storm[ground[y * w + x]]);
    let stepped = 0, plainNear = 0;
    for (let y = 0; y < h; y++) for (let lx = 0; lx < size; lx++) {
      const x = 4 * size + lx, o = y * w + x, d = lx * (48 / size);
      if (buf[o] !== ground[o]) { stepped++; assert.ok(d < 6, `${size}: a storm pixel ${d} px from the band`); assert.equal(buf[o], T.storm[ground[o]]); }
      else if (d < 3) plainNear++;
    }
    assert.ok(stepped > 100 && plainNear > 100, `${size}: stepped ${stepped}, clear near the band ${plainNear}`);
    for (let y = 0; y < h; y += 7) for (let x = 5 * size; x < w; x += 11) assert.equal(buf[y * w + x], ground[y * w + x]);
  }
});

test('palette cycling rotates the named range by the steps of the clock and leaves the rest alone', () => {
  const rgb = Array.from({ length: 256 }, (_, i) => [i, i, i]);
  const cycles = [{ first: 100, count: 4, stepMs: 200 }];
  assert.deepEqual(applyCycles(rgb, cycles, 0), rgb);
  const one = applyCycles(rgb, cycles, 200);
  assert.deepEqual(one.slice(100, 104), [[101, 101, 101], [102, 102, 102], [103, 103, 103], [100, 100, 100]]);
  assert.deepEqual(one.slice(0, 100), rgb.slice(0, 100));
  assert.deepEqual(one.slice(104), rgb.slice(104));
  assert.deepEqual(applyCycles(rgb, cycles, 800), rgb, 'a full turn');
  assert.equal(rgb[100][0], 100, 'the input is untouched');
});

test('the half-scale view is the whole place at 24 px in 432 x 528', () => {
  const half = renderHalfView(ts, place);
  assert.equal(HALF_W, 432); assert.equal(HALF_H, 528);
  assert.equal(half.length, HALF_W * HALF_H);
  assert.ok(Buffer.compare(half, renderView(ts, place, 24, { x: 0, y: 0, w: 432, h: 528 })) === 0);
  assert.equal(half.indexOf(0), -1);
});

test('golden: the fixture place at three camera spots (top left, the pond, bottom right)', () => {
  const spots = {
    'view-top-left': cam(0, 0),
    'view-pond': cam(6 * 48 + 24, 9 * 48 + 24),
    'view-bottom-right': cam(W48, H48),
  };
  for (const [name, c] of Object.entries(spots)) {
    const win = { x: c.x, y: c.y, w: VIEW.w, h: VIEW.h };
    golden(`${name}.png`, renderView(ts, place, 48, win, { light: lightState(place), nightIndex: NIGHT }), VIEW.w, VIEW.h);
  }
});

test('golden: veiled with a lifted disc, the storm edge, the canopy cut-out under a stub pawn, water at frames 0 and 2, the half-scale view', () => {
  const win = { x: 0, y: 0, w: VIEW.w, h: VIEW.h };
  // veil: a lifted disc round the explorer at (6, 7)
  const veil = cells(place, farFrom(6, 7, 4.5));
  golden('veil-disc.png', renderView(ts, place, 48, win, { light: lightState(place, { veil }), nightIndex: NIGHT }), VIEW.w, VIEW.h);
  // storm edge: the three columns on the left are under the band
  const level = new Uint8Array(place.w * place.h);
  for (let y = 0; y < place.h; y++) for (let x = 0; x < 3; x++) level[y * place.w + x] = 1;
  golden('storm-edge.png', renderView(ts, place, 48, win, { light: lightState(place, { level }), nightIndex: NIGHT }), VIEW.w, VIEW.h);
  // canopy cut-out: a stub pawn stands behind the tree on (3, 3); the crown is dithered round it and solid elsewhere
  const pawn = { x: 3 * 48 + 24, y: 3 * 48 - 10 };
  const stub = { sortY: pawn.y + 30, x: pawn.x, draw: (buf, w) => { for (let y = 0; y < 34; y++) for (let x = 0; x < 20; x++) { const px = pawn.x - 10 + x - w.x, py = pawn.y - 6 + y - w.y; if (px >= 0 && py >= 0 && px < w.w && py < w.h) buf[py * w.w + px] = NIGHT + 4; } } };
  const under = renderView(ts, place, 48, win, { actors: [stub], pawns: [pawn] });
  const clear = renderView(ts, place, 48, win, { actors: [stub] });
  assert.notDeepEqual(under, clear, 'the cut-out changes the crown');
  golden('canopy-cutout.png', under, VIEW.w, VIEW.h);
  // water at frames 0 and 2 of the shared clock (250 ms a frame)
  const pondWin = { x: 24, y: 150, w: VIEW.w, h: VIEW.h };
  const f0 = renderView(ts, place, 48, pondWin, { clockMs: 0 }), f2 = renderView(ts, place, 48, pondWin, { clockMs: 500 });
  assert.notDeepEqual(f0, f2, 'the water moves');
  assert.ok(Buffer.compare(renderView(ts, place, 48, pondWin, { clockMs: 1000 }), f0) === 0, 'four frames at 250 ms: a second is one turn');
  golden('water-frame-0.png', f0, VIEW.w, VIEW.h);
  golden('water-frame-2.png', f2, VIEW.w, VIEW.h);
  // the half-scale whole view, with the same disc lifted
  golden('half-view.png', renderHalfView(ts, place, { light: lightState(place, { veil }), nightIndex: NIGHT }), HALF_W, HALF_H);
});
