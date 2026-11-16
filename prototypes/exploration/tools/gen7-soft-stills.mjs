// Stills of a generation 7 place with the Tuliko's tiles (tuliko-soft-7-1), from the real page at 1x (450 x 600, 48 px a tile): the pawn on the bank, the Tuliko partner out on the mud (or on the scree) the pawn cannot cross,
// by day and in the storm (the page's only other light on a walk), the walking view and the whole place.
//   PW_DIR=/home/mb/mb/.pw node prototypes/exploration/tools/gen7-soft-stills.mjs --seed 7 --kind wade|scree [--nth 0] [--out DIR]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const seed = +arg("seed", 7), kind = arg("kind", "wade"), nth = +arg("nth", 0), out = path.resolve(arg("out", "soft-stills"));
mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.PAGESHOT_CHROME || "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__mb && window.__mb.PL.ready, null, { timeout: 120000 });
// a Tuliko leads; the walk starts at the home cell, then the place asked is entered from the side the pawn comes in by
const found = await page.evaluate(([seed, kind, nth]) => { const m = window.__mb;
  m.newWorld(seed); m.TEST.calm = true; const S = m.S, G = m.G;
  S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; S.mibis = [{ id: 1, name: "Fig", sp: 19, born: 0, outings: 0, notches: 2, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }]; S.carried = [1]; S.lead = 1;
  m.startExpedition("weather", G.spawns[0]);
  const cells = [];
  for (let c = 0; c < m.MW * m.MH; c++) { const lay = m.layout(String(c)), tl = lay.tiles; const T = m.T, want = kind === "wade" ? T.WADE : T.SCREE; if (tl.some((t) => t === want)) cells.push(c); }
  return cells; }, [seed, kind, nth]);
console.log("places with", kind, "tiles in the home region:", JSON.stringify(found));
const cell = found[nth]; if (cell == null) { console.log("none"); await browser.close(); server.close(); process.exit(1); }
const setup = (c) => page.evaluate((cell) => { const m = window.__mb, S = m.S, T = m.T, ex = S.exp; if (ex.patch) m.leavePatch(); ex.start = cell; ex.pos = cell; ex.range = 4; ex.lastDir = null;
  m.enterPatch(); if (m.RT.view) m.endView();
  const key = String(cell), lay = m.layout(key), P = ex.patch, live = ex.live[key], want = (t) => t === T.WADE || t === T.SCREE;
  const soft = []; lay.tiles.forEach((t, i) => { if (want(t)) soft.push([i % lay.w, (i / lay.w) | 0]); });
  const ok = (x, y) => x >= 0 && y >= 0 && x < lay.w && y < lay.h && !m.T_BLOCK[lay.tiles[y * lay.w + x]] && lay.reach[y * lay.w + x];
  // the soft tile nearest the middle of the run; the pawn on the nearest walking tile that is reached on foot (from the first soft tile's neighbours); the Tuliko on the soft tile
  const mid = soft[soft.length >> 1]; let best = null, bd = 1e9; for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) if (ok(x, y)) { const d = (x - mid[0]) ** 2 + (y - mid[1]) ** 2; if (d >= 4 && d < bd) { bd = d; best = [x, y]; } }
  P.x = best[0]; P.y = best[1]; P.dir = "right"; S.veil[key] = new Array(lay.h).fill(0x0fffffff);
  if (live) live.pt = { x: mid[0], y: mid[1], st: "follow", face: 1 };
  return { soft: soft.length, mid, pawn: best, w: lay.w, h: lay.h }; }, c);
const info = await setup(cell); console.log(JSON.stringify(info));
await page.waitForTimeout(900);
const setLight = (light) => page.evaluate(([l, c]) => { const m = window.__mb, ex = m.S.exp; ex.storm = l === "storm" ? { x: (c % m.MW) - 1, dir: 1, w: 3, v: 0, t: 0 } : null; }, [light, cell]);
for (const light of ["day", "storm"]) {
  await setLight(light); await page.waitForTimeout(500);
  const d = await page.evaluate(() => window.__mb.capture()); const f = path.join(out, `s${seed}-${kind}-c${cell}-walk-${light}.png`); writeFileSync(f, Buffer.from(d.split(",")[1], "base64")); console.log(f);
}
await setLight("day");
await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key); m.startView("look", lay); }); await page.waitForTimeout(800);
for (const light of ["day", "storm"]) {
  await setLight(light); await page.waitForTimeout(500);
  const d = await page.evaluate(() => window.__mb.capture()); const f = path.join(out, `s${seed}-${kind}-c${cell}-whole-${light}.png`); writeFileSync(f, Buffer.from(d.split(",")[1], "base64")); console.log(f);
}
console.log("errors", JSON.stringify(errors)); await browser.close(); server.close();
