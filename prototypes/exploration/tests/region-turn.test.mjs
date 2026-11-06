// The region turn: worldTurn is regionTurn (the map: creatures roam, storm marks, the bloom, arrivals, young) then realmTurn (the counters,
// the mibi clock, the lines), and a region that was away is caught up when it is mounted: the last three turns it missed, each on its own seed, no line written.
// A species a region lacks surfaces at its next region turn (W4). The page's own code, run in the sandbox.
//   node --test prototypes/exploration/tests/region-turn.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import * as R from "../src/regions.mjs";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const plain = x => JSON.parse(JSON.stringify(x));
// A realm of three regions on the page: g1 (seed 7), g2 and g3 with their own life, each last seen at the turns given.
function realm3(turn, seen2, seen3 = turn) {
  const p = makePage({ console: "silent" });
  p.run(`newWorld(7); S.turn = ${turn}; S.expN = ${turn}; S.regions[0].turnSeen = ${turn}`);
  for (const [n, seen] of [[2, seen2], [3, seen3]]) {
    const seed = R.regionSeed(p.run("S.seed"), n), G = W.genWorld(seed, 3), map = R.blankMap(), life = W.genLife(G, seed);
    map.cr = life.cr; map.pods = life.pods;
    p.run(`S.regions.push(${JSON.stringify(R.regionRecord({ n, kind: "home", biome: "mixed", slot: [2 + n, 1], seed, gen: 3, opened: 1, openedTurn: 0, turnSeen: seen, map }))})`);
  }
  return p;
}
const spy = p => { p.run("globalThis.CALLS = []; { const orig = regionTurn; regionTurn = (R, t, pd, f) => { CALLS.push([R.id, t, pd.trail.length, pd.storm.length]); return orig(R, t, pd, f); }; }"); return () => plain(p.run("CALLS")); };

test("1. three regions, region 2 away 7 turns: mounting it runs 3 turns, on t = 7, 8, 9, each with the region's own seed, and writes no line", () => {
  const p = realm3(10, 3), calls = spy(p);
  const before = plain(p.run("({ turn: S.turn, expN: S.expN, log: S.log, hist: S.hist, mibis: S.mibis, g1: S.regions[0].turnSeen, g3: S.regions[2] })"));
  const g2 = plain(p.run("S.regions[1]"));
  p.run("mountRegion('g2')");
  assert.deepEqual(calls(), [["g2", 7, 0, 0], ["g2", 8, 0, 0], ["g2", 9, 0, 0]], "turns 7, 8, 9 (S.turn - 3 up to S.turn), nothing pending");
  assert.equal(p.run("S.here"), "g2"); assert.equal(p.run("S.regions[1].turnSeen"), 10, "it has seen the realm's turn");
  assert.equal(p.run("S.seed"), g2.seed);
  const after = plain(p.run("({ turn: S.turn, expN: S.expN, log: S.log, hist: S.hist, mibis: S.mibis, g3: S.regions[2] })"));
  assert.equal(after.turn, before.turn); assert.equal(after.expN, before.expN, "the realm's counters do not move");
  assert.deepEqual(after.log, before.log, "no line, no log"); assert.deepEqual(after.hist, before.hist); assert.deepEqual(after.mibis, before.mibis);
  assert.deepEqual(after.g3, before.g3, "a region not mounted is not touched");
  assert.notDeepEqual(plain(p.run("S.cr")), g2.map.cr, "the creatures moved");
  // mounted again: nothing more to catch up
  p.run("mountRegion('g1'); mountRegion('g2')");
  assert.equal(calls().length, 3, "g1 and g2 are both current: no further turn");
  assert.equal(p.run("S.regions[0].turnSeen"), 10);
});

test("2. the seeds are the region's: the same catch-up twice gives the same map; a different region, or other turns, give another", () => {
  const run = (turn, seen) => { const p = realm3(turn, seen); p.run("mountRegion('g2')"); return JSON.stringify(plain(p.run("({ cr: S.cr, pods: S.pods, signs: S.signs })"))); };
  const a = run(10, 3), twin = run(10, 3);
  assert.equal(a, twin, "deterministic");
  assert.notEqual(a, run(10, 9), "one turn missed is not three");
  assert.notEqual(run(11, 4), a, "turns 8, 9, 10 are not turns 7, 8, 9");
  // the turn t on region 2 is the world's own turn for that seed: its creatures are those of a hand-made turn t on the same state
  const p = realm3(10, 9); p.run("mountRegion('g2')");   // one turn missed: t = 9
  const q = realm3(10, 10); q.run("mountRegion('g2'); const far = c => awayFromLast(c, { trail: [], entered: S.lastEntered || [] }); regionTurn(regionById(S, 'g2'), 9, { trail: [], storm: [] }, far)");
  assert.deepEqual(plain(p.run("S.cr")), plain(q.run("S.cr")));
});

