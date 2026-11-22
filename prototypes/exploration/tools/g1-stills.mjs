// G1's two stills at 390 x 844 under /play/?g1=1: approaching through the reeds, and a habit's beat with the note line.
//   node prototypes/exploration/tools/g1-stills.mjs <tree> <outdir>
// Serves the tree as it stands (the source modules, as the sandbox does in development), opens the play page, and drives the Companion's G1 state through the same module the page runs.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PW = process.env.PAGESHOT_PLAYWRIGHT || "/home/mb/mb/.pw/node_modules/playwright/index.mjs";
const CHROME = process.env.PAGESHOT_CHROME || "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell";
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".wasm": "application/wasm" };
const [tree, outdir] = process.argv.slice(2);
if (!tree || !outdir) { console.error("usage: g1-stills.mjs <tree> <outdir>"); process.exit(2); }
fs.mkdirSync(outdir, { recursive: true });

const server = http.createServer((req, res) => {
  let p = path.join(tree, decodeURIComponent(req.url.split("?")[0]));
  if (p.startsWith(tree) && fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p) && p.includes("node_modules")) for (const root of (process.env.G1_NODE_MODULES_TREES || "/home/mb/mb/pool/land-1,/home/mb/mb/pool/station-art-20-1").split(",")) { const q = path.join(root, p.slice(tree.length)); if (fs.existsSync(q)) { p = q; break; } }   // a tree without its npm packages installed: read them from another tree's copy (nothing is installed)
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const { chromium } = await import(PW);
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", e => console.log("pageerror", e.message));
page.on("console", m => { if (m.type() === "error") console.log("console.error", m.text().slice(0, 200)); });
page.on("requestfailed", r => console.log("requestfailed", r.url().slice(-90)));
page.on("response", r => { if (r.status() >= 400) console.log("http", r.status(), r.url().slice(-90)); });
await page.goto(base + "/prototypes/play/index.html?g1=1&test", { waitUntil: "load" });
let frame = null;
for (let i = 0; i < 80 && !frame; i++) { await page.waitForTimeout(250); frame = page.frames().find(f => f.url().includes("exploration")); if (frame && !(await frame.evaluate(() => !!(window.__mb && window.__mb.g1 && window.__mb.g1())).catch(() => false))) frame = null; }
if (!frame) { console.log("no Companion with G1 state"); await page.screenshot({ path: path.join(outdir, "debug.png") }); await browser.close(); server.close(); process.exit(1); }
const run = (fn, arg) => frame.evaluate(fn, arg);
// drive the G1 state with its own rules module (the same file the page imported)
await run(async () => {
  const G = await import(new URL("./src/g1-watch.mjs", location.href).href); window.__G = G; const S = window.__mb.g1();
  S.rain = { s: 20, e: 40 }; S.wind = S.wind.map(() => "N");
  const tiles = G.ROUTES.cover; let i = 0; const goal = tiles.findIndex(q => G.tileAt(q.x, q.y) === "r") + 2;   // two tiles into the reeds
  while (i < goal) { const a = tiles[i], b = tiles[i + 1]; G.step(S, b.x > a.x ? "right" : b.x < a.x ? "left" : b.y > a.y ? "down" : "up", "creep"); i++; }
  while (S.light < 20) G.wait(S);
});
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(outdir, "g1-approach-reeds-390x844.png") });
await run(async () => {
  const G = window.__G, S = window.__mb.g1(), tiles = G.ROUTES.cover;
  let i = tiles.findIndex(q => q.x === S.P.x && q.y === S.P.y);
  const goal = tiles.findIndex(q => Math.max(Math.abs(q.x - S.L.x), Math.abs(q.y - S.L.y)) <= 4);
  while (i < goal) { const a = tiles[i], b = tiles[i + 1]; G.step(S, b.x > a.x ? "right" : b.x < a.x ? "left" : b.y > a.y ? "down" : "up", "creep"); i++; if (S.L.ease) G.hold(S); }
  while (!S.L.habit && S.light < 60) G.hold(S);
  G.face(S); G.wait(S); G.wait(S); G.wait(S); G.face(S);
});
await page.waitForTimeout(300);
await frame.evaluate(() => window.__mb.press("confirm"));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outdir, "g1-habit-beat-note-390x844.png") });
console.log(JSON.stringify(await run(() => { const S = window.__mb.g1(); return { light: S.light, habit: S.L.habit, notes: S.notes, data: S.data, ease: S.L.ease }; })));
await browser.close(); server.close();
