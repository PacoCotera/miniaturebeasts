// The playtest preset (plan row 3.13, GD L4b; play/src/playtest.mjs): one place for the shortened waits, the game's own defaults untouched, and a journey from a fresh world under the preset
// with the clock driven (tools/headless.mjs: a walk is 15 minutes, a wait is the rule's own) that carries the whole loop (walk, carry home, read, grow, hatch, care, cross, out again with a
// partner) and ends on a walk with a partner. The minutes a tester waits are printed (and bounded); the same journey on the game's own settings is the "before".
//   node --test prototypes/station/tests/playtest-preset.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { playJourney, MIN, WALK_MS } from "../tools/headless.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import { PLAYTEST, playtestOn, withPlaytest } from "../../play/src/playtest.mjs";

const PAGE = readFileSync(new URL("../../exploration/index.html", import.meta.url), "utf8");

test("the preset is one object: the Station's settings and the Companion's care day, each a cut of a wait the game keeps in play", () => {
  const s = PLAYTEST.settings;
  assert.equal(T.sittingWaitMs(s), 60000, "the Sitting waits a minute"); assert.equal(T.SITTING_WAIT_MS.hours, 3 * 3600000, "in play it is three hours");
  assert.ok(s.budScale > 1 && s.adultTurns < S.JUVENILE_TURNS && s.elderTurns < S.ELDER_TURNS && s.watchMs < S.DEFAULT_SETTINGS.watchMs && s.mockDelay < S.DEFAULT_SETTINGS.mockDelay);
  assert.ok(PLAYTEST.careDayMs > 0 && PLAYTEST.careDayMs <= 5 * MIN, "a care day is minutes, not a day");
  assert.ok(Object.isFrozen(PLAYTEST) && Object.isFrozen(PLAYTEST.settings));
});

test("the game's own defaults are untouched, and the preset turns on from the URL only", () => {
  const D = S.DEFAULT_SETTINGS;
  assert.deepEqual([D.sittingWait, D.budScale, D.adultTurns, D.elderTurns, D.watchMs, D.mockDelay, D.playtest], ["hours", 1, 2, 16, 60000, 20, undefined]);
  assert.equal(playtestOn("?playtest"), true); assert.equal(playtestOn("?dev&playtest&seed=3"), true); assert.equal(playtestOn("?dev"), false); assert.equal(playtestOn(""), false); assert.equal(playtestOn(), false, "no page, no preset");
  assert.deepEqual(withPlaytest(D, false), D); assert.equal(withPlaytest(D, true).sittingWait, "minute"); assert.equal(D.sittingWait, "hours", "a copy: the defaults are not changed");
  assert.match(PAGE, /const JUVENILE_TURNS = PLAYTEST_ON \? PLAYTEST\.settings\.adultTurns : 2, ELDER_TURNS = PLAYTEST_ON \? PLAYTEST\.settings\.elderTurns : 16;/, "the Companion keeps the game's 2 and 16 and reads the preset's under ?playtest");
  assert.match(PAGE, /function careDay\(d\) \{[^}]*PLAYTEST_ON \? [^:]*PLAYTEST\.careDayMs[^:]*: localDay\(d\)/, "a care day is the local date in play and PLAYTEST.careDayMs under the preset");
});

// the Companion's care under the preset: its own functions read out of index.html (as exploration/tests/care.test.mjs does) and run on a driven clock
import vm from "node:vm";
function source(name) {
  const i = PAGE.search(new RegExp("^function " + name + "\\(", "m")); let j = PAGE.indexOf("{", i), depth = 0, q = null;
  for (; j < PAGE.length; j++) { const c = PAGE[j]; if (q) { if (c === "\\") j++; else if (c === q) q = null; continue; } if (c === "'" || c === '"' || c === "`") q = c; else if (c === "/" && PAGE[j + 1] === "/") j = PAGE.indexOf("\n", j); else if (c === "{") depth++; else if (c === "}" && --depth === 0) return PAGE.slice(i, j + 1); }
  throw new Error("not found: " + name);
}
function care(on, startMs) {
  const clock = { t: startMs }, RealDate = Date;
  class D extends RealDate { constructor(...a) { super(...(a.length ? a : [clock.t])); } static now() { return clock.t; } }
  const S0 = { exp: null, turn: 5, carried: [1], mibis: [] }, log = [];
  const names = ["localDay", "careDay", "canTend", "bondCheck", "growCheck", "tend"];
  const ctx = vm.createContext({ S: S0, Date: D, JUVENILE_TURNS: 1, BOND_TENDS: 3, PLAYTEST_ON: on, PLAYTEST, logEv: (t) => log.push(t), isCarried: (m) => S0.carried.includes(m.id) });
  const api = vm.runInContext(names.map(source).join("\n") + "\n;({ " + names.join(", ") + " })", ctx);
  return { ...api, S: S0, clock, log };
}
test("care under the preset: a Tend once a care day, the third bonds, and the three take two care days of waiting, not three real days", () => {
  const w = care(true, Date.UTC(2026, 10, 8, 12, 0, 10)), m = { id: 1, born: 4, tends: 0, care: 0, tendDay: null, grownTurn: null, bonded: false }; w.S.mibis.push(m);
  assert.ok(w.canTend(m)); assert.ok(w.tend(m)); assert.equal(w.canTend(m), false, "the second Tend waits"); w.clock.t += PLAYTEST.careDayMs - 20000; assert.equal(w.canTend(m), false, "still the same care day");
  let waited = 0; for (let n = 2; n <= 3; n++) { const t0 = w.clock.t; while (!w.canTend(m)) w.clock.t += 1000; waited += w.clock.t - t0; assert.ok(w.tend(m)); }
  assert.equal(m.bonded, true, "three Tends bond"); assert.ok(waited <= 2 * PLAYTEST.careDayMs + 2000, "waited " + waited + " ms");
  const g = care(false, Date.UTC(2026, 10, 8, 12)), q = { id: 1, born: 4, tends: 0, care: 0, tendDay: null, grownTurn: null, bonded: false }; g.S.mibis.push(q);
  assert.ok(g.tend(q)); g.clock.t += 2 * 3600000; assert.equal(g.canTend(q), false, "in play a Tend is once a local day"); g.clock.t += 24 * 3600000; assert.ok(g.canTend(q));
});

