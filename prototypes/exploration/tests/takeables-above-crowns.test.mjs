// Walk content B1: what a player can take is never hidden. A charged storm stone placed under a tree's crown in a baked place still has its own
// pixels on screen (it is drawn after the crowns, as pods are); a plain stone under the same crown is covered, as it was.
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

test("a charged stone under a crown has its own pixels on screen, a plain one stays covered", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
    await page.addInitScript(() => { try { localStorage.setItem("mb-options", JSON.stringify({ place: "Test_AllCases" })); } catch { /* none */ } });
    await page.goto(`${url}?seed=7`);
    await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
    await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
    await page.waitForTimeout(250);
    // the fixture's broad tree at place (3, 3) hangs its crown over place cells (2..4, 1..2); the page cell is +(5, 5). The explorer stands well away from it.
    const grab = async (ch) => {
      await page.evaluate((ch) => {
        const m = window.__mb, P = m.S.exp.patch, lay = m.layout(P.key);
        lay.feats = lay.feats.filter((f) => f.id !== "t-test");
        lay.feats.push({ id: "t-test", kind: "k", x: 8, y: 6, ch });
        m.S.veil[P.key] = new Array(m.PH).fill(0x0FFFFFFF); P.x = 8; P.y = 11;
      }, ch);
      await page.waitForTimeout(700);
      return decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
    };
    const charged = await grab(3), plain = await grab(0), gone = await (async () => { await page.evaluate(() => { const lay = window.__mb.layout(window.__mb.S.exp.patch.key); lay.feats = lay.feats.filter((f) => f.id !== "t-test"); }); await page.waitForTimeout(500); return decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64")); })();
    // count the pixels that differ from the view without the stone, over the stone's whole tile block (a 48 px tile at 1x, the view starts below the HUD)
    const diff = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++; return n; };
    if (process.env.DUMP_DIR) { const { writeFileSync } = await import("node:fs"); for (const [n, im] of Object.entries({ charged, plain, gone })) writeFileSync(path.join(process.env.DUMP_DIR, n + ".png"), (await import("../../places/src/png.mjs")).encodePng(im)); }
    const dCharged = diff(charged, gone), dPlain = diff(plain, gone);
    assert.ok(dCharged > 60, `the charged stone shows on screen (${dCharged} pixels differ from the view without it)`);
    assert.ok(dCharged > dPlain * 2, `and shows far more than a plain stone under the crown (${dPlain})`);
  } finally { await browser.close(); server.close(); }
});
