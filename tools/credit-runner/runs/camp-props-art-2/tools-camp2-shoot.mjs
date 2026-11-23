// camp-props-art-2: real /play stills of the walk at a planted flag with the camp, day / dusk / night, 390x844 and 522x935.
//   PW_DIR=/home/mb/mb/.pw BUNDLE=<assembled site> node tools-camp2-shoot.mjs <outDir> <ground: meadow|sand> [cell] [px] [py]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const ground = process.argv[3] || "meadow";
const cellArg = process.argv[4], pxArg = process.argv[5], pyArg = process.argv[6];
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
    page.on("pageerror", (e) => console.log("ERR", e.message));
    page.on("response", (r) => { if (r.status() >= 400) console.log(r.status(), r.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/play/exploration/?seed=7`);
    await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.newWorld(7); });
    for (let i = 0; i < 60; i++) {
      const ok = await page.evaluate(([cellA]) => { const m = window.__mb; if (!m.S.exp) m.startExpedition("weather", cellA ? Number(cellA) : m.G.spawns[0]); return !!m.S.exp; }, [cellArg]);
      if (ok) break; await page.waitForTimeout(1500);
    }
    try { await page.waitForFunction(() => window.__mb.S && window.__mb.S.exp, null, { timeout: 90000 }); } catch (e) {
      console.log("no expedition", JSON.stringify(await page.evaluate(() => { const m = window.__mb; return { phase: m.S && m.S.phase, readOnly: m.RT && m.RT.readOnly, making: m.RT && m.RT.making, spawn: m.G && m.G.spawns && m.G.spawns[0], plReady: m.PL && m.PL.ready, gen: m.G && m.G.gen }; })));
      await page.screenshot({ path: `${out}/debug.png` }); throw e; }
    await page.waitForTimeout(3000);
    await page.evaluate(() => { const m = window.__mb; m.S.exp.fog = null; m.S.exp.storm = null; });
    for (let i = 0; i < 40; i++) {
      const ok = await page.evaluate(() => { const m = window.__mb; if (!m.S.exp.patch) m.enterPatch(); return !!m.S.exp.patch; });
      if (ok) break; await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1500);
    console.log(await page.evaluate(([pxA, pyA]) => {
      const m = window.__mb;
      const P = m.S.exp.patch; if (pxA) { P.x = Number(pxA); P.y = Number(pyA); }
      m.S.veil[P.key] = new Array(m.PH).fill(0x0fffffff);
      window.__camp ={ x: P.x - 1, y: P.y + 1 };
      return JSON.stringify({ pos: m.S.exp.pos, patch: [P.x, P.y], land: m.G.land[m.S.exp.pos] });
    }, [pxArg, pyArg]));
    await page.waitForTimeout(8000);
    for (const [name, spent] of [["day", 30], ["dusk", 161], ["night", 186]]) {
      await page.evaluate((s) => { window.__mb.S.day.spent = s; }, spent);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${out}/${ground}-${w}x${h}-${name}.png` });
      console.log(w, name, "done");
    }
  }
} finally { await browser.close(); server.close(); }
