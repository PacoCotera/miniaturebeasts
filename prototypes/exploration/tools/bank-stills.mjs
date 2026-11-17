// rupar-banks-7-2: the earth bank dug, played through the real page (index.html from the source tree, in a browser) at phone size 390 x 844.
// A save with a grown Rupar leading, generator 7, seed 35, the bank at tile 1042,1233 (cell 75, lip row 1, columns 12 and 13). Three moments, each by day and in the storm's dark light:
//   a the bank before the dig, the pawn refused   b the Rupar digging (the dig's words)   c after the dig, the pawn on the land above
// Writes a-before / b-digging / c-above, day and dark, as the phone screenshot (page, 390 x 844) and the game's own 450 x 600 screen at 1x (capture), plus play.json (the words and the steps).
//   PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node bank-stills.mjs <tree> <outDir>
// The browser loads the tree unbundled; the node modules the bake chain names are stood in for by bank-shims.mjs (the server rewrites the imports). Nothing here is part of the game.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { SHIM_NAMES, shimSource, rewrite } from "./bank-shims.mjs";

const [TREE, OUT] = process.argv.slice(2), root = path.resolve(TREE), out = path.resolve(OUT);
const require = createRequire(import.meta.url);
const { chromium } = require("/home/mb/pw156/node_modules/playwright");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".mbtiles": "application/octet-stream", ".mbplace": "application/octet-stream" };
mkdirSync(out, { recursive: true });
const sha = (buf) => createHash("sha256").update(buf).digest("hex"), served = new Map();
const SET_DIR = path.join(root, "art/places/sets/ninja-test");
const git = (...a) => { try { return execFileSync("git", ["-C", root, ...a], { encoding: "utf8" }).trim(); } catch { return null; } };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]), sm = u.match(/^\/__shim\/(\w+)\.mjs$/);
  if (sm && SHIM_NAMES.includes(sm[1])) { res.writeHead(200, { "content-type": "text/javascript" }); res.end(shimSource(sm[1], root)); return; }
  let p = path.join(root, u);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  const body = readFileSync(p);
  if (/\.(png|webp|jpe?g|gif|svg)$/i.test(p)) served.set(path.relative(root, p), sha(body));   // the server's own log of the images it handed out (as tools/art/pageshot.mjs does): the sidecar's loadedShas
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(p.endsWith(".mjs") ? rewrite(body.toString("utf8")) : body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
const page = await ctx.newPage(), errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => window.__mb && window.__mb.PL && window.__mb.PL.ready, null, { timeout: 120000 });
const settle = (ms = 900) => page.waitForTimeout(ms);
const log = { steps: [] };
// wayup-place-1: a sidecar beside each 1x still, made by this tool and never by hand (sign.py reads it): the picture's sha256, the light (day | dark; sign.py's name for the storm's dark light is "storm", recorded as `light`),
// walking zoom 48 at scale 1, the tool, the tree (path, commit, dirty), the save, the moment (a-before, b-dug...), `files` = the set pieces on the view's place (its decals, props and canopy kinds that are files of the set, slot and sha256), and
// loadedShas = the sha256 of every image the page loaded, from this server's own log of what it handed out (`loaded` lists them with their paths).
let curMode = "day";
const SAVE = { name: "rupar-banks-7-2", generator: 7, seed: 35, cell: 75, lead: "grown Rupar (species 7, born turn 0)", turn: 5, tier: 2, range: 4, start: "weather expedition at spawn 0", pawn: [12, 5, "up"] };
const sidecar = async (name, still) => {
  const kinds = await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key), v = m.PL.views.get(lay.baked.id); if (!v) return []; const s = v.ts.sprites, ks = new Set(); for (const g of [v.place.decals, v.place.props, v.place.canopy]) for (const d of g || []) if (s[d.kind]) ks.add(s[d.kind].kind); return [...ks].sort(); });
  const files = [];
  for (const k of kinds) { const f = path.join(SET_DIR, k + ".png"); if (existsSync(f)) files.push({ slot: "ninja-test/" + k + ".png", sha256: sha(readFileSync(f)) }); }
  const loaded = [...served].map(([p, s]) => ({ path: p, sha256: s })).sort((a, b) => a.path.localeCompare(b.path));
  const sc = { still: name + "-1x.png", stillSha256: sha(still), madeAt: new Date().toISOString(), tool: "prototypes/exploration/tools/bank-stills.mjs",
    tree: { path: root, head: git("rev-parse", "HEAD"), branch: git("rev-parse", "--abbrev-ref", "HEAD"), dirty: (git("status", "--short", "-uno") || "") !== "" },
    light: curMode === "dark" ? "storm" : "day", lightName: curMode, zoom: 48, scale: 1, size: [450, 600], save: SAVE, moment: name.replace(/-(day|dark)$/, ""),
    files, loaded, loadedShas: [...new Set(loaded.map((x) => x.sha256))].sort() };
  writeFileSync(path.join(out, name + "-1x.json"), JSON.stringify(sc, null, 1));
};
const shot = async (name) => {
  await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
  await settle(400);
  writeFileSync(path.join(out, name + "-phone.png"), await page.screenshot());
  const d = await page.evaluate(() => window.__mb.capture()), still = Buffer.from(d.split(",")[1], "base64"); writeFileSync(path.join(out, name + "-1x.png"), still);
  await sidecar(name, still);
  const st = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; return { x: P.x, y: P.y, dir: P.dir, msg: m.msg, log: m.S.log.slice(-2) }; });
  log.steps.push({ name, ...st }); console.log(name, JSON.stringify(st));
};

