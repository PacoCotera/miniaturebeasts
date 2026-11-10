// Stills of generator 7 in play, at 1x (450 x 600, the Companion's screen): a first trip's start cell, a landmark cell, a strike mark before and after a reading, the full-hold refusal, End expedition
// after a walk into a place, and a generator 6 save's reset screen. For the owner and the art director; nothing here is a test.
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node prototypes/exploration/tools/gen7-stills.mjs --out DIR [--seed 7]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".mbtiles": "application/octet-stream", ".mbplace": "application/octet-stream" };
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : process.argv[i + 1]; };
const seed = +arg("seed", 7), out = path.resolve(arg("out", "gen7-stills"));
mkdirSync(out, { recursive: true });

const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html`;
const browser = await chromium.launch();
const errors = [];
async function open(init) {
  const ctx = await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url); await page.waitForFunction(() => window.__mb && window.__mb.PL && window.__mb.PL.ready, null, { timeout: 120000 });
  return page;
}
const save = async (page, name) => { const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name), Buffer.from(d.split(",")[1], "base64")); console.log(name); };
const settle = (page, ms = 900) => page.waitForTimeout(ms);

// ---- the world: seed, a calm expedition from the first start ----
const page = await open();
await page.evaluate((s) => { const m = window.__mb; m.newWorld(s); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]); m.enterPatch(); }, seed);
await settle(page, 2500);
await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
await settle(page); await save(page, "1-first-trip-start-cell.png");

// ---- a landmark cell: the nearest cell in the home region with a landmark, the pawn beside it ----
const lm = await page.evaluate(() => { const m = window.__mb; let best = null; for (let c = 0; c < m.MW * m.MH; c++) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const lay = m.layout(String(c)); if (lay.landmark && (!best || (lay.landmark.kind === "hollow-tree" && best.kind !== "hollow-tree"))) best = { c, kind: lay.landmark.kind, name: lay.landmark.name }; } return best; });
console.log("landmark", JSON.stringify(lm));
if (lm) {
  await page.evaluate((c) => { const m = window.__mb; m.leavePatch(); m.S.exp.pos = c; m.S.exp.start = c; m.enterPatch(); const P = m.S.exp.patch, lay = m.layout(P.key), L = lay.landmark; m.S.veil[P.key] = new Array(lay.h).fill(0x0fffffff);
    let best = null, bd = 1e9; for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) { if (!lay.reach[y * lay.w + x]) continue; const d = Math.abs(x - L.x - 1) + Math.abs(y - L.y - 3); if (d < bd) { bd = d; best = { x, y }; } } if (best) { P.x = best.x; P.y = best.y; } m.walkLift(); }, lm.c);
  await settle(page, 1500); await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); }); await settle(page); await save(page, "2-landmark-cell.png");
}

// ---- a strike mark before and after its reading ----
const mk = await page.evaluate(() => { const m = window.__mb; for (let c = 0; c < m.MW * m.MH; c++) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const lay = m.layout(String(c)); const q = lay.feats.find((f) => f.kind === "q"); if (q) return { c, x: q.x, y: q.y }; } return null; });
console.log("mark", JSON.stringify(mk));
if (mk) {
  await page.evaluate((o) => { const m = window.__mb; if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = o.c; m.S.exp.start = o.c; m.enterPatch(); const P = m.S.exp.patch, lay = m.layout(P.key); m.S.veil[P.key] = new Array(lay.h).fill(0x0fffffff);
    const free = [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]].find(([dx, dy]) => { const x = o.x + dx, y = o.y + dy; return x >= 0 && y >= 0 && x < lay.w && y < lay.h && lay.reach[y * lay.w + x]; });
    P.x = o.x + free[0]; P.y = o.y + free[1]; P.dir = free[2]; m.walkLift(); }, mk);
  await settle(page, 1200); await save(page, "3a-strike-mark-before.png");
  await page.evaluate(() => window.__mb.act("confirm")); await settle(page, 900); await save(page, "3b-strike-mark-after.png");
  // ---- the full hold: Data at 20, the next mark refused ----
  await page.evaluate(() => { const m = window.__mb; m.S.exp.cargo.e = 20; m.S.exp.cargo.s = 20; m.S.exp.cargo.d = 20; const P = m.S.exp.patch, lay = m.layout(P.key); const st = lay.feats.find((f) => f.kind === "k"); if (st) { m.setFS(P.key, st.id, { ch: 2 }); P.x = st.x; P.y = Math.min(lay.h - 1, st.y + 1); P.dir = "up"; } });
  await settle(page, 500); await page.evaluate(() => window.__mb.act("confirm")); await settle(page, 700); await save(page, "4-full-hold-refusal.png");
}

// ---- End expedition after a walk into a place ----
await page.evaluate(() => { const m = window.__mb; m.S.exp.cargo.e = 2; m.S.exp.cargo.s = 3; m.S.exp.cargo.d = 6; if (m.S.exp.patch) m.leavePatch(); m.endExpedition("send"); });
await settle(page, 1200); await save(page, "5-end-expedition-after-a-walk.png");
await page.close();

// ---- a generator 6 save: the reset screen ----
const g6 = await open();
const raw = await g6.evaluate((s) => { const m = window.__mb; m.newWorld(s); const o = JSON.parse(localStorage.getItem(m.SAVE_KEY)); o.regions = o.regions.map((r) => ({ ...r, gen: 6 })); return JSON.stringify(o); }, seed);
await g6.close();
const old = await open(`localStorage.setItem("mb-save-v8", ${JSON.stringify(raw)});`);
await settle(old, 1800); await save(old, "6-generator-6-save-reset-screen.png");
console.log("kept copy:", await old.evaluate(() => Object.keys(localStorage).filter((k) => /\.gen6$/.test(k)).length), "errors", JSON.stringify(errors));
await browser.close(); server.close();
