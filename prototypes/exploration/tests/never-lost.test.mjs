// The explorer is never lost and the keys never lock (owner report, Companion walk 2026-11-08): after every step the explorer is inside the view and drawn;
// a sprite or the place view throwing costs only that, never the explorer, the bar and the line, or a clip left on the canvas; every hold on the keys ends and ← always works.
// Real Chromium (PW_DIR names the folder holding node_modules/playwright; skipped without it).
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
// A fresh page on a seed with the first place entered and the arrival look away. The sprite hook records every 32 px picture drawn, with the frame it belongs to.
async function enter(browser, url, seed, motion) {
  const ctx = await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: motion ? "no-preference" : "reduce" });
  await ctx.addInitScript(() => {
    const orig = CanvasRenderingContext2D.prototype.drawImage; window.__spr = [];
    CanvasRenderingContext2D.prototype.drawImage = function (img, x, y, ...r) { if (img && img.width === 32 && img.height === 32 && typeof x === "number" && window.__mb) window.__spr.push([x, y, window.__mb.RT.frameN]); return orig.call(this, img, x, y, ...r); };
  });
  const page = await ctx.newPage();
  const errors = [], logged = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) logged.push(m.text()); });
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(400);   // the arrival look away
  return { page, ctx, errors, logged };
}
// Where the explorer is on the screen and whether the last frame drew a 32 px picture on it.
const where = (page) => page.evaluate(() => { const m = window.__mb, RT = m.RT, pl = RT.plScr, f = RT.frameN;
  const drawn = pl ? window.__spr.some(([x, y, fr]) => fr === f && Math.abs(x - (pl.x - 16)) <= 2 && Math.abs(y - (pl.y - 8)) <= 2) : false;
  window.__spr.length = 0; return { pl: pl && { x: pl.x, y: pl.y }, drawn, view: !!RT.view || !!RT.spot, phase: m.S.phase }; });
const inView = (s) => s.pl && s.pl.x >= 24 && s.pl.x <= 450 - 24 && s.pl.y >= 32 + 24 && s.pl.y <= 564 - 24;
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));

for (const [seed, motion] of [[6, true], [7, true], [11, true], [6, false]]) {
  test(`seed ${seed}${motion ? "" : " (reduced motion)"}: after every step the explorer is inside the view and drawn`, { skip }, async (t) => {
    let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
    const { server, url } = await serve();
    try {
      const { page, ctx, errors, logged } = await enter(browser, url, seed, motion);
      const keys = ["up", "up", "up", "left", "left", "down", "right", "right", "right", "up", "up", "down", "left", "up"];   // no side is a wall now: the walk stays inside the place
      let walked = 0, last = null;
      for (const k of keys) {
        await page.evaluate((k) => window.__mb.act(k), k); await page.waitForTimeout(motion ? 480 : 120);
        const s = await where(page), p = await page.evaluate(() => { const P = window.__mb.S.exp.patch; return P.x + "," + P.y; });
        if (last !== null && p !== last) walked++; last = p;
        assert.equal(s.view, false, "the walking view after " + k);
        assert.ok(inView(s), `inside the view after ${k}: ${JSON.stringify(s.pl)}`);
        assert.ok(s.drawn, `the explorer's picture is drawn after ${k}`);
      }
      assert.ok(walked >= 4, "walked " + walked);
      assert.deepEqual(errors, []); assert.deepEqual(logged, []);
      await ctx.close();
    } finally { await browser.close(); server.close(); }
  });
}

test("a sprite that throws, or the place view throwing after its sprites, never takes the explorer, the bar or the line with it, and leaves no clip", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, ctx, errors, logged } = await enter(browser, url, 6, false);
    await page.evaluate(() => { window.__mb.TEST.boom = 1; }); await page.waitForTimeout(400); await where(page); await page.waitForTimeout(100);
    let s = await where(page); assert.ok(s.drawn && inView(s), "a throwing sprite: the explorer is still drawn " + JSON.stringify(s));
    await page.evaluate(() => { window.__mb.TEST.boom = 2; }); await page.waitForTimeout(400);
    // the top bar follows the game while the place view throws (a clip left from the throwing view would freeze everything outside the view): a magenta mark on a clean canvas at the top bar and on the bottom line is painted over by the next frame
    await page.evaluate(() => { window.__mb.TEST.paint(3, 3); window.__mb.TEST.paint(3, 580); }); await page.waitForTimeout(250);
    const a = await still(page), px = (x, y) => (a.data[(y * a.w + x) * 4] << 16) | (a.data[(y * a.w + x) * 4 + 1] << 8) | a.data[(y * a.w + x) * 4 + 2];
    assert.notEqual(px(4, 4), 0xff00ff, "the top bar is redrawn every frame while the place view throws");
    assert.notEqual(px(4, 581), 0xff00ff, "the bottom line is redrawn every frame while the place view throws");
    await page.evaluate(() => window.__mb.act("back")); await page.waitForTimeout(300);
    assert.equal((await where(page)).phase, "menu", "the keys still work while it throws");
    assert.ok(logged.length >= 1 && logged.length <= 3, "the throws are logged, not hidden: " + logged.length);
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});

