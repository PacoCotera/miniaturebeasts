// Shared by the front-page shoot-*.mjs scripts: a still of the real play page plus the capture sidecar tools/art/sign.py (class still, --site) reads.
// The sidecar: { build, seed, cell, view, size, script, pieceSha256, files: [{ slot, sha256 }], stillSha256, madeAt, tool, args }.
// build = the live commit (from /build.json); files = sha256 of every image the page loaded (network log), so sign can check each one is a live line on the ledger.
// A replay is the same script run again with the same args: it must give the same bytes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/home/mb/mb/.pw/node_modules/playwright");
export const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
export const SITE = process.env.SITE || "https://miniaturebeasts.com";
const EXE = "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell";

// A page with a log of every image the page loads. seed: the world's seed, pinned through the address (?seed=, a test-harness flag the page already reads).
export async function open({ seed, width = 1440, height = 900 }) {
  const br = await chromium.launch({ executablePath: EXE });
  const page = await (await br.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "reduce" })).newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  const images = new Map();   // url path -> sha256
  const byFrame = new Map(); images.byFrame = byFrame;   // frame url -> the same, for the images that frame requested
  page.on("response", async (r) => {
    try {
      const u = new URL(r.url()); const ct = r.headers()["content-type"] || "";
      if (!/^image\//.test(ct) && !/\.(png|webp|jpg|jpeg|gif)$/i.test(u.pathname)) return;
      const h = sha256(await r.body());
      images.set(u.pathname, h);
      const fu = r.request().frame().url(); (byFrame.get(fu) || byFrame.set(fu, new Map()).get(fu)).set(u.pathname, h);
    } catch (e) { /* a redirect or an aborted request has no body */ }
  });
  // every <img>/<image> source the page (any frame) draws onto a canvas: the sidecar lists only these, not everything the page loaded
  await page.addInitScript(() => {
    const seen = (window.__drawnSrc = window.__drawnSrc || new Set()), d = CanvasRenderingContext2D.prototype.drawImage;
    const cib = window.createImageBitmap; if (cib) window.createImageBitmap = function (im, ...a) { try { if (im && im.src) seen.add(im.src); } catch (e) { /* ignore */ } return cib.call(this, im, ...a); };
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) { try { if (im && im.src && im.naturalWidth > 0) seen.add(im.src); } catch (e) { /* ignore */ } return d.call(this, im, ...a); };
  });
  const build = await (await fetch(SITE + "/build.json")).json();
  await page.goto(`${SITE}/play/${seed != null ? "?seed=" + seed : ""}`, { waitUntil: "load" });
  return { br, page, images, build: build.commit };
}

// The images drawn so far, in every frame of the page, as an url path -> sha256 map (only files the network log has bytes for, never the empty file).
export async function drawn(page, images, frameName) {
  const EMPTY = sha256(Buffer.alloc(0)), out = new Map();
  for (const f of page.frames().filter((x) => x.url().includes(frameName))) {   // only the frame whose canvas was captured
    const srcs = await f.evaluate(() => [...(window.__drawnSrc || [])]).catch(() => []);
    for (const s of srcs) { try { const p = new URL(s).pathname, h = images.get(p); if (h && h !== EMPTY) out.set(p, h); } catch (e) { /* data: url etc. */ } }
  }
  if (!out.size) {   // a frame that paints in its own rasteriser (the Station) reads its pictures by fetch: the images that frame requested
    for (const [fu, m] of images.byFrame) if (fu.includes(frameName)) for (const [p, h] of m) if (h !== EMPTY) out.set(p, h);
  }
  return out;
}

// Writes <out>/<name>.png (the bytes of the game's own capture(), unchanged) and <out>/<name>.json (the sidecar).
export function write({ out, name, dataUrl, build, seed, cell, view, size, script, args, images }) {
  fs.mkdirSync(out, { recursive: true });
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  const png = path.join(out, name + ".png");
  fs.writeFileSync(png, buf);
  const files = [...images.entries()].sort().map(([slot, sha]) => ({ slot, sha256: sha })), seen = new Set();
  const uniq = files.filter((f) => !seen.has(f.sha256) && seen.add(f.sha256));
  const sc = { still: name + ".png", stillSha256: sha256(buf), pieceSha256: sha256(buf), madeAt: new Date().toISOString(), tool: "prototypes/play/tools/" + path.basename(script), build, seed, cell, view, size,
    script: path.basename(script) + "@" + sha256(fs.readFileSync(script)).slice(0, 12), args, files: uniq };
  fs.writeFileSync(path.join(out, name + ".json"), JSON.stringify(sc, null, 2) + "\n");
  console.log("wrote", png, sc.pieceSha256.slice(0, 12), "images", uniq.length);
  return sc;
}
