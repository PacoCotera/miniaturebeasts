// The art director's loader check for a 48 px terrain drop: run on the drop before its PR
// is opened, and its output quoted in the PR. It refuses what the page's loader would refuse, with the same rules:
//   node prototypes/exploration/tools/atlas-check.mjs [--drop] <meadow.json> [more.json ...]
// --drop is the mode whose output the art director quotes in the drop PR: any sheet that is not 8-bit indexed fails.
// Several manifests merge as the page's ATLAS_URLS do: every manifest's pieces, the last one winning on a duplicate name.
// - Decode: each sheet (or a piece's own `file`) with node:zlib: 8-bit indexed (PLTE, tRNS for alpha) or 8-bit RGBA, non-interlaced.
//   Any other PNG form is refused and named; each sheet's form is printed. A gAMA, iCCP, cHRM or sRGB chunk refuses the sheet.
// - Palette: each manifest's `palette`; absent or "core48" is the page's 48 colours, any other name loads <name>-palette.json
//   from that manifest's own folder (a missing file refuses that manifest) and checks it with paletteTable (the core 48 with their
//   names, colours and tables as on the page, no gap in i, no repeated hex, every table index in range, dark2 the dark of its dark
//   (dark[dark[i]]), at most 256 entries). Every palette found must be the same (name and entries), whatever the order of the
//   manifests. With --drop, a sheet's PLTE may hold only colours in that palette, used or not, its tRNS-0 slot included.
// - Pieces: decodeExact, catalogue and coreSet from src/atlas.mjs, as the page runs them, against the palette's colours.
//   Each piece needs name, status (candidate or signed), kind, offset [x, y] and either sheet, x, y, w, h or file.
// - Prints each piece ok or its refusal, the catalogue keys with their counts, the missing core keys, the blocking kinds with no
//   stand-in, and the statuses. Exit 1 on any refusal or missing core key. Reads files only; writes nothing.
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { decodeExact, catalogue, coreMissing, paletteTable, QUADS, LIP_STATES } from "../src/atlas.mjs";

// The page's palette, read from index.html as the tests read it (the page's own PALETTE, HEX and RGB declarations).
export function pageRGB() {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const pal = page.match(/^const PALETTE = \[$[\s\S]*?^\];$/m)[0], hex = page.match(/^const HEX = .*$/m)[0], rgb = page.match(/^const RGB = .*$/m)[0];
  return vm.runInContext(pal + "\n" + hex + "\n" + rgb + "\n;RGB.map(c => c.slice())", vm.createContext({}));
}
// The page's five lookup tables over the core 48 (DARK, LIGHT, DARK2, FOGLUT, FADE), read the same way: its own declarations, run.
export function pageTables() {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const pal = page.match(/^const PALETTE = \[$[\s\S]*?^\];$/m)[0], darkOf = page.match(/^const DARK_OF = \{[\s\S]*?\};$/m)[0], lightOf = page.match(/^const LIGHT_OF = \{[\s\S]*?\};$/m)[0];
  const a = page.indexOf("const C = {}; PALETTE.forEach("), b = page.indexOf("\n", page.indexOf("     FADE = mixLUT("));
  const core = page.slice(a, b);
  return vm.runInContext([pal, darkOf, lightOf, core, ";({ names: PALETTE.map(p => p[0]), dark: DARK.slice(), light: LIGHT.slice(), dark2: DARK2.slice(), fog: FOGLUT.slice(), fade: FADE.slice() })"].join("\n"), vm.createContext({}));
}
// The palette file a manifest names, read from that manifest's own folder: absent or "core48" is the page's 48 (no file); any other
// name is <name>-palette.json beside the manifest. Returns { name, file, json } or { name, file, unread } when it cannot be read.
export function readPalette(name, dir) {
  if (name == null || name === "core48") return { name: "core48", file: null, json: null };
  const file = path.join(dir, name + "-palette.json");
  try { return { name, file, json: JSON.parse(readFileSync(file, "utf8")) }; } catch (e) { return { name, file, unread: e.message }; }
}
// The table a palette file gives: the page's 48 for core48, else paletteTable against the page's core colours, names and tables.
export function loadPalette(p) {
  const RGB = pageRGB();
  if (!p || p.name === "core48") return { name: "core48", rgb: RGB, n: RGB.length, biome: 0 };
  const t = paletteTable(RGB, pageTables(), p.json);
  return t.errors ? { name: p.name, file: p.file, errors: t.errors } : { name: p.name, file: p.file, rgb: t.rgb, n: t.rgb.length, biome: t.rgb.length - RGB.length, table: t };
}

