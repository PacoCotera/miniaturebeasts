// src/regions.mjs: the realm's regions as pure functions.
// A v8 save becomes region 1 of a v9 realm, and mounting it gives back the very state the page held: five saves, equal before and after,
// the full map's picture included. Then the round trip in bytes, the v8 copy, the atlas rules, and the names.
//   node --test prototypes/exploration/tests/regions.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as W from "../src/world.mjs";
import * as R from "../src/regions.mjs";
import { makePage } from "./page-harness.mjs";

const NOW = Date.UTC(2026, 10, 3, 9, 0, 0);
const FIX = name => readFileSync(new URL(`../../station/tests/fixtures/save-v8-${name}.json`, import.meta.url), "utf8");
const FIXTURES = ["schema1", "care-before", "played-g1", "played-g2", "midexp-g3"];
const plain = x => JSON.parse(JSON.stringify(x));
const fnv = a => { let h = 2166136261; for (const v of a) { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0; } return h; };

// the page with a fixture loaded as the page loads it (the fill of what a save lacks included)
const loaded = name => { const p = makePage({ console: "silent", canvas: true, date: NOW }); p.store[p.KEY] = FIX(name); assert.equal(p.run("load()"), true, name + " loads"); return p; };
// the full map, drawn from S as it stands: the baked map and the frame (the map's own drawing, as the full-map view runs it)
const picture = p => { p.run("mapCv = null; ensureMap(); scr.px().fill(-1); drawMap('view', 0);"); const frame = Int16Array.from(p.run("scr").px()), baked = Int16Array.from(p.run("mapCv").px());
  assert.ok(frame.some(v => v >= 0), "something is drawn"); return { frame: fnv(frame), baked: fnv(baked) }; };
// the state the page holds after a load, as the v8 page held it: the realm's own fields (began, here, regions) taken off, the map still mounted on S
const flat = p => { const o = plain(p.S); o.v = 8; for (const k of ["began", "here", "regions"]) delete o[k]; return o; };
const pageExplored = p => plain(p.run("(() => { let n = 0, s = 0; for (let c = 0; c < MW * MH; c++) { if (explored(c)) n++; if (S.revealed[c]) s++; } return [n, s]; })()"));
const store = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); } }; };

for (const name of FIXTURES) {
  test(`1. ${name}: v8 to v9 and mounted again, the same state; the full map the same picture`, () => {
    const p = loaded(name), before = flat(p), pic0 = picture(p);
    const v8 = plain(before), v9 = R.migrate8(v8, { now: NOW });
    assert.deepEqual(v8, before, "migrate8 leaves its input alone");
    assert.equal(R.realmStatus(v9), "ok");
    assert.equal(v9.v, 9); assert.equal(v9.here, "g1"); assert.equal(v9.regions.length, 1);
    for (const k of R.MAP_KEYS) assert.ok(!(k in v9), k + " is in the region, not at the top");
    assert.ok(!("gen" in v9), "gen is the region's"); assert.ok(!v9.ui || !("lastPos" in v9.ui), "and so is the last start");
    // region 1 is the save's world
    const g1 = v9.regions[0];
    assert.equal(g1.id, "g1"); assert.equal(g1.n, 1); assert.equal(g1.kind, "home"); assert.equal(g1.biome, "mixed"); assert.deepEqual(g1.slot, [2, 2]);
    assert.equal(g1.seed, before.seed); assert.equal(g1.gen, before.gen ?? 1); assert.equal(g1.ev, null); assert.equal(g1.closes, null); assert.equal(g1.closed, false);
    assert.equal(g1.openedTurn, 0); assert.equal(g1.turnSeen, before.turn); assert.equal(g1.opened, v9.began);
    assert.deepEqual([g1.exploredN, g1.seenN], pageExplored(p), "the counts are the page's own");
    // mounted, S is what it was (a save from before `gen` is generator 1, and now says so)
    const live = plain(v9); R.mount(live, "g1");
    const want = plain(before); want.gen = before.gen ?? 1; delete want.v;
    const got = plain(live); for (const k of ["v", "began", "here", "regions"]) delete got[k]; delete got.v;
    assert.deepEqual(got, want, "every field, map and realm");
    for (const k of ["pods", "cr", "mibis", "known", "found", "met", "bay", "hold", "exp", "revealed", "visited"]) assert.deepEqual(live[k], before[k], k);
    if (before.st) for (const k of ["e", "d", "s", "tray"]) assert.deepEqual(live.st[k], before.st[k], "st." + k);
    // and the page, given that S, draws the same full map
    p.ctx.__live = live; p.run("S = __live; layoutCache.clear(); indexCreatures();");
    assert.deepEqual(picture(p), pic0, "the full map, pixel for pixel");
  });

  test(`2. ${name}: serialize and load again, the same bytes; the mounted fields stay off the disk`, () => {
    const p = loaded(name), v9 = R.migrate8(flat(p), { now: NOW });
    const live = plain(v9); R.mount(live, "g1");
    const text1 = JSON.stringify(R.serialize(live));
    assert.equal(text1, JSON.stringify(v9), "the realm serializes to what migrate8 made");
    const o = JSON.parse(text1);
    for (const k of R.MAP_KEYS) assert.ok(!(k in o), k); assert.ok(!("gen" in o)); assert.equal(o.seed, o.regions[0].seed);
    const again = JSON.parse(text1); R.mount(again, "g1");
    assert.equal(JSON.stringify(R.serialize(again)), text1, "load, serialize: the same bytes");
    assert.equal(R.realmStatus(o), "ok");
    // S is left as it was
    assert.ok(Array.isArray(live.visited) && live.seed === o.regions[0].seed);
  });
}

