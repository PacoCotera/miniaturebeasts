// #153 fog sight edge stills on the real page. PW_DIR=/home/mb/mb/.pw node fog-edge-stills.mjs <outDir> <tag> [seed]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2], tag = process.argv[3] || "after", seed = +(process.argv[4] || 7); mkdirSync(out, { recursive: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/prototypes/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
try {
  for (const [w, h] of (process.env.SIZES ? [process.env.SIZES.split("x").map(Number)] : [[522, 935], [390, 844]])) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/sandbox/play/?test`);
    let fr = null; for (let i = 0; i < 120 && !fr; i++) { fr = page.frames().find((f) => f.url().includes("exploration")) || null; if (fr) { try { await fr.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 1000 }); } catch { fr = null; } } if (!fr) await page.waitForTimeout(500); }
    await page.waitForTimeout(1500);
    await fr.evaluate(([sd, cell, hx, hy]) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(sd); m.startExpedition("weather", cell); m.S.exp.storm = null;
      m.S.exp.fog = { x: 0, y: 0, r: 9999, at: 0 }; m.S.exp.actions = 1; m.enterPatch(); if (hx >= 0) { m.S.exp.patch.x = hx; m.S.exp.patch.y = hy; } }, [seed, +(process.env.CELL || 29), +(process.env.HX || 14), +(process.env.HY || 8)]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${tag}-${w}x${h}-0.png` });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${tag}-${w}x${h}-0b.png` });
    console.log(w, h, JSON.stringify(await fr.evaluate(() => { const m = window.__mb; return { fog: m.S.exp.fog, key: m.RT && m.RT.key }; })));
    if (errors.length) console.log("page errors", errors.slice(0, 3));
  }
} finally { await browser.close(); server.close(); }
