// The rhythm bands (the day-cycle scheme, C5): vivarium.json rules.day through bandOf and livingOf. The loop's cloud lowers the travelling ceiling, its full sun lets one grown resident nap in place, the evening lowers the ceiling;
// sleep itself stays on the real clock (restOf is untouched). Run: node --test prototypes/station/tests/day-bands.test.mjs
import { movingFixture } from "./fixtures/moving.mjs";
import "./fixtures/rooms.mjs";   // the rooms spec, as the page registers it
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import { setMoving } from "../src/moving.mjs";
import * as S from "../src/state.mjs";
import { idleBuild } from "../src/views/idle-props.mjs";
import { vivariumBuild } from "../src/views/vivarium-props.mjs";
import { bandOf, restOf, hash } from "../src/views/home-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
setMoving(movingFixture());
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), frame = J("frame.json"), home = J("home.json"), vivSpec = J("vivarium.json"), RULES = vivSpec.rules, CURVE = frame.light.curve;
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const at = (h, m = 0) => h * 3600 + m * 60;
const sv0 = () => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3 });
// a household of 2 young, 2 grown, 1 elder (stage by age at turn 30)
function household(n = { young: 2, grown: 2, elder: 1 }) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; st.turn = 30;
  const total = n.young + n.grown + n.elder; S.seedAdults(st, "S01", 5, total, settings); for (const m of st.mibis) m.paint = { state: "landed" };
  const born = [...Array(n.young).fill(29), ...Array(n.grown).fill(20), ...Array(n.elder).fill(5)];
  st.mibis.forEach((m, i) => { m.born = born[i]; });
  return st;
}
const build = (st, time, rules = RULES, extra = {}) => idleBuild({ st, sv: sv0(), settings, docked: true, light: "day", time, now: T0 + time * 1000, restRules: rules.rest, rules, motionSets: true, ...extra }, frame).props.regions;
const resting = (r) => r.residents.filter((p) => p.rest === "asleep");

test("bandOf: the real clock's bands by time; the loop's by the light's mood (cloud 1, full sun the sun rest); a loop band without max takes the real band's ceiling", () => {
  assert.deepEqual([bandOf(at(3), CURVE, RULES).max, bandOf(at(7), CURVE, RULES).max, bandOf(at(19), CURVE, RULES).max], [1, 2, 1]);
  assert.equal(bandOf(at(10, 5), CURVE, RULES).max, 1, "10:05 is the loop's cloud"); assert.equal(bandOf(at(10, 5), CURVE, RULES).sun, null);
  const sun = bandOf(at(10, 35), CURVE, RULES); assert.equal(sun.max, 2, "full sun keeps the day's ceiling"); assert.deepEqual(sun.sun, { max: 1, stages: ["adult", "elder"] });
  assert.equal(bandOf(at(7), CURVE, RULES).sun, null); assert.equal(bandOf(at(19), CURVE, RULES).loop, -1);
  assert.notEqual(bandOf(at(10, 35), CURVE, RULES).loop, bandOf(at(10, 35) + 75 * 60, CURVE, RULES).loop, "each loop has its number");
  assert.deepEqual(bandOf(at(10, 35), CURVE, {}), { max: null, sun: null, loop: -1 }, "no rules.day: no band");
});

test("the travelling ceiling goes in the props: 10:05 cloud 1, 07:00 2, 19:00 1", () => {
  const st = household();
  assert.deepEqual(build(st, at(10, 5)).travel, { max: 1 }); assert.deepEqual(build(st, at(7)).travel, { max: 2 }); assert.deepEqual(build(st, at(19)).travel, { max: 1 });
  const { day, ...noDay } = RULES; assert.equal(build(st, at(10, 5), noDay).travel, undefined, "no rules.day: the key is left out, the face keeps the spec's");
});

test("10:35 full sun: at most one adult or elder naps in place, never a young one; restOf still calls everyone awake", () => {
  const st = household(); let seen = 0;
  for (const m of [0, 1, 2, 3, 5, 10, 20]) {   // minutes into the sun: the same minute always gives the same one
    const t = at(10, 35) + m * 60, r = build(st, t), z = resting(r); assert.ok(z.length <= 1, `${z.length} at ${t}`);
    for (const p of z) { assert.ok(["adult", "elder"].includes(p.stage), p.stage); seen++; }
    assert.deepEqual(build(st, t).residents.map((p) => p.rest), r.residents.map((p) => p.rest));
  }
  assert.ok(seen > 0, "the sun rest happens");
  const t = at(10, 35), ids = st.mibis.map((m) => ({ id: String(m.id), seed: hash(m.id), species: S.speciesOf(m), stage: S.mibiStage(st, m, settings) }));
  assert.ok(Object.values(restOf(ids, t, RULES.rest)).every((v) => v === "awake"), "sleep stays on the real clock");
});

test("the focused resident is never the one that naps", () => {
  const st = household(), napper = resting(build(st, at(10, 35)))[0]; assert.ok(napper, "someone naps");
  const r = vivariumBuild({ st, sv: sv0(), settings, docked: true, light: "day", focus: null, seen: napper.id, time: at(10, 35), now: T0 + at(10, 35) * 1000, restRules: RULES.rest, rules: RULES, motionSets: true }, vivSpec, frame, home).props.regions;
  assert.ok(!resting(r).some((p) => p.id === napper.id), "the focused one stays awake"); assert.ok(r.travel, "the Vivarium sends the ceiling");
});

test("a lone awake resident at 10:35 is never curled; sun.max 0 curls none", () => {
  assert.equal(resting(build(household({ young: 0, grown: 1, elder: 0 }), at(10, 35))).length, 0);
  assert.equal(resting(build(household({ young: 1, grown: 1, elder: 0 }), at(10, 35))).length, 0, "one grown and one young: only one would stay awake");
  const off = JSON.parse(JSON.stringify(RULES)); off.day.loop["full sun"].sun.max = 0;
  assert.equal(resting(build(household(), at(10, 35), off)).length, 0);
  assert.deepEqual(build(household(), at(10, 35), off).travel, { max: 2 });
});
