// land-time-1: a copy of the exploration code the small engine (quickjs-ng) can run engine-time.mjs from: the two bare imports (fastnoise-lite, flatqueue) become files beside it.
//   node engine-cut.mjs <outdir>        then:  qjs --std <outdir>/prototypes/exploration/tools/engine-time.mjs -- --seed=7
import { mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
const out = process.argv[2], ex = new URL('..', import.meta.url).pathname, core = `${ex}../core`;
mkdirSync(`${out}/prototypes/exploration/lib`, { recursive: true });
cpSync(core, `${out}/prototypes/core`, { recursive: true, filter: s => !s.includes('node_modules') });
mkdirSync(`${out}/prototypes/workbench/framework`, { recursive: true });
cpSync(`${ex}../workbench/framework/language.mjs`, `${out}/prototypes/workbench/framework/language.mjs`);
cpSync(`${ex}src`,`${out}/prototypes/exploration/src`, { recursive: true });
mkdirSync(`${out}/prototypes/exploration/tools`, { recursive: true });
mkdirSync(`${out}/prototypes/exploration/tests`, { recursive: true });
for (const f of ['engine-time.mjs', 'noise-time.mjs']) cpSync(`${ex}tools/${f}`, `${out}/prototypes/exploration/tools/${f}`);
for (const f of ['gen7-vectors.json', 'noise-vectors.mjs']) cpSync(`${ex}tests/${f}`, `${out}/prototypes/exploration/tests/${f}`);
cpSync(`${ex}node_modules/fastnoise-lite/FastNoiseLite.js`, `${out}/prototypes/exploration/lib/fastnoise-lite.mjs`);
cpSync(`${ex}node_modules/flatqueue/index.js`, `${out}/prototypes/exploration/lib/flatqueue.mjs`);
const fix = (dir, rel) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) { fix(p, rel + '../'); continue; } if (!e.name.endsWith('.mjs')) continue;
  let t = readFileSync(p, 'utf8'); const t2 = t.replace(/from 'fastnoise-lite'/g, `from '${rel}lib/fastnoise-lite.mjs'`).replace(/from 'flatqueue'/g, `from '${rel}lib/flatqueue.mjs'`); if (t2 !== t) writeFileSync(p, t2); } };
fix(`${out}/prototypes/exploration/src`, '../');
{ // regions.mjs re-exports the save reset from the play tree, which the fields never read: leave that line out of the cut
  const p = `${out}/prototypes/exploration/src/regions.mjs`; writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter(l => !l.includes('/play/src/realm/reset.mjs')).join('\n')); }
console.log('ok', out);
