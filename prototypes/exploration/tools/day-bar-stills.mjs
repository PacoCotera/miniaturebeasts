// day-bar-1: stills and a clip of the day bar on the real /play (assembled site), at the two phone sizes.
//   PW_DIR=/home/mb/mb/.pw node day-bar-stills.mjs <siteDir> <outDir>
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]); mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const comp = (page) => page.frames().find((f) => /exploration/.test(f.url()));
const setup = async (page) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/play/?test&seed=7`); await page.waitForTimeout(4000);
  const f = comp(page); if (!f) throw new Error("no companion frame");
  await f.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.PL.ready = false; m.startExpedition("weather", m.G.spawns[0]); m.PL.ready = true; if (m.S.exp) { m.S.exp.fog = null; m.S.exp.storm = null; } else console.log("no expedition", m.S.phase); });
  await f.waitForFunction(() => window.__mb.S.exp, null, { timeout: 60000 });
  await f.evaluate(() => { const e = window.__mb.S.exp; e.fog = null; e.storm = null; e.pt = { id: "p1", name: "Wickleberry", sp: 1, elder: false, n: 0, mk: 0 };
  }); await page.waitForTimeout(1500);
  await f.evaluate(() => { window.__mb.S.day.spent = 140; }); await page.waitForTimeout(500);
  // the partner name's room, by pixels: the HUD row with names of 0..11 letters; the longest name whose row differs from the empty name's is the longest that shows
  { const shot = () => page.screenshot({ clip: { x: 36, y: 106, width: 317, height: 30 } }); let fits = 0, none;
    for (let n = 0; n <= 11; n++) { await f.evaluate((k) => { window.__mb.S.exp.pt.name = "WWWWWWWWWWW".slice(0, k); }, n); await page.waitForTimeout(250); const b = await shot(); if (n === 0) none = b; else if (!b.equals(none)) fits = n; }
    await f.evaluate(() => { window.__mb.S.exp.pt.name = "Wickle"; }); console.log("partner name: the longest name that shows beside the day bar is", fits, "letters (W, the widest letter)"); }
  if (errors.length) console.log("page errors", errors);
  return f;
};
try {
  for (const [w, h, dsf] of [[390, 844, 3], [522, 935, 2]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: true });
    const page = await ctx.newPage(); const f = await setup(page);
    for (const [name, spent] of [["morning", 35], ["pre-dusk", 140], ["night", 178], ["mid-night", 187]]) {
      await f.evaluate((s) => { window.__mb.S.day.spent = s; }, spent);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${w}-${name}.png` });
      console.log(w, name, await f.evaluate(() => window.__mb.dayPart()));
    }
    await ctx.close();
  }
  // the clip as a frame strip: ~30 actions across the dusk change (light 140 -> 170) at 390, one frame at rest after each action, then one Wait caught every ~100 ms mid-glide
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await ctx.newPage(); const f = await setup(page); mkdirSync(`${out}/frames`, { recursive: true });
  const clip = { x: 36, y: 106, width: 317, height: 30 };
  await f.evaluate(() => { window.__mb.S.day.spent = 140; }); await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/frames/a-00.png`, clip });
  for (let i = 1; i <= 30; i++) { await f.evaluate(() => window.__mb.waitTick("map")); await page.waitForTimeout(700); await page.screenshot({ path: `${out}/frames/a-${String(i).padStart(2, "0")}.png`, clip }); }
  await f.evaluate(() => { window.__mb.S.day.spent = 100; }); await page.waitForTimeout(1500);
  await f.evaluate(() => window.__mb.waitTick("map"));
  for (let i = 0; i < 6; i++) { await page.screenshot({ path: `${out}/frames/b-${i}.png`, clip }); await page.waitForTimeout(60); }
  await ctx.close();
} finally { await browser.close(); server.close(); }
