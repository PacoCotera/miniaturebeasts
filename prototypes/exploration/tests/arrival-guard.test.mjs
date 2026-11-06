// TK-9, the arrival guard: every new thing arrives away from where the last expedition was, through one helper, awayFromLast().
// The page script runs in a sandbox with the browser stubbed (first-pods.test.mjs's harness).
//   node --test prototypes/exploration/tests/arrival-guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage, PAGE } from "./page-harness.mjs";
import * as W from "../src/world.mjs";


const page = (store = {}) => makePage({ store }).run;
const plain = x => JSON.parse(JSON.stringify(x));
const man = (a, b) => W.cdist(a, b);

// A small deterministic generator for the walks (the test's own, not the page's).
const lcg = seed => { let x = seed >>> 0; return n => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x % n; }; };

// 1,000 world turns, spread over 10 worlds of 100: each turn the last expedition walked a random trail (a random walk of 3 to 60
// map cells from a random land cell) and entered some of its cells; the turn must place nothing within 4 steps of the trail.
test("1. over 1,000 turns, nothing new arrives within 4 steps of any cell the last expedition walked", () => {
  let turns = 0, pods = 0, young = 0, blooms = 0;
  for (let w = 0; w < 10; w++) {
    const p = page(), rnd = lcg(1000 + w);
    p(`newWorld(${100 + w})`);
    const land = plain(p("Array.from(G.land, (l, c) => c).filter(c => passable(c) && G.land[c] !== L.WATER && G.comp[c])"));
    for (let t = 0; t < 100; t++) {
      let at = land[rnd(land.length)]; const trail = [at], n = 3 + rnd(58);
      for (let i = 0; i < n; i++) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rnd(4)], x = (at % 16) + d[0], y = ((at / 16) | 0) + d[1];
        if (x >= 0 && y >= 0 && x < 16 && y < 20 && land.includes(y * 16 + x)) { at = y * 16 + x; trail.push(at); } }
      const walked = [...new Set(trail)], entered = walked.filter(() => rnd(3) === 0);
      const r = plain(p(`S.lastEntered = ${JSON.stringify(entered)}; S.lastTrail = { cells: ${JSON.stringify(trail)}, turn: S.turn + 1 }; worldTurn({ trail: ${JSON.stringify(walked)}, storm: [] })`));
      const cells = [...r.arrived.pods, ...r.arrived.young, ...(r.arrived.bloom >= 0 ? [r.arrived.bloom] : [])];
      pods += r.arrived.pods.length; young += r.arrived.young.length; blooms += r.arrived.bloom >= 0 ? 1 : 0;
      for (const c of cells) for (const q of walked) assert.ok(man(c, q) > 4, `world ${100 + w} turn ${t}: arrival in ${c} is ${man(c, q)} from walked ${q}`);
      turns++;
    }
  }
  assert.equal(turns, 1000);
  assert.ok(pods > 1000 && young > 500 && blooms > 900, `the test saw arrivals: ${pods} pods, ${young} young, ${blooms} blooms`);
});

test("2. the pods and young a turn adds to the save are the ones the guard placed", () => {
  const p = page(); p("newWorld(7)");
  const r = plain(p(`(() => { const before = new Set(S.pods.map(q => q.id)), nc = S.cr.length;
    const out = worldTurn({ trail: [0, 1, 2], storm: [] });
    return { out, added: S.pods.filter(q => !before.has(q.id)).map(q => +q.k), young: S.cr.slice(nc).filter(w => w.young).map(w => w.c) }; })()`));
  assert.deepEqual(r.added, r.out.arrived.pods); assert.deepEqual(r.young, r.out.arrived.young);
});

test("3. warm stones skip every place the last expedition entered, through the same helper", () => {
  const p = page(); p("newWorld(7)");
  let chosen = 0;
  for (const start of plain(p("G.spawns"))) {
    const out = plain(p(`(() => { const ex = { start: ${start}, reach: reachCells(${start}, TIER[1].range) }; S.turn = 5;
      S.lastEntered = ex.reach.filter((_, i) => i % 2 === 0); S.lastTrail = { cells: S.lastEntered, turn: 5 }; chooseWarm(ex);
      return { entered: S.lastEntered, warm: ex.warm.map(k => +k.split(':')[0]) }; })()`));
    chosen += out.warm.length; for (const c of out.warm) assert.ok(!out.entered.includes(c), "a warm stone in an entered place " + c);
  }
  assert.ok(chosen > 0);
});

test("4. one helper: the page has a single arrival guard and the three arrival sites call it", () => {
  assert.equal((PAGE.match(/function awayFromLast\(/g) || []).length, 1);
  assert.ok(!/cdist\(t, c\) > 4/.test(PAGE.replace(/function awayFromLast[^\n]*\n[^\n]*\n/, "")), "no second hand-built 4-step test");
  for (const fn of ["worldTurn", "chooseWarm", "ensureCharge"]) {
    const i = PAGE.indexOf("function " + fn + "("), body = PAGE.slice(i, PAGE.indexOf("\n}\n", i));
    assert.ok(/awayFromLast\(/.test(body) || /farFromPlayer/.test(body) && fn === "worldTurn", fn + " asks the helper");
  }
  const wt = PAGE.slice(PAGE.indexOf("function worldTurn("), PAGE.indexOf("\n}\n", PAGE.indexOf("function worldTurn(")));
  assert.ok(/const farFromPlayer = c => awayFromLast\(c, last\)/.test(wt));
});
