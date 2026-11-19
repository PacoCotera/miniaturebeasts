// A border step ends in the new place (place, phase and the pawn's line the same as before the slide existed), and a tap made inside the slide is held and played once the slide is over (never lost).
// Real Chromium; PW_DIR names the folder holding node_modules/playwright (without it the test is skipped).
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

const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const CROSS = `async () => {
  const m = window.__mb, raf = () => new Promise((q) => requestAnimationFrame(q)), wait = (ms) => new Promise((q) => setTimeout(q, ms));
  if (m.S.phase === "map") { m.act("confirm"); await wait(300); }
  for (let tries = 0; tries < 12; tries++) {
    const P = m.S.exp.patch, lay = m.layout(P.key), bk = lay.baked;
    const o = bk && (lay.openings || []).find((q) => m.openingKind(lay, q).kind === "open");
    if (o) {
      const dir = { N: "up", S: "down", W: "left", E: "right" }[o.side], k = Math.floor((o.from + o.to) / 2);
      P.x = o.side === "W" ? 0 : o.side === "E" ? lay.w - 1 : k + bk.ox; P.y = o.side === "N" ? 0 : o.side === "S" ? lay.h - 1 : k + bk.oy;
      await wait(400);
      m.TEST.clock = performance.now(); await raf(); await raf();
      const from = m.S.exp.pos, back = ${JSON.stringify(OPPOSITE)}[dir];
      m.act(dir, "creep"); await raf(); await raf();
      const sl = m.FX.slide; if (!sl) return { noSlide: true };
      const mid = { pos: m.S.exp.pos, phase: m.S.phase, key: m.S.exp.patch && m.S.exp.patch.key };
      m.press(back); m.release(back);   // a tap inside the slide
      const held = m.FX.slideKey;
      m.TEST.clock = sl.at + 400; await raf(); await raf(); await raf(); await wait(50); await raf();
      return { dir, back, from, mid, held, after: { pos: m.S.exp.pos, phase: m.S.phase, key: m.S.exp.patch && m.S.exp.patch.key }, slideOver: !m.FX.slide, leftKey: m.FX.slideKey || null };
    }
    const dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(m.S.exp.pos, d)); m.leavePatch(); m.act(dirs[tries % dirs.length]); await wait(200); m.act("confirm"); await wait(300);
  }
  return null;
}`;

test("a border step ends in the new place and a tap in the slide is held", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7`); await page.waitForTimeout(800);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    for (let i = 0; i < 12 && !(await page.evaluate(() => !!window.__mb.S.exp)); i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500); }   // confirm through setup and the place's view until the expedition stands
    await page.waitForTimeout(800);
    const r = await page.evaluate(`(${CROSS})()`);
    assert.deepEqual(errors, []);
    assert.ok(r && !r.noSlide, "a crossing with a slide was found: " + JSON.stringify(r));
    assert.equal(r.mid.phase, "patch", "the step ends in a place, not on the map: " + JSON.stringify(r));
    assert.notEqual(r.mid.pos, r.from, "the explorer stands in the next place: " + JSON.stringify(r));
    assert.equal(r.held, r.back, "the tap inside the slide is held: " + JSON.stringify(r));
    assert.ok(r.slideOver && r.leftKey === null, "the slide is over and the held tap was taken: " + JSON.stringify(r));
  } finally { await browser.close(); server.close(); }
});
