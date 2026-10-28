// Ageing in turns (elder at 18) and the real time a mibi has been the player's: the stage boundaries, the thresholds as settings, the age words,
// and `since` / `sinceFloor` written at the hatch, back-filled once, kept through a save and the dock.   node --test prototypes/station/tests/age.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { ageTurns, stageNote, turnsFor, turnsUntil, yoursLine } from "../src/age-words.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const MIN = 60000, T0 = Date.UTC(2026, 9, 1, 15);
const fresh = (now = T0) => { const st = S.freshSt("w1", 3, now); S.normalize(st, now); st.e = 99; st.d = 99; st.s = 99; return st; };
const hatch = (st, now, how = "open") => {
  S.seedPodFromGenome(st, podGenome(frameOf("S01"), 5), settings, now); const p = st.tray[st.tray.length - 1]; S.skipIdentify(st, p); st.firstMibi = false;
  assert.equal(S.grow(st, p, {}, settings, now).ok, true);
  return how === "open" ? S.openBud(st, null, settings, now + 60 * MIN) : S.instantGrow(st, settings, now + MIN);
};

test("the constants: young for 2 turns, an adult for 16 more (an elder at 18); the elder threshold is a setting beside adultTurns", () => {
  assert.deepEqual([S.JUVENILE_TURNS, S.ELDER_TURNS, S.DEFAULT_SETTINGS.adultTurns, S.DEFAULT_SETTINGS.elderTurns], [2, 16, 2, 16]);
});
test("stage boundaries: young through 1, adult through 17, an elder at 18", () => {
  const st = S.freshSt("w1", 0, T0), m = { born: 0 };
  for (const [turn, want] of [[0, "juvenile"], [1, "juvenile"], [2, "adult"], [17, "adult"], [18, "elder"], [19, "elder"]]) { st.turn = turn; assert.equal(S.mibiStage(st, m), want, "turn " + turn); assert.equal(S.mibiStage(st, m, settings), want, "turn " + turn + " (the developer settings at their defaults)"); }
  const g = { born: 0, bonded: true, grownTurn: 4 }; for (const [turn, want] of [[19, "adult"], [20, "elder"]]) { st.turn = turn; assert.equal(S.mibiStage(st, g), want, "grown at 4, turn " + turn); }
});
test("adultTurns and elderTurns are honoured by mibiStage on the Station", () => {
  const st = S.freshSt("w1", 0, T0), m = { born: 0 };
  for (const [a, e] of [[1, 4], [3, 2], [0, 0], [2, 1]]) for (let turn = 0; turn <= 8; turn++) {
    st.turn = turn; const want = turn < a ? "juvenile" : turn >= a + e ? "elder" : "adult";
    assert.equal(S.mibiStage(st, m, { ...settings, adultTurns: a, elderTurns: e }), want, "adultTurns " + a + ", elderTurns " + e + ", turn " + turn); }
  st.turn = 6; assert.equal(S.mibiStage(st, m, { ...settings, elderTurns: 4 }), "elder", "elderTurns alone, adultTurns at its default"); assert.equal(S.mibiStage(st, m, { ...settings, elderTurns: undefined }), "adult", "an unset setting reads the constant");
});
test("age words: turns old, what the stage means, and the span of real time", () => {
  assert.deepEqual([0, 1, 2, 25].map((n) => ageTurns({ born: 1 }, 1 + n)), ["new this turn", "1 turn old", "2 turns old", "25 turns old"]);
  assert.deepEqual([0, 1, 7].map(turnsFor), ["from this turn", "for 1 turn", "for 7 turns"]); assert.deepEqual([1, 2].map(turnsUntil), ["next turn", "in 2 turns"]);
  const note = (m, turn) => { const r = stageNote(m, turn, 2, 16); return [r.stage, r.n]; };
  assert.deepEqual(note({ born: 0 }, 1), ["juvenile", 1]); assert.deepEqual(note({ born: 0 }, 2), ["adult", 0]); assert.deepEqual(note({ born: 0 }, 9), ["adult", 7]);
  assert.deepEqual(note({ born: 0 }, 18), ["elder", 0]); assert.deepEqual(note({ born: 0 }, 25), ["elder", 7], "an elder's count rises from the turn it became one");
  assert.deepEqual(note({ born: 0, bonded: true }, 30), ["juvenile", null], "a bonded young mibi waits for care: no count"); assert.deepEqual(note({ born: 0, bonded: true, grownTurn: 5 }, 23), ["elder", 2]);
  const at = (since, now, floor) => yoursLine({ since: new Date(...since, 12).getTime(), ...(floor ? { sinceFloor: true } : {}) }, new Date(...now, 12).getTime());
  assert.deepEqual(at([2026, 9, 14], [2026, 9, 27]), { span: "13 days", date: "14 Oct", floor: false, today: false });
  assert.equal(at([2026, 9, 27], [2026, 9, 27]).span, null); assert.equal(at([2026, 9, 26], [2026, 9, 27]).span, "a day"); assert.equal(at([2026, 0, 1], [2026, 3, 10]).span, "99 days"); assert.equal(at([2026, 0, 1], [2026, 3, 11]).span, "3 months");
  assert.deepEqual([at([2024, 10, 27], [2026, 9, 27]).span, at([2024, 9, 27], [2026, 9, 27]).span, at([2025, 9, 14], [2026, 9, 27]).date], ["23 months", "2 years", "Oct 2025"]);
  assert.equal(at([2026, 9, 28], [2026, 9, 27]).span, null, "a clock behind `since`: the first day, never negative"); assert.equal(at([2026, 9, 14], [2026, 9, 27], true).floor, true);
  assert.equal(yoursLine({}, T0), null); assert.equal(yoursLine({ since: 0 }, T0), null);
});
test("since: written at the hatch (Open and Hatch now), in ms UTC, never rewritten; no floor on a mibi hatched here", () => {
  const a = fresh(); const o = hatch(a, T0); assert.equal(o.ok, true); assert.deepEqual([o.mibi.since, o.mibi.sinceFloor], [T0 + 60 * MIN, undefined]);
  const b = fresh(); const g = hatch(b, T0, "now"); assert.equal(g.ok, true); assert.equal(g.mibi.since, T0 + MIN); assert.ok(Number.isInteger(g.mibi.since));
  S.normalize(a, T0 + 99 * MIN); assert.equal(a.mibis[0].since, T0 + 60 * MIN, "normalize never rewrites it"); assert.equal(a.mibis[0].sinceFloor, undefined);
  const c = fresh(); const e = hatch(c, 5000); assert.equal(e.ok, true); assert.equal("since" in e.mibi, false, "an unset clock (before 2026) writes nothing");
});
test("sinceFloor: an older save is back-filled once, with the floor; an unset clock waits for the first good one", () => {
  const st = fresh(); hatch(st, T0); const m = st.mibis[0]; delete m.since;   // a save from before the clock
  S.normalize(st, 1234); assert.equal("since" in m, false, "an unset clock back-fills nothing");
  const now = T0 + 3 * 86400000; S.normalize(st, now); assert.deepEqual([m.since, m.sinceFloor], [now, true]);
  S.normalize(st, now + 86400000); assert.deepEqual([m.since, m.sinceFloor], [now, true], "once: the second normalize changes nothing");
  m.since = "yesterday"; delete m.sinceFloor; S.normalize(st, now + 5); assert.deepEqual([m.since, m.sinceFloor], [now + 5, true], "a since that is not a number counts as missing");
  const old = JSON.parse(readFileSync(path.join(here, "fixtures/save-v8-schema1.json"), "utf8")).st ?? null;
  if (old && old.mibis?.length) { const once = S.normalize(S.migrate(structuredClone(old), now), now); for (const q of once.mibis) assert.deepEqual([q.since, q.sinceFloor], [now, true], q.name); }
});
test("since and sinceFloor round trip through a schema-4 save and the dock's merge", () => {
  const st = fresh(); hatch(st, T0); const [m] = st.mibis; m.sinceFloor = true;
  const back = S.normalize(JSON.parse(JSON.stringify(st)), T0 + 7 * 86400000); assert.equal(back.schema, 4);
  assert.deepEqual([back.mibis[0].since, back.mibis[0].sinceFloor], [T0 + 60 * MIN, true], "a save keeps both");
  const sv = { v: 8, turn: 3, mibis: [{ id: m.id, name: m.name, sp: 0, born: m.born, outings: 3, notches: 1, care: 2, tends: 2, bonded: true, bondCare: 1, grownTurn: 2 }], carried: [] };
  S.mergeCare(back, sv); assert.deepEqual([back.mibis[0].since, back.mibis[0].sinceFloor], [T0 + 60 * MIN, true], "the dock's merge never touches them");
  assert.deepEqual(Object.keys(sv.mibis[0]).filter((k) => /since/.test(k)), [], "the Companion's copy is made by the Companion at the dock, not by the Station");
});

test("the dev panel sets elderTurns: 16 (the default), 4 or now", () => {
  const src = readFileSync(path.resolve(here, "../src/dev.mjs"), "utf8");
  assert.match(src, /select\("elderTurns", \[16, 4, 0\]/); assert.equal(S.DEFAULT_SETTINGS.elderTurns, 16);
});
test("a dev-seeded mibi has been yours since it was made: an integer since, no sinceFloor, through normalize", () => {
  const st = fresh(Date.now()), a = S.seedAdults(st, "S01", 5, 1, settings).mibis[0], b = S.seedSiblings(st, "S01", 9, settings).mibis?.[0];
  for (const m of [a, b].filter(Boolean)) { assert.ok(Number.isInteger(m.since)); S.normalize(st, Date.now()); assert.equal(m.sinceFloor, undefined); }
});
