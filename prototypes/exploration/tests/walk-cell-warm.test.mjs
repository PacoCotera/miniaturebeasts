// The Companion walk at a cell boundary (owner, live 2026-11-08: "the pawn gets stuck until it's generated"): the next cells are warmed in idle time, a step into a warm cell
// shows its first frame at once, a cold one is finished a step a frame with the controls live and a calm line past 150 ms, and what is kept stays bounded.
// Real Chromium at 4x CPU throttle (a phone's stand-in); PW_DIR names the folder holding node_modules/playwright (without it the tests are skipped).
// The bars are for a loaded gate machine: the measured medians are far under them (tools/measure-cell-step.mjs prints the numbers).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { headroom } from "../../../.github/ci-load.mjs";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";
const WARM_BAR = 100 * headroom, COLD_BAR = 250 * headroom;   // ms at 4x: the first frame of a warm step, and of a cold one (the brief's 150 ms with room for a loaded machine); a pull request (MB_CI_FAST=1) gets 1.5x more, from .github/ci-load.mjs

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

// A fresh page on a seed, throttled, an expedition begun and standing on the map (the next Confirm goes down into the first cell).
async function onMap(browser, url, seed, rate = 4) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } }), page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(800);
  await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__mb.S.phase), "map", "an expedition is on the map");
  return { page, ctx, errors };
}

// Down into the cell the map stands on, timed to the end of the first frame; then back out and one step on the map toward a cell not yet entered, `settle` ms to warm.
const STEP = `async ({ settle, first }) => {
  const m = window.__mb, ex = m.S.exp, raf = () => new Promise((q) => requestAnimationFrame(q)), wait = (ms) => new Promise((q) => setTimeout(q, ms));
  if (!first) {
    if (ex.patch) { m.leavePatch(); await raf(); await raf(); }
    const dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(ex.pos, d)), at = (d) => ex.pos + ({ up: -m.MW, down: m.MW, left: -1, right: 1 })[d];
    const dir = dirs.find((d) => !m.S.visited[at(d)]) || dirs[0]; m.act(dir); await raf(); await raf(); await wait(settle);
  }
  const key = String(ex.pos), warm = m.warmReady(key), h0 = m.WARM.hit, t0 = performance.now();
  m.act("confirm"); await raf(); const ms = performance.now() - t0;
  return { warm, ms, hit: m.WARM.hit - h0, cold: !!m.WARM.cold, phase: m.S.phase };
}`;

test("a step into a warmed cell: its first frame comes at once, and the neighbours were warm before the step", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 7);
    const rows = [await page.evaluate(`(${STEP})({ settle: 0, first: true })`)];
    for (let i = 0; i < 6; i++) rows.push(await page.evaluate(`(${STEP})({ settle: 1600, first: false })`));
    assert.deepEqual(errors, []);
    assert.ok(rows.slice(1).every((r) => r.phase === "patch"), "each step went down into its cell");
    assert.ok(rows.slice(1).filter((r) => r.warm).length >= 5, "the cell was warm before the step: " + JSON.stringify(rows.map((r) => r.warm)));
    const warmMs = rows.slice(1).filter((r) => r.warm).map((r) => r.ms).sort((a, b) => a - b), med = warmMs[warmMs.length >> 1];
    assert.ok(med <= WARM_BAR, `warm first frame, median ${med.toFixed(0)} ms at 4x (bar ${WARM_BAR}): ${warmMs.map((v) => v.toFixed(0))}`);
    assert.ok(Math.max(...warmMs) <= COLD_BAR, "no warm step took a cold step's time: " + warmMs.map((v) => v.toFixed(0)));
    assert.ok(rows.slice(1).every((r) => !r.cold), "a warm cell is not finished behind the transition");
  } finally { await browser.close(); server.close(); }
});

