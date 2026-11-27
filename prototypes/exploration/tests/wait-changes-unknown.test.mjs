// A wait's changes line counts unknown creatures once, whatever their species.
//   node --test prototypes/exploration/tests/wait-changes-unknown.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

function wander(f, spec) {
  const ids = [];
  for (const [sp, n] of spec) for (let i = 0; i < n; i++) { const at = f.spot(2, 8, null, ids.length * 2); ids.push([f.add(sp, at.x, at.y), at]); }
  f.run(`window.__a = waitSnap('patch')`);
  for (const [id, at] of ids) f.set(id, { x: at.x + 1, y: at.y });   // each one moved
  return f.run(`waitChanges(window.__a, waitSnap('patch'), 'patch').join(' | ')`);
}

test("two unknown species wandering print one 'Five creatures wander'", () => {
  const f = fixture({ partner: null, known: [] });
  assert.match(wander(f, [[0, 3], [1, 2]]), /^five creatures wander$/i);
});

test("known species stay apart from unknown ones", () => {
  const f = fixture({ partner: null, known: [0] });
  const out = wander(f, [[0, 2], [1, 3]]);
  assert.match(out, /two \w+ wander/i); assert.match(out, /three creatures wander/i);
});
