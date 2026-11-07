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

// tiles a kind covers in a flight: hideOrFlee, then the field clock until it stops running
function fleeRun(sp) {
  const f = fixture({ partner: null }), at = f.spot(4, 5), id = f.add(sp, at.x, at.y);
  f.run(`hideOrFlee({ lay: curLay() }, curLive().cr[0])`); let n = 0, prev = f.cr(id);
  for (let i = 0; i < 4 && f.cr(id).st === "flee"; i++) { f.tick(); const c = f.cr(id); n += Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y); prev = c; }
  return n;
}

test("the tuned flee: a flighty Peplos runs further than a plucky Rupar; the shared row runs as before (3 tiles)", () => {
  assert.equal(fleeRun(11), 4, "Peplos, flee 3"); assert.equal(fleeRun(7), 2, "Rupar, flee 1");
  assert.equal(fleeRun(0), 3, "Loika, flee 2 as before"); assert.equal(fleeRun(25), 3, "an untuned kind as before");
});

test("the tuned creep notice: creeping at 2 tiles alerts a Peplos, not a Rupar or a Loika; at 1 tile all three", () => {
  for (const [sp, d, alert] of [[11, 2, true], [7, 2, false], [0, 2, false], [11, 1, true], [7, 1, true], [0, 1, true]]) {
    const f = fixture({ partner: null }), P = f.P(), at = f.spot(d, d), id = f.add(sp, at.x, at.y);
    f.moveYou(at.x, at.y); const q = f.spot(d, d, at); f.moveYou(q.x, q.y);
    const dist = Math.max(Math.abs(q.x - at.x), Math.abs(q.y - at.y)); assert.equal(dist, d);
    f.tick({ noise: "creep", moved: true });
    assert.equal(["alert", "flee"].includes(f.cr(id).st), alert, "sp " + sp + " at " + d + ": " + f.cr(id).st);
  }
});