const FORBIDDEN = ["gAMA", "iCCP", "cHRM", "sRGB"];
const CTYPE = { 0: "greyscale", 2: "RGB", 3: "indexed", 4: "greyscale-alpha", 6: "RGBA" };
// A PNG to RGBA, or a thrown Error naming why the loader refuses it.
export function decodePNG(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) throw new Error("not a PNG");
  let o = 8, ihdr = null, plte = null, trns = null; const idat = [], bad = [];
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString("latin1", o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ctype: data[9], interlace: data[12] };
    else if (type === "PLTE") plte = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (FORBIDDEN.includes(type)) bad.push(type);
    o += 12 + len; if (type === "IEND") break;
  }
  if (!ihdr) throw new Error("no IHDR");
  if (bad.length) throw new Error("carries " + [...new Set(bad)].join(", ") + " (no gAMA, iCCP, cHRM or sRGB)");
  const { w, h, depth, ctype, interlace } = ihdr;
  if (depth !== 8 || (ctype !== 3 && ctype !== 6) || interlace !== 0)
    throw new Error(depth + "-bit " + (CTYPE[ctype] || "colour type " + ctype) + (interlace ? ", interlaced" : "") + " (8-bit indexed or 8-bit RGBA, non-interlaced only)");
  if (ctype === 3 && !plte) throw new Error("indexed with no PLTE");
  const bpp = ctype === 3 ? 1 : 4, stride = w * bpp, raw = inflateSync(Buffer.concat(idat));
  if (raw.length < h * (stride + 1)) throw new Error("image data short: " + raw.length + " of " + h * (stride + 1) + " bytes");
  const out = new Uint8Array(h * stride), paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? out[dst + i - bpp] : 0, b = y ? out[dst - stride + i] : 0, c = y && i >= bpp ? out[dst - stride + i - bpp] : 0;
      out[dst + i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + b : f === 3 ? x + ((a + b) >> 1) : f === 4 ? x + paeth(a, b, c) : NaN) & 255;
      if (f > 4) throw new Error("row " + y + ": filter type " + f);
    }
  }
  if (ctype === 6) return { w, h, rgba: out, form: "8-bit RGBA" };
  const n = plte.length / 3, rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const k = out[i]; if (k >= n) throw new Error("index " + k + " outside PLTE (" + n + " entries) at " + (i % w) + "," + Math.floor(i / w));
    rgba[i * 4] = plte[k * 3]; rgba[i * 4 + 1] = plte[k * 3 + 1]; rgba[i * 4 + 2] = plte[k * 3 + 2]; rgba[i * 4 + 3] = trns && k < trns.length ? trns[k] : 255;
  }
  return { w, h, rgba, form: "8-bit indexed", plte };
}

const isInt = v => Number.isInteger(v) && v >= 0;
const pair = v => Array.isArray(v) && v.length === 2 && v.every(Number.isInteger);
// The fields a piece must carry (§4.1, §15.2).
function fieldErrors(p, sheets) {
  const e = [];
  if (typeof p.name !== "string" || !p.name) e.push("missing field name");
  if (p.status !== "candidate" && p.status !== "signed") e.push(p.status == null ? "missing field status" : "status " + JSON.stringify(p.status) + " (candidate or signed)");
  if (typeof p.kind !== "string" || !p.kind) e.push("missing field kind");
  if (p.offset == null) e.push("missing field offset"); else if (!pair(p.offset)) e.push("offset " + JSON.stringify(p.offset) + " (two integers)");
  if (p.cells != null && !pair(p.cells)) e.push("cells " + JSON.stringify(p.cells) + " (two integers)");
  if (p.file != null) { if (typeof p.file !== "string") e.push("file is not a path"); }
  else {
    if (p.sheet == null) e.push("missing field sheet (or file)"); else if (!sheets || !(p.sheet in sheets)) e.push("sheet " + JSON.stringify(p.sheet) + " not in the manifest's sheets");
    for (const k of ["x", "y", "w", "h"]) if (p[k] == null) e.push("missing field " + k); else if (!isInt(p[k]) || ((k === "w" || k === "h") && !p[k])) e.push(k + " " + JSON.stringify(p[k]) + " (a whole number" + (k === "w" || k === "h" ? " above 0)" : ")"));
  }
  return e;
}

