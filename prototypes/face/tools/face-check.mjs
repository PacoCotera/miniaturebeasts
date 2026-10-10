#!/usr/bin/env node
// The face in a browser: the Station page (/sandbox/station/) boots the WebAssembly face, shows its 1024×600 display, takes keys,
// and draws the same pixels as the native Linux build. Measures and prints the load time, the size on the wire and the
// cost of copying a full frame to the canvas, at full speed and with the CPU throttled 4× (a phone's stand-in).
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/face-check.mjs   (after build.sh)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), dist = path.join(here, "../dist");
const GROUND = (() => { const h = JSON.parse(readFileSync(path.join(root, "ui/palettes/station.json"), "utf8")).colours.find(([n]) => n === "ground")[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); })();   // the palette's `ground`
if (!existsSync(path.join(dist, "face.wasm"))) { console.error("the face is not built (prototypes/face/build.sh)"); process.exit(2); }
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".wasm": "application/wasm", ".css": "text/css" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port, fails = [], expect = (ok, what) => { if (!ok) { fails.push(what); console.error("FAIL " + what); } };
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
const errors = []; page.on("pageerror", (e) => errors.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
await page.goto(`http://127.0.0.1:${port}/sandbox/station/`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready); await page.waitForTimeout(500);
const f = await page.evaluate(() => window.__st.face);
expect(f, "the face is loaded");
if (f) {
  expect(f.version === "LVGL 9.6.0", "LVGL 9.6.0: " + f.version); expect(f.size[0] === 1024 && f.size[1] === 600, "a 1024×600 display: " + f.size);
  expect(JSON.stringify(await page.evaluate(() => window.__st.face.pixel(10, 10))) === JSON.stringify(GROUND), "the top bar is the palette's ground colour");
  const onCanvas = await page.evaluate(() => { const d = document.getElementById("screen").getContext("2d").getImageData(10, 10, 1, 1).data; return [d[0], d[1], d[2]]; });
  expect(JSON.stringify(onCanvas) === JSON.stringify(GROUND), "the page's canvas shows the face's pixels: " + onCanvas);
  if (existsSync(path.join(dist, "native.hash"))) {   // the fixed scene (rules, the three Inter sizes, both rings, a picture) in a fresh face: the same pixels as the native build's
    const h = await page.evaluate(async () => { const { bootFace } = await import("/sandbox/station/src/face-lvgl.mjs"), g = await bootFace(); g.M._face_selftest_scene(); for (let t = 0; t < 4; t++) g.M._face_frame(t * 16); g.M._face_key(17, 1); g.M._face_key(17, 0); g.M._face_frame(80); return g.hash(); });
    expect(h === readFileSync(path.join(dist, "native.hash"), "utf8").trim(), `the wasm and native faces draw the same pixels for the fixed scene: ${h} vs ${readFileSync(path.join(dist, "native.hash"), "utf8").trim()}`);
  }
  await page.keyboard.press("Enter"); await page.keyboard.press("ArrowUp"); await page.waitForTimeout(200);
  const s = await page.evaluate(() => window.__st.face.stats); expect(s.keys === 2 && s.lastKey === 17, "two keys reach the face: " + JSON.stringify(s));
  // the cost of copying a full 1024×600 frame to the canvas, now and with the CPU throttled 4×
  const copyCost = () => page.evaluate(async () => {
    const { bootFace } = await import("/sandbox/station/src/face-lvgl.mjs"), f = await bootFace(), ctx = document.createElement("canvas").getContext("2d"); f.frame(0); f.present(ctx);
    const t = performance.now(); for (let i = 0; i < 30; i++) { f.M._face_frame(i * 16); f.present(ctx); } /* nothing changed: no rectangles */
    const idle = (performance.now() - t) / 30; ctx.canvas.width = 1024; ctx.canvas.height = 600;
    const full = (() => { const t2 = performance.now(); for (let i = 0; i < 10; i++) { f.forceFull(); f.present(ctx); } return (performance.now() - t2) / 10; })();
    return { idleMsPerFrame: +idle.toFixed(3), fullFrameCopyMs: +full.toFixed(2), loadMs: +f.loadMs.toFixed(1) };
  });
  const fast = await copyCost(), cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); const slow = await copyCost(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const wasm = readFileSync(path.join(dist, "face.wasm")), mjs = readFileSync(path.join(dist, "face.mjs"));
  console.log(`face: ${f.version} · display ${f.size.join("×")} · scene hash (native ${existsSync(path.join(dist, "native.hash")) ? readFileSync(path.join(dist, "native.hash"), "utf8").trim() : "n/a"})`);
  console.log(`size on the wire: face.wasm ${wasm.length} B (${gzipSync(wasm, { level: 9 }).length} B gzipped), face.mjs ${mjs.length} B (${gzipSync(mjs, { level: 9 }).length} B gzipped)`);
  console.log(`page load: wasm fetched, compiled and initialised in ${fast.loadMs} ms; a frame with nothing changed ${fast.idleMsPerFrame} ms; a full 1024×600 frame copied to the canvas ${fast.fullFrameCopyMs} ms`);
  console.log(`CPU throttled 4× (a phone's stand-in): load ${slow.loadMs} ms; idle frame ${slow.idleMsPerFrame} ms; full-frame copy ${slow.fullFrameCopyMs} ms (a 60 Hz frame is 16.7 ms)`);
}
expect(errors.length === 0, "no page errors: " + errors.join(" | "));
await browser.close(); server.close();
if (fails.length) { console.error("face check failed"); process.exit(1); }
console.log("face check ok");
