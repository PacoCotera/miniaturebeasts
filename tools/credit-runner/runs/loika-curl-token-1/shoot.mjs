// usage: PW_DIR=... node shoot.mjs <outDir> <seed> <px,py> <label> [dx dy]
// Stills harness only: the served copy of the page has her idle token swapped for a curl frame; no game file changes.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const [out, seedArg, spot, label, dxA = "34", dyA = "10"] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const seed = Number(seedArg), [px, py] = spot.split(",").map(Number), dx = Number(dxA), dy = Number(dyA);
const root = "/home/mb/mb/pool/loika-curl-token-1";
const rle = Object.fromEntries(readFileSync(root + "/tools/credit-runner/runs/loika-curl-token-1/frames/rle.txt", "utf8").trim().split("\n").map((l) => l.split(": ")));
const html = readFileSync(root + "/prototypes/exploration/index.html", "utf8");
const i0 = html.indexOf("const SPECIES_ART = ["), m0 = /idle: '([^']+)'/.exec(html.slice(i0, i0 + 20000));
const idleStart = i0 + m0.index + "idle: '".length;
const variant = (key) => html.slice(0, idleStart) + rle[key] + html.slice(idleStart + m0[1].length).replace("window.__mb = {", "window.__mb = { __x: () => ({ P, live }),");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://x"); let p = path.join(root, decodeURIComponent(u.pathname));
  if (u.pathname.endsWith("/exploration/index.html") && u.searchParams.get("cv")) { res.writeHead(200, { "content-type": "text/html" }); res.end(variant(u.searchParams.get("cv"))); return; }
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
try {
  for (const w of [390, 522]) for (const sad of ["plain", "saddled"]) for (const fr of [0, 1]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: 844 } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}&cv=${sad}-curl-${fr}`);
    await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    await page.evaluate(([s, px, py]) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(s, 2); const pos = py * m.MW + px; m.startExpedition("weather", pos); m.S.exp.fog = null; m.S.exp.storm = null; m.S.exp.pos = pos; m.enterPatch();
      m.S.veil[m.S.exp.patch.key] = new Array(m.PH).fill(0x0fffffff); }, [seed, px, py]);
    await page.evaluate(([dx, dy]) => { const m = window.__mb, P = m.S.exp.patch, live = m.curLive(); live.cr.length = 0; live.cr.push({ id: 9001, sp: 0, x: P.x + dx, y: P.y + dy, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: .5, face: 1 }); }, [dx, dy]);
    for (const [name, spent] of [["day", 30], ["dusk", 160], ["night", 190]]) {
      await page.evaluate((s) => { const m = window.__mb; m.S.day.spent = s; m.RT.key = null; }, spent);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/${label}-${w}-${sad}-${fr}-${name}.png` });
    }
    if (errors.length) console.log("page errors", errors.slice(0, 3));
    await page.close();
  }
} finally { await browser.close(); server.close(); }
