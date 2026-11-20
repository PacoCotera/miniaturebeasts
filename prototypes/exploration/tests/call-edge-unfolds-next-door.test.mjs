// owner-notes-fix-9e (#91): a Call at a place's edge lifts the strip of the place next door even outside the Probe's reach.
//   node --test prototypes/exploration/tests/call-edge-unfolds-next-door.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";

function setup(x) {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  p.run(`{ const P = S.exp.patch, lay = layout(P.key); P.x = ${x}; P.y = lay.h >> 1; }`);
  const nk = p.run("String(S.exp.patch.key * 1 + 1)");
  p.run(`S.exp.reach = S.exp.reach.filter(c => c !== ${nk});`);
  return { p, nk };
}

test("a Call on the east edge lifts the strip next door although it is outside the reach", () => {
  const { p, nk } = setup("layout(S.exp.patch.key).w - 1");
  p.run("callPlace();");
  const y = p.run("S.exp.patch.y");
  assert.equal(p.run(`!!(S.veilPre && S.veilPre[${nk}] && (S.veilPre[${nk}][${y}] & 1))`), true);
});

test("a Call off the edge still leaves a neighbour outside the reach veiled", () => {
  const { p, nk } = setup("layout(S.exp.patch.key).w - 2");
  p.run("callPlace();");
  assert.equal(p.run(`!!(S.veilPre && S.veilPre[${nk}])`), false);
});
