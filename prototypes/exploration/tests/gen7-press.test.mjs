// Generator 7, G4b: picking up is a press. A walk over every find kind takes nothing; a press on each takes what it should; a full hold refuses and leaves the thing; a strike mark is read
// once and tops the trip's Data up to its tier's yield; the world turns when a place was entered and waits when none was.
//   node --test prototypes/exploration/tests/gen7-press.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { makeWalker } from "../tools/walker.mjs";

// A page in the start place of seed 7 with one of each find put on open ground, each with a free tile south of it to stand on: a charged stone, a full cup, a bush, a strike mark and a tuft.
function setup() {
  const p = makePage({ gen: 7, console: "silent", els: true, raf: 1 });
  p.run("newWorld(7)");
  p.run("TEST.calm = true; startExpedition('weather', G.spawns[0]); enterPatch();");
  const spots = JSON.parse(p.run(`JSON.stringify((() => { const P = S.exp.patch, lay = layout(P.key), out = [], dist = new Map([[P.y * lay.w + P.x, 0]]), q = [[P.x, P.y]];
    for (let h = 0; h < q.length; h++) { const [cx, cy] = q[h]; for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const X = cx + dx, Y = cy + dy, i = Y * lay.w + X;
      if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h || dist.has(i) || occupant(P.key, X, Y, 'player')) continue; dist.set(i, dist.get(cy * lay.w + cx) + 1); q.push([X, Y]); } }
    const free = (x, y) => dist.has(y * lay.w + x) && x > 1 && y > 1 && x < lay.w - 2 && y < lay.h - 2;
    for (let y = P.y - 2; y > 2 && out.length < 5; y--) for (let x = 2; x < lay.w - 2 && out.length < 5; x++)
      if (free(x, y) && free(x, y + 1) && free(x, y + 2) && dist.get((y + 1) * lay.w + x) <= 24 && out.every(o => Math.abs(o.x - x) + Math.abs(o.y - y) >= 4)) out.push({ x, y });
    return out; })())`));
  assert.equal(spots.length, 5, "five open spots in the start place");
  const [stone, cup, bush, mark, tuft] = spots;
  p.run(`(() => { const P = S.exp.patch, lay = layout(P.key), live = S.exp.live[P.key];
    lay.feats.push({ id: 'tk', kind: 'k', x: ${stone.x}, y: ${stone.y}, ch: 2 }, { id: 'tu', kind: 'u', x: ${cup.x}, y: ${cup.y}, full: true }, { id: 'tb', kind: 'b', x: ${bush.x}, y: ${bush.y} },
      { id: 'tq', kind: 'q', x: ${mark.x}, y: ${mark.y}, born: S.turn, glass: false });
    live.tf.push({ x: ${tuft.x}, y: ${tuft.y} }); S.veil[P.key] = new Array(lay.h).fill(0x0fffffff); })()`);
  return { p, w: makeWalker(p, {}), spots: { stone, cup, bush, mark, tuft } };
}
const hold = p => JSON.parse(p.run("JSON.stringify({ e: S.exp.cargo.e, d: S.exp.cargo.d, s: S.exp.cargo.s, a: S.exp.actions })"));
// stand south of a spot and face it
function face(t, s) { assert.ok(t.w.walk(s.x, s.y + 1, true, 80), "walked to " + s.x + "," + (s.y + 1)); t.p.key("up"); }

test("a walk past every find kind takes nothing: no Energy, Essence or Data enters the hold without a press", () => {
  const t = setup(), before = hold(t.p);
  for (const s of Object.values(t.spots)) { face(t, s); const h = hold(t.p); assert.deepEqual({ e: h.e, d: h.d, s: h.s }, { e: before.e, d: before.d, s: before.s }, "facing " + JSON.stringify(s)); }
  t.w.walk(2, 2, true, 80); t.p.key("call");
  const h = hold(t.p); assert.deepEqual({ e: h.e, d: h.d, s: h.s }, { e: before.e, d: before.d, s: before.s }, "after a Call too");
  assert.equal(t.p.run("S.exp.stats.hearts || 0"), 0, "no heart is found");
});