test("3. migrate8: what it does with the rest of the save", () => {
  const p = loaded("played-g2"), s = flat(p);
  const v9 = R.migrate8(s, { now: NOW });
  // crates, the hold and the expedition carry no region: none means region 1, so they come through as they were
  assert.deepEqual(v9.bay, s.bay); assert.ok(v9.bay.every(c => !("rg" in c)));
  const mid = R.migrate8(flat(loaded("midexp-g3")), { now: NOW }); assert.ok(mid.exp && !("rg" in mid.exp));
  // a v9 or a stranger is refused
  assert.throws(() => R.migrate8(v9), /v8/); assert.throws(() => R.migrate8(null), /v8/); assert.throws(() => R.migrate8({ v: 7 }), /v8/);
  // began: the earliest real time the save holds; a bad clock does not count; none at all, the time of the migration
  const bare = { v: 8, seed: 5, turn: 3, revealed: [0], visited: [0], mibis: [], bay: [], ui: null };
  assert.equal(R.migrate8(bare, { now: 777 }).began, 777);
  const t0 = Date.UTC(2026, 8, 1);
  const timed = { ...bare, mibis: [{ since: t0 + 5000 }, { since: 12 }], bay: [{ at: t0 + 900 }], st: { at: t0 + 100, mibis: [{ since: t0 + 50 }] } };
  assert.equal(R.migrate8(timed, { now: 777 }).began, t0 + 50, "the Station's mibi came first");
  assert.equal(R.migrate8({ ...bare, mibis: [{ since: 12 }], bay: [{ at: 0 }] }, { now: 777 }).began, 777, "a clock that was never set is no time");
  assert.equal(R.migrate8(timed, { now: 777 }).regions[0].opened, t0 + 50, "region 1 opened when the realm began");
  // a missing last start stays missing; a null ui is fine
  assert.ok(!("lastPos" in R.migrate8(bare).regions[0].map));
  const withPos = R.migrate8({ ...bare, ui: { sel: 0, lastPos: 44 } }); assert.equal(withPos.regions[0].map.lastPos, 44); assert.deepEqual(withPos.ui, { sel: 0 });
  const m = plain(withPos); R.mount(m, "g1"); assert.equal(m.ui.lastPos, 44); assert.equal(R.serialize(m).ui.lastPos, undefined);
});

test("4. realmStatus: a newer save or a generator this page does not know makes the realm read-only", () => {
  const v9 = R.migrate8(flat(loaded("played-g1")), { now: NOW });
  assert.equal(R.realmStatus(v9), "ok");
  assert.equal(R.realmStatus({ ...v9, v: 10 }), "newer");
  const odd = plain(v9); odd.regions[0].gen = 99; assert.equal(R.realmStatus(odd), "newer");
  const second = plain(v9); second.regions.push(R.regionRecord({ n: 2, slot: [2, 1], biome: "woods", seed: 9, gen: 99, opened: NOW })); assert.equal(R.realmStatus(second), "newer", "any region");
  assert.equal(R.realmStatus(second, [1, 2, 3, 99]), "ok", "a page that knows it");
  assert.equal(R.realmStatus({ ...v9, v: 8 }), "broken"); assert.equal(R.realmStatus(null), "broken"); assert.equal(R.realmStatus([]), "broken");
  assert.equal(R.realmStatus({ ...v9, regions: [] }), "broken");
});

