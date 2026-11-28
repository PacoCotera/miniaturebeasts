// Owner note #90: the Call reveals the place next door again. A place never walked is lit only where a Call lifted it (not half of every neighbour whether or not a Call was made).
// render-seen-1: the neighbour is read from the one seen record (the rows the Call wrote), through veilMask.
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
  p.run(`S.exp.reach = S.exp.reach.filter(c => c !== ${nk}); S.exp.reach.push(${nk}); delete S.seen.tile['${nk}']; S.seen.into[${nk}] = 0;`);
  // the tiles of the neighbour's own cell its picture lights (the apron beyond the cell is outside the cell and never counted)
  const lit = () => p.run(`(() => { const nl = layout('${nk}'), b = { ox: -1, oy: -1 }, pw = nl.w + 2, v = veilMask(S.seen, nl, pw, nl.h + 2, b.ox, b.oy); let n = 0;
    for (let i = 0; i < v.length; i++) { const x = i % pw + b.ox, y = ((i / pw) | 0) + b.oy; if (x >= 0 && y >= 0 && x < nl.w && y < nl.h && !v[i]) n++; } return n; })()`);
  assert.equal(lit(), 0, "no Call: the east neighbour is wholly veiled");
  p.run("callPlace();");
  const rows = p.run(`S.seen.tile['${nk}'].length`);
  assert.ok(rows > 0, "the Call lifted a strip next door");
  const want = p.run(`S.seen.tile['${nk}'].reduce((n, r) => { let c = 0; for (let x = 0; x < 28; x++) c += (r >>> x) & 1; return n + c; }, 0)`);
  assert.ok(want > 0, "tiles are lifted there");
  assert.equal(lit(), want, "the held view lights exactly the lifted tiles, the same rows a walk would write");
  assert.ok(want < p.run(`layout('${nk}').w * layout('${nk}').h`), "not the whole place");
});
