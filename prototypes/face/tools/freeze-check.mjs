#!/usr/bin/env node
// The freeze of the JavaScript drawing layer (design/proposals/lvgl-switch.md §5.1). prototypes/face/deprecated.json lists every deprecated drawing module with its SHA-256 at the freeze
// commit and the set of files allowed to import it. This check fails when
//   1. a listed file's content differs from its hash (an `exemptions` entry naming the commit and the reason, with the new hash, lets one fix through; every exemption is printed on every run);
//   2. a file outside the allowed set imports a listed module (an import scan over prototypes/**/*.mjs), so no new screen can be built on the layer;
//   3. a screen registered with registerScreen gains `draw`, `nodes` or `faceNodes` that the freeze did not record, unless the screen is in `migrated`;
//   4. a path leaves the list (against the base ref) without its file being deleted, or without its screen's goldens present in prototypes/face/golden/<screen>/.
// Deleting a listed file always passes. The only way out of the list is migration.
//   node prototypes/face/tools/freeze-check.mjs [--base <git ref>]      check (rule 4 only with a base ref; CI passes one)
//   node prototypes/face/tools/freeze-check.mjs --init                  write deprecated.json at the freeze commit (refuses when it exists)
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), faceDir = path.resolve(here, ".."), protoRoot = path.resolve(faceDir, "..");
export const MANIFEST = path.join(faceDir, "deprecated.json");

// What the layer is: the drawing modules of lvgl-switch.md §5.2 that exist at the freeze, by repository path under prototypes/. `screen` names the screen whose migration releases a path
// (null: shared, deleted only). `partial` marks a file whose drawing exports are frozen but whose rules or intents move out first.
export const LIST = [
  ...["scene", "context", "layout", "type", "type-node"].map((n) => ({ path: `ui/${n}.mjs`, screen: null })),
  ...["station-canvas", "browser", "canvas-assets"].map((n) => ({ path: `ui/render/${n}.mjs`, screen: null })),
  ...["bottomLine", "chapterPage", "chapterRail", "focusRing", "frame", "list", "mark", "messagePlate", "panel", "slantRail", "specimen", "stampLabel", "text", "topBar"].map((n) => ({ path: `ui/components/${n}.mjs`, screen: null })),
  ...["index.json", "inter-400-16.json", "inter-400-16.png", "inter-500-20.json", "inter-500-20.png", "inter-600-28.json", "inter-600-28.png"].map((n) => ({ path: `ui/fonts/atlas/${n}`, screen: null })),
  { path: "ui/tools/bake-type.mjs", screen: null },
  { path: "station/src/gfx.mjs", screen: null },
  ...["home", "bench", "incubator", "create", "habitat", "library"].map((n) => ({ path: `station/src/screens/${n}.mjs`, screen: n, partial: true })),
  { path: "station/src/screens/frame.mjs", screen: null, partial: true },
  { path: "station/src/screens/pods.mjs", screen: "pods", partial: true },
  { path: "station/src/screens/cross.mjs", screen: "cross" },
  { path: "station/src/views/cross.mjs", screen: "cross" },
  { path: "station/src/cross-layout.mjs", screen: "cross" },
  { path: "station/src/face-lvgl.mjs", screen: null },
];

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const SKIP = new Set(["node_modules", "dist", "img", ".git"]);
export function mjsFiles(root = protoRoot) {
  const out = [];
  (function walk(dir) { for (const e of readdirSync(dir, { withFileTypes: true })) { if (SKIP.has(e.name)) continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".mjs")) out.push(p); } })(root);
  return out.sort();
}
// The relative modules a file imports, resolved to repository paths under prototypes/ (static, side-effect and dynamic imports, and re-exports).
export function importsOf(file, root = protoRoot) {
  const src = readFileSync(file, "utf8"), found = new Set(), re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+)["']/g;
  for (let m; (m = re.exec(src));) found.add(path.relative(root, path.resolve(path.dirname(file), m[1])).split(path.sep).join("/"));
  return [...found];
}
// The top-level keys of the object each registerScreen call passes (screens/*.mjs): { screen: [the drawing keys among them] }.
export function registered(root = protoRoot) {
  const dir = path.join(root, "station/src/screens"), out = {};
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".mjs"))) {
    const src = readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/registerScreen\(\s*["']([a-z]+)["']\s*,\s*\{/g)) {
      let depth = 1, i = m.index + m[0].length, top = "", str = null;
      for (; i < src.length && depth > 0; i++) {   // the object's text at depth 1: nested braces, strings and comments skipped
        const c = src[i];
        if (str) { if (c === "\\") i++; else if (c === str) str = null; continue; }
        if (c === '"' || c === "'" || c === "`") { str = c; continue; }
        if (c === "{" || c === "(" || c === "[") { depth++; continue; }
        if (c === "}" || c === ")" || c === "]") { depth--; continue; }
        if (depth === 1) top += c;
      }
      out[m[1]] = ["draw", "nodes", "faceNodes"].filter((k) => new RegExp(`(?:^|[,\\s])${k}\\s*(?:[,:]|$)`).test(top));
    }
  }
  return out;
}
const DRAW_KEYS = ["draw", "nodes", "faceNodes"];

