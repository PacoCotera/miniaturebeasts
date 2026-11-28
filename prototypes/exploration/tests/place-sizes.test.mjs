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
    layoutCache.set(key, lay); delete S.seen.tile[key]; delete S.cells[key]; S.pods = S.pods.filter(p => p.k !== key); S.exp.live[key].cr.length = 0; S.cr.length = 0; indexCreatures();
    S.exp.patch.x = 9; S.exp.patch.y = 19; })()`);
  return f;
}
const rows = f => plain(f.run("S.seen.tile[S.exp.patch.key]"));
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
  run("walkSeen()");
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
  const lift = plain(run("[...callLift(S.exp.patch.key, 9, 19, 7)]"));
  const v = rows(f); assert.equal(v.length, H);
  for (const r of v) assert.equal(r >>> W, 0, "no bit past the 18th column");
  for (const i of lift) { const x = i % W, y = (i / W) | 0; assert.ok(x < W && y < H, "inside the place"); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - 9) ** 2 + (y - 19) ** 2 <= 7.5 ** 2) assert.ok(lifted(f).has(y * W + x), `(${x},${y}) in the ring is lifted`);
  assert.ok(!lifted(f).has(0 * W + 0), "(0,0) is 20 tiles away");
  // and the page's own Call: it lifts the same round and reports the way to what is found
  const g = small(); g.run("callPlace()");
  assert.ok(!/Nothing in sight/.test(g.run("FX.msg")), "a Call that finds nothing says nothing (the ✓ word points on)");
  assert.equal(g.run("S.seen.tile[S.exp.patch.key].length"), H);
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
  // bug #11 and #37: a step keeps the line it left on, the row sideways and the column up or down (not the middle of the edge)
  const kept = plain(run("ALONG = { key: S.exp.patch.key, k: 4 }; var r = ['right', 'left', 'up', 'down'].map(d => entryPoint(layout(S.exp.patch.key), S.exp.patch.key, d)); ALONG = null; r"));
  assert.deepEqual(kept, [{ x: 0, y: 4 }, { x: 17, y: 4 }, { x: 4, y: 21 }, { x: 4, y: 0 }], "all four directions land on the matching cell");
  const far = plain(run("ALONG = { key: S.exp.patch.key, k: 99 }; var r = ['right', 'up'].map(d => entryPoint(layout(S.exp.patch.key), S.exp.patch.key, d)); ALONG = null; r"));
  assert.deepEqual(far, [{ x: 0, y: 21 }, { x: 17, y: 21 }], "a line past this place's size is clamped to its last row or column");
});

test("bug #37: the cell across the edge is taken by something: the nearest walkable cell ALONG the edge, else the nearest anywhere", () => {
  const f = small({ feats: "[{ id: 'b1', kind: 'b', x: 4, y: 21 }, { id: 'b2', kind: 'b', x: 9, y: 0 }]" }), run = f.run;
  const at = (d, k) => plain(run(`ALONG = { key: S.exp.patch.key, k: ${k} }; var r = entryPoint(layout(S.exp.patch.key), S.exp.patch.key, '${d}'); ALONG = null; r`));
  assert.deepEqual(at("up", 4), { x: 3, y: 21 }, "a bush on the matching cell: the next cell along the edge (ties to the lower index)");
  assert.deepEqual(at("down", 9), { x: 8, y: 0 }, "the same from the other side");
  assert.deepEqual(at("up", 5), { x: 5, y: 21 }, "its neighbour is not touched");
  // no walkable cell along the whole edge: the nearest one inside
  run("(() => { const lay = layout(S.exp.patch.key); for (let x = 0; x < lay.w; x++) lay.reach[21 * lay.w + x] = 0; })()");
  assert.deepEqual(at("up", 4), { x: 4, y: 20 }, "the edge row has none: one in");
});

test("bug #37: a real step off the edge, up, down, left and right, lands on the matching cell of the next place (or the nearest free one along the edge)", () => {
  const p = makePage({ gen: 7, console: "silent", els: true, raf: 1 });
  p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]); enterPatch();");
  const a = p.run("S.exp.pos"), cross = (dir, k) => plain(p.run(`(() => { if (S.exp.patch) leavePatch(); S.exp.pos = ${a}; enterPatch(); if (RT.view) endView(); S.exp.actions = 0;
    const lay = layout(String(${a})), P = S.exp.patch, c = stepCell(${a}, '${dir}'); P.x = '${dir}' === 'right' ? lay.w - 1 : '${dir}' === 'left' ? 0 : ${k}; P.y = '${dir}' === 'down' ? lay.h - 1 : '${dir}' === 'up' ? 0 : ${k}; P.dir = '${dir}';
    crossEdge('${dir}'); const Q = S.exp.patch; if (!Q || S.exp.pos !== c) return null; const lb = layout(String(c)); return { x: Q.x, y: Q.y, w: lb.w, h: lb.h, ok: !T_BLOCK[lb.tiles[Q.y * lb.w + Q.x]] }; })()`));
  for (const dir of ["up", "down", "left", "right"]) {
    let crossed = 0;
    for (const k of [3, 6, 9, 12, 15, 18]) { const r = cross(dir, k); if (!r) continue; crossed++;
      const mx = dir === "right" ? 0 : dir === "left" ? r.w - 1 : k, my = dir === "down" ? 0 : dir === "up" ? r.h - 1 : k;
      assert.ok(r.ok, dir + " " + k + ": lands on ground that walks");
      if (dir === "up" || dir === "down") assert.equal(r.y, my, dir + " " + k + ": on the edge row of the next place"); else assert.equal(r.x, mx, dir + " " + k + ": on the edge column of the next place");
      if (r.x === mx && r.y === my) continue;   // the cell across the edge itself
      assert.ok(Math.abs((dir === "up" || dir === "down" ? r.x - k : r.y - k)) <= 12, dir + " " + k + ": a free cell along the same edge, not across the place: " + JSON.stringify(r)); }
    assert.ok(crossed >= 2, dir + ": the step crosses from some cells of the edge (" + crossed + ")");
  }
});

test("bug #37: the slide scrolls the view by what keeps the pawn on its line of the map: a screen when both places are flush, a few tiles more or less when their cameras differ", () => {
  const p = makePage({ gen: 7, console: "silent", els: true, raf: 1 }), run = p.run; p.run("newWorld(7); RT.ts = 48;");
  const off = (dir, pl0, pl1) => plain(run(`slideOffsets({ dx: ${dir[0]}, dy: ${dir[1]}, pl: ${JSON.stringify(pl0)} }, ${JSON.stringify(pl1)}, 450, 500)`));
  // right, pawn in the right column of the old screen (x 402 of 450) and one tile on, in the left column of the new one (x 24): the plain screen
  assert.deepEqual(off([1, 0], { x: 426, y: 200 }, { x: 24, y: 200 }), { old: { x: -450, y: 0 }, nw: { x: 450, y: 0 } });
  // the next place's camera is 30 px off along the edge (it is wider, so the pawn is further from its edge): the layers shift along the edge by the difference, the old one by it at the end, the new one at the start
  assert.deepEqual(off([1, 0], { x: 426, y: 200 }, { x: 24, y: 230 }), { old: { x: -450, y: 30 }, nw: { x: 450, y: -30 } });
  assert.deepEqual(off([0, -1], { x: 200, y: 24 }, { x: 170, y: 476 }), { old: { x: -30, y: 500 }, nw: { x: 30, y: -500 } }, "up: the same, along the other axis");
  // no pawn position (a cut, or the first frame): the plain slide; a distance that is no screen: the plain slide
  assert.deepEqual(off([0, 1], null, { x: 200, y: 24 }), { old: { x: 0, y: -500 }, nw: { x: 0, y: 500 } });
  assert.deepEqual(off([1, 0], { x: 426, y: 200 }, { x: 2000, y: 200 }), { old: { x: -450, y: 0 }, nw: { x: 450, y: 0 } });
});

test("the veil words on an 18×22 place: a veiled stone says so until a Call lifts it", () => {
  // a stone on a veiled tile reads "Veiled · Call to see" until a Call lifts it
  const g = small({ feats: "[{ id: 'k1', kind: 'k', x: 9, y: 11, ch: 0 }]" });
  g.run("S.exp.patch.x = 9; S.exp.patch.y = 12; S.exp.patch.dir = 'up'; S.seen.tile[S.exp.patch.key] = new Array(" + H + ").fill(0);");
  assert.equal(g.run("patchAction().label"), "Veiled · Call to see");
  g.run("callLift(S.exp.patch.key, 9, 12, 7)");
  assert.notEqual(g.run("patchAction().label"), "Veiled · Call to see");
});
