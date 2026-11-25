// menu-hero-edge-1 (QA's find in verify-live-152): the pawn within 2 tiles of a place edge is drawn LATER (RT.heroLater); the menu opened over the place, and Wait, drew only drawPatch, so the pawn vanished.
// drawMenu now calls drawHeroLater() after drawPatch. Real Chromium with the page clock held; PW_DIR names the folder holding node_modules/playwright, else skipped.
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
async function enter(browser, url) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=7`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.waitForTimeout(700);
  for (let i = 0; i < 60 && !(await page.evaluate(() => !!(window.__mb.S.exp && window.__mb.S.exp.patch && window.__mb.S.phase === "patch"))); i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500); }   // a slow machine: wait for the place
  return { page, errors };
}
// Stand the pawn at (x, y) (y = "edge": row 0; y = "mid": the middle of the place), open the menu (and Wait if asked), hold the frame.
// Counts the draws of the pawn (RT.heroFn calls) and returns the pixels at the pawn's screen spot with the pawn drawn and with it left out.
async function probe(page, where, waiting) {
  await page.evaluate(([where, waiting]) => {
    const m = window.__mb, P = m.S.exp.patch, lay = m.layout(P.key);
    P.y = where === "edge" ? 0 : Math.floor(lay.h / 2); P.x = where === "edge" ? 1 : Math.floor(lay.w / 2);   // x = 1: the menu card then sits on the far side, clear of the pawn
    m.openMenu(); if (waiting) m.S.ui.waiting = 1;
    window.__calls = 0; window.__mute = false;
    Object.defineProperty(m.RT, "heroFn", { configurable: true, get() { return window.__fn ? (...a) => { if (window.__mute) return; window.__calls++; return window.__fn(...a); } : window.__fn; }, set(f) { window.__fn = f; } });
  }, [where, waiting]);
  await page.waitForTimeout(400);
  const grab = () => page.evaluate(() => new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = 450; c.height = 600; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const p = window.__mb.RT.plScr; const d = x.getImageData(Math.max(0, Math.round(p.x) - 20), Math.max(0, Math.round(p.y) - 40), 40, 44).data; res({ heroLater: window.__mb.RT.heroLater, px: Array.from(d).join(",") }); }; im.src = window.__mb.capture(); }));
  const calls0 = await page.evaluate(() => window.__calls);
  const shown = await grab(); const calls = (await page.evaluate(() => window.__calls)) - calls0;
  await page.evaluate(() => { window.__mute = true; }); await page.waitForTimeout(400);
  const muted = await grab(); await page.evaluate(() => { window.__mute = false; });
  return { heroLater: shown.heroLater, drawn: calls > 0, differs: shown.px !== muted.px };
}

for (const waiting of [false, true]) {
  test(`the pawn at a place edge is drawn under the menu${waiting ? " and while waiting" : ""}`, { skip }, async (t) => {
    let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
    const { server, url } = await serve();
    try {
      const { page, errors } = await enter(browser, url);
      const r = await probe(page, "edge", waiting);
      assert.equal(r.heroLater, true, "the case is reached: the pawn is drawn later (nearEdge)");
      assert.equal(r.drawn, true, "the pawn is drawn in the menu frame");
      assert.equal(r.differs, true, "the pawn's pixels are at RT.plScr");
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
}

test("the pawn away from an edge: drawn in place as before, not a second time under the menu", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url);
    const r = await probe(page, "mid", false);
    assert.equal(r.heroLater, false, "away from the edge the pawn is in the ordinary draw");
    assert.equal(r.drawn, false, "drawHeroLater adds nothing");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
