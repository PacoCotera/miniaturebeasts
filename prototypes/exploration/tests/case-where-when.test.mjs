// The Case (companion-case-build-1): a pod taken carries where and when (day, part of day, place name); the sealed crate keeps it; an old save's thing shows no "place · day" line; opening the Case changes nothing.
//   node --test prototypes/exploration/tests/case-where-when.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, plain } from "./walk-fixture.mjs";

test("a pod taken keeps its day, part of day and place; the Case label says them", () => {
  const f = fixture({ partner: 0 });
  f.run("S.day.spent = 60; S.exp.cargo.pods = []; const P = curLay(); S.pods.push({ id: 'cw1', k: P.key, x: 3, y: 3, sp: 0, h: 0, g: 0, how: 'ground' }); takePod(S.pods.find(q => q.id === 'cw1'))");
  const p = plain(f.run("S.exp.cargo.pods[0]"));
  assert.ok(p && p.got, "the pod has where and when");
  assert.equal(p.got.d, f.run("S.exp.n")); assert.equal(p.got.part, "morning"); assert.ok(p.got.place);
  f.run("S.phase = 'cargo'; S.ui.caseSel = 'pod:0'");
  const th = plain(f.run("caseThing(caseSel(caseCells()))"));
  assert.match(th.name, /pod/); assert.equal(th.took.place, p.got.place);
});

test("the sealed crate keeps where and when on its pods", () => {
  const f = fixture({ partner: 0 });
  f.run("S.day.spent = 60; const P = curLay(); S.pods.push({ id: 'cw2', k: P.key, x: 3, y: 3, sp: 0, h: 0, g: 0, how: 'ground' }); takePod(S.pods.find(q => q.id === 'cw2'))");
  const got = plain(f.run("S.exp.cargo.pods[0].got"));
  f.run("S.exp.pos = S.exp.start; S.bay = []; endExpedition('sent')");
  const c = plain(f.run("S.bay[0]"));
  assert.ok(c && c.pods.length, "a crate was sealed");
  assert.deepEqual(c.pods[0].got, got);
});

test("an old save's thing has no where and when: its label has no place line; opening and closing the Case leaves the world as it was", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp.cargo.samples = [{ id: 's1', lo: 7, name: 'Nettle', sp: 0, habit: 'shake', item: 'tuft', chapter: 'coat', turn: 1 }]; S.phase = 'patch'");
  const snap = () => JSON.stringify(plain(f.run("({ spent: S.day.spent, turn: S.turn, cr: curLive().cr, patch: S.exp.patch, log: S.log, actions: S.exp.actions, cargo: S.exp.cargo })")));
  const before = snap();
  f.run("openMenu(); S.phase = 'menu'; S.ui.menuSel = menuItems().findIndex(i => i.id === 'cargo'); act('confirm')");
  assert.equal(f.run("S.phase"), "cargo");
  assert.ok(!f.run("menuItems().some(i => i.label === 'Cargo')"), "no Cargo row");
  const th = plain(f.run("caseThing(caseSel(caseCells()))"));
  assert.equal(th.name, "Nettle’s tuft"); assert.ok(!th.took, "no where and when on an old save");
  assert.equal(f.run("caseEntry(caseThing(caseSel(caseCells())).thing)"), null, "no page in the Log, no ✓");
  f.run("FX.lockUntil = 0; act('right'); FX.lockUntil = 0; act('back')");
  assert.equal(f.run("S.phase"), "patch");
  assert.equal(snap(), before);
});
