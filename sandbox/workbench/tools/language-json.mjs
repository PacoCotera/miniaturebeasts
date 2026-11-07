#!/usr/bin/env node
// Generates framework/language.json from framework/language.mjs: the one file the studio, the frames
// and the game read. Never hand-edit the JSON.
//
//   node prototypes/workbench/tools/language-json.mjs           # writes framework/language.json
//   node prototypes/workbench/tools/language-json.mjs --check   # exits 1 if the file is stale
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGE, validateRegistry } from "../framework/language.mjs";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../framework/language.json");
const text = JSON.stringify(LANGUAGE, null, 2) + "\n";

const red = validateRegistry().filter((r) => r.level === "red" && !r.pass);
if (red.length) { console.error("registry fails its roster rules:\n" + red.flatMap((r) => r.messages.map((m) => `  ${r.id}: ${m}`)).join("\n")); process.exit(1); }

if (process.argv.includes("--check")) {
  if (!existsSync(out) || readFileSync(out, "utf8") !== text) { console.error("framework/language.json is stale: run tools/language-json.mjs"); process.exit(1); }
  console.log("framework/language.json is current");
} else {
  writeFileSync(out, text);
  console.log(`wrote ${out}`);
}
