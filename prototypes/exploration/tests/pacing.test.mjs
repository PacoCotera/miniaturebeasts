// Pacing (walk slice W§8, W§9, C16): the walk-to-the-heart bot of tools/realm-run.mjs (--pace) on generator 6, and the geometry of the eight places.
//   node --test prototypes/exploration/tests/pacing.test.mjs      the numbers: node prototypes/exploration/tools/realm-run.mjs --pace
import { test } from "node:test";
import assert from "node:assert/strict";
import { paceRun, PACE_SEEDS } from "../tools/realm-run.mjs";
import { newPage } from "../tools/walker.mjs";

test("the bot walks to the heart of the places on seeds 7, 13, 42: tell within 10 steps, heart within 40 actions, the whole place within 100, and home again", () => {
  for (const seed of PACE_SEEDS) {
    const r = paceRun(seed, { places: 3 });
    assert.equal(r.places, 3, "seed " + seed); assert.equal(r.home, true);
    for (const v of r.visits) {
      assert.ok(v.heart != null && v.heart <= 40, `seed ${seed} ${v.id}: heart at ${v.heart}`);
      assert.ok(v.tell != null && v.tell <= 10, `seed ${seed} ${v.id}: tell at ${v.tell}`);
      assert.ok(v.whole != null && v.whole <= 100, `seed ${seed} ${v.id}: whole place at ${v.whole}`);
    }
  }
});

test("a 3-minute walk (one place and home) is within W§9's 100-130 actions at the most", () => {
  for (const seed of PACE_SEEDS) { const r = paceRun(seed, { places: 1 }); assert.ok(r.total <= 130, `seed ${seed}: ${r.total}`); assert.ok(r.total >= 15, `seed ${seed}: ${r.total}`); }
});

// W§8: from any opening, the heart's tell is within TELL_R of the arrival tile or of the first 10 steps (shortest walk through the open ground), and the heart is found within about 40 steps.
test("every place, from every side: the tell shows within 10 steps of arriving and the heart is found within 40", () => {
  const seen = new Set();
  for (const seed of [7, 13, 42, 1, 2, 3, 4, 5, 6, 8, 9, 10]) {
    const p = newPage(seed); p.key("confirm"); p.key("confirm");
    for (const c of p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && passable(c)) out.push(c); return out; })()")) {
      const id = p.run(`layout('${c}').baked.id`); if (seen.has(id)) continue; seen.add(id);
      const rows = JSON.parse(JSON.stringify(p.run(`(() => { const key = '${c}', lay = layout(key), h = heartOf(key), out = []; ensureLive(key);
        for (const dir of ['up', 'down', 'left', 'right']) { const e = entryPoint(lay, key, dir), E = e.y * lay.w + e.x, par = new Map([[E, null]]), q = [E];
          for (let i = 0; i < q.length; i++) { const x = q[i] % lay.w, y = (q[i] / lay.w) | 0; for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const X = x + dx, Y = y + dy, k = Y * lay.w + X;
            if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h || par.has(k) || !lay.reach[k] || T_BLOCK[lay.tiles[k]]) continue; par.set(k, q[i]); q.push(k); } }
          let to = -1; for (const k of q) { const x = k % lay.w, y = (k / lay.w) | 0; if (Math.abs(x - h.x) + Math.abs(y - h.y) <= 1) { to = k; break; } }
          const path = []; for (let k = to; k != null; k = par.get(k)) path.unshift(k);
          let tell = -1; path.forEach((k, i) => { if (tell < 0 && tellShows(h, { x: k % lay.w, y: (k / lay.w) | 0 })) tell = i; });
          out.push({ dir, tell, walk: path.length - 1 }); }
        return out; })()`)));
      for (const r of rows) { assert.ok(r.tell >= 0 && r.tell <= 10, `${id} from ${r.dir}: tell at step ${r.tell}`); assert.ok(r.walk <= 40, `${id} from ${r.dir}: ${r.walk} steps to the heart`); }
    }
  }
  assert.ok(seen.size >= 8, "all eight places: " + [...seen].join());
});
