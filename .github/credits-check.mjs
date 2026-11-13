// The credits rule: every file under a vendor or fonts folder of the game or the site has an entry in website/credits.json
// (an entry's "files" lists the folders or files it covers; "pending" holds a file whose licence is still being confirmed and is not shown on the page).
// Run alone (node .github/credits-check.mjs) or from smoke.mjs; exits 1 and names each uncovered file.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = ["prototypes", "v1/native", "website"];   // where vendored code and fonts live
const KEEP = new Set(["vendor", "fonts"]);              // folder names that hold third-party files
const SKIP = new Set(["node_modules", ".git", "dist"]);

function filesUnder(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) filesUnder(p, out); } else out.push(p);
  }
  return out;
}
function vendorFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (KEEP.has(e.name)) filesUnder(p, out); else vendorFiles(p, out);
  }
  return out;
}

export function uncovered() {
  const data = JSON.parse(readFileSync(path.join(root, "website/credits.json"), "utf8"));
  const covers = [...data.entries.flatMap((e) => e.files || []), ...(data.pending || []).flatMap((e) => e.files || [])];
  const isCovered = (rel) => covers.some((c) => (c.endsWith("/") ? rel.startsWith(c) : rel === c));
  const all = SCAN.map((d) => path.join(root, d)).filter(existsSync).flatMap((d) => vendorFiles(d));
  return all.map((f) => path.relative(root, f).split(path.sep).join("/")).filter((rel) => !isCovered(rel));
}

export function check() {
  const missing = uncovered();
  for (const f of missing) console.log("credits: no entry in website/credits.json covers " + f);
  return missing.length === 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ok = check();
  console.log(ok ? "credits ok" : "credits: add an entry for each file above");
  process.exit(ok ? 0 : 1);
}