test("5. keepPre9: the v8 bytes are copied once, untouched, and read back", () => {
  const raw = FIX("played-g2"), key = "mb-save-v8@c1";
  const s = store();
  assert.equal(R.keepPre9(s, key, raw), true);
  assert.equal(s.m.get(key + ".pre9"), raw, "equal to the v8 bytes");
  assert.equal(R.keepPre9(s, key, "later bytes"), true); assert.equal(s.m.get(key + ".pre9"), raw, "kept: the oldest v8 bytes");
  // a copy that cannot be made, or does not read back the same, is no copy: the save then opens read-only
  assert.equal(R.keepPre9({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, key, raw), false);
  assert.equal(R.keepPre9({ getItem: () => null, setItem: () => {} }, key, raw), false, "written but not there");
  const bent = new Map(); assert.equal(R.keepPre9({ getItem: k => bent.get(k) ?? null, setItem: (k, v) => bent.set(k, v.slice(1)) }, key, raw), false, "written but not the same");
  assert.equal(R.keepPre9({ getItem: () => { throw new Error("denied"); }, setItem: () => {} }, key, raw), false);
});

// ---- mount and unmount ----
const realm2 = () => {
  const v9 = R.migrate8(flat(loaded("played-g2")), { now: NOW }), S = plain(v9);
  const g2 = R.regionRecord({ n: 2, slot: [2, 1], biome: "woods", seed: R.regionSeed(S.seed, 2), gen: 3, opened: NOW + 1000, openedTurn: S.turn, turnSeen: S.turn });
  S.regions.push(g2); R.mount(S, "g1");
  return S;
};
test("6. two regions: each keeps its own map, a reassigned array is caught, S follows the region in use", () => {
  const S = realm2(), seed1 = S.seed, g1Pods = S.pods.length, g1Seen = S.revealed.filter(Boolean).length;
  S.pods = S.pods.filter((p, i) => i > 0);   // a page reassigns: it must still reach the region
  S.ui.lastPos = 33;
  R.unmount(S);   // the page unmounts, then goes
  const g1 = S.regions[0];
  assert.equal(g1.map.pods.length, g1Pods - 1, "the reassigned list is in g1"); assert.equal(g1.map.lastPos, 33); assert.equal(g1.seenN, g1Seen);
  const R2 = R.mount(S, "g2");
  assert.equal(R2.id, "g2"); assert.equal(S.here, "g2"); assert.equal(S.seed, R2.seed); assert.equal(S.gen, 3); assert.notEqual(S.seed, seed1);
  assert.equal(S.pods.length, 0, "a new region starts with its own"); assert.equal(S.revealed.filter(Boolean).length, 0); assert.ok(S.ui.lastPos === undefined, "no last start there yet");
  S.revealed[5] = 1; S.revealed[6] = 1; S.visited[5] = 1; S.called[5] = 1; S.pods.push({ id: "g2.w0", k: "5" });
  R.unmount(S);
  assert.equal(S.regions[1].exploredN, 1); assert.equal(S.regions[1].seenN, 2, "refreshed at the unmount");
  assert.equal(S.regions[1].map.pods.length, 1);
  R.mount(S, "g1");
  assert.equal(S.seed, seed1); assert.equal(S.pods.length, g1Pods - 1, "g1 is as it was left"); assert.equal(S.ui.lastPos, 33); assert.equal(S.revealed.filter(Boolean).length, g1Seen);
  assert.equal(S.regions[0].map.revealed, S.revealed, "held by reference: what the page does to S is done to the region");
});
test("6b. mount takes a key the region lacks off S, and unmount drops a key S has lost", () => {
  const S = realm2(); S.svyF = { 3: 1 }; R.unmount(S); assert.deepEqual(S.regions[0].map.svyF, { 3: 1 });
  R.mount(S, "g2"); assert.ok(!("svyF" in S), "g2 has none"); R.unmount(S); assert.ok(!("svyF" in S.regions[1].map));
  R.mount(S, "g1"); assert.deepEqual(S.svyF, { 3: 1 }); delete S.svyF; R.unmount(S); assert.ok(!("svyF" in S.regions[0].map));
  assert.throws(() => R.mount(S, "g9"), /no region g9/);
});
test("6c. serialize with the second region mounted: the realm's seed, every map in its record, nothing mounted left on disk", () => {
  const S = realm2(), seed1 = S.seed;
  R.unmount(S); R.mount(S, "g2"); S.visited[7] = 1; S.called[7] = 1;
  const o = JSON.parse(JSON.stringify(R.serialize(S)));
  assert.equal(o.seed, seed1, "the realm seed, not the mounted region's"); assert.ok(!("gen" in o)); assert.equal(o.here, "g2");
  for (const k of R.MAP_KEYS) assert.ok(!(k in o), k);
  assert.equal(o.regions[1].map.visited[7], 1); assert.equal(o.regions[1].exploredN, 1);
  assert.equal(R.realmStatus(o), "ok");
  const back = JSON.parse(JSON.stringify(o)); R.mount(back, back.here);
  assert.equal(back.visited[7], 1); assert.equal(back.seed, S.regions[1].seed);
  assert.equal(JSON.stringify(R.serialize(back)), JSON.stringify(o));
});

// ---- the atlas ----
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 3);
test("7. slotBiome: the four slots around region 1 hold Woods, Fells and Marsh and one repeat, over 200 seeds", () => {
  const around = [[2, 1], [3, 2], [2, 3], [1, 2]], repeats = { woods: 0, fells: 0, marsh: 0 }, where = [0, 0, 0, 0];
  for (const seed of SEEDS) {
    const b = around.map(([x, y]) => R.slotBiome(seed, x, y));
    for (const w of ["woods", "fells", "marsh"]) assert.ok(b.includes(w), `seed ${seed}: ${w} is on offer`);
    assert.ok(b.every(x => x !== "mixed"), "no Meadows next to the Meadows");
    const counts = {}; for (const x of b) counts[x] = (counts[x] || 0) + 1;
    const rep = Object.keys(counts).filter(k => counts[k] === 2); assert.equal(rep.length, 1, `seed ${seed}: one repeat`); repeats[rep[0]]++;
    around.forEach((_, i) => { if (b[i] === rep[0]) where[i]++; });
    assert.deepEqual(b, around.map(([x, y]) => R.slotBiome(seed, x, y)), "a slot's biome is fixed by the seed");
  }
  for (const k of Object.keys(repeats)) assert.ok(repeats[k] >= 40, `the repeat is each of the three often enough (${k} ${repeats[k]})`);
  assert.ok(where.every(n => n >= 50), "and sits anywhere: " + where);
  assert.equal(R.slotBiome(5, 2, 2), "mixed");
  const far = new Set(); for (const seed of SEEDS) for (const [x, y] of [[0, 0], [4, 4], [0, 4], [3, 3], [2, 0]]) far.add(R.slotBiome(seed, x, y));
  assert.deepEqual([...far].sort(), ["fells", "marsh", "mixed", "woods"], "further out, any biome");
  assert.notDeepEqual(around.map(([x, y]) => R.slotBiome(1, x, y)), around.map(([x, y]) => R.slotBiome(2, x, y)), "(the seeds differ)");
});

