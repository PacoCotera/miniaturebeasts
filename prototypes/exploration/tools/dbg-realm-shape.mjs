// scratch: where a realm holds a function, Map, Set, NaN or undefined
import { realm7 } from '../src/gen7/region.mjs';
const R = realm7(+(process.argv[2] || 7)), seen = {};
function walk(v, path) {
  const t = typeof v;
  if (t === 'function' || t === 'bigint' || v instanceof Map || v instanceof Set || (t === 'number' && !isFinite(v)) || v === undefined) { const k = (v === undefined ? 'undefined' : t === 'object' ? v.constructor.name : t) + ' ' + path.replace(/\[\d+\]/g, '[]'); seen[k] = (seen[k] || 0) + 1; return; }
  if (v && t === 'object' && !ArrayBuffer.isView(v)) for (const k of Object.keys(v)) walk(v[k], path + (Array.isArray(v) ? '[' + k + ']' : '.' + k));
}
walk(R, 'R'); console.log(seen);
import { cellTerrain, sectorOf } from '../src/gen7/place.mjs';
for (const k of Object.keys(seen)) delete seen[k];
cellTerrain(7, 40, 40); sectorOf(7, 40, 40); walk(R, 'R'); console.log('after a place', seen);
