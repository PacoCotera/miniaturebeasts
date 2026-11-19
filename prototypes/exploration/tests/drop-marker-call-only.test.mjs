// owner #80: the tab that points to a drop (the way to the nearest thing) shows only for a Call's own time, never on the plain map.
//   node --test prototypes/exploration/tests/drop-marker-call-only.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";
const BURY = "S.exp.callsAt = { [layout(S.exp.patch.key).cell]: 1 }; S.pods = S.pods.filter(q => q.h || q.k !== S.exp.patch.key); S.pods.forEach(q => { q.h = 1; q.k = '0'; }); RT.lead = null;";
const beats = p => { p.run("scr.px().fill(-1); render(5)"); return JSON.parse(p.run("JSON.stringify(edgeTabs().filter(t => t.id === \"beat\").length)")); };

test("#80 the drop tab is absent on the plain map and present only while the Call's cue lasts", () => {
  const p = makePage({ console: "silent", canvas: true }); p.run(SETUP); p.run(BURY);
  assert.ok(p.run("leadWay(S.exp.patch, layout(S.exp.patch.key))"), "a way to a buried find exists");
  p.run("FX.cue = null");
  assert.equal(beats(p), 0, "no Call cue: no tab on the plain map");
  p.run("FX.cue = { key: S.exp.patch.key, at: NOW, until: S.exp.actions + 3, r: 4, finds: [] }");
  assert.equal(beats(p), 1, "during the Call: the tab");
  p.run("S.exp.actions += 3");
  assert.equal(beats(p), 0, "the Call's time over: the tab goes");
});
