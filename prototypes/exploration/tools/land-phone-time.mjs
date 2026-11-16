// land-time-1: a cold and a warm place build in Chromium at a 4x CPU throttle (the stand-in for a phone): the realm is made first (not timed), then the cell's levels (its 5 x 5 window of fields and every pass of the land rule)
// are made cold, then the neighbours (20 of the 25 fields cached) warm. Runs the exploration code of the tree named as it is, in the page.
//   PW_DIR=<folder holding node_modules/playwright> node land-phone-time.mjs <exploration dir> <seed> <X> <Y> [cpu=4] [runs=5]
// <exploration dir> is a tree's prototypes/exploration (its node_modules, or the one named by NM, serve the two bare imports).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, 'node_modules/playwright') : 'playwright');
const [dir, seedS, XS, YS, cpuS = '4', runsS = '5'] = process.argv.slice(2), seed = +seedS, X = +XS, Y = +YS, cpu = +cpuS, runs = +runsS;
const nm = process.env.NM || path.join(path.dirname(new URL(import.meta.url).pathname), '../node_modules');
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
const html = `<!doctype html><script type="importmap">{"imports":{"flatqueue":"/nm/flatqueue/index.js","fastnoise-lite":"/nm/fastnoise-lite/FastNoiseLite.js"}}</script><script type="module">
import { realm7 } from '/ex/src/gen7/region.mjs';
import { levelsOf, levelCell, windowLevels } from '/ex/src/gen7/levels.mjs';
window.__run = (seed, X, Y, n) => {
  const realm = realm7(seed).realm, out = { cold: [], warm: [] }, L = levelsOf(realm);
  for (let k = 0; k < n; k++) {   // cells 6 apart down the map share no field: each cold one is cold; its east neighbour is warm (20 of its 25 fields made)
    const cy = Y + k * 6, t0 = performance.now(); levelCell(L, X, cy); out.cold.push(performance.now() - t0);
    const t1 = performance.now(); levelCell(L, X + 1, cy); out.warm.push(performance.now() - t1);
  }
  return out;
};
window.__ready = true;
</script>`;
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); return; }
  const p = u.startsWith('/nm/') ? path.join(nm, u.slice(4)) : u.startsWith('/ex/') ? path.join(dir, u.slice(4)) : path.join(dir, '..', u);   // the other trees of prototypes (core, workbench, play) beside it
  if (!p || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(), ctx = await browser.newContext(), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page), errs = [];
page.on('pageerror', e => errs.push(e.message)); page.on('response', r => { if (r.status() >= 400) errs.push('http ' + r.status() + ' ' + r.url()); });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
try { await page.waitForFunction(() => window.__ready, null, { timeout: 30000 }); } catch { console.log('page did not come up', errs.join(' | ')); process.exit(1); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
const r = await page.evaluate(([s, x, y, n]) => window.__run(s, x, y, n), [seed, X, Y, runs]);
const med = a => a.slice().sort((p, q) => p - q)[a.length >> 1];
console.log(JSON.stringify({ dir, seed, cell: [X, Y], cpu, runs, coldMsMedian: Math.round(med(r.cold)), warmMsMedian: Math.round(med(r.warm)), cold: r.cold.map(Math.round), warm: r.warm.map(Math.round), errors: errs }));
await browser.close(); server.close();
