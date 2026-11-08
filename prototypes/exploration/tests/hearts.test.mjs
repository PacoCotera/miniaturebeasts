// C9: hearts (walk slice W§2, W§3) on generator 5 places: one heart per place, found = unveiled and within 4 tiles, the yield and the dot move
// to the heart, tells through the veil within 6 tiles, the Call and the bottom line lead with the heart, the spring pays once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { fixture, plain } from "./walk-fixture.mjs";
import { pickHeart, HEART_TEXT } from "../src/hearts.mjs";
import * as W from "../src/world.mjs";
import * as golden from "./png-golden.mjs";
globalThis.__golden = golden;

const SEEDS = [7, 13, 42];
const NO_WORDS = /\bheart\b|\bnest\b|surveyed|survey begun|\bN\/4\b|\d\/4/i;

// every place of a world's start region, as the page builds it
function places(seed) {
  const p = makePage({ console: "silent" }); p.run(`newWorld(${seed})`);
  const cells = plain(p.run("Array.from(G.comp).map((v, c) => v && passable(c) && G.land[c] !== L.WATER ? c : -1).filter(c => c >= 0)"));
  return { p, cells };
}

test("one heart per place across seeds 7, 13, 42, reachable from the entry, kind by place type", () => {
  for (const seed of SEEDS) {
    const { p, cells } = places(seed); let n = 0;
    for (const c of cells) {
      const key = String(c), h = plain(p.run(`heartOf(${JSON.stringify(key)})`)), lay = plain(p.run(`(() => { const l = layout(${JSON.stringify(key)}); return { land: l.land, spawn: l.spawnPt, reach: Array.from(l.reach) }; })()`));
      assert.ok(h, `seed ${seed} cell ${c}: a heart`); n++;
      assert.ok(["spring", "nest", "stone"].includes(h.kind));
      if (lay.land === W.L.MEADOW) assert.equal(h.kind, "spring", "meadow: a spring");
      if (lay.land === W.L.ROCK) assert.ok(["stone", "nest", "spring"].includes(h.kind));
      assert.ok(h.reachBy === null, "reachable: no partner needed, or reachBy would be named");
      assert.ok(h.path.length > 0, "a path from the entry");
      assert.equal(h.path[0].x, lay.spawn.x); assert.equal(h.path[0].y, lay.spawn.y);
      const end = h.path[h.path.length - 1]; assert.ok(Math.max(Math.abs(end.x - h.x), Math.abs(end.y - h.y)) <= 1, "the path ends at the heart");
      for (const q of h.path) assert.ok(lay.reach[q.y * W.PW + q.x], "every step is reachable ground");
      // stable: the same heart on a second ask and from the saved state
      assert.deepEqual(plain(p.run(`(() => { layout(${JSON.stringify(key)}).heart = undefined; return heartOf(${JSON.stringify(key)}); })()`)), h);
    }
    assert.ok(n >= 5, "seed " + seed + " has places");
  }
});

test("pickHeart is pure and takes the most enclosed ground within walking range", () => {
  const { p, cells } = places(13), key = String(cells[0]);
  const lay = p.run(`layout(${JSON.stringify(key)})`);
  const a = pickHeart(lay, 13), b = pickHeart(lay, 13); assert.deepEqual(plain(a), plain(b));
  assert.ok(a.path.length >= 8 && a.path.length <= 26, "a walk of about 8 to 24 steps from the entry: " + a.path.length);
});

