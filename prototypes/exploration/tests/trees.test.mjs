// Tree kinds (src/world.mjs treeKindAt and placeTrees; the page's wiring): the kind rule per region kind, a fruit tree's shake and its bloom, a hollow
// trunk as the hole a shy one hides in, the Shade place, the Woods and Shade on the map, and an old save's walked places (tests/fixtures/old-save-walked.json).
//   node --test prototypes/exploration/tests/trees.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { genWorld, genPlace, placeTrees, treeKindAt, MW, MH, PW, PH, T, L } from "../src/world.mjs";
import { mapHooks } from "../src/mapkinds.mjs";
import { KINDS, treeSprites, shadeMossLut } from "../src/trees48.mjs";

const SEEDS = [3, 4, 9, 12];
const places = (G, seed) => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c]) out.push(placeTrees(G, seed, genPlace(G, seed, String(c)))); return out; };
const kindsOf = lay => Object.values(lay.trees).map(t => t.kind);

test("the kind rule: each region kind draws its own list, the Shade its column, the kinds without a list keep the built tree", () => {
  const want = { woods: ["broad", "hollow"], tallwood: ["broad", "hollow"], downs: ["round"] }, none = ["fells", "marsh", "thickets", "tarns", "meres"], seen = {};
  for (const seed of SEEDS) {
    for (const biome of ["mixed", ...Object.keys(want), ...none]) {
      const G = genWorld(seed, 4, biome);
      for (const lay of places(G, seed)) {
        const ks = kindsOf(lay), shade = !!(G.shade && G.shade[lay.cell]);
        for (const k of ks) seen[k] = (seen[k] || 0) + 1;
        if (none.includes(biome)) assert.deepEqual(lay.trees, {}, biome + " has no kind yet");
        else if (shade) assert.ok(ks.every(k => k === "shade"), "the Shade has only its column");
        else if (biome === "mixed") assert.ok(ks.every(k => (lay.land === L.WOOD ? ["broad", "hollow"] : ["round", "fruit"]).includes(k)), "Meadows " + lay.land + " " + ks);
        else assert.ok(ks.every(k => want[biome].includes(k)), biome + " " + ks);
        assert.equal(ks.length, lay.tiles.filter(t => t === T.TRUNK).length - (none.includes(biome) ? lay.tiles.filter(t => t === T.TRUNK).length : 0), "a kind on every trunk");
      }
    }
  }
  for (const k of ["round", "fruit", "broad", "hollow", "shade"]) assert.ok(seen[k] > 0, k + " is drawn somewhere");
  assert.deepEqual(KINDS.slice().sort(), ["broad", "fruit", "hollow", "round", "shade"]);
});

test("the kinds are seed-fixed, and a place's tiles and old features are what the generator made", () => {
  for (const seed of SEEDS) {
    const G = genWorld(seed, 4, "woods");
    for (const lay of places(G, seed)) {
      const again = placeTrees(G, seed, genPlace(G, seed, lay.key)), raw = genPlace(G, seed, lay.key);
      assert.deepEqual(again.trees, lay.trees, "the same kinds a second time");
      assert.deepEqual(Array.from(lay.tiles), Array.from(raw.tiles), "no tile moves");
      assert.deepEqual(lay.feats.filter(f => !f.tree), raw.feats, "every old feature as it was");
      for (const f of lay.feats.filter(f => f.tree)) assert.equal(lay.tiles[f.y * PW + f.x], T.TRUNK, "a tree's feature stands on its trunk");
    }
  }
});

test("generators 1 to 3 are untouched: no kinds, no tree features", () => {
  for (const gen of [1, 2, 3]) { const G = genWorld(9, gen);
    for (let c = 0; c < MW * MH; c++) if (G.comp[c]) { const lay = placeTrees(G, 9, genPlace(G, 9, String(c))); assert.deepEqual(lay.trees, {}); assert.ok(!lay.feats.some(f => f.tree)); } }
});

test("a fruit tree carries a bush's shake, a hollow trunk a hole", () => {
  const G = genWorld(9, 4, "mixed"), W = genWorld(4, 4, "woods"); let fruit = 0, hollow = 0;
  for (const lay of places(G, 9)) for (const [i, t] of Object.entries(lay.trees)) if (t.kind === "fruit" && t.fid) { fruit++; const f = lay.feats.find(q => q.id === t.fid); assert.equal(f.kind, "b"); assert.equal(f.tree, "fruit"); }
  for (const lay of places(W, 4)) for (const t of Object.values(lay.trees)) if (t.kind === "hollow" && t.fid) { hollow++; const f = lay.feats.find(q => q.id === t.fid); assert.equal(f.kind, "n"); assert.equal(f.tree, "hollow"); }
  assert.ok(fruit > 0 && hollow > 0);
});

