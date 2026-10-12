#!/usr/bin/env node
// The play-page journey: the page that holds the Station and the Companion side by side, played headless. It serves prototypes/ as the sandbox does, opens
// /sandbox/play/?test in Chromium. There is no save fixture: each context starts a fresh Companion world, and A, B1–B7, C and the short tier seed their crate with `__st.seedCrate("S01", 2, 4101)`; B8 crosses a real
// Companion crate. It proves: A, the layout at 1× (every frame's box exact, both screens 1:1 on the page, also at dpr 1.25); B, the dock round trip with the keys, the landing rule and
// the lift; C, the narrow tier; D, the figures it prints (heaps, the face, main-thread time a frame); E, a change of device pixel ratio with no resize; and the short tier at 1280 × 690, where the
// owner's window sits. Fails on any page error, any console error in any frame (a 404 for the optional build stamp or the Caddy service is not one) and any assertion.
//   node prototypes/play/tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local)
//   PLAY_CAPTURES=1 node prototypes/play/tools/journey.mjs     also writes the 1× captures of img/ (clipped to the page)
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
  await ctx.addInitScript(() => { if (!sessionStorage.getItem("play-journey")) { localStorage.setItem("mb-station-dev", '{"light":"day"}'); sessionStorage.setItem("play-journey", "1"); } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { errors.push("console: " + m.text().slice(0, 200)); console.error("FAIL console: " + m.text().slice(0, 200)); } });
  await page.goto(base + query, { waitUntil: "load" });
  const st = () => page.frame({ url: /\/station\// }), mb = () => page.frame({ url: /\/exploration\// });
  await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 });
  await st().evaluate(() => window.__st.ready); await mb().waitForFunction(() => window.__mb && window.__mb.S, null, { timeout: 30000 }); await page.waitForTimeout(600);
  return { ctx, page, st, mb };
}
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
  eq(await page.evaluate(() => __play.tier), "wide", "A: the tier at 1920 × 1080");
  eq(await box(page, "#fStation"), [20, 60, 1024, 600], "A: the Station frame"); eq(await box(page, "#fCompanion"), [1076, 60, 450, 600], "A: the Companion frame");
  eq(await box(page, "#dockCtl"), [1484, 4, 168, 32], "A: the control"); eq(await box(page, "#cradle"), [1068, 728, 466, 28], "A: the cradle"); eq(await box(page, "#lamp"), [1080, 744, 8, 8], "A: the lamp");
  eq(await box(page, "#bench"), [12, 760, 1522, 308], "A: the bench shelf");
  const sImg = rd(await page.screenshot({ clip: { x: 20, y: 60, width: 1024, height: 600 } })), sCap = dataPng(await st().evaluate(() => window.__st.capture()));
  expect(sameImage(sImg, sCap), "A: the page's Station frame is pixel-equal to __st.capture() (1:1)");
  const cImg = rd(await page.screenshot({ clip: { x: 1076, y: 60, width: 450, height: 600 } })), cCap = dataPng(await mb().evaluate(() => window.__mb.capture()));
  expect(sameImage(cImg, cCap), "A: the page's Companion frame is pixel-equal to __mb.capture() (1:1)");
  // one reading: every drawn key's img is whole at 24 px
  const keyImgs = await page.evaluate(() => [...document.querySelectorAll(".k img, .bk img")].map((i) => ({ complete: i.complete, w: i.naturalWidth })));
  expect(keyImgs.length >= 4 && keyImgs.every((i) => i.complete && i.w === 24), `A: each drawn key's img is complete with naturalWidth 24 (${keyImgs.length} read)`);
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(700);
  await clip(page, "play-wide-away.png");
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
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.UI.home.f]), ["home", "room"], "B2: the landing rule: Home with the ring on the room");
  eq([s.word, s.mark.includes("solid"), s.dot], ["Lift", true, false], "B2: the control reads Lift with the solid mark and no dot");
  await lampIs(page, "mint", "B2");
  near((await box(page, "#fCompanion"))[1], 68, "B2: the Companion frame is at y 68 (seated)");
  const ring = await page.evaluate(() => __play.rects().ring), sh = await box(page, "#shStation"); expect(ring[0] < sh[0] && ring[1] < sh[1], "B2: the ring is on the Station shell");
  eq(s.active, "fStation", "B2: the keys went to the Station"); eq(s.live, "Companion docked", "B2: the live region");
  eq(await mb().evaluate(() => window.__mb.isDocked()), true, "B2: the Companion frame sees the dock");
  await page.waitForTimeout(2500); await clip(page, "play-wide-docked.png");   // Home's arrival has ended
  await page.keyboard.press("r"); await page.waitForTimeout(300);
  eq(await st().evaluate(() => window.__st.UI.screen), "pods", "B3: the keys are the Station's: R shows Pods");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600); s = await state(page);
  eq(await st().evaluate(() => [window.__st.ST.dock.docked, window.__st.UI.screen]), [false, "pods"], "B4: lifted, and the Station stays on Pods");
  eq([s.word, s.mark.includes("outline")], ["Dock", true], "B4: the control reads Dock again"); near((await box(page, "#fCompanion"))[1], 60, "B4: the Companion frame is back at y 60");
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
  eq([o1, o2], ["bench", "station"], "B6: the focus key cycles Companion, Bench → Bench, Station from the Companion");
  const loaded = await page.evaluate(() => !!document.getElementById("fBench").getAttribute("src")); expect(loaded, "B6: the bench frame loaded");
  await page.keyboard.press("Shift+Backquote"); await page.waitForTimeout(200); eq((await state(page)).owner, "bench", "B6: Shift+` goes back");
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
  eq(await st().evaluate(() => [window.__st.UI.screen, window.__st.ST.dock.docked]), ["home", true], "C: it shows Home, docked");
  await page.keyboard.press("Shift+D"); await page.waitForTimeout(600);
  eq([await vis("shStation"), await vis("shCompanion"), await st().evaluate(() => window.__st.ST.dock.docked)], ["hidden", "visible", false], "C: Lift shows the Companion");
  // the bench in narrow: the sheet is a fixed child of the body, the stage is inert, and the note and the ring are gone while it is raised; a second press on the tab does nothing
  await page.click("#tabBench"); await page.waitForTimeout(300);
  const up = await page.evaluate(() => ({ owner: __play.owner, pos: getComputedStyle(document.getElementById("bench")).position, parent: document.getElementById("bench").parentElement.tagName, inert: document.getElementById("stage").hasAttribute("inert"), note: document.getElementById("note").classList.contains("hidden"), ring: document.getElementById("ring").classList.contains("hidden"), pressed: document.getElementById("tabBench").getAttribute("aria-pressed"), others: [document.getElementById("tabStation").getAttribute("aria-pressed"), document.getElementById("tabCompanion").getAttribute("aria-pressed")] }));
  eq([up.owner, up.pos, up.parent, up.inert, up.note, up.ring, up.pressed, up.others], ["bench", "fixed", "BODY", true, true, true, "true", ["false", "false"]], "C: the raised sheet in narrow");
  await page.click("#tabBench"); await page.waitForTimeout(200); eq((await state(page)).owner, "bench", "C: a second press on the Bench tab does nothing");
  await page.click("#tabCompanion"); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [__play.owner, document.getElementById("stage").hasAttribute("inert"), document.getElementById("note").classList.contains("hidden")]), ["companion", false, false], "C: the Companion tab lowers the sheet and the stage is live again");
  // the hidden frame's storage path: the Station is hidden, a crate arrives, the control's dot changes within 600 ms
  eq((await state(page)).dot, false, "C: no dot before the crate");
  await st().evaluate(() => window.__st.seedCrate("S01", 1, 7)); await page.waitForTimeout(600);
  eq((await state(page)).dot, true, "C: the dot shows within 600 ms of a crate arriving in the hidden Station");
  await ctx.close();
}

