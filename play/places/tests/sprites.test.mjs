// C6: the sprite list, props' remap by anchor cell, and the canopy pass with the pawn's cut-out (place design A4.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortItems, propItems, drawItems, blitPlaced, canopyPass, cutOut, CUT_RADIUS } from '../src/sprites.mjs';
import { tablesOf } from '../src/ground.mjs';
import { BAYER4 } from '../../exploration/src/view.mjs';
import { ts, place, kindIndex } from './render-helpers.mjs';

const W48 = place.w * 48, H48 = place.h * 48;
const whole = { x: 0, y: 0, w: W48, h: H48 };

test('the sorted list orders by foot y, then x, and equal keys keep their order', () => {
  const mk = (sortY, x, tag) => ({ sortY, x, tag });
  const out = sortItems([mk(50, 9, 'a'), mk(10, 40, 'b'), mk(50, 3, 'c'), mk(10, 40, 'd'), mk(10, 2, 'e')]);
  assert.deepEqual(out.map((i) => i.tag), ['e', 'b', 'd', 'c', 'a']);
});

test('a prop takes the remap of the cell under its anchor', () => {
  const T = tablesOf(ts);
  const asked = [];
  const items = propItems(ts, place, 48, { remapAt: (cx, cy) => { asked.push([cx, cy]); return cx === 3 && cy === 3 ? T.storm : null; } });
  assert.equal(items.length, place.props.length);
  // every prop asked for exactly the cell its foot stands in
  assert.deepEqual(asked.slice().sort(), place.props.map((p) => [Math.floor(p.x / 48), Math.floor(p.y / 48)]).sort());
  // the tree on (3, 3) is drawn through the storm table, the others are not
  const tree = place.props.find((p) => Math.floor(p.x / 48) === 3 && Math.floor(p.y / 48) === 3);
  const plain = new Uint8Array(W48 * H48), stormed = new Uint8Array(W48 * H48);
  blitPlaced(plain, whole, ts, 48, tree.kind, tree.x, tree.y);
  const one = items.find((i) => i.x === tree.x && i.sortY === tree.sortY);
  one.draw(stormed, whole);
  let n = 0;
  for (let i = 0; i < plain.length; i++) { assert.equal(stormed[i], plain[i] ? T.storm[plain[i]] : 0); if (plain[i]) n++; }
  assert.ok(n > 500, 'the tree drew ' + n + ' pixels');
  const other = items.find((i) => i !== one);
  const a = new Uint8Array(W48 * H48), b = new Uint8Array(W48 * H48);
  other.draw(a, whole);
  const p2 = place.props.find((p) => p.x === other.x && p.sortY === other.sortY);
  blitPlaced(b, whole, ts, 48, p2.kind, p2.x, p2.y);
  assert.deepEqual(a, b, 'a prop in a clear cell is drawn as it is');
});

test('props on cells the survey veil hides are not drawn', () => {
  const none = propItems(ts, place, 48, { visible: () => false });
  assert.equal(none.length, 0);
  const some = propItems(ts, place, 48, { visible: (cx, cy) => !(cx === 3 && cy === 3) });
  assert.equal(some.length, place.props.length - 1);
});

test('a window draws what the whole place draws at the same pixels (clip at every edge)', () => {
  const full = new Uint8Array(W48 * H48);
  drawItems(full, whole, sortItems(propItems(ts, place, 48)));
  for (const win of [{ x: 0, y: 0, w: 450, h: 532 }, { x: 414, y: 524, w: 450, h: 532 }, { x: 100, y: 37, w: 450, h: 532 }, { x: 0, y: 524, w: 450, h: 532 }]) {
    const buf = new Uint8Array(win.w * win.h);
    drawItems(buf, win, sortItems(propItems(ts, place, 48)));
    for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) assert.equal(buf[y * win.w + x], full[(y + win.y) * W48 + x + win.x]);
  }
});

test('the cut-out drops exactly the canopy pixels within 22 px of the pawn where the Bayer matrix is below 8, and nothing else', () => {
  const tree = place.props.find((p) => ts.sprites[p.kind].kind === 'tree-broad');
  const crownKind = ts.sprites[tree.kind].canopy;
  assert.ok(crownKind >= 0);
  const pawn = { x: tree.x, y: tree.y - 60 };                       // behind the trunk, inside the crown
  const base = new Uint8Array(W48 * H48), cut = new Uint8Array(W48 * H48);
  canopyPass(base, whole, ts, { props: [tree], canopy: [] }, 48, {});
  canopyPass(cut, whole, ts, { props: [tree], canopy: [] }, 48, { pawns: [pawn] });
  let inDisc = 0, dropped = 0;
  for (let y = 0; y < H48; y++) for (let x = 0; x < W48; x++) {
    const i = y * W48 + x, inside = (x - pawn.x) ** 2 + (y - pawn.y) ** 2 < CUT_RADIUS ** 2, lowBayer = BAYER4[(y & 3) * 4 + (x & 3)] < 8;
    if (base[i] && inside) inDisc++;
    if (base[i] && inside && lowBayer) { assert.equal(cut[i], 0, `pixel ${x},${y} should be dropped`); dropped++; }
    else assert.equal(cut[i], base[i], `pixel ${x},${y} should stay`);
  }
  assert.ok(inDisc > 200, 'the disc covers crown pixels: ' + inDisc);
  assert.ok(dropped / inDisc > 0.4 && dropped / inDisc < 0.6, 'about half: ' + dropped / inDisc);
});

test('a pawn away from every canopy changes nothing, and a canopy of a prop and a free piece both draw, the crown first', () => {
  const base = new Uint8Array(W48 * H48), far = new Uint8Array(W48 * H48);
  canopyPass(base, whole, ts, place, 48, {});
  canopyPass(far, whole, ts, place, 48, { pawns: [{ x: 100, y: 700 }] });
  assert.ok(Buffer.compare(far, base) === 0, 'a pawn clear of every crown changes no pixel');
  assert.ok(place.canopy.length >= 1 && place.props.some((p) => ts.sprites[p.kind].canopy >= 0));
  const freeOnly = new Uint8Array(W48 * H48);
  canopyPass(freeOnly, whole, ts, { props: [], canopy: place.canopy }, 48, {});
  assert.ok(freeOnly.some((v) => v) && base.filter((v) => v).length > freeOnly.filter((v) => v).length);
});

test('at 24 px the cut-out disc is 11 px and the same matrix applies', () => {
  const f = cutOut(24, [{ x: 480, y: 480 }]);                       // centre (240, 240) at 24 px
  assert.equal(f(240, 240), BAYER4[0] < 8);
  assert.equal(f(240 + 11, 240), false, 'on the radius is outside');
  assert.equal(f(240 + 30, 240), false);
  let n = 0, hit = 0;
  for (let y = 225; y < 256; y++) for (let x = 225; x < 256; x++) { if ((x - 240) ** 2 + (y - 240) ** 2 < 121) { n++; if (f(x, y)) hit++; } }
  assert.ok(hit / n > 0.4 && hit / n < 0.6);
  assert.equal(cutOut(48, []), null);
});
