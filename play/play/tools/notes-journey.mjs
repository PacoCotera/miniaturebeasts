#!/usr/bin/env node
// The play-note journey: on the play page, headless, with the notes route stubbed (play-notes-service builds the real one):
// Options -> New note (the screen from when Options opened is in), text, + Whole screen, + Section (drag), + Last 10 seconds, Keep playing, the bar's Note · n and + Whole screen / Shift+N, Record and Stop,
// Send (the multipart body the route takes), then offline: a note is kept in IndexedDB, survives a reload and goes when the route answers. NOTES_SHOTS=<dir> also writes screenshots (laptop and phone).
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node prototypes/play/tools/notes-journey.mjs
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createApp, loadFrames as loadCaddyFrames } from "../../caddy/app.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".ttf": "font/ttf", ".wasm": "application/wasm" };
// the Caddy service in mock mode beside the static server, proxied under /caddy-api/ as on the sandbox (the page's dock needs it); the notes route itself is stubbed per page
loadCaddyFrames();
const caddyData = mkdtempSync(path.join(tmpdir(), "mb-caddy-notes-"));
writeFileSync(path.join(caddyData, "identity.json"), JSON.stringify({ v: 1, caddy: "k0000000000000000", recovery: { kid: "TEST", pub: "A".repeat(43) }, printedAt: 0 }));
const caddy = createApp({ dataDir: caddyData, painter: "mock", mockDelay: 1, tickMs: 200 }), caddyServer = createServer((req, res) => caddy.handle(req, res));
await new Promise((r) => caddyServer.listen(0, "127.0.0.1", r));
const caddyPort = caddyServer.address().port;
const server = createServer((req, res) => {
  if (req.url.startsWith("/caddy-api/")) {
    const up = http.request({ host: "127.0.0.1", port: caddyPort, path: req.url, method: req.method, headers: req.headers }, (r2) => { res.writeHead(r2.statusCode, r2.headers); r2.pipe(res); });
    up.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up); return;
  }
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(path.resolve(root, ".."), rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const shots = process.env.NOTES_SHOTS; if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
const fails = [], errors = [];
const expect = (c, m) => { if (!c) { fails.push(m); console.error("FAIL " + m); } else console.log("ok   " + m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function session(name, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + e.message + (process.env.NOTES_STACK ? "\n" + String(e.stack).split("\n").slice(0, 4).join("\n") : "")));
  const posts = []; let mode = "ok";
  await page.route("**/caddy-api/v1/notes", async (route) => {
    const req = route.request();
    if (mode === "down") { await route.abort(); return; }
    const body = req.postDataBuffer() ? req.postDataBuffer().toString("latin1") : "";
    posts.push({ type: req.headers()["content-type"], size: body.length, shot: (body.match(/name="shot"/g) || []).length, clip: (body.match(/name="clip"/g) || []).length, source: (/name="source"\r\n\r\n([^\r]*)/.exec(body) || [])[1], text: (/name="text"\r\n\r\n([^\r]*)/.exec(body) || [])[1], context: (/name="context"\r\n\r\n([^\r]*)/.exec(body) || [])[1] });
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, id: "t1" }) });
  });
  await page.goto(base);
  await page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen") && !!window.__play.frames.station.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 30000 });
  await wait(2500);
  return { ctx, page, posts, setMode: (m) => { mode = m; } };
}
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name + ".png") }); };

