#!/usr/bin/env node
// The play-page journey: the page that holds the Station and the Companion, each with its key tray, played headless. It serves prototypes/ as the sandbox does, opens
// /sandbox/play/?test in Chromium. There is no save fixture: each context starts a fresh Companion world, and A, B1-B7, C and the stack journey seed their crate with `__st.seedCrate("S01", 2, 4101)`; B8 crosses a real
// Companion crate. It proves: A, the Row layout at 1x (every frame's box exact, both screens 1:1 on the page, also at dpr 1.25); B, the dock round trip with the keys, the landing rule and
// the lift; C, the narrow tier; ST, the Stack and the dock round trip in it with the page scrolled (the Station wholly in view after the contact beat); M, the layouts and key minimums measured at 1280 x 720, 1440 x 900,
// 1920 x 1080, 2560 x 1440 and 1440 x 900 at dpr 1.25 and 1.75 (each key's CSS box, the trays, the Companion never cut, both faces on whole device pixels); K, the Caddy's screen always shown; D, the figures it prints
// (heaps, the face, main-thread time a frame); E, a change of device pixel ratio with no resize; Z, the size (fit, a chosen z of 2 in whole blocks, kept per browser) and the build stamp, outside ?test. Fails on any page error, any console error in any frame (a 404 for the optional build stamp or the Caddy service is not one) and any assertion.
//   node prototypes/play/tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local)
//   PLAY_CAPTURES=1 node prototypes/play/tools/journey.mjs     also writes the captures of img/ (clipped to the page)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { decodePNG } from "../../ui/png.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), img = path.resolve(here, "../img");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
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