// the journey, before (the game's settings) and after (the preset)
const economy = "loose";   // the game's own, the one a tester meets
function run(settings) {
  const J = playJourney({ seed: 4242, settings: { economy, ...settings } }), { P, a } = J, before = a.outings;
  P.with = a.id; P.takeWalk();   // out again with a partner: the first founder, an adult, goes out once more
  return { J, P, a, before };
}
const isWait = (s) => /^(the bud grows|the crate fills)/.test(s.name);
// two measures: `stall` is what the journey actually stood still for (a wait overlaps the walks and the bench that follow it, so only what is left of it counts), `nominal` the wait's own length
// as the tester is told it (every bud's minutes over the bud scale, the Sitting's wait once)
const stats = (r) => {
  const waits = r.P.steps.filter(isWait), ms = (re) => waits.filter((s) => re.test(s.name)).reduce((x, s) => x + s.ms, 0), scale = r.P.settings.budScale || 1;
  const budMin = r.P.steps.filter((s) => /^the bud grows/.test(s.name)).map((s) => +s.name.match(/\((\d+) min/)[1]);
  return { walks: r.P.walks, buds: budMin.length, stallBud: ms(/^the bud grows/), stallSit: ms(/^the crate fills/), stall: waits.reduce((x, s) => x + s.ms, 0), nomBud: budMin.reduce((x, n) => x + (n * MIN) / scale, 0), nomSit: T.sittingWaitMs(r.P.settings) };
};
const after = run({ ...PLAYTEST.settings }), base = run({});
const A = stats(after), B = stats(base), min = (ms) => Math.round((ms / MIN) * 10) / 10;
// care, in the same units: the bond is three Tends, a care day apart (the Companion's care day: a minute here, a local day in play: two days of waiting, in no journey)
const careWait = 2 * PLAYTEST.careDayMs, careBefore = 2 * 24 * 60 * MIN;

test("under the preset the whole loop runs on the rules and ends on a walk with a partner", () => {
  const { P, a, J, before } = after;
  assert.ok(P.steps.every((s) => s.ok), P.steps.filter((s) => !s.ok).map((s) => s.name).join(", "));
  assert.ok(J.child && J.child.parents, "the cross's child hatched"); assert.ok(S.isAdult(P.st, a, P.settings) && S.isAdult(P.st, J.b, P.settings), "both parents are adults by the preset's turns");
  const last = P.steps.filter((s) => /^a walk/.test(s.name)).pop(); assert.match(last.name, /^a walk \(S01\) with /); assert.equal(a.outings, before + 1, "the partner's outing counted: out again with a partner");
  assert.ok(P.steps.some((s) => /^the crate opens/.test(s.name) && s.ok), "the Sitting's crate was opened");
});

test("the tester's waiting under the preset: minutes, not hours or days, and a tenth of the game's own or less", () => {
  const nomA = A.nomBud + A.nomSit + careWait, nomB = B.nomBud + B.nomSit + careBefore;
  const row = (k, b, a, note = "") => "#   " + k.padEnd(36) + String(b).padEnd(10) + String(a).padEnd(8) + note;
  console.log(["# playtest preset: what a tester waits, in minutes (a walk is play, not waiting)", row("", "before", "after"),
    row("buds (" + B.buds + " / " + A.buds + ")", min(B.nomBud), min(A.nomBud)), row("the Sitting (once)", min(B.nomSit), min(A.nomSit)), row("care: a bond's 3 Tends", min(careBefore), min(careWait), "(a care day is a local day in play)"),
    row("WAITING, nominal", min(nomB), min(nomA)), row("stood still in the journey", min(B.stall), min(A.stall), "(waits overlap the walks that follow)"),
    row("walks (" + WALK_MS / MIN + " min each)", B.walks, A.walks), row("whole loop, nominal waits + walks", min(nomB + B.walks * WALK_MS), min(nomA + A.walks * WALK_MS), "(no reading time)")].join("\n"));
  assert.equal(A.nomSit, 60000, "the Sitting waits one minute"); assert.ok(A.nomBud <= 10 * MIN, "buds: " + min(A.nomBud) + " min");
  assert.ok(nomA <= 12 * MIN, "waiting: " + min(nomA) + " min"); assert.ok(nomA * 10 <= nomB, "a tenth of the game's own waiting or less"); assert.ok(A.stall <= nomA);
  assert.ok(A.walks <= B.walks, "no more walks than in play (the preset's one juvenile turn)");
});
