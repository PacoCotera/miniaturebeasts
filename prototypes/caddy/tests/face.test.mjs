// The Caddy's face (face.mjs): each state's lines and lamp from its inputs, every string inside its slot in the panel's own type, ink and paper only, the frame's windows
// and rules, and the refresh scheduler: one partial per change, three a loop, no full refresh within 10 s of a beat, a full after the fifth partial at the first quiet moment.
//   node --test prototypes/caddy/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { faceOf, layoutFace, rasterFace, measure, createScheduler, lampAt, LAMPS, STATION_LAMPS, REGIONS, RULES, W, H, IDS, ICON } from "../face.mjs";

const T0 = Date.parse("2026-10-30T14:05:00Z"), S = 1000;
const seated = (at, seats = 1) => ({ companion: { state: "seated", seats, at }, station: { state: "seated" } });
const lifted = (at, seats = 1) => ({ companion: { state: "lifted", seats, at }, station: { state: "seated" } });
const station = (o = {}) => ({ at: T0, partner: null, along: null, opened: null, crates: 0, ledger: { e: 5, d: 6, s: 7 }, ...o });
const face = (o) => faceOf({ tz: 0, bootAt: T0, who: { name: "Companion A" }, ...o });
const msg = (f) => [f.lines.l1, f.lines.l2, f.lines.l3];

