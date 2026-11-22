// Stills of the G2 grey pairing page at 390x844, served from a worktree: the pair with its four young and the green, a hatch, generation ten.
// Usage: node g2-stills.mjs <worktree> <out dir> [seed]
// Opens the page by its test entry (/station/?g2=1), plays it on the page's own buttons (taps), and for the long run picks by the engine's own refusals through window.__g2.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("/home/mb/mb/.pw/node_modules/playwright");
const [src, out, seed = "g2"] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css" };
const root = path.join(src, "prototypes");
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.G2_CHROMIUM || "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("console", m.text()); });
await page.goto(`${base}station/?g2=1&seed=${seed}`, { waitUntil: "load" });
await page.waitForSelector(".m");
console.log("url", page.url());
// which two the engine lets pair, richest in generation (the newest lines first)
const choose = () => page.evaluate(() => { const { g, G } = window.__g2; let best = null; for (const a of g.group) for (const b of g.group) if (a.id < b.id && !G.refusal(g, a, b)) { const s = a.gen + b.gen + (a.gen === b.gen ? 0.5 : 0); if (!best || s > best.s) best = { s, a: a.id, b: b.id }; } return best; });
const tap = (id) => page.locator(`.m[data-id="${id}"]`).click();
let c = await choose();
await tap(c.a); await tap(c.b);
await page.screenshot({ path: path.join(out, "g2-1-pair.png") });
await page.screenshot({ path: path.join(out, "g2-1-pair-full.png"), fullPage: true });
await page.locator(".go").click();
await page.screenshot({ path: path.join(out, "g2-2-hatch.png") });
let n = 1;
while (n < 200) {
  const gen = await page.evaluate(() => window.__g2.g.generation);
  if (gen >= 10) break;
  c = await choose(); await tap(c.a); await tap(c.b); await page.locator(".go").click(); n++;
}
console.log("hatches", n, "generation", await page.evaluate(() => window.__g2.g.generation));
await page.screenshot({ path: path.join(out, "g2-3-generation-ten.png") });
await browser.close(); server.close();
