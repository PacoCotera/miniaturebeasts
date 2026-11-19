// owner #80: the Call crosses places. At the owner's spot (cell 2,13, tile 4,27) a hidden pod in the place below, within reach, is lit by the Call.
//   node --test prototypes/exploration/tests/call-crosses-places.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("#80 a Call near a place's edge lights a hidden pod just over the edge", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); const c = 13 * MW + 2; startExpedition('weather', c); S.exp.fog = null; S.exp.storm = null; S.exp.pos = c; enterPatch(); RT.caddy = { podHome: true };");
  const info = JSON.parse(p.run("JSON.stringify((() => { const P = S.exp.patch, lay = layout(P.key), nc = lay.cell + MW; S.exp.reach = [...new Set([...S.exp.reach, nc])]; layout(String(nc));"
    + " const nl = layout(String(nc)); P.x = 4; P.y = lay.h - 3; S.pods = S.pods.filter(q => q.k !== P.key && q.k !== String(nc));"
    + " S.pods.push({ id: 'zz', k: String(nc), x: 4, y: 1, sp: 0, h: 1, g: 'grass', how: 'ground' }); callPlace(); const z = S.pods.find(q => q.id === 'zz'); return { h: z.h, h0: lay.h, cue: FX.cue.finds.length, nk: FX.cue.finds.map(f => f.nk) }; })())"));
  assert.equal(info.h, 0, "the pod over the edge is lit by the Call: " + JSON.stringify(info));
  assert.equal(info.cue, 1);
});