async function open(width, height, { dsf = 1, motion = false, query = "?test" } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion: motion ? "no-preference" : "reduce" });
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
// the arrival (the Station takes the keys and behaves as if it had them, and Later returns to the screen it was on): one crate holds input for 3000 + 200 ms, then the strip (Open now | Later) with the ring on Open now; ▶ then ✓ is Later
const later = async (page, st, what, back, empty = false) => {
  if (empty) {   // C docks with an empty bay: the show has no choice, so a key skips it and it closes on the screen the player was on
    await page.waitForTimeout(1000); await page.keyboard.press("Enter"); await page.waitForTimeout(800); await back(); return;
  }
  await page.waitForTimeout(3600);   // one crate: the show holds 3200 ms
  await st().waitForFunction(() => window.__st.props?.overlay?.form === "strip", null, { timeout: 15000 }).catch(() => {});
  eq(await st().evaluate(() => [window.__st.props?.overlay?.form, window.__st.props?.overlay?.focus?.cur]), ["strip", "card.open"], what + ": after the show the strip, the ring on Open now");
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200); await page.keyboard.press("Enter"); await page.waitForTimeout(800);
  await back();
};
const box = async (page, sel) => { const b = await page.locator(sel).boundingBox(); return [b.x, b.y, b.width, b.height]; };
const rd = (buf) => decodePNG(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
const dataPng = (url) => rd(Buffer.from(url.split(",")[1], "base64"));
const sameImage = (a, b) => a.width === b.width && a.height === b.height && Buffer.compare(Buffer.from(a.data.buffer, a.data.byteOffset, a.data.byteLength), Buffer.from(b.data.buffer, b.data.byteOffset, b.data.byteLength)) === 0;
// the lamp's 8 × 8 clip against its master composited over the cradle's fill (bar #23292f): the opaque pixels exact, the rest within 1 a channel
const BAR = [0x23, 0x29, 0x2f];
async function lampIs(page, which, label) {
  const r = await page.locator("#lamp").boundingBox(), got = rd(await page.screenshot({ clip: { x: r.x, y: r.y, width: 8, height: 8 } })), m = decodePNG(readFileSync(path.join(root, `ui/assets/masters/pods/frame-lamp-8-${which}.png`)));
  let opaque = 0, bad = 0;
  for (let i = 0; i < 64; i++) { const a = m.data[i * 4 + 3]; if (a === 255) opaque++; for (let c = 0; c < 3; c++) { const want = Math.round((m.data[i * 4 + c] * a) / 255 + (BAR[c] * (255 - a)) / 255), have = got.data[i * 4 + c]; if (a === 255 ? have !== want : Math.abs(have - want) > 1) bad++; } }
  expect(bad === 0 && opaque === 16, `${label}: the lamp is the ${which} master over the cradle's fill (${opaque} opaque pixels, ${bad} channels off)`);
}
// a device's screen on the page against its own capture(): the viewport by CDP Page.captureScreenshot under an override (Playwright's scale "device" ignores it), by page.screenshot({ scale: "device" }) in a context created at the ratio (cdp null); the frame's region at (round(x·dpr), round(y·dpr))
// sized W·k × 600·k, each capture pixel spread over k × k; the count of differing device pixels
async function frameBad(page, cdp, sel, W, capture) {
  const r = await box(page, sel), dprv = await page.evaluate(() => window.devicePixelRatio), k = Math.max(1, Math.floor(dprv));
  const shot = cdp ? rd(Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64")) : rd(await page.screenshot({ scale: "device" })), cap = dataPng(await capture()), x0 = Math.round(r[0] * dprv), y0 = Math.round(r[1] * dprv);
  let bad = 0; for (let y = 0; y < 600 * k; y++) for (let x = 0; x < W * k; x++) { const a = ((y0 + y) * shot.width + x0 + x) * 4, b = (Math.floor(y / k) * cap.width + Math.floor(x / k)) * 4; if (shot.data[a] !== cap.data[b] || shot.data[a + 1] !== cap.data[b + 1] || shot.data[a + 2] !== cap.data[b + 2]) bad++; }
  return bad;
}
const pixel = async (page, x, y) => { const p = rd(await page.screenshot({ clip: { x, y, width: 1, height: 1 } })); return [...p.data.slice(0, 3)]; };
const state = (page) => page.evaluate(() => ({ owner: __play.owner, caddy: __play.caddy, tier: __play.tier, seat: __play.seatOff, word: document.getElementById("dockWord").textContent, mark: document.getElementById("dockMark").getAttribute("src"), dot: !document.getElementById("dockDot").hidden, live: document.getElementById("live").textContent, active: document.activeElement && document.activeElement.id }));
const clip = (page, name, rect) => process.env.PLAY_CAPTURES ? (mkdirSync(img, { recursive: true }), page.screenshot({ path: path.join(img, name), clip: rect ?? { x: 0, y: 0, width: page.viewportSize().width, height: page.viewportSize().height } })) : null;

// ---- A. layout at 1× (viewport 1920 × 1080) ----
{
  const { ctx, page, st, mb } = await open(1920, 1080);
  eq(await page.evaluate(() => __play.tier), "row", "A: the layout at 1920 × 1080");
  eq(await box(page, "#fStation"), [195, 64, 1024, 600], "A: the Station frame"); eq(await box(page, "#fCompanion"), [1259, 64, 450, 600], "A: the Companion frame");
  eq(await box(page, "#dockCtl"), [1484, 0, 168, 40], "A: the control"); eq(await box(page, "#cradle"), [1251, 744, 466, 28], "A: the cradle"); eq(await box(page, "#lamp"), [1263, 760, 8, 8], "A: the lamp");
  eq([await box(page, "#shStation"), await box(page, "#rowStation"), await box(page, "#shCompanion"), await box(page, "#rowCompanion")], [[187, 56, 1040, 616], [187, 672, 1040, 72], [1251, 56, 466, 616], [1251, 672, 466, 72]], "A: the shells and their joined trays");
  eq(await page.evaluate(() => [getComputedStyle(document.getElementById("fBench")).display, !!document.getElementById("fBench").getAttribute("src")]), ["none", false], "A: the workbench is hidden and not loaded");
  const sImg = rd(await page.screenshot({ clip: { x: 195, y: 64, width: 1024, height: 600 } })), sCap = dataPng(await st().evaluate(() => window.__st.capture()));
  eq(await st().evaluate(() => window.__st.props?.regions?.bar?.clock), "12:00", "A: the bar's clock is the pinned Station time (a minute tick cannot differ a capture)");
  expect(sameImage(sImg, sCap), "A: the page's Station frame is pixel-equal to __st.capture() (1:1)");
  const cImg = rd(await page.screenshot({ clip: { x: 1259, y: 64, width: 450, height: 600 } })), cCap = dataPng(await mb().evaluate(() => window.__mb.capture()));
  expect(sameImage(cImg, cCap), "A: the page's Companion frame is pixel-equal to __mb.capture() (1:1)");
  // one reading: every drawn key's img is whole at 24 px
  const keyImgs = await page.evaluate(() => [...document.querySelectorAll(".k img")].map((i) => ({ complete: i.complete, w: i.naturalWidth })));
  expect(keyImgs.length >= 4 && keyImgs.every((i) => i.complete && i.w === 24), `A: each drawn key's img is complete with naturalWidth 24 (${keyImgs.length} read)`);
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  await clip(page, "play-row-away.png");
  await ctx.close();
  // in a context created at dpr 1.25 the Station frame is 819.2 CSS px (1024 device px) and both screens equal their captures pixel for pixel
  const hi = await open(1920, 1080, { dsf: 1.25 });
  const r = await box(hi.page, "#fStation"); near(r[2], 819.2, "A: the Station frame's width at dpr 1.25", 1 / 64); near(r[3], 480, "A: its height at dpr 1.25", 0.02);
  eq(await frameBad(hi.page, null, "#fStation", 1024, () => hi.st().evaluate(() => window.__st.capture())), 0, "A: the Station frame at dpr 1.25: differing device pixels");
  eq(await frameBad(hi.page, null, "#fCompanion", 450, () => hi.mb().evaluate(() => window.__mb.capture())), 0, "A: the Companion frame at dpr 1.25: differing device pixels");
  await hi.ctx.close();
}

// ---- B. the dock round trip (viewport 1920 × 1080, one crate aboard) ----
{
  const { ctx, page, st, mb } = await open(1920, 1080, { query: "?test&seed=3" });
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  let s = await state(page);
  await lampIs(page, "stone", "B1");
  eq([s.word, s.mark.includes("outline"), s.dot, s.caddy.docked, s.caddy.crates], ["Dock", true, true, false, 1], "B1: away: Dock, the outline mark, the amber dot");
  await st().evaluate(() => window.__st.act("research")); await page.waitForTimeout(300);   // the Station on Pods
  eq(await st().evaluate(() => window.__st.UI.screen), "pods", "B2: the Station is on Pods");
  await page.mouse.click(1300, 300); await page.waitForTimeout(200);   // a click inside the Companion frame gives it the keys
  const podsRing = await st().evaluate(() => window.__st.UI.pods.focus.cur);   // Pods' ring before the dock
  s = await state(page); eq(s.owner, "companion", "B2: the Companion has the keys");
  await page.keyboard.press("Enter"); await page.waitForFunction(() => window.__play.frames.companion.contentWindow.__mb.S.phase === "place"); await page.waitForTimeout(700); await page.keyboard.press("Enter"); await page.waitForFunction(() => window.__play.frames.companion.contentWindow.__mb.S.phase === "map"); await page.waitForTimeout(300);
  const walk = () => mb().evaluate(() => { const e = window.__mb.S.exp; return { start: e.start, pos: e.pos, face: e.face }; }), w0 = await walk();
  eq([w0.face, w0.pos === w0.start], ["down", true], "B2: before D the Companion faces down at its start");
  expect(await mb().evaluate((p) => window.__mb.canStep(p, "right"), w0.pos), "B2: the step to the right is open from the start (the precondition)");
  await mb().evaluate(() => { window.__heard = []; window.addEventListener("keydown", (e) => window.__heard.push((e.shiftKey ? "Shift+" : "") + e.code)); });
  await page.keyboard.press("d"); await page.waitForTimeout(400);
  const w1 = await walk(); eq([w1.face, w1.pos], ["right", w0.start + 1], "B2: after D the Companion faces right, one step on");
  eq(await st().evaluate(() => window.__st.ST.dock.docked), false, "B2: plain D never docks"); eq(await mb().evaluate(() => window.__heard), ["KeyD"], "B2: and the Companion heard exactly KeyD");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600);
  expect(!(await mb().evaluate(() => window.__heard)).includes("Shift+KeyD"), "B2: Shift+D (the letter) never reached the Companion");
  s = await state(page);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "B2: the Caddy is docked within 600 ms");
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.props?.state]), ["cargo", "arrival"], "B2: the dock plays the arrival over the screen the player is on: Cargo's arrival");
  eq([s.word, s.mark.includes("solid"), s.dot], ["Lift", true, false], "B2: the control reads Lift with the solid mark and no dot");
  await lampIs(page, "mint", "B2");
  near((await box(page, "#fCompanion"))[1], 72, "B2: the Companion frame is at y 72 (seated)");
  eq(await page.evaluate(() => { const t = document.getElementById("rowCompanion").getBoundingClientRect(); const e = document.elementFromPoint(t.left + 3, t.top + 2); return e && e.closest("#rowCompanion") ? "tray" : e && e.id; }), "tray", "B2: seated, the tray draws over the shell (only the shell's bottom border goes under it)");
  const ring = await page.evaluate(() => __play.rects().ring), sh = await box(page, "#shStation"); expect(ring[0] < sh[0] && ring[1] < sh[1], "B2: the ring is on the Station shell");
  eq(s.active, "fStation", "B2: the keys went to the Station"); eq(s.live, "Companion docked", "B2: the live region");
  eq(await mb().evaluate(() => window.__mb.isDocked()), true, "B2: the Companion frame sees the dock");
  await later(page, st, "B2", async () => eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.UI.pods.focus.cur]), ["pods", podsRing], "B2: after the arrival, Later returns to Pods with its ring where it was")); await clip(page, "play-row-docked.png");   // the arrival is over and Later is pressed
  await page.keyboard.press("r"); await page.waitForTimeout(300);
  eq(await st().evaluate(() => window.__st.UI.screen), "pods", "B3: the keys are the Station's: R shows Pods");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600); s = await state(page);
  eq(await st().evaluate(() => [window.__st.ST.dock.docked, window.__st.UI.screen]), [false, "pods"], "B4: lifted, and the Station stays on Pods");
  eq([s.word, s.mark.includes("outline")], ["Dock", true], "B4: the control reads Dock again"); near((await box(page, "#fCompanion"))[1], 64, "B4: the Companion frame is back at y 64");
  await lampIs(page, "stone", "B4"); eq(s.active, "fCompanion", "B4: the Companion has the keys"); eq(s.live, "Companion lifted", "B4: the live region");
  // B5: Create keeps the player where they are, with the plate
  await st().evaluate(() => { const S = window.__st; S.seedPod("S01", 3); const p = S.ST.tray.at(-1); S.readSome(p.id, 1); S.openCreate(p.id); }); await page.waitForTimeout(400);
  eq(await st().evaluate(() => window.__st.UI.screen), "create", "B5: the Station is on Create");
  await page.mouse.click(1300, 300); await page.waitForTimeout(150); await page.keyboard.press("Shift+D"); await page.waitForTimeout(600);
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.ST.dock.docked]), ["create", true], "B5: docked, and the Station stays on Create");
  expect((await st().evaluate(() => window.__st.msg)) !== "", "B5: with the dock's plate");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(500);
  // B6: the focus keys
  await st().evaluate(() => window.__st.said());
  await page.keyboard.press("Backquote"); await page.waitForTimeout(200); s = await state(page); const o1 = s.owner;
  await page.keyboard.press("Backquote"); await page.waitForTimeout(400); s = await state(page); const o2 = s.owner;
  eq([o1, o2], ["station", "companion"], "B6: the focus key cycles Station, Companion (no bench) from the Companion");
  const loaded = await page.evaluate(() => !!document.getElementById("fBench").getAttribute("src")); expect(!loaded, "B6: the bench frame is never loaded");
  await page.keyboard.press("Shift+Backquote"); await page.waitForTimeout(200); eq((await state(page)).owner, "station", "B6: Shift+` goes back");
  eq(await st().evaluate(() => window.__st.said()), [], "B6: no device heard the focus keys");
  // B7: errors
  const errs = await st().evaluate(() => ({ r: window.__st.renderErrors, f: window.__st.faceErrors })); eq([errs.r, errs.f], [[], []], "B7: the Station's render and face errors");
  await ctx.close();
}

