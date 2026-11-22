// water-edge-2 (owner #110): holding an arrow against wide water east of a place slides the view over the water cell beyond. That cell is a flat block; the signed edge strip is laid dense on its near
// edge, so the block does not meet the place's shallows in one flat straight line. Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the test is skipped).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "../../places/src/png.mjs";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

test("the wide water beside a place carries the veil strip on its near edge, dense on the line", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
    await page.waitForFunction(() => window.__mb && window.__mb.newWorld, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    const at = await page.evaluate(() => {   // seed 7, cell 27: the east neighbour is inland wide water ("Wide water · too deep to cross"); the pawn on the last land tile of the east edge
      const m = window.__mb; m.newWorld(7); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]); const S = m.S;
      const c = 27; S.exp.pos = String(c); m.enterPatch(String(c)); const lay = m.curLay(), P = S.exp.patch, T = m.T;
      const wet = (t) => t === T.WATER || t === T.DEEP || t === T.STEP || t === T.WADE;
      let best = null; for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) if (m.passable(x, y) && !wet(lay.tiles[y * lay.w + x]) && (!best || x > best.x)) best = { x, y };
      S.revealed[c + 1] = 1; S.exp.range = 50; S.day.spent = 164; P.x = best.x; P.y = best.y; m.unveil(String(c), best.x, best.y, 3);
      return { land: m.G.land[c + 1] === m.L.WATER, coast: !!(m.G.coast && m.G.coast[c + 1]) };
    });
    assert.ok(at.land && !at.coast, "the east neighbour is inland wide water");
    await page.waitForTimeout(400); await page.keyboard.down("ArrowRight"); await page.waitForTimeout(700);
    const img = decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
    await page.keyboard.up("ArrowRight");
    // the line is where the block starts (the place's picture ends); find it as the column after which the rows are the block's navy, then compare the block's first columns with its far columns
    const lum = (x, y) => { const q = (y * img.w + x) * 4; return img.data[q] + img.data[q + 1] + img.data[q + 2]; };
    const mean = (x0, x1) => { let s = 0, n = 0; for (let x = x0; x < x1; x++) for (let y = 60; y < 560; y++) { s += lum(x, y); n++; } return s / n; };
    const far = mean(400, 440); let line = 200; for (let x = 201; x < 350; x++) if (Math.abs(mean(x, x + 1) - mean(x - 1, x)) > Math.abs(mean(line, line + 1) - mean(line - 1, line))) line = x;
    assert.ok(line > 100 && line < 400, "the block's near edge is found at x " + line);
    const near = mean(line + 1, line + 9);
    assert.ok(near - far > 25, "the strip lies dense on the block's near edge: near " + near.toFixed(1) + " vs far " + far.toFixed(1));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
