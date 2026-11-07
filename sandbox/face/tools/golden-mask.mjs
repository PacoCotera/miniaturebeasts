#!/usr/bin/env node
// The mask proof of a retake of the frame: every golden PNG as committed now (prototypes/face/golden/<screen>/) against the same file at a base revision, pixel by pixel. A pixel that differs must lie
// inside the frame's own boxes: the top bar's rows 0 to 40, the bottom line's rows 564 to 599, the decision panel's rect (frame.json regions.panel.rect) while a panel is open, and the chapter rail's
// tabs (the rail.tab nodes the face drew in that state: each tab's ground, its emblem and its word). Each state is drawn again by its states tool, for the face's log (the tabs and the panel); the pixels
// compared are the committed PNGs'. Prints, per screen, the states compared, the states that changed and the pixels outside the mask (the outliers, expected 0), and one line per state with any;
// exits 1 on an outlier, a state with no PNG at the base, or a PNG that is not 1024×600.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/golden-mask.mjs [--base <rev>] [screen ...]   (after build.sh; the base defaults to HEAD)
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

const here = path.dirname(fileURLToPath(import.meta.url)), golden = path.resolve(here, "../golden"), repo = path.resolve(here, "../../..");
const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8"));
const SCREENS = { pods: podsStates, home: homeStates, cargo: cargoStates, create: createStates, incubator: incubatorStates, habitat: habitatStates, vivarium: vivariumStates, library: libraryStates, bench: benchStates, sitting: sittingStates, idle: idleStates };
const argv = process.argv.slice(2), bi = argv.indexOf("--base"), base = bi >= 0 ? argv[bi + 1] : "HEAD", want = argv.filter((a, i) => SCREENS[a] && (bi < 0 || i !== bi + 1)), run = want.length ? want : Object.keys(SCREENS);
const W = 1024, H = 600, BARS = [[0, 40], [564, 599]], PANEL = frame.regions.panel.rect;
const atBase = (rel) => { try { return execFileSync("git", ["-C", repo, "show", `${base}:${rel}`], { maxBuffer: 1 << 26 }); } catch { return null; } };
let failed = 0; const totals = { states: 0, changed: 0, outliers: 0 };
for (const screen of run) {
  const dir = path.join(golden, screen), file = path.join(dir, screen + ".json"); if (!existsSync(file)) { console.error(`FAIL ${screen}: no goldens at ${file}`); failed++; continue; }
  const states = JSON.parse(readFileSync(file, "utf8")).states, per = { states: 0, changed: 0, outliers: 0 }, lines = [];
  const { fails } = await SCREENS[screen](async (name, page, fail, opts) => {
    if (opts?.captureOnly || !states[name]) return;
    const { log, panel } = await page.evaluate(() => { window.__st.snapshot({ capture: false }); return { log: window.__st.check().log, panel: window.__st.props?.overlay?.id === "panel" }; });
    const boxes = (log.nodes ?? []).filter((n) => n[3] === "rail.tab" && n[6] > 0 && n[7] > 0).map((n) => [n[4], n[5], n[6], n[7]]);   // the tabs: grounds (sprites), emblems and words
    if (panel) boxes.push(PANEL);   // the panel's plate, its master or the code-drawn one: the same rect
    const rel = path.relative(repo, path.join(dir, states[name].png)).split(path.sep).join("/"), was = atBase(rel);
    if (!was) { fail(`${name}: ${rel} is not at ${base}`); return; }
    const A = decodePNG(was), B = decodePNG(readFileSync(path.join(dir, states[name].png)));
    if (A.width !== W || A.height !== H || B.width !== W || B.height !== H) { fail(`${name}: not ${W}×${H}`); return; }
    let diff = 0, out = 0, first = null;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (A.data[i] === B.data[i] && A.data[i + 1] === B.data[i + 1] && A.data[i + 2] === B.data[i + 2] && A.data[i + 3] === B.data[i + 3]) continue;
      diff++;
      const masked = BARS.some(([y0, y1]) => y >= y0 && y <= y1) || boxes.some((b) => x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]);
      if (!masked) { out++; first ??= [x, y]; }
    }
    per.states++; if (diff) per.changed++; per.outliers += out;
    if (out) lines.push(`  ${name}: ${out} of ${diff} changed pixels outside the frame's boxes (first at ${first.join(", ")})`);
  });
  failed += fails.length + (per.outliers ? 1 : 0);
  for (const l of lines) console.log(l);
  console.log(`mask ${screen.padEnd(10)} ${String(per.states).padStart(3)} goldens · ${String(per.changed).padStart(3)} changed · ${per.outliers} outliers`);
  totals.states += per.states; totals.changed += per.changed; totals.outliers += per.outliers;
}
console.log(`mask: ${totals.states} goldens against ${base}, ${totals.changed} changed, ${totals.outliers} outliers`);
process.exit(failed ? 1 : 0);
