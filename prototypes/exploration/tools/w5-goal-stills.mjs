// W5 first-goal stills at 390x844 and 522x935: each goal form, the longest Loika name, a teaching line beside her, the empty end card.
//   node prototypes/exploration/tools/w5-goal-stills.mjs --seed 7 --out DIR
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR || "/home/mb/mb/wt-cishard-tmp", "node_modules/playwright"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const seed = +arg("seed", 7), out = path.resolve(arg("out", "goal-stills")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch(), log = {};
const open = async (w, h) => {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" })).newPage();
  page.on("pageerror", e => (log.errors = log.errors || []).push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
  return page;
};
const shot = async (page, name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, name + ".png") }); };
const setup = (page) => page.evaluate((seed) => { const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]); return m.S.exp.start; }, seed);
// a place with a named Loika (a kind with a routine), the player a few tiles from her
const toLoika = (page, name) => page.evaluate(({ seed, name }) => {
  const m = window.__mb, S = m.S;
  for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    const q = live.cr.find(x => x.sp === 0 && x.ind && x.ind.hs); if (!q) { delete S.exp.live[key]; continue; }
    S.exp.pos = key; m.enterPatch(key); const P = S.exp.patch, lay = m.curLay(); S.known = [0, ...S.known.filter(k => k !== 0)];
    const live2 = m.curLive(), c2 = live2.cr.find(x => x.id === q.id); S.exp.storm = null; live2.strike = null;
    const spot = [[3, 0, "left"], [-3, 0, "right"], [0, 3, "up"], [0, -3, "down"]].find(([dx, dy]) => m.passable(c2.x + dx, c2.y + dy)); if (!spot) continue;
    P.x = c2.x + spot[0]; P.y = c2.y + spot[1]; P.dir = spot[2]; m.lightningLift(key, c2.x, c2.y, 7);
    if (name) { S.named = { [c2.id]: name }; S.metIds = [String(c2.id)]; c2.ind.name = name; }
    m.advance("patch", { noise: "creep", moved: true }); return { key, id: c2.id }; }
  return null; }, { seed, name });
for (const [w, h] of [[390, 844], [522, 935]]) {
  const tag = w + "x" + h;
  // F1: no Loika met: the map and a place
  let page = await open(w, h); await setup(page);
  await page.evaluate(() => { const m = window.__mb; m.S.phase = "map"; }); await shot(page, `f1-find-map-${tag}`);
  await page.context().close();
  // the longest name at 390 (the realm's longest), her ways 1 of 3, and the teaching line beside her
  page = await open(w, h); await setup(page);
  const longest = await page.evaluate(() => { const m = window.__mb; return m.longestLoikaName ? m.longestLoikaName() : null; });
  const nm = longest || "Juniper";
  const at = await toLoika(page, nm); log["loika-" + tag] = JSON.stringify(at);
  await page.evaluate(() => { const m = window.__mb, S = m.S, id = Object.keys(S.named)[0]; S.habits = { [id]: { shake: { ranges: { far: 1 }, got: {}, best: "far" } } }; m.advance("patch", { noise: "creep", moved: true }); });
  await page.waitForTimeout(6000); await shot(page, `f2-ways-place-teach-${tag}`);
  await page.evaluate(() => { window.__mb.S.phase = "map"; }); await shot(page, `f2-ways-map-${tag}`);
  // F1c: her own pod
  await page.evaluate(() => { const m = window.__mb, S = m.S, P = S.exp.patch, id = Object.keys(S.named)[0]; S.phase = "patch"; S.pods.push({ id: "o1", k: P.key, x: P.x + 1, y: P.y, sp: 0, h: 0, how: "own", of: S.named[id], own: id, out: 1, g: "meadow", gs: 1 }); });
  await shot(page, `f1c-pod-place-${tag}`);
  await page.evaluate(() => { window.__mb.S.phase = "map"; }); await shot(page, `f1c-pod-map-${tag}`);
  // F2: a pod in the cargo
  await page.evaluate(() => { const m = window.__mb, S = m.S; S.pods = []; S.exp.cargo.pods.push({ id: 9, sp: 0, g: "meadow" }); }); await shot(page, `f2-home-map-${tag}`);
  await page.context().close();
}
console.log(JSON.stringify(log));
await browser.close(); server.close();
