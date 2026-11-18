// bug #79 (owner 2026-11-18): the find tab on the view's edge read as a bomb (a dark round body, a pointed nub on top, a gold spark = a lit fuse).
// The find tab is now a bark-brown badge with no pointer nub; the `!` and `?` tabs keep their dark body and pointer.
//   node --test prototypes/exploration/tests/find-tab-badge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";

test("#79 the find tab's body is not the ink of a bomb and it carries no pointer nub", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  // the draw call for a tab, on its own: the find kind gets the bark body and no pointer rows, any other kind keeps ink and its pointer
  const src = p.run("drawEdgeCues.toString()");
  assert.match(src, /isFind \? C\.bark : C\.ink/, "a find tab's body is bark, the others' ink");
  assert.match(src, /if \(!isFind\) for \(const \[x, y, w, h\] of tabPointer\(tb\)\)/, "only the other tabs draw the pointer");
  // the tab still exists for a find (the way to a buried pod) so the change is only in how it is drawn
  p.run("S.exp.callsAt = { [layout(S.exp.patch.key).cell]: 1 }; S.pods.forEach(q => { q.h = 1; q.k = '0'; });");
  assert.equal(p.run("leadWay(S.exp.patch, layout(S.exp.patch.key)).kind"), "beat");
});
