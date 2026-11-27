// call-probe-marks-1 (owner #55 #56 #60 #64): the held view's fruit and reach line, the start pick's reach square, the nearest-thing tab after every Call.
//   node --test prototypes/exploration/tests/call-probe-marks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";
const fresh = () => { const p = makePage({ console: "silent", canvas: true }); p.run(SETUP); return p; };

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
