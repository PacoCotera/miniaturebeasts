// Shoots every story of the component gallery (play/options, Ladle) at phone (390) and laptop (1440) width into a folder, one PNG each, for sign-offs.
//   npm run catalogue:build --prefix prototypes/play/options     (once; writes catalogue-out)
//   node prototypes/play/tools/shoot-gallery.mjs <out-dir> [story-id-prefix]     (PW_DIR=/path/with/node_modules/playwright if playwright is not installed here)
// Writes <out-dir>/<story-id>--phone.png and --laptop.png, and <out-dir>/index.json (story id, file, widths). Exits 1 when a story throws a page error or draws nothing.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, "../options/catalogue-out");
const out = process.argv[2], only = process.argv[3] || "";
if (!out) { console.error("usage: shoot-gallery.mjs <out-dir> [story-id-prefix]"); process.exit(2); }
if (!existsSync(path.join(site, "meta.json"))) { console.error("no catalogue-out: run npm run catalogue:build --prefix prototypes/play/options first"); process.exit(2); }
mkdirSync(out, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = path.join(site, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const ids = Object.keys(JSON.parse(readFileSync(path.join(site, "meta.json"), "utf8")).stories).filter((id) => id.startsWith(only));
const WIDTHS = { phone: [390, 844], laptop: [1440, 900] };

const browser = await chromium.launch();
const fails = [], index = [];
for (const [name, [w, h]] of Object.entries(WIDTHS)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  for (const id of ids) {
    const page = await ctx.newPage();
    page.on("pageerror", (e) => fails.push(`${id} @${name}: ${e.message}`));
    await page.goto(`${base}?story=${id}&mode=preview`, { waitUntil: "load" });
    await page.waitForSelector("#ladle-root *", { timeout: 15000 }).catch(() => fails.push(`${id} @${name}: nothing rendered`));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);   // the focus script, the lamp's amber picture, the sheet's open animation
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src") || "").slice(0, 3));
    if (broken.length) fails.push(`${id} @${name}: image not loaded: ${broken.join(", ")}`);
    // a laptop-sized story (a 770 or 1040 px tray) is wider than a phone: widen the shot to the story so it is whole, and say so in the index; a story that is cut at the laptop width, or a phone-sized one that overflows, fails
    let shotW = w;
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (wide > 0) {
      if (name === "phone" && /laptop|sideways/.test(id)) { shotW = w + wide; await page.setViewportSize({ width: shotW, height: h }); await page.waitForTimeout(300); }
      else fails.push(`${id} @${name}: cut at the right (${wide}px wider than the screen)`);
    }
    const file = `${id}--${name}.png`;
    await page.screenshot({ path: path.join(out, file), fullPage: true });
    index.push({ story: id, width: shotW, file });
    await page.close();
  }
  await ctx.close();
}
await browser.close(); server.close();
writeFileSync(path.join(out, "index.json"), JSON.stringify(index, null, 1) + "\n");
console.log(`${index.length} shots of ${ids.length} stories in ${out}`);
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
