// A late Loika beds down at her bed in the last 20 light of dusk. Played on the real page at 412x915 (touch, dpr 2.625):
// the case is arranged (a seed with a late Loika, the explorer in sight of her bed, the clock at light 525), then the explorer only presses the on-screen d-pad,
// and the verdict is read before light 552: she is curled at her bed and a sleep note is offered.
//   PW_DIR=<dir with node_modules/playwright> node prototypes/exploration/tests/played/sleep-dusk.mjs [seed ...]
import { createServer } from "node:http";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const repo = path.resolve(import.meta.dirname, "../../../..");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm" };

function assemble() {
  const site = mkdtempSync(path.join(process.env.TMPDIR || tmpdir(), "mb-sleepdusk-site-"));
  process.on("exit", () => rmSync(site, { recursive: true, force: true }));
  cpSync(path.join(repo, "website"), site, { recursive: true, dereference: true });
  mkdirSync(path.join(site, "play"), { recursive: true });
  for (const n of readdirSync(path.join(repo, "prototypes"))) {
    const p = path.join(repo, "prototypes", n);
    if (!statSync(p).isDirectory() || n === "node_modules") continue;
    cpSync(p, path.join(site, "play", n), { recursive: true, dereference: true, filter: (s) => !/[\\/]node_modules([\\/]|$)|catalogue-out/.test(s) && !/tests[\\/]played/.test(s) });
  }
  const art = (rel, files) => { mkdirSync(path.join(site, rel), { recursive: true }); for (const f of files) cpSync(path.join(repo, rel, f), path.join(site, rel, f), { recursive: true }); };
  art("art/companion-48/terrain", ["meadow"]);
  art("art/companion-48/care", ["c-heart-24.png", "c-heart-16.png"]);
  art("art/day-dial/frames", readdirSync(path.join(repo, "art/day-dial/frames")).filter((f) => /^day-.*\.png$/.test(f)));
  const r = spawnSync("sh", [path.join(repo, "ops/sandbox/bundle-pages.sh"), site], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("bundle-pages failed: " + r.stderr + r.stdout);
  return site;
}
const site = assemble();
const server = createServer((req, res) => {
  let p = path.join(site, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/play/`;

const ready = () => { try { return !!window.__play.frames.companion.contentWindow.__mb.S; } catch { return false; } };
const { makePage } = await import(path.join(import.meta.dirname, "../page-harness.mjs"));

// the arranged case, as a save: a seed with a late Loika in a mounted place, the explorer 3 tiles from her bed stand, the clock at light 525
function arrange(seed) {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
  const pick = JSON.parse(p.run(`(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), live = ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind && q.ind.doings.late >= .5 && q.ind.hs && q.ind.hs.bed) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`));
  if (!pick) return null;
  const set = p.run(`(() => { const pk = ${JSON.stringify(pick)}; S.exp.pos = pk.key; enterPatch(pk.key);
    const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === pk.id), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 525; live.strike = null; S.exp.stray = null;
    const bed = hauntStand(c.ind.hs.bed, hauntFree(lay, pk.key, c)); if (!bed) return 'nobed';
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 0], [-2, 0]]) { const x = bed.x + dx, y = bed.y + dy; if (x > 0 && y > 0 && x < lay.w - 1 && y < lay.h - 1 && hauntFree(lay, pk.key, null)(x, y)) { P.x = x; P.y = y; P.dir = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down'; unveil(pk.key, bed.x, bed.y, 6); save(); return JSON.stringify({ toward: P.dir, away: dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up' }); } }
    return 'noroom'; })()`);
  if (!set.startsWith("{")) return null;
  return { pick, dirs: JSON.parse(set), raw: p.store[p.KEY] };
}

const browser = await chromium.launch();
const seeds = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [7, 42, 21];
let fails = 0, played = 0;
for (const seed of seeds) {
  const a = arrange(seed);
  if (!a) { console.log(`seed ${seed}: no late Loika with room by her bed (skipped)`); continue; }
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const p1 = await ctx.newPage();
  await p1.goto(url); await p1.waitForFunction(ready, null, { timeout: 60000 }); await wait(2000);
  const id = await p1.evaluate(() => JSON.parse(localStorage.getItem("mb-companion-A")).id);
  await p1.close();
  await ctx.addInitScript(([i, s]) => { localStorage.setItem("mb-save-v8@" + i, s); }, [id, a.raw]);
  const page = await ctx.newPage();
  await page.goto(url); await page.waitForFunction(ready, null, { timeout: 60000 }); await wait(6000);
  await page.getByRole("tab", { name: "Companion" }).click();
  await page.waitForFunction(() => window.__play.owner === "companion", null, { timeout: 10000 });
  await wait(2000);
  const fr = () => page.frame({ url: /\/exploration\// });
  const press = async (l) => { const b = await page.locator("button.cpad." + l + ":visible").first().boundingBox({ timeout: 5000 }); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await wait(450); };
  const probe = () => fr().evaluate(`(() => { const m = window.__mb, S = m.S, pk = ${JSON.stringify(a.pick)}, c = m.curLive() && m.curLive().cr.find(q => q.id === pk.id); if (!c) return JSON.stringify({ gone: 1, phase: S.phase, spent: S.day && S.day.spent });
    return JSON.stringify({ spent: S.day.spent, part: m.dayPart(), curled: !!m.curledNow(c), atBed: !!m.atBedNow(c), hb: c.hb ? c.hb.k : null, gone: !!c.gone, label: m.patchAction().label, noteWord: m.WORDS.habit.note }); })()`).then(JSON.parse);
  let r = await probe(), dir = a.dirs.away;
  if (r.gone) { console.log(`seed ${seed}: case not reached ${JSON.stringify(r)}`); fails++; await ctx.close(); continue; }
  const r0 = r;
  for (let i = 0; i < 40 && r.spent < 549; i++) { await press(dir); dir = dir === a.dirs.away ? a.dirs.toward : a.dirs.away; r = await probe(); if (r.gone) break; }
  if (dir === a.dirs.toward) { await press(a.dirs.toward); r = await probe(); }   // the last step is toward her: she is in front of the explorer
  played++;
  const ok = !r.gone && r.spent < 552 && r.curled && r.label === r.noteWord;
  if (!ok) fails++;
  console.log(`seed ${seed}: ${ok ? "PASS" : "FAIL"} start ${r0.spent} ${r0.part} curled ${r0.curled}; now ${JSON.stringify(r)}`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`played ${played}, failed ${fails}`);
process.exit(fails || !played ? 1 : 0);
