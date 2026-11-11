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
    assert.ok(rows.slice(1).some((r) => r.hit > 0), "a first arrival's whole-place picture was warmed ahead and drawn");
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

test("what warming keeps stays bounded however far the walk goes", { skip }, async () => {
  const { server, url } = await serve(), browser = await chromium.launch();
  try {
    const { page, errors } = await onMap(browser, url, 5, 2);
    await page.evaluate(`(${STEP})({ settle: 0, first: true })`);
    for (let i = 0; i < 24; i++) await page.evaluate(`(${STEP})({ settle: 300, first: false })`);
    const k = await page.evaluate(() => { const m = window.__mb; return { whole: m.WHOLE.size, wholeMax: m.WARM_WHOLE_MAX, arr: m.ARR.size, ring: m.PL.ring ? m.PL.ring.list.length : 0, ringMax: m.PL.ring ? m.PL.ring.max : 0, views: m.PL.views.size, queue: m.WARM.queue.length }; });
    assert.deepEqual(errors, []);
    assert.ok(k.whole <= k.wholeMax, "arrival pictures: " + JSON.stringify(k));
    assert.ok(k.arr <= 12, "arrival progress: " + JSON.stringify(k));
    assert.ok(k.ring <= k.ringMax && k.ringMax === 16, "ground frames: " + JSON.stringify(k));
    assert.ok(k.views <= 8, "views: " + JSON.stringify(k));
  } finally { await browser.close(); server.close(); }
});
