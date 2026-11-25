// The fog's drifting puffs (#154): irregular blobs of the fog table's lightest tone, world-anchored Bayer dots, no straight sides.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as V from "../src/view.mjs";

const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], TILE = 48;

test("(a) no puff pixel is white: the tone is the fog table's lightest, and the page draws nothing else", () => {
  assert.notEqual(V.PUFF_TONE, "white");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const fn = html.slice(html.indexOf("function puffArt("), html.indexOf("// ====", html.indexOf("function puffArt(")));
  assert.ok(!/C\.white/.test(fn), "puffArt must not use C.white");
  assert.ok(/C\[PUFF_TONE\]/.test(fn));
});

test("(b) a puff's outline has no straight run longer than one tile on any side; sizes are 2 to 4 tiles", () => {
  for (const s of SEEDS) {
    const { w, h } = V.puffSize(s);
    assert.ok(w >= 2 * TILE && w <= 4 * TILE && h >= TILE && h <= 2 * TILE, `size ${w}x${h}`);
    const left = [], right = [], top = [], bot = [];
    for (let y = 0; y < h; y++) { let l = -1, r = -1; for (let x = 0; x < w; x++) if (V.puffShare(s, x, y) > 0) { if (l < 0) l = x; r = x; } left.push(l); right.push(r); }
    for (let x = 0; x < w; x++) { let t = -1, b = -1; for (let y = 0; y < h; y++) if (V.puffShare(s, x, y) > 0) { if (t < 0) t = y; b = y; } top.push(t); bot.push(b); }
    const run = (a) => { let best = 1, n = 1; for (let i = 1; i < a.length; i++) { if (a[i] === a[i - 1] && a[i] >= 0) n++; else n = 1; best = Math.max(best, n); } return best; };
    for (const [name, a] of [["left", left], ["right", right], ["top", top], ["bottom", bot]]) assert.ok(run(a) <= TILE, `seed ${s} ${name} run ${run(a)}`);
    assert.ok(V.puffShare(s, w >> 1, h >> 1) > V.puffShare(s, w >> 1, 2), "denser at the centre than near the rim");
  }
});

test("(c) a puff that moves k pixels leaves its dots on the same screen pixels (only the outline moves)", () => {
  for (const s of SEEDS.slice(0, 4)) for (const k of [1, 3, 5, 9]) {
    const { w, h } = V.puffSize(s), ox = 100, oy = 60;
    let both = 0;
    for (let sy = oy; sy < oy + h; sy++) for (let sx = ox; sx < ox + w; sx++) {
      const a = V.puffHit(s, ox, oy, sx, sy), b = V.puffHit(s, ox + k, oy, sx, sy);
      if (a && b) { both++; assert.ok(V.BAYER4[(sy & 3) * 4 + (sx & 3)] < V.puffShare(s, sx - ox, sy - oy)); }
      // a pixel lit in both frames sits on the same screen pixel; none is lit that the screen's own Bayer cell would not light at that density
      if (b) assert.ok(V.BAYER4[(sy & 3) * 4 + (sx & 3)] < V.puffShare(s, sx - ox - k, sy - oy));
    }
    assert.ok(both > 0);
  }
});
