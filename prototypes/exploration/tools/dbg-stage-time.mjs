// stage times of the first place in Node: realm, context, stairs (every way up), cell terrain (scratch tool)
import { realm7 } from '../src/gen7/region.mjs';
import { contextOf, cellTerrain, stairsInfo } from '../src/gen7/place.mjs';
const seed = +(process.argv[2] || 7), MW = 16, MH = 20, R = realm7(seed), G = R.regions[12], X = 2 * MW + (G.spawns[0] % MW), Y = 2 * MH + ((G.spawns[0] / MW) | 0), now = () => performance.now();
let t = now(); contextOf(seed); console.log('ctx', Math.round(now() - t));
t = now(); const st = stairsInfo(seed); console.log('stairs (every way up)', Math.round(now() - t), st.length);
t = now(); cellTerrain(seed, X, Y); console.log('cellTerrain start (after stairs)', Math.round(now() - t));
t = now(); cellTerrain(seed, X + 1, Y); console.log('cellTerrain nb', Math.round(now() - t));
