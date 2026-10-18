#!/usr/bin/env node
// Writes the Vivarium's keep-out from the measured curls (curl-measure.mjs) into vivarium.json regions.resident.walk.keepOut; `--check` exits 1 when the file differs. The number is derived, never typed.
//   node prototypes/station/tools/make-keepout.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { measureCurls, keepOutOf, VIVARIUM_JSON } from "./curl-measure.mjs";

const raw = readFileSync(VIVARIUM_JSON, "utf8"), spec = JSON.parse(raw), k = keepOutOf(spec, measureCurls()), next = raw.replace(/"keepOut": \[[^\]]*\]/, `"keepOut": [${k.join(", ")}]`);
if (process.argv.includes("--check")) { if (next !== raw) { console.error(`vivarium.json keepOut is not ${k.join(", ")}: run station/tools/make-keepout.mjs`); process.exit(1); } console.log("keepOut " + k.join(", ")); }
else { writeFileSync(VIVARIUM_JSON, next); console.log("keepOut " + k.join(", ")); }
