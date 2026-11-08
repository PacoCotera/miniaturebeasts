// C15: seeing the place (walk slice W§4, W§7): the arrival look, Look over the place, the reveal, the map's miniatures; input consumed during the reveal.
// Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the tests are skipped): the 24 px render is drawn by the baked-place view, which only a browser has.
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
// A fresh page on a seed with the first place just entered: the expedition begun by the first presses, as a player does. motion: false = reduced motion.
async function enter(browser, url, seed, motion) {
  const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: motion ? "no-preference" : "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  return { page, errors };
}
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
const golden = (name, img) => { const r = compareGolden(path.join(path.dirname(fileURLToPath(import.meta.url)), "golden", name), img); assert.ok(r.ok, r.message); };
const st = (page) => page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; return { phase: m.S.phase, view: m.RT.view ? m.RT.view.kind : m.RT.spot ? "spot" : null, x: P && P.x, y: P && P.y, actions: m.S.exp.actions, key: P && P.key, found: P ? !!(m.S.called && m.S.called[m.layout(P.key).cell]) : null }; });
const pressSeq = async (page, keys) => { for (const k of keys) { await page.evaluate((k) => window.__mb.act(k), k); await page.waitForTimeout(30); } };

test("the arrival look: the first entry shows the whole place; a press skips it and is consumed; a found place has none", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, false);
    let s = await st(page); assert.equal(s.phase, "patch", "in a place"); assert.equal(s.view, "arrival", "the arrival look is up on the first entry");
    await page.waitForTimeout(300); golden("c15-arrival.png", await still(page));
    const a0 = s.actions, q0 = [s.x, s.y]; await pressSeq(page, ["up"]);
    s = await st(page); assert.equal(s.view, null, "any press skips to the walking view"); assert.equal(s.actions, a0, "and spends nothing"); assert.deepEqual([s.x, s.y], q0, "and does not walk");
    await page.waitForTimeout(300);
    const p0 = [s.x, s.y]; await pressSeq(page, ["up"]); await page.waitForTimeout(300); s = await st(page);
    assert.notDeepEqual([s.x, s.y], p0, "the first press was consumed; the next one walks");
    // a found place has no look: leave, find its heart, come back
    await page.evaluate(() => { const m = window.__mb; m.TEST.findHeart(); m.RT.view && m.endView(); m.leavePatch(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500);
    s = await st(page); assert.equal(s.phase, "patch"); assert.equal(s.view, null, "arriving at a found place skips the look");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test("Look over the place: second after Leave, spends no action, ← closes", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, false);
    await pressSeq(page, ["confirm"]); await page.waitForTimeout(300);   // the arrival look away
    await pressSeq(page, ["up", "up", "up", "call"]); await page.waitForTimeout(700);   // some of the place seen: three steps and a Call
    const before = await st(page);
    await pressSeq(page, ["back"]); await page.waitForTimeout(300);
    const items = await page.evaluate(() => window.__mb.menuItems().map((i) => i.id));
    assert.deepEqual(items.slice(0, 2), ["leave", "look"], "Look over the place is second, after Leave");
    await pressSeq(page, ["down", "confirm"]); await page.waitForTimeout(400);
    let s = await st(page); assert.equal(s.phase, "patch"); assert.equal(s.view, "look"); assert.equal(s.actions, before.actions, "no action spent");
    assert.equal(await page.evaluate(() => window.__mb.offPalette().bad.length), 0, "the 24 px picture stays on the palette");
    golden("c15-look-half.png", await still(page));
    await pressSeq(page, ["up", "left"]); await page.waitForTimeout(300);
    s = await st(page); assert.equal(s.view, "look", "the pad does not close it (← does)") ; await pressSeq(page, ["back"]); await page.waitForTimeout(300);
    s = await st(page); assert.equal(s.view, null, "← closes"); assert.equal(s.actions, before.actions); assert.deepEqual([s.x, s.y], [before.x, before.y]);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test("the reveal plays once per place, takes every press while it dissolves, holds, and a miniature follows", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, true);
    await pressSeq(page, ["confirm"]); await page.waitForTimeout(300);
    let s = await st(page); assert.equal(s.view, null);
    const cell = await page.evaluate(() => window.__mb.layout(window.__mb.S.exp.patch.key).cell);
    assert.equal(await page.evaluate((c) => !!window.__mb.miniatureOf(c, 72), cell), false, "no miniature before the heart is found");
    const veiledBefore = await page.evaluate(() => { const m = window.__mb, k = m.S.exp.patch.key, l = m.layout(k); let n = 0; for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (l.reach[y * l.w + x] && !m.unveiled(k, x, y)) n++; return n; });
    assert.ok(veiledBefore > 20, "the place is mostly veiled before the find: " + veiledBefore);
    await page.evaluate(() => window.__mb.TEST.findHeart());
    s = await st(page); assert.equal(s.view, "spot", "the spot comes first, in the walking view"); assert.equal(s.found, true);
    const p0 = [s.x, s.y], a0 = s.actions;
    await pressSeq(page, ["left", "right", "up", "down", "confirm", "call", "back"]);   // the spot and the dissolve take no press
    s = await st(page); assert.ok(s.view === "spot" || s.view === "reveal", "still in the reveal: " + s.view); assert.deepEqual([s.x, s.y], p0); assert.equal(s.actions, a0);
    await page.waitForTimeout(2300);
    assert.equal(await page.evaluate(() => window.__mb.offPalette().bad.length), 0, "the held picture stays on the palette");
    s = await st(page); assert.equal(s.view, "reveal", "it holds until ✓ or ←");
    golden("c15-reveal-held.png", await still(page));
    const left = await page.evaluate(() => { const m = window.__mb, k = m.S.exp.patch.key, l = m.layout(k); let n = 0; for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (l.reach[y * l.w + x] && !m.unveiled(k, x, y)) n++; return n; });
    assert.equal(left, 0, "the whole place's veil is lifted");
    await pressSeq(page, ["up", "left", "down"]); await page.waitForTimeout(300);   // an arrow in the hold is consumed and blinks the line; it does not close
    s = await st(page); assert.equal(s.view, "reveal", "arrows keep the hold"); assert.deepEqual([s.x, s.y], p0); assert.equal(s.actions, a0);
    await pressSeq(page, ["confirm"]); await page.waitForTimeout(500);
    s = await st(page); assert.equal(s.view, null, "✓ closes it back to the walking view"); assert.deepEqual([s.x, s.y], p0, "and is consumed, not queued"); assert.equal(s.actions, a0);
    await pressSeq(page, ["up"]); await page.waitForTimeout(300);
    assert.notDeepEqual([(await st(page)).x, (await st(page)).y], p0, "the next press walks");
    // once per place
    await page.evaluate(() => window.__mb.TEST.findHeart()); s = await st(page); assert.equal(s.view, null, "found places do not play it again");
    // the miniature
    const mini = await page.evaluate((c) => { const cv = window.__mb.miniatureOf(c, 72); return cv && [cv.width, cv.height]; }, cell);
    assert.deepEqual(mini, [72, 72], "a miniature stands on the found cell");
    const mini48 = await page.evaluate((c) => { const cv = window.__mb.miniatureOf(c, 48); return cv && [cv.width, cv.height]; }, cell);
    assert.deepEqual(mini48, [48, 48]);
    await page.evaluate(() => { const m = window.__mb; m.leavePatch(); });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__mb.offPalette().bad.length), 0, "the reach view with a miniature stays on the palette");
    // a second place found: a step to a neighbour, in, the heart found (the reveal away), out: two miniatures
    const dir = await page.evaluate(() => { const m = window.__mb, ex = m.S.exp; return ["up", "right", "down", "left"].find((d) => m.canStep(ex.pos, d)); });
    await pressSeq(page, [dir]); await page.waitForTimeout(400); await pressSeq(page, ["confirm"]); await page.waitForTimeout(500); await pressSeq(page, ["up"]); await page.waitForTimeout(300);
    await page.evaluate(() => { const m = window.__mb; m.TEST.findHeart(); m.RT.view && m.endView(); m.leavePatch(); });
    await page.waitForTimeout(500);
    const minis = await page.evaluate(() => { const m = window.__mb; return m.S.exp.reach.filter((c) => m.miniatureOf(c, 72)).length; });
    assert.equal(minis, 2, "two found places wear their miniatures");
    await page.evaluate(() => { const m = window.__mb; m.FX.msg = ""; m.FX.notes = []; m.FX.hintNote = null; m.FX.sign = null; });   // nothing timed on the screen (a note's fade, a hint) when the still is taken
    await page.emulateMedia({ reducedMotion: "reduce" });   // the map's signs blink on the clock (a beat's two frames): the still is taken with motion held, so it never depends on timing
    await page.waitForTimeout(900);
    golden("c15-reach-two-minis.png", await still(page));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