// ---- C. the narrow tier (viewport 1000 × 800) ----
{
  const { ctx, page, st, mb } = await open(1000, 800);
  const vis = (id) => page.evaluate((i) => getComputedStyle(document.getElementById(i)).visibility, id);
  eq(await page.evaluate(() => __play.tier), "narrow", "C: the tier");
  eq([await vis("shStation"), await vis("shCompanion")], ["visible", "hidden"], "C: only the Station shows");
  await page.click("#tabCompanion"); await page.waitForTimeout(200);
  eq([await vis("shStation"), await vis("shCompanion")], ["hidden", "visible"], "C: the Companion tab shows only the Companion");
  await clip(page, "play-narrow-companion.png");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600);
  eq([await vis("shStation"), await vis("shCompanion")], ["visible", "hidden"], "C: Dock shows the Station");
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.ST.dock.docked]), ["cargo", true], "C: Dock shows the Station: the arrival on Cargo, docked");
  expect(/^Caddy: Companion home/.test(await page.evaluate(() => document.getElementById("note").textContent)), "C: narrow has no Caddy block: the bar's note says the Caddy's lines"); eq(await page.evaluate(() => document.getElementById("caddySheet").classList.contains("hidden")), true, "C: no Caddy block in narrow");
  await later(page, st, "C", async () => eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.UI.home.f]), ["home", "room"], "C: after the arrival, the screen is Home with the ring on the room"), true);
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600);
  eq([await vis("shStation"), await vis("shCompanion"), await st().evaluate(() => window.__st.ST.dock.docked)], ["hidden", "visible", false], "C: Lift shows the Companion");
  // the bench is hidden in narrow too: no tab, no sheet, the stage stays live
  eq(await page.evaluate(() => [getComputedStyle(document.getElementById("tabBench")).display, document.getElementById("stage").hasAttribute("inert")]), ["none", false], "C: no Bench tab, the stage is live");
  const ctls = await page.evaluate(() => [...document.querySelectorAll("#bar .ctl:not(.hidden)")].map((c) => { const r = c.getBoundingClientRect(); return [c.id, r.width, r.height]; }));
  expect(ctls.length >= 4 && ctls.every((c) => c[2] === 40), "C: every control in the bar is 40 tall " + JSON.stringify(ctls)); const dk = ctls.find((c) => c[0] === "dockCtl"); expect(dk && dk[1] >= 40 && dk[2] >= 40, "C: the icon Dock is at least 40 × 40");
  await page.click("#tabCompanion"); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [__play.owner, document.getElementById("stage").hasAttribute("inert"), document.getElementById("note").classList.contains("hidden")]), ["companion", false, false], "C: the Companion tab has the keys and the note shows");
  // the hidden frame's storage path: the Station is hidden, a crate arrives, the control's dot changes within 600 ms
  eq((await state(page)).dot, false, "C: no dot before the crate");
  await st().evaluate(() => window.__st.seedCrate("S01", 1, 7)); await page.waitForTimeout(600);
  eq((await state(page)).dot, true, "C: the dot shows within 600 ms of a crate arriving in the hidden Station");
  await ctx.close();
}

