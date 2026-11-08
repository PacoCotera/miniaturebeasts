// SPEED check, moved out of tests/library-family.test.mjs (the correctness gate): one compare computation a ring move makes (the props build) and a stamp's render
// are each under the 120 ms a stamp may re-render in. Run alone, on a quiet machine (the gate's perf stage, tools/gate/full-parallel.sh): a loaded machine measures the load, not the code.
//   node --test prototypes/face/perf/library-family.perf.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setFrames, frameOf } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { familyBuild as familyBuildUnchecked } from "../../station/src/views/library-props.mjs";
import { lineCased } from "../../station/tests/fixtures/line-case.mjs";
import { buildLineage } from "../../station/tests/fixtures/lineage.mjs";
import { stampPicture } from "../../station/src/pictures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library"), home = J("home");
const metrics = built ? JSON.parse(readFileSync(path.resolve(here, "../dist/metrics.json"), "utf8")) : null;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))).filter((f) => !f.species.draft));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
const SINCE = new Date(2026, 9, 4, 12).getTime(), NOW = new Date(2026, 9, 17, 12).getTime();
const world = () => { const st = S.freshSt("w1", 3, 1e6); S.normalize(st); st.turn = 20; const by = buildLineage(st, "full", { turn: 20 }); for (const m of st.mibis) m.since = SINCE; return { st, by }; };
const familyBuild = lineCased(familyBuildUnchecked, "library-family");
const build = (st, node, mem = {}) => familyBuild({ st, settings, ui: { species: "S01", l3: { S01: { node, zoom: "compare", cam: null, ...mem } }, l3last: null }, metrics, now: NOW }, spec, frameSpec, home);

test("a ring move's compare and a stamp's render are each under 120 ms", { skip }, () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id;
  build(st, id("Moss"), { held: id("Dot") });   // the cold build, as the test measures it before the five timed ones
  const times = []; for (const n of ["Fern", "Wren", "Moss", "Sorrel", "Lark"]) { const s = performance.now(); build(st, id(n), { held: id("Dot") }); times.push(performance.now() - s); }
  const renders = ["Dot", "Moss", "Fern"].map((n) => { const s = performance.now(); stampPicture(frameOf("S01"), by[n].genome, by[n].read).build().rgba(); return performance.now() - s; });
  console.log(`# compare's props build per ring move: ${times.map((x) => x.toFixed(1)).join(", ")} ms; a stamp's render: ${renders.map((x) => x.toFixed(1)).join(", ")} ms`);
  assert.ok(Math.max(...times) < 120 && Math.max(...renders) < 120, "a ring move's compare and a stamp's render each under the 120 ms a stamp may re-render in");
});
