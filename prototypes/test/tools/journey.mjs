#!/usr/bin/env node
// The test page's journey: the page that shows one device at a time, played headless. It serves prototypes/ as the sandbox does and opens /sandbox/test/ in Chromium.
// It proves: A, every region of the page measured at each proof size against the signed numbers (±1 px), and every key's box at least 44 × 44 on the phones (the touch keys);
// B, the menu (the room keys, the rows, the panel's boxes) at the two phone sizes, its Escape, its outside tap and a room key; C, the switch: a round trip keeps both screens and the
// Station's focus, the cream dot, 1 and 2; D, the dock: Shift+D from the Companion docks and shows the Station's arrival, D on the Station, Lift shows the Companion; E, F and the
// full-screen view, the Fullscreen API and the hardware view; F, the pixel rule per face; G, the dev override of the safe area. Fails on any page error or console error in the page.
//   node prototypes/test/tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local)
//   TP_SHOTS=/dir node prototypes/test/tools/journey.mjs   also writes the 1x shots, <device>-<w>x<h>[-menu].png, and the measured region tables as <dir>/regions.md
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const SHOTS = process.env.TP_SHOTS || null; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/test/`;
const browser = await chromium.launch();
const fails = [], errors = [], tables = [];
const expect = (c, m) => { if (!c) { fails.push(m); console.error("FAIL " + m); } };
const eq = (a, b, m) => expect(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

async function open(width, height, { dsf = 1, query = "", touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, hasTouch: touch, isMobile: false, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem("tp-journey")) { localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("tp-journey", "1"); } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { errors.push("console: " + m.text().slice(0, 200)); console.error("FAIL console: " + m.text().slice(0, 200)); } });
  await page.goto(base + query, { waitUntil: "load" });
  const st = () => page.frame({ url: /\/station\// }), mb = () => page.frame({ url: /\/exploration\// });
  await page.waitForFunction(() => window.__tp && window.__tp.win("station") && window.__tp.win("station").__st && window.__tp.win("companion") && window.__tp.win("companion").__mb && window.__tp.win("companion").__mb.S, null, { timeout: 30000 });
  await st().evaluate(() => window.__st.ready); await page.waitForTimeout(900);
  return { ctx, page, st, mb };
}
const rects = (page) => page.evaluate(() => window.__tp.rects());
const near = (a, b, tol = 1) => !!a && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tol + 1e-6);
const union = (rs) => { const x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1])), x1 = Math.max(...rs.map((r) => r[0] + r[2])), y1 = Math.max(...rs.map((r) => r[1] + r[3])); return [x0, y0, x1 - x0, y1 - y0]; };
const f1 = (a) => a.map((v) => Math.round(v * 10) / 10).join(" ");

// ---- A. the regions, as the signed tables give them (x y w h) ----
// Each case: the device, the size, the query, and what is expected. `pad` is the union of the four pad keys.
const PORT = (padY, extra) => ({ bar: [0, 0, 390, 44], switch: [8, 0, 168, 44], dock: [184, 0, 88, 44], flag: [294, 0, 44, 44], menu: [338, 0, 44, 44], pad: [16, padY, 168, 168], ...extra });
const CASES = [
  { name: "phone", dev: "station", w: 390, h: 664, q: "?dev", exp: PORT(395, { "face-station": [8, 52, 374, 219], last: [8, 277, 374, 16], foot: [8, 295, 374, 14], "k-station-back": [210, 487, 60, 60], "k-station-confirm": [286, 435, 88, 88] }) },
  { name: "phone", dev: "companion", w: 390, h: 664, q: "?dev", exp: PORT(472, { "face-companion": [55, 52, 281, 374], last: [8, 432, 374, 16], foot: [8, 450, 374, 14], "k-companion-call": [214, 490, 60, 60], "k-companion-back": [214, 562, 60, 60], "k-companion-confirm": [286, 512, 88, 88] }) },
  { name: "iphone", dev: "station", w: 390, h: 844, q: "?dev", exp: PORT(485, { "face-station": [8, 52, 374, 219], last: [8, 277, 374, 16], foot: [8, 295, 374, 14], "k-station-back": [210, 577, 60, 60], "k-station-confirm": [286, 525, 88, 88] }) },
  { name: "iphone", dev: "companion", w: 390, h: 844, q: "?dev", exp: PORT(625, { "face-companion": [8, 52, 374, 499], last: [8, 557, 374, 16], foot: [8, 575, 374, 14], "k-companion-call": [214, 643, 60, 60], "k-companion-back": [214, 715, 60, 60], "k-companion-confirm": [286, 665, 88, 88] }) },
  { name: "iphone-safe", dev: "station", w: 844, h: 390, q: "?dev&safe=0,47,21,47", exp: { switch: [47, 8, 88, 44], last: [47, 64, 88, 48], foot: [47, 175, 88, 42], pad: [47, 229, 88, 132], "face-station": [143, 21, 558, 327], dock: [709, 8, 88, 44], menu: [709, 60, 88, 44], flag: [709, 112, 88, 44], "k-station-back": [709, 229, 52, 52], "k-station-confirm": [725, 289, 72, 72] } },
  { name: "iphone-safe", dev: "companion", w: 844, h: 390, q: "?dev&safe=0,47,21,47", exp: { switch: [47, 8, 88, 44], last: [47, 64, 88, 48], foot: [47, 175, 88, 42], dock: [709, 8, 88, 44], menu: [709, 60, 88, 44], flag: [709, 112, 88, 44], "face-companion": [288, 6, 268, 357], pad: [92, 217, 144, 144], "k-companion-call": [645, 229, 56, 56], "k-companion-back": [645, 297, 56, 56], "k-companion-confirm": [713, 277, 84, 84] } },
  { name: "bare", dev: "station", w: 844, h: 390, q: "?dev", exp: { switch: [8, 8, 88, 44], "face-station": [104, 9, 636, 373], pad: [8, 250, 88, 132], dock: [748, 8, 88, 44], menu: [748, 60, 88, 44], "k-station-back": [748, 250, 52, 52], "k-station-confirm": [764, 310, 72, 72] } },
  { name: "pixel", dev: "station", w: 915, h: 412, q: "?dev", exp: { switch: [8, 8, 88, 44], last: [8, 64, 88, 48], foot: [8, 218, 88, 42], pad: [8, 272, 88, 132], "face-station": [116, 6, 683, 400], dock: [819, 8, 88, 44], menu: [819, 60, 88, 44], flag: [819, 112, 88, 44], "k-station-back": [819, 272, 52, 52], "k-station-confirm": [835, 332, 72, 72] } },
  { name: "pixel", dev: "companion", w: 915, h: 412, q: "?dev", exp: { switch: [8, 8, 88, 44], last: [8, 64, 88, 48], foot: [8, 218, 88, 42], dock: [819, 8, 88, 44], menu: [819, 60, 88, 44], flag: [819, 112, 88, 44], "face-companion": [308, 6, 300, 400], pad: [82, 260, 144, 144], "k-companion-call": [755, 272, 56, 56], "k-companion-back": [755, 340, 56, 56], "k-companion-confirm": [823, 320, 84, 84] } },
  // the desktop's full-screen view (the signed 1440 x 900 table; the other two sizes follow its rule)
  { name: "desktop", dev: "station", w: 1440, h: 900, q: "?dev", full: true, exp: { bar: [0, 0, 1440, 40], switch: [16, 4, 240, 32], last: [276, 11, 620, 18], dock: [1016, 4, 168, 32], flag: [1196, 4, 96, 32], drawer: [1300, 4, 40, 32], fullscreen: [1348, 4, 76, 32], "face-station": [208, 110, 1024, 600], pad: [14, 320, 180, 180], "k-station-back": [1248, 394, 64, 64], "k-station-confirm": [1328, 362, 96, 96], views: [584, 734, 272, 56], foot: [0, 872, 1440, 20] } },
  { name: "desktop", dev: "station", w: 1920, h: 1080, q: "?dev", full: true, exp: { bar: [0, 0, 1920, 40], "face-station": [448, 200, 1024, 600], pad: [14, 410, 180, 180], "k-station-back": [1728, 484, 64, 64], "k-station-confirm": [1808, 452, 96, 96], views: [824, 824, 272, 56], foot: [0, 1052, 1920, 20] } },
  { name: "desktop", dev: "station", w: 1280, h: 720, q: "?dev", full: true, exp: { bar: [0, 0, 1280, 40], "face-station": [208, 67, 864, 506], pad: [14, 230, 180, 180], "k-station-confirm": [1168, 272, 96, 96], views: [504, 597, 272, 56], foot: [0, 692, 1280, 20] } },
];
const MENU = [
  { name: "phone", w: 390, h: 664, q: "?dev", dev: "station", exp: { menuPanel: [98, 48, 284, 188], "menu-home": [110, 60, 56, 56], "menu-habitat": [178, 60, 56, 56], "menu-research": [246, 60, 56, 56], "menu-library": [314, 60, 56, 56], "menu-rule": [110, 128, 260, 1], "menu-fullscreen": [110, 136, 260, 44], "menu-tools": [110, 180, 260, 44] } },
  { name: "iphone-safe", w: 844, h: 390, q: "?dev&safe=0,47,21,47", dev: "station", exp: { menuPanel: [417, 8, 284, 188], "menu-home": [429, 20, 56, 56], "menu-habitat": [497, 20, 56, 56], "menu-research": [565, 20, 56, 56], "menu-library": [633, 20, 56, 56], "menu-rule": [429, 88, 260, 1], "menu-fullscreen": [429, 96, 260, 44], "menu-tools": [429, 140, 260, 44] } },
  { name: "phone", w: 390, h: 664, q: "?dev", dev: "companion", exp: { menuPanel: [98, 48, 284, 112], "menu-fullscreen": [110, 60, 260, 44], "menu-tools": [110, 104, 260, 44] } },
  { name: "pixel", w: 915, h: 412, q: "", dev: "station", exp: { menuPanel: [527, 8, 284, 144], "menu-home": [539, 20, 56, 56], "menu-habitat": [607, 20, 56, 56], "menu-research": [675, 20, 56, 56], "menu-library": [743, 20, 56, 56], "menu-fullscreen": [539, 96, 260, 44] } },
];
const KEYIDS = { station: ["up", "down", "left", "right", "back", "confirm"], companion: ["up", "down", "left", "right", "call", "back", "confirm"] };

async function measure(c, tag = "") {
  const { ctx, page } = await open(c.w, c.h, { query: c.q, touch: c.name !== "desktop" });
  if (c.full) { await page.evaluate(() => { localStorage.setItem("mb-test-view", "full"); }); await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__tp && window.__tp.win("station") && window.__tp.win("station").__st); await page.evaluate(() => window.__tp.win("station").__st.ready); await page.waitForTimeout(700); }
  if (c.dev === "companion") { await page.keyboard.press("2"); await page.waitForTimeout(300); }
  const R = await rects(page), got = {};
  const padKeys = ["up", "down", "left", "right"].map((k) => R["k-" + c.dev + "-" + k]);
  if (padKeys.every(Boolean)) got.pad = union(padKeys);
  if (R["k-station-home"] && c.full) got.views = union(["home", "habitat", "research", "library"].map((k) => R["k-station-" + k]));
  for (const id of Object.keys(c.exp)) if (!(id in got)) got[id] = R[id] ?? null;
  const rows = [];
  for (const [id, want] of Object.entries(c.exp)) { const g = got[id], ok = near(g, want); rows.push({ id, want, got: g, ok }); expect(ok, `A: ${c.name} ${c.dev} ${c.w}x${c.h}${c.q ? " " + c.q : ""} ${id}: ${g ? f1(g) : "missing"}, wanted ${f1(want)} (±1)`); }
  // every key's box at least 44 x 44 on the phones
  if (!c.full) for (const k of KEYIDS[c.dev]) { const r = R["k-" + c.dev + "-" + k]; expect(r && r[2] >= 44 - 1e-6 && r[3] >= 44 - 1e-6, `A: ${c.name} ${c.dev} ${c.w}x${c.h} key ${k} is at least 44 x 44: ${r ? f1(r) : "missing"}`); }
  if (!c.full) for (const id of ["switchStation", "switchCompanion", "dock", "menu", "flag"]) { const r = R[id]; if (r) expect(r[2] >= 44 - 1e-6 && r[3] >= 44 - 1e-6, `A: ${c.name} ${c.dev} ${c.w}x${c.h} ${id} is at least 44 x 44: ${f1(r)}`); }
  const keyAll = Object.entries(R).filter(([k]) => k.startsWith("k-" + c.dev + "-")).map(([k, v]) => [k, v]);
  rows.minKey = Math.min(...keyAll.map(([, v]) => Math.min(v[2], v[3])));
  tables.push({ c, rows, minKey: rows.minKey });
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${c.name === "desktop" ? "desktop" : c.name}${c.dev === "companion" ? "-companion" : ""}-${c.w}x${c.h}.png`) });
  await ctx.close();
}
for (const c of CASES) await measure(c);

