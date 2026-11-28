// W4 round 2 stills on the live page at phone size (390 x 844) and at walking zoom (the page's own 1x frame):
//   1 the tell with the card's first want (her coat) and the amber frame on her (not on the empty tile in front of the pawn)
//   2 a mid note's words (her coat only)
//   3 the tuft after the shake, at its signed size and palette
//   4 her prints at a haunt she has left: the paw mark on the tile, then the read in the message box
//   5 whole-place stills at walking zoom (1x frame) of the paw mark on a tile, day and night
//   PW_DIR=/home/mb/mb/wt-cishard-tmp node prototypes/exploration/tools/w4r2-stills.mjs --seed 13 --out DIR
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
const seed = +arg("seed", 13), out = path.resolve(arg("out", "w4r2-stills")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
const errors = [], log = {};
const open = async () => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
  return page;
};
const pickLoika = (page) => page.evaluate((seed) => {
  const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
  for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind) return { key, id: q.id }; delete m.S.exp.live[key]; } return null; }, seed);
const shot = async (page, name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, name + ".png") }); };
const frame1x = async (page, name) => { const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name + ".png"), Buffer.from(d.split(",")[1], "base64")); };

// ---- the habit stills: the shake in the scripted rain (as round 1's stills) ----
async function habit(mode) {
  const page = await open(), pick = await pickLoika(page);
  await page.evaluate(({ key, id }) => {
    const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch, col = lay.cell % m.MW;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 50; for (const k of ["warned", "warn", "storm", "shield"]) if (!S.found.includes(k)) S.found.push(k);
    c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = "idle"; c.gone = null; c.hide = 0; delete c.wary; c.wet = 1; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
    lay.easeG = { cov: new Set(), blk: new Set() };
    for (const q of live.cr) if (q.id !== id && q.ind) q.hide = 1;   // the scene is hers alone: another named Loika shaking nearby would take the note
    const W = m.windAt(S.seed, lay.cell, S.day.spent), vec = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[W];
    for (let d = 1; d <= 4; d++) { const x = c.x + vec[0] * d, y = c.y + vec[1] * d; lay.tiles[y * lay.w + x] = m.T.REEDS; lay.reach[y * lay.w + x] = 1; }
    m.lightningLift(key, c.x, c.y, 6); P.x = c.x + vec[0] * 4; P.y = c.y + vec[1] * 4; P.dir = vec[1] > 0 ? "up" : vec[1] < 0 ? "down" : vec[0] > 0 ? "left" : "right";
    S.exp.storm = { x: col + .5 - 1.5 + 1.7 - 1.5, w: 3, dir: -1, v: .25, t: 0 }; window.__w4 = { id, vec }; }, pick);
  await page.waitForTimeout(600);
  const tick = async (allow) => page.evaluate((allow) => { const m = window.__mb, c = m.curLive().cr.find(q => q.id === window.__w4.id); m.curLive().strike = null; m.S.exp.stray = null; const a = m.patchAction(); if (allow && a.label === m.WORDS.habit.note) { a.run(); return "note"; } m.advance("patch", { noise: "act" }); return c.hb ? c.hb.k + c.hb.n : c.st; }, allow);
  const hb = () => page.evaluate(() => { const c = window.__mb.curLive().cr.find(q => q.id === window.__w4.id); return c.hb ? { k: c.hb.k, n: c.hb.n, tell: c.hb.tell } : null; });
  const steps = []; let tellShot = false;
  for (let i = 0; i < 40; i++) {
    const h = await hb();
    if (h && mode === "near" && !steps.includes("in")) { steps.push("in"); await page.evaluate(() => { const m = window.__mb, c = m.curLive().cr.find(q => q.id === window.__w4.id), P = m.S.exp.patch, v = window.__w4.vec; P.x = c.x + v[0] * 2; P.y = c.y + v[1] * 2; }); }
    if (h && mode === "mid" && !tellShot) { tellShot = true; await page.evaluate(() => window.__mb.advance("patch", { noise: "act" })); await shot(page, "1-the-tell-card-first-want-frame-on-her"); }
    const r = await tick(!steps.includes("note")); steps.push(r);
    if (r === "note") { log[mode + "-note"] = await page.evaluate(() => { const m = window.__mb, n = m.S.exp.stats.noted.slice(-1)[0], c = m.curLive().cr.find(q => q.id === window.__w4.id), P = m.S.exp.patch; return JSON.stringify({ range: n.range, gives: n.gives, dist: Math.max(Math.abs(c.x - P.x), Math.abs(c.y - P.y)), name: m.S.named[c.id] }); });
      await shot(page, mode === "near" ? "3-near-note" : "2-mid-note-words"); if (mode === "mid") break; }
    const d = await page.evaluate(() => !!window.__mb.S.day.hab[window.__w4.id + ":shake"]); if (d) break;
  }
  if (mode === "near") { await page.waitForTimeout(200); await shot(page, "4-tuft-on-the-ground"); }
  log[mode] = steps.join(" "); await page.context().close();
}

