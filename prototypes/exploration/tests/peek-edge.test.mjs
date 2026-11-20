// Bug #58: hold an arrow against a refused step 300 ms and the view slides that way (as far as the call-hold view reaches), holds while held, eases back 250 ms after release.
// Free: nothing in S changes. Real Chromium with the page clock held (TEST.clock); PW_DIR names the folder holding node_modules/playwright, else skipped.
// STILLS=<dir> also writes the three pictures of each edge (390x844): before the hold, at full reach, after the release.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
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
// A fresh page in the first place on a phone, the arrival done; motion false = reduced motion.
async function enter(browser, url, motion) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: motion ? "no-preference" : "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=7`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.waitForTimeout(700);
  return { page, errors };
}
// Walk one way until a press is refused (the peek is armed by that press); the key is then "held": HELD says so, as the key handler does.
async function toBlock(page, dir) {
  for (let i = 0; i < 400; i++) {
    const armed = await page.evaluate((k) => { const m = window.__mb; m.press(k); if (m.PAN.dir) { m.HELD.push(k); return true; } m.release(k); return false; }, dir);
    if (armed) return;
    await page.waitForTimeout(230);
  }
  assert.fail("never blocked going " + dir);
}
const at = async (page, ms) => { await page.evaluate((ms) => { const m = window.__mb; window.__mb.TEST.clock = m.PAN.t0 + ms; }, ms); await page.waitForTimeout(120); };
const pan = (page) => page.evaluate(() => { const m = window.__mb; return { dir: m.PAN.dir, live: m.PAN.live, f: m.panFrac() }; });
const snap = (page) => page.evaluate(() => JSON.stringify(window.__mb.S));
const shot = async (page, dir, name) => { if (process.env.STILLS) { mkdirSync(process.env.STILLS, { recursive: true }); await page.screenshot({ path: path.join(process.env.STILLS, `${dir}-${name}.png`) }); } };

async function run(t, dir, motion) {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return null; }
  const { server, url } = await serve();
  return { browser, server, url };
}

