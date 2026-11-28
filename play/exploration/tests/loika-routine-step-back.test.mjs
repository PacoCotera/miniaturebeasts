// Bug #121 (step and back): seed 3, place 284, Loika 165 stood at 12,1 with her routine target at 10,2 and never got there: a trunk at 11,2 was open to the path field, so
// step one went by the open field to 12,2 and step two, on the creature-shut field, went back to 12,1. The field now closes trunks and features, and every step goes by one field.
//   node --test prototypes/exploration/tests/loika-routine-step-back.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const me = p => JSON.parse(p.run(`JSON.stringify(curLive().cr.filter(c => c.id === 165).map(c => [c.x, c.y, c.ind.go && c.ind.go.t ? c.ind.go.t.x + ',' + c.ind.go.t.y : null]))`))[0];

test("seed 3 place 284: Loika 165 reaches her morning spot past the trunk", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(3); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
  p.run(`S.exp.live = {}; S.day.spent = 0; S.exp.pos = "284"; enterPatch();`);
  assert.equal(p.run(`pathField(curLay(), { x: 10, y: 2 }, null, curLive().key)[2 * curLay().w + 11]`), -1, "the trunk at 11,2 is closed in the field");
  let reached = false, trace = [];
  for (let i = 0; i < 30; i++) {
    p.run(`S.day.spent = ${Math.min(i * 4, 190)}; advance('patch', { noise: 'act' })`); p.pass(1200);
    const [x, y, t] = me(p); trace.push([x, y, t]);
    if (t === "10,2" && x === 10 && y === 2) reached = true;
  }
  assert.ok(reached, "she stood on 10,2 in the morning: " + JSON.stringify(trace.slice(5, 20)));
});
