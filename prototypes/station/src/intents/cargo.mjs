// Cargo's intents (cargo.json: the keys, the line, events.opening, handoff): the rule call behind ✓ and ← in the bay and the report, the opening's timeline, and the report that follows it. Cargo has no targets: the ring is on nothing,
// the pad does nothing in the bay, and every key but ✓ and ← only closes the report. The pad's moves are the face's (there are none).
//   h.ui.cargo: { state: "bay" | "opening" | "report", crate, at, mend, run, shown, drawn, slide }
//   run: what ✓ Open the bay made, in the order the crates opened: { crates: [ { ribbon, pods: [ { id, well } ], dev, gained: { e, d, s } } ], report }; shown: the counters and the turn as the top bar shows them while the crates open; drawn: the crates drawn while they slide in (null: all), slide: the slide that may stage it (cratesIn)
import * as S from "../state.mjs";
import { ribbonOf, leadOf, reachWord } from "../views/cargo-props.mjs";
import { toPods } from "./home.mjs";
import { goalWords, meanwhileWords } from "../views/goal-words.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// One crate's steps in ms from its start (events.opening.crate): the lid, the ribbon, the counters, the first pod's travel and the pods' stagger, the turn. Read from the spec, not kept here.
export function stepsOf(spec) {
  const ev = spec.events.opening, [cut, lid, ribbon, counters, travel, turn] = ev.crate;
  return { perCrate: ev.perCrate, lid: lid.at, ribbon: ribbon.at, counters: counters.at, travel: travel.at, stagger: travel.each, travelMs: travel.ms, turn: turn.at, cut: cut.ms, end: ev.end.ms };
}
// The opening's length and hold for n crates: crates × 3000 + 180 and + 200 (events.opening.byCrates: the host sends whole ms), for at most nine (hold ≤ 30000, lvgl-switch.md §2.7).
export const OPENING_MAX = 9;
export const openingMs = (spec, n) => n * spec.events.opening.perCrate + spec.events.opening.byCrates["1"].ms - spec.events.opening.perCrate;
export const openingHold = (spec, n) => n * spec.events.opening.perCrate + spec.events.opening.byCrates["1"].hold - spec.events.opening.perCrate;
// A crate's place among the walk crates opened (from 0), or -1 for a developer crate: the ordinal of the ribbon and of the report's lead counts walk crates only.
const walkOrdinals = (plays) => { let w = 0; return plays.map((p) => (p.c.dev ? -1 : w++)); };

// The report's rows in words, from the crates that opened and the dock's mend (cargo.json regions.report, strings.report): one row for each of the first three crates opened, what every crate gathered, the Probe, and the lines of the last walk crate.
function reportOf(spec, plays, settings, mend, st, sv, frameSpec) {
  const T = spec.strings.report, R = spec.regions.report, podMax = R.crates.podMax, walk = walkOrdinals(plays);
  const crates = plays.slice(0, R.crates.max).map((p, k) => {
    const n = p.ids.length;   // the pods that landed, never the crate's raw contents (a pod of no species is not opened)
    return { lead: leadOf(spec, p.c, walk[k]), pods: n && n <= podMax ? n : 0, text: n === 0 ? T.noPods : n > podMax ? T.manyPods : "", reach: reachWord(spec, p.c) };
  });
  const sum = (key) => plays.reduce((a, p) => a + p.gained[key], 0);
  const gathered = { lead: T.gathered, e: "+" + sum("e"), d: "+" + sum("d"), s: "+" + sum("s") };
  let probe = null;
  if (mend && (mend.free || mend.paid || mend.broke)) {
    const plates = (mend.free | 0) + (mend.paid | 0);
    const spent = mend.spent | 0;   // the Energy the plates cost, as the dock rule paid it: none when the economy is free
    probe = { lead: T.probe, plates, text: spent ? fill(T.mendedPaid, { price: "⚡ " + spent }) : T.mendedFree };
  }
  const lastWalk = plays.findLast((p) => !p.c.dev), lines = (lastWalk?.c.lines || []).slice(0, R.world.max);
  const world = lines.length ? { lead: T.world, lines } : null;
  const newPods = plays.reduce((a, p) => a + p.ids.filter((id) => st.tray.some((q) => q.id === id)).length, 0);
  // the goal after the crates: goalKey's step in Home's words, and the read to suggest while the step is a wait
  const g = frameSpec ? S.goalKey(st, sv, settings) : null, goal = g ? goalWords(g, S.docked(st), frameSpec) : null, meanwhile = g && goal ? meanwhileWords(g.meanwhile, spec) : null;
  return { heading: T.heading, crates, gathered, probe, world, newPods, goal, meanwhile };
}

