#!/usr/bin/env node
// The art director's layer table on the real pictures: the Station page's own face, in test mode (?test), drawing Pods from pods-props, Home from home-props Cargo from cargo-props and Create from create-props. At each of Pods' states and each of Home's, Cargo's and Create's capture points the
// pixels outside the palette on pass 1 (chrome) and pass 2 (chrome and art) must read 0; painted pictures show only on pass 3. For Home, Cargo, Idle and Create also check 1 of the gate: no region of the face's log departs from home.json, cargo.json, frame.json (Idle) or create.json
// (tools/home-regions.mjs, tools/cargo-regions.mjs, tools/idle-regions.mjs, tools/create-regions.mjs), and the budgets are printed (objects, pictures, props). Prints one line per state; exits 1 on any other reading.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/layer-check.mjs   (after build.sh)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { podsStates } from "./pods-states.mjs";
import { homeStates } from "./home-states.mjs";
import { departures } from "./home-regions.mjs";
import { idleStates } from "./idle-states.mjs";
import { departures as idleDepartures } from "./idle-regions.mjs";
import { cargoStates } from "./cargo-states.mjs";
import { departures as cargoDepartures } from "./cargo-regions.mjs";
import { createStates } from "./create-states.mjs";
import { departures as createDepartures } from "./create-regions.mjs";

const specs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), home = J("home"), cargo = J("cargo"), create = J("create"), frame = J("frame");
let failed = 0;
const reading = (screen) => async (name, page, fail) => {
  const r = await page.evaluate(() => window.__st.snapshot());
  let extra = "";
  if (screen === "home") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, cur: window.__st.props?.focus?.cur ?? "room", size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = departures(c.log, home, frame, c.cur); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "idle") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = idleDepartures(c.log, frame); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "cargo") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = cargoDepartures(c.log, cargo, frame, c.state); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "create") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = createDepartures(c.log, create, frame, c.state); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  console.log(name.padEnd(34) + " chrome " + String(r.pass1).padStart(8) + " · chrome+art " + String(r.pass2).padStart(8) + extra + (r.errors.length ? " · errors: " + r.errors.join("; ") : "") + (r.refused ? " · refused nodes: " + r.refused : ""));
  if (r.errors.length || r.refused) fail(name + ": " + r.errors.join("; ") + " refused " + r.refused);
  if (r.pass1 !== 0) fail(name + ": chrome reads " + r.pass1 + " off-palette pixels"); if (r.pass2 !== 0) fail(name + ": art reads " + r.pass2 + " off-palette pixels");
};
for (const [screen, states] of [["pods", podsStates], ["home", homeStates], ["cargo", cargoStates], ["create", createStates], ["idle", idleStates]]) { const { fails } = await states(reading(screen)); failed += fails.length; }
console.log(failed ? failed + " failure(s)" : "layer check ok"); process.exit(failed ? 1 : 0);