// ---- the short tier at 1280 × 690 (the owner's window): both devices at 1:1, and one dock ----
{
  const { ctx, page, st, mb } = await open(1280, 690);
  eq(await page.evaluate(() => __play.tier), "short", "S: the tier at 1280 × 690");
  const sb = await box(page, "#fStation"), cb = await box(page, "#fCompanion"); eq([sb[2], sb[3], cb[2], cb[3]], [1024, 600, 450, 600], "S: both frames at 1:1");
  eq(sb.slice(0, 2), [20, 56], "S: the Station frame");
  const sImg = rd(await page.screenshot({ clip: { x: sb[0], y: sb[1], width: 1024, height: 600 } })), sCap = dataPng(await st().evaluate(() => window.__st.capture()));
  expect(sameImage(sImg, sCap), "S: the Station frame is pixel-equal to its capture");
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(500);
  await clip(page, "play-short.png");
  await page.click("#dockCtl"); await page.waitForTimeout(700);
  eq(await st().evaluate(() => window.__st.ST.dock.docked), true, "S: the control docks once");
  await page.click("#tabCompanion"); await page.waitForTimeout(400);
  const cb2 = await box(page, "#fCompanion"); eq([cb2[0], cb2[2], cb2[3]], [1280 - 1546 + 1068 + 8, 450, 600], "S: the Companion focused: the row panned by W − R");
  const cImg = rd(await page.screenshot({ clip: { x: cb2[0], y: cb2[1], width: 450, height: 600 } })), cCap = dataPng(await mb().evaluate(() => window.__mb.capture()));
  expect(sameImage(cImg, cCap), "S: the Companion frame is pixel-equal to its capture (the Station's check, applied to the Companion once it is panned into view)");
  await clip(page, "play-short-companion.png");
  await ctx.close();
}

// ---- standard (1440 × 900), the wide developer column and the standalone control, for the captures ----
{
  const { ctx, page, st } = await open(1440, 900);
  await st().evaluate(() => window.__st.seedCrate("S01", 2, 4101)); await page.waitForTimeout(500);
  await page.click("#tabCompanion"); await page.waitForTimeout(400);
  near((await box(page, "#fCompanion"))[0], 1440 - 1546 + 1068 + 8, "standard: the Companion focused pans −106", 0.51);
  await page.click("#tabBench"); await page.waitForTimeout(300); await page.click("#tabBench"); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [__play.owner, !document.getElementById("bench").classList.contains("hidden")]), ["bench", true], "standard: a second press on the Bench tab does nothing");
  await page.click("#tabCompanion"); await page.waitForTimeout(300);
  await clip(page, "play-standard-companion.png"); await ctx.close();
}
{
  const { ctx, page, st } = await open(1920, 1080, { query: "?test&dev" });
  await page.waitForTimeout(500); await clip(page, "play-dev.png"); await ctx.close();
}

// ---- the standalone Station page's own Dock control (the round key is gone), for the capture ----
{
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: "reduce" }); const page = await ctx.newPage();
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