// ✓ Open the bay: the rule opens every crate at once; the host then plays them one at a time (events.opening): the arrival (the face's clock), the counters and the turn as the top bar shows them, and, with reduced motion, each step as a cut at its time.
export function openBay(h) {
  const c = h.ui.cargo, spec = h.specs.cargo, st = h.st, T = stepsOf(spec);
  const before = { e: st.e, d: st.d, s: st.s, turn: st.turn };
  const r = S.openBay(st, h.sv, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  const motion = h.motion ? h.motion() : true;
  // what plays: at most nine crates (the hold stays under 30000 ms); the rest are taken in by the rule and the counters and the turn reach their final values at the end
  const plays = r.plays.slice(0, OPENING_MAX), n = plays.length, walk = walkOrdinals(plays);
  // the well each pod went to: its place in the rack, or -1 when it waits in the bay
  const crates = plays.map((p, k) => ({ ribbon: ribbonOf(spec, p.c, walk[k]), dev: !!p.c.dev, gained: { e: p.gained.e, d: p.gained.d, s: p.gained.s }, pods: p.ids.map((id) => ({ id, well: st.tray.findIndex((q) => q.id === id) })) }));
  c.run = { crates, report: reportOf(spec, r.plays, h.settings, c.mend, st, h.sv, h.specs.frame) }; c.mend = null;
  c.state = "opening"; c.crate = 0; c.at = 0; c.shown = { ...before };
  const sk = spec.events.opening.skip === true;   // a skippable hold (lvgl-switch.md §2.1): ✓ Skip runs every step below at once, to the report
  h.play({ kind: "arrival", target: "crate", ms: openingMs(spec, n), hold: openingHold(spec, n), ...(sk ? { skip: true } : {}) });
  plays.forEach((p, k) => {
    const t0 = k * T.perCrate;
    if (k) h.at(t0, () => { c.crate = k; c.at = 0; }, sk);   // a cut to the next closer, sealed (cargo.json events.opening.crate: R8)
    const gain = (key) => p.gained[key] - (key === "e" ? p.spent : 0);
    h.at(t0 + T.counters, () => { for (const key of ["e", "d", "s"]) c.shown[key] += gain(key); }, sk);
    h.at(t0 + T.turn, () => { c.shown.turn = p.turnTo; }, sk);
    if (!motion) {   // each step as a cut at its time: open at 200, the ribbon, the counters, each pod to its well, the turn
      const points = [T.lid, T.ribbon, T.counters, ...crates[k].pods.map((_, j) => T.travel + j * T.stagger), T.turn];
      for (const at of points) h.at(t0 + at, () => { c.crate = k; c.at = at; }, sk);
    }
  });
  h.at(n * T.perCrate, () => { c.state = "report"; c.shown = null; c.crate = 0; c.at = 0; }, sk);   // a cut to the report: the door shut, the plate on it (R8)
  h.save(); return r;
}

// The crates sliding into the bay on the Dock (cargo.json events.crateIn, line.bay): the event, and the count of crates drawn, staged as Cargo's UI state at each slide's start
// (a crate counts from the frame its slide starts; with reduced motion every crate is in on the Dock frame, nothing staged). Each call starts a new slide; a step of an older slide writes
// nothing, so a Lift and a Dock inside one slide never leave the line counting the old one. n = 0 (a Lift) only voids the slide in flight.
export function cratesIn(h, n) {
  const c = h.ui.cargo, ci = h.specs.cargo.events.crateIn.each, slide = (c.slide = (c.slide ?? 0) + 1);
  c.drawn = null; if (!n) return;
  h.play({ kind: "arrival", target: "crates", ms: ci.ms + ci.stagger * (n - 1), hold: 0 });
  if (!h.motion()) return;
  const step = (v) => () => { if (c.slide === slide) c.drawn = v; };
  c.drawn = 1; for (let i = 1; i < n; i++) h.at(i * ci.stagger, step(i + 1)); h.at(ci.ms + ci.stagger * (n - 1), step(null));
}

// the report closes: the bay shows (the crates are accepted): the shut door when it holds nothing, the waiting pods on the open bay when pods wait; the plate's rows go with it
export function closeReport(h) { const c = h.ui.cargo; if (c.state === "report") { c.state = "bay"; c.run = null; } }

// `target`: "room" (Cargo has no other); `verb`: confirm | back | pad (any of the four directions, in the report only) | room:<key> (the frame's).
export function intent(h, target, verb) {
  const c = h.ui.cargo;
  if (c.state === "opening") return;   // the hold: nothing acts (the face says only a room key, kept by the host)
  if (c.state === "report") {   // any key closes the card and also does what it does: ✓ follows the bottom line, ← and the pad only close it
    const newPods = c.run?.report.newPods ?? 0;
    closeReport(h);
    if (verb === "confirm" && newPods) toPods(h);
    return;
  }
  if (verb === "back") { h.ui.home.f = "cargo"; h.goto("home"); return; }   // ← Home, the ring on the Cargo module
  if (verb === "confirm" && S.docked(h.st) && S.bayCrates(h.st, h.sv).length) return openBay(h);
}