const page = () => makePage({ console: "silent", els: true, raf: 1 });
// a place of a generator 4 world (biome b) holding the kind: an expedition standing in it
function inPlace(biome, seed, kind) {
  const p = page();
  p.run(`newWorld(${seed}, 4); G = genWorld(${seed}, 4, '${biome}'); layoutCache.clear();`);
  const r = JSON.parse(p.run(`(() => { for (let c = 0; c < MW * MH; c++) { if (!G.comp[c]) continue; const lay = layout(String(c)), t = Object.values(lay.trees).find(t => t.kind === '${kind}' && t.fid);
    if (t) { startExpedition('weather', c); const ex = S.exp; ex.fog = null; ex.storm = null; ex.pos = c; ensureLive(lay.key); enterPatch(); return JSON.stringify({ key: lay.key, fid: t.fid }); } } return 'null'; })()`));
  assert.ok(r, "a place with a " + kind);
  return { p, ...r };
}

test("a fruit tree is bare until a bloom, then shakes like a bush, and is bare again", () => {
  const { p, key, fid } = inPlace("mixed", 9, "fruit");
  const f = () => p.run(`JSON.stringify(layout('${key}').feats.find(q => q.id === '${fid}'))`);
  const ft = JSON.parse(f());
  p.run(`S.exp.patch = { key: '${key}', x: ${ft.x}, y: ${ft.y} + 1, dir: 'up', noise: 'creep' }; window.F = layout('${key}').feats.find(q => q.id === '${fid}')`);
  const crop = () => p.run(`treeCrop(layout('${key}'), layout('${key}').trees[${ft.y * 28 + ft.x}])`);
  assert.equal(p.run("bushFull('" + key + "', F)"), false, "bare to start");
  assert.equal(crop(), "bare");
  const sig = () => p.run(`treeSig(layout('${key}'), ${ft.y * 28 + ft.x}, false)`), sigBare = sig();
  p.run(`setFS('${key}', F.id, { ripe: 1 })`);
  assert.equal(p.run("bushFull('" + key + "', F)"), true, "ripe after a bloom");
  assert.equal(crop(), "fruit");
  assert.notEqual(sig(), sigBare, "the tile's key changes with the crop");
  const act = JSON.parse(p.run(`JSON.stringify({ type: occupant('${key}', F.x, F.y).type })`));
  assert.equal(act.type, "feat", "the trunk is a thing to act on");
  p.run("shakeBush(F)");
  assert.equal(p.run("bushFull('" + key + "', F)"), false, "the shake leaves it bare");
  assert.equal(crop(), "bare");
  assert.equal(p.run(`curLive().fr.length`), 1, "a shake drops one fruit");
});

test("a bloom ripens the fruit trees in its reach", () => {
  const p = page(); p.run("newWorld(9, 4)");
  const r = JSON.parse(p.run(`(() => { const trees = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c]) for (const f of layout(String(c)).feats) if (f.tree === 'fruit') trees.push([c, f.id]);
    const bloom = regionTurn(regionById(S, S.here), 3, { trail: [], storm: [] }, () => true).bloom;
    const ripe = trees.filter(([c, id]) => fs(String(c), id).ripe).map(([c]) => c), near = trees.filter(([c]) => cdist(c, bloom) <= 3).map(([c]) => c);
    return JSON.stringify({ bloom, ripe, near, n: trees.length }); })()`));
  assert.ok(r.bloom >= 0 && r.n > 0);
  assert.deepEqual(r.ripe.sort(), r.near.sort(), "exactly the trees within three cells of the bloom");
  assert.ok(r.near.length > 0, "the bloom reached some");
});

test("a shy one dives into a hollow trunk and hides there", () => {
  const { p, key, fid } = inPlace("woods", 4, "hollow");
  const r = JSON.parse(p.run(`(() => { const lay = layout('${key}'), live = curLive(), ex = S.exp, f = lay.feats.find(q => q.id === '${fid}');
    const spot = (() => { for (const [dx, dy] of [[0, 2], [2, 0], [-2, 0], [0, -2], [1, 2], [-1, 2], [3, 0], [0, 3]]) { const x = f.x + dx, y = f.y + dy; if (lay.reach[y * PW + x] && !occupant('${key}', x, y)) return { x, y }; } })();
    const P = ex.patch; P.x = lay.spawnPt.x; P.y = lay.spawnPt.y;
    const c = { id: 9001, sp: 1, x: spot.x, y: spot.y, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, face: 1, ready: 0 }; live.cr.push(c);
    const X = { lay, live, key: '${key}', P, raining: false };
    const h = nearestHole(X, c, 7); hideOrFlee(X, c); const picked = h && h.id === f.id, st0 = c.st, tgt = c.tgt && c.tgt.x === f.x && c.tgt.y === f.y;
    let steps = 0; while (!c.hide && steps++ < 12) advance('patch', { noise: 'act' });
    return JSON.stringify({ picked, st0, tgt, hide: c.hide, at: c.x === f.x && c.y === f.y, st: c.st }); })()`));
  assert.ok(r.picked, "the hollow trunk is the nearest hole");
  assert.equal(r.st0, "dive"); assert.ok(r.tgt, "it dives at the trunk");
  assert.ok(r.hide > 0 && r.at && r.st === "hidden", "hidden in the trunk: " + JSON.stringify(r));
});