export function build(root = protoRoot) {
  const files = LIST.filter((e) => existsSync(path.join(root, e.path))), importers = {};
  for (const f of mjsFiles(root)) for (const t of importsOf(f, root)) if (files.some((e) => e.path === t)) (importers[t] ||= new Set()).add(path.relative(root, f).split(path.sep).join("/"));
  return {
    _note: "The freeze of the JavaScript drawing layer (design/proposals/lvgl-switch.md §5.1), written by tools/freeze-check.mjs --init at the freeze commit. Never edited by hand to loosen it: a path leaves with its file's deletion or its screen's goldens; a fix a frozen file needs before its screen moves goes in `exemptions`.",
    paths: files.map((e) => ({ ...e, sha256: sha(path.join(root, e.path)), importers: [...(importers[e.path] || [])].sort() })),
    screens: registered(root),
    migrated: [],
    exemptions: [],
  };
}

// The checks. `base`: the manifest at the base ref (rule 4), or null. → { failures: [string], notes: [string] }
export function check(manifest, root = protoRoot, base = null, goldensDir = path.join(faceDir, "golden")) {
  const failures = [], notes = [], listed = new Map(manifest.paths.map((e) => [e.path, e]));
  for (const x of manifest.exemptions || []) notes.push(`exemption: ${x.path} at ${x.commit}: ${x.reason}`);
  for (const e of manifest.paths) {   // 1
    const file = path.join(root, e.path); if (!existsSync(file)) continue;
    const now = sha(file), ex = (manifest.exemptions || []).find((x) => x.path === e.path && x.sha256 === now);
    if (now !== e.sha256 && !ex) failures.push(`${e.path} changed since the freeze (${e.sha256.slice(0, 12)} → ${now.slice(0, 12)}); a frozen file takes no change without an exemption entry naming the commit and the reason`);
  }
  for (const f of mjsFiles(root)) {   // 2
    const rel = path.relative(root, f).split(path.sep).join("/");
    for (const t of importsOf(f, root)) { const e = listed.get(t); if (e && !e.importers.includes(rel)) failures.push(`${rel} imports ${t}, a deprecated drawing module; only ${e.importers.length ? e.importers.join(", ") : "no file"} may`); }
  }
  const nowReg = registered(root);   // 3
  for (const [screen, keys] of Object.entries(nowReg)) {
    const had = new Set((manifest.screens || {})[screen] || []);
    for (const k of keys) if (DRAW_KEYS.includes(k) && !had.has(k) && !(manifest.migrated || []).includes(screen)) failures.push(`screen ${screen} registers ${k} that the freeze did not record, and ${screen} is not migrated`);
  }
  if (base) {   // 4
    const baseListed = new Map(base.paths.map((e) => [e.path, e]));
    for (const [p, e] of baseListed) {
      if (listed.has(p)) continue; const file = path.join(root, p); if (!existsSync(file)) continue;
      const goldens = e.screen ? path.join(goldensDir, e.screen) : null;
      if (!goldens || !existsSync(goldens) || !readdirSync(goldens).length) failures.push(`${p} left the list but still exists${e.screen ? `, and prototypes/face/golden/${e.screen}/ holds no goldens` : " (a shared module leaves only by deletion)"}`);
    }
    for (const m of manifest.migrated || []) if (!(base.migrated || []).includes(m)) { const g = path.join(goldensDir, m); if (!existsSync(g) || !readdirSync(g).length) failures.push(`screen ${m} joined migrated without goldens in prototypes/face/golden/${m}/`); }
  } else notes.push("rule 4 (leaving the list) not checked: no base ref given");
  return { failures, notes };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--init")) {
    if (existsSync(MANIFEST)) { console.error("freeze-check: deprecated.json exists; the freeze is written once"); process.exit(1); }
    const m = build(); writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + "\n"); console.log(`wrote deprecated.json: ${m.paths.length} paths, ${Object.keys(m.screens).length} screens`); return;
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")), bi = args.indexOf("--base");
  let base = null;
  if (bi >= 0) {
    const ref = args[bi + 1];
    try { base = JSON.parse(execFileSync("git", ["show", `${ref}:prototypes/face/deprecated.json`], { cwd: protoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); }
    catch { console.log(`freeze-check: no deprecated.json at ${ref} (the freeze commit itself): rule 4 skipped`); }
  }
  const { failures, notes } = check(manifest, protoRoot, base);
  for (const n of notes) console.log("freeze-check: " + n);
  console.log(`freeze-check: ${manifest.paths.length} paths, ${(manifest.exemptions || []).length} exemptions, ${(manifest.migrated || []).length} screens migrated`);
  if (failures.length) { for (const f of failures) console.error("FAIL " + f); process.exit(1); }
  console.log("freeze-check ok");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
