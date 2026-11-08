// C10: quarters out (walk slice W§6). The survey is gone from the page: no "surveyed", no quarters on the map or the reach view, no completion push,
// and the world turn never puts the veil back. What stays: the veil itself, the reach grid's dots (a dot fills when a heart is found).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage, PAGE } from "./page-harness.mjs";
import { fixture, plain } from "./walk-fixture.mjs";

test("the page source no longer holds the survey: its words, its functions, its quarter art", () => {
  assert.doesNotMatch(PAGE, /surveyed/i, "no 'surveyed' anywhere in the page");
  assert.ok(!PAGE.includes("Everything in reach is explored"), "no completion push");
  assert.ok(!PAGE.includes("Everything in reach explored"), "no completion log line either");
  assert.ok(!/Explored \d|'Explored '|Explored ' \+/.test(PAGE), "no 'Explored N of M' count");
  for (const gone of ["surveyable", "surveyWord", "surveyedLine", "surveyText", "quarterFracs", "quarterVeil", "quarterAlmost", "updateSurvey", "checkExplored", "SURVEY_AT", "svyFull", "reveil("])
    assert.ok(!PAGE.includes(gone), gone + " is deleted");
  assert.ok(!PAGE.includes("saidDone"), "no completion state");
});

test("the Probe screen has no 'Quarter' sign", () => {
  const p = makePage({ console: "silent" }); p.run("newWorld(7)");
  assert.equal(p.run("TILES.some(t => t[0] === 'quarters' || /quarter/i.test(String(t[1])))"), false);
});

// a visited cell, half under the veil, then fully lifted: no pixel of the map or the reach view moves with the veil (no quarter dither)
test("no quarter is drawn on the reach view or the full map, whatever the veil lies on", () => {
  const f = fixture({ canvas: true }), run = f.run;
  run("S.visited[S.exp.pos] = 1; FX.msg = ''; FX.notes = [];"); const key = run("S.exp.patch.key");
  const shot = (veil, full) => {
    run(`S.veil[${JSON.stringify(key)}] = ${veil}; S.exp.patch = null; S.phase = 'map'; S.ui.mapFull = ${full}; FX.lockUntil = 0; RT.key = null; scr.px().fill(-1); render(5)`);
    return Array.from(run("scr").px());
  };
  for (const full of [false, true]) {
    const bare = shot("new Array(PH).fill(0)", full), lifted = shot("new Array(PH).fill(0x0fffffff)", full), half = shot("new Array(PH).fill(0).map((v, y) => y < PH / 2 ? 0x0fffffff : 0)", full);
    assert.deepEqual(bare, lifted, (full ? "full map" : "reach view") + ": a veiled place and a lifted one draw the same");
    assert.deepEqual(bare, half, (full ? "full map" : "reach view") + ": a half-lifted one too");
  }
});

test("the reach line counts places found, not explored, and the world turn never veils a place again", () => {
  const f = fixture(), run = f.run;
  assert.match(run("reachLine()"), /^Found 0 of \d+/);
  assert.doesNotMatch(run("reachLine()"), /xplored|urvey/);
  // lift a whole place, find its heart, and see the count and the dot move
  run("S.veil[S.exp.patch.key] = new Array(PH).fill(0x0fffffff); TEST.findHeart();");
  assert.ok(run("explored(S.exp.pos)"), "the heart is found: the dot fills");
  assert.match(run("reachLine()"), /^Found 1 of \d+/);
  // a world turn with a storm everywhere and new arrivals: every lifted veil stays lifted
  const key = run("S.exp.patch.key"), before = JSON.stringify(plain(run("S.veil")));
  run("worldTurn({ trail: [], storm: Array.from(G.comp).map((v, c) => v ? c : -1).filter(c => c >= 0) })");
  assert.equal(JSON.stringify(plain(run("S.veil"))), before, "the veil is as it was");
  assert.equal(run(`S.veil[${JSON.stringify(key)}].every(r => r === 0x0fffffff)`), true);
  assert.ok(run("explored(S.exp.pos)"), "and the place stays found");
});

test("no completion push: the last dot filling says nothing, the menu does not jump to End expedition", () => {
  const f = fixture(), run = f.run;
  run("for (const c of S.exp.reach) { S.visited[c] = 1; (S.called = S.called || {})[c] = 1; } FX.msg = ''; FX.notes = []; advance('patch', { noise: 'wait' });");
  assert.equal(run("reachCounts().found"), run("reachCounts().total"), "every dot filled");
  assert.ok(!/explored/i.test(String(run("FX.msg"))), "no 'explored' line: " + run("FX.msg"));
  run("S.exp.patch = null; S.phase = 'map'; S.ui.from = 'map'; openMenu();");
  assert.equal(run("S.ui.menuSel"), 0, "the menu opens on its first row, not End expedition");
});