// ---- B. the menu ----
for (const m of MENU) {
  const { ctx, page, st } = await open(m.w, m.h, { query: m.q, touch: true });
  if (m.dev === "companion") { await page.keyboard.press("2"); await page.waitForTimeout(300); }
  eq(await page.evaluate(() => window.__tp.rect("menuPanel")), null, `B: ${m.name} ${m.dev}: the menu starts closed`);
  const mb = await page.evaluate(() => window.__tp.rect("menu")); await page.mouse.click(mb[0] + mb[2] / 2, mb[1] + mb[3] / 2); await page.waitForTimeout(250);
  const R = await rects(page), rows = [];
  for (const [id, want] of Object.entries(m.exp)) { const g = R[id] ?? null, ok = near(g, want); rows.push({ id, want, got: g, ok }); expect(ok, `B: ${m.name} ${m.dev} ${m.w}x${m.h} ${id}: ${g ? f1(g) : "missing"}, wanted ${f1(want)} (±1)`); }
  for (const [id, r] of Object.entries(R)) if (id.startsWith("menu-") && id !== "menu-rule") expect(r[2] >= 44 - 1e-6 && r[3] >= 44 - 1e-6, `B: ${m.name} ${m.w}x${m.h} ${id} is at least 44 x 44: ${f1(r)}`);
  tables.push({ c: { name: "menu " + m.name, dev: m.dev, w: m.w, h: m.h, q: m.q }, rows });
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${m.name}${m.dev === "companion" ? "-companion" : ""}-${m.w}x${m.h}-menu.png`) });
  await ctx.close();
}
{   // the menu's behaviour at 390 x 664
  const { ctx, page, st } = await open(390, 664, { query: "?dev&test", touch: true });
  const said = () => st().evaluate(() => window.__st.said()), screen = () => st().evaluate(() => window.__st.UI.screen);
  const open_ = async () => { const r = await page.evaluate(() => window.__tp.rect("menu")); await page.mouse.click(r[0] + 20, r[1] + 20); await page.waitForTimeout(200); };
  await said(); await open_();
  const focus0 = await st().evaluate(() => JSON.stringify(window.__st.props?.focus ?? null));
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  eq(await page.evaluate(() => window.__tp.rect("menuPanel")), null, "B: Esc closes the menu"); eq(await said(), [], "B: Esc does not reach the face");
  await open_(); await page.mouse.click(330, 480); await page.waitForTimeout(250);   // on the Confirm key
  eq(await page.evaluate(() => window.__tp.rect("menuPanel")), null, "B: a tap outside closes the menu"); eq(await said(), [], "B: and fires no device key"); eq(await screen(), "home", "B: the Station stays on Home");
  await open_(); await page.keyboard.press("m"); await page.waitForTimeout(150); eq(await page.evaluate(() => window.__tp.rect("menuPanel")), null, "B: M closes the menu");
  await page.keyboard.press("m"); await page.waitForTimeout(150); expect(!!(await page.evaluate(() => window.__tp.rect("menuPanel"))), "B: M opens the menu");
  eq(await st().evaluate(() => JSON.stringify(window.__st.props?.focus ?? null)), focus0, "B: the face's focus does not change when the menu opens or closes");
  const rr = await page.evaluate(() => window.__tp.rect("menu-research")); await page.mouse.move(rr[0] + 20, rr[1] + 20); await page.mouse.down(); await page.waitForTimeout(100);
  eq(await screen(), "home", "B: a room key acts on release, not on press"); await page.mouse.up(); await page.waitForTimeout(500);
  eq(await screen(), "pods", "B: the Research key in the menu goes to the Station's Pods"); eq(await page.evaluate(() => window.__tp.rect("menuPanel")), null, "B: and the menu closes");
  await ctx.close();
}

// ---- C. the switch ----
{
  const { ctx, page, st, mb } = await open(1440, 900, { query: "?test" });
  await page.evaluate(() => window.__tp.show("station", { force: true }));
  const focus = () => st().evaluate(() => JSON.stringify([window.__st.UI.screen, window.__st.props?.focus ?? null]));
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(300);
  const f0 = await focus(); const sc0 = await st().evaluate(() => window.__st.UI.screen);
  const t0 = Date.now(); await page.keyboard.press("2"); await page.waitForFunction(() => window.__tp.S.shown === "companion"); const dt = Date.now() - t0;
  expect(dt < 100 + 80, `C: the switch is instant (${dt} ms with the key press)`);
  eq(await page.evaluate(() => [window.__tp.S.shown, window.__tp.frames.companion.classList.contains("off"), window.__tp.frames.station.classList.contains("off")]), ["companion", false, true], "C: 2 shows the Companion and hides the Station");
  await page.keyboard.press("Enter"); await page.waitForTimeout(500);
  const ph0 = await mb().evaluate(() => [window.__mb.S.phase, window.__mb.S.ui.sel]);
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(300); const ph1 = await mb().evaluate(() => [window.__mb.S.phase, window.__mb.S.ui.sel]);
  await page.keyboard.press("1"); await page.waitForTimeout(400);
  eq(await page.evaluate(() => window.__tp.S.shown), "station", "C: 1 shows the Station");
  eq(await focus(), f0, "C: the round trip keeps the Station's screen and focus ring");
  eq(await st().evaluate(() => window.__st.UI.screen), sc0, "C: and its screen");
  eq(await mb().evaluate(() => [window.__mb.S.phase, window.__mb.S.ui.sel]), ph1, "C: the Companion kept its screen and its choice while hidden"); expect(JSON.stringify(ph0) !== "null", "C: the Companion had a screen");
  // the keys go to the device shown only
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(300);
  eq(await mb().evaluate(() => [window.__mb.S.phase, window.__mb.S.ui.sel]), ph1, "C: the hidden Companion hears no key");
  // the switch buttons, with the pointer
  await page.click('[data-r="switchCompanion"]'); await page.waitForTimeout(150); eq(await page.evaluate(() => window.__tp.S.shown), "companion", "C: the switch's Companion half shows the Companion");
  await page.click('[data-r="switchStation"]'); await page.waitForTimeout(150); eq(await page.evaluate(() => window.__tp.S.shown), "station", "C: the Station half shows the Station");
  // the cream dot: the hidden Companion changes its screen
  await page.waitForTimeout(8500);
  eq(await page.evaluate(() => document.getElementById("swDot").hidden), true, "C: no dot while nothing changed");
  await page.evaluate(() => { window.__tp.fire("companion", "keydown", "Escape"); window.__tp.fire("companion", "keyup", "Escape"); });
  await page.waitForFunction(() => !document.getElementById("swDot").hidden, null, { timeout: 4000 }).catch(() => {});
  const dot = await page.evaluate(() => { const d = document.getElementById("swDot"), b = window.__tp.rect("switchCompanion"), r = d.getBoundingClientRect(); return { hidden: d.hidden, x: r.x, y: r.y, w: r.width, half: b }; });
  expect(!dot.hidden, "C: the cream dot shows on the Companion half when its screen changed while hidden");
  expect(Math.abs(dot.w - 7) < 0.6 && Math.abs(dot.x + 7 - (dot.half[0] + dot.half[2] - 4)) < 1.5 && Math.abs(dot.y - dot.half[1] - 4) < 1.5, `C: the dot is 7 px, 4 px in from the half's top right: ${f1([dot.x, dot.y, dot.w])} in ${f1(dot.half)}`);
  await page.keyboard.press("2"); await page.waitForTimeout(200);
  eq(await page.evaluate(() => document.getElementById("swDot").hidden), true, "C: showing the Companion clears its dot");
  await page.waitForTimeout(8500);
  eq(await page.evaluate(() => document.getElementById("swDot").hidden), true, "C: the idle Station, hidden, never lights the dot on its own animation");
  // a need set on the hidden Station (a crate waiting in the Bay) lights its lamp and so the dot on the Station half
  await st().evaluate(() => { window.__st.seedCrate("S01", 2, 4101); window.__st.ST.dock.docked = true; });   // the Bay shows its crates only while docked
  const t1 = Date.now(); await page.waitForFunction(() => !document.getElementById("swDot").hidden, null, { timeout: 1000 }).catch(() => {});
  expect(!(await page.evaluate(() => document.getElementById("swDot").hidden)), `C: a need set on the Station (a crate in the Bay) shows the dot on the Station half within 1 s (${Date.now() - t1} ms)`);
  await ctx.close();
}

