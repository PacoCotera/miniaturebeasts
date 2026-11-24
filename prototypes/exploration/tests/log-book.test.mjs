// The Log (companion-device-build-1): an entry is a record with its day, part of day, place and whom it is about; the last 3 days are kept; opening the Log changes nothing in the world.
//   node --test prototypes/exploration/tests/log-book.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, plain } from "./walk-fixture.mjs";

test("bookEv writes a record: day, part, place, from, whom, kind, words; S.log's string lines are untouched", () => {
  const f = fixture({ partner: 0 }), at = f.spot(3, 3, f.P()), id = f.add(0, at.x, at.y, { ind: { name: "Nettle" } });
  f.run(`S.day.spent = 60; delete S.book; const n0 = S.log.length; bookEv('met', curLive().cr.find(q => q.id === ${id}), WORDS.book.met('Nettle')); S.__n0 = n0`);
  const b = plain(f.run("S.book"));
  assert.equal(b.length, 1);
  const r = b[0];
  assert.equal(r.d, 5); assert.equal(r.part, "morning"); assert.equal(r.kind, "met"); assert.equal(r.id, id);
  assert.ok(r.place && r.from, "a place and where from the flag"); assert.match(r.text, /Nettle/);
  assert.equal(f.run("S.log.length"), f.run("S.__n0"), "bookEv writes no S.log line");
});

test("the last 3 days are kept; an old save has no book and shows no page", () => {
  const f = fixture({ partner: 0 });
  f.run("delete S.book; S.exp.n = 1; bookEv('prints', null, 'a'); S.exp.n = 2; bookEv('prints', null, 'b'); S.exp.n = 3; bookEv('prints', null, 'c'); S.exp.n = 4; bookEv('prints', null, 'd')");
  assert.deepEqual(plain(f.run("S.book.map(r => r.d)")), [2, 3, 4]);
  f.run("delete S.book");
  assert.equal(f.run("logDays().length"), 1, "only today's empty page while out; no old line is shown");
  assert.equal(f.run("logDays()[0].rows.length"), 0);
});

test("opening and closing the Log leaves light, clock, the wild ones and the place as they were", () => {
  const f = fixture({ partner: 0 }), at = f.spot(3, 3, f.P());
  f.add(0, at.x, at.y, { ind: { name: "Nettle" } });
  f.run("S.phase = 'patch'; bookEv('prints', null, 'Prints in the grass.')");
  const snap = () => JSON.stringify(plain(f.run("({ spent: S.day.spent, turn: S.turn, cr: curLive().cr, patch: S.exp.patch, log: S.log, actions: S.exp.actions })")));
  const before = snap();
  f.run("openMenu(); S.phase = 'menu'; S.ui.menuSel = menuItems().findIndex(i => i.id === 'log'); act('confirm')");
  assert.equal(f.run("S.phase"), "log");
  f.run("FX.lockUntil = 0; act('down'); FX.lockUntil = 0; act('up')");
  f.run("FX.lockUntil = 0; act('back')");
  assert.equal(f.run("S.phase"), "patch", "← goes back to the field");
  assert.equal(snap(), before);
});