// ---- laptop ----
{
  const { ctx, page, posts } = await session("laptop", { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.click("#optionsBtn"); await page.waitForSelector("#optionsNewNote");
  expect(await page.locator("#optionsNewNote").innerText() === "New note", "Options: the first row's button says New note");
  await shot(page, "1-options-entry-laptop");
  await page.click("#optionsNewNote"); await page.waitForSelector("#noteSend");
  expect(await page.locator(".op-thumb-box").count() === 1, "New note opens with one shot already in");
  expect(await page.locator("#noteSend").isDisabled() === false, "Send is on with a shot");
  const nat = await page.evaluate(() => new Promise((r) => { const im = document.querySelector(".op-thumbpic img"); const t = () => (im.naturalWidth ? r([im.naturalWidth, im.naturalHeight]) : setTimeout(t, 50)); t(); }));
  expect(nat[1] === 600 || nat[1] > 400, "the shot is the device's own canvas pixels (" + nat.join("x") + ")");
  const rows0 = await page.locator("#noteText").evaluate((e) => e.clientHeight);
  await page.fill("#noteText", "the reeds flicker when I step left");
  await page.fill("#noteText", "a\nb\nc\nd\ne\nf\ng\nh\ni\nj");
  const rows1 = await page.locator("#noteText").evaluate((e) => e.clientHeight);
  expect(rows1 > rows0 && rows1 < rows0 * 3, "the text box grows with the words, then stops (" + rows0 + " -> " + rows1 + ")");
  await page.fill("#noteText", "the reeds flicker when I step left, and the stone looks cut off at the top. It happens every time I walk past it, not when I stand still");
  await page.waitForFunction(() => document.querySelector("#noteSentWith").innerText.includes("build"), null, { timeout: 5000 }).catch(() => {});
  expect((await page.locator("#noteSentWith").innerText()).includes("build"), "Sent with it shows the build: " + await page.locator("#noteSentWith").innerText());
  expect(!/\b\d+\.\d+\.\d+\.\d+\b/.test(await page.locator("#noteSentWith").innerText()), "Sent with it carries no address");
  await page.click("#noteAddWhole"); await page.waitForFunction(() => document.querySelectorAll(".op-thumb-box").length === 2);
  await page.click("#noteAddSection"); await page.waitForSelector("#sectionUse");
  const box = await page.locator(".op-cropimg").boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 6 }); await page.mouse.up();
  await shot(page, "5-section-laptop");
  expect(await page.locator("#sectionUse").isDisabled() === false, "Use this section is on after a drag");
  await page.click("#sectionUse"); await page.waitForFunction(() => document.querySelectorAll(".op-thumb-box").length === 3);
  const caps = await page.locator(".op-cap").allInnerTexts();
  expect(caps.join("|") === "Whole screen|Whole screen|Section", "thumbnails are named: " + caps.join("|"));
  const sec = await page.evaluate(() => new Promise((r) => { const im = document.querySelectorAll(".op-thumbpic img")[2]; const t = () => (im.naturalWidth ? r([im.naturalWidth, im.naturalHeight]) : setTimeout(t, 50)); t(); }));
  expect(sec[0] < nat[0] && sec[1] < nat[1], "the section is smaller than the screen (" + sec.join("x") + ")");
  await page.click("#noteAddSection"); await page.waitForSelector("#sectionWhole"); await page.click("#sectionWhole");
  await page.waitForFunction(() => document.querySelectorAll(".op-thumb-box").length === 4);
  expect((await page.locator(".op-cap").allInnerTexts())[3] === "Whole screen", "Keep the whole screen adds a whole shot");
  // the last 10 seconds
  const canClip = await page.evaluate(() => typeof VideoEncoder !== "undefined");
  await page.click("#noteAddLast"); await wait(1500);
  const clips = await page.locator("video").count();
  console.log("info WebCodecs here: " + canClip + "; last-10 clip thumbs: " + clips);
  if (canClip) expect(clips === 1 || (await page.locator("#noteAddLast").isVisible()), "Last 10 seconds answered");
  await page.screenshot({ path: shots ? path.join(shots, "3-note-laptop.png") : undefined });
  // keep playing: the bar's two controls
  await page.click("#noteKeep"); await page.waitForSelector("#noteBtn:not(.hidden)");
  const n0 = (await page.locator("#noteBtn").innerText());
  await page.keyboard.press("Shift+N"); await wait(400);
  const n1 = (await page.locator("#noteBtn").innerText());
  expect(n0 !== n1 && /Note · \d+/.test(n1), "Shift+N adds a shot: " + n0 + " -> " + n1);
  expect(await page.locator("#noteToast").isVisible(), "the toast says the picture was added");
  await shot(page, "7-playing-note-open-laptop");
  await page.click("#shotBtn"); await wait(300);
  const n2 = (await page.locator("#noteBtn").innerText()); expect(n2 !== n1, "the bar's + Whole screen adds one: " + n2);
  // record and stop
  if (canClip) {
    await page.click("#noteBtn"); await page.waitForSelector("#noteRecord"); await page.click("#noteRecord");
    await page.waitForSelector("#recBox:not(.hidden)"); await wait(1600);
    expect(/Recording 0:0\d/.test(await page.locator("#recWord").innerText()), "the strip says Recording: " + await page.locator("#recWord").innerText());
    await page.click("#recStop"); await page.waitForSelector("#recBox", { state: "hidden" });
    await wait(500);
  }
  await page.click("#noteBtn"); await page.waitForSelector("#noteSend");
  // delete is asked first, and kept when cancelled
  await page.click("#noteDelete"); await page.waitForSelector("#noteDeleteYes"); await wait(400); await page.keyboard.press("Escape"); await wait(300);
  expect(await page.locator("#noteSend").count() === 1 && await page.locator(".op-thumb-box").count() >= 5, "Delete asks first; cancel keeps the note: send " + await page.locator("#noteSend").count() + ", pictures " + await page.locator(".op-thumb-box").count());
  if (shots) await page.screenshot({ path: path.join(shots, "debug-delete.png") });
  const items = await page.locator(".op-thumb-box").count();
  await page.click("#noteSend");
  await page.waitForFunction(() => document.querySelector("#noteSend") === null, null, { timeout: 8000 });
  await wait(800);
  expect(posts.length === 1, "one note was sent: " + posts.length);
  const p = posts[0] || {};
  expect(/^multipart\/form-data; boundary=/.test(p.type || ""), "the body is multipart");
  expect(p.shot + p.clip === items, "every picture and clip went: " + p.shot + " + " + p.clip + " of " + items);
  expect(p.source === "owner", "the source is owner by default: " + p.source);
  let ctxj = null; try { ctxj = JSON.parse(p.context); } catch { /* checked next */ }
  expect(!!ctxj && ctxj.build && ctxj.layout && ctxj.layout.w === 1280 && ctxj.device, "the context holds build, layout and the played device");
  expect(!!ctxj && ctxj.companion && ctxj.companion.seed != null && Array.isArray(ctxj.companion.events), "the Companion's world, place and events came with it: " + JSON.stringify(ctxj && ctxj.companion && Object.keys(ctxj.companion)));
  expect(!!ctxj && ctxj.station && ctxj.station.screen, "the Station's screen came with it");
  expect(!/user-?agent|\bip\b/i.test(p.context || ""), "no address or user-agent in the context");
  await wait(300);
  expect(await page.locator("#noteBtn").isHidden(), "the bar's note controls vanish after Send");
  // a source set by an agent tester
  await page.evaluate(() => { const o = JSON.parse(localStorage.getItem("mb-options") || "{}"); o.noteFrom = "Sol"; localStorage.setItem("mb-options", JSON.stringify(o)); });
  await page.click("#optionsBtn"); await page.waitForSelector("#optionsNewNote"); await page.click("#optionsNewNote"); await page.waitForSelector("#noteSend");
  expect((await page.locator(".op-from").innerText()).startsWith("From: Sol"), "the note names its source from the stored setting: " + await page.locator(".op-from").innerText());
  await page.click("#noteSend"); await page.waitForFunction(() => document.querySelector("#noteSend") === null); await wait(500);
  expect(posts.length === 2 && posts[1].source === "Sol", "the tester's source reached the route");
  await ctx.close();
}

