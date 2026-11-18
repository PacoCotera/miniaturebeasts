// land-line-merge-1: stills of one place of the merged land from the real page (rule 17a): the pawn in it, day and storm, the walking view and the whole place at 1x (the game's own 450 x 600 screen),
// and the phone page at 390 x 844 for the walking view.
//   PW_DIR=/home/mb/mb/.pw node land-merge-stills.mjs --seed 7 --cell start --out DIR            (the start place, the pawn where the walk puts it)
//   PW_DIR=/home/mb/mb/.pw node land-merge-stills.mjs --seed 78 --cell 55 --pawn 19,24,up --sp 7 --out DIR   (a place with a bank: a grown Rupar leads, the pawn at the foot of the bank)
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
const seed = +arg("seed", 7), cellArg = arg("cell", "start"), sp = +arg("sp", 0), pawnArg = arg("pawn", null), out = path.resolve(arg("out", "land-merge-stills"));
mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.PAGESHOT_CHROME || "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "reduce" })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__mb && window.__mb.PL.ready, null, { timeout: 120000 });
const info = await page.evaluate(([seed, cellArg, sp, pawnArg]) => { const m = window.__mb;
  m.newWorld(seed); m.TEST.calm = true; const S = m.S;
  S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; S.mibis = [{ id: 1, name: "Fig", sp, born: 0, outings: 0, notches: 0, bonded: sp === 7, care: 0, tends: 0, tendDay: null, grownTurn: sp === 7 ? 3 : null }]; S.carried = [1]; S.lead = 1;
  m.startExpedition("weather", m.G.spawns[0]);
  const cell = cellArg === "start" ? m.G.spawns[0] : +cellArg, ex = S.exp;
  if (cellArg !== "start") { ex.start = cell; ex.pos = cell; ex.range = 4; if (ex.patch) m.leavePatch(); m.enterPatch(); } else if (!ex.patch) m.enterPatch();
  const key = ex.patch.key, lay = m.layout(key), P = ex.patch;
  if (pawnArg) { const [x, y, dir] = pawnArg.split(","); P.x = +x; P.y = +y; P.dir = dir; }
  S.veil[key] = new Array(lay.h).fill(0x0fffffff);
  return { cell, key, w: lay.w, h: lay.h, pawn: [P.x, P.y, P.dir], banks: lay.banks || null }; }, [seed, cellArg, sp, pawnArg]);
console.log(JSON.stringify(info));
const cell = info.cell;
const setLight = (light) => page.evaluate(([l, c]) => { const m = window.__mb, ex = m.S.exp; ex.storm = l === "storm" ? { x: (c % m.MW) - 1, dir: 1, w: 3, v: 0, t: 0 } : null; }, [light, cell]);
const name = `s${seed}-c${cell}`;
await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); m.walkLift && m.walkLift(); }); await page.waitForTimeout(1200);
for (const light of ["day", "storm"]) {
  await setLight(light); await page.waitForTimeout(700);
  const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, `${name}-walk-1x-${light}.png`), Buffer.from(d.split(",")[1], "base64"));
  writeFileSync(path.join(out, `${name}-walk-phone-${light}.png`), await page.screenshot());
}
await setLight("day");
await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key); m.startView("look", lay); }); await page.waitForTimeout(900);
for (const light of ["day", "storm"]) {
  await setLight(light); await page.waitForTimeout(700);
  const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, `${name}-whole-1x-${light}.png`), Buffer.from(d.split(",")[1], "base64"));
  writeFileSync(path.join(out, `${name}-whole-phone-${light}.png`), await page.screenshot());
}
console.log("errors", JSON.stringify(errors)); await browser.close(); server.close();
