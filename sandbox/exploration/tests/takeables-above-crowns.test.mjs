// Walk content B1: what a player can take is never hidden. A charged storm stone placed under a tree's crown in a generator 7 place still has its own
// pixels on screen (it is drawn after the crowns, as pods are); a plain stone under the same crown is covered, as it was.
// The fixture is the first place of seed 7 (the baked fixture place and its switch went with 21d47a30f): the tiles are found in the layout, a free open tile and a tile under a crown (lay.clear 0).
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

// The walk's first place (seed 7), the page's clock held (TEST.clock). Returns the page and the tiles found in its layout: free ones in the open, and under a crown. Each has a tile four rows below it to stand on.
async function open(browser, url, reduced) {
  const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: reduced ? "reduce" : "no-preference" })).newPage();
  await page.goto(`${url}?seed=7`);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
  await page.waitForTimeout(250);
  const spots = await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key), out = { open: [], crown: [] };
    const walk = (x, y) => x >= 0 && y >= 0 && x < lay.w && y < lay.h && !m.T_BLOCK[lay.tiles[y * lay.w + x]];
    for (let y = 5; y < lay.h - 6; y++) for (let x = 5; x < lay.w - 5; x++) { if (!walk(x, y) || !walk(x, y + 4) || lay.feats.some((f) => f.x === x && f.y === y)) continue; (lay.clear[y * lay.w + x] ? out.open : out.crown).push([x, y]); }
    return out; });
  return { page, spots };
}
const shot = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
// feat (or none) at tile T, the explorer four rows below it, the veil lifted; found: the place counts as walked
async function setUp(page, T, feat, found, settle = 700) {
  await page.evaluate(([T, feat, found]) => {
    const m = window.__mb, P = m.S.exp.patch, lay = m.layout(P.key);
    lay.feats = lay.feats.filter((f) => !f.id.startsWith("t-test")); if (feat) lay.feats.push({ ...feat, x: T[0], y: T[1] });
    m.S.veil[P.key] = new Array(m.PH).fill(0x0FFFFFFF); P.x = T[0]; P.y = T[1] + 4;
    m.S.called = found ? { [lay.cell]: 1 } : {};
  }, [T, feat, found]);
  await page.waitForTimeout(settle);   // the camera settles on the explorer
}
const frameAt = async (page, clock) => { await page.evaluate((c) => { window.__mb.TEST.clock = c; }, clock); await page.waitForTimeout(120); return shot(page); };
// The tile's screen box: the explorer's own screen spot, the tile four rows above it.
const tileBox = (page, T) => page.evaluate((T) => { const m = window.__mb, P = m.S.exp.patch, p = m.RT.plScr; return { x: Math.round(p.x) - 24 + (T[0] - P.x) * 48, y: Math.round(p.y) - 24 + (T[1] - P.y) * 48 }; }, T);
const diffIn = (a, b, bx, by, w, h) => { let n = 0; for (let y = Math.max(0, by); y < Math.min(a.h, by + h); y++) for (let x = Math.max(0, bx); x < Math.min(a.w, bx + w); x++) { const i = (y * a.w + x) * 4; if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++; } return n; };

test("a charged stone that is not the heart keeps a bolt over it; a stone with no charge has none", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const { page, spots } = await open(browser, url, true), T = spots.open[0]; assert.ok(T, "a free open tile in the first place");
    await setUp(page, T, { id: "t-test", kind: "k", ch: 3 }, true);
    await page.waitForTimeout(500);
    const charged = await shot(page), b = await tileBox(page, T);
    await setUp(page, T, { id: "t-test", kind: "k", ch: 0 }, true);
    await page.waitForTimeout(500);
    const plain = await shot(page);
    // the strip just above the tile belongs to the bolt alone: the stone's own pixels lie inside the tile
    assert.ok(diffIn(charged, plain, b.x, b.y - 12, 48, 12) > 10, "a bolt over the charged stone, above its tile");
  } finally { await browser.close(); server.close(); }
});

test("once the place is walked a takeable glints 400 ms in every 1.6 s, and never under reduced motion", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const cup = { id: "t-test", kind: "u", full: true };
    const run = async (reduced) => {
      const { page, spots } = await open(browser, url, reduced), T = spots.open[0]; assert.ok(T, "a free open tile in the first place");
      await setUp(page, T, cup, false); const b = await tileBox(page, T);
      let on = 0;
      for (let c = 0; c < 1600; c += 200) {
        await setUp(page, T, cup, false, 60); const quiet = await frameAt(page, 100000 + c);
        await setUp(page, T, cup, true, 60); const found = await frameAt(page, 100000 + c);
        if (diffIn(quiet, found, b.x, b.y, 48, 48) > 0) on++;
      }
      return on;
    };
    const moving = await run(false), still = await run(true);
    assert.ok(moving >= 1 && moving <= 3, `the glint is on for about a quarter of the cycle (${moving} of 8 steps)`);
    assert.equal(still, 0, "no glint under reduced motion");
  } finally { await browser.close(); server.close(); }
});

test("a charged stone under a crown has its own pixels on screen, a plain one stays covered", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const { page, spots } = await open(browser, url, true);
    // the diff is over the whole view; the fixture tile is the first crown tile whose plain stone leaves the view as it is without any stone (the crown covers it all)
    const diff = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++; return n; };
    let found = null;
    for (const T of spots.crown) {
      await setUp(page, T, null, true); const gone = await shot(page);
      await setUp(page, T, { id: "t-test", kind: "k", ch: 0 }, true); const plain = await shot(page);
      if (diff(plain, gone) === 0) { found = { T, gone, plain }; break; }
    }
    assert.ok(found, `a tile under a crown that covers a plain stone (${spots.crown.length} crown tiles tried)`);
    await setUp(page, found.T, { id: "t-test", kind: "k", ch: 3 }, true); const charged = await shot(page);
    const dCharged = diff(charged, found.gone), dPlain = diff(found.plain, found.gone);
    assert.ok(dCharged > 60, `the charged stone shows on screen (${dCharged} pixels differ from the view without it)`);
    assert.ok(dCharged > dPlain * 2, `and shows far more than a plain stone under the crown (${dPlain})`);
  } finally { await browser.close(); server.close(); }
});
