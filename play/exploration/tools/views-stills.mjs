// Stills of one cell as every view draws it, at 1x: the reach view (48 px a cell) with the cell under the pawn, the cell itself (the walking view, the pawn in front of the way out
// on the side asked), the whole place and the peek. The views must show the same land.
//   PW_DIR=... node prototypes/exploration/tools/views-stills.mjs --seed 9 --cell 268 [--biome mixed] [--face up] [--out DIR] [--swap slot=file]... [--both]
//   --swap: the page is served that file for the slot (the file's path from the repo root) instead of the shipped one; nothing is copied into the tree. --both: each still by day and in the storm
//   (the page's only other light on the walk; the night level is in biome-stills.mjs). Each still gets a <still>.json sidecar: sha256 of every art file the page had loaded, swapped slots, zoom, light, time.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { takeFlags, fileList, writeSidecar, bakedPieces } from "./still-art.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const FLAGS = takeFlags(process.argv.slice(2));   // --swap slot=file (repeatable; the slot is the file's path from the repo root, e.g. art/companion-48/props/hollow-tree.png) and --both (day and storm light)
const argv = FLAGS.rest;
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const seed = +arg("seed", 9), cell = +arg("cell", 268), face = arg("face", "up"), out = path.resolve(arg("out", "views-stills"));
mkdirSync(out, { recursive: true });

// what the page loaded: art files (pictures and baked blobs) by slot (path from the repo root) -> { file served, shipped file, swapped }
const ART = /\.(png|mbtiles|mbplace)$/, drawn = new Map(), swapUsed = new Set();
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
  let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  const swap = FLAGS.swaps.get(rel), file = swap || p;   // the swapped file is read where it lies, never copied into the tree
  if (swap) swapUsed.add(rel);
  if (ART.test(rel)) drawn.set(rel, { slot: rel, file, shipped: p, swapped: !!swap });
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url); await page.waitForTimeout(1500);
await page.evaluate(() => { window.__mb.TEST.calm = true; });
for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
// to the map, on the cell asked, its neighbourhood revealed
await page.evaluate(([c, f]) => { const m = window.__mb, ex = m.S.exp; if (ex.patch) m.leavePatch(); ex.pos = c; ex.start = c; ex.lastDir = null; ex.face = f;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = (c % m.MW) + dx, Y = ((c / m.MW) | 0) + dy; if (X >= 0 && Y >= 0 && X < m.MW && Y < m.MH) m.S.revealed[Y * m.MW + X] = 1; } }, [cell, face]);
await page.waitForTimeout(1800);
// The page's own light on a walk or map still is day (0) or the storm (1): it has no clear night outside caves, so --both makes day and storm (the biome stills tool has the night level).
// A still is made once per light; the storm is set over the cell's column the way the page counts it (stormCovers) and taken away after.
const LIGHTS = FLAGS.both ? ["day", "storm"] : ["day"];
const setLight = (light) => page.evaluate(([l, c]) => { const m = window.__mb, ex = m.S.exp; ex.storm = l === "storm" ? { x: (c % m.MW) - 1, dir: 1, w: 3, v: 0, t: 0 } : null; }, [light, cell]);
const save = async (name) => {
  for (const light of LIGHTS) {
    const file = LIGHTS.length > 1 ? name.replace(/\.png$/, `-${light}.png`) : name, zoom = 48;
    if (LIGHTS.length > 1) { await setLight(light); await page.waitForTimeout(300); }
    const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, file), Buffer.from(d.split(",")[1], "base64"));
    const baked = await bakedPieces(page, root, FLAGS.swaps);   // the set pieces the cell's baked place draws (the page loads the baked tiles, not their files)
    writeSidecar(path.join(out, file), { tool: "views-stills", zoom, light, seed, cell, face, files: fileList([...drawn.values(), ...baked.files]), bakedPiecesWithoutFile: baked.noPieceFile, swaps: [...FLAGS.swaps].map(([slot, f]) => ({ slot, file: f })) });   // the files the page had loaded when this still was taken
  }
  if (LIGHTS.length > 1) await setLight("day");
};
await save(`s${seed}-c${cell}-reach.png`);
await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
await page.waitForTimeout(500);
await save(`s${seed}-c${cell}-cell-arrival.png`);
// walk the pawn to the way out on the face side: the stair's entry (or the opening's middle) and the picture
await page.evaluate(([f]) => { const m = window.__mb, P = m.S.exp.patch, lay = m.layout(P.key), st = (lay.stairs || []).find((q) => q.dir === f), o = (lay.openings || []).find((q) => ({ N: "up", S: "down", W: "left", E: "right" })[q.side] === f);
  if (st) { P.x = st.entry.x; P.y = st.entry.y; } else if (!o) { P.x = f === "left" ? 4 : f === "right" ? lay.w - 5 : lay.w >> 1; P.y = f === "up" ? 4 : f === "down" ? lay.h - 5 : lay.h >> 1; } else if (o) { const k = (o.from + o.to) >> 1; P.x = f === "left" ? 1 : f === "right" ? lay.w - 2 : k; P.y = f === "up" ? 1 : f === "down" ? lay.h - 2 : k; }
  P.dir = f; m.S.veil[P.key] = new Array(lay.h).fill(0x0fffffff); }, [face]);
await page.waitForTimeout(700);
await save(`s${seed}-c${cell}-cell-${face}.png`);
await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key); m.startView("look", lay); });
await page.waitForTimeout(700);
await save(`s${seed}-c${cell}-whole.png`);
console.log("errors", JSON.stringify(errors), "off-palette", JSON.stringify(await page.evaluate(() => window.__mb.offPalette().bad)));
await browser.close(); server.close();
for (const slot of FLAGS.swaps.keys()) if (!swapUsed.has(slot)) { console.error(`--swap ${slot}: the page never asked for that file (a slot is the path from the repo root)`); process.exitCode = 1; }
