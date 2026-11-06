// A field pod is the same picture for every species on the same ground and cell, in the place view and on the map's place card.
//   node --test prototypes/exploration/tests/pod-plain-field.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); S.exp.patch.x = 14; S.exp.patch.y = 14; S.veil[S.exp.patch.key] = new Array(PH).fill(0x0fffffff);";
const frame = (sp, how) => {
  const p = makePage({ console: "silent", canvas: true });   // a fresh page: no cached pod picture is shared between species
  p.run(SETUP);
  p.run(`{ const k = S.exp.patch.key; S.pods = ${sp === null ? '[]' : `[{ id: 'z', k, x: 15, y: 14, sp: ${sp}, h: 0, g: 'grass', how: 'ground' }]`}; }`);
  p.run("scr.px().fill(-1);");
  if (how === "place") p.run("RT.key = null; drawPatch(1);");
  else p.run("warnPicPlace(100, 100, { key: S.exp.patch.key, x: 15, y: 14 });");
  return Array.from(p.run("scr").px());
};

for (const how of ["place", "map"]) test(`a field pod looks the same for species 0, 1 and 2 (${how})`, () => {
  const base = frame(0, how);
  const none = frame(null, how);
  assert.ok(base.some((v, i) => v !== none[i]), "the pod is drawn");
  for (const sp of [1, 2]) assert.deepEqual(frame(sp, how), base, `species ${sp} differs from species 0`);
});