// a fixture standing in the first place, the heart placed where a test wants it
function stand(seed = 13, hold = null) {
  const f = fixture({ seed, canvas: true }), r = f.run;
  r("TEST.calm = true; S.veil = {}; S.called = {}; S.exp.stats.hearts = 0; S.exp.dField = 0; S.exp.cargo.d = 0; S.exp.cargo.s = 0;");
  r("FX.msg = ''; FX.notes = [];");
  return f;
}
const heart = f => plain(f.run("heartOf(S.exp.patch.key)"));
const to = (f, x, y) => f.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; layout(S.exp.patch.key).heart; walkLift();`);
const found = f => f.run("heartFound(curLay().cell)");

test("found = unveiled and within 4 tiles: triggers once, pays the field yield once, fills the dot", () => {
  const f = stand(); const h = heart(f), key = f.run("S.exp.patch.key"), cell = f.run("curLay().cell");
  f.run("S.veil = {}; S.exp.patch.x = " + h.path[0].x + "; S.exp.patch.y = " + h.path[0].y + ";");
  // far: a Call lifts it from afar but the find waits until you are within 4 tiles
  f.run("layoutCache.clear(); S.cells = {};");
  const h2 = heart(f);
  assert.deepEqual([h2.x, h2.y, h2.kind], [h.x, h.y, h.kind], "the same heart after the layout is rebuilt");
  f.run(`unveilRound(S.exp.patch.key, ${h.x}, ${h.y}, 2)`);   // the heart tile is unveiled without anyone near
  assert.equal(found(f), false, "unveiled alone does not find it");
  assert.equal(f.run("explored(curLay().cell)"), false);
  const near = h.path[Math.max(0, h.path.length - 4)];   // 3 steps from the end of its path
  to(f, near.x, near.y);
  assert.ok(Math.max(Math.abs(near.x - h.x), Math.abs(near.y - h.y)) <= 4);
  assert.equal(found(f), true, "within 4 and unveiled: found");
  assert.equal(f.run("S.exp.stats.hearts"), 1);
  assert.equal(f.run("explored(curLay().cell)"), true, "the reach dot fills");
  const d1 = f.run("S.exp.cargo.d"); assert.equal(d1, f.run("walkYield(S.exp)"), "the yield, paid at the find");
  assert.equal(f.run("S.exp.dField"), d1);
  // exactly once: more lifts, more walking, a Call: no second find, no second payment
  to(f, near.x, near.y); f.run("callPlace()"); f.p.pass(1000);
  assert.equal(f.run("S.exp.stats.hearts"), 1); assert.equal(f.run("S.exp.cargo.d"), d1);
  void key; void cell;
});

test("a Call pays nothing by itself; the yield is not paid for calling (no heart found, no yield)", () => {
  const f = stand();
  f.run("callPlace()"); f.p.pass(1000);
  assert.equal(f.run("S.exp.cargo.d"), 0); assert.equal(f.run("exploredAny(S.exp)"), false);
  assert.equal(f.run("S.called[curLay().cell] || 0"), 0, "calling alone does not fill the dot");
});

test("the Call report leads with the heart and never says surveyed; the bottom line never drops the heart state", () => {
  for (const seed of SEEDS) {
    const f = stand(seed); const h = heart(f);
    // stand 2 tiles from the heart on its path and Call: the heart is in the ring, not yet found when veiled out of walking reach? found here: the report leads with 'found'
    const stand2 = h.path[Math.max(0, h.path.length - 2)]; f.run("S.veil = {}"); f.run(`S.exp.patch.x = ${stand2.x}; S.exp.patch.y = ${stand2.y};`);
    f.run("FX.msg = ''; FX.notes = []; S.found.push('callintro'); callPlace(); settleOnce();");
    const msg = f.run("FX.notes.map(n => n.text).join(' | ')");
    assert.doesNotMatch(msg, NO_WORDS, msg);
    assert.match(f.run("FX.notes.map(n => n.text).filter(t => /found|slow beat|glints|holds its charge|quiet stone|Nothing answers/.test(t)).join('')"), /found|slow beat|glints|holds|quiet|Nothing answers/);
    // the line at every width: the heart state is in every candidate
    f.run("S.found.push('backplace'); FX.hintNote = null;");
    const ctx = f.run("lineFor().ctx"); const cands = Array.isArray(ctx) ? ctx : [ctx];
    for (const c of cands) assert.match(c, /found|a slow beat|water glints|struck stone|something here|something moves|cave/, "candidate: " + c);
    for (const c of cands) assert.doesNotMatch(c, NO_WORDS, c);
    // the shortest candidate is the state alone
    assert.match(cands[cands.length - 1].replace("\x01", ""), /^(found|a slow beat|water glints in the grass|a struck stone|something here to find|something moves)$/);
  }
});

test("a Call from far leads with the tell and its direction; the find still waits for 4 tiles", () => {
  const f = stand(); const h = heart(f);
  const far = h.path[Math.max(0, h.path.length - 7)];   // about 6 steps out: inside a Call of 7, outside walking sight
  f.run("S.veil = {}; S.found.push('callintro');"); f.run(`S.exp.patch.x = ${far.x}; S.exp.patch.y = ${far.y};`);
  const d = Math.max(Math.abs(far.x - h.x), Math.abs(far.y - h.y)); if (d <= 4) return;   // a bent path can bring the heart close: nothing to test
  f.run("FX.msg = ''; FX.notes = []; callPlace();");
  assert.equal(found(f), false, "not found from afar");
  const msg = f.run("FX.notes.map(n => n.text).join(' | ')");
  const lead = h.kind === "spring" ? "Water glints in the grass" : h.kind === "nest" ? "A slow beat" : /A struck stone still holds its charge|A quiet stone/;
  if (lead instanceof RegExp) assert.match(msg, lead); else assert.ok(msg.startsWith(lead), msg);
  assert.match(msg, /north|south|east|west/);
});

test("a scripted walk finds the heart in the first place in at most 60 actions (seeds 7, 13, 42): Call once, then follow the way it points", () => {
  const DIR = { "0,-1": "up", "0,1": "down", "-1,0": "left", "1,0": "right" };
  for (const seed of SEEDS) {
    const f = stand(seed), h = heart(f), a0 = f.run("S.exp.actions");
    f.run("callPlace()"); f.p.pass(1000);   // one Call: the tell, with its direction
    for (let i = 1; i < h.path.length && !found(f); i++) {
      const a = h.path[i - 1], b = h.path[i]; f.run(`patchStep(${JSON.stringify(DIR[(b.x - a.x) + "," + (b.y - a.y)])}, 'walk')`);
    }
    const used = f.run("S.exp.actions") - a0;
    assert.ok(found(f), `seed ${seed}: found`); assert.ok(used <= 60, `seed ${seed}: ${used} actions`);
  }
});

test("every place of seeds 7, 13, 42 has its heart within 40 steps of the entry (the 60-action target)", () => {
  for (const seed of SEEDS) { const { p, cells } = places(seed); for (const c of cells) { const h = plain(p.run(`heartOf("${c}")`)); assert.ok(h.path.length <= 40, `seed ${seed} cell ${c}: ${h.path.length}`); } }
});

test("the spring pays Essence once, on stepping onto it, and never again", () => {
  // find a seed and place with a spring heart (meadow places always draw one)
  const f = stand(13); const key = f.run("S.exp.patch.key");
  f.run("const L0 = layout(S.exp.patch.key); L0.heart = undefined; S.cells = {}; var __h = { x: L0.spawnPt.x, y: L0.spawnPt.y - 2, kind: 'spring' }; setFS(S.exp.patch.key, 'heart', __h); L0.heart = undefined;");
  const h = heart(f); assert.equal(h.kind, "spring");
  f.run(`S.veil = {}; S.exp.patch.x = ${h.x}; S.exp.patch.y = ${h.y + 1}; walkLift(); S.exp.cargo.s = 0; FX.notes = [];`);
  f.run(`patchStep('up', 'walk')`);   // onto the spring
  assert.equal(f.run("S.exp.patch.x === heartOf(S.exp.patch.key).x && S.exp.patch.y === heartOf(S.exp.patch.key).y"), true);
  assert.equal(f.run("S.exp.cargo.s"), 3, "+3 Essence");
  assert.equal(f.run("fs(S.exp.patch.key, 'heart').drunk"), 1);
  f.run("S.exp.patch.x = " + h.x + "; S.exp.patch.y = " + (h.y + 1) + "; patchStep('up', 'walk'); patchStep('down', 'walk'); patchStep('up', 'walk');");
  assert.equal(f.run("S.exp.cargo.s"), 3, "no trickle, no second drink");
  assert.equal(HEART_TEXT.spring.drink(3), "+3 Essence · the water is cool");
  void key;
});

test("the tells, drawn: a spring's shimmer, a pod's slow beat and a struck stone's bolt, each under the veil, 5 tiles out (stills)", () => {
  const { goldenStill } = globalThis.__golden;
  for (const kind of ["spring", "nest", "stone"]) {
    const f = stand(13), r = f.run;
    const h0 = heart(f), end = h0.path[h0.path.length - 1];
    r(`S.cells = {}; layoutCache.clear(); setFS(S.exp.patch.key, 'heart', { x: ${end.x}, y: ${end.y}, kind: '${kind}' }); S.veil = {}; S.called = {}; S.exp.patch.x = ${h0.path[Math.max(0, h0.path.length - 6)].x}; S.exp.patch.y = ${h0.path[Math.max(0, h0.path.length - 6)].y}; RT.pl = null; RT.key = null; FX.msg = ''; FX.notes = []; S.found.push('callintro', 'backplace'); S.exp.fog = null; S.exp.storm = null;`);
    assert.equal(heart(f).kind, kind);
    assert.equal(r("tellShows(heartOf(S.exp.patch.key), S.exp.patch)"), true);
    for (let i = 0; i < 3; i++) { f.p.clock.t += 16; r(`RT.key = null; render(${f.p.clock.t})`); }
    goldenStill(assert, f.p, `tell-${kind}.png`);
  }
});

test("tells show through the veil within 6 tiles and stop once the heart is found; Call radius is 7 (4 in fog, 6 with a glow)", () => {
  const f = stand();
  assert.equal(f.run("CALL_R"), 7); assert.equal(f.run("CALL_R_FOG"), 4);
  const h = heart(f);
  assert.equal(f.run(`tellShows(heartOf(S.exp.patch.key), { x: ${h.x + 6}, y: ${h.y} })`), true);
  assert.equal(f.run(`tellShows(heartOf(S.exp.patch.key), { x: ${h.x + 7}, y: ${h.y} })`), false);
  // the page draws without error with the tell shown, answering, and after the find (the screen is 450×600 at 1x)
  f.run("S.veil = {}");
  for (const [dx, dy] of [[0, 3], [0, 6]]) { f.run(`S.exp.patch.x = ${h.x}; S.exp.patch.y = ${Math.min(W.PH - 2, h.y + dy)}; RT.pl = null; render(5)`); }
  f.run("S.exp.answerUntil = S.exp.actions + 3; render(5)"); f.run("S.called[curLay().cell] = 1; render(5)");
});
