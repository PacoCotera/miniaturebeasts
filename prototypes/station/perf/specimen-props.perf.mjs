// SPEED check, moved out of tests/specimen-props.test.mjs (the correctness gate): a cold-cache Home build takes under 50 ms.
// Run alone, on a quiet machine (the gate's perf stage, tools/gate/full-parallel.sh): a loaded machine measures the load, not the code.
//   node --test prototypes/station/perf/specimen-props.perf.mjs
import { test } from "node:test";
import "../tests/fixtures/rooms.mjs";   // the rooms spec, as the page registers it
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import { withSeals } from "../tests/fixtures/sealed.mjs";
import * as S from "../src/state.mjs";
import { libraryOf } from "../src/views/specimen-props.mjs";
import { homeBuild, setLibrary } from "../src/views/home-props.mjs";
import { clearSpecimens } from "../src/specimen-cache.mjs";

setLibrary(libraryOf);
const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(withSeals(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("home.json"), frameSpec = J("frame.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; return st; };

test("a cold cache: building Home's props takes under 50 ms", () => {
  clearSpecimens(); const st = world(); S.seedAdults(st, "S01", 5, 3, settings);
  const t0 = performance.now(); homeBuild({ st, sv: { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings, docked: true, ui: {}, focus: null, time: 12 * 3600, date: { y: 2026, m: 9, d: 17 }, now: Date.now() }, spec, frameSpec);
  const ms = performance.now() - t0; console.log(`# a cold-cache Home build: ${ms.toFixed(1)} ms`); assert.ok(ms < 50, `${ms.toFixed(1)} ms`);
});
