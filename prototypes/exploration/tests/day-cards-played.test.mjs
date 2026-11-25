// Played test (rule 16a) for the night and dawn cards: the real page at 412 and 522 wide, the real card pictures loaded,
// the Companion driven by presses until the clock reaches night and then dawn; the card is up, and gone after one press.
// PW_DIR names the folder holding node_modules/playwright (without it the test is skipped).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAY } from "../src/words.mjs";

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

for (const [w, h] of [[412, 915], [522, 935]]) {
  test(`played at ${w}: the night card and the dawn card each come up and go after one press`, { skip, timeout: 120000 }, async () => {
    const { server, url } = await serve(), browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {}), errors = [];
    try {
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${url}?seed=7`); await page.waitForTimeout(1200);
      await page.evaluate(() => { window.__mb.TEST.calm = true; });
      for (let i = 0; i < 60 && (await page.evaluate(() => window.__mb.S.phase)) !== "map"; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(1000); }
      assert.equal(await page.evaluate(() => window.__mb.S.phase), "map");
      assert.equal(await page.evaluate(() => Object.keys(window.__mb.CARD_ART).sort().join()), "dawn,dusk,night", "the three real pictures loaded");
      const cardNow = () => page.evaluate(() => window.__mb.FX.card && window.__mb.FX.card.k);
      const setSpent = (v) => page.evaluate((v) => { const m = window.__mb; m.S.exp.fog = null; m.S.day.spent = v; }, v);
      // one press-driven step at a time, passing any card that comes up, until the wanted card shows (or the steps run out)
      const playUntil = async (want) => {
        for (const dir of ["right", "down", "left", "up", "right", "down", "left", "up"]) {
          if (await cardNow()) return await cardNow();
          await page.evaluate((d) => { window.__mb.press(d); window.__mb.release(d); }, dir); await page.waitForTimeout(400);
          const k = await cardNow(); if (k === want) return k;
          if (k) { await page.evaluate(() => window.__mb.press("back")); await page.waitForTimeout(200); }
        }
        return await cardNow();
      };
      await setSpent(DAY.parts.slice(0, 5).reduce((a, q) => a + q[1], 0) - 1);
      assert.equal(await playUntil("night"), "night", "the night card is up");
      await page.evaluate(() => window.__mb.press("back")); await page.waitForTimeout(300);
      assert.equal(await cardNow(), null, "gone after one press");
      await setSpent(DAY.light - 1);
      assert.equal(await playUntil("dawn"), "dawn", "the dawn card is up when the night passes");
      // the world turn's news (nightPassed + turned.lines: pods, young, bloom) is queued before the card covers the frame
      const newsBefore = await page.evaluate(() => window.__mb.FX.notes.map((n) => n.text));
      assert.ok(newsBefore.length >= 1 && newsBefore.some((t) => /dawn/i.test(t)), "the night-passed line is queued behind the card: " + JSON.stringify(newsBefore));
      await page.evaluate(() => window.__mb.press("back")); await page.waitForTimeout(300);
      assert.equal(await cardNow(), null, "gone after one press");
      // after the press that passes the dawn card, every news line is still in the message box (shown, or held for the next action)
      const newsAfter = await page.evaluate(() => { const m = window.__mb, FX = m.FX; return { msg: FX.msg || "", notes: FX.notes.map((n) => n.text), held: (FX.held || []).map((n) => n.text) }; });
      for (const t of newsBefore) assert.ok(newsAfter.msg.includes(t) || newsAfter.notes.includes(t) || newsAfter.held.includes(t), "morning news kept after the press: " + t + " in " + JSON.stringify(newsAfter));
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
}
