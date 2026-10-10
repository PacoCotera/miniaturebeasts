#!/usr/bin/env node
// The import guard (lvgl-switch.md §5.1): the JavaScript drawing layer is gone and stays gone, and the page speaks words to the face, never nodes. No exemptions. It fails when
//   1. a path in removed.json exists again;
//   2. anything imports a removed path (a static or dynamic import, a script tag);
//   3. `canvas`, `getContext`, `putImageData` or another canvas call appears in code under station/src or ui/, except the face's own present and display (station/src/face-lvgl.mjs) and the named
//      decoders of the placed masters and the pod sprites (station/src/masters.mjs, podsprites.mjs) until png.mjs decodes them;
//   4. JavaScript outside face/tests names an export of the node path (the test build's `_face_scene_begin`, `_face_node`, `_face_text` and the rest);
//   5. registerScreen is given a draw, nodes or faceNodes;
//   6. an lv_*_create call appears in the face's C outside face/src/prim/ (the platform's lv_display_create and lv_indev_create excepted).
//   node prototypes/face/tools/guard.mjs        (from anywhere; --root <dir> checks another tree)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIP = new Set(["node_modules", ".git", "dist", "golden", "img"]);
function walk(dir, ext, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = path.join(dir, f), st = statSync(p);
    if (st.isDirectory()) walk(p, ext, out); else if (ext.some((e) => f.endsWith(e))) out.push(p);
  }
  return out;
}
// the code of a JavaScript file with its comments blanked (line and block), strings left as they are
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const CANVAS = /\b(canvas|getContext|putImageData|createImageData|getImageData|OffscreenCanvas|drawImage)\b/i;
const CANVAS_OK = new Set(["station/src/face-lvgl.mjs", "station/src/masters.mjs", "station/src/podsprites.mjs"]);
const NODE_EXPORTS = /\b_?face_(scene_begin|scene_end|node|node_tag|text|text_size|ops|ops_size|measure|asset|background|region|selftest_scene)\b/;
const LV_CREATE = /\blv_[a-z0-9_]+_create\s*\(/g, LV_OK = new Set(["lv_display_create", "lv_indev_create"]);

export function check(root) {
  const proto = path.join(root, "prototypes"), fails = [], rel = (p) => path.relative(proto, p).split(path.sep).join("/");
  const removed = JSON.parse(readFileSync(path.join(proto, "face/removed.json"), "utf8")).paths, gone = new Set(removed);
  // 1. a removed path exists again
  for (const p of removed) if (existsSync(path.join(proto, p))) fails.push(`${p} exists again (removed.json)`);
  const js = [...walk(proto, [".mjs", ".js"]), ...walk(path.join(root, ".github"), [".mjs"])], html = walk(proto, [".html"]);
  // 2. anything imports a removed path
  const imports = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bsrc\s*=\s*)["']([^"']+)["']/g;
  for (const f of [...js, ...html]) {
    const s = readFileSync(f, "utf8");
    for (const m of (f.endsWith(".html") ? s : code(s)).matchAll(imports)) {
      if (!m[1].startsWith(".")) continue;
      const r = rel(path.resolve(path.dirname(f), m[1]));
      if (gone.has(r)) fails.push(`${rel(f)} imports ${r}, which is removed`);
    }
  }
  // 3. canvas calls in the page's code
  for (const f of js) {
    const r = rel(f); if (!(r.startsWith("station/src/") || r.startsWith("ui/")) || r.includes("/tests/") || r.startsWith("ui/tools/") || CANVAS_OK.has(r)) continue;
    code(readFileSync(f, "utf8")).split("\n").forEach((l, i) => { if (CANVAS.test(l)) fails.push(`${r}:${i + 1} uses the canvas: ${l.trim().slice(0, 80)}`); });
  }
  // 4. the node path's exports named outside face/tests
  for (const f of js) {
    const r = rel(f); if (r.startsWith("face/tests/")) continue;
    code(readFileSync(f, "utf8")).split("\n").forEach((l, i) => { if (NODE_EXPORTS.test(l)) fails.push(`${r}:${i + 1} names an export of the node path (the test build's, face/tests only): ${l.trim().slice(0, 80)}`); });
  }
  // 5. registerScreen with a drawing key
  for (const f of js) {
    const r = rel(f); if (!r.startsWith("station/")) continue;
    for (const m of code(readFileSync(f, "utf8")).matchAll(/\bregisterScreen\s*\(\s*[^,)]+,\s*\{([^}]*)\}/g)) if (/\b(draw|nodes|faceNodes)\b/.test(m[1])) fails.push(`${r} registers a screen with ${m[1].match(/\b(draw|nodes|faceNodes)\b/)[1]}`);
  }
  // 6. LVGL objects are made in prim/ only
  for (const f of walk(path.join(proto, "face/src"), [".c", ".h"])) {
    const r = rel(f); if (r.startsWith("face/src/prim/") || r.startsWith("face/src/vendor/") || r.startsWith("face/src/fonts/")) continue;
    readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).split("\n").forEach((l, i) => { for (const m of l.replace(/\/\/.*/, "").matchAll(LV_CREATE)) if (!LV_OK.has(m[0].replace(/\s*\($/, ""))) fails.push(`${r}:${i + 1} calls ${m[0].replace(/\s*\($/, "")} outside face/src/prim/`); });
  }
  return { fails, removed: removed.length, files: js.length + html.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--root"), root = i > 0 ? path.resolve(process.argv[i + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const r = check(root);
  for (const f of r.fails) console.error("FAIL " + f);
  console.log(`guard: ${r.removed} removed paths, ${r.files} files read, ${r.fails.length} failures`);
  console.log(r.fails.length ? "guard failed" : "guard ok"); process.exit(r.fails.length ? 1 : 0);
}