// The pixel refusals of one piece: alpha not 0 or 255, then off-palette pixels, each with its count and first position.
function pixelErrors(rgba, w, h, of) {
  let alpha = 0, alphaAt = null, off = 0, offAt = null;
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3]; if (a === 0) continue;
    const at = (i % w) + "," + Math.floor(i / w);
    if (a !== 255) { if (!alpha++) alphaAt = at + " (alpha " + a + ")"; continue; }
    const v = rgba[i * 4] << 16 | rgba[i * 4 + 1] << 8 | rgba[i * 4 + 2];
    if (!of.has(v)) { if (!off++) offAt = at + " (#" + v.toString(16).padStart(6, "0") + ")"; }
  }
  const e = [];
  if (alpha) e.push(alpha + " px with alpha not 0 or 255, first at " + alphaAt);
  if (off) e.push(off + " off-palette px, first at " + offAt);
  return e;
}

// Flatten the catalogue to its dotted keys and counts.
function keyCounts(o, pre = "", out = []) {
  if (Array.isArray(o) && (!o.length || !Array.isArray(o[0]))) out.push([pre, o.length]);
  else if (Array.isArray(o)) o.forEach((v, i) => keyCounts(v, pre + "[" + i + "]", out));
  else for (const k of Object.keys(o)) keyCounts(o[k], pre ? pre + "." + k : k, out);
  return out;
}

// The blocking kinds (§4.4, settled at M1) that are incomplete, so that the page would need the rock stand-in for some tile, while
// the stand-in (face.w1 and material.rock) is not there: lip with any of its 4 × 7 quarter lists empty; face with face.w1 empty
// (every other face list falls back to it); side with side.e.mid or side.w.mid empty; rock with no boulder of 48 × 48 or less.
export function incompleteKinds(cat) {
  const out = [];
  if (QUADS.some(q => LIP_STATES.some(s => !cat.lip[q][s].length))) out.push("LIP");
  if (!cat.face.w1.length) out.push("FACE");
  if (!cat.side.e.mid.length || !cat.side.w.mid.length) out.push("SIDE");
  if (!cat.prop.boulder.some(p => p.w <= 48 && p.h <= 48)) out.push("ROCK");
  return out;
}
const noStandIn = cat => (cat.face.w1.length && cat.material.rock.length ? [] : incompleteKinds(cat));