// ---- D. the dock ----
{
  const { ctx, page, st, mb } = await open(1440, 900, { query: "?test&seed=3" });
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  const word = () => page.evaluate(() => document.getElementById("dockWord").textContent);
  eq(await word(), "Dock", "D: lifted: the control says Dock");
  await page.keyboard.press("2"); await page.waitForTimeout(300);
  await mb().evaluate(() => { window.__heard = []; window.addEventListener("keydown", (e) => window.__heard.push((e.shiftKey ? "Shift+" : "") + e.code)); });
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(900);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "D: Shift+D from the Companion docks the Caddy");
  eq(await page.evaluate(() => window.__tp.S.shown), "station", "D: and shows the Station");
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.props?.state]), ["cargo", "arrival"], "D: the Station's arrival is playing");
  expect(!(await mb().evaluate(() => window.__heard)).includes("Shift+KeyD"), "D: Shift+D never reached the Companion");
  eq(await word(), "Lift", "D: docked: the control says Lift");
  await page.waitForTimeout(3600); await st().waitForFunction(() => window.__st.props?.overlay?.form === "strip", null, { timeout: 15000 }).catch(() => {});
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200); await page.keyboard.press("Enter"); await page.waitForTimeout(900);   // Later
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(900);
  eq([await st().evaluate(() => window.__st.ST.dock.docked), await page.evaluate(() => window.__tp.S.shown)], [false, "companion"], "D: Lift (Shift+D) lifts the Caddy and shows the Companion");
  await page.keyboard.press("1"); await page.waitForTimeout(300);
  await page.keyboard.press("d"); await page.waitForTimeout(900);
  eq([await st().evaluate(() => window.__st.ST.dock.docked), await page.evaluate(() => window.__tp.S.shown)], [true, "station"], "D: D alone docks on the Station view");
  await ctx.close();
}