test("the keys never lock: a runaway hold is cut to 2.5 s, a reveal spot that never ends is dropped by a press, and ← opens the menu after", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, ctx, errors } = await enter(browser, url, 6, true);
    const st = () => page.evaluate(() => { const m = window.__mb, RT = m.RT; return { phase: m.S.phase, view: RT.view ? RT.view.kind : null, spot: !!RT.spot, lock: m.FX.lockUntil - performance.now() }; });
    // a hold that asks for a lifetime is cut to the cap, and ← gets through once it ends
    await page.evaluate(() => { const m = window.__mb; m.FX.lockUntil = performance.now() + 1e7; });
    await page.keyboard.press("Enter"); await page.waitForTimeout(100);
    let s = await st(); assert.ok(s.lock <= 2500, "the hold is capped: " + s.lock);
    await page.waitForTimeout(2600);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    s = await st(); assert.equal(s.phase, "menu", "← opens the menu after the cap");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    s = await st(); assert.equal(s.phase, "patch");
    // a reveal spot that is never drawn (so never ends) is dropped by the first press after its beat, and ← works the press after
    await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; m.RT.spot = { at: performance.now() - 5000, key: P.key, extra: {}, drawn: false }; m.TEST.at = 0; });   // TEST.at holds spotStep, as a frame that never reaches it would
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    s = await st(); assert.equal(s.spot, false, "the stale spot is dropped by a press");
    await page.evaluate(() => { window.__mb.TEST.at = null; });
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    s = await st(); assert.equal(s.phase, "menu", "and ← opens the menu");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});

test("every walkable tile of every fourth baked place: the camera's rest holds the explorer's tile in view (cut camera)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, ctx, errors } = await enter(browser, url, 6, false);
    const res = await page.evaluate(async () => {
      const m = window.__mb; let cells = 0, tiles = 0; const bad = []; let n = 0;
      for (let c = 0; c < m.MW * m.MH; c++) {
        if (!m.passable(c) || n++ % 4) continue;
        m.S.exp.pos = c; m.S.phase = "map"; m.enterPatch(); await new Promise((r) => setTimeout(r, 40)); if (m.RT.view) m.endView(); await new Promise((r) => setTimeout(r, 40));
        const P = m.S.exp.patch, lay = m.layout(P.key); if (!lay.baked) continue; cells++;
        const walk = []; for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) if (lay.reach && lay.reach[y * lay.w + x] && !m.T_BLOCK[lay.tiles[y * lay.w + x]]) walk.push({ x, y });
        for (let run = 0; run < 2; run++) {
          let q = walk[(c * 7 + run * 13) % walk.length]; m.RT.ca = null;
          for (let s = 0; s < 30; s++) {
            P.x = q.x; P.y = q.y; const cam = m.camStep(); tiles++;
            if (q.x * 48 < cam.x || (q.x + 1) * 48 > cam.x + 450 || q.y * 48 < cam.y || (q.y + 1) * 48 > cam.y + 532) bad.push({ c, q, cam });
            const nb = walk.filter((o) => Math.abs(o.x - q.x) + Math.abs(o.y - q.y) === 1); if (nb.length) q = nb[(s * 5 + c) % nb.length];
          }
        }
      }
      return { cells, tiles, bad: bad.slice(0, 3), nbad: bad.length };
    });
    assert.ok(res.cells >= 40 && res.tiles >= 2000, JSON.stringify({ cells: res.cells, tiles: res.tiles }));
    assert.equal(res.nbad, 0, "explorer outside the view: " + JSON.stringify(res.bad));
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
