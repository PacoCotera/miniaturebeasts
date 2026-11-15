#!/usr/bin/env node
// The play-page journey: the page that holds the Station and the Companion, one in view at a time with its key tray, played headless with real taps and clicks. It serves prototypes/ as the sandbox does, opens
// /sandbox/play/?test in Chromium. There is no save fixture: each context starts a fresh Companion world, and DR seeds its crate with `__st.seedCrate("S01", 2, 4101)`; B8 crosses a real
// Companion crate. It proves: L, the layout (one device in view, the switch, the dock's sheet, no scroll); DR, the dock round trip (Dock key, the Station takes the crate, the switch, Lift: the release check runs this alone);
// Z, the size (fit, a chosen z of 2, kept per browser) and the build stamp, outside ?test; PT, the Options panel; K, the Caddy's face (always drawn, from the Caddy's state, with the panel's timing); SA, the standalone Station's Dock control;
// B8, a Companion crate crossing; U, the Lift key; P, the Caddy dock's play-through on the shared save (the face C0, C2, C3, C4a, the Station's arrival and opening, a mibi taken along, reloads and a restart of the Caddy service);
// D, the figures it prints (heaps, the face, main-thread time a frame); E1 and E2, the Companion on whole device pixels at each device pixel ratio (a context made at it; a change with no resize); R, the recovery print's card; PH, the phone (tools/phone.mjs).
// The Caddy service runs in mock mode beside the static server, proxied under /caddy-api/ as on the sandbox. Fails on any page error, any console error in any frame (a 404 for the optional build stamp or the Caddy service is not one) and any assertion.
//   node prototypes/play/tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local; JOURNEY_ONLY=<section> runs one: L, DR, Z, PT, K, SA, B8, U, P, D, E1, E2, R, PH)
//   PLAY_CAPTURES=1 node prototypes/play/tools/journey.mjs     also writes the captures of img/ (clipped to the page)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { decodePNG } from "../../ui/png.mjs";
import { createApp, loadFrames as loadCaddyFrames } from "../../caddy/app.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), img = path.resolve(here, "../img");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
// the Caddy service in mock mode (its dock and its portraits), restartable on the same data directory
loadCaddyFrames();
const caddyData = mkdtempSync(path.join(tmpdir(), "mb-caddy-play-"));
writeFileSync(path.join(caddyData, "identity.json"), JSON.stringify({ v: 1, caddy: "k0000000000000000", recovery: { kid: "TEST", pub: "A".repeat(43) }, printedAt: 0 }));   // a card whose recovery print was taken: no strip under the Caddy's screen until R removes it
let caddy = null, caddyServer = null, caddyPort = 0;
async function caddyStart() { caddy = createApp({ dataDir: caddyData, painter: "mock", mockDelay: 1, tickMs: 200 }); caddyServer = createServer((req, res) => caddy.handle(req, res)); await new Promise((r) => caddyServer.listen(0, "127.0.0.1", r)); caddy.start(); caddyPort = caddyServer.address().port; }
async function caddyStop() { caddy.stop(); caddyServer.closeAllConnections(); await new Promise((r) => caddyServer.close(r)); }
await caddyStart();
const server = createServer((req, res) => {
  if (req.url.startsWith("/caddy-api/")) {
    const up = http.request({ host: "127.0.0.1", port: caddyPort, path: req.url, method: req.method, headers: req.headers }, (r2) => { res.writeHead(r2.statusCode, r2.headers); r2.pipe(res); });
    up.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up); return;
  }
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(path.resolve(root, ".."), rel);   // a path outside prototypes resolves in the repository: the Companion imports the map rules from there (the bundle inlines them)
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const browser = await chromium.launch();
const fails = [], errors = [];
const expect = (c, m) => { if (!c) { fails.push(m); console.error("FAIL " + m); } };
const eq = (a, b, m) => expect(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);
const near = (a, b, m, tol = 0.51) => expect(Array.isArray(a) ? a.every((v, i) => Math.abs(v - b[i]) <= tol) : Math.abs(a - b) <= tol, `${m}: ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

async function open(width, height, { dsf = 1, motion = false, query = "?test", options = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion: motion ? "no-preference" : "reduce" });
  if (options) await ctx.addInitScript((o) => { if (!sessionStorage.getItem("play-journey-options")) { localStorage.setItem("mb-options", JSON.stringify(o)); sessionStorage.setItem("play-journey-options", "1"); } }, options);   // the test hook: the setting the Options panel writes (play/src/options.mjs), set once before the page's scripts
  await ctx.addInitScript(() => { if (!sessionStorage.getItem("play-journey")) { localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("play-journey", "1"); } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { errors.push("console: " + m.text().slice(0, 200)); console.error("FAIL console: " + m.text().slice(0, 200)); } });
  await page.goto(base + query, { waitUntil: "load" });
  const st = () => page.frame({ url: /\/station\// }), mb = () => page.frame({ url: /\/exploration\// });
  await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 });
  await st().evaluate(() => window.__st.ready); await mb().waitForFunction(() => window.__mb && window.__mb.S, null, { timeout: 30000 }); await page.waitForTimeout(600);
  return { ctx, page, st, mb };
}
// the arrival (the Station takes the keys and behaves as if it had them, and Later returns to the screen it was on): one crate holds input for 3000 + 200 ms, then the choice (no card; the bottom line reads ✓ Open the crate and ← Later, the ring on a crate that holds a pod); ← is Later
const later = async (page, st, what, back, empty = false) => {
  if (empty) {   // C docks with an empty bay: the show has no choice, so a key skips it and it closes on the screen the player was on
    await page.waitForTimeout(1000); await page.keyboard.press("Enter"); await page.waitForTimeout(800); await back(); return;
  }
  await page.waitForTimeout(3600);   // one crate: the show holds 3200 ms
  await st().waitForFunction(() => window.__st.props?.regions?.arrival?.phase === "choice", null, { timeout: 15000 }).catch(() => {});
  eq(await st().evaluate(() => [window.__st.props?.regions?.arrival?.phase, window.__st.props?.overlay ?? null]), ["choice", null], what + ": after the show the choice stands: no card, ✓ Open the crate and ← Later");
  await page.keyboard.press("Escape"); await page.waitForTimeout(800);   // ← Later
  await back();
};
const box = async (page, sel) => { const b = await page.locator(sel).boundingBox(); return [b.x, b.y, b.width, b.height]; };
const rd = (buf) => decodePNG(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
const dataPng = (url) => rd(Buffer.from(url.split(",")[1], "base64"));
const sameImage = (a, b) => a.width === b.width && a.height === b.height && Buffer.compare(Buffer.from(a.data.buffer, a.data.byteOffset, a.data.byteLength), Buffer.from(b.data.buffer, b.data.byteOffset, b.data.byteLength)) === 0;
// the device in view against its own capture(): the viewport by CDP Page.captureScreenshot under an override (Playwright's scale "device" ignores it), by page.screenshot({ scale: "device" }) in a context created at the ratio (cdp null); the frame's rect at (round(x·dpr), round(y·dpr))
// each capture pixel spread over s × s device pixels, s the whole number the rect works out to; returns [the count of differing device pixels, s, the rect's device width less capture width × s]
async function frameBad(page, cdp, sel, capture) {
  const r = await box(page, sel), dprv = await page.evaluate(() => window.devicePixelRatio);
  const shot = cdp ? rd(Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64")) : rd(await page.screenshot({ scale: "device" })), cap = dataPng(await capture()), s = Math.max(1, Math.round((r[2] * dprv) / cap.width)), x0 = Math.round(r[0] * dprv), y0 = Math.round(r[1] * dprv);
  let bad = 0; for (let y = 0; y < cap.height * s; y++) for (let x = 0; x < cap.width * s; x++) { const a = ((y0 + y) * shot.width + x0 + x) * 4, b = (Math.floor(y / s) * cap.width + Math.floor(x / s)) * 4; if (shot.data[a] !== cap.data[b] || shot.data[a + 1] !== cap.data[b + 1] || shot.data[a + 2] !== cap.data[b + 2]) bad++; }
  return [bad, s, Math.abs(r[2] * dprv - cap.width * s) < 0.1];
}
const pixel = async (page, x, y) => { const p = rd(await page.screenshot({ clip: { x, y, width: 1, height: 1 } })); return [...p.data.slice(0, 3)]; };
const state = (page) => page.evaluate(() => ({ owner: __play.owner, caddy: __play.caddy, tier: __play.tier, seat: __play.seatOff, word: document.getElementById("dockWord").textContent, mark: document.getElementById("dockMark").getAttribute("src"), dot: document.getElementById("dockKey").classList.contains("lit"), live: document.getElementById("live").textContent, active: document.activeElement && document.activeElement.id }));
const clip = (page, name, rect) => process.env.PLAY_CAPTURES ? (mkdirSync(img, { recursive: true }), page.screenshot({ path: path.join(img, name), clip: rect ?? { x: 0, y: 0, width: page.viewportSize().width, height: page.viewportSize().height } })) : null;

// JOURNEY_ONLY=<section> runs one section alone (see the header); with none, the whole journey runs.
const ONLY = process.env.JOURNEY_ONLY;
// ---- L. the layout (ui-play-layout-2): one device in view; its panel, screen and keys at the numbers of src/layout.mjs; no scroll; the dock's sheet; the switch ----
if (!ONLY || ONLY === "L") {
  for (const [W, H] of [[1440, 900], [1280, 720]]) {
    const tag = `L ${W} × ${H}`, { ctx, page, st, mb } = await open(W, H);
    eq(await page.evaluate(() => [__play.form, __play.owner]), ["laptop", "station"], tag + ": a laptop, the Station in view (test pages keep it awake)");
    let p = await page.evaluate(() => __play.plan);
    near(await box(page, "#shStation"), [p.panel.x, p.panel.y, p.panel.w, p.panel.h], tag + ": the Station's panel", 1); near(await box(page, "#fStation"), [p.screen.x, p.screen.y, p.screen.w, p.screen.h], tag + ": its screen", 1);
    eq(await page.evaluate(() => [getComputedStyle(document.getElementById("shCompanion")).visibility, getComputedStyle(document.getElementById("shStation")).visibility]), ["hidden", "visible"], tag + ": one device in view, the other hidden (never beside it)");
    expect(p.panel.w <= 1040 && p.panel.x >= 48 && W - p.panel.x - p.panel.w >= 48, tag + ": the panel is at most 1040 wide with 48 or more at each side");
    eq(await page.evaluate(() => { const s = document.getElementById("stage"); s.scrollTop = 99; s.scrollLeft = 99; return [s.scrollTop, s.scrollLeft, document.documentElement.scrollHeight <= innerHeight, document.documentElement.scrollWidth <= innerWidth]; }), [0, 0, true, true], tag + ": nothing scrolls");
    const ks = await page.evaluate(() => [...document.querySelectorAll("#rowStation .fk")].map((k) => { const r = k.getBoundingClientRect(); return [k.getAttribute("aria-label"), r.width, r.height]; }));
    expect(ks.length === 11 && ks.every((k) => k[1] >= 44 - 1e-6 && k[2] >= 44 - 1e-6), tag + ": the Station's eleven keys, each at least 44 " + JSON.stringify(ks.filter((k) => k[1] < 44 || k[2] < 44)));
    // the switch: Companion, then Station (Radix Tabs); a press takes the other device into view and the keys go with it
    expect((await box(page, "#tabCompanion"))[0] < (await box(page, "#tabStation"))[0], tag + ": the switch reads Companion | Station, in that order");
    await page.click("#tabCompanion"); await page.waitForTimeout(400);
    eq(await page.evaluate(() => __play.owner), "companion", tag + ": the switch takes the Companion into view");
    p = await page.evaluate(() => __play.plan);
    near(await box(page, "#fCompanion"), [p.screen.x, p.screen.y, p.screen.w, p.screen.h], tag + ": the Companion's screen", 1); near(await box(page, "#fCompanion"), [await box(page, "#fCompanion").then((b) => b[0]), p.screen.y, 450, 600], tag + ": at 450 × 600, a whole step at dpr 1", 0.02);
    const cImg = rd(await page.screenshot({ clip: (([x, y, w, h]) => ({ x, y, width: w, height: h }))(await box(page, "#fCompanion")) })), cCap = dataPng(await mb().evaluate(() => window.__mb.capture()));
    expect(sameImage(cImg, cCap), tag + ": the Companion's screen is pixel-equal to __mb.capture() (1:1)");
    // the dock's screen: a button with a live miniature; opened, a centred Radix Dialog holding the e-paper whole, the two lamps and Done; Done closes it
    await page.click("#dockScreenBtn"); await page.waitForSelector("#dockSheet", { timeout: 5000 });
    const sh = await box(page, "#dockSheet"), cv = await box(page, "#dockSheet canvas");
    expect(sh[0] > 0 && sh[1] > 0 && sh[0] + sh[2] < W && sh[1] + sh[3] < H, tag + ": the sheet is centred on a laptop " + JSON.stringify(sh)); near(cv[2] / cv[3], 808 / 288, tag + ": the e-paper whole in the sheet", 0.02);
    eq(await page.locator("#dockSheet .dslamp").count(), 2, tag + ": the two cradle lamps are in the sheet");
    await page.click("#dockSheetDone"); await page.waitForTimeout(300);
    eq(await page.locator("#dockSheet").count(), 0, tag + ": Done closes the sheet");
    // no ring, no cradle strip, no Caddy block, no Companion control in the bar
    eq(await page.evaluate(() => ["ring", "cradle", "caddySheet", "caddyLamps", "companionCtl", "note"].map((id) => !!document.getElementById(id))), [false, false, false, false, false, false], tag + ": the ring, the cradle, the Caddy block, the Companion control and the bar's note are gone");
    await ctx.close();
  }
  // a new player: the Station asleep: the note above its panel, the switch reads "Station · asleep", the first dock turns the page
  { const { ctx, page } = await open(1440, 900, { query: "?test&new" });
    eq(await page.evaluate(() => [__play.owner, document.getElementById("tabStation").textContent]), ["companion", "Station · asleep"], "L: a new player opens on the Companion; the switch says the Station is asleep");
    await page.click("#tabStation"); await page.waitForTimeout(400);
    const n = await box(page, "#asleepStrip"), pn = (await page.evaluate(() => __play.plan)).panel; expect(n[1] + n[3] <= pn.y - 15 && Math.abs(n[0] - pn.x) <= 1, "L: the asleep note stands 16 above the Station's panel, at its left edge");
    eq(await page.evaluate(() => document.getElementById("asleepStrip").textContent.trim()), "It wakes when your first pod comes home.", "L: the note's one line (the title is the switch's)");
    await ctx.close(); }
}
if (ONLY === "L") { await browser.close(); server.close(); await caddyStop(); rmSync(caddyData, { recursive: true, force: true }); if (errors.length) fails.push(...errors); console.log(fails.length ? `\nplay journey (L) FAILED: ${fails.length}` : "\nplay journey (L) ok"); process.exit(fails.length ? 1 : 0); }

// ---- DR. the dock round trip as a player does it on the phone-first layout (1440 × 900, one crate aboard): Dock key, the Station takes the pod, the switch, Lift. Real taps and clicks (Radix Tabs ignores a synthetic .click()). The release check runs this alone. ----
if (!ONLY || ONLY === "DR") {
  const { ctx, page, st } = await open(1440, 900, { query: "?test&seed=1" });
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  await page.click("#tabCompanion"); await page.waitForTimeout(400);   // the Companion in view, a crate aboard
  let s = await state(page);
  eq([s.owner, s.word, s.mark.includes("outline"), s.dot, s.caddy.docked, s.caddy.crates], ["companion", "Dock", true, true, false, 1], "DR1: away with a crate: Dock, the outline mark, the key lit");
  await page.click("#dockKey"); await page.waitForFunction(() => window.__play.owner === "station", null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(500); s = await state(page);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "DR2: the Companion is seated: the Station took the dock");
  eq([s.owner, s.live], ["station", "Companion docked"], "DR2: a dock that brings a crate turns the page to the Station; the live region says so");
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.props?.state]), ["cargo", "arrival"], "DR2: the Station wakes on Cargo's arrival");
  eq([s.word, s.mark.includes("solid"), s.dot], ["Lift", true, false], "DR2: the key reads Lift (the short word at this width) with the solid mark, not lit");
  await later(page, st, "DR2", async () => {});   // the show, then the choice; ← is Later
  await page.click("#tabCompanion"); await page.waitForTimeout(400);   // the switch back to the Companion
  eq((await state(page)).owner, "companion", "DR3: the switch takes the Companion into view while it is seated");
  await page.click("#dockKey"); await page.waitForTimeout(800); s = await state(page);
  eq([await st().evaluate(() => window.__st.ST.dock.docked), s.owner, s.live], [false, "companion", "Companion lifted"], "DR3: Lift: the Station lets go, the Companion has the page");
  eq([s.word, s.mark.includes("outline")], ["Dock", true], "DR3: the key reads Dock again (the crate is still aboard)");
  eq(await st().evaluate(() => [window.__st.renderErrors, window.__st.faceErrors]), [[], []], "DR4: the Station's render and face errors");
  await ctx.close();
}
if (ONLY === "DR") { await browser.close(); server.close(); await caddyStop(); rmSync(caddyData, { recursive: true, force: true }); if (errors.length) fails.push(...errors); console.log(fails.length ? `\nplay journey (DR) FAILED: ${fails.length}` : "\nplay journey (DR) ok"); process.exit(fails.length ? 1 : 0); }

// ---- Z. the size (not under ?test): fit, the chosen z, the build stamp (viewport 1920 × 1080) ----
// a face at z device px per lp: the frame's visible region against the capture, each capture pixel a z × z block; returns [differing, compared]
async function zBad(page, sel, W, z, capture) {
  const r = await box(page, sel), shot = rd(await page.screenshot({ scale: "device" })), cap = dataPng(await capture()), x0 = Math.round(r[0]), y0 = Math.round(r[1]);
  let bad = 0, n = 0; for (let y = 0; y < 600 * z; y++) for (let x = 0; x < W * z; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 40 || sx >= shot.width || sy >= shot.height) continue; n++; const a = (sy * shot.width + sx) * 4, b = (Math.floor(y / z) * cap.width + Math.floor(x / z)) * 4; if (shot.data[a] !== cap.data[b] || shot.data[a + 1] !== cap.data[b + 1] || shot.data[a + 2] !== cap.data[b + 2]) bad++; }
  return [bad, n];
}
if (!ONLY || ONLY === "Z") {
  const { ctx, page, st, mb } = await open(1440, 900, { query: "?seed=3" });
  await st().evaluate(() => window.__st.seedPod("S01", 3)); await page.waitForTimeout(1200);   // a pod is home: the page is no longer the new player's
  await page.click("#tabCompanion"); await page.waitForTimeout(300);   // the Companion in view: the size control steps it
  const zs = () => page.evaluate(() => [__play.form, __play.z, __play.fit, localStorage.getItem("mb-play-z"), document.getElementById("zFit").textContent]);
  eq(await zs(), ["laptop", 1, true, null, "fit ×1"], "Z: fit at 1440 × 900 is the laptop form at z 1");
  eq(await page.evaluate(() => ["zDown", "zFit", "zUp"].map((i) => getComputedStyle(document.getElementById(i)).display !== "none")), [true, true, true], "Z: the size control shows outside ?test");
  eq(await page.evaluate(() => [document.getElementById("stamp").textContent, getComputedStyle(document.getElementById("stamp")).display !== "none"]), ["build local", true], "Z: the build stamp shows (no build.json here: build local)");
  await clip(page, "play-fit-1440x900.png");
  await page.keyboard.press("Equal"); await page.waitForTimeout(400);
  eq(await zs(), ["laptop", 2, false, "2", "×2"], "Z: = chooses z 2, kept in localStorage");
  eq(await box(page, "#fCompanion"), [266, 80, 900, 1200], "Z: at z 2 the Companion is 900 × 1200 CSS px");
  { const [bad, n] = await zBad(page, "#fCompanion", 450, 2, () => mb().evaluate(() => window.__mb.capture())); eq([bad, n > 500000], [0, true], "Z: the Companion at z 2: whole 2 × 2 blocks (differing device pixels, compared " + n + ")"); }
  await clip(page, "play-z2.png");
  await page.keyboard.press("Minus"); await page.waitForTimeout(300); eq((await zs()).slice(0, 4), ["laptop", 1, false, "1"], "Z: − chooses z 1 (kept)");
  await page.keyboard.press("Shift+Equal"); await page.waitForTimeout(300); eq((await zs()).slice(1, 4), [2, false, "2"], "Z: + (Shift+=) chooses z 2");
  await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }); await page.waitForTimeout(600);
  await page.click("#tabCompanion"); await page.waitForTimeout(300);   // a reload opens on the Station: the size is the Companion's
  eq((await zs()).slice(1, 4), [2, false, "2"], "Z: a reload keeps the chosen z");
  await page.click("#zFit"); await page.waitForTimeout(300); eq(await zs(), ["laptop", 1, true, null, "fit ×1"], "Z: fit clears the choice");
  await page.click("#zUp"); await page.waitForTimeout(300); eq((await zs()).slice(1, 3), [2, false], "Z: the + button");
  await page.click("#zDown"); await page.waitForTimeout(300); eq((await zs()).slice(1, 3), [1, false], "Z: the − button");
  await page.goto(base + "?test", { waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }); await page.waitForTimeout(600);
  await page.evaluate(() => localStorage.setItem("mb-play-z", "3")); await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow, null, { timeout: 30000 }); await page.waitForTimeout(600);
  await page.click("#tabCompanion"); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [__play.z, getComputedStyle(document.getElementById("zFit")).display, getComputedStyle(document.getElementById("stamp")).display]), [1, "none", "none"], "Z: ?test keeps its fit whatever is stored (no size control, no stamp)");
  await page.keyboard.press("Equal"); await page.waitForTimeout(300); eq(await page.evaluate(() => __play.z), 1, "Z: ?test: = does not change the size");
  await ctx.close();
}

if (!ONLY || ONLY === "Z") {
  // the stamp with a build.json, in a viewer's zone far from Mexico City: the time is Mexico City's
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce", timezoneId: "Asia/Tokyo" });
  await ctx.route(/\/build\.json(\?|$)/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ commit: "a9d087f9aa00", short: "a9d087f", built: "2026-10-24T03:07:00Z" }) }));
  const page = await ctx.newPage(); page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  await page.goto(base, { waitUntil: "load" }); await page.waitForFunction(() => document.getElementById("stamp").textContent !== "build local", null, { timeout: 10000 }).catch(() => {});
  eq(await page.evaluate(() => document.getElementById("stamp").textContent), "build a9d087f · 2026-10-23 21:07 Mexico City", "Z: the stamp reads build.json in Mexico City time (the viewer in Tokyo)");
  await ctx.close();
}

// ---- PT. the Options panel (owner 2026-11-08): one visible panel holds the playtest preset, Developer tools, Start fresh and the rest; the setting is one stored value both devices read, no URL (1920 × 1080) ----
if (!ONLY || ONLY === "PT") {
  const world = (page) => page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith("mb-save-v8@")); return k ? JSON.parse(localStorage.getItem(k)).wid : null; });
  const settled = (page) => page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }).then(() => page.waitForTimeout(800));
  const { ctx, page, st } = await open(1920, 1080, { query: "" });
  eq(await st().evaluate(() => { const s = window.__st.settings; return [s.playtest, s.sittingWait, s.budScale, s.adultTurns]; }), [true, "minute", 10, 1], "PT: with nothing set Playtest waits is on (first-ten-front: on by default) and the Station holds the preset");
  eq(await page.evaluate(() => document.getElementById("devBtn").classList.contains("hidden")), true, "PT: the dev button is hidden with Developer tools off");
  const ob = await page.evaluate(() => { const b = document.getElementById("optionsBtn").getBoundingClientRect(), c = document.getElementById("switchRoot").getBoundingClientRect(), r = document.getElementById("bar").getBoundingClientRect(); return { h: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom, cr: c.right, bar: [r.top, r.bottom, r.right], corner: document.getElementById("optionsBtn").classList.contains("corner") }; });
  expect(ob.h === 44 && !ob.corner && ob.top >= ob.bar[0] && ob.bottom <= ob.bar[1] && ob.right <= ob.bar[2], "PT: Options is in the bar, 44 tall, inside it " + JSON.stringify(ob));
  expect(!(await page.evaluate(() => document.getElementById("startFresh"))), "PT: Start fresh left the bar");
  await page.click("#optionsBtn"); await page.locator(".op-panel").waitFor();
  await clip(page, "play-options.png");
  await page.getByRole("switch", { name: "Playtest waits" }).click();
  eq(await page.evaluate(() => JSON.parse(localStorage.getItem("mb-options")).playtest), false, "PT: the panel stores Playtest waits off (it starts on)");
  await page.getByRole("switch", { name: "Playtest waits" }).click();
  eq(await page.evaluate(() => JSON.parse(localStorage.getItem("mb-options")).playtest), true, "PT: and on again");
  await page.waitForFunction(() => Object.keys(localStorage).some((x) => x.startsWith("mb-save-v8@")), null, { timeout: 15000 }).catch(() => {});
  const w0 = await world(page); expect(!!w0, "PT: this browser holds a world");
  await page.click("#optionsFresh"); await page.getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(400);
  eq(await world(page), w0, "PT: a cancelled confirm changes nothing");
  await page.click("#optionsFresh"); await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click("#optionsFreshYes")]); await settled(page);
  const w1 = await world(page); expect(!!w1 && w1 !== w0, "PT: Start fresh erased the world and a new one began (" + w0 + " -> " + w1 + ")");
  eq([page.url().includes("?"), await page.evaluate(() => sessionStorage.getItem("mb-play-fresh")), /playtest|dev|jump|names|place/.test(st().url() + page.frame({ url: /\/exploration\// }).url())], [false, null, false], "PT: no URL carries an option, the one-time flag spent");
  eq(await st().evaluate(() => { const s = window.__st.settings; return [s.playtest, s.sittingWait, s.budScale, s.adultTurns, s.elderTurns]; }), [true, "minute", 10, 1, 4], "PT: the Station's settings are the preset's");
  expect(!/playtest|minute/.test((await page.evaluate(() => localStorage.getItem("mb-station-dev"))) ?? ""), "PT: the preset is never written to the settings key");
  const notice = await st().evaluate(() => { const S = window.__st; S.settings.realmSleep = true; S.goto("settings"); return new Promise((r) => setTimeout(() => r(S.props.regions.detail.blocks.filter((b) => b.kind === "notice").length), 500)); });
  eq(notice, 1, "PT: the Station's Settings shows the playtest notice");
  await page.click("#optionsBtn"); await page.locator(".op-panel").waitFor();
  await page.getByRole("switch", { name: "Developer tools" }).click();
  eq(await page.evaluate(() => !document.getElementById("devBtn").classList.contains("hidden")), true, "PT: Developer tools on, the dev button shows");
  await page.click("#optionsDone"); await page.waitForTimeout(300);
  { const h0 = await page.evaluate(() => document.getElementById("devBtn").getBoundingClientRect().height); if (h0 !== 44) console.log(`PT: PAGE BUG (reported, not fixed): with Developer tools turned on in Options the Tools button is not placed until the next layout: ${h0} tall, not 44`); }
  await page.setViewportSize({ width: 1920, height: 1081 }); await page.waitForTimeout(300);   // a resize runs the layout
  eq(await page.evaluate(() => document.getElementById("devBtn").getBoundingClientRect().height), 44, "PT: the Tools button is in the bar once the layout has run (44 tall)");
  await ctx.close();
}

// ---- K. the Caddy's face: always drawn from the Caddy's state with the panel's timing (no block on the page any more); Shift+C is retired (1920 × 1080) ----
if (!ONLY || ONLY === "K") {
  const { ctx, page, st } = await open(1920, 1080, { query: "?test&seed=3&firstms=600000" });   // firstms: the first picture waits for the Station's word and seat however long a loaded page takes to boot (the 15 s no-word fallback is for a real Caddy with no Station)
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  const sheet = () => page.evaluate(() => { const s = __play.caddySheet; delete s.pixels; return s; });
  eq((await sheet()).up, true, "K: shown before any dock");
  await page.waitForFunction(() => __play.caddySheet.id !== null, null, { timeout: 180000 });   // the first picture: a full refresh, black, white, then the face, over 4 s (the limit is a hang detector, not a speed check)
  const away = await sheet();
  eq([away.id, away.lines.l1, away.lines.l2, away.log.map((l) => l.kind)], ["C0", "Companion out", "exploring", ["full"]], "K: at boot one full refresh draws C0");
  eq([away.marks.companion, away.marks.station, away.lamp.companion, away.lamp.stationDot], ["lifted", "seated", "off", "warm"], "K: the Station sits in its cradle (its lamp a dim warm white), the Companion's is empty and dark");
  eq([...new Set(await page.evaluate(() => __play.caddySheet.pixels()))].sort((a, b) => a - b), [0, 255], "K: the panel holds ink and paper only");
  await page.waitForFunction(() => !__play.caddySheet.busy, null, { timeout: 60000 });   // the boot's full refresh (4 s, drawn at 2/3) has ended and the panel is idle (the scheduler's own busy flag): the seat then waits the partial's 0.8 s alone, not what is left of the full
  const before = (await sheet()).log.length, t0 = Date.now(); await page.click("#dockKey");
  await page.waitForFunction(() => __play.caddySheet.id === "C2", null, { timeout: 60000 });
  const k = await sheet(); eq([k.lines.l1, k.lines.l2, k.crates], ["Companion home", "one crate", 1], "K: its lines read the docked state, with one crate icon");
  const op = k.ops.filter((o) => o.kind === "partial" && o.id === "C2").at(-1), drawnAt = k.log.filter((l) => l.kind === "partial" && l.id === "C2").at(-1)?.at;   // the scheduler's decision and the picture's draw, each stamped when it happened: the lag is the panel's, not the machine's
  expect(op && op.at >= t0 && drawnAt - op.at >= 790, "K: the partial is drawn 0.8 s after the panel took it up, and after the seat (" + JSON.stringify([op && op.at - t0, drawnAt - (op && op.at)]) + " ms)");
  eq(k.log.slice(before).map((l) => [l.kind, l.id, l.regions.join(",")]), [["partial", "C2", "hero,msg,status"]], "K: one partial over the regions that changed");
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "K: docked");
  await page.waitForTimeout(6200); eq((await sheet()).up, true, "K: it stays, nothing lowers it");
  await page.keyboard.press("Shift+C"); await page.waitForTimeout(300); eq((await sheet()).up, true, "K: Shift+C does nothing");
  eq((await sheet()).log.length, 2, "K: nothing else redraws it (the Station's heartbeat and the stream change nothing on the panel)");
  await ctx.close();
}
if (!ONLY || ONLY === "K") {
  const { ctx, page, st } = await open(1920, 1080, { query: "?test", options: { dev: true } });
  await page.waitForTimeout(500); await clip(page, "play-dev.png"); await ctx.close();
}

// ---- the standalone Station page's own Dock control (the round key is gone), for the capture ----
if (!ONLY || ONLY === "SA") {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem("play-journey")) { localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("play-journey", "1"); } });   // the Station's clock pinned, as in open()
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  await page.goto(base.replace("/play/", "/station/") + "?test", { waitUntil: "load" }); await page.evaluate(() => window.__st.ready); await page.waitForTimeout(500);
  await page.evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  eq(await page.evaluate(() => [document.getElementById("dockWord").textContent, !document.getElementById("dockDot").hidden, !!document.getElementById("dockKey")]), ["Dock", true, false], "standalone: the control reads Dock with the dot, and the round key is gone");
  await page.click("#dockCtl"); await page.waitForTimeout(600);
  eq(await page.evaluate(() => [document.getElementById("dockWord").textContent, window.__st.ST.dock.docked]), ["Lift", true], "standalone: the control docks (and reads Lift)");
  await page.click("#dockCtl"); await page.waitForTimeout(600); eq(await page.evaluate(() => window.__st.ST.dock.docked), false, "standalone: and lifts");
  await clip(page, "station-standalone-control.png"); await ctx.close();
}

// ---- B8. a Companion crate crosses: the Companion's own bay, the Station's save, the control's dot, the dock and the opening (fresh context, 1920 × 1080) ----
if (!ONLY || ONLY === "B8") {
  const { ctx, page, st, mb } = await open(1920, 1080);
  const stored = () => mb().evaluate(() => JSON.parse(localStorage.getItem(window.__mb.SAVE_KEY)));   // the Companion's own save, under its id
  const id = await mb().evaluate(() => { const S = window.__mb.S, id = "x" + S.wid + "-1"; S.bay.push({ id, n: 1, turn: S.turn, at: Date.now(), e: 3, d: 2, s: 3, pods: [{ id: "q1", sp: 0, g: "meadow", how: "shake", gs: 987654321, k: null }], met: [0], explored: 5, of: 20, lines: [] }); return id; });
  await st().evaluate(() => window.__st.addMaterials(0, 0, 0)); await page.waitForTimeout(600);   // the Station writes its save; the storage event makes the Companion save its bay, and the Station reads it
  expect((await stored()).bay.some((c) => c.id === id), "B8: the stored save's bay holds the crate"); eq((await state(page)).caddy.crates, 1, "B8: the control hears one crate"); eq((await state(page)).dot, true, "B8: the dot shows");
  await page.click("#dockKey"); await page.waitForTimeout(700); eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "B8: docked");
  await st().evaluate(() => window.__st.openBay()); await page.waitForTimeout(600);
  eq(await mb().evaluate(() => window.__mb.S.bay.length), 0, "B8: the Companion's bay is empty"); eq((await stored()).bay.length, 0, "B8: and the stored bay too");
  eq(await st().evaluate((i) => [window.__st.ST.accepted.includes(i), window.__st.ST.tray.some((p) => p.id === i + ":q1")], id), [true, true], "B8: the Station accepted the crate and its pod is in a well");
  eq(await st().evaluate(() => [window.__st.renderErrors, window.__st.faceErrors]), [[], []], "B8: no render or face errors");
  await ctx.close();
}

// ---- U. the Lift (owner 2026-11-09; first-ten-front A2 made it the one Dock / Lift key under the Companion's cradle): while seated the key reads Docked · Lift to go out and lifts; the keys go to the Companion (fresh context, 1920 × 1080) ----
if (!ONLY || ONLY === "U") {
  const { ctx, page, st, mb } = await open(1920, 1080);
  const keyWord = () => page.evaluate(() => document.getElementById("dockWord").textContent);
  eq(await keyWord(), "Dock", "U: lifted and nothing aboard, the key reads Dock (quiet)");
  await page.click("#dockKey"); await page.waitForTimeout(900);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "U: seated");
  eq(await keyWord(), "Lift", "U: the key says how to go out while seated");
  await page.click("#dockKey"); await page.waitForTimeout(900);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), false, "U: the key lifts the Companion");
  eq(await keyWord(), "Dock", "U: and reads Dock again");
  eq(await page.evaluate(() => document.activeElement && document.activeElement.id), "fCompanion", "U: the keys go to the Companion");
  await ctx.close();
}

// ---- P. the Caddy dock's play-through, adapted to the shared save (steps 1-4, 6, 8, and 7 for reloads and a restart of the Caddy service), 1920 × 1080 ----
if (!ONLY || ONLY === "P") {
  const { ctx, page, st, mb } = await open(1920, 1080);
  const face = () => page.evaluate(() => { const s = __play.caddySheet; delete s.pixels; return s; });
  const ST = () => st().evaluate(() => { const s = window.__st.ST; return { e: s.e, d: s.d, s: s.s, accepted: s.accepted.slice(), tray: s.tray.map((p) => p.id), wid: s.wid, docked: s.dock.docked }; });
  const waitFace = (id, ms = 3000) => page.waitForFunction((i) => __play.caddySheet.id === i, id, { timeout: ms }).then(() => true, () => false);
  await page.waitForFunction(() => __play.caddySheet.id !== null, null, { timeout: 9000 });
  // 1. a new world: set out, end the expedition at the start: one crate sealed
  await page.click("#tabCompanion"); await page.waitForTimeout(300); await page.click("#fCompanion"); await page.waitForTimeout(200);   // the tap that takes the Companion into view, then a click inside it for the keys
  await page.keyboard.press("Enter"); await page.waitForFunction(() => window.__play.frames.companion.contentWindow.__mb.S.phase === "place"); await page.waitForTimeout(700);
  await page.keyboard.press("Enter"); await page.waitForFunction(() => window.__play.frames.companion.contentWindow.__mb.S.phase === "map"); await page.waitForTimeout(400);
  // the exploring itself is stood in for: a place entered (the walk turns the world when it entered one; the hearts are out, generator 7) and its finds in the hold (two supplies and a pod), as a walk would leave them
  await mb().evaluate(() => { const ex = window.__mb.S.exp; ex.stats.calls = 1; (ex.entered ||= []).push(ex.pos); ex.cargo.e += 3; ex.cargo.d += 2; ex.cargo.s += 1; ex.cargo.pods.push({ id: "q9", sp: 0, g: "meadow", how: "shake", gs: 987654321, k: null }); });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.keyboard.press("Enter"); await page.waitForTimeout(600);   // the menu: End expedition on top
  if ((await mb().evaluate(() => window.__mb.S.phase)) === "cargo") { await page.keyboard.press("Enter"); await page.waitForTimeout(600); }   // Cargo: ✓ End expedition seals the crate
  const sealed = await page.waitForFunction(() => window.__play.frames.companion.contentWindow.__mb.S.bay.length === 1, null, { timeout: 5000 }).then(() => true, () => false);
  expect(sealed, "P1: ending the expedition at the start seals one crate");
  const crate = await mb().evaluate(() => JSON.parse(JSON.stringify(window.__mb.S.bay[0] ?? null)));
  await page.waitForTimeout(700);
  await waitFace("C0", 8000); await page.waitForTimeout(1200);   // the Station was starved while the Companion made its realm: the face may have read C4b; it returns to C0 once the Station speaks, and the panel settles
  let f = await face(); eq([f.id, f.lines.l1, f.lines.l2], ["C0", "Companion out", "exploring"], "P1: the Caddy reads C0, Companion out · exploring"); eq(f.lamp.companion, "off", "P1: its lamp is off");
  const before = await ST();
  // 2. Dock: the lamp mint at once, the Station's arrival within 0.5 s, the face C2 within 1 s with one crate icon
  const t0 = Date.now(); await page.keyboard.press("Shift+D");
  await page.waitForFunction(() => __play.caddySheet.lamp.companion !== "off", null, { timeout: 1000 }); const tLamp = Date.now() - t0;
  await st().waitForFunction(() => window.__st.UI.screen === "cargo" && window.__st.props?.state === "arrival", null, { timeout: 2000, polling: 20 }).catch(() => {}); const tArr = Date.now() - t0;
  const c2 = await waitFace("C2", 2000), tFace = Date.now() - t0;
  expect(tLamp <= 300, "P2: the lamp is mint at once (" + tLamp + " ms)"); expect(tArr <= 500, "P2: the Station's arrival begins within 0.5 s (" + tArr + " ms)"); expect(c2 && tFace <= 1000, "P2: the face reads C2 within 1 s (" + tFace + " ms)");
  f = await face(); eq([f.lines.l1, f.lines.l2, f.crates, f.marks.companion], ["Companion home", "one crate", 1, "seated"], "P2: Companion home · one crate, with one crate icon");
  // 3. the crate sealed in the Bay, nothing accepted, the supplies unmoved
  let now = await ST(); eq([now.accepted.includes(crate?.id), now.e, now.d, now.s], [false, before.e, before.d, before.s], "P3: the crate waits sealed; nothing accepted, the supplies unmoved");
  // 4. open it: the supplies tick, the pods land, the Companion's crate mark clears, the face changes once to C3 with the ledger's new numbers
  await page.waitForTimeout(3600); await st().waitForFunction(() => window.__st.props?.regions?.arrival?.phase === "choice", null, { timeout: 15000 }).catch(() => {});
  await page.keyboard.press("Enter");   // ✓ Open the crate
  const opened = await st().waitForFunction((id) => window.__st.ST.accepted.includes(id), crate?.id, { timeout: 20000 }).then(() => true, () => false); expect(opened, "P4: the crate is accepted at its opening");
  await page.waitForTimeout(800); if (await st().evaluate(() => window.__st.props?.state === "opening" && window.__st.props?.regions?.opening?.crates?.[0]?.hold)) await page.keyboard.press("Enter");   // the first pod the Station stores holds the view: ✓ Take the pod (arrival B)
  const c3 = await waitFace("C3", 12000); expect(c3, "P4: the face reads C3");
  now = await ST(); f = await face();
  expect(now.e - before.e >= crate.e && now.d - before.d >= crate.d && now.s - before.s >= crate.s, "P4: Energy, Data and Essence tick (" + [now.e - before.e, now.d - before.d, now.s - before.s] + " for a crate of " + [crate.e, crate.d, crate.s] + ")");
  expect(crate.pods.every((p) => now.tray.some((t) => t.endsWith(":" + p.id))), "P4: its pods land on the Pods shelf");
  eq(await mb().evaluate(() => window.__mb.S.bay.length), 0, "P4: the Companion's crate mark clears");
  const pods = crate.pods.length, words = ["no", "one", "two", "three", "four", "five"];
  eq([f.lines.l1, f.lines.l2], ["one crate home", pods ? words[pods] + (pods === 1 ? " new pod" : " new pods") : null], "P4: one crate home, and its new pods");
  eq(f.ledger.map((r) => r.text), [now.e, now.d, now.s].map(String), "P4: with the ledger's new numbers");
  const since = f.log.findIndex((l) => l.id === "C2"); eq(f.log.slice(since).map((l) => l.id), ["C2", "C3"], "P4: the face changed once, never once per crate");
  // 6. a mibi taken along, then Lift: the Companion has it, the Probe mended; the face Companion out · with it; the lamp off
  for (let i = 0; i < 2 && (await st().evaluate(() => window.__st.UI.screen)) === "cargo"; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  const mibi = await st().evaluate(() => { window.__st.seedAdults("S01", 5, 1); const m = window.__st.ST.mibis.at(-1); return { id: m.id, name: m.name, r: window.__st.carryAdd(m.id) }; });
  expect(mibi.r.ok, "P6: Take along is asked " + JSON.stringify(mibi.r));
  await page.waitForTimeout(800);
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(1500);
  const comp = await mb().evaluate(() => ({ carried: window.__mb.S.carried.slice(), shield: window.__mb.S.shield, docked: window.__mb.isDocked() }));
  eq([comp.carried.includes(mibi.id), comp.docked], [true, false], "P6: lifted, the mibi is with the Companion"); expect(comp.shield >= 3, "P6: the Probe mended (" + comp.shield + ")");
  await waitFace("C0", 3000); await page.waitForFunction(() => /^with /.test(__play.caddySheet.lines?.l2 ?? ""), null, { timeout: 6000 }).catch(() => {}); f = await face(); eq([f.lines.l1, f.lines.l2, f.lamp.companion], ["Companion out", "with " + mibi.name, "off"], "P6: Companion out · with its partner, the lamp off");
  // 7. reloads and a restart: nothing lost, nothing accepted twice
  const kept = await ST(), dockBefore = await (await fetch(base.replace("/sandbox/play/", "/caddy-api/v1/dock?world=") + kept.wid)).json();
  await st().evaluate(() => location.reload()); await page.waitForTimeout(1500); await page.waitForFunction(() => window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }); await st().evaluate(() => window.__st.ready); await page.waitForTimeout(800);
  await mb().evaluate(() => location.reload()); await page.waitForTimeout(1500); await page.waitForFunction(() => window.__play.frames.companion.contentWindow.__mb && window.__play.frames.companion.contentWindow.__mb.S, null, { timeout: 30000 }); await page.waitForTimeout(800);
  await caddyStop(); await caddyStart(); await page.waitForTimeout(2500);
  const after = await ST(), dockAfter = await (await fetch(base.replace("/sandbox/play/", "/caddy-api/v1/dock?world=") + kept.wid)).json();
  eq([after.e, after.d, after.s, after.accepted, after.tray, after.docked], [kept.e, kept.d, kept.s, kept.accepted, kept.tray, false], "P7: the Station after its reload: nothing lost");
  eq(new Set(after.accepted).size, after.accepted.length, "P7: nothing accepted twice");
  eq(await mb().evaluate(() => [window.__mb.S.bay.length, window.__mb.S.carried.slice()]), [0, comp.carried], "P7: the Companion after its reload: its bay clear, its mibi with it");
  eq(dockAfter.cradles, dockBefore.cradles, "P7: the Caddy service after a restart keeps its cradles");
  // 8. Companion silent: amber and C4a after 10 s; lifted, the switch off, seated again: the arrival plays
  await page.evaluate(() => __play.setSwitch("silent", true)); await page.waitForTimeout(300);
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), false, "P8: silent: the Station hears no dock");
  const c4a = await waitFace("C4a", 12500); f = await face();
  expect(c4a, "P8: the face reads C4a"); eq([f.lines.l1, f.lines.l2, f.lamp.companion, f.lamp.dot], ["Companion seated", "no word from it", "hand", "amber"], "P8: no word from it, the lamp amber");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(700); await page.evaluate(() => __play.setSwitch("silent", false)); await page.waitForTimeout(400);
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(700);
  eq(await st().evaluate(() => [window.__st.ST.dock.docked, window.__st.UI.screen]), [true, "cargo"], "P8: seated again with the switch off, the arrival plays");
  expect(await waitFace("C2", 6500), "P8: and the face reads C2");   // up to 4 s for a full refresh already running (the fifth partial is followed by one at the first quiet moment, which C4a's may be), then the next tick and the partial's 0.8 s
  // C4b and C4c, briefly: the Station quiet crosses the link after 15 s; the Caddy fault refuses the seat
  await page.keyboard.press("Enter"); await page.waitForTimeout(800); await page.keyboard.press("Shift+D"); await page.waitForTimeout(800);
  await page.evaluate(() => __play.setSwitch("fault", true)); await page.keyboard.press("Shift+D"); await page.waitForTimeout(400);
  expect(await waitFace("C4c", 2500), "P: the Caddy fault reads C4c"); f = await face(); eq([f.lines.l1, f.lamp.companion, f.marks.companion], ["Caddy fault", "hand", "seated"], "P: the fault: amber, the marks as sensed");
  eq(await st().waitForFunction(() => window.__st.ST.dock.docked === false, null, { timeout: 8000 }).then(() => false, () => true), false, "P: nothing was taken (the Station is not docked)");
  eq(await page.evaluate(() => __play.dock.snap.cradles.companion.state), "lifted", "P: the Caddy stored no seat");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(700); await page.evaluate(() => __play.setSwitch("fault", false));
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(700); await page.evaluate(() => __play.setSwitch("quiet", true));
  expect(await waitFace("C4b", 17000), "P: the Station quiet reads C4b after 15 s"); f = await face();
  eq([f.marks.link, f.lines.l3, /as of \d\d:\d\d$/.test(f.lines.stamp)], ["lost", "the crates wait here", true], "P: the link crossed, the stamp gains the time");
  await page.evaluate(() => __play.setSwitch("quiet", false)); await page.keyboard.press("Shift+D"); await page.waitForTimeout(800);
  eq(await st().evaluate(() => window.__st.renderErrors), [], "P: no render errors");
  await ctx.close();
}

// ---- D. printed, not asserted (viewport 1920 × 1080, Home idle, the Companion on its map): each figure with its bar ----
if (!ONLY || ONLY === "D") {
  const { ctx, page, st, mb } = await open(1920, 1080, { motion: true, query: "?test&seed=3" });
  await page.click("#tabCompanion"); await page.keyboard.press("Enter"); await page.waitForTimeout(900); await page.keyboard.press("Enter"); await page.waitForTimeout(900);   // the Companion on its map
  const cdp = await ctx.newCDPSession(page); await cdp.send("Performance.enable"); await cdp.send("Runtime.enable");
  const MB = 1048576, bar = (v, lim, unit = "MB") => `${(v / MB).toFixed(1)} ${unit} against ≤ ${(lim / MB).toFixed(0)} ${unit}: ${v <= lim ? "within" : "over"}`;
  const heap = await cdp.send("Runtime.getHeapUsage"); console.log(`D: page JavaScript heap (all frames, one isolate): ${bar(heap.usedSize, 192 * MB)} (embedder ${((heap.embedderHeapUsedSize || 0) / MB).toFixed(1)} MB, backing store ${((heap.backingStorageSize || 0) / MB).toFixed(1)} MB)`);
  const face = await st().evaluate(() => window.__st.face.stats); console.log(`D: the face's wasm memory: ${bar(face.heap, 64 * MB)}; frames ${face.frames}, props ${face.props}, pictures ${face.pictures}`);
  const perFrame = async (label) => {
    const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const n = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(n); }; requestAnimationFrame(tick); }));
    const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value])), ms = ((m1.TaskDuration - m0.TaskDuration) * 1000) / n;
    console.log(`D: main-thread time a frame, ${label}: ${ms.toFixed(2)} ms over ${n} frames against ≤ 12 ms: ${ms <= 12 ? "within" : "over"}`);
  };
  await perFrame("unthrottled"); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); await perFrame("CPU throttled 4×"); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();
}

