// Owner note #90: the Call reveals the place next door again. The held view lights a place never walked only where a Call lifted it (not half of every neighbour whether or not a Call was made).
//   node --test prototypes/exploration/tests/owner-notes-fix-8.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";

test("#90 a Call at the edge lifts tiles in the next place, and the held view draws exactly those lit; with no Call the neighbour stays wholly veiled", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  assert.equal(p.run("TEST.exploreHere()"), true);
  p.run("{ const P = S.exp.patch, lay = layout(P.key); P.x = lay.w - 2; P.y = lay.h >> 1; RT.pl = null; }");
  const nk = p.run("String(S.exp.patch.key * 1 + 1)");   // the place to the east
  p.run(`S.exp.reach = S.exp.reach.filter(c => c !== ${nk}); S.exp.reach.push(${nk}); S.veilPre = {};`);
  const veilOf = (pre, dx, dy) => p.run(`(() => { const nl = { w: 28, h: 28, baked: { ox: -1, oy: -1, place: { w: 30, h: 30 } } }; return Array.from(unwalkedVeil(new Uint8Array(900).fill(1), nl, ${pre}, ${dx}, ${dy})); })()`);
  const lit = v => v.reduce((n, x) => n + (x ? 0 : 1), 0);
  assert.equal(lit(veilOf("null", 1, 0)), 0, "no Call: the east neighbour is wholly veiled");
  assert.equal(lit(veilOf("null", -1, -1)), 0, "no Call: a corner neighbour too");
  p.run("callPlace();");
  const pre = p.run(`S.veilPre['${nk}'].length`);
  assert.ok(pre > 0, "the Call lifted a strip next door");
  const v = veilOf(`S.veilPre['${nk}']`, 1, 0);
  const want = p.run(`S.veilPre['${nk}'].reduce((n, r) => { let c = 0; for (let x = 0; x < 28; x++) c += (r >>> x) & 1; return n + c; }, 0)`);
  assert.ok(want > 0, "tiles are lifted there");
  assert.ok(lit(v) >= want && lit(v) < 900, "the held view lights the lifted tiles (and the apron beside them), not the whole place: " + lit(v) + " for " + want);
  // the apron stays veiled on the outer (east) edge of an east neighbour: its last column of the picture
  assert.equal(v[29] + v[29 + 30 * 15], 2, "the outer apron stays veiled");
});