// ---- E. F and the full-screen view ----
{
  const { ctx, page } = await open(1440, 900, { query: "?test" });
  const view = () => page.evaluate(() => [document.documentElement.dataset.view, !!document.fullscreenElement]);
  eq((await view())[0], "hardware", "E: a desktop opens in the hardware view");
  await page.keyboard.press("f"); await page.waitForTimeout(500);
  const v = await view(); eq(v[0], "full", "E: F enters the full-screen view"); expect(v[1], "E: and asks the browser's Fullscreen API");
  eq(await page.evaluate(() => document.getElementById("fsWord").textContent), "Exit", "E: the button says Exit");
  await page.keyboard.press("f"); await page.waitForTimeout(500);
  eq((await view())[0], "hardware", "E: F again leaves it"); eq(await page.evaluate(() => localStorage.getItem("mb-test-view")), "hardware", "E: the view is kept per browser");
  await page.click('[data-r="fullscreen"]'); await page.waitForTimeout(500); eq((await view())[0], "full", "E: the Full screen button enters it");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(800); eq((await view())[0], "full", "E: and it is remembered");
  // the hardware view fits the window
  await page.keyboard.press("f"); await page.waitForTimeout(500);
  const hw = await page.evaluate(() => { const r = window.__tp.rect("face-station"); return r; });
  expect(hw && Math.abs(hw[2] / hw[3] - 1024 / 600) < 0.01, `E: the hardware view's Station face keeps its shape: ${hw && f1(hw)}`);
  await ctx.close();
}

