// The spring's tell on a baked place (companion scheme): no light table on the clue tiles; each clue keeps its grass and holds a puddle,
// a sparkle runs along the line toward the spring, reduced motion shows a still sparkle on every clue. Real Chromium (PW_DIR; skipped without it).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "../../places/src/png.mjs";
import { compareGolden } from "../../places/src/golden.mjs";

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
async function enter(browser, url, seed, motion) {
  const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: motion ? "no-preference" : "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(300);
  return { page, errors };
}
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
const golden = (name, img) => { const r = compareGolden(path.join(path.dirname(fileURLToPath(import.meta.url)), "golden", name), img); assert.ok(r.ok, r.message); };
const px = (img, x, y) => { const i = (y * img.w + x) * 4; return (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]; };
const RIVER = 0x3084d8, CREAM = 0xfff4a6;

test("the spring's clue tiles keep their grass: only a puddle and a sparkle differ from the clear ground, and each clue wears a still sparkle in reduced motion", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 6, false);
    const info = await page.evaluate(() => window.__mb.TEST.tellStill("spring", 5));
    assert.ok(info && info.clues.length >= 2, "a spring with clue tiles: " + JSON.stringify(info));
    await page.waitForTimeout(600);
    const tell = await still(page);
    golden("tell-spring-puddles.png", tell);
    // the same frame with the heart found: the ground and everything else, without the tell
    const cam = await page.evaluate(() => window.__mb.camNow());
    await page.evaluate(() => { const m = window.__mb; m.S.called[m.layout(m.S.exp.patch.key).cell] = 1; });
    await page.waitForTimeout(400);
    const clear = await still(page);
    let seen = 0;
    for (const q of info.clues) {
      const tx = q.x * 48 - cam.x, ty = 32 + q.y * 48 - cam.y;
      if (tx < 0 || ty < 32 || tx + 48 > 450 || ty + 48 > 564) continue;
      seen++;
      let river = 0, cream = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        const a = px(tell, tx + x, ty + y), b = px(clear, tx + x, ty + y);
        if (a === b) continue;
        assert.ok(x >= 8 && x < 42 && y >= 10 && y < 40, `clue ${q.x},${q.y}: a difference outside the puddle and sparkle box at ${x},${y}`);
        if (a === RIVER) river++; if (a === CREAM) cream++;
      }
      assert.ok(river >= 20, `clue ${q.x},${q.y}: a puddle has river pixels (${river})`);
      assert.ok(cream >= 5, `clue ${q.x},${q.y}: reduced motion: a still sparkle on every clue (${cream})`);
    }
    assert.ok(seen >= 2, "at least two clue tiles in view: " + seen);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
