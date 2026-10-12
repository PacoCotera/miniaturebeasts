// Captures of the Companion's 48 px places at 1x, as whole 450×600 screens, from the real page and the real meadow set; and the
// placement check against the art director's proof place.
//   node prototypes/exploration/tools/capture-48.mjs [--out DIR] [--art DIR] [--only a,b] [--p95]      the whole-place set
//   node prototypes/exploration/tools/capture-48.mjs --proof --proof-png FILE --proof-grid FILE [--art DIR]
//        composes the proof place's layout through the page's own placement rules, with the proof's own lawn picks, and compares every
//        lawn tile with the proof image: the shadow tiles are the point, and the count of differing pixels must be 0 (exit non-zero if not).
// --art DIR      the folder holding meadow.json and its sheets (default: art/companion-48/terrain/meadow in this repository)
// --out DIR      where the PNGs go (default ./caps-48); a report.json lists each capture and its off-palette count
// --p95          also prints the p95 of render() over 600 frames in each scene, at 48 and with the 32 px fallback
// PW_DIR names a folder holding node_modules/playwright when it is not installed globally.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, pageRGB, pageTables } from "./atlas-check.mjs";
import { decodeExact, paletteTable, catalogue, placeLayers } from "../src/atlas.mjs";
import { PW, PH, T, TERR } from "../src/world.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : process.argv[i + 1]; };
const flag = n => process.argv.includes("--" + n);
const ART = path.resolve(arg("art", path.join(root, "art/companion-48/terrain/meadow")));