test("the Shade place: its ground goes through the moss table, its fog table is the wash, with an id of its own", () => {
  const p = page(); p.run("newWorld(4, 4); G = genWorld(4, 4, 'woods'); layoutCache.clear();");
  const r = JSON.parse(p.run(`(() => { let sh = -1, pl = -1; for (let c = 0; c < MW * MH; c++) { if (!G.comp[c]) continue; if (G.shade[c] && sh < 0) sh = c; if (!G.shade[c] && G.land[c] === L.WOOD && pl < 0) pl = c; }
    const a = layout(String(sh)), b = layout(String(pl)); return JSON.stringify({ a: a.shade, b: b.shade, same: REMAP_SHADE[3] === SHADE_WASH, plain: REMAP_PLACE[3] === PLACE_FOG, ids: [REMAP_PLACE.id, REMAP_SHADE.id], ka: treeSig(a, 0, false), kb: treeSig(b, 0, false) }); })()`));
  assert.equal(r.a, true); assert.equal(r.b, false); assert.ok(r.same && r.plain); assert.notEqual(r.ids[0], r.ids[1]);
  assert.ok(r.ka.endsWith("|m") && !r.kb.endsWith("|m"), "its tiles have their own cache keys");
  // the moss table sends every green to a cool entry and leaves the rest alone
  const m = JSON.parse(p.run(`(() => { const mo = shadeMoss(), bad = []; for (const g of ['pine', 'forest', 'leaf', 'grass', 'sprout', 'lime']) if (![C.ink, C.tealD, C.pine, C.teal].includes(mo[C[g]])) bad.push(g);
    return JSON.stringify({ n: mo.length, bad, keep: mo[C.bone] === C.bone && mo[C.sky] === C.sky }); })()`));
  assert.equal(m.n, JSON.parse(p.run('RGB.length'))); assert.deepEqual(m.bad, []); assert.ok(m.keep);
});

test("every kind draws, asleep and woken, to a trunk of 32 x 32 and a canopy of 88 x 76, on the page's own colours only", () => {
  const p = page(); p.run("newWorld(4, 4)");
  const r = JSON.parse(p.run(`(() => { const out = []; for (const kind of ['round', 'fruit', 'broad', 'hollow', 'shade']) for (const crop of ['bare', 'fruit']) for (const sl of [false, true]) {
    const s = treeSet({ kind, seed: 2 }, crop, sl), n = (pb) => pb.p.filter(v => v >= 0).length, off = (pb) => pb.p.filter(v => v >= RGB.length || v < -1).length;
    out.push([kind, crop, sl, s.trunk.w, s.trunk.h, n(s.trunk) > 100, n(s.canopy[0]) > 1500, n(s.canopy[1]) < n(s.canopy[0]), off(s.trunk) + off(s.canopy[0])]); } return JSON.stringify(out); })()`));
  for (const [kind, crop, sl, w, h, trunk, canopy, thin, off] of r) { const w_ = kind + " " + crop + " " + sl; assert.ok(w === 32 && h === 32 && trunk && canopy && thin && off === 0, w_); }
});