test("each state's lines and lamp from its inputs", () => {
  let f = face({ now: T0 + S, cradles: lifted(T0), station: station({ partner: "Moss" }) });
  assert.deepEqual([f.id, ...msg(f), f.hero, f.icon, f.lamp.companion, f.marks.companion], ["C0", "Companion out", "with Moss", "since 14:05", IDS.empty, "outline", "off", "lifted"]);
  f = face({ now: T0 + S, cradles: lifted(T0), station: station() }); assert.deepEqual(msg(f), ["Companion out", "exploring", "since 14:05"], "C0 with no partner");
  f = face({ now: T0, cradles: lifted(T0, 0) }); assert.equal(f.id, "C0", "at boot with the cradle empty");
  // seated, the hold not yet in: the face keeps its picture under 1 s (the lamp is mint at once), C1 from 1 s, C4a from 10 s
  f = face({ now: T0 + 500, cradles: seated(T0), station: station({ at: T0 }) }); assert.deepEqual([f.id, f.keep, f.lamp.companion], ["C1", true, "seated"]);
  f = face({ now: T0 + S, cradles: seated(T0), station: station({ at: T0 }) }); assert.deepEqual([f.id, f.keep, ...msg(f), f.hero, f.lamp.companion], ["C1", false, "Companion home", "taking the hold", "leave it seated", IDS.seated, "taking"]);
  f = face({ now: T0 + 10 * S, cradles: seated(T0), station: station({ at: T0 + 9 * S }) }); assert.deepEqual([f.id, ...msg(f), f.lamp.companion, f.marks.companion], ["C4a", "Companion seated", "no word from it", "lift it and seat it again", "hand", "seated"]);
  // the hold for this seat landed: C2; a hold for an earlier seat does not count
  f = face({ now: T0 + S, cradles: seated(T0, 2), hold: { seat: 2, crates: 2, left: 2 }, station: station({ at: T0, crates: 2 }) });
  assert.deepEqual([f.id, ...msg(f), f.crates, f.lamp.companion], ["C2", "Companion home", "two crates", "open them at the Station", 2, "seated"]);
  assert.deepEqual(f.icons.filter((i) => i.id === IDS.crate).map((i) => i.rect), [[224 + measure("two crates", 3) + 12, 102, 32, 32], [224 + measure("two crates", 3) + 52, 102, 32, 32]], "the crate icons: 12 after the text, 8 apart");
  f = face({ now: T0 + 2 * S, cradles: seated(T0, 2), hold: { seat: 1, crates: 2, left: 2 }, station: station({ at: T0 }) }); assert.equal(f.id, "C1", "a hold for an older seat is not this seat's");
  f = face({ now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 0, left: 0 }, station: station({ at: T0 }) }); assert.deepEqual(msg(f), ["Companion home", "charging", "since 14:05"], "C2 with no crate");
  f = face({ now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 5, left: 5 }, station: station({ at: T0 }) }); assert.deepEqual([f.lines.l2, f.crates], ["five crates", 3], "at most three crate icons");
  // C3 only when every crate is opened at the Station and cleared on the Companion; one crate opened of two stays C2, unchanged
  const two = { cradles: seated(T0), hold: { seat: 1, crates: 2, left: 1 } };
  f = face({ now: T0 + 20 * S, ...two, station: station({ at: T0 + 19 * S, opened: null, crates: 1 }) }); assert.deepEqual(msg(f), ["Companion home", "two crates", "open them at the Station"]);
  f = face({ now: T0 + 20 * S, ...two, station: station({ at: T0 + 19 * S, opened: { crates: 2, newPods: 3 }, crates: 0 }) }); assert.equal(f.id, "C2", "not until the Companion's hold no longer carries them");
  f = face({ now: T0 + 20 * S, cradles: seated(T0), hold: { seat: 1, crates: 2, left: 0 }, station: station({ at: T0 + 19 * S, opened: { crates: 2, newPods: 3 }, crates: 0, along: "Fig" }) });
  assert.deepEqual([f.id, ...msg(f), f.lamp.companion], ["C3", "two crates home", "three new pods", "Fig goes along", "done"]);
  f = face({ now: T0 + 20 * S, cradles: seated(T0), hold: { seat: 1, crates: 1, left: 0 }, station: station({ at: T0 + 19 * S, opened: { crates: 1, newPods: 0 }, crates: 0 }) }); assert.deepEqual(msg(f), ["one crate home", null, "ready for the next trip"], "no pod: no L2");
  // C4b over the state under it: the link crossed, the stamp gains the time, L3 says the crates wait
  f = face({ now: T0 + 16 * S, cradles: seated(T0), hold: { seat: 1, crates: 2, left: 2 }, station: station({ at: T0 }) });
  assert.deepEqual([f.id, f.under, ...msg(f), f.marks.link, f.lines.stamp, f.lamp.companion], ["C4b", "C2", "Companion home", "two crates", "the crates wait here", "lost", "Companion A · as of 14:05", "seated"]);
  f = face({ now: T0 + 15 * S - 1, cradles: seated(T0), hold: { seat: 1, crates: 2, left: 2 }, station: station({ at: T0 }) }); assert.deepEqual([f.id, f.marks.link, f.lines.stamp], ["C2", "ok", "Companion A"], "not before 15 s");
  f = face({ now: T0 + 20 * S, cradles: lifted(T0), station: station({ at: T0 }) }); assert.deepEqual([f.id, f.under, f.lamp.companion], ["C4b", "C0", "off"]);
  // C4c: the service refused the write; the marks as sensed
  f = face({ now: T0 + S, cradles: seated(T0), station: station({ at: T0 }), fault: true });
  assert.deepEqual([f.id, ...msg(f), f.hero, f.icon, f.ledger, f.marks.companion, f.lamp.companion], ["C4c", "Caddy fault", "nothing was taken", "the crates stay aboard", IDS.empty, null, null, "seated", "hand"]);
  // whose Companion: the stamp names it; the Station cradle's lamp
  f = face({ now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 0, left: 0 }, station: station({ at: T0 }), who: { name: "Companion B" } }); assert.equal(f.lines.stamp, "Companion B");
  assert.equal(face({ now: T0, cradles: { companion: { state: "lifted", seats: 0, at: T0 }, station: { state: "lifted" } } }).lamp.station, "off");
  // the ledger: the Station's supplies, "999+" past 999
  f = face({ now: T0 + S, cradles: lifted(T0), station: station({ at: T0, ledger: { e: 1000, d: 999, s: 0 } }) }); assert.deepEqual(f.ledger.map((r) => r.text), ["999+", "999", "0"]);
});