export function check(files, log = console.log, { drop = false } = {}) {
  const merged = new Map(), images = new Map(), mans = []; let refused = 0;
  for (const f of files) {
    try { mans.push({ f, dir: path.dirname(f), man: JSON.parse(readFileSync(f, "utf8")) }); } catch (e) { log("REFUSED manifest " + f + ": " + e.message); refused++; }
  }
  // the palette: each manifest's own, read beside it (a manifest whose palette file cannot be read is refused); every palette found
  // must be the same (name and parsed entries), so the order of the manifests never matters. Pieces decode against it (the page's 48
  // when there is none to use).
  for (const m of mans) {
    m.pal = readPalette(m.man.palette, m.dir);
    if (m.pal.unread) { log("REFUSED manifest " + m.f + ": its palette " + m.pal.name + " (" + path.relative(process.cwd(), m.pal.file) + ") cannot be read: " + m.pal.unread); refused++; m.skip = true; }
  }
  const used = mans.filter(m => !m.skip), sig = m => m.pal.name + "|" + JSON.stringify(m.pal.json && m.pal.json.entries), kinds = [...new Set(used.map(sig))];
  let pal = loadPalette(kinds.length === 1 ? used[0].pal : null);
  if (kinds.length > 1) { log("REFUSED palette: the manifests' palettes differ (" + used.map(m => m.pal.name + (m.pal.file ? " in " + path.relative(process.cwd(), path.dirname(m.pal.file)) : "")).join(", ") + ")"); refused++; }
  else if (pal.errors) { log("REFUSED palette " + pal.name + " (" + path.basename(pal.file) + "): " + pal.errors.join("; ")); refused++; pal = loadPalette(null); }
  else log("palette " + pal.name + (pal.file ? " (" + path.basename(pal.file) + ")" : "") + ": " + pal.n + " entries, " + pal.biome + " biome entries" + (pal.file ? ", the core 48 and every table ok" : ", the page's 48"));
  const RGB = pal.rgb, of = new Set(RGB.map(c => c[0] << 16 | c[1] << 8 | c[2]));
  const image = file => {
    if (!images.has(file)) {
      let img; try { img = decodePNG(readFileSync(file)); } catch (e) { img = { err: e.message }; }
      if (drop && !img.err && img.form !== "8-bit indexed") img = { err: img.form + " (--drop takes 8-bit indexed only)", form: img.form };
      if (drop && !img.err && img.plte) {   // every PLTE entry, used or not, exactly in the table
        const off = []; for (let k = 0; k < img.plte.length / 3; k++) { const v = img.plte[k * 3] << 16 | img.plte[k * 3 + 1] << 8 | img.plte[k * 3 + 2]; if (!of.has(v)) off.push(k + " #" + v.toString(16).padStart(6, "0")); }
        if (off.length) img = { err: off.length + " PLTE entr" + (off.length === 1 ? "y" : "ies") + " not in the palette (" + off.slice(0, 4).join(", ") + (off.length > 4 ? ", …" : "") + ")", form: img.form };
      }
      images.set(file, img);
    }
    return images.get(file); };
  for (const { f, dir, man } of used) {
    log("manifest " + f + ": " + (man.pieces || []).length + " pieces");
    for (const p of man.pieces || []) {
      if (typeof p.name === "string" && merged.has(p.name)) log("  " + p.name + ": replaced by the later entry");
      merged.set(typeof p.name === "string" && p.name ? p.name : "(unnamed #" + merged.size + ")", { p, dir, sheets: man.sheets });
    }
  }
  const accepted = [], status = { candidate: 0, signed: 0 };
  log("pieces:");
  for (const [name, { p, dir, sheets }] of merged) {
    if (p.status === "candidate" || p.status === "signed") status[p.status]++;
    const err = fieldErrors(p, sheets);
    let w = 0, h = 0, rgba = null;
    const placed = p.file != null ? typeof p.file === "string" : sheets && p.sheet in sheets && ["x", "y", "w", "h"].every(k => isInt(p[k])) && p.w && p.h;
    if (placed) {   // the pixels are checked even when another field is missing, so one run names every refusal
      const file = path.join(dir, p.file != null ? p.file : sheets[p.sheet]), img = image(file);
      if (img.err) err.push((p.file != null ? "file " : "sheet ") + path.basename(file) + ": " + img.err);
      else if (p.file != null) { w = img.w; h = img.h; rgba = img.rgba; }
      else if (p.x + p.w > img.w || p.y + p.h > img.h) err.push("rect " + [p.x, p.y, p.w, p.h].join(",") + " outside its sheet (" + img.w + "×" + img.h + ")");
      else { w = p.w; h = p.h; rgba = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) rgba.set(img.rgba.subarray(((p.y + y) * img.w + p.x) * 4, ((p.y + y) * img.w + p.x + w) * 4), y * w * 4); }
    }
    if (rgba) {
      const d = decodeExact(rgba, w, h, RGB);
      if (d.bad) err.push(...pixelErrors(rgba, w, h, of));
      else if (!err.length) accepted.push(Object.assign({}, p, { w, h, px: d.px }));
    }
    if (err.length) { refused++; log("  REFUSED " + name + ": " + err.join("; ")); } else log("  ok " + name + " " + w + "×" + h);
  }
  log("sheets" + (drop ? " (--drop: 8-bit indexed only)" : "") + ":");
  for (const [file, img] of images) log("  " + (img.err ? "REFUSED " : "") + path.relative(process.cwd(), file) + ": " + (img.err ? img.err : img.form + " " + img.w + "×" + img.h));
  const cat = catalogue(accepted), missing = coreMissing(cat), blocked = noStandIn(cat);
  log("catalogue (" + accepted.length + " accepted of " + merged.size + "):");
  const groups = new Map(); for (const [k, n] of keyCounts(cat)) { const g = k.split(/[.[]/)[0]; groups.set(g, (groups.get(g) || []).concat(k + " " + n)); }
  for (const [, ks] of groups) log("  " + ks.join(", "));
  log("missing core keys: " + (missing.length ? missing.join(", ") : "none"));
  log("blocking kinds with no stand-in: " + (blocked.length ? blocked.join(", ") : "none") + " (stand-in: face.w1 " + cat.face.w1.length + ", material.rock " + cat.material.rock.length + ")");
  log("statuses: " + status.candidate + " candidate, " + status.signed + " signed");
  log(refused || missing.length ? "FAIL: " + refused + " refused, " + missing.length + " core keys missing" : "PASS");
  return { refused, missing, blocked, status, cat, palette: pal };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), drop = args.includes("--drop"), files = args.filter(a => a !== "--drop");
  if (!files.length) { console.error("usage: node prototypes/exploration/tools/atlas-check.mjs [--drop] <meadow.json> [more.json ...]"); process.exit(2); }
  const r = check(files, console.log, { drop });
  process.exit(r.refused || r.missing.length ? 1 : 0);
}
