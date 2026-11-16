// land-b3c: the regions of a seed that fail their checks, and why
//   node dbg-fail.mjs <seed>
import { realm7 } from '../src/gen7/region.mjs';
const R = realm7(+process.argv[2]);
console.log('rounds', R.rounds, R.regions.filter(r => r.fails.length).map(r => `${r.slot}: ${r.fails.join(',')} stranded ${r.stranded} zonesJoined ${r.zonesJoined}`).join(' | ') || 'none');
