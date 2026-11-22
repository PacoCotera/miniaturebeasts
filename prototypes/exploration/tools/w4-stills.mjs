// W4 stills on the live page at phone size (390 x 844): the tell, a mid note's words, a near note with the tuft, the card line filled. One scripted rain (the test's), the page played through its own hooks.
//   PW_DIR=/home/mb/mb/wt-cishard-tmp node prototypes/exploration/tools/w4-stills.mjs --seed 13 --out DIR
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR || "/home/mb/mb/wt-cishard-tmp", "node_modules/playwright"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const seed = +arg("seed", 13), out = path.resolve(arg("out", "w4-stills")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
const errors = [], log = {};
// mode: 'near' (step in on the tell, note at 2 tiles) or 'mid' (note from 4 tiles)
async function run(mode) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
  const pick = await page.evaluate((seed) => {
    const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
    for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
      for (const q of live.cr) if (q.sp === 0 && q.ind) return { key, id: q.id }; delete m.S.exp.live[key]; } return null; }, seed);
  await page.evaluate(({ key, id }) => {
    const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch, col = lay.cell % m.MW;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 50; for (const k of ["warned", "warn", "storm", "shield"]) if (!S.found.includes(k)) S.found.push(k);
    c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = "idle"; c.gone = null; c.hide = 0; delete c.wary; c.wet = 1; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
    lay.easeG = { cov: new Set(), blk: new Set() };
    const W = m.windAt(S.seed, lay.cell, S.day.spent), vec = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[W];
    for (let d = 1; d <= 4; d++) { const x = c.x + vec[0] * d, y = c.y + vec[1] * d; lay.tiles[y * lay.w + x] = m.T.REEDS; lay.reach[y * lay.w + x] = 1; }
    m.unveil(key, c.x, c.y, 6); P.x = c.x + vec[0] * 4; P.y = c.y + vec[1] * 4; P.dir = vec[1] > 0 ? "up" : vec[1] < 0 ? "down" : vec[0] > 0 ? "left" : "right";
    S.exp.storm = { x: col + .5 - 1.5 + 1.7 - 1.5, w: 3, dir: -1, v: .25, t: 0 }; window.__w4 = { id, vec }; }, pick);
  await page.waitForTimeout(600);
  const tick = async (allow) => page.evaluate((allow) => { const m = window.__mb, c = m.curLive().cr.find(q => q.id === window.__w4.id); m.curLive().strike = null; m.S.exp.stray = null; const a = m.patchAction(); if (allow && a.label === m.WORDS.habit.note) { a.run(); return "note"; } m.advance("patch", { noise: "act" }); return c.hb ? c.hb.k + c.hb.n : c.st; }, allow);
  const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, name + ".png") }); };
  const hb = () => page.evaluate(() => { const c = window.__mb.curLive().cr.find(q => q.id === window.__w4.id); return c.hb ? { k: c.hb.k, n: c.hb.n, tell: c.hb.tell } : null; });
  const steps = [];
  for (let i = 0; i < 30; i++) {
    const h = await hb();
    if (h && mode === "near" && !steps.includes("in")) { steps.push("in"); await page.evaluate(() => { const m = window.__mb, c = m.curLive().cr.find(q => q.id === window.__w4.id), P = m.S.exp.patch, v = window.__w4.vec; P.x = c.x + v[0] * 2; P.y = c.y + v[1] * 2; }); }
    const r = await tick(!steps.includes("note")); steps.push(r);
    if (mode === "near" && r !== "note" && steps.filter(s => /^shake/.test(s)).length === 1 && !log.tell) { log.tell = 1; await shot("1-the-tell"); }
    if (r === "note") { await shot(mode === "near" ? "3-near-note-sample" : "2-mid-note-words"); if (mode === "mid") break; }
    if (mode === "near" && /^shake[3-9]/.test(r) && !log.tuft) { log.tuft = 1; }
    const d = await page.evaluate(() => !!window.__mb.S.day.hab[window.__w4.id + ":shake"]); if (d) break;
  }
  if (mode === "near") { await shot("4-card-line-filled"); await page.evaluate(() => { const m = window.__mb, c = m.curLive().cr.find(q => q.id === window.__w4.id); log: 0; }); }
  log[mode] = steps.join(" ");
  await page.context().close();
}
await run("near"); await run("mid");
await browser.close(); server.close();
writeFileSync(path.join(out, "stills.json"), JSON.stringify({ seed, log, errors }, null, 1));
console.log(JSON.stringify({ seed, log, errors }));