test("every string fits its slot in the panel's type (Mibi at 4×, 3×, 2×); an overflow throws with the string", () => {
  assert.deepEqual([measure("Companion home", 4), measure("Companion out", 4), measure("twelve crates home", 4), measure("twelve crates", 3), measure("as of Tue 14:32", 2), measure("999+", 3)], [268, 244, 344, 186, 130, 60], "the fit table's widths");
  const long = "Mmmmmmmmmm";   // a name is at most 10 letters
  const worst = [
    { now: T0, cradles: lifted(T0), station: station({ partner: long }) },
    { now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 12, left: 12 }, station: station({ at: T0 }) },
    { now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 12, left: 0 }, station: station({ at: T0, opened: { crates: 12, newPods: 12 }, along: long, ledger: { e: 5000, d: 5000, s: 5000 } }) },
    { now: T0 + 30 * S, cradles: seated(T0), hold: { seat: 1, crates: 12, left: 12 }, station: station({ at: T0 }), who: { name: "Companion B" } },
    { now: T0 + 30 * S, cradles: seated(T0), station: station({ at: T0 }) },
    { now: T0 + S, cradles: seated(T0), fault: true },
  ];
  for (const input of worst) {
    const f = face(input), L = layoutFace(f);
    for (const t of L.texts) { const slotEnd = t.region === "status" ? 384 : t.x === 708 ? 768 : 648; assert.ok(t.x + t.w <= slotEnd, `${f.id}: "${t.text}" ends at ${t.x + t.w}`); }
    const crates = L.icons.filter((i) => i.id === IDS.crate); if (crates.length) assert.ok(crates.at(-1).rect[0] + 32 <= 648, f.id + ": the crate icons stay in MSG");
    for (const ic of L.icons) { const [x, y, w, h] = ic.rect, [rx, ry, rw, rh] = REGIONS[ic.region]; assert.ok(x >= rx && y >= ry && x + w <= rx + rw && y + h <= ry + rh, `${ic.id} inside ${ic.region}`); }
  }
  const f = face(worst[0]); f.lines.l1 = "Companion home and well rested";
  assert.throws(() => layoutFace(f), /line 1 "Companion home and well rested" ends at/);
  assert.throws(() => measure("Companion ☃", 4), /no "☃"/);
});

test("only G0 and G3 in v1; the windows on 8 px boundaries, the rules outside every window", () => {
  for (const [k, [x, , w]] of Object.entries(REGIONS)) { assert.equal(x % 8, 0, k); assert.equal((x + w) % 8, 0, k); }
  const inside = (x, y, [rx, ry, rw, rh]) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  for (const [x, y, w, h] of RULES) for (const r of Object.values(REGIONS)) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) assert.ok(!inside(i, j, r), "a rule pixel inside a window");
  const inputs = [{ now: T0, cradles: lifted(T0), station: station({ partner: "Moss" }) }, { now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 3, left: 3 }, station: station({ at: T0 }) },
    { now: T0 + 30 * S, cradles: seated(T0), station: station({ at: T0 }) }, { now: T0 + S, cradles: seated(T0), fault: true }];
  for (const input of inputs) { const px = rasterFace(face(input)); assert.equal(px.length, W * H); assert.deepEqual([...new Set(px)].sort((a, b) => a - b), [0, 255], "ink and paper only"); }
  assert.equal(ICON.max, 3);
  // the hero carries no caption: above the drawn cradle (y 24 to 70) the hero is paper in every state
  for (const input of inputs) { const px = rasterFace(face(input)); for (let y = 24; y < 70; y++) for (let x = 24; x < 200; x++) assert.equal(px[y * W + x], 255, "no caption in the hero"); }
});