test("3. a region a turn or two behind runs just those turns; a current one runs none; only the last 3 of a long absence", () => {
  for (const [seen, want] of [[10, []], [9, [9]], [8, [8, 9]], [7, [7, 8, 9]], [0, [7, 8, 9]]]) {
    const p = realm3(10, seen), calls = spy(p); p.run("mountRegion('g2')");
    assert.deepEqual(calls().map(c => c[1]), want, "turnSeen " + seen);
  }
});

test("4. the world turn of the region in hand: region turn, then realm turn, then the region has seen the turn; region 1's draws are the world's own", () => {
  const p = realm3(10, 10), calls = spy(p);
  p.run("mountRegion('g2'); S.expN = 10");
  const out = plain(p.run("worldTurn({ trail: [], storm: [] })"));
  assert.deepEqual(calls(), [["g2", 10, 0, 0]], "one region turn, at the realm's turn");
  assert.equal(p.run("S.turn"), 11); assert.equal(p.run("S.expN"), 11); assert.equal(p.run("S.regions[1].turnSeen"), 11);
  assert.ok(out.lines.length >= 1 && out.lines.length <= 3);
  assert.equal(p.run("S.regions[0].turnSeen"), 10, "region 1 was away: it will catch up");
  p.run("mountRegion('g1')"); assert.deepEqual(calls().map(c => c[1]), [10, 10], "g1 missed turn 10 only"); assert.equal(p.run("S.regions[0].turnSeen"), 11);
});

test("4b. the page's source: the region turn writes no line and no log, and does not count the turn; the realm turn does", () => {
  const body = name => { const i = PAGE.indexOf("function " + name + "("); return PAGE.slice(i, PAGE.indexOf("\n}\n", i)); };
  assert.ok(!/logEv\(|say\(|S\.turn\+\+|S\.expN\+\+/.test(body("regionTurn") + body("surfaceMissing") + body("catchUp")), "no lines, no counters in the region turn");
  assert.ok(/S\.turn\+\+; S\.expN\+\+/.test(body("realmTurn")) && /logEv\(/.test(body("realmTurn")));
  assert.ok(/regionTurn\(/.test(body("worldTurn")) && /realmTurn\(/.test(body("worldTurn")) && /turnSeen = S\.turn/.test(body("worldTurn")));
});

test("5. W4: a species the region lacks surfaces at its next region turn as one herd in its habitat, away from the trail, and nothing is said", () => {
  for (const seed of [3, 7, 42]) {
    const p = makePage({ console: "silent" }); p.run(`newWorld(${seed}); S.turn = 4`);
    const sp = 2, hab = W.ROSTER[sp].hab;
    p.run(`S.cr = S.cr.filter(w => w.sp !== ${sp}); indexCreatures()`);
    const trail = plain(p.run("(() => { const c = []; for (let i = 0; i < MW * MH; i++) if (G.comp[i] && cdist(i, G.spawns[0]) <= 4) c.push(i); return c; })()"));
    const out = plain(p.run(`worldTurn({ trail: ${JSON.stringify(trail)}, storm: [] })`));
    const mine = plain(p.run(`S.cr.filter(w => w.sp === ${sp})`));
    assert.ok(mine.length >= W.HERD.SIZE && mine.length < W.HERD.SIZE + 3, "a herd of " + mine.length);
    const cells = new Set(mine.map(w => w.c)); assert.equal(cells.size, 1, "in one cell");
    const [c] = cells;
    assert.ok(hab.includes(p.run(`G.land[${c}]`)) && p.run(`G.comp[${c}]`) === 1, "on reachable ground of its habitat");
    assert.ok(trail.every(t => p.run(`cdist(${t}, ${c})`) > 4), "away from the trail (the arrival guard)");
    assert.equal(new Set(plain(p.run("S.cr")).map(w => w.id)).size, p.run("S.cr.length"), "ids stay unique");
    assert.ok(!out.lines.some(l => /Untuva/i.test(l)), "no line names it");
    // it is a herd now: the next turn does not bring another
    const n = p.run(`S.cr.filter(w => w.sp === ${sp}).length`); p.run("worldTurn({ trail: [], storm: [] })");
    assert.ok(p.run(`S.cr.filter(w => w.sp === ${sp}).length`) < n + 3, "no second herd (a turn adds young, not a herd)");
  }
});

test("6. W4 in a catch-up too, and a region that holds every species draws nothing extra", () => {
  const p = realm3(10, 3);
  p.run("mountRegion('g2'); S.cr = S.cr.filter(w => w.sp !== 0); indexCreatures(); S.regions[1].turnSeen = 9; catchUp(S.regions[1])");
  assert.ok(p.run("S.cr.filter(w => w.sp === 0).length") >= W.HERD.SIZE, "Loikas surface in region 2 at its catch-up turn");
  // all present: the surfacing never fires (gen 3 holds every species by construction)
  const q = realm3(10, 3); q.run("globalThis.SURF = 0; { const o = surfaceMissing; surfaceMissing = (...a) => { const n = S.cr.length; o(...a); SURF += S.cr.length - n; }; }");
  q.run("mountRegion('g2')"); q.run("worldTurn({ trail: [], storm: [] })");
  assert.equal(q.run("SURF"), 0);
});
