// Night step 1: the Probe breaking no longer ends the expedition. It goes dark where you stand; the player ends it at the flag.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { freshSt, dockKey } from "../../station/src/state.mjs";

function begin() {
  const p = makePage({ store: {} });
  p.run("newWorld(1); S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 0, notches: 0, bonded: false, plays: 0, grownTurn: null }); S.carried = [1]; save();");
  const st = freshSt(p.S.wid, p.S.turn); st.mendFull = false; st.mibis = [{ id: 1, name: "Dot", sp: 0, born: -9 }];
  p.writeSt(st);
  p.key("confirm"); p.key("confirm");
  assert.ok(p.S.exp, "the expedition started");
  return { p, st };
}
const goDarkFar = p => {
  p.key("right"); p.key("right"); p.key("down");   // away from the flag
  p.run("S.exp.cargo.pods.push({ id: 'p1', sp: 0, g: 0, how: 'ground', gs: 7 }); S.exp.cargo.e = 3; S.exp.cargo.d = 2; S.exp.shield = 0;");
  p.key("back"); p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'wait');"); p.key("confirm");   // the next action finds the Shield at 0
};

test("a break far from the flag: dark, pods under the skull, no ended card, supplies lost, the line and the bottom line say so", () => {
  const { p } = begin(); goDarkFar(p);
  assert.equal(p.S.exp.dark, 1); assert.ok(p.S.exp, "still in the realm"); assert.equal(p.S.report, null, "no ended card");
  assert.ok(!p.S.exp.ending);
  assert.equal(p.S.exp.cargo.pods.length, 0); assert.equal(p.S.exp.cargo.e + p.S.exp.cargo.d + p.S.exp.cargo.s, 0);
  assert.equal(p.S.pods.filter(q => q.id.startsWith("b")).length, 1); assert.ok(Object.keys(p.S.skulls || {}).length, "a skull on the map");
  assert.equal(p.run("FX.msg"), "The Probe goes dark. Your pods fall here. Walk back to the flag.");
  assert.equal(p.run("DARK_TEXT.line"), "Probe dark");
});

test("dark: Call and taking are refused with the line and spend nothing; walking still works", () => {
  const { p } = begin(); goDarkFar(p);
  const acts = p.S.exp.actions;
  p.key("back"); p.key("back"); p.key("call"); assert.equal(p.S.exp.actions, acts, "Call spends nothing"); assert.equal(p.run("FX.msg"), "The Probe is dark · walk back to the flag");
  p.run("FX.msg = ''; FX.notes = [];"); assert.equal(p.run("(() => { const r = darkRefuse(); return r; })()"), true);
  p.run("FX.notes = []; FX.msg = ''; S.exp.cargo.e = 0; addMat('e', 2, 0, 0)"); assert.equal(p.S.exp.cargo.e, 0, "nothing is taken");
  p.run("FX.notes = [];");
  const pos = p.S.exp.pos; p.key("left"); p.key("up"); assert.ok(p.S.exp.actions > acts, "walking spends light as ever"); assert.ok(p.S.exp, "still going");
  assert.notEqual(p.S.exp.pos, pos);
});

test("dark: a stray strike cannot land", () => {
  const { p } = begin(); goDarkFar(p);
  p.run("stormLevel = () => 3; stormRain = () => true; sheltered = () => false; inFog = () => false; depotShelter = () => false; S.exp.stray = { at: S.exp.actions + 1, scope: 'map', cell: S.exp.pos }; const h = S.exp.stats.hits; S.exp.shield = 0; advance('map', {});");
  assert.equal(p.S.exp.stray, null); assert.equal(p.S.exp.shield, 0, "no plate to lose and no hit counted again");
});

test("End expedition at the flag with the Probe dark: the card, the pods stay, the Station mends it in full at the dock", () => {
  const { p, st } = begin(); goDarkFar(p);
  const lastStart = p.S.exp.start;
  p.run("S.exp.pos = S.exp.start; S.exp.patch = null; S.phase = 'map'; save();");
  assert.ok(p.run("canSend()"), "at the flag");
  p.run("endExpedition('sent')");
  assert.equal(p.S.exp, null); assert.equal(p.S.report.reason, "break"); assert.equal(p.S.report.dropped, 1);
  assert.equal(p.S.pods.filter(q => q.id.startsWith("b")).length, 1, "the pods wait under the skull");
  assert.equal(p.S.shield, 0);
  const r = dockKey(st, p.sv()); assert.ok(r.ok && r.docked); p.writeSt(st); p.pass(1200);
  assert.equal(r.mend.broke, true); assert.equal(p.S.shield, st.probe.smax, "mended in full");
  assert.ok(lastStart != null);
});

test("a saved game with the Probe dark reloads dark in the realm; an older save with no plates opens dark, never on the ended card", () => {
  const { p } = begin(); goDarkFar(p);
  const raw = p.store[p.KEY]; assert.ok(raw);
  const q = makePage({ store: { ...p.store } });
  assert.equal(q.run("S.exp.dark"), 1); assert.notEqual(q.run("S.phase"), "sealed");
  const old = JSON.parse(raw); delete old.exp.dark; delete old.exp.darkRep; old.exp.shield = 0;
  const o = makePage({ store: { ...p.store, [p.KEY]: JSON.stringify(old) } });
  assert.ok(o.run("!!S.exp"), "still in the realm"); assert.equal(o.run("S.exp.dark"), 1); assert.notEqual(o.run("S.phase"), "sealed");
});
