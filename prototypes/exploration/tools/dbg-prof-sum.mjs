// scratch: self time by function of a .cpuprofile
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8')), self = new Map(), by = new Map(p.nodes.map(n => [n.id, n]));
const dt = p.timeDeltas; for (let i = 0; i < p.samples.length; i++) self.set(p.samples[i], (self.get(p.samples[i]) || 0) + dt[i]);
const agg = new Map(); for (const [id, t] of self) { const f = by.get(id).callFrame, k = f.functionName + ' ' + f.url.split('/').slice(-2).join('/') + ':' + f.lineNumber; agg.set(k, (agg.get(k) || 0) + t); }
const tot = [...agg.values()].reduce((a, b) => a + b, 0);
for (const [k, t] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, +(process.argv[3] || 25))) console.log((t / 1000).toFixed(0).padStart(7), 'ms', (100 * t / tot).toFixed(1).padStart(5) + '%', k);
