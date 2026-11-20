// The held-arrow peek slides the camera by whole pixels only (owner notes 11-19, 11-20: held up, the view drifted and the picture sheared sideways): the ground cache cuts its window
// by row (sy * W + x), so a fractional camera y reads from the wrong place. Real Chromium with the page clock held; PW_DIR names the folder holding node_modules/playwright, else skipped.
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

test("held up and held left: the slide offset is whole pixels at every point of the ease (seed 20, patch 10,7, tile 18,16)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const page = await (await browser.newContext({ viewport: { width: 522, height: 935 } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=20`);
    await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const m = window.__mb; m.TEST.calm = true;
      m.newWorld(20); m.startExpedition("weather", m.G.spawns[0]); m.S.exp.fog = null; m.S.exp.storm = null;
      m.S.exp.pos = 7 * m.MW + 10; m.enterPatch(); if (m.RT.view) m.endView();
      m.S.exp.patch.x = 18; m.S.exp.patch.y = 16;
    });
    await page.waitForTimeout(1000);
    for (const dir of ["up", "left"]) {
      await page.evaluate((d) => { const m = window.__mb; m.PAN.dir = d; m.PAN.live = true; m.PAN.rel = null; m.PAN.key = m.S.exp.patch.key; m.PAN.at = 1000; m.TEST.clock = 1000; }, dir);
      const offs = [];
      for (const ms of [30, 60, 90, 125, 160, 190, 220]) {
        await page.evaluate((c) => { window.__mb.TEST.clock = c; }, 1000 + ms); await page.waitForTimeout(120);
        offs.push(await page.evaluate(() => {
          const m = window.__mb, lay = m.layout(m.S.exp.patch.key), c0 = m.camNow(), hero = { x: 18 * 48 + 24 - c0.x, y: 16 * 48 + 24 - c0.y };
          return { f: m.panFrac(), ...m.panOffset(lay, c0, hero) };
        }));
      }
      await page.evaluate(() => { const m = window.__mb; m.PAN.dir = null; m.PAN.live = false; m.TEST.clock = null; });
      assert.ok(offs.some((o) => o.x !== 0 || o.y !== 0), dir + ": the slide moves");
      for (const o of offs) { assert.ok(Number.isInteger(o.x) && Number.isInteger(o.y), `${dir}: whole pixels, got ${JSON.stringify(o)}`); }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