test("the map: a Meadows map draws to the bit as before; the Woods get hollow trunks, the Shade its teal columns and no level tint", () => {
  const p = page(); p.run("newWorld(4, 4)");
  const px = (biome, hooks) => JSON.parse(p.run(`(() => { G = genWorld(4, 4, '${biome}'); const keep = Object.assign({}, MAPK);
    if (!${hooks}) { MAPK.cell = () => false; MAPK.ownsShade = () => false; MAPK.foam = () => null; MAPK.post = () => {}; }
    const pb = buildMapPB(); Object.assign(MAPK, keep); const shade = G.shade ? Array.from(G.shade) : [], teal = [C.teal, C.tealD];
    return JSON.stringify({ p: Array.from(pb.p), shade, wood: Array.from(G.land) }); })()`));
  const m1 = px("mixed", true), m0 = px("mixed", false);
  assert.deepEqual(m1.p, m0.p, "Meadows: no hook fires, every pixel as before");
  const w1 = px("woods", true), w0 = px("woods", false), CELL = 26, W = MW * CELL, tealIdx = JSON.parse(p.run("JSON.stringify([C.teal, C.tealD])"));
  let shadeCells = 0, hollowCells = 0, tealIn = 0, tealOut = 0;
  for (let c = 0; c < MW * MH; c++) { const x0 = (c % MW) * CELL, y0 = ((c / MW) | 0) * CELL; let diff = false, teal = 0;
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const a = w1.p[(y0 + y) * W + x0 + x], b = w0.p[(y0 + y) * W + x0 + x]; if (a !== b) diff = true; if (tealIdx.includes(a)) teal++; }
    if (w1.shade[c]) { shadeCells++; tealIn += teal; assert.ok(diff, "a Shade cell is drawn another way"); } else { tealOut += teal; if (diff && w1.wood[c] === 3) hollowCells++; } }
  assert.ok(shadeCells > 0 && tealIn > shadeCells * 60, "the Shade is teal");
  assert.ok(hollowCells > 0, "some wood cells hold a hollow trunk");
  assert.equal(mapHooks().ownsShade({ biome: "woods" }), true);
  assert.equal(mapHooks().ownsShade({ biome: "mixed" }), false);
});

// ---- gap 15: an old save, with places it had walked ----
// The fixture is the store of a page before tree kinds (generator 4, seed 9): four places walked (a bush shaken bare, a slab pushed, a hole seen, a wood place),
// with those places' tiles and feature lists as that page made them.
const OLD = JSON.parse(readFileSync(new URL("./fixtures/old-save-walked.json", import.meta.url), "utf8"));
const tilesOf = lay => Array.from(lay.tiles).map(t => t.toString(36)).join("");

test("an old save keeps what it walked: the same tiles, every old feature and its state; trees only add", () => {
  const p = makePage({ console: "silent", els: true, raf: 1, store: JSON.parse(JSON.stringify(OLD.store)) });
  assert.equal(p.run("S.seed"), 9); assert.equal(p.run("S.gen"), 4); assert.deepEqual(OLD.walked.map(c => p.run(`S.visited[${c}]`)), [1, 1, 1, 1], "the walked places are walked in the load");
  const saved = JSON.parse(OLD.store[Object.keys(OLD.store).find(k => k.startsWith("mb-save"))]), state = p.run("JSON.stringify(S.cells)");
  assert.ok(Object.keys(JSON.parse(state)).length >= 3, "feature state came in");
  let added = 0;
  for (const o of OLD.layouts) {
    const lay = JSON.parse(p.run(`(() => { const l = layout('${o.key}'); return JSON.stringify({ tiles: Array.from(l.tiles).map(t => t.toString(36)).join(''), feats: l.feats, trees: l.trees }); })()`));
    assert.equal(lay.tiles, o.tiles, "place " + o.key + ": no tile moved");
    assert.deepEqual(lay.feats.filter(f => !f.tree), o.feats, "place " + o.key + ": every old feature as it was");
    const add = lay.feats.filter(f => f.tree); added += add.length;
    for (const f of add) assert.ok(!o.feats.some(q => q.id === f.id), "a tree's feature has an id of its own");
    assert.ok(Object.keys(lay.trees).length > 0 || !o.tiles.includes("8"), "its trunks have kinds");
  }
  assert.ok(added > 0, "the walked places gain tree features");
  // the saved state still reads: the shaken bush is bare, the pushed slab has moved, in the same place
  const k = OLD.layouts.map(o => o.key), cells = JSON.parse(state);
  const bush = OLD.layouts[0].feats.find(f => f.kind === "b"), slab = OLD.layouts[1].feats.find(f => f.kind === "s");
  assert.equal(p.run(`bushFull('${k[0]}', layout('${k[0]}').feats.find(f => f.id === '${bush.id}'))`), false, "the bush is still bare");
  assert.equal(p.run(`JSON.stringify(featPos('${k[1]}', layout('${k[1]}').feats.find(f => f.id === '${slab.id}')))`), JSON.stringify({ x: slab.x + 1, y: slab.y }), "the slab is where it was pushed");
  // and a place the save never walked: the generator's tiles and old features (as built, a layout may change here, but only by its trees)
  const W = genWorld(9, 4), un = Array.from(W.comp).findIndex((v, c) => v && !OLD.walked.includes(c)), raw = genPlace(W, 9, String(un));
  const ul = JSON.parse(p.run(`(() => { const l = layout('${un}'); return JSON.stringify({ tiles: Array.from(l.tiles), feats: l.feats.filter(f => !f.tree) }); })()`));
  assert.deepEqual(ul.tiles, Array.from(raw.tiles)); assert.deepEqual(JSON.parse(JSON.stringify(raw.feats)), ul.feats);
});
