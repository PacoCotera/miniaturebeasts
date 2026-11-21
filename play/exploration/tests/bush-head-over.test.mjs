// Owner bug #54 ("prop obscuring the head of the pawn"): the explorer stands among round bushes whose bases are behind him (above his feet);
// the walk-through-a-plant pass (feetItem) drew their lower half over him, covering his head. Now a plant whose base is above his feet is left behind him.
// Real Chromium; PW_DIR names the folder holding node_modules/playwright (without it the test is skipped); CHROME_PATH an optional browser binary.
// Seed 183, place 1, tile 20,21 (the place has a bush-small at 19,20 and round shrub pieces in the tile). Pixel check: every opaque pixel of the explorer's picture is on the screen as drawn.
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

async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html` };
}

// Enter place `key`, lift the veil with a Call, stand on (x, y), draw a frame; count the opaque pixels of the explorer's picture that are not what was drawn on the screen (rows: which rows of his picture).
const STAND = `async ([key, x, y]) => {
  const m = window.__mb, raf = () => new Promise((q) => requestAnimationFrame(q)), wait = (ms) => new Promise((q) => setTimeout(q, ms));
  if (m.S.phase === "map") { m.act("confirm"); await wait(300); }
  m.S.exp.pos = key; m.enterPatch(); await wait(800);
  m.act("call"); await wait(2500);
  const P = m.S.exp.patch; P.x = x; P.y = y; P.dir = "down"; await wait(900);
  const calls = [], orig = CanvasRenderingContext2D.prototype.drawImage; let last = -1;
  CanvasRenderingContext2D.prototype.drawImage = function (img, a, b) { if (m.RT.heroN !== last) { last = m.RT.heroN; calls.push({ ctx: this, img, x: a, y: b }); } return orig.apply(this, arguments); };
  await raf(); await raf();
  CanvasRenderingContext2D.prototype.drawImage = orig;
  const hc = calls[calls.length - 1];
  if (!hc) return { noHero: true };
  const w = hc.img.width, h = hc.img.height;
  const src = hc.img.getContext("2d").getImageData(0, 0, w, h).data, scr = hc.ctx.getImageData(hc.x, hc.y, w, h).data;
  let opaque = 0, bad = 0; const rows = new Set();
  for (let i = 0; i < w * h; i++) { if (src[i * 4 + 3] !== 255) continue; opaque++; if (src[i * 4] !== scr[i * 4] || src[i * 4 + 1] !== scr[i * 4 + 1] || src[i * 4 + 2] !== scr[i * 4 + 2]) { bad++; rows.add(Math.floor(i / w)); } }
  return { opaque, bad, rows: [...rows].join(",") };
}`;

async function stand(args) {
  let browser; try { browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined }); } catch (e) { return { noBrowser: true }; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=183`); await page.waitForTimeout(1000);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
    const r = await page.evaluate(`(${STAND})(${JSON.stringify(args)})`);
    assert.deepEqual(errors, []);
    return r;
  } finally { await browser.close(); server.close(); }
}

test("the explorer with round bushes behind him shows his whole head", { skip }, async (t) => {
  const r = await stand([1, 20, 21]);
  if (r.noBrowser) { t.skip("no Chromium"); return; }
  assert.ok(r.opaque > 50, "the explorer is drawn: " + JSON.stringify(r));
  assert.equal(r.bad, 0, "nothing is painted over the explorer: " + JSON.stringify(r));
});