// ---- ST. the Stack (1440 x 900): the Station on top, the Companion under it; the dock round trip with the page scrolled to the Companion ----
{
  for (const motion of [false, true]) {
    const { ctx, page, st, mb } = await open(1440, 900, { motion, query: "?test&seed=3" });
    const tag = "ST" + (motion ? " (eased scroll)" : "");
    eq(await page.evaluate(() => __play.tier), "stack", tag + ": the layout at 1440 × 900");
    if (!motion) {
      eq((await page.evaluate(() => __play.scroll))[0], 0, "ST: a device already wholly in view opens at scrollTop 0 (1440 × 900)");
      await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }); await st().evaluate(() => window.__st.ready); await mb().waitForFunction(() => window.__mb && window.__mb.S, null, { timeout: 30000 }); await page.waitForTimeout(600);
      eq((await page.evaluate(() => __play.scroll))[0], 0, "ST: a reload opens at scrollTop 0 again");
      await page.keyboard.press("Shift+Slash"); await page.waitForTimeout(150);
      const keysText = await page.evaluate(() => document.getElementById("keysPanel").innerText);
      expect(!/bench/i.test(keysText) && !/\bLoci\b|\bTrait\b|\bCompare\b|\bCross\b|Export frame/.test(keysText) && /Station/.test(keysText) && /Companion/.test(keysText), "ST: Keys ? lists no bench keys: " + keysText.replace(/\s+/g, " ").slice(0, 120));
      await page.keyboard.press("Shift+Slash"); await page.waitForTimeout(100);
    }
    eq([await box(page, "#shStation"), await box(page, "#rowStation"), await box(page, "#shCompanion")], [[192, 56, 1040, 616], [192, 672, 1040, 72], [479, 768, 466, 616]], tag + ": the column: the Station shell, its tray, the Companion shell under it, both centred (the tray joined, 24 between the blocks)");
    const [sc, ch, sh] = await page.evaluate(() => __play.scroll); eq([sh + 40, sc], [1812, 0], tag + ": the column is 1,812 tall and starts at the top");
    await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(500);
    await page.click("#tabCompanion"); await page.waitForTimeout(motion ? 500 : 100);
    const inView = async (sel) => { const b = await box(page, sel); return b[1] >= 40 - 0.5 && b[1] + b[3] <= 900 + 0.5; };
    eq(await page.evaluate(() => __play.owner), "companion", tag + ": the tab gives the Companion the keys");
    expect((await inView("#shCompanion")) && (await inView("#rowCompanion")), tag + ": the page scrolled the Companion wholly into view, its tray included");
    expect((await page.evaluate(() => __play.scroll))[0] > 0, tag + ": the page scrolled");
    await clip(page, "play-stack-companion.png");
    await page.keyboard.press("Shift+D"); await page.waitForTimeout(motion ? 900 : 700);
    eq(await st().evaluate(() => window.__st.ST.dock.docked), true, tag + ": docked");
    eq(await page.evaluate(() => __play.owner), "station", tag + ": after the contact beat the Station has the keys");
    await page.waitForTimeout(motion ? 400 : 100);
    expect((await inView("#shStation")) && (await inView("#rowStation")), tag + ": and the Station is wholly in view, its tray included: the arrival is seen");
    eq((await page.evaluate(() => __play.scroll))[0], 0, tag + ": the page scrolled back to the top");
    await clip(page, "play-stack-docked.png");
    await later(page, st, tag, async () => {});   // the arrival is over
    await page.keyboard.press("Shift+D"); await page.waitForTimeout(motion ? 900 : 700);
    eq([await st().evaluate(() => window.__st.ST.dock.docked), await page.evaluate(() => __play.owner)], [false, "companion"], tag + ": lifted: the Companion has the keys");
    await page.waitForTimeout(motion ? 400 : 100); expect((await inView("#shCompanion")) && (await inView("#rowCompanion")), tag + ": the Companion is wholly in view after the lift");
    // a device already wholly in view does not move the page
    await page.evaluate(() => { document.getElementById("stage").scrollTop = 0; }); await page.waitForTimeout(100);
    await page.click("#tabStation"); await page.waitForTimeout(200); const s0 = (await page.evaluate(() => __play.scroll))[0];
    await page.click("#tabStation"); await page.waitForTimeout(300); eq((await page.evaluate(() => __play.scroll))[0], s0, tag + ": a device already in view does not move the page");
    await ctx.close();
  }
}
{
  // the Stack at 1280 x 720 (the owner's window): the page scrolls, and one dock
  const { ctx, page, st, mb } = await open(1280, 720);
  eq(await page.evaluate(() => __play.tier), "stack", "S: the layout at 1280 × 720");
  { const tr = await box(page, "#rowStation"), fr = await box(page, "#fStation"), sc = await page.evaluate(() => __play.scroll);
    near(tr[1] + tr[3], 720, "S: the page opens with the Station's tray bottom at the window's bottom", 0.51); expect(fr[1] >= 40 - 0.5 && fr[1] + fr[3] <= 720, "S: and the Station's face whole"); expect(sc[0] > 0, "S: opened scrolled (a cut), scrollTop " + sc[0]); }
  const sb = await box(page, "#fStation"); eq([sb[2], sb[3]], [1024, 600], "S: the Station frame is 1:1");
  const sImg = rd(await page.screenshot({ clip: { x: sb[0], y: sb[1], width: 1024, height: 600 } })), sCap = dataPng(await st().evaluate(() => window.__st.capture()));
  expect(sameImage(sImg, sCap), "S: the Station frame is pixel-equal to its capture");
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(500);
  await clip(page, "play-stack-720.png");
  await page.click("#dockCtl"); await page.waitForTimeout(700);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "S: the control docks once");
  await page.click("#tabCompanion"); await page.waitForTimeout(400);
  const cb2 = await box(page, "#fCompanion"); eq([cb2[2], cb2[3]], [450, 600], "S: the Companion frame is 1:1");
  const cImg = rd(await page.screenshot({ clip: { x: cb2[0], y: cb2[1], width: 450, height: 600 } })), cCap = dataPng(await mb().evaluate(() => window.__mb.capture()));
  expect(sameImage(cImg, cCap), "S: the Companion frame, scrolled into view, is pixel-equal to its capture");
  const keys = await box(page, "#rowCompanion"); near(keys[1] + keys[3], 720, "S: the tray's bottom meets the window's bottom (the block alone, no margin)", 0.51);
  const cs = await box(page, "#shCompanion"); expect(cs[1] >= 40 - 8 - 0.5, "S: at most the shell's 8 lp top border is out of view (the Companion is seated, 8 lower: " + cs[1] + ")"); expect(cb2[1] >= 40 - 0.5, "S: the face is whole");
  await clip(page, "play-stack-720-companion.png");
  await ctx.close();
}

