// rupar-banks-slice-2: cold times on quickjs-ng, median of N runs (the field cells dumped from a Node run, as land-merge-time.mjs does).
//   window: one place's window with this tree's levels.mjs, the region lists of the regions it touches made ALREADY (preset), beside the same window on a base tree's levels.mjs (main alone), digests compared
//   slice:  the one region's bank list made cold on this tree's levels.mjs
//   node bank-slice-time.mjs <outdir> <base levels.mjs> <runs> w:<seed>:<X>:<Y> ... s:<seed>:<ra>:<rb> ...
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, findWayup, banksIn, regionBanks, madeRegionBanks, presetRegionBanks } from '../src/gen7/levels.mjs';
const [out, baseLevels, runsS, ...cells] = process.argv.slice(2), runs = +runsS, here = new URL('..', import.meta.url).pathname, QJS = '/home/mb/mb/hw-tools/quickjs-ng/bin/qjs';
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const patch = (t) => t.replaceAll("'../../../core/base/", "'../core/base/").replace("from './world.mjs'", "from './worldstub.mjs'").replace("from '../world.mjs'", "from './worldstub.mjs'");
const RUN = `const inQjs = typeof globalThis.scriptArgs !== 'undefined';
let text;
if (inQjs) { const std = await import('qjs:std'); text = std.loadFile(globalThis.scriptArgs[1]); }
else { const fs = await import('node:fs'); text = fs.readFileSync(new URL('data.json', import.meta.url), 'utf8'); }
const D = JSON.parse(text), M = await import('./gen7/levels.mjs');
const realm = { seed: D.seed, e0: new Float32Array(8000), ford: Uint8Array.from(D.ford), land: new Uint8Array(8000), M: new Float32Array(8000), stairs: D.stairs };
const L = M.levelsOf(realm);
for (const k of Object.keys(D.q)) L.q.set(+k, Int32Array.from(D.q[k]));
for (const k of Object.keys(D.wet)) L.wet.set(+k, Uint8Array.from(D.wet[k]));
if (D.nobanks) L.rule = { ...L.rule, banks: 0 };
if (D.reg && M.presetRegionBanks) M.presetRegionBanks(L, D.reg);
let t0, t1, h = 2166136261, n = 0;
if (D.mode === 'slice') { t0 = Date.now(); const l = M.regionBanks(L, D.ra, D.rb); t1 = Date.now(); h = l.length; n = l.length; }
else { t0 = Date.now(); const w = M.windowLevels(L, D.X, D.Y); t1 = Date.now(); for (let i = 0; i < w.R.length; i++) { h ^= w.R[i]; h = Math.imul(h, 16777619) >>> 0; } n = w.info.sites.length; }
console.log(JSON.stringify({ engine: inQjs ? 'qjs' : 'node', ms: t1 - t0, digest: h, sites: n }));
`;
const STUB = "export const RW = 80, RH = 100, CW = 24, CH = 28, MW = 16, MH = 20, L = { MEADOW: 0, POND: 1, ROCK: 2, WOOD: 3, WATER: 4, CLIFF: 5 };\nexport const heightAt = () => { throw new Error('no world'); }, fieldsAt = () => { throw new Error('no world'); }, noiseField = () => { throw new Error('no world'); };\n";
const dumpQ = (L) => { const q = {}, wet = {}; for (const [k, v] of L.q) q[k] = Array.from(v); for (const [k, v] of L.wet) wet[k] = Array.from(v); return { q, wet }; };
const run = (d) => { const t = [], dg = []; for (let i = 0; i < runs; i++) { const o = JSON.parse(execFileSync(QJS, ['--std', `${d}/run.mjs`, `${d}/data.json`], { encoding: 'utf8' })); t.push(o.ms); dg.push(o.digest); } return { ms: median(t), all: t.join('/'), digest: dg[0] }; };
for (const c of cells) {
  const [kind, seed, A, B] = [c.split(':')[0], ...c.split(':').slice(1).map(Number)], tag = `${out}/${kind}-${seed}-${A}-${B}`;
  const dn = tag + '-n', db = tag + '-b';
  for (const d of kind === 'w' ? [dn, db] : [dn]) {
    for (const s of ['core/base', 'gen7']) mkdirSync(`${d}/${s}`, { recursive: true });
    for (const f of ['noise.mjs', 'whole.mjs']) copyFileSync(`${here}../core/base/${f}`, `${d}/core/base/${f}`);
    copyFileSync(`${here}src/gen7/land-rule.json`, `${d}/gen7/land-rule.json`);
    writeFileSync(`${d}/gen7/worldstub.mjs`, STUB); writeFileSync(`${d}/run.mjs`, RUN);
  }
  writeFileSync(`${dn}/gen7/levels.mjs`, patch(readFileSync(`${here}src/gen7/levels.mjs`, 'utf8')));
  const R = realm7(seed).realm, L = levelsOf(R), stairs = () => [...L.stairs.values()].map((s) => ({ X: s.X, Y: s.Y, port: s.port, lip: s.lip, x0: s.x0, ok: s.ok }));
  for (const s of L.stairs.values()) findWayup(L, s.X, s.Y, s.port);
  const st = stairs();
  if (kind === 'w') {
    writeFileSync(`${db}/gen7/levels.mjs`, patch(readFileSync(baseLevels, 'utf8')));
    banksIn(L, A, B); const reg = madeRegionBanks(L);   // the lists of the regions the window touches, made
    L.q.clear(); L.wet.clear(); delete L.bkd; presetRegionBanks(L, reg);
    windowLevels(L, A, B);   // reads every field cell the window needs
    const { q, wet } = dumpQ(L), data = JSON.stringify({ mode: 'window', seed, X: A, Y: B, q, wet, reg, ford: Array.from(R.ford), stairs: st });
    writeFileSync(`${db}/data.json`, data); writeFileSync(`${dn}/data.json`, process.env.NOBANKS ? data.replace('"mode":"window"', '"mode":"window","nobanks":1') : data);   // NOBANKS=1: this tree's windows with the banks rule off (what the land line alone costs)
    const b = run(db), n = run(dn);
    console.log(JSON.stringify({ cell: c, cells: Object.keys(q).length, baseMs: b.ms, baseAll: b.all, sliceMs: n.ms, sliceAll: n.all, sameTiles: b.digest === n.digest }));
  } else {
    L.q.clear(); L.wet.clear(); delete L.bkd;
    const t = Date.now(), l = regionBanks(L, A, B), nodeMs = Date.now() - t;
    const { q, wet } = dumpQ(L), data = JSON.stringify({ mode: 'slice', seed, ra: A, rb: B, q, wet, ford: Array.from(R.ford), stairs: st });
    writeFileSync(`${dn}/data.json`, data);
    const n = run(dn);
    console.log(JSON.stringify({ slice: c, banks: l.length, cells: Object.keys(q).length, nodeMs, qjsMs: n.ms, qjsAll: n.all }));
  }
}
