// C12: places of two sizes. A layout carries its own w and h (generated places and caves keep 28×32); the page's walking lift, Call lift, edges and veil words
// read them. An 18×22 fixture layout drives each.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, plain } from "./walk-fixture.mjs";
import { makePage } from "./page-harness.mjs";
import { viewOf, camAt } from "../src/view.mjs";

const W = 18, H = 22;

// the first place of the fixture world, replaced by an open 18×22 field of grass with one stone and the pawn at the south door
function small({ feats = "[]" } = {}) {
  const f = fixture({ canvas: true }), run = f.run;
  run(`(() => { const key = S.exp.patch.key, old = layout(key), n = ${W} * ${H};
    const lay = Object.assign({}, old, { w: ${W}, h: ${H}, tiles: new Array(n).fill(T.GRASS), reach: new Uint8Array(n).fill(1), shelter: new Uint8Array(n), sdist: new Array(n).fill(9), feats: ${feats}, cross: [], stairs: [], spawnPt: { x: 9, y: 19 }, terr: null, tmask: null, heart: undefined, vbl: undefined, tk: undefined });
    layoutCache.set(key, lay); delete S.veil[key]; delete S.cells[key]; S.pods = S.pods.filter(p => p.k !== key); S.exp.live[key].cr.length = 0; S.cr.length = 0; indexCreatures();
    S.exp.patch.x = 9; S.exp.patch.y = 19; })()`);
  return f;
}
const rows = f => plain(f.run("S.veil[S.exp.patch.key]"));
const lifted = f => { const v = rows(f), o = new Set(); v.forEach((r, y) => { for (let x = 0; x < 32; x++) if ((r >>> x) & 1) o.add(y * W + x); }); return o; };

test("generated places and caves carry w 28 and h 32; a layout's own size is what the page reads", () => {
  const p = makePage({ console: "silent" }); p.run("newWorld(7)");
  assert.deepEqual(plain(p.run("[layout(String(G.spawns[0])).w, layout(String(G.spawns[0])).h, layout('c' + G.gate).w, layout('c' + G.gate).h]")), [28, 32, 28, 32]);
  const v = viewOf(48, 0, 32, 450, 532, W, H); assert.deepEqual([v.pw, v.ph], [W * 48, H * 48]);
  const std = viewOf(48, 0, 32, 450, 532); assert.deepEqual([std.pw, std.ph], [28 * 48, 32 * 48], "the default is the standard size");
  const c = camAt(v, (W - 1) * 48, (H - 1) * 48); assert.deepEqual(c, { x: W * 48 - 450, y: H * 48 - 532 }, "the camera clamps at the small place's far corner");
});

test("walking lift on an 18×22 place: the circle of 4 tiles, clipped at the place's own edges, no bit past column 17 or row 21", () => {
  const f = small(), run = f.run;
  run("walkLift()");
  const v = rows(f); assert.equal(v.length, H, "one row word per row");
  for (const r of v) assert.equal(r >>> W, 0, "no bit past the 18th column");
  const got = lifted(f), want = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - 9) ** 2 + (y - 19) ** 2 <= (4 + .3) ** 2) want.add(y * W + x);
  assert.deepEqual([...got].sort((a, b) => a - b), [...want].sort((a, b) => a - b), "exactly the circle");
  assert.ok(got.has(21 * W + 9), "the last row lifts");
  assert.ok(!got.has(0), "the far corner stays veiled");
});

test("Call lift on an 18×22 place: the round of 7 tiles, clipped; a veiled tile past the ring with lifted land behind it closes", () => {
  const f = small(), run = f.run;
  const lift = plain(run("[...unveilRound(S.exp.patch.key, 9, 19, 7)]"));
  const v = rows(f); assert.equal(v.length, H);
  for (const r of v) assert.equal(r >>> W, 0, "no bit past the 18th column");
  for (const i of lift) { const x = i % W, y = (i / W) | 0; assert.ok(x < W && y < H, "inside the place"); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - 9) ** 2 + (y - 19) ** 2 <= 7.5 ** 2) assert.ok(lifted(f).has(y * W + x), `(${x},${y}) in the ring is lifted`);
  assert.ok(!lifted(f).has(0 * W + 0), "(0,0) is 20 tiles away");
  // and the page's own Call: it lifts the same round and reports the way to what is found
  const g = small(); g.run("callPlace()");
  assert.ok(!/Nothing in sight/.test(g.run("FX.msg")), "a Call that finds nothing says nothing (the ✓ word points on)");
  assert.equal(g.run("S.veil[S.exp.patch.key].length"), H);
});

test("edges on an 18×22 place: x 17 and y 21 are the last tiles; one more leaves the place (on a 28×32 place the same press only steps)", () => {
  const f = small(), run = f.run;
  run("globalThis.__crossed = null; crossEdge = d => { globalThis.__crossed = d; };");
  const step = (x, y, dir) => { run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; globalThis.__crossed = null; patchStep('${dir}', 'creep')`); return run("globalThis.__crossed"); };
  assert.equal(step(17, 10, "right"), "right", "east edge at column 17");
  assert.equal(step(16, 10, "right"), null, "one short of it: a step");
  assert.equal(run("S.exp.patch.x"), 17);
  assert.equal(step(9, 21, "down"), "down", "south edge at row 21");
  assert.equal(step(9, 20, "down"), null);
  assert.equal(run("S.exp.patch.y"), 21);
  assert.equal(step(0, 10, "left"), "left"); assert.equal(step(9, 0, "up"), "up");
  // the same press on a standard place is only a step
  const g = fixture({ canvas: true }); g.run("globalThis.__crossed = null; crossEdge = d => { globalThis.__crossed = d; }; layout(S.exp.patch.key).reach.fill(1);");
  g.run("S.exp.patch.x = 17; S.exp.patch.y = 10; patchStep('right', 'creep')"); assert.equal(g.run("globalThis.__crossed"), null, "17 is inside a 28-wide place");
  // coming in: the entry tile is on the small place's own edge, mid-edge
  const e = plain(run("[entryPoint(layout(S.exp.patch.key), S.exp.patch.key, 'up'), entryPoint(layout(S.exp.patch.key), S.exp.patch.key, 'right'), entryPoint(layout(S.exp.patch.key), S.exp.patch.key, 'left'), entryPoint(layout(S.exp.patch.key), S.exp.patch.key, 'down')]"));
  assert.deepEqual(e, [{ x: 9, y: 21 }, { x: 0, y: 11 }, { x: 17, y: 11 }, { x: 9, y: 0 }]);
});

test("the veil words on an 18×22 place: a veiled stone says so until a Call lifts it", () => {
  // a stone on a veiled tile reads "Veiled · Call to see" until a Call lifts it
  const g = small({ feats: "[{ id: 'k1', kind: 'k', x: 9, y: 11, ch: 0 }]" });
  g.run("S.exp.patch.x = 9; S.exp.patch.y = 12; S.exp.patch.dir = 'up'; S.veil[S.exp.patch.key] = new Array(" + H + ").fill(0);");
  assert.equal(g.run("patchAction().label"), "Veiled · Call to see");
  g.run("unveilRound(S.exp.patch.key, 9, 12, 7)");
  assert.notEqual(g.run("patchAction().label"), "Veiled · Call to see");
});
