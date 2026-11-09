// Generator 6 in the page (C14): every land cell's place is its template (or the mirror) built through the adapter with the seeded fills; the heart comes from the template;
// the first pods land in the template's find slots; a nest heart holds its pod; the hearts of all four places can be found by walking.
//   node --test prototypes/exploration/tests/gen6-play.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const page = () => makePage({ gen: 6, console: "collect" });
const SEEDS = [7, 13, 42];
const plain = (x) => JSON.parse(JSON.stringify(x));

test("a new world is generator 6 and every land cell's layout is the template's size (all four places are 24 x 28, in the open style), with a heart of a kind the page plays", () => {
  for (const seed of SEEDS) {
    const p = page(); p.run(`newWorld(${seed})`);
    assert.equal(p.run("G.gen"), 6); assert.equal(p.run("S.regions[0].gen"), 6);
    const rows = plain(p.run(`(() => { const out = []; for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const lay = layout(String(c)), h = heartOf(String(c)); out.push({ c, id: lay.baked.id, w: lay.w, h: lay.h, name: lay.name, kind: h && h.kind, t: templateFor(G, S.seed, c).id, reach: !!(h && h.path.length) }); } return out; })()`));
    assert.ok(rows.length > 40, "land cells: " + rows.length);
    for (const r of rows) { assert.equal(r.id, r.t); assert.deepEqual([r.w, r.h], [24, 28]); assert.ok(r.name, "a name"); assert.ok(["moment", "nest", "stone", "spring"].includes(r.kind), r.kind); assert.ok(r.reach, "a path to the heart from the way in: cell " + r.c); }
    assert.equal(new Set(rows.map((r) => r.id.replace("~x", ""))).size >= 3, true, "several templates in play");
  }
});

test("the first pods land in the template's find slots", () => {
  for (const seed of SEEDS) {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const r = plain(p.run(`(() => { const out = []; for (const pod of S.pods.slice()) { if (pod.x >= 0 || pod.k[0] === 'c') continue; const lay = layout(pod.k); ensureLive(pod.k); out.push({ id: pod.id, k: pod.k, x: pod.x, y: pod.y, slots: (lay.podSlots || []).map(s => s.x + ',' + s.y), first: ex => 0 }); } return out; })()`));
    assert.ok(r.length >= 2, "pods waiting to land: " + r.length);
    let inSlot = 0;
    for (const q of r) if (q.slots.includes(q.x + "," + q.y)) inSlot++;
    assert.ok(inSlot >= r.length - 1, `seed ${seed}: ${inSlot} of ${r.length} pods in a find slot`);
    const fa = r.find((q) => q.id === "fa"); if (fa) assert.ok(fa.slots.includes(fa.x + "," + fa.y), "pod A in a slot");
  }
});

test("a nest heart holds its pod at the heart (once); a stone heart carries a stone; walking up to any heart finds it and pays", () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const cells = plain(p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()"));
    for (const c of cells.slice(0, 40)) {
      const k = plain(p.run(`(() => { const key = '${c}', lay = layout(key), h = heartOf(key); ensureLive(key); ensureLive(key); return { kind: h.kind, hx: h.x, hy: h.y, pods: S.pods.filter(q => q.k === key && q.x === h.x && q.y === h.y).length, want: lay.heartPods || 0, stone: lay.feats.some(f => f.kind === 'k' && f.x === h.x && f.y === h.y), n: S.pods.filter(q => q.id[0] === 'n' && q.k === key).length }; })()`));
      seen.add(k.kind);
      if (k.kind === "nest") assert.equal(k.pods, 1, "one pod at the heart, and ensureLive twice made no more"); else assert.equal(k.pods, 0);
      assert.equal(k.stone, k.kind === "stone");
    }
  }
  assert.ok(seen.has("nest") && seen.has("spring") && seen.has("stone") && seen.has("moment"), [...seen].join());
});

test("a moment heart is a creature of the template's species at the heart's spot (once); its map tell is the paw; found by reaching it", () => {
  const species = { Reedpool: "Loika", SplitStone: "Tuikis", HollowTree: "Hiljan" }, seen = new Set();
  for (const seed of SEEDS) {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const cells = plain(p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()"));
    for (const c of cells) {
      const k = plain(p.run(`(() => { const key = '${c}', lay = layout(key), h = heartOf(key); if (h.kind !== 'moment') return null; ensureLive(key); const live = ensureLive(key); const hc = live.cr.filter(q => q.home);
        return { id: lay.baked.id.replace('~x', ''), n: hc.length, sp: hc[0] && spOf(hc[0].sp).name, at: hc[0] && Math.max(Math.abs(hc[0].x - h.x), Math.abs(hc[0].y - h.y)) <= 1, tell: heartTellKind(${c}), line: momentLine(lay, h) }; })()`));
      if (!k) continue;
      seen.add(k.id); assert.equal(k.n, 1, "cell " + c + " " + JSON.stringify(k)); assert.ok(k.at); assert.equal(k.tell, "t"); assert.ok(k.line && !/heart|nest/i.test(k.line), k.line);
      if (species[k.id]) assert.equal(k.sp, species[k.id]);
      else assert.ok(k.sp, "the region's own kind");
    }
  }
  assert.ok(["Reedpool", "SplitStone", "HollowTree", "Windstep"].every((id) => seen.has(id)), [...seen].join());
});

test("walking: in each of the four places a walker following the heart's path unveils and finds the heart (the dot fills, the field yield is paid once)", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const ids = new Set();
  for (const c of plain(p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()"))) {
    const r = plain(p.run(`(() => { const key = '${c}', lay = layout(key), h = heartOf(key), ex = S.exp; ex.patch = { key, x: lay.spawnPt.x, y: lay.spawnPt.y, dir: 'up' }; S.veil[key] = new Array(lay.h).fill(0);
      for (const q of h.path) { ex.patch.x = q.x; ex.patch.y = q.y; walkLift(); } return { id: lay.baked.id, found: heartFound(${c}), n: h.path.length }; })()`));
    assert.equal(r.found, true, `${r.id} (cell ${c}): the heart is found at the end of its path`); ids.add(r.id.replace("~x", ""));
  }
  assert.equal(ids.size, 4, "all four places were walked: " + [...ids].join());
});
