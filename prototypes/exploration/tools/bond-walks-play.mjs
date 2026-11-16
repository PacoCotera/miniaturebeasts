// Play together at phone size on the real page: four presses one turn apart (the third bonds, the fourth is refused-free: a bonded pair),
// stills 1 s and 4 s after each press, and after a press that cannot play (same turn). Needs the page's Playwright:
//   PW_DIR=<dir with node_modules/playwright> node prototypes/exploration/tools/bond-walks-play.mjs [outdir]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const out = path.resolve(process.argv[2] || "bond-walks-stills"); mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=9`); await page.waitForTimeout(1500);
await page.evaluate(() => {
  const m = window.__mb, S = m.S, mk = (id, name, sp) => ({ id, name, sp, born: 0, outings: 0, notches: 0, bonded: false, plays: 0, grownTurn: 0, mem: null });
  S.mibis = [mk(1, "Dot", 1), mk(2, "Moss", 2)]; S.carried = [1, 2]; S.exp = null; S.phase = "active"; S.ui.aId = 1; S.ui.sel = 0; S.walkTurn = -1;
});
await page.waitForTimeout(600);
const shot = async (name) => { await page.screenshot({ path: path.join(out, name + ".png") }); };
const log = [];
const msg = () => page.evaluate(() => window.__mb.FX.msg);
const press = async (n) => {
  await page.evaluate(() => { const m = window.__mb; m.S.walkTurn = -1; m.act("confirm"); });
  await page.waitForTimeout(1000); log.push([n, "1s", await msg()]); await shot(`p${n}-1s`);
  await page.waitForTimeout(3000); log.push([n, "4s", await msg()]); await shot(`p${n}-4s`);
  await page.waitForTimeout(3500);   // the bond event holds the input to its end
};
for (let n = 1; n <= 3; n++) await press(n);
// a fourth press: both bonded; then a press the same turn (refused)
await press(4);
await page.evaluate(() => { window.__mb.act("confirm"); }); await page.waitForTimeout(1000); log.push(["refused", "1s", await msg()]); await shot("refused-1s");
await page.waitForTimeout(3000); log.push(["refused", "4s", await msg()]); await shot("refused-4s");
writeFileSync(path.join(out, "lines.json"), JSON.stringify(log, null, 1));
console.log(JSON.stringify(log), "errors", JSON.stringify(errors));
await browser.close(); server.close();
