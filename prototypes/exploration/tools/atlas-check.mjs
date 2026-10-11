// The art director's loader check for a 48 px terrain drop (plans/companion/c2a-48px-spec.md §5.1): run on the drop before its PR
// is opened, and its output quoted in the PR. It refuses what the page's loader would refuse, with the same rules:
//   node prototypes/exploration/tools/atlas-check.mjs <meadow.json> [more.json ...]
// Several manifests merge as the page's ATLAS_URLS do: every manifest's pieces, the last one winning on a duplicate name.
// - Decode: each sheet (or a piece's own `file`) with node:zlib: 8-bit indexed (PLTE, tRNS for alpha) or 8-bit RGBA, non-interlaced.
//   Any other PNG form is refused and named. A gAMA, iCCP, cHRM or sRGB chunk refuses the sheet.
// - Pieces: decodeExact, catalogue and coreSet from src/atlas.mjs, as the page runs them, against the page's 48-colour RGB table.
//   Each piece needs name, status (candidate or signed), kind, offset [x, y] and either sheet, x, y, w, h or file.
// - Prints each piece ok or its refusal, the catalogue keys with their counts, the missing core keys, the blocking kinds with no
//   stand-in, and the statuses. Exit 1 on any refusal or missing core key. Reads files only; writes nothing.
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { decodeExact, catalogue, coreMissing } from "../src/atlas.mjs";

// The page's palette, read from index.html as the tests read it (the page's own PALETTE, HEX and RGB declarations).
export function pageRGB() {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const pal = page.match(/^const PALETTE = \[$[\s\S]*?^\];$/m)[0], hex = page.match(/^const HEX = .*$/m)[0], rgb = page.match(/^const RGB = .*$/m)[0];
  return vm.runInContext(pal + "\n" + hex + "\n" + rgb + "\n;RGB.map(c => c.slice())", vm.createContext({}));
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
  return { w, h, rgba, form: "8-bit indexed" };
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

// The blocking kinds (§4.4) whose own pieces are all absent, when the rock stand-in (face.w1 and material.rock) is absent too.
function noStandIn(cat) {
  const standIn = cat.face.w1.length > 0 && cat.material.rock.length > 0; if (standIn) return [];
  const lipAny = Object.keys(cat.lip).some(q => q !== "shadowN" && Object.values(cat.lip[q]).some(l => l.length));
  const out = [];
  if (!cat.face.w3.length && !cat.face.w2.length && !cat.face.w1.length) out.push("FACE");
  if (!cat.side.e.mid.length || !cat.side.w.mid.length) out.push("SIDE");
  if (!lipAny) out.push("LIP");
  if (!cat.prop.boulder.some(p => p.w <= 48 && p.h <= 48)) out.push("ROCK");
  if (!cat.face.w1.length || !cat.material.rock.length) out.push("CLIFF (generator 1)");
  return out;
}

export function check(files, log = console.log) {
  const RGB = pageRGB(), of = new Set(RGB.map(c => c[0] << 16 | c[1] << 8 | c[2]));
  const merged = new Map(), images = new Map(); let refused = 0;
  const image = file => { if (!images.has(file)) { try { images.set(file, decodePNG(readFileSync(file))); } catch (e) { images.set(file, { err: e.message }); } } return images.get(file); };
  for (const f of files) {
    const dir = path.dirname(f); let man;
    try { man = JSON.parse(readFileSync(f, "utf8")); } catch (e) { log("REFUSED manifest " + f + ": " + e.message); refused++; continue; }
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
  const cat = catalogue(accepted), missing = coreMissing(cat), blocked = noStandIn(cat);
  log("catalogue (" + accepted.length + " accepted of " + merged.size + "):");
  const groups = new Map(); for (const [k, n] of keyCounts(cat)) { const g = k.split(/[.[]/)[0]; groups.set(g, (groups.get(g) || []).concat(k + " " + n)); }
  for (const [, ks] of groups) log("  " + ks.join(", "));
  log("missing core keys: " + (missing.length ? missing.join(", ") : "none"));
  log("blocking kinds with no stand-in: " + (blocked.length ? blocked.join(", ") : "none") + " (stand-in: face.w1 " + cat.face.w1.length + ", material.rock " + cat.material.rock.length + ")");
  log("statuses: " + status.candidate + " candidate, " + status.signed + " signed");
  log(refused || missing.length ? "FAIL: " + refused + " refused, " + missing.length + " core keys missing" : "PASS");
  return { refused, missing, blocked, status, cat };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("usage: node prototypes/exploration/tools/atlas-check.mjs <meadow.json> [more.json ...]"); process.exit(2); }
  const r = check(files);
  process.exit(r.refused || r.missing.length ? 1 : 0);
}
