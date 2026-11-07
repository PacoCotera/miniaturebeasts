// L2b fix round (the sign-off's B1, B2, F1-F9), through the page's own waitTick and creatureTick.
//   node --test prototypes/exploration/tests/l2b-fix.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

const said = (f, re) => f.msgs().some(m => re.test(m));
const podsHow = f => f.pods().map(q => q.how);
// up to eleven Waits; the creature stays where it was until its pod is there
function waitsUntilPod(f, id, at, who) {
  f.run(`waitTick('patch')`); const at1 = f.cr(id);   // the first Wait may be its own step before it begins to settle
  assert.ok(Math.abs(at1.x - at.x) + Math.abs(at1.y - at.y) <= 1, who + " first step");
  for (let i = 1; i < 11 && !f.pods().length; i++) { f.run(`waitTick('patch')`); if (!f.pods().length) assert.deepEqual([f.cr(id).x, f.cr(id).y], [at1.x, at1.y], who + " was not moved, wait " + (i + 1)); }
  assert.ok(f.pods().length, who + " finished its moment");
}

test("B1: a Wait with each of the 20 kinds going from alert back to idle never throws, and says a routine verb", () => {
  for (let sp = 0; sp < 20; sp++) {
    const f = fixture({ partner: null, known: [sp] }), at = f.spot(4, 6), id = f.add(sp, at.x, at.y, { st: "alert", t: 1 });
    f.run(`window.__a = waitSnap('patch')`);
    f.set(id, { st: "idle", t: 0 });
    const out = f.run(`waitChanges(window.__a, waitSnap('patch'), 'patch').join(' | ')`);
    assert.match(out, /again/, "sp " + sp + ": " + out);
  }
  const f = fixture({ partner: null, known: [] }), at = f.spot(4, 6), id = f.add(25, at.x, at.y, { st: "watch" });
  f.run(`window.__a = waitSnap('patch')`); f.set(id, { st: "idle" });
  assert.match(f.run(`waitChanges(window.__a, waitSnap('patch'), 'patch').join(' | ')`), /is at ease again|at ease again/, "an unlisted kind");
  assert.equal(f.run(`ROUTINE[3][0]`), "climbs about again", "the Hiljan's fallback verb");
  assert.equal(f.run(`ROUTINE.length`), 20);
});

test("B1: a real Wait press for each kind coming back to routine does not throw", () => {
  for (let sp = 0; sp < 20; sp++) {
    const f = fixture({ partner: null, known: [sp] }), at = f.spot(4, 6), id = f.add(sp, at.x, at.y, { st: "watch", t: 1 });
    for (let i = 0; i < 4; i++) f.run(`waitTick('patch')`);
    assert.ok(f.cr(id), "sp " + sp);
  }
});

test("B2: eleven Waits beside a Wickle, a Peplos in fog and a Tepor on its stone each finish their moment", () => {
  const w = fixture({ partner: null }), wa = w.spot(4, 6), wid = w.add(16, wa.x, wa.y);
  waitsUntilPod(w, wid, wa, "the Wickle");
  assert.deepEqual(podsHow(w), ["still"], w.msgs().join(" | "));
  assert.ok(!w.msgs().some(m => /wanders · .*settles a little more/.test(m)), "no double line");

  const p = fixture({ partner: null }), pa = p.spot(4, 5), pid = p.add(11, pa.x, pa.y); p.fog(true);
  waitsUntilPod(p, pid, pa, "the Peplos"); assert.deepEqual(podsHow(p), ["fog"], p.msgs().join(" | "));

  const t = fixture({ partner: null }), s = t.spot(4, 5);
  t.run(`curLay().feats.push({ kind: 'k', id: 'kx', x: ${s.x}, y: ${s.y} }); S.exp.warm.push(curLay().key + ':kx')`);
  const ta = t.spot(1, 1, s), tid = t.add(4, ta.x, ta.y);
  waitsUntilPod(t, tid, ta, "the Tepor"); assert.deepEqual(podsHow(t), ["warm"], t.msgs().join(" | "));
});
