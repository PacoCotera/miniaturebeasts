#!/usr/bin/env node
// The goldens (lvgl-switch.md §5): the framebuffer hash of each state of a screen the face draws with words, drawn by the page's own face (the C words from the screen's props) on its own pictures (the placed masters, the
// generated stand-ins), committed in prototypes/face/golden/<screen>/<screen>.json beside the PNG of each for review: Pods' states, Home's capture points, Cargo's and Idle's. `--check` draws them again and fails on any difference (hash, or a
// state missing). Home is taken with reduced motion (the walk and the events at their end) and, for its two timed points, on a virtual clock at an exact instant. Taken on WebAssembly; the native x86-64 and aarch64 builds
// must give the same hashes (B4b). `--logs <dir>` also writes, per state, <dir>/<screen>/<png name>.json: the face's log (its nodes, type entries and snapshot) and the props facts the specs' layout.facts
// name, from the frame the hash is taken of, for the layout check (tools/layout-check.mjs); nothing is written into the tree. A state that draws a placed picture the masters index flags placeholder or stand-in is
// refused; so is one that draws a built picture registered stand-in (the code drawing a creature, an item, a light or an effect itself), except the developer switch's mechanism goldens (DEV_SWITCH), which are listed.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/goldens.mjs [--check | --long-names] [--logs <dir>] [pods|home|cargo|idle]
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
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
import { sittingStates } from "./sitting-states.mjs";

const golden = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../golden"), longNames = process.argv.includes("--long-names"), check = process.argv.includes("--check") || longNames;   // --long-names: the states drawn again with the longest names of the live list (station-page.mjs), for the layout check's long-names pass only: nothing written, no hash compared (the hashes are not the goldens')
if (longNames) { process.env.LONG_NAMES = "1"; if (!process.argv.includes("--logs")) { console.error("--long-names needs --logs <dir>"); process.exit(2); } }
const logsAt = process.argv.indexOf("--logs"), logs = logsAt > 0 ? path.resolve(process.argv[logsAt + 1] ?? "") : null;
if (logsAt > 0 && !process.argv[logsAt + 1]) { console.error("--logs needs a directory"); process.exit(2); }
// the props paths of the generated pictures' layout facts (each spec's layout.facts), read from the props of the frame the log is taken of
const FACT_PATHS = (() => { const dir = path.resolve(golden, "../../ui/specs/station"), out = new Set(); for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) { try { for (const q of JSON.parse(readFileSync(path.join(dir, f), "utf8")).layout?.facts ?? []) out.add(q.path); } catch { /* not a spec */ } } return [...out]; })();
const SCREENS = { pods: { states: podsStates, prefix: "pods-", note: "Pods' goldens" }, home: { states: homeStates, prefix: "", note: "Home's goldens: every capture point (the four states, one for each other state a region lists, the timed ones)" },
  cargo: { states: cargoStates, prefix: "", note: "Cargo's goldens: the bay (one to three crates, empty, shut, pods waiting), each step of one crate's opening, the frame after ✓ Skip, the report" },
  create: { states: createStates, prefix: "", note: "Create's goldens: nothing read, the shape (as the pod is, changed, a clash, a doing, one look, short, busy, the first founder), the roll's dither halfway and the grow event at three instants" },
  incubator: { states: incubatorStates, prefix: "", note: "The Incubator's goldens: empty, growing (early, late), ready, the hatch at seven instants, growNow at two, and the frame after ✓ Skip" },
  habitat: { states: habitatStates, prefix: "", note: "One mibi up close: rest, the meet (and its placeholder), out with the Companion, the card, a plate focused, the Companion module (a request waiting, away), Cross, Portrait, the Wild gate armed, a tile focused, a full room's eight places, moving up close (a chip focused; a full room's plate), a young mibi's Return card, a bonded juvenile's held Return plate, the four lights and the namer over it (opened, typed, the accents page, a refusal, empty, full)" },
  vivarium: { states: vivariumStates, prefix: "", note: "The Vivarium's whole: docked (the carried two asleep), away, an out mibi's tile focused, empty, a housed tile and a sleeper focused, eight residents, and the walk 8000 ms in" },
  library: { states: libraryStates, prefix: "", note: "The Library. Level 1: only the Loika met, a mid-game catalogue (the wish alone on a found species and beside the Loika's face chip), glints and three new looks, the room key (the ring on the last species visited), and the Home to Level 1 dither at its midpoint (motion on, virtual clock). Level 2: the Loika at mid, its Coat lit with its page, a met-only sheet, glints, a wish no one carries, the Untuva with Character shut, the Hiljan, the Kilpo, the Belatz, the Belatz's Coat lit complete, the Blikur and the Loika late (colour chips). Level 3, far: a Loika lineage of two blocks (the ring on Moss) and of one (on Dot); close: on Moss, links leaving every edge, a tree that fits the view, a pan's three steps (motion on, virtual clock) and FAR to CLOSE at the dither's midpoint" },
  bench: { states: benchStates, prefix: "", note: "The Probe bench: docked with the ring on the plates, the upgrade armed, the Probe away, and the upgrade fitted" },
  sitting: { states: sittingStates, prefix: "", note: "The sitting (S01 adult Dot, noon, reduced motion unless timed): the pose step (three habits, the curl, one habit, a juvenile), the place step (two places, at night, five places), the confirm step (at rest, armed), begin at 150 ms (motion on, virtual clock), the portrait (the bone canvas at 528×392) and a long name" },
  idle: { states: idleStates, prefix: "", note: "Idle's goldens: the whole screen with the carried set asleep, the Companion away, the nest alone, no line, and twelve residents 8000 ms into the walk" } };
