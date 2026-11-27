// Owner note #83 (2026-11-19 14:11, "the station must run on real clocks"): every place that says when a young mibi grows up says the real time left, from the one growAt.
//   node --test prototypes/station/tests/grow-words.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { growIn, stageNote } from "../src/age-words.mjs";
import { goalWords, companionWords } from "../src/views/goal-words.mjs";
import { youngWhen } from "../src/views/vivarium-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8"));
const MIN = 60000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 };

test("growIn rounds the time left plainly", () => {
  assert.deepEqual([0, 30000, MIN].map(growIn), ["soon", "soon", "soon"]);
  assert.deepEqual([MIN + 1, 30 * MIN, 40 * MIN, 59 * MIN].map(growIn), ["in 2 minutes", "in 30 minutes", "in 40 minutes", "in 59 minutes"]);
  assert.deepEqual([60 * MIN, 89 * MIN].map(growIn), ["in an hour", "in an hour"]);
  assert.deepEqual([90 * MIN, 119 * MIN, 120 * MIN].map(growIn), ["in 2 hours", "in 2 hours", "in 2 hours"]);
});

test("the banner, the card and the library read the time left from growAt, not a fixed two hours", () => {
  const st = S.freshSt("w1", 3, 1_000_000); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false;
  const [a, b] = S.seedAdults(st, "S01", 5, 2, settings).mibis; a.name = "Dot"; b.name = "Moss";
  for (const m of [a, b]) { m.born = st.turn; delete m.grownTurn; }
  a.growAt = Date.now() + 30 * MIN - 5000; b.growAt = Date.now() + 30 * MIN - 5000;
  const goal = S.goalKey(st, { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings);
  assert.equal(goal.key, "growUp");
  assert.equal(goalWords(goal, false, frameSpec).text, "Dot grows up in 30 minutes", "away, the aim");
  assert.equal(goalWords(goal, true, frameSpec).text, "The pair grows up in 30 minutes");
  assert.equal(companionWords(goal, frameSpec).text, "Dot grows up in 30 min", "the Companion banner");
  a.growAt = b.growAt = Date.now() + 119 * MIN;
  assert.equal(goalWords(S.goalKey(st, { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings), false, frameSpec).text, "Dot grows up in 2 hours");
  a.growAt = b.growAt = Date.now() + 20000;
  assert.equal(goalWords(S.goalKey(st, { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings), false, frameSpec).text, "Dot grows up soon");
  assert.equal(youngWhen(st, a, settings), "soon", "the vivarium and wall plates say it the same way");
  a.growAt = Date.now() + 40 * MIN - 1000; assert.equal(youngWhen(st, a, settings), "in 40 minutes");
  assert.equal(stageNote(a, st.turn, 2, 16).ms > 39 * MIN, true, "the library's stage row has the milliseconds");
});

test("owner #165: the Companion header, out, findPod with no species reads 'Find a pod', not 'Go out with the Companion'", () => {
  const goal = { key: "pair", step: { key: "findPod" } };
  assert.equal(companionWords(goal, frameSpec).text, "Find a pod");
  assert.equal(goalWords(goal, true, frameSpec).text, "Go out with the Companion", "the Station's own line stays while docked");
});
