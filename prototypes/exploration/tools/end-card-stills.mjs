// owner-notes-fix-108b: the end card after End expedition in three cases, in real Chromium at the two phone sizes.
//   (a) a walk across the map that passes one night and enters no place; (b) a walk that enters a place and notes a habit; (c) End at once.
//   PW_DIR=/home/mb/mb/.pw node end-card-stills.mjs <outDir> [<repo root, default: this checkout>]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const root = process.argv[3] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const cases = {
  a: () => { const m = window.__mb; m.S.day.camp = null; m.S.day.spent = 195; m.advance("map", { clock: 10 }); },
  b: () => { const m = window.__mb; m.enterPatch(); m.leavePatch(); m.S.exp.habits = { "bank-dig": 1 }; },
  c: () => {},
};
try {
  for (const [w, h] of [[390, 844], [522, 935]]) for (const [name, setup] of Object.entries(cases)) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
    await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.newWorld(7); m.startExpedition("weather", m.G.spawns[0]); m.S.exp.fog = null; m.S.exp.storm = null; });
    await page.waitForTimeout(500);
    await page.evaluate(setup); await page.waitForTimeout(300);
    await page.evaluate(() => { const m = window.__mb; m.endExpedition("sent"); });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${w}x${h}-${name}.png` });
    console.log(w, name, JSON.stringify(await page.evaluate(() => { const r = window.__mb.S.report; return { turn: window.__mb.S.turn, waited: r.waited, days: r.days, places: r.places, habits: r.habits, empty: r.empty }; })));
    if (errors.length) console.log("page errors", errors);
  }
} finally { await browser.close(); server.close(); }
