// Every load-failure / broken-page line names the build, and its detail fits: the play page served as the site serves it, one request blocked at a time.
//   PW_DIR=/path/with/node_modules/playwright  node prototypes/play/tools/break-line.mjs [--shots <dir> <tag>]
// 1. a Companion module blocked  -> its "didn't load" line: detail in at most 2 lines of whole words, ending "build <sha>" (read from the frame's window.__mbBreakLines)
// 2. a Station request blocked   -> its boot line: the same rule, in the page's DOM
// 3. the shell module blocked    -> the play page's own line "build <sha>"
// A fake build.json ({ short: "f252de4" }) is served beside the prototypes, as the site serves its own.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(process.env.BREAK_ROOT || path.resolve(here, "../.."));
const args = process.argv.slice(2), si = args.indexOf("--shots"), shotDir = si >= 0 ? args[si + 1] : null, tag = si >= 0 ? args[si + 2] : "after";
if (shotDir) mkdirSync(shotDir, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  if (rel === "/../build.json" || rel === "/build.json" || /\/build\.json$/.test(rel)) { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ short: "f252de4", commit: "f252de443", built: "2026-11-18T12:00:00Z", version: "0.0.0" })); return; }
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(path.resolve(root, ".."), rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const browser = await chromium.launch();
const fails = [];
const expect = (c, m) => { if (!c) { fails.push(m); console.error("FAIL " + m); } else console.log("ok " + m); };

async function open(block, size, tail = "") {
  const [w, h] = size;
  const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: w, height: h }, colorScheme: "dark" });
  const page = await ctx.newPage();
  for (const pat of block) await page.route(pat, (r) => r.abort());
  await page.goto(base + tail, { waitUntil: "load" });
  return { page, ctx };
}

for (const size of [[390, 844], [844, 390]]) {
  const name = size.join("x");
  // 1. the Companion
  { const { page, ctx } = await open(["**/places/src/page.mjs*"], size);
    const fr = () => page.frames().find((f) => /\/exploration\//.test(f.url()));
    await page.waitForFunction(() => { const f = [...document.querySelectorAll("iframe")].find((i) => /exploration/.test(i.src)); return f && f.contentWindow.__mbBreakLines; }, null, { timeout: 60000 }).catch(() => { });
    const lines = await fr().evaluate(() => window.__mbBreakLines || null);
    expect(lines && lines.length >= 1 && lines.length <= 2, `${name} companion: the detail is at most 2 lines (${JSON.stringify(lines)})`);
    expect(lines && lines.at(-1).endsWith("build f252de4"), `${name} companion: ends with the whole "build f252de4"`);
    expect(lines && /^places · Failed to fetch/.test(lines[0]) && /page\.mjs/.test(lines.join(" ")), `${name} companion: the start and the end of the error text are kept (a longer one is cut with …, tests/breakline.test.mjs)`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `${tag}-companion-${name}.png`) });
    await ctx.close(); }
  // 2. the Station (opened as its own tab)
  { const { page, ctx } = await open(["**/species/frames/language/index.json*"], size);
    const tab = page.getByRole("tab", { name: /Station/ }).first(); await tab.tap().catch(() => { });
    const st = () => page.frames().find((f) => /\/station\//.test(f.url()));
    await page.waitForFunction(() => { const f = [...document.querySelectorAll("iframe")].find((i) => /station/.test(i.src)); const b = f && f.contentDocument && f.contentDocument.getElementById("boot"); return b && /did not start/.test(b.textContent); }, null, { timeout: 60000 }).catch(() => { });
    const txt = st() ? await st().evaluate(() => document.getElementById("boot").textContent) : "";
    const lines = txt.split("\n");
    expect(/did not start/.test(txt) && lines.length <= 3, `${name} station: headline + at most 2 detail lines (${JSON.stringify(lines)})`);
    expect(/build f252de4$/.test(txt), `${name} station: ends with the whole "build f252de4"`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `${tag}-station-${name}.png`) });
    await ctx.close(); }
  // 3. the shell
  { const { page, ctx } = await open(["**/play/src/stamp.mjs*"], size, "");
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => { const e = document.getElementById("pageBroke"); return e && !e.hidden ? e.textContent : null; });
    expect(t === "build f252de4", `${name} shell: the page's own line (${JSON.stringify(t)})`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `${tag}-shell-${name}.png`) });
    await ctx.close(); }
}
await browser.close(); server.close();
if (fails.length) { console.error(fails.length + " failed"); process.exit(1); }
console.log("all passed");