// Held-clock stills: TEST.at holds the reveal's clock, so the spot, the zoom out and the dissolve are pictures that never depend on timing.
const amberIn = (img) => { let n = 0; for (let y = 32; y < 564; y++) for (let x = 0; x < img.w; x++) { const i = (y * img.w + x) * 4; if (img.data[i] === 255 && img.data[i + 1] === 168 && img.data[i + 2] === 63) n++; } return n; };
test("the reveal's frames: the spot rings the heart, the zoom out and dissolve are stills, Look over a found place shows the held card", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, true);
    await pressSeq(page, ["confirm"]); await page.waitForTimeout(300);
    const base = amberIn(await still(page));
    await page.evaluate(() => { const m = window.__mb; m.TEST.at = 450; m.TEST.findHeart(3); });   // 450 ms into the spot: both rings out
    await page.waitForTimeout(400);
    let s = await st(page); assert.equal(s.view, "spot");
    const spot = await still(page);
    assert.ok(amberIn(spot) > base + 60, "amber ring pixels at the heart in the spot frame: " + base + " -> " + amberIn(spot));
    golden("reveal-spot.png", spot);
    const p0 = [s.x, s.y]; await pressSeq(page, ["up", "left", "confirm"]); s = await st(page); assert.deepEqual([s.x, s.y], p0, "a press during the spot changes nothing");
    await page.evaluate(() => { const m = window.__mb, sp = m.RT.spot; m.RT.spot = null; m.startView("reveal", m.layout(sp.key), { ...sp.extra, go: 1, zoom: 1 }); m.TEST.at = 100; });
    await page.waitForTimeout(300); golden("reveal-zoom.png", await still(page));
    await page.evaluate(() => { window.__mb.TEST.at = 500; }); await page.waitForTimeout(300);
    s = await st(page); assert.equal(s.view, "reveal"); await pressSeq(page, ["confirm"]); s = await st(page); assert.equal(s.view, "reveal", "✓ in the dissolve does not close it");
    await page.evaluate(() => { window.__mb.TEST.at = 2000; }); await page.waitForTimeout(300);
    await pressSeq(page, ["confirm"]); await page.waitForTimeout(500);
    await page.evaluate(() => { window.__mb.TEST.at = null; });
    s = await st(page); assert.equal(s.view, null, "✓ closes the held card");
    // Look over the place at a found place: the same card, no dissolve; ← closes
    await pressSeq(page, ["back"]); await page.waitForTimeout(300);
    await pressSeq(page, ["down", "confirm"]); await page.waitForTimeout(400);
    s = await st(page); assert.equal(s.view, "look");
    const card = await still(page); assert.ok(amberIn(card) > 100, "the amber ring and card border show");
    golden("look-found.png", card);
    await pressSeq(page, ["back"]); await page.waitForTimeout(300);
    s = await st(page); assert.equal(s.view, null, "← closes it");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
