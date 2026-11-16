// rupar-banks-7-2: one place's cold window time on quickjs-ng with the banks (this tree's levels.mjs) beside the same window on a base tree's levels.mjs (land-reach-2), median of N runs, digests compared.
// land-time-places.mjs dumps only the window's 7 x 7 cells of field; the bank verdict floods further, so here a Node run of the window first, and every field cell it read is dumped.
//   node bank-qjs-time.mjs <outdir> <base levels.mjs> <runs> <seed:X:Y> ...
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, findWayup } from '../src/gen7/levels.mjs';
const [out, baseLevels, runsS, ...cells] = process.argv.slice(2), runs = +runsS, here = new URL('..', import.meta.url).pathname, QJS = '/home/mb/mb/hw-tools/quickjs-ng/bin/qjs';
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const patch = (t) => t.replaceAll("'../../../core/base/", "'../core/base/").replace("from './world.mjs'", "from './worldstub.mjs'").replace("from '../world.mjs'", "from './worldstub.mjs'");
const RUN = `const inQjs = typeof globalThis.scriptArgs !== 'undefined';
let text;
if (inQjs) { const std = await import('qjs:std'); text = std.loadFile(globalThis.scriptArgs[1]); }
else { const fs = await import('node:fs'); text = fs.readFileSync(new URL('data.json', import.meta.url), 'utf8'); }
const D = JSON.parse(text), { levelsOf, windowLevels } = await import('./gen7/levels.mjs');
const realm = { seed: D.seed, e0: new Float32Array(8000), ford: Uint8Array.from(D.ford), land: new Uint8Array(8000), M: new Float32Array(8000), stairs: D.stairs };
const L = levelsOf(realm);
for (const k of Object.keys(D.q)) L.q.set(+k, Int32Array.from(D.q[k]));
for (const k of Object.keys(D.wet)) L.wet.set(+k, Uint8Array.from(D.wet[k]));
const t0 = Date.now(), w = windowLevels(L, D.X, D.Y), t1 = Date.now();
let h = 2166136261; for (let i = 0; i < w.R.length; i++) { h ^= w.R[i]; h = Math.imul(h, 16777619) >>> 0; }
console.log(JSON.stringify({ engine: inQjs ? 'qjs' : 'node', ms: t1 - t0, digest: h, tiles: w.R.length, sites: w.info.sites.length }));
`;
const rows = [];
for (const c of cells) {
  const [seed, X, Y] = c.split(':').map(Number), dn = `${out}/n-${seed}-${X}-${Y}`, db = `${out}/b-${seed}-${X}-${Y}`;
  for (const d of [dn, db]) for (const s of ['core/base', 'gen7']) mkdirSync(`${d}/${s}`, { recursive: true });
  for (const d of [dn, db]) {
    for (const f of ['noise.mjs', 'whole.mjs']) copyFileSync(`${here}../core/base/${f}`, `${d}/core/base/${f}`);
    copyFileSync(`${here}src/gen7/land-rule.json`, `${d}/gen7/land-rule.json`);
    writeFileSync(`${d}/gen7/worldstub.mjs`, "export const RW = 80, RH = 100, CW = 24, CH = 28, L = { MEADOW: 0, POND: 1, ROCK: 2, WOOD: 3, WATER: 4, CLIFF: 5 };\nexport const fieldsAt = () => { throw new Error('no world'); }, noiseField = () => { throw new Error('no world'); };\n");
    writeFileSync(`${d}/run.mjs`, RUN);
  }
  writeFileSync(`${dn}/gen7/levels.mjs`, patch(readFileSync(`${here}src/gen7/levels.mjs`, 'utf8')));
  writeFileSync(`${db}/gen7/levels.mjs`, patch(readFileSync(baseLevels, 'utf8')));
  const R = realm7(seed).realm, L = levelsOf(R);
  for (const s of L.stairs.values()) findWayup(L, s.X, s.Y, s.port);
  windowLevels(L, X, Y);   // reads every field cell the window and the bank verdict need
  const q = {}, wet = {};
  for (const [k, v] of L.q) q[k] = Array.from(v);
  for (const [k, v] of L.wet) wet[k] = Array.from(v);
  const data = JSON.stringify({ seed, X, Y, q, wet, ford: Array.from(R.ford), stairs: [...L.stairs.values()].map((s) => ({ X: s.X, Y: s.Y, port: s.port, lip: s.lip, x0: s.x0, ok: s.ok })) });
  writeFileSync(`${dn}/data.json`, data); writeFileSync(`${db}/data.json`, data);
  const run = (d) => { const t = [], dg = []; for (let i = 0; i < runs; i++) { const o = JSON.parse(execFileSync(QJS, ['--std', `${d}/run.mjs`, `${d}/data.json`], { encoding: 'utf8' })); t.push(o.ms); dg.push(o.digest); } return { ms: median(t), digest: dg[0] }; };
  const b = run(db), n = run(dn);
  rows.push({ cell: c, cells: Object.keys(q).length, baseMs: b.ms, bankMs: n.ms, sameTiles: b.digest === n.digest });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