// ---------- the placement check ----------
function decodeRGB(buf) {   // 8-bit RGB, non-interlaced PNG (the proof image)
  let p = 8, ihdr, idat = []; while (p < buf.length) { const n = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n);
    if (type === "IHDR") ihdr = { w: d.readUInt32BE(0), h: d.readUInt32BE(4), depth: d[8], ctype: d[9] }; else if (type === "IDAT") idat.push(d); p += 12 + n; }
  if (ihdr.depth !== 8 || ihdr.ctype !== 2) throw new Error("the proof image must be 8-bit RGB");
  const { w, h } = ihdr, raw = inflateSync(Buffer.concat(idat)), bpp = 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : (() => { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; })();
      out[y * stride + x] = (row[x] + pr) & 255; } }
  return { w, h, rgb: out };
}
function loadArt(dir) {   // the real drop, decoded exactly as the page does: [{ ...fields, w, h, px }], the table, the manifest
  const man = JSON.parse(readFileSync(path.join(dir, "meadow.json"), "utf8")), pal = JSON.parse(readFileSync(path.join(dir, (man.palette || "meadow") + "-palette.json"), "utf8"));
  const table = paletteTable(pageRGB(), pageTables(), pal); if (table.errors) throw new Error("palette: " + table.errors.join("; "));
  const sheets = {}, list = [];
  for (const p of man.pieces) { const f = p.file != null ? p.file : man.sheets[p.sheet]; const img = sheets[f] || (sheets[f] = decodePNG(readFileSync(path.join(dir, f))));
    const x0 = p.file != null ? 0 : p.x, y0 = p.file != null ? 0 : p.y, w = p.file != null ? img.w : p.w, h = p.file != null ? img.h : p.h, rgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) rgba.set(img.rgba.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x0 + w) * 4), y * w * 4);
    const d = decodeExact(rgba, w, h, table.rgb); if (!d.bad) list.push({ ...p, w, h, px: d.px }); }
  return { man, table, list };
}
function proof(pngFile, gridFile) {
  const { man, table, list } = loadArt(ART), grid = JSON.parse(readFileSync(gridFile, "utf8")), img = decodeRGB(readFileSync(pngFile));
  const cat = catalogue(list, man.levelTone), pieces = new Map(list.map(p => [p.name, p])), L = grid.layout, R = L.length, C = L[0].length;
  const tiles = new Array(PW * PH).fill(T.GRASS), terr = new Uint8Array(PW * PH), tmask = new Uint8Array(PW * PH);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const i = r * PW + c, ch = L[r][c];
    if (ch === "1" || ch === "F") { tiles[i] = T.FACE; terr[i] = ch === "F" ? TERR.FACE : TERR.SIDE; if (ch === "F" && L[r + 1]?.[c] !== "F") tmask[i] |= 1; }
    else if (ch === "w") tiles[i] = T.WATER; else if (ch === "s") tiles[i] = T.SAND; }
  const lay = { key: "proof", cell: 0, tiles, terr, tmask, base: T.GRASS };
  const idx = new Map(cat.lawn.map((p, k) => [p.name, k])), lawnPick = (x, y, def) => { const cell = grid.cells[y + "," + x]; return cell && idx.has(cell.lawn) ? idx.get(cell.lawn) : def; };
  const r = placeLayers(lay, 0, cat, 0, 0, { macros: false, faceTone: true, waterTone: true, shadow: true, reedStagger: true, g1Runs: true, sandShore: false, waterSand: true, darkShadow: true, lawnPick });
  // Tiles the proof draws other things on are left out of the pixel compare: the second row of a two-row face (the proof's layout marks a
  // face run's first row only, and the face piece covers the row below), and, with --proof-script, the proof's decal and prop cells
  // with their neighbours (their pieces are placed by the proof's own hash, which the page does not reproduce).
  const skip = new Set(); let skipped = 0;
  if (arg("proof-script")) { const py = readFileSync(arg("proof-script"), "utf8"), pairs = txt => [...txt.matchAll(/\((\d+), (\d+)\)/g)].map(m => [+m[1], +m[2]]);
    const dec = py.match(/for \(r, c\) in \(([^\n]*?)\):/), prp = [...py.matchAll(/\("meadow\/prop\/[^"]+", (\(\d+, \d+\))\)/g)].map(m => m[1]);
    for (const [r, c] of pairs(dec ? dec[1] : "")) skip.add(r + "," + c);
    for (const [r, c] of pairs(prp.join(" "))) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) skip.add((r + dr) + "," + (c + dc)); }
  const covered = (r, c) => L[r - 1]?.[c] === "F" && L[r - 2]?.[c] !== "F";
  let tilesN = 0, shadowN = 0, bad = 0, badShadow = 0, states = {};
  for (let rr = 0; rr < R; rr++) for (let c = 0; c < C; c++) { if (L[rr][c] !== ".") continue;
    if (covered(rr, c) || skip.has(rr + "," + c)) { skipped++; continue; }
    const t = r.tiles[rr * PW + c], px = new Array(48 * 48).fill(-1), sh = t.layers.some(l => /shadow\/cast/.test(l.id)); tilesN++; if (sh) shadowN++;
    const st = (t.layers.find(l => /shadow\/cast/.test(l.id)) || {}).id; if (st) states[st.slice(-1)] = (states[st.slice(-1)] || 0) + 1;
    const want = grid.cells[rr + "," + c].shadow; if ((want || null) !== (st ? st.replace(/.*cast-/, "") : null)) { bad += 48 * 48; badShadow++; console.log("shadow state differs at " + c + "," + rr + ": proof " + want + ", page " + (st || null)); continue; }
    for (const l of t.layers) { const pc = pieces.get(l.id), lut = l.tone === "light" ? table.lightGrass : l.tone === "dark" ? table.darkGrass : null;
      for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) { let k = pc.px[(l.sy + y) * pc.w + l.sx + x]; if (k < 0) continue; if (lut) k = lut[k]; px[(l.dy + y) * 48 + l.dx + x] = k; } }
    let d = 0; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const k = px[y * 48 + x], o = ((rr * 48 + y) * img.w + c * 48 + x) * 3, q = k < 0 ? [0, 0, 0] : table.rgb[k];
      if (img.rgb[o] !== q[0] || img.rgb[o + 1] !== q[1] || img.rgb[o + 2] !== q[2]) d++; }
    if (d) console.log("tile " + c + "," + rr + " " + (st || "no shadow") + ": " + d + " pixels differ"); bad += d; if (d && sh) badShadow++; }
  console.log("proof: " + tilesN + " lawn tiles compared (" + skipped + " left out: covered by a face's second row, or carrying the proof's decals and props), " + shadowN + " with a cast shadow " + JSON.stringify(states) + "; differing pixels " + bad + (badShadow ? " (" + badShadow + " tiles)" : ""));
  console.log(bad === 0 ? "PASS 0 differing pixels" : "FAIL");
  process.exit(bad === 0 ? 0 : 1);
}
if (flag("proof")) proof(arg("proof-png"), arg("proof-grid"));