// ---- her prints at a haunt she has left ----
async function prints(spent, tag, phone) {
  const page = await open(), pick = await pickLoika(page);
  const r = await page.evaluate(({ key, id, spent }) => {
    const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = spent; live.strike = null; S.exp.stray = null; S.exp.storm = null;
    const list = m.printsHere(); if (!list.length) return { none: 1, part: m.dayPart(), hs: !!c.ind.hs, gone: !!c.gone, cave: !!lay.cave, n: live.cr.length };
    const q = list[0], far = q.mark || q.stand, tryX = [far.x + 7, far.x - 7].find(x => x > 1 && x < lay.w - 2 && m.passable(x, far.y)) ?? far.x + 7;
    c.x = tryX; c.y = far.y; c.gone = null; c.ease = 0; c.st = "idle"; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
    const side = [[1, 0, "left"], [-1, 0, "right"], [0, 1, "up"], [0, -1, "down"]].find(([dx, dy]) => m.passable(far.x + dx, far.y + dy));
    m.lightningLift(key, far.x, far.y, 7); P.x = side ? far.x + side[0] * 2 : far.x; P.y = side ? far.y + side[1] * 2 : far.y; P.dir = side ? side[2] : "up";
    window.__pr = { mark: q.mark, st0: q.stand, stand: far, part: q.part, yday: q.yday, side: side && side.slice(0, 2) };
    return { stand: far, st0: q.stand, mark: q.mark, part: q.part, id }; }, { ...pick, spent });
  if (!r || r.none) { log["prints-" + tag] = "no prints " + JSON.stringify(r); await page.context().close(); return; }
  await page.waitForTimeout(600);
  // one step toward the prints: the pawn stands next to them, facing the stand tile
  await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, s = window.__pr.stand, sd = window.__pr.side; if (sd) { P.x = s.x + sd[0]; P.y = s.y + sd[1]; } m.advance("patch", { noise: "creep", moved: true }); });
  await shot(page, phone + "-a-the-mark-on-the-tile");
  if (tag === "day") await frame1x(page, "5-whole-place-walking-zoom-day-before-read");
  const read = await page.evaluate(() => { const m = window.__mb, a = m.patchAction(); const lab = a.label; if (lab === m.WORDS.prints.read) a.run(); return { lab, after: m.patchAction().label }; });
  await shot(page, phone + "-b-the-read-in-the-message-box");
  if (tag === "night") await frame1x(page, "5-whole-place-walking-zoom-night");
  log["prints-" + tag] = JSON.stringify({ ...r, ...read }); await page.context().close();
}
await habit("mid"); await habit("near");
await prints(95, "day", "6"); await prints(190, "night", "7");
await browser.close(); server.close();
writeFileSync(path.join(out, "stills.json"), JSON.stringify({ seed, log, errors }, null, 1));
console.log(JSON.stringify({ seed, log, errors }));
