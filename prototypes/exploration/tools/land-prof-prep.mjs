// land-time-1: makes a copy of a prepared qjs directory (land-qjs-prep.mjs output) whose levels.mjs wraps each land pass in a timer (inclusive ms), then runs the window once cold.
//   node land-prof-prep.mjs <prepdir> <outdir> [levels.mjs to use instead of the prep's copy]
//   qjs --std <outdir>/runp.mjs <outdir>/data.json     (or node <outdir>/runp.mjs)
import { mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
const [src, out, lv] = process.argv.slice(2);
cpSync(src, out, { recursive: true });
let t = readFileSync(lv || `${src}/gen7/levels.mjs`, 'utf8').replaceAll("'../../../core/base/", "'../core/base/").replace("from './world.mjs'", "from './worldstub.mjs'").replace("from '../world.mjs'", "from './worldstub.mjs'");
const names = ['cleanup', 'recleanNear', 'fixGaps', 'capRuns', 'fixSquares', 'fixLeft', 'walkParts', 'components', 'violBox', 'blobOf', 'siteOf', 'qCell', 'wetCell', 'landPipeline', 'openClose', 'openCloseNear', 'fixPatterns', 'dropSmall', 'violAt', 'blockedAt', 'rectPair', 'close', 'open'];
const miss = [];
for (const n of names) {
  const re = new RegExp(`(export )?function ${n}\\(`);
  if (!re.test(t)) { miss.push(n); continue; }
  t = t.replace(re, `$1function ${n}(...a) { const t0 = globalThis.__now(); try { return ${n}_raw(...a); } finally { const P = globalThis.__P; P.${n} = (P.${n} || 0) + globalThis.__now() - t0; P['#${n}'] = (P['#${n}'] || 0) + 1; } }\nfunction ${n}_raw(`);
}
writeFileSync(`${out}/gen7/levels.mjs`, t);
let r = readFileSync(`${src}/run.mjs`, 'utf8');
r = "globalThis.__now = () => { const h = globalThis.performance && globalThis.performance.now; return h ? performance.now() : Date.now(); }; globalThis.__P = {};\n" + r;
r = r.replace("console.log(JSON.stringify({ engine", "console.log(JSON.stringify(Object.fromEntries(Object.entries(globalThis.__P).map(([k, v]) => [k, Math.round(v)]))));\nconsole.log(JSON.stringify({ engine");
writeFileSync(`${out}/runp.mjs`, r);
console.log('ok', out, 'missing', miss.join(','));
