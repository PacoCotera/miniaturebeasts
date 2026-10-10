#!/usr/bin/env node
// The Pods goldens (lvgl-switch.md §5): the framebuffer hash of each of Pods' states, drawn by the page's own face (the C words from pods-props) on its own pictures (the placed masters, the generated stand-ins, the pod from
// its layers), committed in prototypes/face/golden/pods/pods.json beside the PNG of each for review. `--check` draws them again and fails on any difference (hash, or a state missing). Taken on WebAssembly;
// the native x86-64 and aarch64 builds must give the same hashes (B4).
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/goldens.mjs [--check]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { podsStates } from "./pods-states.mjs";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../golden/pods"), check = process.argv.includes("--check"), file = path.join(dir, "pods.json");
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const got = {};
const { fails } = await podsStates(async (name, page, fail) => {
  const a = await page.evaluate(() => window.__st.snapshot({ capture: true })), b = await page.evaluate(() => window.__st.snapshot({ capture: true }));
  if (a.errors.length || a.refused) fail(name + ": errors " + a.errors.join("; ") + " refused " + a.refused);
  if (a.hash !== b.hash) fail(name + ": drawn twice, two hashes (" + a.hash + ", " + b.hash + "): the state is not deterministic");
  got[name] = { hash: a.hash, png: "pods-" + slug(name) + ".png" };
  if (!check) { mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, got[name].png), Buffer.from(a.png.split(",")[1], "base64")); }
  console.log(name.padEnd(34) + " " + a.hash);
});
if (!check) { if (!fails.length) { writeFileSync(file, JSON.stringify({ _note: "Pods' goldens: the hash of the 1024×600 framebuffer of each state drawn by the C words (WebAssembly), with the PNG for review. Written by tools/goldens.mjs; never edited by hand.", states: got }, null, 1) + "\n"); console.log("wrote " + Object.keys(got).length + " goldens to " + dir); } }
else {
  if (!existsSync(file)) fails.push("no goldens at " + file);
  else { const want = JSON.parse(readFileSync(file, "utf8")).states; for (const [n, g] of Object.entries(want)) if (!got[n]) { fails.push(n + " was not drawn"); console.error("FAIL " + n + " was not drawn"); } else if (got[n].hash !== g.hash) { fails.push(n); console.error(`FAIL ${n}: ${got[n].hash}, golden ${g.hash}`); } for (const n of Object.keys(got)) if (!want[n]) { fails.push(n); console.error("FAIL " + n + " has no golden"); } }
}
console.log(fails.length ? fails.length + " failure(s)" : check ? "goldens match" : "goldens taken"); process.exit(fails.length ? 1 : 0);