// ---------- the whole-place set ----------
// Each scene: the generator, seed and cell (the place), the pawn's tile, the light (sun, storm, fog, veil), a label.
// Places were chosen from the worlds' own layouts: the first of each kind that shows what the view is for.
const SCENES = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "capture-48.scenes.json"), "utf8"));
const only = arg("only") ? new Set(arg("only").split(",")) : null;
const OUT = path.resolve(arg("out", "caps-48")); mkdirSync(OUT, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); let p = u.startsWith("/art/companion-48/terrain/meadow/") ? path.join(ART, u.slice("/art/companion-48/terrain/meadow/".length)) : path.join(root, u);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  let body = readFileSync(p);
  if (p.endsWith("exploration/index.html")) body = Buffer.from(body.toString().replace(/<\/script>\s*<\/body>/, "window.__run = s => eval(s);\n</script>\n</body>"));   // a capture-only door into the module's scope
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(body); });
await new Promise(r => server.listen(0, "127.0.0.1", r)); const port = server.address().port;
const { chromium } = createRequire(import.meta.url)(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const browser = await chromium.launch(), report = [];
for (const sc of SCENES) {
  if (only && !only.has(sc.name)) continue;
  const ctx = await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" }), page = await ctx.newPage();
  page.on("pageerror", e => console.log("pageerror", sc.name, e.message));
  await page.goto("http://127.0.0.1:" + port + "/prototypes/exploration/index.html"); await page.waitForFunction(() => window.__mb && window.__mb.ART48.ready, null, { timeout: 30000 });
  const setup = (s, ts32) => page.evaluate(({ s, ts32 }) => { const run = window.__run;
    return run(`(() => { const s = ${JSON.stringify(s)}; TEST.calm = true;
      if (s.gen === 1) { layoutCache.clear(); RT.reachSet = null; RT.reachKey = null; G = genWorld(s.seed, 1); S = worldFields(s.seed, 1); const life = genLife(s.seed); S.cr = life.cr; S.pods = life.pods; indexCreatures(); }
      else newWorld(s.seed);
      startExpedition('weather', s.cell); const ex = S.exp; ex.fog = null; ex.range = 6; ex.storm = null; FX.lockUntil = 0; ex.pos = s.cell; enterPatch();
      const P = ex.patch, key = P.key, lay = layout(key); P.x = s.x; P.y = s.y; P.dir = s.dir || 'down';
      S.veil[key] = new Array(PH).fill(0); if (s.light !== 'veil') S.veil[key] = new Array(PH).fill(0x0fffffff); else unveilRound(key, s.x, s.y, 4);
      const col = s.cell % MW;
      if (s.light === 'storm') ex.storm = { x: col - 3 - (s.gap == null ? 1.25 : s.gap), dir: 1, w: 3, v: .25, t: 0 };
      if (s.light === 'overcast') ex.storm = { x: col - 1, dir: 1, w: 3, v: .25, t: 0 };
      if (s.light === 'fog') ex.fog = { x: col + .5, y: Math.floor(s.cell / MW) + .5, r: 2.4, dx: 0, dy: 0, at: 0 };
      if (s.level != null) { G.level[lay.cell] = s.level; lay.l48 = null; }
      FX.msg = null; FX.hints = {}; for (const k of Object.keys(S.found || {})) {} RT.key = null; ${ts32 ? "placeTs = () => 32;" : ""} return key; })()`); }, { s, ts32 });
  await setup(sc, false); await page.waitForTimeout(1500);
  const shot = await page.evaluate(() => ({ png: window.__mb.capture(), ts: window.__mb.RT.ts, err: window.__mb.RT.err, off: window.__mb.offPalette(), refused: window.__mb.ART48.refused.length, pieces: window.__mb.ART48.pieces.size }));
  writeFileSync(path.join(OUT, sc.name + ".png"), Buffer.from(shot.png.split(",")[1], "base64"));
  const row = { name: sc.name, ts: shot.ts, errors: shot.err, offPalette: shot.off.bad.length, colours: shot.off.colours, pieces: shot.pieces, refused: shot.refused };
  if (flag("p95")) { for (const ts32 of [false, true]) { if (ts32) { await setup(sc, true); await page.waitForTimeout(300); }
    row[ts32 ? "p95_32_ms" : "p95_48_ms"] = await page.evaluate(() => { const run = window.__run, a = []; for (let i = 0; i < 600; i++) { const t0 = performance.now(); run("render(" + (2000 + i * 16) + ")"); a.push(performance.now() - t0); } a.sort((x, y) => x - y); return +a[Math.floor(a.length * .95)].toFixed(2); }); } }
  report.push(row); console.log(JSON.stringify(row)); await ctx.close();
}
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
await browser.close(); server.close();
