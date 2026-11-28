// dusk-mesh-fix-5 (PR 563; owner bug #127 'grass tiles incorrect for the night', #120 trees chopped at night, #113 night darker): pins the dusk light.
//   node --test prototypes/places/tests/dusk-light.test.mjs
// The dusk (level 6) is one source (exploration/src/render/dusk.mjs): the veil over it is flat (no dither dots, no checker), the seen land is lighter than the unseen,
// trees keep their crowns (the seen land's colours are never snapped onto each other), and night (level 5) with the lamp circle is as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLight, lightState, tablesOf, renderGround, duskOf, duskLitOf } from '../src/ground.mjs';
import { blitPlaced } from '../src/sprites.mjs';
import { duskLitRgb, DUSK_LEAN, DUSK_LIT_STEP } from '../../exploration/src/render/dusk.mjs';
import { ts, place, pal, NIGHT, cells } from './render-helpers.mjs';
import { BAYER4 } from '../../exploration/src/view.mjs';

const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const T0 = tablesOf(ts);
// the page's colours as the places page builds them: the core 1..47, then the set's; only the colours the tests use are present (the set's palette fills every free index otherwise)
const full = (used) => pal.rgb.map((c, i) => (i === 0 || (i > 47 && !used.has(i)) ? undefined : c));
const win = { x: 0, y: 0, w: 300, h: 300 };
const draw = (k, remap) => { const b = new Uint8Array(win.w * win.h); blitPlaced(b, win, ts, 48, k, 150, 200, 0, remap); return b; };
const crownColours = () => { const s = new Set(); for (const k of [0, 1]) for (const v of draw(k, null)) if (v) s.add(v); return s; };

const size = 48, W = place.w * size, H = place.h * size, whole = { x: 0, y: 0, w: W, h: H };
const ground = renderGround(ts, place, size, whole);
const allOf = (v) => new Uint8Array(place.w * place.h).fill(v);
const duskSet = () => { const used = crownColours(); for (let i = 1; i < 48; i++) used.add(T0.dark[i]); for (const v of ground) if (v > 47) used.add(v); const rgb = full(used); ts.duskMap = duskOf(rgb, T0.dark); ts.duskLitMap = duskLitOf(rgb, ts.duskMap, T0.dark, []); return rgb; };

test('the dusk veil is flat: open land and water at dusk take one table and no dither (no pixel depends on its x, y)', () => {
  duskSet();
  const T = tablesOf(ts), buf = Uint8Array.from(ground);
  applyLight(buf, whole, size, ts, lightState(place, { veil: allOf(1), level: allOf(6) }), { nightIndex: NIGHT });
  let n = 0, differs = 0;
  const seen = new Map();
  for (let o = 0; o < buf.length; o++) {
    const c = ground[o]; if (!c) continue;
    n++;
    assert.equal(buf[o], T.dark[T.dusk[c]], `pixel ${o % W},${(o / W) | 0}: the dusk veil is the table's colour`);
    if (buf[o] !== c) differs++;
    const prev = seen.get(c); if (prev !== undefined) assert.equal(prev, buf[o], 'one colour, one result everywhere (no checker)'); else seen.set(c, buf[o]);
  }
  assert.ok(n > W * H / 2 && differs > n / 2, 'the veiled land drew and was tinted');
  assert.ok(![...seen.values()].includes(NIGHT) || [...seen.keys()].includes(NIGHT), 'no night dots are drawn into the dusk veil');
});