// ---- F. the pixel rule per face ----
{
  const rule = async (w, h, dsf, dev, want, what) => {
    const { ctx, page } = await open(w, h, { dsf, query: "?test", touch: w < 900 });
    if (w >= 900) { await page.evaluate(() => localStorage.setItem("mb-test-view", "full")); await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200); }
    if (dev === "companion") { await page.keyboard.press("2"); await page.waitForTimeout(300); }
    eq(await page.evaluate((d) => window.__tp.canvasOf(d).style.imageRendering, dev), want, "F: " + what);
    await ctx.close();
  };
  await rule(390, 664, 1, "station", "auto", "the Station's face is smooth at 390 x 664 and dpr 1");
  await rule(390, 664, 1, "companion", "auto", "the Companion's face is smooth below one device pixel per face pixel (s 0.62, dpr 1)");
  await rule(390, 844, 3, "station", "auto", "the Station's face is smooth at dpr 3 (s x dpr 1.10, not whole)");
  await rule(390, 844, 3, "companion", "pixelated", "the Companion's face is pixelated from one device pixel up (2.49)");
  await rule(1440, 900, 1, "station", "pixelated", "the desktop Station face at 1x is pixelated (s = 1)");
  await rule(915, 412, 1, "station", "auto", "915 x 412 at dpr 1: smooth (0.667)");
}
// ---- G. the safe-area override ----
{
  const { ctx, page } = await open(844, 390, { query: "?safe=0,47,21,47", touch: true });   // no ?dev
  eq(await page.evaluate(() => window.__tp.rect("switch")), [8, 8, 88, 44], "G: ?safe is dev-only: without ?dev the switch stays at 8 8 88 44");
  await ctx.close();
  const dv = await open(844, 390, { query: "?dev&safe=0,47,21,47", touch: true });
  eq(await dv.page.evaluate(() => window.__tp.rect("switch")), [47, 8, 88, 44], "G: ?dev&safe=0,47,21,47 puts the left column inside the inset");
  await dv.ctx.close();
}
// ---- the hardware view's keys: the Station's at 1280 x 720, the Companion's at 1280 x 800 (every box at least 44 x 44); the Companion at 1280 x 720 is forced to full ----
for (const [dev, h] of [["station", 720], ["companion", 800]]) {
  const { ctx, page } = await open(1280, h, { query: "" });
  if (dev === "companion") { await page.keyboard.press("2"); await page.waitForTimeout(400); }
  const R = await rects(page), ks = Object.entries(R).filter(([k]) => k.startsWith("hk-" + dev + "-"));
  expect(ks.length >= 6, `H: the hardware view shows its ${dev} keys (${ks.length})`);
  for (const [k, r] of ks) expect(r[2] >= 44 - 0.5 && r[3] >= 44 - 0.5, `H: hardware ${dev} 1280x${h} ${k} is at least 44 x 44: ${f1(r)}`);
  await ctx.close();
}
{
  const { ctx, page } = await open(1280, 720, { query: "" });
  await page.keyboard.press("2"); await page.waitForTimeout(400);
  eq(await page.evaluate(() => document.documentElement.dataset.view), "full", "H: the Companion at 1280x720 is forced to the full-screen view");
  eq(await page.evaluate(() => window.__tp.rect("fullscreen")), null, "H: and the Full screen key is hidden");
  await page.keyboard.press("f"); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [document.documentElement.dataset.view, window.__tp.S.view, !!document.fullscreenElement]), ["full", "hardware", false], "H: and F does nothing while it is forced");
  await ctx.close();
}
// ---- the turn-the-phone line: stored only when shown ----
{
  const { ctx, page } = await open(1440, 900, { query: "", touch: true });
  await page.setViewportSize({ width: 390, height: 664 }); await page.waitForTimeout(400);
  eq(await page.evaluate(() => window.__tp.rect("hint") !== null), true, "I: a fresh browser opened at 1440x900, then resized to 390x664, shows the line");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  eq(await page.evaluate(() => window.__tp.rect("hint")), null, "I: reloaded at 390x664, it does not");
  await ctx.close();
}
// ---- H. the hardware view's shots (the desktop's default) ----
if (SHOTS) for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) for (const dev of ["station", "companion"]) {
  const { ctx, page } = await open(w, h, { query: "" });
  if (dev === "companion") { await page.keyboard.press("2"); await page.waitForTimeout(400); }
  await page.screenshot({ path: path.join(SHOTS, `desktop-hardware${dev === "companion" ? "-companion" : ""}-${w}x${h}.png`) }); await ctx.close();
}
await browser.close(); server.close();
if (SHOTS) {
  const md = tables.map((t) => `### ${t.c.name} ${t.c.dev} ${t.c.w}x${t.c.h}${t.c.q ? " " + t.c.q : ""}${t.minKey ? "  (smallest key box " + f1([t.minKey]) + ")" : ""}\n| region | signed | measured | |\n|---|---|---|---|\n` + t.rows.map((r) => `| ${r.id} | ${f1(r.want)} | ${r.got ? f1(r.got) : "-"} | ${r.ok ? "ok" : "OFF"} |`).join("\n")).join("\n\n");
  writeFileSync(path.join(SHOTS, "regions.md"), md + "\n");
}
if (fails.length || errors.length) { console.error(`\n${fails.length} failed, ${errors.length} page errors`); process.exit(1); }
console.log("test page journey: ok");
