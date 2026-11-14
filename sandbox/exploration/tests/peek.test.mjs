// B4: the peek. Hold Call about 0.4 s = the whole place on one screen while held; release = the walk again at once, pixel-equal. A short press is Call, fired on release.
// Free: no action, no Energy, nothing moves, nothing found. Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the tests are skipped).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
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
// A fresh page in the first place, the arrival look away and a few steps and a Call made. motion: false = reduced motion (a cut, and a held clock so stills compare).
async function enter(browser, url, seed, motion) {
  const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: motion ? "no-preference" : "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  for (const k of ["confirm", "up", "call"]) { await page.evaluate((k) => window.__mb.act(k), k); await page.waitForTimeout(350); }
  await page.waitForTimeout(700);
  return { page, errors };
}
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
const same = (a, b) => a.w === b.w && a.h === b.h && Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0;
const st = (page) => page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; return { phase: m.S.phase, view: m.RT.view ? m.RT.view.kind : null, x: P.x, y: P.y, actions: m.S.exp.actions, calls: m.S.exp.stats.calls || 0, energy: m.S.energy }; });

test("hold Call: the whole place while held, the walk back at once and pixel-equal, nothing spent (pointer)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, false);
    const s0 = await st(page); assert.equal(s0.view, null, "walking");
    const walk = await still(page);
    await page.evaluate(() => window.__mb.press("call"));
    await page.waitForTimeout(150); assert.equal((await st(page)).view, null, "not yet: under the hold time it is still a press");
    await page.waitForTimeout(450);
    const s1 = await st(page); assert.equal(s1.view, "peek", "held past 0.4 s: the whole place");
    const whole = await still(page); assert.ok(!same(whole, walk), "the whole place is not the walking view");
    await page.waitForTimeout(600); assert.equal((await st(page)).view, "peek", "it stays for as long as it is held");
    await page.evaluate(() => window.__mb.act("up")); assert.deepEqual([(await st(page)).x, (await st(page)).y], [s0.x, s0.y], "other presses are consumed");
    await page.evaluate(() => window.__mb.release("call"));
    const s2 = await st(page); assert.equal(s2.view, null, "release: the walk at once");
    await page.waitForTimeout(80);   // one frame to paint it (capture reads the last painted frame)
    assert.ok(same(await still(page), walk), "pixel-equal to the walk before");
    assert.deepEqual([s2.x, s2.y, s2.actions, s2.calls, s2.energy], [s0.x, s0.y, s0.actions, s0.calls, s0.energy], "no turn, no Energy, no Call fired, no step");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test("a short press is Call, fired on release; the keyboard holds the same way", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, true);
    const s0 = await st(page);
    await page.evaluate(() => window.__mb.press("call")); await page.waitForTimeout(120);
    let s = await st(page); assert.equal(s.calls, s0.calls, "not fired on press");
    await page.evaluate(() => window.__mb.release("call")); await page.waitForTimeout(100);
    s = await st(page); assert.equal(s.calls, s0.calls + 1, "fired on release, once"); assert.equal(s.view, null); assert.equal(s.actions, s0.actions + 1, "a Call is an action");
    await page.waitForTimeout(500);
    const s1 = await st(page);   // (pixel equality is checked in the first test, with the clock held; here the grass moves)
    await page.keyboard.down("c"); await page.waitForTimeout(700);
    assert.equal((await st(page)).view, "peek", "the C key held: the whole place (motion on: still a cut)");
    await page.keyboard.up("c"); await page.waitForTimeout(100);
    s = await st(page); assert.equal(s.view, null); assert.equal(s.calls, s1.calls, "no Call after a hold"); assert.equal(s.actions, s1.actions);
    await page.keyboard.down("c"); await page.waitForTimeout(100); await page.keyboard.up("c"); await page.waitForTimeout(100);
    assert.equal((await st(page)).calls, s1.calls + 1, "a short key press is a Call");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

// The staged scene (seed 7's first place): the lower half uncovered; returns the tiles used. `what`: which of pod, tuft, fruit, buried to lay.
const stage = (page, what) => page.evaluate((what) => {
  const m = window.__mb, S = m.S, P = S.exp.patch, key = P.key, lay = m.layout(key), live = S.exp.live[key];
  const veil = S.veil[key] = S.veil[key] || new Array(lay.h).fill(0);
  for (let y = 13; y < lay.h; y++) veil[y] = 0x0fffffff;
  const free = (x, y) => x > 0 && y > 0 && x < lay.w - 1 && y < lay.h - 1 && lay.reach[y * lay.w + x] && !m.occupant(key, x, y) && !(P.x === x && P.y === y);
  const near = (x0, y0) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(x0 + dx, y0 + dy)) return { x: x0 + dx, y: y0 + dy }; return null; };
  const pod = near(17, 18), tuft = near(8, 21), fruit = near(15, 22), buried = near(6, 16);
  if (what.includes("pod")) S.pods.push({ id: "mock:pod", k: key, x: pod.x, y: pod.y, sp: 0, h: 0, g: "meadow", how: "mock" });
  if (what.includes("buried")) S.pods.push({ id: "mock:buried", k: key, x: buried.x, y: buried.y, sp: 0, h: 1, g: "meadow", how: "mock" });
  if (what.includes("tuft")) live.tf.push({ id: 900, x: tuft.x, y: tuft.y });
  if (what.includes("fruit")) live.fr.push({ id: live.fid++, x: fruit.x, y: fruit.y });
  S.called[lay.cell] = 1;
  return { pod, tuft, fruit, buried };
}, what);
const heldShot = async (page) => {
  await page.evaluate(() => window.__mb.press("call")); await page.waitForTimeout(700);
  const img = await still(page);
  await page.evaluate(() => window.__mb.release("call")); await page.waitForTimeout(150);
  return img;
};
const diffBox = (a, b) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const i = (y * a.w + x) * 4; if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };

test("hold Call marks the finds: a pod and a tuft get a take mark; a fruit and a buried pod get none; the walk after is pixel-equal; the golden", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 7, false);
    await stage(page, []);   // the lower half uncovered, nothing laid
    const walk0 = await page.waitForTimeout(100).then(() => still(page));
    const base = await heldShot(page);
    assert.ok(same(await still(page), walk0), "release: the walk, pixel-equal");
    // fruit on the ground and a buried pod: no mark, the peek is unchanged
    await stage(page, ["fruit", "buried"]);
    const noMark = await heldShot(page);
    assert.ok(same(noMark, base), "a fruit and a buried pod draw nothing in the peek");
    // a pod: a mark that fits one 26 x 26 box
    await stage(page, ["pod"]);
    const withPod = await heldShot(page);
    const box = diffBox(base, withPod); assert.ok(box, "the pod has a mark"); assert.ok(box.w <= 26 && box.h <= 26, "the mark is one small icon, got " + JSON.stringify(box));
    // a tuft too: a second, separate mark
    await stage(page, ["tuft"]);
    const full = await heldShot(page);
    assert.ok(diffBox(withPod, full), "the tuft has a mark");
    // the golden: the full scene held (reduced motion, seed 7)
    const file = path.join(root, "prototypes/exploration/tests/golden/peek-finds.png");
    const buf = Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64");
    await page.evaluate(() => window.__mb.press("call")); await page.waitForTimeout(700);
    const held = Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64");
    await page.evaluate(() => window.__mb.release("call")); await page.waitForTimeout(150);
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) writeFileSync(file, held);
    else assert.ok(same(decodePng(readFileSync(file)), decodePng(held)), "peek-finds.png differs from the golden");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
