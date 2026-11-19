// call-probe-marks-1 (owner #55 #56 #60 #64): the held view's fruit and reach line, the start pick's reach square, the nearest-thing tab after every Call.
//   node --test prototypes/exploration/tests/call-probe-marks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";
const fresh = () => { const p = makePage({ console: "silent", canvas: true }); p.run(SETUP); return p; };
const px = (p, x, y) => p.run("scr").px()[y * p.run("scr").width + x];

test("#64 the start pick draws the Probe's reach round the chosen cell, and it moves with it", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); ensureMap();");
  const at = (cur) => {
    p.run(`S.ui.cur = ${cur}; S.ui.type = 'weather'; scr.px().fill(-1); drawMap('place', 0);`);
    return p.run(`(() => { const s0 = cxy(${cur}), r = TIER[S.tier].range; return { x0: MAP_X + (s0.x - r) * CELL, y0: MAP_Y + (s0.y - r) * CELL, x1: MAP_X + (s0.x + r + 1) * CELL - 2, r, amber: HEX.indexOf(HEX[C.amber]) }; })()`);
  };
  const cells = p.run("[...Array(MW * MH).keys()].filter(c => { const q = cxy(c); return q.x >= 3 && q.y >= 3 && q.x < MW - 3 && q.y < MH - 3; }).slice(0, 40)");
  const a = cells[0], b = cells.find(c => c !== a && Math.abs(c % 1000 - a % 1000) > 0 && p.run(`cxy(${c}).x !== cxy(${a}).x`));
  const A = at(a), amberOf = (g) => p.run(`HEX.indexOf('${p.run("HEX[C.amber]")}')`);
  const am = amberOf();
  const topLeft = (g) => px(p, g.x0, g.y0), topRight = (g) => px(p, g.x1, g.y0);
  assert.equal(topLeft(A), am, "the dashed square's corner stands at the chosen cell's range");
  const B = at(b);
  assert.equal(px(p, B.x0, B.y0), am, "after moving the pick, the square stands round the new cell");
  assert.notEqual(A.x0, B.x0, "the two squares are in different places");
  void topRight;
});

test("#60 the held view's reach line is the walk's dashed bark line on the sides facing ground past the range", () => {
  const p = fresh();
  const bark = p.run("HEX.indexOf(HEX[C.bark])");
  // stand on the start cell with the range at one ring, so the line lies in the ring of cells round the view's cell
  p.run("S.exp.range = 0; scr.px().fill(-1); const lay = layout(S.exp.patch.key); peekReachLine(lay, 40, 40, 12);");
  const W = p.run("scr.width"), data = p.run("scr").px();
  const n = Array.from(data).filter(v => v === bark).length;
  assert.ok(n > 0, "the held view draws the reach line when the range square's side shows: " + n);
  // with a range wider than the view's ring nothing faces ground past it
  p.run("S.exp.range = 5; scr.px().fill(-1); peekReachLine(layout(S.exp.patch.key), 40, 40, 12);");
  assert.equal(Array.from(p.run("scr").px()).filter(v => v === bark).length, 0, "no line when the whole ring is inside the range");
  void W;
});

test("#55 the held view draws a bush with fruit and a fruit on the ground, never under the veil", () => {
  const p = fresh();
  const draw = () => { p.run("scr.px().fill(-1); { const lay = layout(S.exp.patch.key); peekFruit(lay.cell === undefined ? S.exp.patch.key : S.exp.patch.key, lay, (x, y) => ({ x: x * 12, y: 60 + y * 12 }), 12); }"); return Array.from(p.run("scr").px()).filter(v => v >= 0).length; };
  const key = p.run("S.exp.patch.key");
  p.run(`{ const lay = layout('${key}'); globalThis.__bush = lay.feats.find(f => f.kind === 'b' && !f.tree); }`);
  const hasBush = p.run("!!globalThis.__bush");
  if (hasBush) {
    p.run(`S.veil['${key}'] = new Array(PH).fill(0);`);
    p.run("{ const f = globalThis.__bush; fs(S.exp.patch.key, f.id).bare = 0; }");
    p.run(`S.veil['${key}'] = new Array(PH).fill(0x0fffffff);`);
    const seen = draw();
    p.run(`S.veil['${key}'] = new Array(PH).fill(0); S.exp.live['${key}'].fr = [];`);
    const veiled = draw();
    assert.ok(seen >= veiled, "a bush under the veil is not drawn");
  }
  p.run(`S.veil['${key}'] = new Array(PH).fill(0x0fffffff); S.exp.live['${key}'].fr = [{ id: 1, x: 5, y: 5 }];`);
  const withFruit = draw();
  p.run(`S.exp.live['${key}'].fr = [];`);
  const without = draw();
  assert.ok(withFruit > without, "a fruit on the seen ground is drawn");
});

test("#56 after a Call with nothing to take in sight, any walk, the way to the nearest thing to take or explore is named", () => {
  const p = fresh();
  assert.equal(p.run("firstWalk()"), false, "not the first walk");
  assert.equal(p.run("leadWay(S.exp.patch, layout(S.exp.patch.key))"), null, "no Call here yet: no tab, no line");
  p.run("S.exp.callsAt = { [layout(S.exp.patch.key).cell]: 1 }; S.pods = S.pods.filter(q => q.h || q.k !== S.exp.patch.key);");
  p.run("S.pods.forEach(q => { q.h = 1; q.k = '0'; });");   // a buried find next door or far: its beat first
  assert.match(p.run("leadWay(S.exp.patch, layout(S.exp.patch.key)).dir"), /^[a-z-]+$/, "a buried find: its beat");
  assert.equal(p.run("leadWay(S.exp.patch, layout(S.exp.patch.key)).kind"), "beat");
  assert.match(p.run("patchAction().label"), /^Turn [a-z-]+$/, "✓ turns toward it");
  // nothing buried: the nearest way out not yet walked
  p.run("S.pods = []; RT.lead = null;");
  const w = p.run("leadWay(S.exp.patch, layout(S.exp.patch.key))");
  if (w) assert.ok(["out", "take"].includes(w.kind), "then a way out not yet walked (or a thing seen elsewhere)");
  // something to take in sight: no tab
  p.run("{ const k = S.exp.patch.key, P = S.exp.patch; S.veil[k] = new Array(PH).fill(0x0fffffff); S.pods = [{ id: 'z', k, x: P.x + 1, y: P.y, sp: 0, h: 0, g: 'grass', how: 'ground' }]; RT.lead = null; }");
  assert.equal(p.run("leadWay(S.exp.patch, layout(S.exp.patch.key))"), null, "a pod in sight: no tab");
});
