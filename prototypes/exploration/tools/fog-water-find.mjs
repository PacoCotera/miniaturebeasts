// find a (seed, spawn) whose place has water near the hero. PW_DIR=... node fog-water-find.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
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
  const page = await (await browser.newContext({ viewport: { width: 522, height: 935 } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
  await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 });
  for (const sd of [7, 3, 11, 21]) {
    for (let sp = 0; sp < 6; sp++) {
      await page.evaluate(([sd, sp]) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(sd); m.startExpedition("weather", m.G.spawns[sp]); m.S.exp.storm = null; m.enterPatch(); }, [sd, sp]);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => { const m = window.__mb, lay = m.curLay(), P = m.S.exp.patch; if (!lay) return null; const c = {};
        for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) if (Math.hypot(x - P.x, y - P.y) < 9) { const t = lay.tiles[y * lay.w + x]; c[t] = (c[t] || 0) + 1; }
        return { key: lay.key, P: [P.x, P.y], c, T: m.T }; });
      console.log(sd, sp, r ? JSON.stringify({ k: r.key, P: r.P, c: r.c }) : "null");
      if (sd === 7 && sp === 0 && r) console.log(JSON.stringify(r.T));
    }
  }
} finally { await browser.close(); server.close(); }
