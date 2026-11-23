// night-draw-fix-1: stills of one place at day, dusk and night (390x844).
//   PW_DIR=/home/mb/mb/.pw node clock-stills.mjs <outDir>
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
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
  for (const [w, h] of [[390, 844], [522, 935]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    const errors = []; page.on("pageerror", (e) => { errors.push(e.message); console.log("ERR", e.message); }); page.on("requestfailed", (r) => console.log("FAIL", r.url())); page.on("response", (r) => { if (r.status() >= 400) console.log(r.status(), r.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/play/exploration/?seed=7`);
    await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.newWorld(7, 2); const pos = 13 * m.MW + 9; m.startExpedition("weather", pos); m.S.exp.fog = null; m.S.exp.storm = null; m.S.exp.pos = pos; m.enterPatch(); m.S.exp.patch.x = 5; m.S.exp.patch.y = 20; m.S.veil[m.S.exp.patch.key] = new Array(m.PH).fill(0x0fffffff); });
    // a step on the map, then each part of the day; the dusk and night lines come from the real advance
    const steps = [["1-day", 30, null], ["2-dusk", 161, "dusk"], ["3-night", 186, "night"]];
    for (const [name, spent, news] of steps) {
      await page.evaluate(([s, n]) => { const m = window.__mb; m.S.day.spent = s; if (n) m.FX.msg = ""; }, [spent, news]);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${w}x${h}-${name}.png` });
      console.log(w, name, JSON.stringify(await page.evaluate(() => { const m = window.__mb; return { spent: m.S.day.spent, msg: m.FX.msg }; })));
    }
    if (errors.length) console.log("page errors", errors);
  }
} finally { await browser.close(); server.close(); }