// ---- offline: kept, survives a reload, goes when the route answers ----
{
  const s = await session("offline", { viewport: { width: 1280, height: 800 } });
  s.setMode("down");
  await s.page.click("#optionsBtn"); await s.page.waitForSelector("#optionsNewNote"); await s.page.click("#optionsNewNote"); await s.page.waitForSelector("#noteSend");
  await s.page.fill("#noteText", "kept offline");
  await s.page.click("#noteSend"); await s.page.waitForFunction(() => document.querySelector("#noteSend") === null); await wait(800);
  expect(s.posts.length === 0, "nothing reached the route while it was down");
  const left = await s.page.evaluate(async () => (await new Promise((res) => { const r = indexedDB.open("keyval-store"); r.onsuccess = () => { const q = r.result.transaction("keyval").objectStore("keyval").getAllKeys(); q.onsuccess = () => res(q.result); }; })));
  expect(left.some((k) => String(k).startsWith("note:")), "the note is kept in IndexedDB: " + JSON.stringify(left));
  await s.page.reload(); await s.page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 30000 });
  s.setMode("ok");
  await s.page.evaluate(() => window.dispatchEvent(new Event("online")));
  await wait(2500);
  expect(s.posts.length === 1 && s.posts[0].text === "kept offline", "after a reload the kept note goes when the route answers: " + s.posts.length);
  await s.ctx.close();
}

// ---- phone ----
{
  const { ctx, page } = await session("phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.tap("#optionsBtn"); await page.waitForSelector("#optionsNewNote"); await shot(page, "2-options-entry-phone");
  await page.tap("#optionsNewNote"); await page.waitForSelector("#noteSend");
  await page.fill("#noteText", "the reeds flicker when I step left, and the stone looks cut off at the top. It happens every time I walk past it, not when I stand still");
  await shot(page, "4-note-phone");
  await page.tap("#noteAddSection"); await page.waitForSelector("#sectionUse");
  const box = await page.locator(".op-cropimg").boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 6 }); await page.mouse.up();
  await shot(page, "6-section-phone");
  await page.tap("#sectionUse"); await page.waitForFunction(() => document.querySelectorAll(".op-thumb-box").length === 2);
  const canClip = await page.evaluate(() => typeof VideoEncoder !== "undefined");
  await page.tap("#noteKeep"); await page.waitForSelector("#noteBtn:not(.hidden)");
  const bb = await page.locator("#noteBtn").boundingBox();
  expect(bb && bb.y + bb.height <= 844 && bb.x >= 0, "the phone's note strip is on screen: " + JSON.stringify(bb));
  if (canClip) {
    await page.tap("#noteBtn"); await page.waitForSelector("#noteRecord"); await page.tap("#noteRecord");
    await page.waitForSelector("#recBox:not(.hidden)"); await wait(1500); await shot(page, "8-playing-recording-phone");
    await page.tap("#recStop"); await wait(500);
  } else await shot(page, "8-playing-recording-phone");
  await ctx.close();
}
await browser.close(); server.close(); caddy.stop(); caddyServer.closeAllConnections(); caddyServer.close();
if (errors.length) { console.error("page errors:\n" + errors.join("\n")); fails.push("page errors"); }
if (fails.length) { console.error("FAILED " + fails.length); process.exit(1); }
console.log("notes journey ok");