// ---- M. the layouts and the key minimums, measured (the ruling's checks) ----
const SIZES = [[1280, 720, 1, "stack"], [1440, 900, 1, "stack"], [1920, 1080, 1, "row"], [2560, 1440, 1, "row"], [1440, 900, 1.25, "stack"], [1440, 900, 1.75, "stack"]];
const MIN = { Left: 56, Up: 56, Down: 56, Right: 56, Home: 56, Vivarium: 56, Research: 56, Library: 56, Back: 56, Call: 56, Confirm: 64 };
{
  for (const [w, h, dsf, layout] of SIZES) {
    const tag = `M ${w}×${h}${dsf === 1 ? "" : " @" + dsf}`;
    const { ctx, page, st, mb } = await open(w, h, { dsf });
    const m = await page.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
      const stage = document.getElementById("stage");
      return { tier: __play.tier, dpr: devicePixelRatio, marks: [...document.querySelectorAll(".k.room img")].map((i) => { const b = i.getBoundingClientRect(), kb = i.parentElement.getBoundingClientRect(); return { w: b.width, h: b.height, dx: (b.left + b.width / 2) - (kb.left + kb.width / 2), dy: (b.top + b.height / 2) - (kb.top + kb.height / 2), px: getComputedStyle(i).imageRendering }; }),
        keys: [...document.querySelectorAll(".k")].map((k) => { const b = k.getBoundingClientRect(), t = k.parentElement.getBoundingClientRect(); return { dev: k.closest("#rowStation") ? "station" : "companion", name: k.getAttribute("aria-label"), w: b.width, h: b.height, l: b.left - t.left, r: t.right - b.right, top: b.top - t.top, bot: t.bottom - b.bottom }; }),
        trays: { station: r("#rowStation"), companion: r("#rowCompanion") }, shells: { station: r("#shStation"), companion: r("#shCompanion") }, rows: __play.geom.rows,
        bar: { height: r("#bar")[3], tabs: [r("#tabStation"), r("#tabCompanion")], dock: r("#dockCtl"), keysBtn: r("#keysBtn") }, sw: stage.scrollWidth, cw: stage.clientWidth, sh: stage.scrollHeight, ch: stage.clientHeight, caddy: r("#caddySheet"), cradle: r("#cradle"), inner: [innerWidth, innerHeight] };
    });
    const e = 1 / m.dpr + 1e-6;   // a CSS px size is whole physical pixels: never more than one device pixel over the minimum
    eq(m.tier, layout, tag + ": the layout");
    for (const kk of m.keys) { const min = MIN[kk.name]; expect(kk.w >= min - 1e-6 && kk.w <= min + e && kk.h >= min - 1e-6 && kk.h <= min + e, `${tag}: ${kk.dev} ${kk.name} is ${kk.w} × ${kk.h} CSS px, wanted ${min} × ${min}`); }
    { const n = Math.max(1, Math.round(dsf)); expect(m.marks.length === 4 && m.marks.every((q) => Math.abs(q.w * dsf - 24 * n) < 0.02 && Math.abs(q.h * dsf - 24 * n) < 0.02 && q.px === "pixelated" && Math.abs(q.dx) <= 1 / dsf + 0.01 && Math.abs(q.dy) <= 1 / dsf + 0.01), `${tag}: each room mark is drawn at 24 × ${n} device px, pixelated, centred in its key (${JSON.stringify(m.marks[0])})`); }
    eq(m.keys.length, 17, tag + ": 10 Station keys and 7 Companion keys");
    expect(m.keys.every((kk) => { const s = MIN[kk.name], row = Math.round((kk.top - (72 - s) / 2) / 72); return row >= 0 && row < 2 && Math.abs(kk.top - row * 72 - (72 - s) / 2) <= 1 / m.dpr + 0.01; }), tag + ": each key is centred in its row: a 56 key 8 from the row's top, a 64 key 4");
    expect(["station", "companion"].every((d) => { const c = m.keys.filter((kk) => kk.dev === d).map((kk) => kk.top + kk.h / 2 - Math.floor((kk.top + kk.h / 2) / 72) * 72); return c.every((v) => Math.abs(v - 36) <= 1 / m.dpr + 0.01); }), tag + ": all the key centres in a row share one line");
    eq(m.rows, { station: dsf === 1.75 ? 2 : 1, companion: dsf === 1 ? 1 : 2 }, tag + ": the rows in each tray (ruling 6.1)");
    for (const d of ["station", "companion"]) { near(m.trays[d][2], m.shells[d][2], tag + ": the " + d + " tray is as wide as its shell", 1 / 64 + 0.01); near(m.trays[d][3], 72 * m.rows[d], tag + ": the " + d + " tray is 72 CSS px a row", 1 / 64 + 0.01); }
    near(m.trays.station[1], m.shells.station[1] + m.shells.station[3], tag + ": the Station tray is joined to its shell", 1 / 64 + 0.01);
    expect(m.keys.every((kk) => kk.l >= -0.01 && kk.r >= -0.01), tag + ": no row overflows its tray");
    expect(m.bar.height === 40 && m.bar.tabs.every((t) => t[3] >= 40 && t[3] <= 40 + e && t[2] >= 120) && m.bar.dock[3] >= 40 && m.bar.dock[3] <= 40 + e && m.bar.dock[2] >= 168 && m.bar.keysBtn[3] >= 40, `${tag}: the bar's controls are 40 tall, tabs ≥ 120 wide, Dock ≥ 168 wide (${JSON.stringify(m.bar)})`);
    // never cut: nothing scrolls sideways, and both shells and the Caddy's block lie wholly across the page
    expect(m.sw <= m.cw, `${tag}: the page does not scroll sideways (${m.sw} of ${m.cw})`);
    const geom = await page.evaluate(() => __play.geom);
    expect(geom.companion.x >= 0 && geom.companion.x + geom.companion.w <= m.cw + 0.5 && geom.station.x >= 0 && geom.station.x + geom.station.w <= m.cw + 0.5, tag + ": the Companion and the Station are whole across the page");
    expect(m.caddy[0] >= 0 && m.caddy[0] + m.caddy[2] <= m.inner[0] + 0.5, tag + ": the Caddy's block is whole across the page");
    near(m.caddy[2], (808 * Math.max(1, Math.floor(dsf))) / dsf, tag + ": the Caddy's block is 808 lp wide", 1 / 64 + 0.01);
    if (dsf === 1) { if (layout === "stack") eq(m.sh + 40, 1812, tag + ": the Stack is 1,812 tall"); else expect(m.sh <= m.ch, tag + ": the Row fits without scrolling"); }
    if (layout === "row") { near(m.shells.companion[0] - m.shells.station[0] - m.shells.station[2], 24, tag + ": 24 between the shells", 0.02); near(m.caddy[0] + m.caddy[2], m.shells.station[0] + m.shells.station[2], tag + ": the Caddy's block is right-aligned to the Station shell", 0.02); near(m.caddy[1] - m.trays.station[1] - m.trays.station[3], 24, tag + ": 24 under the Station's tray", 0.02); }
    else { near(m.shells.companion[1] - m.trays.station[1] - m.trays.station[3], 24, tag + ": 24 between the blocks", 0.02); near(m.caddy[1] - m.cradle[1] - m.cradle[3], 24, tag + ": the Caddy's block is 24 under the cradle", 0.02); }
    // both faces on whole device pixels at the page's top (the Station) and with the Companion scrolled into view
    eq(await frameBad(page, null, "#fStation", 1024, () => st().evaluate(() => window.__st.capture())), 0, tag + ": the Station's differing device pixels");
    await page.evaluate(() => { const g = __play.geom.companion, s = document.getElementById("stage"); s.scrollTop = Math.max(0, g.y - 16); }); await page.waitForTimeout(200);
    eq(await frameBad(page, null, "#fCompanion", 450, () => mb().evaluate(() => window.__mb.capture())), 0, tag + ": the Companion's differing device pixels");
    await page.evaluate(() => { document.getElementById("stage").scrollTop = 0; }); await page.waitForTimeout(100);
    await clip(page, `play-${w}x${h}${dsf === 1 ? "" : "-dpr" + dsf}.png`);
    await ctx.close();
  }
}