// a loop at the scheduler: boot, seat (C2), the last crate opened (C3), lift (C0); the face is pushed on every change of its input, as the page does
function loop(sch, t0, seat) {
  const ops = [], push = (f, t, beat) => { const o = sch.push(f, t, { beat }); if (o) ops.push(o); }, tick = (t) => { const o = sch.tick(t); if (o) ops.push(o); };
  const st = (o) => station({ at: t0, ...o });
  push(face({ now: t0, cradles: seated(t0, seat), hold: { seat, crates: 2, left: 2 }, station: st({ crates: 2 }) }), t0, true);   // seat: the hold lands at once
  tick(t0 + 900);
  push(face({ now: t0 + 5 * S, cradles: seated(t0, seat), hold: { seat, crates: 2, left: 1 }, station: st({ at: t0 + 5 * S, crates: 1, ledger: { e: 8, d: 6, s: 7 } }) }), t0 + 5 * S);   // one crate opened: nothing changes but the supplies, held
  push(face({ now: t0 + 8 * S, cradles: seated(t0, seat), hold: { seat, crates: 2, left: 0 }, station: st({ at: t0 + 8 * S, crates: 0, opened: { crates: 2, newPods: 3 }, ledger: { e: 11, d: 9, s: 7 } }) }), t0 + 8 * S);
  tick(t0 + 9 * S);
  push(face({ now: t0 + 12 * S, cradles: lifted(t0 + 12 * S, seat), station: st({ at: t0 + 12 * S, ledger: { e: 11, d: 9, s: 7 } }) }), t0 + 12 * S, true);
  for (let t = t0 + 13 * S; t < t0 + 21 * S; t += 500) tick(t);   // up to 9 s after the lift
  return ops;
}
test("three partials a loop, each over the regions that changed; nothing for an unchanged face; held while busy", () => {
  const sch = createScheduler({ tz: 0 });
  const boot = sch.push(face({ now: T0, cradles: lifted(T0, 0), station: station() }), T0); assert.deepEqual([boot.kind, boot.why], ["full", "boot"]);
  assert.equal(sch.push(face({ now: T0 + 5 * S, cradles: lifted(T0, 0), station: station({ at: T0 + 5 * S }) }), T0 + 5 * S), null, "the same picture draws nothing");
  const ops = loop(sch, T0 + 60 * S, 1);
  assert.deepEqual(ops.map((o) => [o.kind, o.face.id]), [["partial", "C2"], ["partial", "C3"], ["partial", "C0"]], "seat, last crate opened, lift");
  assert.deepEqual(ops[0].regions, ["hero", "msg", "status"]); assert.deepEqual(ops[1].regions, ["msg", "ledger"]); assert.deepEqual(ops[2].regions, ["hero", "msg", "status"]);
  assert.ok(ops.every((o) => o.until - o.at === 800), "a partial takes 0.8 s");
  // a change while the panel is busy waits and goes as one partial when it is free
  const b = createScheduler({ tz: 0 }); b.push(face({ now: T0, cradles: lifted(T0, 0) }), T0);
  assert.equal(b.push(face({ now: T0 + S, cradles: seated(T0 + S), hold: { seat: 1, crates: 0, left: 0 } }), T0 + S, { beat: true }), null, "held during the boot's full");
  assert.equal(b.tick(T0 + 3 * S), null); const late = b.tick(T0 + 4 * S); assert.deepEqual([late.kind, late.face.id], ["partial", "C2"]);
});

