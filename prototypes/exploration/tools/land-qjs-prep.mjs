// land-b3c: sets up a directory the small engine (qjs) can run the land rule from, with no bundler: copies of levels.mjs, base/noise.mjs, base/whole.mjs and land-rule.json, the world module
// replaced by a stub (the rule only reads its sizes), and one window's inputs (the field q of its 25 cells, their wet flags, the realm's fords and stairs) dumped from Node.
//   node land-qjs-prep.mjs <outdir> <seed> <cellX> <cellY>
// then:  qjs --std <outdir>/run.mjs   and   node <outdir>/run.mjs     (same file; the digests must match)
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, qCell, wetCell, findWayup, CW, CH } from '../src/gen7/levels.mjs';
const [out, seedS, XS, YS] = process.argv.slice(2), seed = +seedS, X = +XS, Y = +YS, here = new URL('..', import.meta.url).pathname;
for (const d of ['core/base', 'gen7']) mkdirSync(`${out}/${d}`, { recursive: true });
for (const f of ['noise.mjs', 'whole.mjs']) copyFileSync(`${here}../core/base/${f}`, `${out}/core/base/${f}`);
copyFileSync(`${here}src/gen7/land-rule.json`, `${out}/gen7/land-rule.json`);
writeFileSync(`${out}/gen7/levels.mjs`, readFileSync(`${here}src/gen7/levels.mjs`, 'utf8').replaceAll("'../../../core/base/", "'../core/base/").replace("from './world.mjs'", "from './worldstub.mjs'").replace("from '../world.mjs'", "from './worldstub.mjs'"));
writeFileSync(`${out}/gen7/worldstub.mjs`, "export const RW = 80, RH = 100, CW = 24, CH = 28, L = { MEADOW: 0, POND: 1, ROCK: 2, WOOD: 3, WATER: 4, CLIFF: 5 };\nexport const fieldsAt = () => { throw new Error('no world'); }, noiseField = () => { throw new Error('no world'); };\n");
const R = realm7(seed).realm, L = levelsOf(R), q = {}, wet = {};
for (const s of L.stairs.values()) findWayup(L, s.X, s.Y, s.port);   // fixes every site (lip, first column) before the dump
for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const key = (X + i + 8) * 1000 + (Y + j + 8); q[key] = Array.from(qCell(L, X + i, Y + j)); wet[key] = Array.from(wetCell(L, X + i, Y + j)); }
writeFileSync(`${out}/data.json`, JSON.stringify({ seed, X, Y, q, wet, ford: Array.from(R.ford), stairs: [...L.stairs.values()].map(s => ({ X: s.X, Y: s.Y, port: s.port, lip: s.lip, x0: s.x0, ok: s.ok })) }));
writeFileSync(`${out}/run.mjs`, `const inQjs = typeof globalThis.scriptArgs !== 'undefined';
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
`);
console.log('ok', out);
