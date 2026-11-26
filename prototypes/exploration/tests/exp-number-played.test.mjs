// Played test (rule 16a) for the expedition number: "an expedition is one Probe outing that seals one crate" (owner 2025-10-25 22:19).
// Two expeditions in one trip on a fresh world, 412x915: set out, walk, End expedition at a camp (not night): the card reads "Expedition 1 ended", crate E1;
// the next set-out, with no dock, reads "Expedition 2"; walk and end: "Expedition 2 ended", and the bay holds E1 and E2. Fails on a page where S.expN moves only at night.
// The card's words are drawn from S.report.n and the set-out's from S.expN / S.exp.n (drawTop('Expedition ' + n)): the test reads those, and the crate's n (the "E" + n label).
// PW_DIR names the folder holding node_modules/playwright (without it the test is skipped).
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

test("played at 412x915: a second expedition on the same day is numbered 2, and the bay holds E1 and E2", { skip, timeout: 240000 }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {}), errors = [];
  try {
    const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7`); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    const phase = () => page.evaluate(() => window.__mb.S.phase);
    const confirmTo = async (want) => { for (let i = 0; i < 60 && (await phase()) !== want; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800); } assert.equal(await phase(), want); };
    // a walk: d-pad presses until the Probe has entered a place (the walk explored something), then the Probe is at the flag and End expedition is pressed from the Case
    const walkAndEnd = async () => {
      for (let i = 0; i < 4 && !(await page.evaluate(() => (window.__mb.S.exp.entered || []).length)); i++) {   // Go in (✓) at the flag: the place builds and the walk has entered it
        await page.evaluate(() => window.__mb.act("confirm"));
        for (let j = 0; j < 40 && !(await page.evaluate(() => (window.__mb.S.exp.entered || []).length)); j++) await page.waitForTimeout(500); }
      assert.ok(await page.evaluate(() => (window.__mb.S.exp.entered || []).length), "the walk entered a place");
      await page.evaluate(() => { const m = window.__mb, ex = m.S.exp; ex.fog = null; ex.cargo.e = (ex.cargo.e || 0) + 1; ex.pos = ex.start; m.S.ui.lastPos = ex.pos; });   // back at the flag: End expedition works at the start
      await page.evaluate(() => { const m = window.__mb; m.openCase(true); });
      await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(600);
    };
    await confirmTo("map");
    const n0 = await page.evaluate(() => window.__mb.S.exp.n);
    assert.equal(n0, 1, "the first set-out reads Expedition 1");
    await walkAndEnd();
    const r1 = await page.evaluate(() => { const m = window.__mb; return { phase: m.S.phase, n: m.S.report.n, turn: m.S.turn, crates: m.S.bay.map((c) => c.n) }; });
    assert.equal(r1.phase, "sealed"); assert.equal(r1.n, 1, "the card reads Expedition 1 ended"); assert.deepEqual(r1.crates, [1], "crate E1");
    assert.equal(await page.evaluate(() => window.__mb.S.day.camps), 1, "a camp, not night: the day waits");
    // the next expedition, with no dock
    await confirmTo("map");   // ✓ from the sealed screen on to the next set-out
    const n1 = await page.evaluate(() => { const m = window.__mb; return { exp: m.S.exp && m.S.exp.n, expN: m.S.expN, turn: m.S.turn }; });
    assert.equal(n1.exp, 2, "the set-out reads Expedition 2"); assert.equal(n1.turn, r1.turn, "the world did not turn between them");
    await walkAndEnd();
    const r2 = await page.evaluate(() => { const m = window.__mb; return { phase: m.S.phase, n: m.S.report.n, crates: m.S.bay.map((c) => c.n), ids: m.S.bay.map((c) => c.id) }; });
    assert.equal(r2.phase, "sealed"); assert.equal(r2.n, 2, "the card reads Expedition 2 ended"); assert.deepEqual(r2.crates, [1, 2], "the bay shows E1 and E2");
    assert.equal(new Set(r2.ids).size, 2, "two crates, two ids");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