// ---- Z. the size (not under ?test): fit, the chosen z, the build stamp (viewport 1920 × 1080) ----
// a face at z device px per lp: the frame's visible region against the capture, each capture pixel a z × z block; returns [differing, compared]
async function zBad(page, sel, W, z, capture) {
  const r = await box(page, sel), shot = rd(await page.screenshot({ scale: "device" })), cap = dataPng(await capture()), x0 = Math.round(r[0]), y0 = Math.round(r[1]);
  let bad = 0, n = 0; for (let y = 0; y < 600 * z; y++) for (let x = 0; x < W * z; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 40 || sx >= shot.width || sy >= shot.height) continue; n++; const a = (sy * shot.width + sx) * 4, b = (Math.floor(y / z) * cap.width + Math.floor(x / z)) * 4; if (shot.data[a] !== cap.data[b] || shot.data[a + 1] !== cap.data[b + 1] || shot.data[a + 2] !== cap.data[b + 2]) bad++; }
  return [bad, n];
}
{
  const { ctx, page, st, mb } = await open(1920, 1080, { query: "?seed=3" });
  const zs = () => page.evaluate(() => [__play.tier, __play.z, __play.fit, localStorage.getItem("mb-play-z"), document.getElementById("zFit").textContent]);
  eq(await zs(), ["row", 1, true, null, "fit ×1"], "Z: fit at 1920 × 1080 (1×) is the Row at z 1");
  eq(await box(page, "#fStation"), [195, 64, 1024, 600], "Z: at fit the Station frame is where ?test has it");
  const ctl = await page.evaluate(() => ["zDown", "zFit", "zUp", "keysBtn", "dockCtl"].map((i) => { const b = document.getElementById(i).getBoundingClientRect(); return [i, b.left, b.width, b.height, getComputedStyle(document.getElementById(i)).display]; }));
  expect(ctl.every((c) => c[3] === 40 && c[4] !== "none") && ctl[2][1] + ctl[2][2] <= 1920 - 160 && ctl[3][1] + ctl[3][2] <= ctl[0][1] && ctl[4][1] + ctl[4][2] <= ctl[3][1], "Z: the size control shows beside Keys ?, 40 tall, clear of Keys and the Dock " + JSON.stringify(ctl));
  const stampAt = () => page.evaluate(() => { const s = document.getElementById("stamp"), b = s.getBoundingClientRect(), g = __play.geom, st = document.getElementById("stage").getBoundingClientRect(), sc = document.getElementById("stage").scrollTop, lows = ["shStation", "rowStation", "shCompanion", "rowCompanion", "cradle", "caddySheet"].map((i) => document.getElementById(i).getBoundingClientRect()).map((r) => r.bottom); return { text: s.textContent, display: getComputedStyle(s).display, top: b.top, bottom: b.bottom, lowest: Math.max(...lows), pageBottom: st.top + g.height - sc, textW: s.scrollWidth }; });
  let sa = await stampAt();
  eq([sa.text, sa.display], ["build local", "block"], "Z: the build stamp shows (no build.json here: build local)");
  expect(sa.top >= sa.lowest - 0.01 && sa.bottom <= sa.pageBottom + 0.01, "Z: the stamp lies under every block, in the page's foot " + JSON.stringify(sa));
  await clip(page, "play-fit-1920x1080.png");
  await page.keyboard.press("Equal"); await page.waitForTimeout(400);
  eq(await zs(), ["stack", 2, false, "2", "×2"], "Z: = chooses z 2: the Stack, kept in localStorage");
  { const f = await box(page, "#fStation"), c = await box(page, "#fCompanion"); eq([f[2], f[3], c[2], c[3]], [2048, 1200, 900, 1200], "Z: at z 2 the frames are 2048 × 1200 and 900 × 1200 CSS px"); }
  { const sw = await page.evaluate(() => [document.getElementById("stage").scrollWidth, document.getElementById("stage").clientWidth]); expect(sw[0] > sw[1], "Z: wider than the window at z 2, the page scrolls sideways " + JSON.stringify(sw)); }
  { const [bad, n] = await zBad(page, "#fStation", 1024, 2, () => st().evaluate(() => window.__st.capture())); eq([bad, n > 1000000], [0, true], "Z: the Station at z 2: each face pixel a whole 2 × 2 block (differing device pixels, compared " + n + ")"); }
  await page.evaluate(() => { const g = __play.geom.companion, s = document.getElementById("stage"); s.scrollTop = Math.max(0, g.y - 16); }); await page.waitForTimeout(200);
  { const [bad, n] = await zBad(page, "#fCompanion", 450, 2, () => mb().evaluate(() => window.__mb.capture())); eq([bad, n > 500000], [0, true], "Z: the Companion at z 2: whole 2 × 2 blocks (differing device pixels, compared " + n + ")"); }
  await page.evaluate(() => { const s = document.getElementById("stage"); s.scrollTop = 0; s.scrollLeft = 0; }); await page.waitForTimeout(200);
  await clip(page, "play-z2-stack.png");
  await page.evaluate(() => { const s = document.getElementById("stage"); s.scrollTop = s.scrollHeight; }); await page.waitForTimeout(200);
  sa = await stampAt(); expect(sa.top >= sa.lowest - 0.01 && sa.bottom <= sa.pageBottom + 0.01, "Z: at z 2 the stamp is still under every block " + JSON.stringify(sa));
  await page.keyboard.press("Minus"); await page.waitForTimeout(300); eq((await zs()).slice(0, 4), ["row", 1, false, "1"], "Z: − chooses z 1 (kept)");
  await page.keyboard.press("Shift+Equal"); await page.waitForTimeout(300); eq((await zs()).slice(1, 4), [2, false, "2"], "Z: + (Shift+=) chooses z 2");
  await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }); await page.waitForTimeout(600);
  eq((await zs()).slice(0, 4), ["stack", 2, false, "2"], "Z: a reload keeps the chosen z");
  await page.click("#zFit"); await page.waitForTimeout(300); eq(await zs(), ["row", 1, true, null, "fit ×1"], "Z: fit clears the choice");
  await page.click("#zUp"); await page.waitForTimeout(300); eq((await zs()).slice(1, 3), [2, false], "Z: the + button");
  await page.click("#zDown"); await page.waitForTimeout(300); eq((await zs()).slice(1, 3), [1, false], "Z: the − button");
  await page.goto(base + "?test", { waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 }); await page.waitForTimeout(600);
  await page.evaluate(() => localStorage.setItem("mb-play-z", "3")); await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow, null, { timeout: 30000 }); await page.waitForTimeout(600);
  eq(await page.evaluate(() => [__play.tier, __play.z, getComputedStyle(document.getElementById("zFit")).display, getComputedStyle(document.getElementById("stamp")).display]), ["row", 1, "none", "none"], "Z: ?test keeps today's layout whatever is stored (z = k, no size control, no stamp)");
  await page.keyboard.press("Equal"); await page.waitForTimeout(300); eq(await page.evaluate(() => __play.z), 1, "Z: ?test: = does not change the size");
  await ctx.close();
}