test("7b. slotBiome by realm version: version 1 (and a save without one) never changes; version 2 draws all nine by rarity; ring 1 is the same", () => {
  const around = [[2, 1], [3, 2], [2, 3], [1, 2]], far = [[0, 0], [4, 4], [0, 4], [3, 3], [2, 0], [4, 1], [1, 4], [0, 2], [4, 3], [1, 0]];
  const tally = {}; let n = 0;
  for (const seed of SEEDS) {
    for (const [x, y] of around) assert.equal(R.slotBiome(seed, x, y, 2), R.slotBiome(seed, x, y, 1), "ring 1 is Woods, Fells and Marsh and a repeat in both");
    for (const [x, y] of far) { assert.ok(R.BIOMES_V1.includes(R.slotBiome(seed, x, y)), "default is version 1"); assert.equal(R.slotBiome(seed, x, y, 1), R.slotBiome(seed, x, y));
      const b = R.slotBiome(seed, x, y, 2); tally[b] = (tally[b] || 0) + 1; n++; }
  }
  assert.deepEqual(Object.keys(tally).sort(), [...R.BIOMES].sort(), "every kind turns up");
  for (const [b, w] of Object.entries(R.BIOME_WEIGHT)) { const want = n * w / 42, got = tally[b]; assert.ok(Math.abs(got - want) <= want * 0.2, `${b}: ${got} against about ${want.toFixed(0)}`); }
  assert.equal(R.biomeVersion({}), 1); assert.equal(R.biomeVersion({ biomeV: 2 }), 2); assert.equal(R.biomeVersion(null), 1);
  assert.deepEqual(R.BIOME_NAME, { mixed: "Meadows", woods: "Woods", fells: "Fells", marsh: "Marsh", downs: "Downs", thickets: "Thickets", tallwood: "Tallwood", tarns: "Tarns", meres: "Meres" });
  assert.equal(R.realmStatus({ v: 9, biomeV: 3, regions: [{ map: {}, gen: 3 }] }), "newer");
});

