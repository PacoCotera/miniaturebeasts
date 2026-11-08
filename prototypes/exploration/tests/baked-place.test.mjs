// C7: a baked place in the page (place design A4.2, A6): ?place=<id> plays prototypes/places/baked/<id>.mbplace in every land cell of a generator 5 world.
// Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the browser tests are skipped).
//   draws and walks: the ground, props and canopy come from the baked data, the page's own colours stay clean (offPalette), two page stills;
//   speed: the mean drawPatch time of a baked place against a generated one, seeds 7, 13, 42, 300 calls (the README's method);
//   the page without ?place= is the page it was.
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

// The repository root, with drawPatch added to the page's test hooks (timing needs to call it; nothing else changes).
async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    let body = readFileSync(p);
    if (p.endsWith("exploration/index.html")) body = Buffer.from(body.toString().replace("window.__mb = { get S()", "window.__mb = { drawPatch, get S()"));
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html` };
}

// A fresh page on a seed, an expedition begun and the first place entered (the same presses as measure-warm.mjs).
async function enter(browser, url, seed, place) {
  const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=${seed}${place ? "&place=" + place : ""}`);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  return { page, errors };
}
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
const golden = (name, img) => { const r = compareGolden(path.join(path.dirname(fileURLToPath(import.meta.url)), "golden", name), img); assert.ok(r.ok, r.message); };

test("?place=Test_AllCases draws the baked place in a generator 5 world, the page's colours stay clean, and the walking view matches its still", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, "Test_AllCases");
    const st = await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key); return { phase: m.S.phase, baked: lay.baked, ts: m.RT.ts, w: lay.w, h: lay.h, heart: !!lay.heart, off: m.offPalette() }; });
    assert.equal(st.phase, "patch");
    assert.deepEqual(st.baked, { id: "Test_AllCases", ox: 5, oy: 5, w: 18, h: 22 });
    assert.equal(st.ts, 48);
    assert.deepEqual(st.off.bad, [], "no pixel off the palette: " + JSON.stringify(st.off));
    assert.ok(st.heart, "the place's heart is on the layout");
    // the explorer walks: one step changes the place's position and the picture
    const before = await still(page);
    const pos0 = await page.evaluate(() => { const P = window.__mb.S.exp.patch; return [P.x, P.y]; });
    for (const k of ["up", "up", "right"]) { await page.evaluate((k) => window.__mb.act(k), k); await page.waitForTimeout(260); }
    const pos1 = await page.evaluate(() => { const P = window.__mb.S.exp.patch; return [P.x, P.y]; });
    assert.notDeepEqual(pos1, pos0, "the explorer moved");
    assert.notDeepEqual(Array.from((await still(page)).data), Array.from(before.data), "and the view with it");
    assert.deepEqual(await page.evaluate(() => window.__mb.offPalette().bad), []);
    // the still: a fresh page at the start, the whole 450 x 600 screen, the survey veil as the world gives it
    const { page: p2 } = await enter(browser, url, 7, "Test_AllCases");
    await p2.waitForTimeout(500);
    golden("baked-walk.png", await still(p2));
    // under a canopy: the explorer stood behind the tree on (3, 3), the crown dithered away round it
    await p2.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; m.S.veil[P.key] = new Array(m.PH).fill(0x0FFFFFFF); P.x = 8; P.y = 7; });   // the veil lifted, so the tree shows
    await p2.waitForTimeout(700);
    golden("baked-canopy.png", await still(p2));
    assert.deepEqual(await p2.evaluate(() => window.__mb.offPalette().bad), []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test("the page without ?place= draws its generated places as before", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, null);
    const st = await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key); return { baked: lay.baked, w: lay.w, ts: m.RT.ts, off: m.offPalette().bad }; });
    assert.equal(st.baked, undefined);
    assert.deepEqual(st.off, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test("a baked place draws in no more than 1.2 times the time of a generated one (mean drawPatch over 300 calls, seeds 7, 13, 42)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  const mean = async (seed, place) => {
    const { page } = await enter(browser, url, seed, place);
    // the best of four runs of 300 calls: a load spike on a shared machine only makes a run slower
    const ms = await page.evaluate(() => { const m = window.__mb, out = []; for (let r = 0; r < 4; r++) { const t0 = performance.now(); for (let i = 0; i < 300; i++) m.drawPatch(1); out.push((performance.now() - t0) / 300); } return out; });
    await page.close();
    return Math.min(...ms);
  };
  try {
    const rows = [];
    for (const seed of [7, 13, 42]) rows.push({ seed, generated: await mean(seed, null), baked: await mean(seed, "Test_AllCases") });
    console.log("drawPatch mean ms (best of 4 x 300): " + rows.map((r) => `seed ${r.seed}: generated ${r.generated.toFixed(3)}, baked ${r.baked.toFixed(3)}`).join(" | "));
    for (const r of rows) assert.ok(r.baked <= r.generated * 1.2, `seed ${r.seed}: baked ${r.baked.toFixed(3)} ms against generated ${r.generated.toFixed(3)} ms`);
  } finally { await browser.close(); server.close(); }
});