test("a cell warmed ahead has its 48 px layers laid for both water frames, so the first walking frame (whichever frame it lands on) does not lay them", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 7);
    const r = await page.evaluate(async () => {
      const m = window.__mb, key = String(m.S.exp.pos), wait = (ms) => new Promise((q) => setTimeout(q, ms));
      for (let i = 0; i < 100 && !m.warmReady(key); i++) await wait(100);
      const lay = m.layout(key);
      return { ready: m.warmReady(key), rim: !!lay.rim, l48: [!!(lay.l48 && lay.l48[0]), !!(lay.l48 && lay.l48[1])] };
    });
    assert.deepEqual(errors, []);
    assert.ok(r.ready, "the cell the map stands on was warmed: " + JSON.stringify(r));
    if (r.rim) assert.deepEqual(r.l48, [true, true], "the layers for both water frames were laid ahead: " + JSON.stringify(r));
  } finally { await browser.close(); server.close(); }
});

test("a step into a cold cell (no time to warm): the first frame is under the cold bar, the walk stays live, and the land is built behind the transition", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 13);
    const rows = [await page.evaluate(`(${STEP})({ settle: 0, first: true })`)];   // the first cell of a page that has only just set out: nothing was warm
    for (let i = 0; i < 4; i++) rows.push(await page.evaluate(`(${STEP})({ settle: 0, first: false })`));
    assert.deepEqual(errors, []);
    const worst = Math.max(...rows.map((r) => r.ms));
    assert.ok(worst <= COLD_BAR, `cold first frame, worst ${worst.toFixed(0)} ms at 4x (bar ${COLD_BAR}): ${rows.map((r) => r.ms.toFixed(0))}`);
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => window.__mb.WARM.cold), null, "the cold cell finished warming");
  } finally { await browser.close(); server.close(); }
});

test("input during warming still moves the pawn, and a cell that comes up cold shows the calm line past 150 ms, then drops it", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 42);
    await page.evaluate(`(${STEP})({ settle: 0, first: true })`);
    await page.waitForTimeout(400);
    // make the cell cold again: its view forgets what it had built, and the walk is told it has just arrived, long enough ago for the line
    const r = await page.evaluate(async () => {
      const m = window.__mb, P = m.S.exp.patch, raf = () => new Promise((q) => requestAnimationFrame(q)), lay = m.layout(P.key), bk = m.bakedView(lay);
      if (!bk) return { nobaked: true };
      if (m.RT.view) m.endView();
      bk.warm = { st: 0, kinds: null, i: 0 }; bk.cache.key = null; bk.cache.frames.clear(); bk.half.key = null; bk.sprites.clear();
      m.WARM.cold = { key: P.key, at: -1e6, signed: false };
      const at0 = { x: P.x, y: P.y };
      let moved = false, lines = 0;
      for (let i = 0; i < 400 && (m.WARM.cold || i < 3); i++) {
        await raf(); if (m.msg === m.LAND_COMING) lines++;        if (!moved && lines > 0 && m.WARM.cold) for (const d of ["up", "down", "left", "right"]) { m.act(d, "walk"); if (P.x !== at0.x || P.y !== at0.y) { moved = true; break; } }
      }
      await raf(); await raf();
      return { moved, lines, coldAfter: m.WARM.cold, msgAfter: m.msg, ready: m.warmReady(P.key) };
    });
    assert.deepEqual(errors, []);
    if (r.nobaked) return;   // (a seed with a generated first cell has no baked view to warm)
    assert.ok(r.lines > 0, "the calm line showed while it was built: " + JSON.stringify(r));
    assert.ok(r.moved, "the pawn moved while the land was still being built: " + JSON.stringify(r));
    assert.equal(r.coldAfter, null, "the landing finished");
    assert.ok(r.ready, "and the cell is warm");
    assert.notEqual(r.msgAfter, await page.evaluate(() => window.__mb.LAND_COMING), "the line is gone once the land is in view");
  } finally { await browser.close(); server.close(); }
});

