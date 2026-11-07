// L2a: the habit lists of all twenty kinds (roster HABITS), their words, the field-only list, and the Station's way with a v8 Wickle and a v8 Tepor.
//   node --test prototypes/station/tests/habits-l2a.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { HABITS } from "../../workbench/framework/roster.mjs";
import { HABIT_POSE } from "../src/layered-stand.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames/language");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const words = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/habitat.json"), "utf8")).strings.watchHabits;
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" }, sv0 = { with: null, wid: "w1", seed: 7 }, T0 = new Date(2026, 10, 7, 12, 0).getTime();
const fresh = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); return st; };
const watch = (st, m, ms) => { let r, left = ms; while (left > 0) { const dt = Math.min(250, left); r = S.benchWatch(st, sv0, m, dt, settings); left -= dt; } return r; };

test("every key of every HABITS list has a phrase, the v8 frames carry the lists, and watchHabits has no other key", () => {
  const keys = new Set(Object.values(HABITS).flat());
  for (const k of keys) assert.ok(words[k], `${k} has a phrase`);
  assert.deepEqual([...Object.keys(words)].sort(), [...keys].sort(), "the seven existing keys are inside HABITS: no other key");
  assert.equal(keys.size, 41, "the 7 of S01 to S03 and the 34 of S04 to S20");
  for (const [id, list] of Object.entries(HABITS)) assert.deepEqual(frameOf(id).habits, list, `${id}: the frame lists its habits`);
  for (const k of keys) if (k !== "sleep-curled") assert.ok(HABIT_POSE[k], `${k} maps to a pose`);
  for (const k of keys) assert.ok(words[k].split(" ").length <= 6, `${k}: six words or fewer`);
});

test("every field-only habit is in some kind's list, and the first two of each kind's list are its home habit and (but for S01 to S03's) its field one", () => {
  for (const k of S.FIELD_ONLY_HABITS) assert.ok(Object.values(HABITS).some((l) => l.includes(k)), `${k} belongs to a kind`);
  for (const [id, list] of Object.entries(HABITS)) { assert.ok(!S.FIELD_ONLY_HABITS.includes(list[0]), `${id}: its home habit is watched at the bench`); assert.equal(list.at(-1), "sleep-curled"); }
});

test("G4 a v8 Wickle docked with habitsDone beacon-sit records it and logs its phrase; the bench's watch of a Tepor records warm-sit, then sleep-curled, never stone-sense", () => {
  const st = fresh(); S.seedAdults(st, "S17", 3, 1, settings); const [w] = st.mibis; w.habits = []; w.outings = 0;
  S.mergeCare(st, { mibis: [{ id: w.id, outings: 1, habitsDone: ["beacon-sit"] }], trips: [] });
  assert.deepEqual(w.habits, ["beacon-sit"]); assert.match(st.log.at(-1), new RegExp(`${w.name} is seen sitting by a beacon$`));
  const s2 = fresh(); S.seedAdults(s2, "S05", 3, 1, settings); const [t] = s2.mibis; t.habits = [];
  assert.deepEqual(S.frameFor(t).habits, ["warm-sit", "stone-sense", "sleep-curled"]);
  watch(s2, t, 60000); assert.deepEqual(t.habits, ["warm-sit"]);
  watch(s2, t, 60000); assert.deepEqual(t.habits, ["warm-sit", "sleep-curled"]);
  watch(s2, t, 60000); assert.deepEqual(t.habits, ["warm-sit", "sleep-curled"], "stone-sense is field-only: the bench never records it");
});
