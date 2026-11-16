// decor-mix-2: top self-time functions of a .cpuprofile: node decor-mix-profsum.mjs <file.cpuprofile> [top]
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8')), top = +(process.argv[3] || 15), self = new Map(), byId = new Map(p.nodes.map(n => [n.id, n]));
const dt = p.timeDeltas; let total = 0;
p.samples.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + dt[i]); total += dt[i]; });
console.log(JSON.stringify([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => [k, Math.round(v / 1000) + 'ms', (100 * v / total).toFixed(1) + '%'])));
