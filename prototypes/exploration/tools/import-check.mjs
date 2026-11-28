// The Companion's layers hold (STRUCTURE.md): every module under src/ imports only the layers src/layers.json allows it.
//   node prototypes/exploration/tools/import-check.mjs        exit 1 and one line per forbidden import
// A module's layer is its folder under src/ (src/logic/x.mjs is logic); a module not moved yet takes it from "notMoved"; shared code outside the
// folder and packages take it from "outside"; a JSON file is data. src/main.mjs and src/worker.mjs are main.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../src"), PROTO = resolve(SRC, "../..");
const { may, notMoved, outside } = JSON.parse(readFileSync(join(SRC, "layers.json"), "utf8"));
const longest = (table, path) => Object.keys(table).filter(k => k !== "about" && (k.endsWith("/") ? path.startsWith(k) : path === k)).sort((a, b) => b.length - a.length)[0];

function layerOf(file) {
  if (file.endsWith(".json")) return "data";
  const inSrc = relative(SRC, file).split(sep).join("/");
  if (!inSrc.startsWith("..")) {
    if (inSrc === "main.mjs" || inSrc === "worker.mjs") return "main";
    const folder = inSrc.split("/")[0];
    return inSrc.includes("/") && may[folder] ? folder : notMoved[longest(notMoved, inSrc)];
  }
  const path = relative(PROTO, file).split(sep).join("/");
  return outside[longest(outside, path)];
}
const packageOf = spec => outside[spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]];

const files = readdirSync(SRC, { recursive: true }).filter(f => f.endsWith(".mjs")).map(f => join(SRC, f));
const IMPORT = /(?:^|[\s;])(?:import|export)\s[^'"()]*?from\s*["']([^"']+)["']|(?:^|[\s;])import\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;
const bad = [];
for (const file of files) {
  const name = relative(SRC, file).split(sep).join("/"), from = layerOf(file);
  if (!from) { bad.push(`src/${name}: no layer (put it in a layer's folder)`); continue; }
  for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith("node:")) { if (from !== "main") bad.push(`src/${name} (${from}) imports ${spec}`); continue; }
    const to = spec.startsWith(".") ? layerOf(resolve(dirname(file), spec)) : packageOf(spec);
    if (!to) bad.push(`src/${name} imports ${spec}: no layer for it in src/layers.json`);
    else if (!may[from].includes(to)) bad.push(`src/${name} (${from}) imports ${spec} (${to}): ${from} may import ${may[from].join(", ")}`);
  }
}
if (bad.length) { console.error(bad.join("\n")); console.error(`import-check: ${bad.length} forbidden import(s)`); process.exit(1); }
console.log(`import-check: ${files.length} modules, every import allowed`);
