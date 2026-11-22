// scratch: the whole realm's digest (run twice and compare; run with node and qjs bundles)
import { realm7 } from '../src/gen7/region.mjs';
import { realmDigest } from '../src/gen7/realm-blob.mjs';
const R = realm7(+(process.argv[2] || 1));
console.log(realmDigest(R));
