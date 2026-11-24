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

test("an entry records the turn the top bar shows; its heading says turn, part and place", () => {
  const f = fixture({ partner: 0 });
  f.run("S.turn = 8; delete S.book; bookEv('prints', null, 'a')");
  const r = plain(f.run("S.book[0]"));
  assert.equal(r.t, 9); assert.equal(r.t, f.run("wTurn()"));
  assert.equal(f.run("logLay(S.book[0]).hd.join('|')"), "T9 · " + r.part + " · the " + r.place);
  assert.equal(f.run("WORDS.book.head('morning', 9, 'Meadow')"), "T9 · morning · the Meadow");
});

test("a record with no turn keeps today's heading; a long place wraps under turn and part inside the page", () => {
  const f = fixture({ partner: 0 });
  assert.equal(f.run("logLay({ kind: 'prints', part: 'morning', place: 'Meadow', text: 'a' }).hd.join('|')"), "morning · the Meadow");
  const lay = plain(f.run("logLay({ kind: 'prints', part: 'afternoon', t: 12, place: 'Old Flooded Rock Garden of the Quiet Beasts', text: 'a' })"));
  assert.equal(lay.hd[0], "T12 · afternoon");
  assert.ok(lay.hd.length >= 2 && lay.hd.slice(1).join(" ") === "the Old Flooded Rock Garden of the Quiet Beasts");
  for (const l of lay.hd) assert.ok(f.run(`textW(${JSON.stringify(l)}, 2)`) <= 360, "fits x 68..430: " + l);
  assert.equal(lay.h, 48 + 24 * (lay.ls.length + lay.hd.length - 1), "row height grows with the heading");
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
