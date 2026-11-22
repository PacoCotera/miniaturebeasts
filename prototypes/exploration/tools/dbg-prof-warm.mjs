// scratch: a cpu profile of the warm neighbour places only (Node, in-process inspector): node dbg-prof-warm.mjs <seed> <out.cpuprofile>; then dbg-prof-sum.mjs <file>
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { cellTerrain } from '../src/gen7/place.mjs';
const seed = +(process.argv[2] || 1), MW = 16, MH = 20, R = realm7(seed), G = R.regions[12], X = 2 * MW + (G.spawns[0] % MW), Y = 2 * MH + ((G.spawns[0] / MW) | 0);
cellTerrain(seed, X, Y);
const s = new Session(); s.connect();
s.post('Profiler.enable'); s.post('Profiler.setSamplingInterval', { interval: 200 }); s.post('Profiler.start');
const t = performance.now();
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) cellTerrain(seed, X + dx, Y + dy);
const ms = Math.round(performance.now() - t);
s.post('Profiler.stop', (err, { profile }) => { writeFileSync(process.argv[3], JSON.stringify(profile)); console.log('8 neighbours ms', ms); });
