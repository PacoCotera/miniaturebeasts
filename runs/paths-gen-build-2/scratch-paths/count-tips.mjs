// paths-gen-build-1 step 0 (read only): the tips of sand (the trail's path tiles) in every land place of the home region, by cause.
// usage: node count-tips.mjs <seed> [<seed> ...]   -> one JSON line a seed and a total
import { cellTerrain, TV, CW, CH } from '../../src/gen7/place.mjs';
import { realm7, } from '../../src/gen7/region.mjs';
import { RW } from '../../src/gen7/world.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
import { roadGraph } from '../../src/gen7/roads.mjs';
const seeds = process.argv.slice(2).map(Number), [ax, ay] = CENTER;
const tot = { places: 0, landPlaces: 0, withPath: 0, endAtMiddle: 0, fadeFragment: 0, fadeCutArm: 0, otherOffTrail: 0, ends: 0 };
const isPath = (c, k) => c.terrain[k] === TV.PATH || c.top[k] === TV.PATHTOP || c.terrain[k] === TV.FORD || c.terrain[k] === TV.BRIDGE;
for (const seed of seeds) {
  const t0 = Date.now(), R = realm7(seed), re = R.realm, g = roadGraph(re.land.length, RW, re.roads.lists);
  const row = { seed, landPlaces: 0, withPath: 0, endAtMiddle: 0, fadeFragment: 0, fadeCutArm: 0, otherOffTrail: 0, ends: 0, endsAt: [], fadeAt: [] };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const X = ax * MW + x, Y = ay * MH + y, wc = Y * RW + X;
    if (re.land[wc] === 4) continue; row.landPlaces++;
    const d = g.adj.has(wc) ? g.adj.get(wc).length : 0;
    const c = cellTerrain(seed, X, Y), W = c.w, H = c.h, comp = new Int32Array(W * H);
    let nc = 0; const info = [];
    for (let j = 1; j <= CH; j++) for (let i = 1; i <= CW; i++) {
      const k = j * W + i; if (comp[k] || !isPath(c, k)) continue;
      nc++; const st = [k]; comp[k] = nc; const I = { tiles: 0, ports: new Set() };
      while (st.length) { const q = st.pop(), qi = q % W, qj = (q / W) | 0; I.tiles++;
        if (qi === 1) I.ports.add('w' + (qj >> 1)); if (qi === CW) I.ports.add('e' + (qj >> 1)); if (qj === 1) I.ports.add('n' + (qi >> 1)); if (qj === CH) I.ports.add('s' + (qi >> 1));
        for (const n of [q - 1, q + 1, q - W, q + W]) { const ni = n % W, nj = (n / W) | 0; if (ni < 1 || ni > CW || nj < 1 || nj > CH || comp[n] || !isPath(c, n)) continue; comp[n] = nc; st.push(n); } }
      // ports of one side run together: merge side runs to count real ports (a brush is 2 wide)
      const sides = new Set([...I.ports].map(p => p[0] + (Math.floor(+p.slice(1) / 1)))); I.nports = new Set([...I.ports].map(p => p[0])).size;
      info.push(I);
    }
    if (!nc) { continue; } row.withPath++;
    if (d === 0) { row.otherOffTrail++; continue; }
    const loc = x + ',' + y;
    if (d === 1) { row.ends++; row.endAtMiddle++; row.endsAt.push(loc); }
    // fragments: components that touch no edge are fade leavings; components that reach fewer sides than the realm's degree leave a cut arm (a fade in a narrow place)
    let sidesTouched = 0; const seen = new Set();
    for (const I of info) { if (I.ports.size === 0) { row.fadeFragment++; row.fadeAt.push(loc + ':frag'); } for (const p of I.ports) seen.add(p[0]); }
    sidesTouched = seen.size;
    if (d >= 2 && sidesTouched < d && sidesTouched < 4) { row.fadeCutArm += d - sidesTouched; row.fadeAt.push(loc + ':cut'); }
  }
  for (const k of Object.keys(row)) if (typeof row[k] === 'number') tot[k] = (tot[k] || 0) + row[k];
  console.log(JSON.stringify({ ...row, ms: Date.now() - t0, endsAt: row.endsAt.slice(0, 14), fadeAt: row.fadeAt.slice(0, 10) }));
}
console.log(JSON.stringify({ seeds: seeds.length, ...tot }));
