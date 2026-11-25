// first-walk-teach-approach-1 stills at 390x844 and 522x935: where (a place with none), her place before she comes, near, heard.
//   node prototypes/exploration/tools/teach-approach-stills.mjs --seed 7 --out DIR
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
const seed = +arg("seed", 7), out = path.resolve(arg("out", "teach-stills")); mkdirSync(out, { recursive: true });
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
const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, name + ".png") }); log[name] = await page.evaluate(() => window.__mb.FX.msg); };
const setup = (page) => page.evaluate((seed) => { const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]); }, seed).then(() => page.waitForFunction(() => window.__mb.PL.ready, null, { timeout: 60000 })).then(() => page.waitForTimeout(3000));
// into the first place of the realm that has a named Loika, the player `dist` tiles from her; mode: 'near' | 'heard' | 'hidden'
const toLoika = (page, mode, dist = 4) => page.evaluate(({ mode, dist }) => {
  const m = window.__mb, S = m.S;
  for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))].filter(c => S.exp.reach.map(Number).includes(+c))) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    const q = live.cr.find(x => x.sp === 0 && x.ind && x.ind.hs); window.__d = (window.__d || []).concat([[key, !!q, live.cr.length]]); if (!q) { delete S.exp.live[key]; continue; }
    S.exp.pos = key; m.enterPatch(key); const P = S.exp.patch; S.known = [0, ...S.known.filter(k => k !== 0)];
    const live2 = m.curLive(), c2 = live2.cr.find(x => x.id === q.id); S.exp.storm = null; live2.strike = null;
    const spot = [dist, dist - 1, dist + 1, dist - 2].filter(d => d > 0).flatMap(d => [[d, 0, "left"], [-d, 0, "right"], [0, d, "up"], [0, -d, "down"]]).find(([dx, dy]) => { const lay = m.curLay(), X = c2.x + dx, Y = c2.y + dy; return X >= 0 && Y >= 0 && X < lay.w && Y < lay.h && !m.T_BLOCK[lay.tiles[Y * lay.w + X]]; }); if (!spot) continue;
    P.x = c2.x + spot[0]; P.y = c2.y + spot[1]; P.dir = spot[2]; m.unveil(key, c2.x, c2.y, 7);
    if (mode === "heard") c2.ease = 1;
    if (mode === "hidden") for (const x of live2.cr) if (x.ind) x.hide = 6;
    m.advance("patch", { noise: "creep", moved: false }); return { key, id: c2.id }; }
  return { dbg: [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))].filter(c => S.exp.reach.map(Number).includes(+c)).length, reach: S.exp.reach.length, pos: S.exp.pos, d: window.__d }; }, { mode, dist });
for (const [w, h] of [[390, 844], [522, 935]]) {
  const tag = w + "x" + h;
  for (const [mode, d] of [["near", 6], ["tell", 4], ["heard", 4], ["tuftNear", 2], ["tuftFar", 6]]) { const page = await open(w, h); await setup(page); log[mode + tag] = JSON.stringify(await toLoika(page, mode, d)); if (mode.startsWith("tuft") && !log[mode + tag].includes("key")) log["NULL-" + mode + tag] = 1; if (mode.startsWith("tuft") && log[mode + tag].includes("key")) { log["label-" + mode + tag] = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, f = m.frontOf(P); m.curLive().tf.push({ id: 990, x: f.x, y: f.y }); return m.patchAction().label; }); } await shot(page, `${mode}-${tag}`); await page.context().close(); }
  // a place with no named Loika: the first set-out place that holds none (the flag's own place first)
  { const page = await open(w, h); await setup(page);
    const at = await page.evaluate(() => { const m = window.__mb, S = m.S, named = new Set(S.cr.filter(q => q.sp === 0 && !q.cv).map(q => q.c));
      for (const c of S.exp.reach) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER || !m.passable(+c)) continue; const key = String(c); if (named.has(+c)) continue; S.exp.pos = key; m.enterPatch(key); m.advance("patch", { noise: "creep", moved: false }); return key; } return null; });
    log["where" + tag] = at; await shot(page, `where-${tag}`); await page.context().close(); }
  { const page = await open(w, h); await setup(page); log["here" + tag] = JSON.stringify(await toLoika(page, "hidden")); console.log("HID", log["here" + tag]); await page.evaluate(() => { const m = window.__mb; for (const x of m.curLive().cr) if (x.ind) x.x = -50; }); await shot(page, `herePlace-${tag}`); await page.context().close(); }
}
console.log(JSON.stringify(log, null, 1));
await browser.close(); server.close();