const home = (n, slot, o = {}) => R.regionRecord({ n, slot, biome: "woods", seed: n * 11, gen: 4, opened: NOW, exploredN: 0, ...o });
test("8. freeSlots: the empty neighbours of the open home regions, inside the 5 x 5", () => {
  const g1 = home(1, [2, 2], { biome: "mixed", gen: 3 });
  assert.deepEqual(R.freeSlots([g1]), [[2, 1], [1, 2], [3, 2], [2, 3]], "four around region 1, row by row");
  const two = [g1, home(2, [2, 1])];
  assert.deepEqual(R.freeSlots(two), [[2, 0], [1, 1], [3, 1], [1, 2], [3, 2], [2, 3]], "two regions, six free slots (the mock's 3 x 4)");
  assert.deepEqual(R.freeSlots([home(1, [0, 0])]), [[1, 0], [0, 1]], "a corner has two");
  // a seasonal region has no slot and opens none; closed or not
  const season = R.regionRecord({ n: 3, kind: "season", ev: "frost", name: "the Frost Hollow", biome: "marsh", seed: 5, gen: 4, opened: NOW, closes: NOW + 9 });
  assert.equal(season.slot, null); assert.deepEqual(R.freeSlots([g1, season]), R.freeSlots([g1]));
  // all 25: none left. Every free slot is empty, in range and touches an open region, over random growth
  const all = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) all.push(home(all.length + 1, [x, y]));
  assert.deepEqual(R.freeSlots(all), []);
  for (const seed of SEEDS.slice(0, 40)) {
    const rs = [g1]; let x = seed >>> 0;
    for (let i = 0; i < 12; i++) { const free = R.freeSlots(rs); if (!free.length) break; x = (Math.imul(x, 1664525) + 1013904223) >>> 0; rs.push(home(rs.length + 1, free[(x >>> 8) % free.length])); }
    const taken = new Set(rs.map(r => r.slot.join(",")));
    assert.equal(taken.size, rs.length, "no slot twice");
    for (const [sx, sy] of R.freeSlots(rs)) { assert.ok(sx >= 0 && sy >= 0 && sx < 5 && sy < 5); assert.ok(!taken.has(sx + "," + sy));
      assert.ok(rs.some(r => Math.abs(r.slot[0] - sx) + Math.abs(r.slot[1] - sy) === 1), "shares an edge with an open region"); }
  }
});