// ---- E1. a context created at each ratio: both screens are whole CSS pixels scaled to whole device pixels ----
const screenAt = (frame, W) => frame().evaluate(() => { const el = document.querySelector("#screen"); return [getComputedStyle(el).width, el.getBoundingClientRect().width, window.devicePixelRatio]; });
if (!ONLY || ONLY === "E1") {
  for (const dsf of [1.25, 1.5, 1.75, 2, 1]) {
    const { ctx, page, st, mb } = await open(1920, 1080, { dsf });
    const k = Math.max(1, Math.floor(dsf));
    for (const [name, W, frame] of [["Station", 1024, st], ["Companion", 450, mb]]) {
      const m = await screenAt(frame);
      eq(m[0], W + "px", `E1: the ${name}'s computed width at dpr ${dsf}`); near(m[1] * m[2], W * k, `E1: the ${name}'s rect × dpr at ${dsf}`, 0.001);
    }
    await page.click("#tabCompanion"); await page.waitForTimeout(400);   // the Companion in view (the Station is fitted to the window by design, not by whole steps)
    { const [bad, s, whole] = await frameBad(page, null, "#fCompanion", () => mb().evaluate(() => window.__mb.capture())); eq([bad, whole, s >= k], [0, true, true], `E1: the Companion in view at dpr ${dsf}: whole device-pixel blocks of ${s} (differing device pixels, whole step, at least ${k})`); }
    await ctx.close();
  }
}

