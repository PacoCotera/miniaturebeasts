// owner note 167 (rule 47a): the target line keeps the Loika he follows; a Call or a new sighting never moves it.
//   node --test prototypes/exploration/tests/target-follow-167.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const start = (seed = 13) => { const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" }); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`); return p; };

test("QA's fresh-game case: Maple met first, then Juniper newly seen: the line still names Maple; facing Juniper moves it", () => {
  const p = start(7);
  p.run("HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch';");
  p.run("S.named = { 5: 'Maple' }; S.metIds = ['5'];");
  assert.equal(p.run("metBest().name"), "Maple");
  p.run("S.named['9'] = 'Juniper'; S.metIds.push('9');");   // a Call shows another named Loika
  assert.equal(p.run("metBest().name"), "Maple", "a newly seen one does not take the target");
  p.run("followSet({ id: 9, ind: {} });");   // he faces Juniper
  assert.equal(p.run("metBest().name"), "Juniper");
  p.run("S.named['12'] = 'Alder'; S.metIds.push('12');");
  assert.equal(p.run("metBest().name"), "Juniper", "still Juniper after another new sighting");
  p.run("followSet({ id: 5, ind: {} });");
  assert.equal(p.run("metBest().name"), "Maple", "facing, watching or noting another moves it back");
});