test("9. canOpen: 140 x n explored cells across the home regions, up to 25, seasonal regions not counted", () => {
  const S = { here: "g1", regions: [home(1, [2, 2], { biome: "mixed", exploredN: 139 })] };
  assert.equal(R.canOpen(S), false); S.regions[0].exploredN = 140; assert.equal(R.canOpen(S), true);
  S.regions.push(home(2, [2, 1], { exploredN: 100 }));   // two regions: 280 needed
  assert.equal(R.canOpen(S), false, "240 of 280"); S.regions[1].exploredN = 140; assert.equal(R.canOpen(S), true, "280 of 280");
  S.regions.push(R.regionRecord({ n: 3, kind: "season", ev: "e", name: "x", biome: "fells", seed: 1, gen: 4, opened: NOW, exploredN: 5000 }));
  S.regions[1].exploredN = 139; assert.equal(R.canOpen(S), false, "a seasonal region's cells do not count");
  assert.equal(R.canOpen({ ...S, regions: S.regions.slice(0, 2) }, 100), true, "the developer's number");
  assert.equal(R.exploredAcross({ here: "g1", regions: S.regions.slice(0, 2) }), 279);
  // the region in use counts live, not as last cached
  const live = { here: "g1", regions: [home(1, [2, 2], { exploredN: 0 })], visited: new Array(320).fill(0), called: {} };
  assert.equal(R.canOpen(live), false);
  for (let c = 0; c < 140; c++) { live.visited[c] = 1; live.called[c] = 1; } assert.equal(R.canOpen(live), true, "140 explored now");
  live.visited[0] = 0; assert.equal(R.canOpen(live), false, "visited and called, both");
  // 25 home regions: no more
  const all = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) all.push(home(all.length + 1, [x, y], { exploredN: 9999 }));
  assert.equal(R.canOpen({ here: "g1", regions: all }), false);
  const most = all.slice(0, 24); assert.equal(R.canOpen({ here: "g1", regions: most }), true, "24 are open and a slot is free");
});

test("10. regionName: the Meadows, then the side and the biome; Far for the second on a side; the event's own name for a seasonal region", () => {
  const nm = (slot, biome, n = 9) => R.regionName(home(n, slot, { biome }), {});
  assert.equal(R.regionName(home(1, [2, 2], { biome: "mixed" }), {}), "the Meadows");
  assert.equal(nm([2, 1], "woods"), "North Woods"); assert.equal(nm([3, 2], "fells"), "East Fells"); assert.equal(nm([2, 3], "marsh"), "South Marsh"); assert.equal(nm([1, 2], "woods"), "West Woods");
  assert.equal(nm([2, 0], "fells"), "Far North Fells"); assert.equal(nm([4, 2], "woods"), "Far East Woods"); assert.equal(nm([0, 2], "marsh"), "Far West Marsh"); assert.equal(nm([2, 4], "marsh"), "Far South Marsh");
  assert.equal(nm([3, 2], "mixed"), "East Meadows", "a repeat of the Meadows later");
  // the diagonals have no words yet: the copywriter owes them
  assert.equal(nm([1, 1], "woods"), null); assert.equal(nm([4, 4], "fells"), null);
  const season = R.regionRecord({ n: 5, kind: "season", ev: "frost", name: "the Frost Hollow", biome: "marsh", seed: 5, gen: 4, opened: NOW });
  assert.equal(R.regionName(season, {}), "the Frost Hollow");
});

test("11. seeds and ids: region 1 keeps the realm's seed and its pod ids; region n has a seed and pod ids of its own", () => {
  assert.equal(R.regionSeed(7, 1), 7);
  const seeds = new Set([2, 3, 4, 5, 6].map(n => R.regionSeed(7, n))); assert.equal(seeds.size, 5); assert.ok(!seeds.has(7));
  assert.equal(R.regionSeed(7, 2), W.hash(7, "region", 2)); assert.notEqual(R.regionSeed(8, 2), R.regionSeed(7, 2));
  assert.equal(R.regionId(12), "g12");
  // every life pod is renamed, whatever its id: generators 1 and 2 name them w0 … w6 and cv, generator 3 names them w<species>p<n> and cv
  for (const gen of [2, 3]) {
    const seed2 = R.regionSeed(7, 2), raw = s => W.genLife(W.genWorld(s, gen), s, W.ROSTER).pods;
    const l1 = R.prefixPods(raw(7), 1), l2 = R.prefixPods(raw(seed2), 2), r2 = raw(seed2);
    assert.deepEqual(l1.map(p => p.id), raw(7).map(p => p.id), "region 1 keeps its ids");
    assert.ok(l2.length > 4 && l2.every((p, i) => p.id === "g2." + r2[i].id), "region 2: g2. in front of each");
    assert.ok(l2.some(p => p.id === "g2.cv"));
    assert.equal(new Set([...l1, ...l2].map(p => p.id)).size, l1.length + l2.length, `gen ${gen}: no id twice across the two regions`);
    assert.ok(r2.some(p => l1.some(q => q.id === p.id)), "(without the prefix they would collide)");
    assert.deepEqual(raw(seed2).map(p => p.id), r2.map(p => p.id), "the input is not renamed");
    assert.deepEqual(l2.map(({ id, ...p }) => p), r2.map(({ id, ...p }) => p), "only the id changes");
  }
});

