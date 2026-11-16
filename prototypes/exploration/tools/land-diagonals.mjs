// land-b3d-face3-1: the diagonal runs (3 or more one-tile steps in a row) on the fixed 4 x 3 windows: per seed, runs a place and the length mix.
//   node land-diagonals.mjs [--seeds 7,13]
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, levelDiagonals, CW, CH } from '../src/gen7/levels.mjs';

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const SEEDS = String(opt('seeds', '7,13')).split(',').map(Number), WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
for (const seed of SEEDS) {
  const w = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm), PW = w.w / CW, PH = w.h / CH, mix = {}, dirs = { 'down-right': 0, 'down-left': 0 }; let total = 0, places = 0, withRun = 0, steps = 0;
  const per = [];
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
    const runs = levelDiagonals(L, w.X + i, w.Y + j); places++; if (runs.length) withRun++; per.push(`${w.X + i},${w.Y + j}:${runs.length}`);
    for (const r of runs) { total++; steps += r.n; const k = r.n >= 8 ? '8+' : String(r.n); mix[k] = (mix[k] || 0) + 1; dirs[r.dir]++; }
  }
  console.log(JSON.stringify({ seed, places, placesWithARun: withRun, runs: total, runsAPlace: +(total / places).toFixed(2), lengthMix: mix, dirs, stepsInRuns: steps, perPlace: per.join(' ') }));
}
