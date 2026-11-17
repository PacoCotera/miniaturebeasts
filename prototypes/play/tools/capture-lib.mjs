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
  page.on("response", async (r) => {
    try {
      const u = new URL(r.url()); const ct = r.headers()["content-type"] || "";
      if (!/^image\//.test(ct) && !/\.(png|webp|jpg|jpeg|gif)$/i.test(u.pathname)) return;
      images.set(u.pathname, sha256(await r.body()));
    } catch (e) { /* a redirect or an aborted request has no body */ }
  });
  const build = await (await fetch(SITE + "/build.json")).json();
  await page.goto(`${SITE}/play/${seed != null ? "?seed=" + seed : ""}`, { waitUntil: "load" });
  return { br, page, images, build: build.commit };
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