{
  // the stamp with a build.json, in a viewer's zone far from Mexico City: the time is Mexico City's
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce", timezoneId: "Asia/Tokyo" });
  await ctx.route(/\/build\.json(\?|$)/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ commit: "a9d087f9aa00", short: "a9d087f", built: "2026-10-24T03:07:00Z" }) }));
  const page = await ctx.newPage(); page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  await page.goto(base, { waitUntil: "load" }); await page.waitForFunction(() => document.getElementById("stamp").textContent !== "build local", null, { timeout: 10000 }).catch(() => {});
  eq(await page.evaluate(() => document.getElementById("stamp").textContent), "build a9d087f · 2026-10-23 21:07 Mexico City", "Z: the stamp reads build.json in Mexico City time (the viewer in Tokyo)");
  await ctx.close();
}

// ---- K. the Caddy's screen: always shown in its own 808 × 288 block, redrawn only when its lines change; Shift+C is retired (1920 × 1080, the Row) ----
{
  const { ctx, page, st } = await open(1920, 1080, { query: "?test&seed=3" });
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  const sheet = () => page.evaluate(() => __play.caddySheet);
  eq((await sheet()).up, true, "K: shown before any dock"); expect(await page.locator("#caddySheet").isVisible(), "K: the block is visible with the Companion away");
  eq(await box(page, "#caddySheet"), [419, 768, 808, 288], "K: the block, under the Station and right-aligned to its shell"); eq(await box(page, "#caddyView"), [427, 776, 792, 272], "K: the view, 1 lp per view pixel, 8 lp inside");
  eq(await page.evaluate(() => [document.getElementById("caddyView").width, document.getElementById("caddyView").height]), [792, 272], "K: the canvas is the view's 792 × 272");
  const away = (await sheet()).lines; expect(away && away.line1 !== "Companion home", "K: its lines read the away state before a dock (" + JSON.stringify(away) + ")");
  await page.click("#dockCtl"); await page.waitForTimeout(700); eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "K: docked");
  const k = await sheet(); eq([k.lines.line1, k.lines.line2], ["Companion home", "one crate"], "K: its lines read the docked state");
  await clip(page, "play-row-caddy.png");
  await page.waitForTimeout(6200); eq((await sheet()).up, true, "K: it stays, nothing lowers it");
  await page.keyboard.press("Shift+C"); await page.waitForTimeout(300); eq((await sheet()).up, true, "K: Shift+C does nothing");
  eq((await sheet()).refreshes, 2, "K: two partial refreshes: away at load, then docked (nothing else redraws it)");
  await ctx.close();
}
{
  const { ctx, page, st } = await open(1920, 1080, { query: "?test&dev" });
  await page.waitForTimeout(500); await clip(page, "play-dev.png"); await ctx.close();
}