// ---- E2. a change of ratio with no resize (CDP override at a fixed viewport): only where the override reaches child frames with a change event (Chromium 141 and later) ----
if (!ONLY || ONLY === "E2") {
  const ver = browser.version(), major = parseInt(ver, 10);
  if (!(major >= 141)) console.log(`E2: skipped on Chromium ${ver} (its override reaches child frames with no change or resize event)`);
  else {
    const { ctx, page, st, mb } = await open(1920, 1080);
    await page.click("#tabCompanion"); await page.waitForTimeout(400);
    const cdp = await ctx.newCDPSession(page), failsBefore = fails.length;
    for (const dsf of [1.25, 1.5, 1.75, 2, 1]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: dsf, mobile: false }); await page.waitForTimeout(400);
      const k = Math.max(1, Math.floor(dsf));
      for (const [name, W, frame] of [["Station", 1024, st], ["Companion", 450, mb]]) {
        const m = await screenAt(frame);
        near(m[1] * m[2], W * k, `E2: the ${name}'s rect × dpr at ${dsf}`, 0.001);
      }
      { const [bad, s, whole] = await frameBad(page, cdp, "#fCompanion", () => mb().evaluate(() => window.__mb.capture())); eq([bad, whole, s >= k], [0, true, true], `E2: the Companion in view at dpr ${dsf}: whole device-pixel blocks of ${s} (differing device pixels, whole step, at least ${k})`); }
    }
    if (fails.length === failsBefore) console.log("E2: ok (5 ratios)");
    await ctx.close();
  }
}

