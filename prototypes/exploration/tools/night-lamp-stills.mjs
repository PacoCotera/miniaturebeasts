// night-step-4-2: the lamp's circle at night, whole /play screens at 390 and 522, one seed per run.
//   BUNDLE=<site dir> PW_DIR=/home/mb/mb/.pw node night-lamp-stills.mjs <outDir> <seed>
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2], seed = Number(process.argv[3] || 7); mkdirSync(out, { recursive: true });
const root = process.env.BUNDLE;
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
  for (const w of [390, 522]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 935 } })).newPage();
    page.on("pageerror", (e) => console.log("ERR", e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/play/?seed=${seed}`);
    const fr = async () => page.frames().find((f) => f.url().includes("/exploration/"));
    let f = null; for (let i = 0; i < 120 && !f; i++) { await page.waitForTimeout(500); f = await fr(); if (f && !(await f.evaluate(() => !!(window.__mb && window.__mb.TEST)).catch(() => false))) f = null; }
    if (!f) { console.log("no frame"); continue; }
    await page.waitForTimeout(1500);
    await f.evaluate((s) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(s, 2); const pos = 13 * m.MW + 9; m.startExpedition("weather", pos); m.S.exp.fog = null; m.S.exp.storm = null; m.S.exp.pos = pos; m.enterPatch(); const P = m.S.exp.patch; m.S.seen.tile[P.key] = new Array(m.PH).fill(0x0fffffff); m.S.day.spent = 570; }, seed);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${w}-land${seed}-night.png` });
    console.log(w, seed, "done");
  }
} finally { await browser.close(); server.close(); }
