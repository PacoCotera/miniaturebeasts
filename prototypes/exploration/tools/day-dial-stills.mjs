// day-dial-1: stills of the top bar at each of the six parts of day, in real Chromium at the two phone sizes (full screen + top bar zoomed).
//   PW_DIR=/home/mb/mb/.pw node day-dial-stills.mjs <outDir>
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
try {
  for (const [w, h] of [[390, 844], [522, 935]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (c) => { if (c.type() === "error") errors.push(c.text()); }); page.on("requestfailed", (r) => errors.push("failed " + r.url()));
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
    await page.waitForTimeout(3000); if (errors.length) console.log("page errors", errors);
    await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.newWorld(7); m.startExpedition("weather", m.G.spawns[0]); m.S.exp.fog = null; m.S.exp.storm = null; });
    for (const [name, spent] of [["1-dawn", 5], ["2-morning", 40], ["3-midday", 90], ["4-afternoon", 130], ["5-dusk", 160], ["6-night", 185]]) {
      await page.evaluate((s) => { window.__mb.S.day.spent = s; }, spent);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${w}x${h}-${name}.png` });
      await page.screenshot({ path: `${out}/${w}x${h}-${name}-bar.png`, clip: { x: 0, y: 0, width: w, height: 70 } });
      console.log(w, name, await page.evaluate(() => window.__mb.partOfDay ? window.__mb.partOfDay(window.__mb.S.day.spent) : window.__mb.S.day.spent));
    }
    if (errors.length) console.log("page errors", errors);
  }
} finally { await browser.close(); server.close(); }