test('seen land at dusk is lighter than unseen land, and both are darker than midday', () => {
  const rgb = duskSet(), T = tablesOf(ts);
  const used = [...new Set(ground)].filter((c) => c && rgb[c]);
  assert.ok(used.length > 5);
  let lighter = 0, seenAvg = 0, unseenAvg = 0, dayAvg = 0;
  for (const c of used) {
    const lit = lum(duskLitRgb(rgb[c], rgb[T.dark[40]] || rgb[T.dark[T.dark[40]]])), unseen = lum(pal.rgb[T.dark[T.dusk[c]]]);
    seenAvg += lit; unseenAvg += unseen; dayAvg += lum(rgb[c]); if (lit >= unseen) lighter++;
  }
  assert.ok(seenAvg > unseenAvg, `seen ${seenAvg / used.length} lighter than unseen ${unseenAvg / used.length}`);
  assert.ok(seenAvg < dayAvg, 'seen land at dusk is under midday');
  assert.ok(lighter >= used.length * 0.8, `${lighter} of ${used.length} colours are lighter seen than unseen`);
});

test('trees keep their crowns at dusk (#120 class): the seen land never snaps two crown colours onto one, and the crown stays drawn', () => {
  const rgb = duskSet(), T = tablesOf(ts), amber = rgb[T.dark[40]];
  const crown = [...crownColours()];
  assert.ok(crown.length >= 8, 'the broad crown has its colours');
  // the exact map: each colour is its own new colour, so the crown's shades stay apart (the snapped dusk table merges some: that is the #120 loss)
  const lit = new Set(crown.map((c) => duskLitRgb(rgb[c], amber).join()));
  assert.equal(lit.size, crown.length, 'every crown colour has its own seen-land colour');
  assert.ok(lit.size > new Set(crown.map((c) => T.dusk[c])).size, 'more crown colours than the snapped unseen table keeps');
  // the map the places view carries: distinct sources never share an index, none is 0, and every crown pixel is still drawn
  const map = T.duskLit, got = new Map();
  for (const c of crown) { assert.ok(map[c] > 0, `crown colour ${c} is never erased`); const p = got.get(map[c]); if (p !== undefined && map[c] !== T.dusk[c]) assert.fail(`colours ${p} and ${c} share ${map[c]}`); got.set(map[c], c); }
  for (const k of [0, 1]) assert.equal(draw(k, T.duskLit).filter((v) => v).length, draw(k, null).filter((v) => v).length, 'no crown pixel lost');
});

test('the lean and the lit step are the shared source: duskOf and duskLitOf follow dusk.mjs', () => {
  const rgb = duskSet(), T = tablesOf(ts), extra = [];
  const lit = duskLitOf(rgb, T.dusk, T.dark, extra), amber = rgb[T.dark[40]];
  assert.equal(DUSK_LEAN, 0.1); assert.equal(DUSK_LIT_STEP, 0.2);
  assert.ok(extra.length > 0);
  for (const e of extra) { const src = [...lit.keys()].find((i) => lit[i] === e.index); assert.deepEqual(e.rgb, duskLitRgb(rgb[src], amber)); }
});

test('night (level 5) and the lamp circle are as they were: night dots in the veil, the level light inside the lifted disc', () => {
  duskSet();
  const T = tablesOf(ts), far = cells(place, (x, y) => (x - 8) ** 2 + (y - 10) ** 2 > 5.5 * 5.5);
  const buf = Uint8Array.from(ground);
  applyLight(buf, whole, size, ts, lightState(place, { veil: far, level: allOf(5) }), { nightIndex: NIGHT });
  for (let cy = 0; cy < place.h; cy++) for (let cx = 0; cx < place.w; cx++) {
    const ring = [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => far[Math.min(place.h - 1, Math.max(0, cy + dy)) * place.w + Math.min(place.w - 1, Math.max(0, cx + dx))]));
    const core = Math.hypot(cx - 8, cy - 10) <= 2.5;
    if (!ring && !core) continue;
    for (let y = cy * size; y < cy * size + size; y++) for (let x = cx * size; x < cx * size + size; x++) {
      const c = ground[y * W + x]; if (!c) continue;
      const base = T.night[c];
      assert.equal(buf[y * W + x], ring ? (BAYER4[(y & 3) * 4 + (x & 3)] < 4 ? NIGHT : T.dark[base]) : base, `${cx},${cy}`);
    }
  }
});
