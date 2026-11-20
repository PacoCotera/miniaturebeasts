// #97: a Call at a place's edge (seed 59, patch 2,3, tile 3,0) lifts the strip of the place above even when that place lies outside the Probe's reach and is not yet seen;
// the held view must then draw that place with the strip, not the map's fog. Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the test is skipped).
//   PW_DIR=<dir> node --test prototypes/exploration/tests/call-edge-upper-place.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

test("held Call at the top edge draws the unseen place above with the strip the Call lifted", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const page = await (await browser.newContext({ viewport: { width: 522, height: 935 }, reducedMotion: "reduce" })).newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=59`); await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const m = window.__mb; m.TEST.calm = true; m.newWorld(59, 7);
      const c = 3 * m.MW + 2; m.startExpedition("weather", c); m.S.exp.fog = null; m.S.exp.storm = null; m.S.exp.pos = c; m.enterPatch();
    });
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const m = window.__mb, up = 2 * m.MW + 2, P = m.S.exp.patch;
      m.S.exp.reach = m.S.exp.reach.filter((x) => x !== up); delete m.S.revealed[up];   // the place above: outside the reach, not seen
      P.x = 3; P.y = 0;
    });
    await page.evaluate(() => window.__mb.act("call"));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__mb.press("call"));
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => { const m = window.__mb, e = m.RT.view && m.RT.view.nb && m.RT.view.nb.get(String(2 * m.MW + 2)); return { view: m.RT.view && m.RT.view.kind, drawn: !!(e && e.cv) }; });
    assert.equal(r.view, "peek");
    assert.equal(r.drawn, true, "the place above is drawn with its lifted strip");
  } finally { await browser.close(); server.close(); }
});
