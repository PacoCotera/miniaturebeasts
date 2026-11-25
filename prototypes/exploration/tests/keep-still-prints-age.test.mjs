// owner notes 162 + 163: ✓ with nothing to turn to keeps still (one Wait, the clock moves one); her prints are drawn fresh, older, faint, by their age.
//   node --test prototypes/exploration/tests/keep-still-prints-age.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true }; S.pods = [];";
const fresh = () => { const p = makePage({ console: "silent", canvas: true }); p.run(SETUP); return p; };

test("#163 ✓ toward a way he already faces keeps still, and the clock moves", () => {
  const p = fresh();
  p.run("RT.caddy = { podHome: false }; { const P = S.exp.patch; P.dir = 'up'; S.pods = [{ id: 'z', k: P.key, x: P.x + 4, y: P.y, sp: 0, h: 1, g: 'grass', how: 'ground' }]; }");   // the first walk's beat lies to the east
  assert.equal(p.run("patchAction().label"), "Turn east", "not facing it yet: Turn");
  p.run("patchAction().run()");   // the turn
  const lbl = p.run("patchAction().label");
  assert.equal(lbl, "Keep still", "already facing it: ✓ keeps still");
  const s0 = p.run("S.day.spent");
  p.run("patchAction().run()");
  assert.ok(p.run("S.day.spent") > s0, "the clock moved");
});

test("#163 ✓ with nothing at all keeps still", () => {
  const p = fresh();
  p.run("RT.lead = null; S.exp.callsAt = {};");
  const a = p.run("patchAction()");
  assert.equal(a.label, "Keep still"); { const s0 = p.run("S.day.spent"); p.run("patchAction().run()"); assert.ok(p.run("S.day.spent") > s0); }
});

test("#162 print age: fresh this part, older after, faint the last part, never past it", () => {
  const p = fresh();
  const age = (part, yday) => p.run(`S.day.spent = 0; printAge({ part: '${part}', yday: ${yday}, gone: false })`);
  const at = (nowPart, part, yday) => { const i = ["dawn", "morning", "midday", "afternoon", "dusk", "night"].indexOf(nowPart), st = [0, 50, 200, 350, 500, 550][i]; return p.run(`S.day.spent = ${st}; printAge({ part: '${part}', yday: ${yday}, gone: false })`); };
  void age;
  assert.equal(at("midday", "morning", false), 0, "left at the start of this part: fresh");
  assert.equal(at("afternoon", "morning", false), 1, "an earlier part: older");
  assert.equal(at("night", "midday", false), 1);
  assert.equal(at("dawn", "afternoon", true), 1, "yesterday's, at dawn: older");
  assert.equal(at("morning", "afternoon", true), 2, "yesterday's in the morning, the last part before they go: faint");
  assert.equal(p.run("printAge({ part: 'dusk', yday: false, gone: true })"), 0, "a bolt: fresh");
});

test("#162 the three ages are three different pictures, and fresh is the built one", () => {
  const p = fresh();
  const n = l => p.run(`Array.from(PAWS_AGED(PAWS(), ${l}, 'sg-paws').p).filter(v => v >= 0).length`);
  const [a, b, c] = [0, 1, 2].map(n);
  assert.ok(a > b && b > c && c > 0, `pixels ${a} > ${b} > ${c}`);
});
