// Greybox stills of what a place holds, at walking zoom (450 x 600, the game's own place view): for each seed, four places of the home region, the pawn standing a few tiles in front of the place's heart.
// With --overlay each set piece's cells are drawn over the still as labelled flat blocks (a schematic for the designer; internal tool argument only, never a player option).
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node tools/place-greybox-stills.mjs --root <tree root> --out DIR [--overlay] [--cells cells.json] [--seeds 7,13,42]
// Without --cells it picks the places itself (needs this tree's planOf) and writes DIR/cells.json; the "before" run (an origin/main tree) reads the same cells.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, 'node_modules/playwright') : 'playwright');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const root = path.resolve(arg('root', '.')), out = path.resolve(arg('out', 'place-stills')), overlay = process.argv.includes('--overlay'), seeds = arg('seeds', '7,13,42').split(',').map(Number), cellsFile = arg('cells', '');
mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mbtiles': 'application/octet-stream', '.mbplace': 'application/octet-stream' };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html`;
const browser = await chromium.launch(), errors = [];
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url); await page.waitForFunction(() => window.__mb && window.__mb.PL && window.__mb.PL.ready, null, { timeout: 180000 });
  return page;
}
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const choice = cellsFile ? JSON.parse(readFileSync(cellsFile, 'utf8')) : {};
const page = await open();
for (const seed of seeds) {
  await page.evaluate((s) => { const m = window.__mb; m.newWorld(s); m.TEST.calm = true; m.startExpedition('weather', m.G.spawns[0]); m.enterPatch(); }, seed);
  await settle(page, 1500);
  const home = await page.evaluate(() => { const m = window.__mb; return { slot: m.G.slot, MW: m.MW, MH: m.MH }; });
  if (!choice[seed]) {   // pick four places of the home region: one with an overhang, one with the Split Stone's ground, then places with a heart and a smaller spot, of different lands
    const { planOf } = await import(path.join(root, 'prototypes/exploration/src/gen7/places.mjs'));
    const cand = [];
    for (let cy = 0; cy < home.MH; cy++) for (let cx = 0; cx < home.MW; cx++) {
      const X = home.slot[0] * home.MW + cx, Y = home.slot[1] * home.MH + cy, p = planOf(seed, X, Y); if (!p || !p.spots.length) continue;
      cand.push({ c: cy * home.MW + cx, X, Y, land: p.land, kinds: p.spots.map((s) => s.kind), heart: p.spots.find((s) => s.role === 'heart'), focus: p.spots.find((s) => s.kind === 'overhang') || p.spots.find((s) => s.role === 'heart') });
    }
    const picked = [], take = (f) => { const x = cand.find((q) => !picked.includes(q) && f(q)); if (x) picked.push(x); };
    take((q) => q.kinds.includes('overhang') && q.heart); take((q) => q.kinds.includes('split-stone-ground'));
    for (const land of ['meadow', 'wood', 'rock', 'pond']) { if (picked.length >= 4) break; take((q) => q.land === land && q.heart && q.kinds.length > 1); }
    while (picked.length < 4 && cand.length > picked.length) take((q) => q.heart);
    choice[seed] = picked.map((q) => ({ c: q.c, X: q.X, Y: q.Y, land: q.land, kinds: q.kinds, heart: q.focus && { x: q.focus.x, y: q.focus.y, w: q.focus.w, h: q.focus.h, id: q.focus.id } }));   // `heart`: the spot the pawn faces (the overhang where there is one, else the heart)
  }
  let n = 0;
  for (const q of choice[seed]) {
    n++;
    await page.evaluate((o) => {
      const m = window.__mb; if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = o.c; m.S.exp.start = o.c; m.enterPatch();
      const P = m.S.exp.patch, lay = m.layout(P.key); m.S.veil[P.key] = new Array(lay.h).fill(0x0fffffff);
      // the pawn: the reachable tile nearest to three tiles below the heart's middle (else the place's middle), so the heart fills the upper half of the view
      const hx = o.heart ? o.heart.x + (o.heart.w >> 1) - 1 : 12, hy = o.heart ? o.heart.y + (o.heart.h >> 1) + 3 - 1 : 14;
      let best = null, bd = 1e9; for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) { if (!lay.reach[y * lay.w + x]) continue; const d = Math.abs(x - hx) + Math.abs(y - hy); if (d < bd) { bd = d; best = { x, y }; } }
      if (best) { P.x = best.x; P.y = best.y; P.dir = 'up'; } m.walkLift(); if (m.RT.view) m.endView();
    }, q);
    await settle(page, 1400);
    const data = await page.evaluate(async (ov) => {
      const m = window.__mb; let d = m.capture(); if (!ov) return d;
      const P = m.S.exp.patch, lay = m.layout(P.key), RT = m.RT, pl = RT.gridScr, ts = RT.ts;
      const img = new Image(); img.src = d; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const COL = { R: '#7a5a3a', r: '#7a5a3a', S: '#444a66', L: '#b0306a', O: '#5a3a1a', h: '#4a86c8', p: '#8a3fb0', m: '#2f9d5a', k: '#3a6fd0', c: '#3a6fd0', x: '#111111' }, NAME = { R: 'wall', S: 'slab', L: 'stone', O: 'roof', h: 'shelter', p: 'pod', m: 'find', k: 'stone', c: 'stone?', x: 'bare' };
      g.font = '9px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const s of lay.stamps || []) {
        g.strokeStyle = '#e0407a'; g.lineWidth = 2; g.strokeRect(pl.x + (s.x - 1) * ts, pl.y + (s.y - 1) * ts, s.w * ts, s.h * ts);
        for (const [cx, cy, k] of s.cells) { const x = pl.x + (cx - 1) * ts, y = pl.y + (cy - 1) * ts; g.globalAlpha = 0.55; g.fillStyle = COL[k] || '#888'; g.fillRect(x + 2, y + 2, ts - 4, ts - 4); g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(NAME[k] || k, x + ts / 2, y + ts / 2); }
        g.fillStyle = '#e0407a'; g.textAlign = 'left'; g.fillText(s.id + (s.role === 'heart' ? ' (heart)' : ''), pl.x + (s.x - 1) * ts + 2, pl.y + (s.y - 1) * ts - 6); g.textAlign = 'center';
      }
      return cv.toDataURL('image/png');
    }, overlay);
    const f = `${seed}-${n}-${q.land}-c${q.c}${overlay ? '-blocks' : ''}.png`;
    writeFileSync(path.join(out, f), Buffer.from(data.split(',')[1], 'base64')); console.log(f, q.kinds.join('+'));
  }
}
writeFileSync(path.join(out, 'cells.json'), JSON.stringify(choice, null, 1) + '\n');
console.log('errors', JSON.stringify(errors));
await browser.close(); server.close();