test("a press on each takes what it should: the stone's charge, the cup's dew, the tuft, a reading", () => {
  const t = setup(), { p } = t;
  face(t, t.spots.stone); assert.equal(p.run("patchAction().label"), "Take the charge"); p.key("confirm"); assert.equal(hold(p).e, 2);
  face(t, t.spots.cup); assert.equal(p.run("patchAction().label"), "Take the dew"); p.key("confirm"); assert.equal(hold(p).s, 1);
  face(t, t.spots.tuft); assert.equal(p.run("patchAction().label"), "Pick up the tuft"); p.key("confirm"); assert.equal(hold(p).s, 2);
  face(t, t.spots.mark); assert.equal(p.run("patchAction().label"), "Read the strike mark"); const yieldNow = p.run("walkYield(S.exp)");
  assert.deepEqual(JSON.parse(p.run("JSON.stringify(patchAction().ctx)")), ["strike mark · +" + yieldNow + " Data", "+" + yieldNow + " Data"]);
  p.key("confirm"); assert.equal(hold(p).d, yieldNow, "a reading tops the trip's field Data up to its tier's yield");
  assert.equal(p.run("S.exp.dField"), yieldNow); assert.equal(p.run("FX.msg"), "Data from strikes " + yieldNow + " of " + yieldNow);
  assert.equal(p.run("strikeIsRead(S.exp.patch.key, layout(S.exp.patch.key).feats.find(f => f.id === 'tq'))"), true);
});

test("a full hold refuses: nothing is taken, no turn passes, the thing stays where it lies", () => {
  const t = setup(), { p } = t;
  p.run("S.exp.cargo.e = 20; S.exp.cargo.s = 20; S.exp.cargo.d = 20");
  const refused = (spot, msg) => { face(t, spot); const before = hold(p); p.key("confirm"); assert.deepEqual(hold(p), before, "nothing taken and no action spent: " + msg); assert.equal(p.run("FX.msg"), msg); };
  refused(t.spots.stone, "Energy 20 of 20 · the stone keeps its charge");
  assert.equal(p.run("stormCharge(S.exp.patch.key, layout(S.exp.patch.key).feats.find(f => f.id === 'tk'))"), 2, "the stone keeps its charge");
  refused(t.spots.cup, "Essence 20 of 20 · the cup keeps its dew");
  assert.equal(p.run("cupFull(S.exp.patch.key, layout(S.exp.patch.key).feats.find(f => f.id === 'tu'))"), true);
  refused(t.spots.tuft, "Essence 20 of 20 · the tuft stays where it is");
  assert.equal(p.run("curLive().tf.length"), 1);
  refused(t.spots.mark, "Data 20 of 20 · the Probe holds no more");
  assert.equal(p.run("strikeIsRead(S.exp.patch.key, layout(S.exp.patch.key).feats.find(f => f.id === 'tq'))"), false);
});

test("a trip's strikes are capped at the tier's yield: a second mark is refused, stays unread, and is not counted to take", () => {
  const t = setup(), { p } = t, m = t.spots.mark;
  p.run(`(() => { const P = S.exp.patch, lay = layout(P.key); lay.feats.push({ id: 'tq2', kind: 'q', x: ${m.x + 4}, y: ${m.y}, born: S.turn, glass: false }); })()`);
  face(t, m); p.key("confirm"); const y = p.run("walkYield(S.exp)");
  assert.equal(p.run("leftCounts(layout(S.exp.patch.key).cell).strike"), 0, "none to take once the trip's strikes are full");
  const spot2 = { x: m.x + 4, y: m.y }; t.w.walk(spot2.x, spot2.y + 1, true, 80); p.key("up");
  assert.deepEqual(JSON.parse(p.run("JSON.stringify(patchAction().ctx)")), ["Data from strikes " + y + " of " + y, y + " of " + y + " this trip"]);
  const a0 = hold(p).a; p.key("confirm");
  assert.equal(p.run("FX.msg"), "Data from strikes " + y + " of " + y + " this trip · the mark stays unread"); assert.equal(hold(p).a, a0);
  assert.equal(p.run("strikeIsRead(S.exp.patch.key, layout(S.exp.patch.key).feats.find(f => f.id === 'tq2'))"), false);
});

test("a mark fades twelve world turns after the strike", () => {
  const t = setup(), { p } = t;
  assert.equal(p.run("strikeFaded({ born: S.turn })"), false); assert.equal(p.run("strikeFaded({ born: S.turn - 11 })"), false); assert.equal(p.run("strikeFaded({ born: S.turn - 12 })"), true);
});

test("the world turns when the walk entered a place, and waits when it entered none", () => {
  const a = makePage({ gen: 7, console: "silent", els: true, raf: 1 }); a.run("newWorld(7)"); a.run("TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const turn = a.run("S.turn"); a.run("endExpedition('send')");
  assert.equal(a.run("S.turn"), turn, "no place entered: the world waits"); assert.equal(a.run("S.report.waited"), true);
  const b = makePage({ gen: 7, console: "silent", els: true, raf: 1 }); b.run("newWorld(7)"); b.run("TEST.calm = true; startExpedition('weather', G.spawns[0]); enterPatch(); leavePatch();");
  b.run("endExpedition('send')");
  assert.equal(b.run("S.turn"), turn + 1, "a place entered: the world turns"); assert.equal(b.run("S.report.waited"), false);
});
