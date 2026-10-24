#!/usr/bin/env node
// The import guard (lvgl-switch.md §5.1): the JavaScript drawing layer is gone and stays gone, and the page speaks words to the face, never nodes. No exemptions. It fails when
//   1. a path in removed.json exists again;
//   2. anything imports a removed path (a static or dynamic import, a script tag; relative, or absolute under /sandbox/), in prototypes, .github and website;
//   3. `canvas`, `getContext`, `putImageData` or another canvas call appears in code under station/src or ui/ (tests and tools too), except the face's own display() and present() (the lines between
//      the guard:canvas markers in station/src/face-lvgl.mjs) and the named decoders of the placed masters and the pod sprites (station/src/masters.mjs, podsprites.mjs) until png.mjs decodes them, and the specimen's pure-JavaScript painter (station/src/paint2d.mjs, specimen.mjs), which draws a picture on a Float32Array and no canvas;
//   4. JavaScript outside face/tests names an export of the node path (the test build's `_face_scene_begin`, `_face_node`, `_face_text` and the rest);
//   5. registerScreen is given a draw, nodes or faceNodes (a literal here; the function itself throws on any object that has one, so a variable cannot get past);
//   6. an lv_*_create call appears in the face's C outside face/src/prim/ (the platform's lv_display_create and lv_indev_create excepted);
//   7a. a screen (face/src/screens/*.c) calls prim_node: a screen draws through the v_* helpers and the kit, never a node of its own;
//   7b. a screen defines a static spec accessor: a static function that takes a path (a char pointer) and whose body is one call of spec_int, spec_str, spec_len, spec_bool, v_si, v_sk, v_srect,
//       v_scol or v_spec_rect on that path (a computation that reads the spec and does more is not an accessor);
//   the ratchet: a screen makes more direct v_rect, v_text, v_sprite, v_sprite_window and v_sprite_hidden calls than face/kit-ratchet.json allows it (a screen it does not name: 0), or the file
//       has no "screenSpecific" list, or that list names a screen file that does not exist;
//   8. a kit_* function defined under face/src/vocab/ has no header comment before it beginning "/* kit_<name> (" that holds Props, Region, Node id (or Node ids) and Returns.
//   The C of rules 6 to 8 is read through blank(src, { js: false }): a call in a comment is not counted; a call is matched as NAME, any spaces, then "(".
//   node prototypes/face/tools/guard.mjs        (from anywhere; --root <dir> checks another tree)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { blank } from "./blank.mjs";

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
// the code of a JavaScript file with its comments dropped (line and block), strings left as they are; one pass, so a comment marker in a string, a regex or a comment is not read as a comment (tools/blank.mjs)
const code = (s) => blank(s);
const CANVAS = /\b(canvas|getContext|putImageData|createImageData|getImageData|OffscreenCanvas|drawImage)\b/i;
const CANVAS_OK = new Set(["station/src/masters.mjs", "station/src/podsprites.mjs", "station/src/paint2d.mjs", "station/src/specimen.mjs"]);   // the named decoders, until png.mjs decodes the masters and the sprite sheets; and the specimen's painter and its port (T-20261019-258, the architect's ruling): a pure-JavaScript Canvas 2D subset on a Float32Array and the generator that draws on it, which make a picture in the logic process and never touch the DOM, a browser canvas or the screen
const FACE_LVGL = "station/src/face-lvgl.mjs";   // the face's own display() and present(): the lines between its guard:canvas markers, and no other
const marked = (raw) => { const ok = new Set(); let on = false; raw.split("\n").forEach((l, i) => { if (/guard:canvas end/.test(l)) on = false; if (on) ok.add(i); if (/guard:canvas begin/.test(l)) on = true; }); return ok; };
const NODE_EXPORTS = /\b_?face_(scene_begin|scene_end|node|node_tag|text|text_size|ops|ops_size|measure|asset|background|region|selftest_scene)\b/;
const LV_CREATE = /\blv_[a-z0-9_]+_create\s*\(/g, LV_OK = new Set(["lv_display_create", "lv_indev_create"]);

const DIRECT = /\b(?:v_rect|v_text|v_sprite|v_sprite_window|v_sprite_hidden)\s*\(/g, PRIM_NODE = /\bprim_node\s*\(/g;
const ACCESSOR_CALLS = new Set(["spec_int", "spec_str", "spec_len", "spec_bool", "v_si", "v_sk", "v_srect", "v_scol", "v_spec_rect"]);
const HEADER = [["Props", /\bProps\b/], ["Region", /\bRegion\b/], ["Node id", /\bNode ids?\b/], ["Returns", /\bReturns\b/]];
const lineAt = (s, i) => s.slice(0, i).split("\n").length;
// the index of the bracket that closes the one at `i` (s[i] is "(" or "{"), or -1
function closing(s, i) { const o = s[i], c = o === "(" ? ")" : "}"; let d = 0; for (let j = i; j < s.length; j++) { if (s[j] === o) d++; else if (s[j] === c && --d === 0) return j; } return -1; }
// rule 7b on blanked C: the static functions that take a char pointer and whose body is one call of a spec reader with that pointer among its arguments
function accessors(code) {
  const out = [];
  for (const m of code.matchAll(/\bstatic\s+[\w\s*]*?\b(\w+)\s*\(([^()]*)\)\s*\{/g)) {
    const open = m.index + m[0].length - 1, end = closing(code, open); if (end < 0) continue;
    const ptrs = m[2].split(",").map((p) => p.match(/\bchar\s*\*\s*(\w+)\s*$/)?.[1]).filter(Boolean); if (!ptrs.length) continue;
    const body = code.slice(open + 1, end).trim(), call = body.match(/^(?:return\s+)?(\w+)\s*\(/); if (!call || !ACCESSOR_CALLS.has(call[1])) continue;
    const po = body.indexOf("(", call[0].length - 1), pc = closing(body, po); if (pc < 0 || !/^\s*;$/.test(body.slice(pc + 1))) continue;
    const args = body.slice(po + 1, pc);
    if (ptrs.some((p) => new RegExp(`\\b${p}\\b`).test(args))) out.push({ name: m[1], call: call[1], line: lineAt(code, m.index) });
  }
  return out;
}
// each screen file's direct drawing calls, prim_node calls (their lines) and static spec accessors, read through blank (exported for the ratchet's count)
export function kitCounts(screensDir) {
  const out = {};
  for (const f of readdirSync(screensDir).filter((f) => f.endsWith(".c")).sort()) {
    const code = blank(readFileSync(path.join(screensDir, f), "utf8"), { js: false });
    out[f] = { direct: [...code.matchAll(DIRECT)].length, primNode: [...code.matchAll(PRIM_NODE)].map((m) => lineAt(code, m.index)), accessors: accessors(code) };
  }
  return out;
}
// the kit_* functions a vocab file defines (a definition, not a declaration or a call): name and line (blank keeps every newline, so the line is the source's)
function kitDefinitions(raw) {
  const code = blank(raw, { js: false }), out = [];
  for (const m of code.matchAll(/^[A-Za-z][\w\s*]*?\b(kit_\w+)\s*\(/gm)) { const o = m.index + m[0].length - 1, c = closing(code, o); if (c >= 0 && /^\s*\{/.test(code.slice(c + 1))) out.push({ name: m[1], line: lineAt(code, m.index) }); }
  return out;
}

export function check(root) {
  const proto = path.join(root, "prototypes"), fails = [], rel = (p) => path.relative(proto, p).split(path.sep).join("/");
  const removed = JSON.parse(readFileSync(path.join(proto, "face/removed.json"), "utf8")).paths, gone = new Set(removed);
  // 1. a removed path exists again
  for (const p of removed) if (existsSync(path.join(proto, p))) fails.push(`${p} exists again (removed.json)`);
  const web = path.join(root, "website"), js = [...walk(proto, [".mjs", ".js"]), ...walk(path.join(root, ".github"), [".mjs"]), ...walk(web, [".mjs", ".js"])], html = [...walk(proto, [".html"]), ...walk(web, [".html"])];
  // 2. anything imports a removed path
  const imports = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bsrc\s*=\s*)["']([^"']+)["']/g;
  for (const f of [...js, ...html]) {
    const s = readFileSync(f, "utf8");
    for (const m of (f.endsWith(".html") ? s : code(s)).matchAll(imports)) {
      const r = m[1].startsWith(".") ? rel(path.resolve(path.dirname(f), m[1])) : m[1].startsWith("/sandbox/") ? m[1].slice("/sandbox/".length).replace(/[?#].*$/, "") : null;   // an absolute /sandbox/<p> is prototypes/<p>
      if (r === null) continue;
      if (gone.has(r)) fails.push(`${rel(f)} imports ${r}, which is removed`);
    }
  }
  // 3. canvas calls in the page's code (tests and tools under station/src and ui/ included)
  for (const f of js) {
    const r = rel(f); if (!(r.startsWith("station/src/") || r.startsWith("ui/")) || CANVAS_OK.has(r)) continue;
    const raw = readFileSync(f, "utf8"), allowed = r === FACE_LVGL ? marked(raw) : new Set();
    code(raw).split("\n").forEach((l, i) => { if (CANVAS.test(l) && !allowed.has(i)) fails.push(`${r}:${i + 1} uses the canvas: ${l.trim().slice(0, 80)}`); });
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
    blank(readFileSync(f, "utf8"), { js: false }).split("\n").forEach((l, i) => { for (const m of l.matchAll(LV_CREATE)) if (!LV_OK.has(m[0].replace(/\s*\($/, ""))) fails.push(`${r}:${i + 1} calls ${m[0].replace(/\s*\($/, "")} outside face/src/prim/`); });
  }
  // 7a, 7b and the ratchet: a screen is a binding table
  const screensDir = path.join(proto, "face/src/screens");
  if (existsSync(screensDir)) {
    const rf = path.join(proto, "face/kit-ratchet.json"), ratchet = existsSync(rf) ? JSON.parse(readFileSync(rf, "utf8")) : null;
    if (!ratchet) fails.push("face/kit-ratchet.json is missing (the ratchet)");
    const counts = kitCounts(screensDir);
    for (const [f, c] of Object.entries(counts)) {
      const r = `face/src/screens/${f}`;
      for (const n of c.primNode) fails.push(`${r}:${n} calls prim_node (rule 7a: a screen draws through v_* and the kit)`);
      for (const a of c.accessors) fails.push(`${r}:${a.line} defines the static spec accessor ${a.name} (rule 7b: one call of ${a.call} on its path; use the v_* reader)`);
      const allowed = ratchet?.counts?.[f.replace(/\.c$/, "")] ?? 0;
      if (ratchet && c.direct > allowed) fails.push(`${r} makes ${c.direct} direct v_rect/v_text/v_sprite/v_sprite_window/v_sprite_hidden calls; the ratchet allows ${allowed} (face/kit-ratchet.json)`);
    }
    if (ratchet) {
      if (!Array.isArray(ratchet.screenSpecific)) fails.push('face/kit-ratchet.json has no "screenSpecific" list');
      else for (const s of ratchet.screenSpecific) if (!s || typeof s.file !== "string" || !existsSync(path.join(screensDir, s.file))) fails.push(`face/kit-ratchet.json screenSpecific names ${s?.file}, which is not a file in face/src/screens/`);
    }
  }
  // 8. every kit_* component carries its contract header
  for (const f of walk(path.join(proto, "face/src/vocab"), [".c"])) {
    const raw = readFileSync(f, "utf8"), r = rel(f);
    for (const k of kitDefinitions(raw)) {
      const head = [...raw.split("\n").slice(0, k.line - 1).join("\n").matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]).find((c) => c.startsWith(`/* ${k.name} (`));
      const lacks = head ? HEADER.filter(([, re]) => !re.test(head)).map(([w]) => w) : null;
      if (!head) fails.push(`${r}:${k.line} defines ${k.name} with no header comment beginning "/* ${k.name} (" (rule 8)`);
      else if (lacks.length) fails.push(`${r}:${k.line} ${k.name}'s header lacks ${lacks.join(", ")} (rule 8)`);
    }
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