// the save: a grown Rupar (species 7, born turn 0, turn 5) bonded and leading, tier 2, seed 35 in generator 7; the expedition's start is cell 75, the place with the bank
await page.evaluate(() => {
  const m = window.__mb;
  m.newWorld(35); m.TEST.calm = true; m.S.turn = 5; m.S.tier = 2; m.S.known = [0, 1, 2];
  m.S.mibis = [{ id: 1, name: "Fig", sp: 7, born: 0, outings: 0, notches: 0, bonded: true, care: 0, tends: 0, tendDay: null, grownTurn: 3 }]; m.S.carried = [1]; m.S.lead = 1;
  m.startExpedition("weather", m.G.spawns[0]); m.S.exp.start = 75; m.S.exp.pos = 75; m.S.exp.range = 4; m.enterPatch();
});
await settle(2500);
const info = await page.evaluate(() => { const m = window.__mb, lay = m.layout(m.S.exp.patch.key); return { gen: m.G.gen ?? null, banks: lay.banks, w: lay.w, h: lay.h, partner: !!m.partnerMibi() }; });
console.log("place", JSON.stringify(info)); log.place = info;
const place = (x, y, dir) => page.evaluate(([x, y, dir]) => { const m = window.__mb, P = m.S.exp.patch, lay = m.layout(P.key); m.S.veil[P.key] = new Array(lay.h).fill(0x0fffffff); P.x = x; P.y = y; P.dir = dir; m.walkLift(); }, [x, y, dir]);
// light: "day" is the clear light; "dark" puts the expedition's storm over the cell's column (the game's own dark light: overcast and rain)
const light = (mode) => page.evaluate((mode) => { const m = window.__mb, col = m.S.exp.pos % m.MW; m.S.exp.storm = mode === "dark" ? { x: col - 2, w: 3, dir: 1, t: 0 } : null; }, mode);

for (const mode of (process.argv[4] || "day").split(",")) {   // one light per process: a dug bank stays dug for the walk, so a second light in the same page would start dug
  curMode = mode; await light(mode); await place(12, 5, "up"); await settle(1800);
  await shot(`a-before-${mode}`);
  // the pawn walks up into the face: refused
  const before = await page.evaluate(() => { window.__mb.patchStep("up", "walk"); return window.__mb.S.exp.patch.y; }); await settle(500);
  log.steps.push({ name: `a-refused-${mode}`, y: before, action: await page.evaluate(() => window.__mb.patchAction()?.label ?? null) });
  await shot(`a-refused-${mode}`);
  // the Rupar digs (the page's own action on the pawn's front tile)
  await page.evaluate(() => window.__mb.act("confirm")); await settle(350); await shot(`b-digging-${mode}`);
  await settle(1500); await shot(`b-dug-${mode}`);
  // up the dug way and onto the land above
  for (let k = 0; k < 5; k++) { await page.evaluate(() => window.__mb.patchStep("up", "walk")); await settle(250); }
  await settle(1200); await shot(`c-above-${mode}`);
}
log.dug = await page.evaluate(() => window.__mb.S.exp.dug); log.errors = errors;
writeFileSync(path.join(out, "play.json"), JSON.stringify(log, null, 1));
console.log("errors", errors.length, errors.slice(0, 3));
await browser.close(); server.close();
