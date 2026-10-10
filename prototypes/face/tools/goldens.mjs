#!/usr/bin/env node
// The goldens (lvgl-switch.md §5): the framebuffer hash of each state of a screen the face draws with words, drawn by the page's own face (the C words from the screen's props) on its own pictures (the placed masters, the
// generated stand-ins), committed in prototypes/face/golden/<screen>/<screen>.json beside the PNG of each for review: Pods' states, Home's capture points, Cargo's and Idle's. `--check` draws them again and fails on any difference (hash, or a
// state missing). Home is taken with reduced motion (the walk and the events at their end) and, for its two timed points, on a virtual clock at an exact instant. Taken on WebAssembly; the native x86-64 and aarch64 builds
// must give the same hashes (B4b).
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/goldens.mjs [--check] [pods|home|cargo|idle]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { podsStates } from "./pods-states.mjs";
import { homeStates } from "./home-states.mjs";
import { cargoStates } from "./cargo-states.mjs";
import { idleStates } from "./idle-states.mjs";
import { createStates } from "./create-states.mjs";

const golden = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../golden"), check = process.argv.includes("--check");
const SCREENS = { pods: { states: podsStates, prefix: "pods-", note: "Pods' goldens" }, home: { states: homeStates, prefix: "", note: "Home's goldens: every capture point (the four states, one for each other state a region lists, the timed ones)" },
  cargo: { states: cargoStates, prefix: "", note: "Cargo's goldens: the bay (one to three crates, empty, shut, pods waiting), each step of one crate's opening, the report" },
  create: { states: createStates, prefix: "", note: "Create's goldens: nothing read, the shape (as the pod is, changed, a clash, a doing, one look, short, busy, the first founder), the roll's dither halfway and the grow event at three instants" },
  idle: { states: idleStates, prefix: "", note: "Idle's goldens: the whole screen with the carried set asleep, the Companion away, the nest alone, no line, and twelve residents 8000 ms into the walk" } };
const want = process.argv.slice(2).filter((a) => SCREENS[a]), run = want.length ? want : Object.keys(SCREENS);
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
let failed = 0;
for (const screen of run) {
  const { states, prefix, note } = SCREENS[screen], dir = path.join(golden, screen), file = path.join(dir, screen + ".json"), got = {};
  const { fails } = await states(async (name, page, fail) => {
    const a = await page.evaluate(() => window.__st.snapshot({ capture: true }));
    if (a.errors.length || a.refused) fail(name + ": errors " + a.errors.join("; ") + " refused " + a.refused);
    if (screen === "pods" || !/pressed|arriving/.test(name)) { const b = await page.evaluate(() => window.__st.snapshot({ capture: true })); if (a.hash !== b.hash) fail(name + ": drawn twice, two hashes (" + a.hash + ", " + b.hash + "): the state is not deterministic"); }
    got[name] = { hash: a.hash, png: prefix + slug(name) + ".png" };
    if (!check) { mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, got[name].png), Buffer.from(a.png.split(",")[1], "base64")); }
    console.log(name.padEnd(34) + " " + a.hash);
  });
  if (!check) { if (!fails.length) { writeFileSync(file, JSON.stringify({ _note: note + ": the hash of the 1024×600 framebuffer drawn by the C words (WebAssembly), with the PNG for review. An unsigned record: it moves with the masters. Written by tools/goldens.mjs; never edited by hand.", states: got }, null, 1) + "\n"); console.log("wrote " + Object.keys(got).length + " goldens to " + dir); } }
  else if (!existsSync(file)) fails.push("no goldens at " + file);
  else { const have = JSON.parse(readFileSync(file, "utf8")).states; for (const [n, g] of Object.entries(have)) if (!got[n]) { fails.push(n + " was not drawn"); console.error("FAIL " + n + " was not drawn"); } else if (got[n].hash !== g.hash) { fails.push(n); console.error(`FAIL ${n}: ${got[n].hash}, golden ${g.hash}`); } for (const n of Object.keys(got)) if (!have[n]) { fails.push(n); console.error("FAIL " + n + " has no golden"); } }
  console.log(`${screen}: ` + (fails.length ? fails.length + " failure(s)" : check ? "goldens match" : "goldens taken")); failed += fails.length;
}
process.exit(failed ? 1 : 0);