const want = process.argv.slice(2).filter((a) => SCREENS[a]), run = want.length ? want : Object.keys(SCREENS);
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
// The developer switch "Motion sets (stand-ins)": mechanism goldens (not art) that draw the moving sets' stand-in atlases on purpose; the built-stand-in guard skips them and lists what they draw.
const DEV_SWITCH = new Set(["vivarium-moving-8000ms", "habitat-moment-S01-0", "habitat-moment-S01-450", "habitat-moment-S01-900", "habitat-moment-S01-1350"]);
let failed = 0; const devSwitch = [];   // [state, [picture ids]]: the built stand-ins a developer-switch golden draws (listed, not refused)
for (const screen of run) {
  const { states, prefix, note } = SCREENS[screen], dir = path.join(golden, screen), file = path.join(dir, screen + ".json"), got = {}; const pngs = {};
  const { fails } = await states(async (name, page, fail, opts) => {
    if (opts?.captureOnly) return;   // a capture state (fix 14), not a golden
    const a = await page.evaluate(() => window.__st.snapshot({ capture: true }));
    if (logs) { const r = await page.evaluate((paths) => { const p = window.__st.props, lg = window.__st.check().log, get = (o, q) => q.split(".").reduce((v, k) => v?.[k], o), facts = {};
        for (const q of paths) { const v = get(p, q); if (v !== undefined) facts[q] = v; }
        return { spec: p?.screen ?? null, idle: !!p?.idle, overlay: p?.overlay?.id ?? null, form: p?.overlay?.form ?? null, log: { nodes: lg?.nodes ?? null, type: lg?.type ?? [], snapshot: lg?.snapshot ?? null }, facts }; }, FACT_PATHS);
      mkdirSync(path.join(logs, screen), { recursive: true }); writeFileSync(path.join(logs, screen, prefix + slug(name) + ".json"), JSON.stringify({ screen, state: name, hash: a.hash, png: prefix + slug(name) + ".png", ...r }) + "\n"); }
    if (a.errors.length || a.refused) fail(name + ": errors " + a.errors.join("; ") + " refused " + a.refused);
    if (a.owed?.length) fail(name + ": shows an owed habit key (" + a.owed.join(", ") + ")");   // a pose whose habit has no signed key draws the derived stand: never a golden
    if (a.standIns?.length) fail(name + ": draws a picture the masters index flags placeholder or stand-in (" + a.standIns.join(", ") + ")");   // refused: never a golden
    if (a.builtStandIns?.length) { if (DEV_SWITCH.has(name)) devSwitch.push([name, a.builtStandIns]); else fail(name + ": draws a built stand-in (" + a.builtStandIns.join(", ") + ")"); }   // refused, but for the developer switch's mechanism goldens
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
  else if (longNames) { /* the long-names pass compares nothing */ }
  else if (!existsSync(file)) fails.push("no goldens at " + file);
  else { const have = JSON.parse(readFileSync(file, "utf8")).states; for (const [n, g] of Object.entries(have)) if (!got[n]) { fails.push(n + " was not drawn"); console.error("FAIL " + n + " was not drawn"); } else if (got[n].hash !== g.hash) { fails.push(n); console.error(`FAIL ${n}: ${got[n].hash}, golden ${g.hash}`); } for (const n of Object.keys(got)) if (!have[n]) { fails.push(n); console.error("FAIL " + n + " has no golden"); } }
  console.log(`${screen}: ` + (fails.length ? fails.length + " failure(s)" : check ? "goldens match" : "goldens taken")); failed += fails.length;
}
console.log(`built stand-ins: ${devSwitch.length} developer-switch golden(s) draw them (listed, not refused)` + (devSwitch.length ? ":" : ""));
for (const [n, ids] of devSwitch) console.log("  " + n.padEnd(34) + " " + ids.join(", "));
process.exit(failed ? 1 : 0);
