#!/usr/bin/env node
// The goldens (lvgl-switch.md §5): the framebuffer hash of each state of a screen the face draws with words, drawn by the page's own face (the C words from the screen's props) on its own pictures (the placed masters, the
// generated stand-ins), committed in prototypes/face/golden/<screen>/<screen>.json beside the PNG of each for review: Pods' states, Home's capture points, Cargo's and Idle's. `--check` draws them again and fails on any difference (hash, or a
// state missing). Home is taken with reduced motion (the walk and the events at their end) and, for its two timed points, on a virtual clock at an exact instant. Taken on WebAssembly; the native x86-64 and aarch64 builds
// must give the same hashes (B4b).
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/goldens.mjs [--check] [pods|home|cargo|idle]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../../ui/png.mjs";
import { podsStates } from "./pods-states.mjs";
import { homeStates } from "./home-states.mjs";
import { cargoStates } from "./cargo-states.mjs";
import { idleStates } from "./idle-states.mjs";
import { createStates } from "./create-states.mjs";
import { incubatorStates } from "./incubator-states.mjs";
import { vivariumStates } from "./vivarium-states.mjs";
import { habitatStates } from "./habitat-states.mjs";
import { libraryStates } from "./library-states.mjs";
import { benchStates } from "./bench-states.mjs";

const golden = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../golden"), check = process.argv.includes("--check");
const SCREENS = { pods: { states: podsStates, prefix: "pods-", note: "Pods' goldens" }, home: { states: homeStates, prefix: "", note: "Home's goldens: every capture point (the four states, one for each other state a region lists, the timed ones)" },
  cargo: { states: cargoStates, prefix: "", note: "Cargo's goldens: the bay (one to three crates, empty, shut, pods waiting), each step of one crate's opening, the frame after ✓ Skip, the report" },
  create: { states: createStates, prefix: "", note: "Create's goldens: nothing read, the shape (as the pod is, changed, a clash, a doing, one look, short, busy, the first founder), the roll's dither halfway and the grow event at three instants" },
  incubator: { states: incubatorStates, prefix: "", note: "The Incubator's goldens: empty, growing (early, late), ready, the hatch at seven instants, growNow at two, and the frame after ✓ Skip" },
  habitat: { states: habitatStates, prefix: "", note: "One mibi up close: rest, the meet (and its placeholder), out with the Companion, the card, a plate focused, the Companion module (a request waiting, away), Cross, Portrait, the Wild gate armed, a tile focused, twelve compact tiles, the four lights and the namer over it (opened, typed, the accents page, a refusal, empty, full)" },
  vivarium: { states: vivariumStates, prefix: "", note: "The Vivarium's whole: docked (the carried two asleep), away, an out mibi's tile focused, empty, a housed tile and a sleeper focused, twelve residents, and the walk 8000 ms in" },
  library: { states: libraryStates, prefix: "", note: "The Library. Level 1: only the Loika met, a mid-game catalogue (the wish alone on a found species and beside the Loika's face chip), glints and three new looks, the room key (the ring on the last species visited), and the Home to Level 1 dither at its midpoint (motion on, virtual clock). Level 2: the Loika at mid, its Coat lit with its page, a met-only sheet, glints, a wish no one carries, the Untuva with Character shut, the Hiljan, the Kilpo, the Belatz, the Belatz's Coat lit complete, the Blikur and the Loika late (colour chips)" },
  bench: { states: benchStates, prefix: "", note: "The Probe bench: docked with the ring on the plates, the upgrade armed, the Probe away, and the upgrade fitted" },
  idle: { states: idleStates, prefix: "", note: "Idle's goldens: the whole screen with the carried set asleep, the Companion away, the nest alone, no line, and twelve residents 8000 ms into the walk" } };
const want = process.argv.slice(2).filter((a) => SCREENS[a]), run = want.length ? want : Object.keys(SCREENS);
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
let failed = 0;
for (const screen of run) {
  const { states, prefix, note } = SCREENS[screen], dir = path.join(golden, screen), file = path.join(dir, screen + ".json"), got = {}; const pngs = {};
  const { fails } = await states(async (name, page, fail, opts) => {
    if (opts?.captureOnly) return;   // a capture state (fix 14), not a golden
    const a = await page.evaluate(() => window.__st.snapshot({ capture: true }));
    if (a.errors.length || a.refused) fail(name + ": errors " + a.errors.join("; ") + " refused " + a.refused);
    if (a.owed?.length) fail(name + ": shows an owed habit key (" + a.owed.join(", ") + ")");   // a pose whose habit has no signed key draws the derived stand: never a golden
    if (screen === "pods" || !/pressed|arriving/.test(name)) { const b = await page.evaluate(() => window.__st.snapshot({ capture: true })); if (a.hash !== b.hash) fail(name + ": drawn twice, two hashes (" + a.hash + ", " + b.hash + "): the state is not deterministic"); }
    got[name] = { hash: a.hash, png: prefix + slug(name) + ".png" };
    if (name === "create-roll-100" || name === "create-shape-changed") pngs[name] = a.png;
    if (!check) { mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, got[name].png), Buffer.from(a.png.split(",")[1], "base64")); }
    console.log(name.padEnd(34) + " " + a.hash);
  });
  if (screen === "create" && pngs["create-roll-100"] && pngs["create-shape-changed"]) {   // on the rig every roll is a cut (fix 5 Create C8): the half-way frame is the new picture whole, so everything under the top bar equals create-shape-changed's (the two worlds' top bars may differ in a material figure)
    const A = decodePNG(Buffer.from(pngs["create-roll-100"].split(",")[1], "base64")), B = decodePNG(Buffer.from(pngs["create-shape-changed"].split(",")[1], "base64")); let diff = 0;
    for (let i = 40 * A.width * 4; i < A.data.length; i++) if (A.data[i] !== B.data[i]) diff++;
    if (diff) fails.push(`create-roll-100 must equal create-shape-changed below the top bar on the rig: every roll is a cut (fix 5 Create C8); ${diff} bytes differ`);
  }
  if (!check) { if (!fails.length) { writeFileSync(file, JSON.stringify({ _note: note + ": the hash of the 1024×600 framebuffer drawn by the C words (WebAssembly), with the PNG for review. An unsigned record: it moves with the masters. Written by tools/goldens.mjs; never edited by hand.", states: got }, null, 1) + "\n"); console.log("wrote " + Object.keys(got).length + " goldens to " + dir); } }
  else if (!existsSync(file)) fails.push("no goldens at " + file);
  else { const have = JSON.parse(readFileSync(file, "utf8")).states; for (const [n, g] of Object.entries(have)) if (!got[n]) { fails.push(n + " was not drawn"); console.error("FAIL " + n + " was not drawn"); } else if (got[n].hash !== g.hash) { fails.push(n); console.error(`FAIL ${n}: ${got[n].hash}, golden ${g.hash}`); } for (const n of Object.keys(got)) if (!have[n]) { fails.push(n); console.error("FAIL " + n + " has no golden"); } }
  console.log(`${screen}: ` + (fails.length ? fails.length + " failure(s)" : check ? "goldens match" : "goldens taken")); failed += fails.length;
}
process.exit(failed ? 1 : 0);
