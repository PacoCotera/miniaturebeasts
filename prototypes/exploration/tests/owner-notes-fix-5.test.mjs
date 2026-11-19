// Owner notes #83 (a young mibi grows up on real time), #84 (an open edge crosses on the first press), #85 (a Call's lifted strip next door shows in the held view).
//   node --test prototypes/exploration/tests/owner-notes-fix-5.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";

test("#83 a young mibi stays young while its two hours run, however many turns pass; it grows when they are over", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  p.run("S.mibis = [{ id: 1, name: 'Dot', sp: 0, born: 0, grownTurn: null, growAt: Date.now() + GROW_UP_MS }]; S.turn = 40;");
  assert.equal(p.run("mibiStage(S.mibis[0])"), "juvenile", "40 empty turns do not grow it");
  assert.equal(p.run("grownNow(S.mibis[0])"), false);
  p.run("S.mibis[0].growAt = Date.now() - 1;");
  assert.equal(p.run("mibiStage(S.mibis[0])"), "adult", "two real hours after the hatch it is grown");
  assert.equal(p.run("grownNow(S.mibis[0])"), true, "and the walk's end plays the grow-up moment");
  assert.equal(p.run("GROW_UP_MS"), 2 * 3600 * 1000);
});

test("#83 a mibi with no hatch clock keeps the turn rule", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  p.run("S.turn = 5; S.mibis = [{ id: 1, name: 'Old', sp: 0, born: 0 }, { id: 2, name: 'New', sp: 0, born: 5 }];");
  assert.equal(p.run("mibiStage(S.mibis[0])"), "adult", "adult by turns, as before");
  assert.equal(p.run("mibiStage(S.mibis[1])"), "juvenile");
});

test("#84 walking into an open edge crosses on the first press, held or tapped; no 'tap again'", () => {
  for (const mode of ["walk", "creep"]) {
    const p = makePage({ console: "silent", canvas: true });
    p.run(SETUP);
    p.run("{ const P = S.exp.patch, lay = layout(P.key); P.x = lay.w - 1; P.y = lay.h >> 1; RT.pl = null; }");
    const before = p.run("S.exp.patch.key"), bump0 = p.run("FX.bumpAt");
    p.run(`patchStep('right', '${mode}');`);
    const P = p.run("S.exp.patch"), after = P ? p.run("S.exp.patch.key") : null, waiting = p.run("!!FX.crossWait");
    const blocked = p.run("FX.bumpAt") !== bump0;
    assert.ok(waiting || (after && after !== before) || blocked, mode + ": the press did something");
    if (!blocked) assert.ok(waiting || after !== before, mode + ": an open edge is crossed, not refused");
    assert.equal(p.run("(FX.hintNote && FX.hintNote.id) || ''") === "edgehold", false, "no 'tap again' hint");
  }
});

test("#85 a Call at a corner of an explored place lifts the strips next door, and the held view draws them lit in a place never walked", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  assert.equal(p.run("TEST.exploreHere()"), true);
  p.run("{ const P = S.exp.patch; P.x = 0; P.y = 1; RT.pl = null; }");
  p.run("callPlace();");
  const nk = p.run("String(S.exp.patch.key * 1 - 16)");   // the place above
  assert.ok(p.run(`!!(S.veilPre && S.veilPre['${nk}'])`), "the Call lifted a strip there");
  // the held view's veil for that never-walked place: only the lifted tiles are open
  const v = p.run(`(() => { const nl = { w: 28, h: 28, baked: { ox: 0, oy: 0, place: { w: 28, h: 28 } } }, veil = new Uint8Array(28 * 28).fill(1); return Array.from(unwalkedVeil(veil, nl, S.veilPre['${nk}'])); })()`);
  const open = v.reduce((n, x) => n + (x ? 0 : 1), 0);
  assert.ok(open > 0 && open < v.length, "some of the neighbour is lit, not all: " + open);
  assert.equal(p.run(`unwalkedVeil(new Uint8Array(4).fill(0), { w: 2, h: 2, baked: { ox: 0, oy: 0, place: { w: 2, h: 2 } } }, null).join('')`), "1111", "no Call, wholly veiled as before");
});

test("#85 the held view lights the half of each unwalked neighbour that it shows, at a corner too", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  const open = (dx, dy) => p.run(`(() => { const nl = { w: 8, h: 8, baked: { ox: 0, oy: 0, place: { w: 8, h: 8 } } }; return Array.from(unwalkedVeil(new Uint8Array(64).fill(1), nl, null, ${dx}, ${dy})).filter((x) => !x).length; })()`);
  assert.equal(open(-1, 0), 32, "the west neighbour: its east half");
  assert.equal(open(0, -1), 32, "the north neighbour: its south half");
  assert.equal(open(-1, -1), 16, "the north-west neighbour: its south-east quarter, the corner");
  assert.equal(open(1, 1), 16);
  // the apron: lit where it lies between lit halves (no dark seam), veiled on the outer edge of the whole lit area. East neighbour (dx 1, dy 0), 8 x 8 in a 10 x 10 picture:
  const apron = `(() => { const nl = { w: 8, h: 8, baked: { ox: -1, oy: -1, place: { w: 10, h: 10 } } }; const v = unwalkedVeil(new Uint8Array(100).fill(1), nl, null, 1, 0); return [v[0], v[9], v[90], v[99], v[5], v[1 + 10 * 5], v[9 + 10 * 5], v[1 + 10 * 9]].join(''); })()`;
  assert.equal(p.run(apron), "01011010", "west apron and the apron above and below the lit half are lit; the east (outer) edge and the apron beyond the lit half stay veiled");
  assert.equal(p.run(`(() => { const nl = { w: 8, h: 8, baked: { ox: -1, oy: -1, place: { w: 10, h: 10 } } }; const v = unwalkedVeil(new Uint8Array(100).fill(1), nl, null, 1, 1); return [v[0], v[3], v[30], v[5], v[50], v[91]].join(''); })()`), "000111", "a corner neighbour (dx 1, dy 1): the apron above and left of its lit quarter is lit, beyond the quarter and on the bottom (outer) edge veiled");
});