test("11b. generators: 3 is the herd floor, 4 is the biomes; new realms still take 3", () => {
  assert.equal(W.NEW_GEN, 3); assert.deepEqual(W.GENS, [1, 2, 3, 4]);
  assert.equal(W.genWorld(7, 3).gen, 3, "generator 3 is the herd floor on generator 2's ground");
  assert.ok(W.GENS.includes(4), "the page knows the biomes' generator");
  const second = R.regionRecord({ n: 2, slot: [2, 1], biome: "woods", seed: 9, gen: 4, opened: 1 });
  assert.notEqual(R.realmStatus({ v: 9, regions: [second] }), "newer", "a realm that holds a generator 4 region is playable");
  const later = R.regionRecord({ n: 2, slot: [2, 1], biome: "woods", seed: 9, gen: 5, opened: 1 });
  assert.equal(R.realmStatus({ v: 9, regions: [later] }), "newer", "a generator the page does not know is read-only");
});

test("12. regionRecord and blankMap: the shape of a record, and a new region's map is a new world's", () => {
  const p = makePage({ console: "silent", date: NOW }), wf = plain(p.run("worldFields(7, 3)"));
  const blank = R.blankMap();
  for (const k of Object.keys(blank)) assert.deepEqual(blank[k], wf[k], "blankMap " + k + " is worldFields'");
  for (const k of R.MAP_KEYS) if (k in wf) assert.ok(k in blank, "worldFields has " + k);
  assert.ok(Object.keys(blank).every(k => R.MAP_KEYS.includes(k)));
  const r = R.regionRecord({ n: 2, slot: [3, 2], biome: "fells", seed: 99, gen: 4, opened: NOW, openedTurn: 6 });
  assert.deepEqual(Object.keys(r), ["id", "n", "kind", "biome", "slot", "ev", "name", "seed", "gen", "opened", "openedTurn", "turnSeen", "closes", "closed", "exploredN", "seenN", "map"]);
  assert.equal(r.id, "g2"); assert.equal(r.turnSeen, 6); assert.equal(r.exploredN, 0); assert.equal(r.seenN, 0); assert.equal(r.map.revealed.length, 320);
  const o = { slot: [1, 1] }; const q = R.regionRecord({ n: 2, ...o, seed: 1, gen: 3, opened: 1 }); q.slot[0] = 9; assert.deepEqual(o.slot, [1, 1], "the slot is copied");
  assert.throws(() => R.regionRecord({ n: 0, slot: [0, 0], seed: 1, gen: 1, opened: 1 }), /from 1/);
  assert.throws(() => R.regionRecord({ n: 2, seed: 1, gen: 1, opened: 1 }), /slot/);
  assert.throws(() => R.regionRecord({ n: 2, slot: [0, 0], biome: "swamp", seed: 1, gen: 1, opened: 1 }), /biome/);
  assert.throws(() => R.regionRecord({ n: 2, slot: [0, 0], kind: "x", seed: 1, gen: 1, opened: 1 }), /kind/);
  assert.throws(() => R.regionRecord({ n: 2, slot: [0, 0], seed: 1, opened: 1 }), /generator/);
  assert.equal(R.exploredCount({ visited: [1, 1, 0], called: { 0: 1, 2: 1 } }), 1); assert.equal(R.seenCount({ revealed: [1, 0, 1] }), 2);
});

test("13. the page imports regions.mjs (the page and the Station took v9 in one merge); the module is pure", () => {
  const src = readFileSync(new URL("../src/regions.mjs", import.meta.url), "utf8");
  assert.ok(!/\b(document|window|localStorage|fetch|Math\.random)\b/.test(src.replace(/\/\/.*$/gm, "")), "no page, no storage, no chance");
  assert.ok(/from "\.\/src\/regions\.mjs"/.test(readFileSync(new URL("../index.html", import.meta.url), "utf8")));
});