// R: the recovery print's strip. A Caddy on a card that was never printed queues one print; the page shows it once as a card at the window's foot at 1x (the 384-dot picture as it is, an "I have it" button), it tells the
// Caddy and the strip goes for good; the card then holds only the public key and the key id
if (!ONLY || ONLY === "R") {
  await caddyStop(); rmSync(path.join(caddyData, "identity.json")); await caddyStart();
  const { ctx, page } = await open(1920, 1300);
  await page.waitForFunction(() => { const b = document.getElementById("caddyPrint"), i = document.getElementById("printImg"); return b && !b.classList.contains("hidden") && i.complete && i.naturalWidth === 384; }, null, { timeout: 30000 }).catch(() => {});
  const shown = await page.evaluate(() => { const b = document.getElementById("caddyPrint"), i = document.getElementById("printImg"); return { hidden: b.classList.contains("hidden"), w: i.naturalWidth, h: i.naturalHeight, css: [i.getBoundingClientRect().width, i.getBoundingClientRect().height], btn: document.getElementById("printTaken").getBoundingClientRect().height }; });
  expect(!shown.hidden, "R: the strip shows while a print waits");
  near(shown.css, [384, shown.h], "R: the print is drawn dot for dot at 1x", 0.01);
  expect(shown.btn >= 40, "R: the I-have-it button is at least 40 px tall: " + shown.btn);
  const sb = await box(page, "#caddyPrint");
  expect(sb[0] >= 0 && sb[1] >= 0 && sb[0] + sb[2] <= 1920 && sb[1] + sb[3] <= 1300, "R: the card is whole inside the window (fixed at its foot while a print waits)");
  await page.locator("#printTaken").click(); await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.getElementById("caddyPrint").classList.contains("hidden")), "R: I have it takes the strip away");
  const id = JSON.parse(readFileSync(path.join(caddyData, "identity.json"), "utf8"));
  eq(Object.keys(id.recovery).sort(), ["kid", "pub"], "R: the card holds the public key and the key id");
  eq((await fetch(`http://127.0.0.1:${caddyPort}/status`).then((r) => r.json())).identity, "printed", "R: the Caddy says printed");
  console.log("R: " + (fails.length ? "see above" : "ok (the recovery strip)"));
  await ctx.close();
}

// ---- PH. the phone: touch emulation at 412 × 915, 390 × 844 and 915 × 412 (its own file; the desktop sections above run with a mouse and are unchanged by it) ----
if (!ONLY || ONLY === "PH") { const r = spawnSync(process.execPath, [path.join(here, "phone.mjs")], { encoding: "utf8", env: process.env }); process.stdout.write(r.stdout ?? ""); process.stderr.write(r.stderr ?? ""); expect(r.status === 0, "PH: the phone test (tools/phone.mjs) passes"); }

await browser.close(); server.close(); await caddyStop(); rmSync(caddyData, { recursive: true, force: true });
if (errors.length) fails.push(...errors);
console.log(fails.length ? `\nplay journey FAILED: ${fails.length}` : "\nplay journey ok");
process.exit(fails.length ? 1 : 0);