// Crossing (owner walk note 18): walking off a place's edge through a way through slides one screen and never zooms out to the whole place.
const ACROSS = `async () => {
  const m = window.__mb, raf = () => new Promise((q) => requestAnimationFrame(q)), wait = (ms) => new Promise((q) => setTimeout(q, ms));
  if (m.S.phase === "map") { m.act("confirm"); await wait(300); }
  for (let tries = 0; tries < 12; tries++) {
    const P = m.S.exp.patch, lay = m.layout(P.key), bk = lay.baked;
    const o = bk && (lay.openings || []).find((q) => m.openingKind(lay, q).kind === "open");
    if (o) {
      const dir = { N: "up", S: "down", W: "left", E: "right" }[o.side], k = Math.floor((o.from + o.to) / 2);
      P.x = o.side === "W" ? 0 : o.side === "E" ? lay.w - 1 : k + bk.ox; P.y = o.side === "N" ? 0 : o.side === "S" ? lay.h - 1 : k + bk.oy;
      const pos0 = m.S.exp.pos, ts0 = m.RT.ts; m.act(dir, "creep"); await raf();
      const out = { crossed: m.S.exp.pos !== pos0, phase: m.S.phase, view: !!m.RT.view, slide: m.FX.slide ? { dx: m.FX.slide.dx, dy: m.FX.slide.dy } : null, dir, locked: m.FX.lockUntil - performance.now(), ts: m.RT.ts === ts0 };
      await wait(m.SLIDE_MS + 150); out.after = { slide: !!m.FX.slide, ts: m.RT.ts === ts0 }; return out;
    }
    const dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(m.S.exp.pos, d)); m.leavePatch(); m.act(dirs[tries % dirs.length]); await wait(200); m.act("confirm"); await wait(300);
  }
  return null;
}`;
test("a crossing is a one-screen slide into the next place: no map step, no zoom-out, input locked for the slide", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 7, 1);
    await page.evaluate(() => { window.__mb.act("confirm"); });
    await page.waitForTimeout(800);
    const r = await page.evaluate(`(${ACROSS})()`);
    assert.deepEqual(errors, []);
    assert.ok(r, "a place with a way through was found");
    assert.ok(r.crossed && r.phase === "patch", "one press crossed and the walk went straight into the next place: " + JSON.stringify(r));
    assert.equal(r.view, false, "no whole-place picture on entry: " + JSON.stringify(r));
    assert.ok(r.slide && ((r.slide.dx !== 0) !== (r.slide.dy !== 0)), "a slide runs in the walking direction: " + JSON.stringify(r));
    assert.ok(r.locked > 100, "input is locked for the slide: " + JSON.stringify(r));
    assert.ok(r.ts && r.after.ts && !r.after.slide, "the scale never changes and the slide ends: " + JSON.stringify(r));
  } finally { await browser.close(); server.close(); }
});

test("keys pressed during a stall are dropped; a direction still held walks on, one let go is gone", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 7, 1);
    await page.evaluate(() => { window.__mb.act("confirm"); });
    await page.waitForTimeout(800);
    const run = async (letGo) => {
      await page.waitForTimeout(500);   // the walk before has stopped
      await page.evaluate(() => { const m = window.__mb, t0 = performance.now(); m.STALL.from = t0; m.STALL.to = t0 + 400; m.FX.lockUntil = 0; window.__at = { x: m.S.exp.patch.x, y: m.S.exp.patch.y }; window.__t0 = t0; });
      const busy = page.evaluate(() => { const t = performance.now(); while (performance.now() - t < 350); });   // the page is frozen: the key arrives meanwhile
      await page.waitForTimeout(60);
      await page.keyboard.down("ArrowRight"); if (letGo) await page.keyboard.up("ArrowRight");
      await busy; await page.waitForTimeout(40);
      const during = await page.evaluate(() => ({ at: { x: window.__mb.S.exp.patch.x, y: window.__mb.S.exp.patch.y }, was: window.__at, held: window.__mb.HELD.slice() }));
      await page.waitForTimeout(700);
      const after = await page.evaluate(() => ({ at: { x: window.__mb.S.exp.patch.x, y: window.__mb.S.exp.patch.y } }));
      await page.keyboard.up("ArrowRight").catch(() => {});
      return { during, after };
    };
    const held = await run(false), gone = await run(true);
    assert.deepEqual(errors, []);
    assert.deepEqual(held.during.held, ["right"], "the held key is still known: " + JSON.stringify(held));
    assert.notDeepEqual(held.after.at, held.during.was, "a key still held when the lock ended walks on: " + JSON.stringify(held));
    assert.deepEqual(gone.after.at, gone.during.was, "a key let go before the end of the stall is not replayed: " + JSON.stringify(gone));
  } finally { await browser.close(); server.close(); }
});

