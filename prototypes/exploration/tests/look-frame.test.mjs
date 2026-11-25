// #168: the menu's Look around frames the whole place and half of each neighbour, as the hold does (rule 2a: the same framing, nothing else).
// Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the test is skipped).
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
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));

test("Look around shows the whole place and half of each neighbour (owner #168)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7`); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
    await page.evaluate(() => { const m = window.__mb; m.startView("look", m.curLay()); });
    await page.waitForTimeout(900);
    assert.equal(await page.evaluate(() => window.__mb.RT.view && window.__mb.RT.view.kind), "look");
    const look = await still(page);
    await page.evaluate(() => { const m = window.__mb; m.RT.view = { kind: "peek", key: m.S.exp.patch.key, at: performance.now() }; });
    await page.waitForTimeout(900);
    const peek = await still(page);
    let diff = 0; for (let i = 0; i < look.data.length; i += 4) if (look.data[i] !== peek.data[i] || look.data[i + 1] !== peek.data[i + 1] || look.data[i + 2] !== peek.data[i + 2]) diff++;
    const share = diff / (look.w * look.h);
    assert.ok(share < 0.06, "Look around is framed as the hold is (the place plus half of each neighbour); differing share " + share.toFixed(3));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
