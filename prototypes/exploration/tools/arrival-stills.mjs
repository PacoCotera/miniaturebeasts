// map-step-arrival-1: stills of the map's arrival line and of the strike stop, in real Chromium at the two phone sizes.
//   PW_DIR=/home/mb/mb/.pw node arrival-stills.mjs <outDir>
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
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
    await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    const dir = await page.evaluate(() => {
      const m = window.__mb; m.TEST.calm = true; m.newWorld(7); m.startExpedition("weather", m.G.spawns[0]); m.S.exp.fog = null; m.S.exp.storm = null; m.S.day.spent = 105;
      for (const d of ["right", "down", "left", "up"]) { m.S.exp.face = d; if (m.canStep(m.S.exp.pos, d) && m.inRange(m.S.exp.pos + (d === "right" ? 1 : d === "left" ? -1 : d === "down" ? m.MW : -m.MW))) return d; }
      return null;
    });
    if (!dir) { console.log(w, "no steppable neighbour"); continue; }
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${w}x${h}-1-arrival.png` });
    console.log(w, "arrival", JSON.stringify(await page.evaluate(() => JSON.stringify(window.__mb.lineFor().ctx))));
    await page.evaluate((d) => {
      const m = window.__mb, ex = m.S.exp, a = ex.pos + (d === "right" ? 1 : d === "left" ? -1 : d === "down" ? m.MW : -m.MW);
      ex.mstrike = { c: a, at: ex.actions + 1 }; m.press(d); m.release && m.release(d);
    }, dir);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${w}x${h}-2-strike-stop.png` });
    console.log(w, "stop", JSON.stringify(await page.evaluate(() => ({ spent: window.__mb.S.day.spent, msg: window.__mb.FX.msg, ctx: window.__mb.lineFor().ctx }))));
    if (errors.length) console.log("page errors", errors);
  }
} finally { await browser.close(); server.close(); }