test("an unready place shows its paper sketch and says nothing before 1.5 s", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 42);
    await page.evaluate(`(${STEP})({ settle: 0, first: true })`);
    await page.waitForTimeout(400);
    const r = await page.evaluate(async () => {
      const m = window.__mb, P = m.S.exp.patch, raf = () => new Promise((q) => requestAnimationFrame(q)), bk = m.bakedView(m.layout(P.key));
      if (!bk) return { nobaked: true };
      bk.warm = { st: 0, kinds: null, i: 0 }; bk.cache.key = null; bk.cache.frames.clear(); bk.half.key = null; bk.sprites.clear();
      m.WARM.cold = { key: P.key, at: performance.now(), signed: false };
      let sketched = false, words = 0;
      for (let i = 0; i < 400 && m.WARM.cold; i++) { await raf(); if (m.WARM.cold && m.WARM.cold.sketched) sketched = true; if (m.msg === m.LAND_COMING) words++; }
      return { sketched, words, sign: m.WARM_SIGN_MS };
    });
    assert.deepEqual(errors, []);
    if (r.nobaked) return;
    assert.equal(r.sign, 1500, "the line waits 1.5 s");
    assert.ok(r.sketched, "the sketch stood while the land was built: " + JSON.stringify(r));
    assert.equal(r.words, 0, "no words before 1.5 s: " + JSON.stringify(r));
  } finally { await browser.close(); server.close(); }
});

// Nothing to take, strike or step on lies in the wash or past a band (owner walk notes 14, 26-28), on three seeds.
for (const seed of [7, 13, 42]) test(`nothing interactive lies in the wash or past a band, seed ${seed}`, { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, seed, 1);
    const bad = await page.evaluate(() => {
      const m = window.__mb, out = [];
      for (let c = 0; c < m.MW * m.MH; c++) {
        if (!m.passable(c)) continue;
        const key = String(c), lay = m.layout(key); if (!lay.baked || lay.cave) continue;
        m.applyLines(lay); const cells = lay.lines ? lay.lines.cells : new Map();
        for (const f of lay.feats) if ("kqujbsk".includes(f.kind) && cells.has(f.y * lay.w + f.x)) out.push(["feat", key, f.kind, f.x, f.y]);
        for (const p of m.S.pods) if (p.k === key && p.x >= 0 && cells.has(p.y * lay.w + p.x)) out.push(["pod", key, p.x, p.y]);
      }
      return out;
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(bad, [], "interactive things past a band or in the wash");
  } finally { await browser.close(); server.close(); }
});

test("what warming keeps stays bounded however far the walk goes", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 5, 2);
    await page.evaluate(`(${STEP})({ settle: 0, first: true })`);
    for (let i = 0; i < 24; i++) await page.evaluate(`(${STEP})({ settle: 300, first: false })`);
    const k = await page.evaluate(() => { const m = window.__mb; return { whole: m.WHOLE.size, wholeMax: m.WARM_WHOLE_MAX, ring: m.PL.ring ? m.PL.ring.list.length : 0, ringMax: m.PL.ring ? m.PL.ring.max : 0, views: m.PL.views.size, queue: m.WARM.queue.length }; });
    assert.deepEqual(errors, []);
    assert.ok(k.whole <= k.wholeMax, "whole-place pictures: " + JSON.stringify(k));
    assert.ok(k.ring <= k.ringMax && k.ringMax === 16, "ground frames: " + JSON.stringify(k));
    assert.ok(k.views <= 8, "views: " + JSON.stringify(k));
  } finally { await browser.close(); server.close(); }
});