// ---- the standalone Station page's own Dock control (the round key is gone), for the capture ----
{
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
{
  const { ctx, page, st, mb } = await open(1920, 1080);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("mb-save-v8")));
  const id = await mb().evaluate(() => { const S = window.__mb.S, id = "x" + S.wid + "-1"; S.bay.push({ id, n: 1, turn: S.turn, at: Date.now(), e: 3, d: 2, s: 3, pods: [{ id: "q1", sp: 0, g: "meadow", how: "shake", gs: 987654321, k: null }], met: [0], explored: 5, of: 20, lines: [] }); return id; });
  await st().evaluate(() => window.__st.addMaterials(0, 0, 0)); await page.waitForTimeout(600);   // the Station writes its save; the storage event makes the Companion save its bay, and the Station reads it
  expect((await stored()).bay.some((c) => c.id === id), "B8: the stored save's bay holds the crate"); eq((await state(page)).caddy.crates, 1, "B8: the control hears one crate"); eq((await state(page)).dot, true, "B8: the dot shows");
  await page.click("#dockCtl"); await page.waitForTimeout(700); eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "B8: docked");
  await st().evaluate(() => window.__st.openBay()); await page.waitForTimeout(600);
  eq(await mb().evaluate(() => window.__mb.S.bay.length), 0, "B8: the Companion's bay is empty"); eq((await stored()).bay.length, 0, "B8: and the stored bay too");
  eq(await st().evaluate((i) => [window.__st.ST.accepted.includes(i), window.__st.ST.tray.some((p) => p.id === i + ":q1")], id), [true, true], "B8: the Station accepted the crate and its pod is in a well");
  eq(await st().evaluate(() => [window.__st.renderErrors, window.__st.faceErrors]), [[], []], "B8: no render or face errors");
  await ctx.close();
}

// ---- D. printed, not asserted (viewport 1920 × 1080, Home idle, the Companion on its map): each figure with its bar ----
{
  const { ctx, page, st, mb } = await open(1920, 1080, { motion: true, query: "?test&seed=3" });
  await page.mouse.click(1300, 300); await page.keyboard.press("Enter"); await page.waitForTimeout(900); await page.keyboard.press("Enter"); await page.waitForTimeout(900);   // the Companion on its map
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
{
  for (const dsf of [1.25, 1.5, 1.75, 2, 1]) {
    const { ctx, page, st, mb } = await open(1920, 1080, { dsf });
    const k = Math.max(1, Math.floor(dsf));
    for (const [name, W, frame] of [["Station", 1024, st], ["Companion", 450, mb]]) {
      const m = await screenAt(frame);
      eq(m[0], W + "px", `E1: the ${name}'s computed width at dpr ${dsf}`); near(m[1] * m[2], W * k, `E1: the ${name}'s rect × dpr at ${dsf}`, 0.001);
    }
    eq(await frameBad(page, null, "#fStation", 1024, () => st().evaluate(() => window.__st.capture())), 0, `E1: the Station's differing device pixels at dpr ${dsf}`);
    eq(await frameBad(page, null, "#fCompanion", 450, () => mb().evaluate(() => window.__mb.capture())), 0, `E1: the Companion's differing device pixels at dpr ${dsf}`);
    await ctx.close();
  }
}

// ---- E2. a change of ratio with no resize (CDP override at a fixed viewport): only where the override reaches child frames with a change event (Chromium 141 and later) ----
{
  const ver = browser.version(), major = parseInt(ver, 10);
  if (!(major >= 141)) console.log(`E2: skipped on Chromium ${ver} (its override reaches child frames with no change or resize event)`);
  else {
    const { ctx, page, st, mb } = await open(1920, 1080);
    const cdp = await ctx.newCDPSession(page), failsBefore = fails.length;
    for (const dsf of [1.25, 1.5, 1.75, 2, 1]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: dsf, mobile: false }); await page.waitForTimeout(400);
      const k = Math.max(1, Math.floor(dsf));
      for (const [name, W, frame] of [["Station", 1024, st], ["Companion", 450, mb]]) {
        const m = await screenAt(frame);
        near(m[1] * m[2], W * k, `E2: the ${name}'s rect × dpr at ${dsf}`, 0.001);
      }
      eq(await frameBad(page, cdp, "#fStation", 1024, () => st().evaluate(() => window.__st.capture())), 0, `E2: the Station's differing device pixels at dpr ${dsf}`);
      eq(await frameBad(page, cdp, "#fCompanion", 450, () => mb().evaluate(() => window.__mb.capture())), 0, `E2: the Companion's differing device pixels at dpr ${dsf}`);
    }
    if (fails.length === failsBefore) console.log("E2: ok (5 ratios)");
    await ctx.close();
  }
}

await browser.close(); server.close();
if (errors.length) fails.push(...errors);
console.log(fails.length ? `\nplay journey FAILED: ${fails.length}` : "\nplay journey ok");
process.exit(fails.length ? 1 : 0);