test("no full refresh within 10 s of a beat; a full after the fifth partial at the first quiet moment; daily at 00:05", () => {
  const sch = createScheduler({ tz: 0 });
  sch.push(face({ now: T0, cradles: lifted(T0, 0), station: station() }), T0);
  const a = loop(sch, T0 + 60 * S, 1); assert.ok(a.every((o) => o.kind === "partial"));
  const b = loop(sch, T0 + 120 * S, 2); assert.deepEqual(b.map((o) => o.kind), ["partial", "partial", "partial"], "the fifth partial is in the second loop, and the 9 s after its lift stay quiet");
  assert.equal(sch.state.partials, 6);
  const lift = T0 + 132 * S; assert.equal(sch.tick(lift + 10 * S - 1), null, "not within 10 s of the lift");
  const full = sch.tick(lift + 10 * S); assert.deepEqual([full.kind, full.why, full.until - full.at], ["full", "after 5 partials", 4000]); assert.equal(sch.state.partials, 0, "a full resets the count");
  assert.equal(sch.tick(lift + 20 * S), null, "and is not repeated");
  assert.deepEqual(sch.counts, { partial: 6, full: 2 });
  // daily: at 00:05 the next day, at the first quiet moment
  const d = createScheduler({ tz: 0 }), night = Date.parse("2026-10-31T00:04:00Z");
  d.push(face({ now: T0, cradles: lifted(T0, 0) }), T0);
  assert.equal(d.tick(night), null, "not before 00:05");
  d.push(face({ now: night + 55 * S, cradles: seated(night + 55 * S), hold: { seat: 1, crates: 0, left: 0 } }), night + 55 * S, { beat: true });
  assert.equal(d.tick(night + 60 * S), null, "00:05, but 10 s after a beat it is not yet quiet");
  const dd = d.tick(night + 65 * S); assert.deepEqual([dd.kind, dd.why], ["full", "daily"]);
  assert.equal(d.tick(night + 3600 * S), null, "once a day");
  // a ledger-only change is batched: at most one ledger partial every 10 min
  const l = createScheduler({ tz: 0 }); l.push(face({ now: T0, cradles: lifted(T0, 0), station: station() }), T0);
  assert.equal(l.push(face({ now: T0 + 60 * S, cradles: lifted(T0, 0), station: station({ at: T0 + 60 * S, ledger: { e: 9, d: 6, s: 7 } }) }), T0 + 60 * S), null, "held");
  assert.equal(l.tick(T0 + 599 * S), null); const lp = l.tick(T0 + 600 * S); assert.deepEqual([lp.kind, lp.regions], ["partial", ["ledger"]]);
});

test("the cradle lamps: off, seated (steady), taking (a 1.6 s breath), done (one 400 ms swell, then seated), needs a hand (amber, steady); the Station cradle off or a dim warm white", () => {
  assert.deepEqual(lampAt("off", 0), { colour: null, level: 0 });
  assert.deepEqual([lampAt("seated", 0), lampAt("seated", 9999)], [{ colour: "mint", level: 0.5 }, { colour: "mint", level: 0.5 }], "steady");
  const breath = [0, 400, 800, 1200, 1600].map((t) => lampAt("taking", t).level);
  assert.equal(breath[0], breath[4], "a 1.6 s period"); assert.ok(breath[2] > breath[1] && breath[1] > breath[0] && breath[2] <= 0.5, "it breathes, soft: " + breath);
  assert.equal(lampAt("done", 200).level, 1, "the swell peaks brighter"); assert.equal(lampAt("done", 200).colour, "mint");
  assert.deepEqual(lampAt("done", 400), lampAt("seated", 0), "then seated"); assert.deepEqual(lampAt("done", 5000), lampAt("seated", 0));
  assert.deepEqual(lampAt("hand", 0), { colour: "amber", level: 0.8 }); assert.deepEqual(lampAt("hand", 3000), lampAt("hand", 0));
  assert.deepEqual([lampAt("seated", 0, STATION_LAMPS), lampAt("off", 0, STATION_LAMPS)], [{ colour: "warm", level: 0.25 }, { colour: null, level: 0 }]);
  assert.ok(Object.values(LAMPS).every((l) => l.colour !== "amber" || l === LAMPS.hand), "amber only for a real need");
  // which lamp each state lights (faceOf): the lamp is mint at the seat, before the face changes
  const by = (input) => face(input).lamp.companion;
  assert.deepEqual([by({ now: T0, cradles: lifted(T0) }), by({ now: T0 + 100, cradles: seated(T0) }), by({ now: T0 + S, cradles: seated(T0), station: station({ at: T0 }) }),
    by({ now: T0 + S, cradles: seated(T0), hold: { seat: 1, crates: 0, left: 0 }, station: station({ at: T0 }) }), by({ now: T0 + 11 * S, cradles: seated(T0), station: station({ at: T0 + 10 * S }) }), by({ now: T0, cradles: seated(T0), fault: true })],
    ["off", "seated", "taking", "seated", "hand", "hand"]);
});