for (const dir of ["up", "right", "down", "left"]) {
  test(`held ${dir} against a refused step: the view slides out to the reach, holds, eases back; S is untouched (motion on)`, { skip }, async (t) => {
    const r = await run(t); if (!r) return; const { browser, server, url } = r;
    try {
      const { page, errors } = await enter(browser, url, true);
      await toBlock(page, dir);
      // the clock held from the press on: PAN.t0 is the press's moment
      await page.evaluate(() => { const m = window.__mb; m.PAN.t0 = m.PAN.at; m.TEST.clock = m.PAN.at; });
      await page.waitForTimeout(150);
      const before = await snap(page); await shot(page, dir, "1-before");
      await at(page, 299); assert.equal((await pan(page)).live, false, "under 300 ms it is still a refusal");
      await at(page, 300); await page.waitForTimeout(80);
      const p0 = await pan(page); assert.equal(p0.live, true, "300 ms held: the peek begins"); assert.equal(p0.f, 0);
      await page.evaluate(() => { const m = window.__mb; m.PAN.t0 = m.PAN.at; });
      for (const ms of [73, 161]) {   // bug #92: mid-slide the place sits on whole pixels (the baked ground copies its window by rows; a fractional y broke every row)
        await at(page, ms); const g = await page.evaluate(() => window.__mb.RT.gridScr);
        assert.ok(Number.isInteger(g.x) && Number.isInteger(g.y), `whole pixels at ${ms} ms: ${JSON.stringify(g)}`); }
      await at(page, 125); const mid = (await pan(page)).f; assert.ok(mid > 0 && mid < 1, "easing out: " + mid);
      await at(page, 250); assert.equal((await pan(page)).f, 1, "at the reach after 250 ms");
      await at(page, 900); assert.equal((await pan(page)).f, 1, "holds while held"); await shot(page, dir, "2-full-reach");
      assert.equal(await snap(page), before, "nothing in S changed (position, veil, actions, energy)");
      await page.evaluate((k) => { const m = window.__mb; m.HELD.length = 0; m.TEST.clock = m.TEST.clock; m.release(k); m.PAN.t0 = m.TEST.clock; }, dir);
      await at(page, 125); const back = (await pan(page)).f; assert.ok(back > 0 && back < 1, "easing back: " + back);
      await at(page, 250); await page.waitForTimeout(80); assert.deepEqual(await pan(page), { dir: null, live: false, f: 0 }, "back at 0 by 250 ms"); await shot(page, dir, "3-after");
      assert.equal(await snap(page), before, "and still nothing changed");
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
}

test("a step that can move does not peek, even held", { skip }, async (t) => {
  const r = await run(t); if (!r) return; const { browser, server, url } = r;
  try {
    const { page } = await enter(browser, url, true);
    const res = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, a = [P.x, P.y]; m.press("down"); m.HELD.push("down"); return { moved: a[0] !== P.x || a[1] !== P.y, pan: m.PAN.dir }; });
    assert.equal(res.pan, null); await page.evaluate(() => { window.__mb.TEST.clock = performance.now(); }); await page.waitForTimeout(100);
    await page.evaluate(() => { window.__mb.TEST.clock += 600; }); await page.waitForTimeout(100);
    assert.equal((await pan(page)).dir, null); assert.equal(res.moved || true, true);
  } finally { await browser.close(); server.close(); }
});

test("another key during a peek ends it (it eases back) and then acts as usual", { skip }, async (t) => {
  const r = await run(t); if (!r) return; const { browser, server, url } = r;
  try {
    const { page } = await enter(browser, url, true);
    await toBlock(page, "up");
    await page.evaluate(() => { const m = window.__mb; m.TEST.clock = m.PAN.at; }); await page.waitForTimeout(100);
    await page.evaluate(() => { window.__mb.TEST.clock += 300; }); await page.waitForTimeout(100);
    await page.evaluate(() => { window.__mb.TEST.clock += 400; }); await page.waitForTimeout(100);
    assert.equal((await pan(page)).f, 1);
    await page.evaluate(() => { const m = window.__mb; m.press("down"); });
    const p = await page.evaluate(() => ({ rel: !!window.__mb.PAN.rel, y: window.__mb.S.exp.patch.y }));
    assert.equal(p.rel, true, "the peek is let go");
  } finally { await browser.close(); server.close(); }
});

test("reduced motion: the view cuts out and cuts back, no ease", { skip }, async (t) => {
  const r = await run(t); if (!r) return; const { browser, server, url } = r;
  try {
    const { page } = await enter(browser, url, false);
    await toBlock(page, "up");
    await page.evaluate(() => { const m = window.__mb; m.TEST.clock = m.PAN.at; }); await page.waitForTimeout(100);
    await page.evaluate(() => { window.__mb.TEST.clock += 300; }); await page.waitForTimeout(100);
    assert.equal((await pan(page)).f, 1, "out at once");
    await page.evaluate(() => { const m = window.__mb; m.HELD.length = 0; m.release("up"); });
    assert.equal((await pan(page)).f, 0, "back at once");
  } finally { await browser.close(); server.close(); }
});

// The DRAW check (bug #58, -2): the picture itself slides. The pawn's screen spot (RT.plScr, from the camera that draws the place) moves by the reach, away from the held key
// (up: y grows, down: y shrinks, left: x grows, right: x shrinks); the view is never left empty; at release it is back where it was.
// the reach (UI desk 11-18): the place's edge in the held direction sits across the middle of the view (half your place, half the neighbour)
// owner note 11-19 (fix-10): ...and the slide stops where the pawn would leave the view: it keeps PAN_MARGIN (72 px) in; h = the pawn's spot in view px before the slide
const M = 72, cap = (r, room) => Math.max(0, Math.min(r, room));
const REACH = { up: (c, l, h) => [0, cap(c.y + 532 / 2, 532 - M - h.y)], down: (c, l, h) => [0, -cap(l.h * 48 - 532 / 2 - c.y, h.y - M)], left: (c, l, h) => [cap(c.x + 450 / 2, 450 - M - h.x), 0], right: (c, l, h) => [-cap(l.w * 48 - 450 / 2 - c.x, h.x - M), 0] };
const plAt = (page) => page.evaluate(() => { const m = window.__mb, p = m.RT.plScr, c = m.camNow(), l = m.layout(m.RT.key); return { x: p.x, y: p.y, c, l: { w: l.w, h: l.h } }; });
const blankPx = (page) => page.evaluate(() => new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = 450; c.height = 600; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 32, 450, 532).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] < 255) n++; res(n); }; im.src = window.__mb.capture(); }));
for (const dir of ["up", "down", "left", "right"]) {
  test(`draw: held ${dir}, the pawn's spot on the canvas moves by the reach, away from the key, and returns at release`, { skip }, async (t) => {
    const r = await run(t); if (!r) return; const { browser, server, url } = r;
    try {
      const { page, errors } = await enter(browser, url, true);
      await toBlock(page, dir);
      await page.evaluate(() => { const m = window.__mb; m.TEST.clock = m.PAN.at; }); await page.waitForTimeout(150);
      const p0 = await plAt(page);
      await page.evaluate(() => { window.__mb.TEST.clock += 300; }); await page.waitForTimeout(150);
      await page.evaluate(() => { window.__mb.TEST.clock += 1000; }); await page.waitForTimeout(150);
      const p1 = await plAt(page), [ex, ey] = REACH[dir](p0.c, p0.l, { x: p0.x, y: p0.y - 32 });
      if (process.env.STILLS) { mkdirSync(process.env.STILLS, { recursive: true }); await page.screenshot({ path: path.join(process.env.STILLS, `${dir}-draw-full-reach.png`) }); }
      assert.equal(Math.round(p1.x - p0.x), Math.round(ex), `${dir}: x moved by the reach`); assert.equal(Math.round(p1.y - p0.y), Math.round(ey), `${dir}: y moved by the reach`);
      assert.ok(Math.abs(ex) + Math.abs(ey) > 40, "the reach is a real distance");
      // owner note 11-19: the slide goes only along the held key, and the pawn stays in the view with its margin
      if (dir === "up" || dir === "down") assert.equal(Math.round(p1.x), Math.round(p0.x), "no sideways drift"); else assert.equal(Math.round(p1.y), Math.round(p0.y), "no vertical drift");
      const lim = { up: [p1.y - 32, 532 - M, p0.y - 32], down: [M, p1.y - 32, p0.y - 32], left: [p1.x, 450 - M, p0.x], right: [M, p1.x, p0.x] }[dir];   // [low, high, before]: low <= high unless the pawn already stood past the margin
      assert.ok(lim[0] <= lim[1] + 1 || lim[2] === lim[0] || lim[2] === lim[1], "the pawn stays on screen with a margin: " + p1.x + "," + p1.y);
      assert.equal(await blankPx(page), 0, "the view is full: no empty band where the place was");
      await page.evaluate((k) => { const m = window.__mb; m.HELD.length = 0; m.release(k); }, dir);
      await page.evaluate(() => { window.__mb.TEST.clock += 400; }); await page.waitForTimeout(150);
      const p2 = await plAt(page); assert.ok(Math.abs(p2.x - p0.x) <= 3, "back at x (within the bump's shake): " + p2.x + " vs " + p0.x); assert.ok(Math.abs(p2.y - p0.y) <= 3, "back at y: " + p2.y + " vs " + p0.y);   // the refused step's bump shake still settles at the first reading
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
}
