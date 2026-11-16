// land-time-1: cold window time on quickjs-ng for a list of places, this tree against a base tree's levels.mjs, median of N runs each, digests compared.
//   node land-time-places.mjs <outdir> <base levels.mjs> <runs> <seed:X:Y> ...
import { execFileSync } from 'node:child_process';
import { mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
const [out, baseLevels, runsS, ...cells] = process.argv.slice(2), runs = +runsS, here = new URL('.', import.meta.url).pathname, QJS = '/home/mb/mb/hw-tools/quickjs-ng/bin/qjs';
const median = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const patch = t => t.replaceAll("'../../../core/base/", "'../core/base/").replace("from './world.mjs'", "from './worldstub.mjs'").replace("from '../world.mjs'", "from './worldstub.mjs'");
const rows = [];
for (const c of cells) {
  const [seed, X, Y] = c.split(':'), dn = `${out}/n-${seed}-${X}-${Y}`, db = `${out}/b-${seed}-${X}-${Y}`;
  mkdirSync(out, { recursive: true });
  execFileSync('node', [`${here}land-qjs-prep.mjs`, dn, seed, X, Y], { stdio: 'pipe' });
  cpSync(dn, db, { recursive: true });
  writeFileSync(`${db}/gen7/levels.mjs`, patch(readFileSync(baseLevels, 'utf8')));
  const run = d => { const t = [], dg = []; for (let i = 0; i < runs; i++) { const o = JSON.parse(execFileSync(QJS, ['--std', `${d}/run.mjs`, `${d}/data.json`], { encoding: 'utf8' })); t.push(o.ms); dg.push(o.digest); } return { ms: median(t), digest: dg[0], all: new Set(dg).size }; };
  const b = run(db), n = run(dn);
  rows.push({ cell: c, baseMs: b.ms, newMs: n.ms, same: b.digest === n.digest });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
console.log('median base', median(rows.map(r => r.baseMs)), 'new', median(rows.map(r => r.newMs)), 'all digests equal', rows.every(r => r.same));
