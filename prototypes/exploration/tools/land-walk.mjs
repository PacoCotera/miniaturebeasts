// The walk check: on each seed's fixed window (4 x 3 places), the pawn's path search on the land's walk mask from every opening of the place to its way up and to every other opening.
//   node land-walk.mjs --d 5200 --face 3 [--seeds 7,13,42] [--set k=v,...]
// The walk mask is the game's own relief: a tile walks unless the water, the thicket or the cliff's lip, face or flank blocks it (cliffInfo.blockCells); a way up's cells walk. Props are not in the mask
// (they are not part of the land rule). An opening is a run of walkable tiles on the place's border whose neighbour across the border (in the apron) also walks.
// Output: per place the openings, the ways up, the unreachable pairs; and the places where one is unreachable, split into "has a way up" (look at these) and "has none" (two levels, as expected).
import { readFileSync } from 'node:fs';
import { setLandRule, CW, CH } from '../src/gen7/levels.mjs';
import { cellIR, TV } from '../src/gen7/place.mjs';
import { bakeCtx } from './gen7-render.mjs';
import { cliffInfo } from '../../places/src/bake/openedges.mjs';

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const over = Object.fromEntries(String(opt('set', '')).split(',').filter(Boolean).map((p) => { const [k, v] = p.split('='); return [k, Number(v)]; }));
setLandRule({ detail: Number(opt('d', 5200)), faceRows: Number(opt('face', 3)), ...over });
const SEEDS = String(opt('seeds', '7,13,42')).split(',').map(Number), WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
const terrains = bakeCtx().terrains, report = [];
for (const seed of SEEDS) {
  const wv = WINDOWS.find((v) => v.seed === seed);
  for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
    const X = wv.X + i, Y = wv.Y + j, ir = cellIR(seed, X, Y), cliffs = cliffInfo(ir, terrains), { w, h } = ir;
    const walk = (x, y) => x >= 0 && y >= 0 && x < w && y < h && ![TV.DEEP, TV.WATER, TV.THICKET].includes(ir.terrain[y * w + x]) && (!cliffs.blockCells.has(y * w + x) || cliffs.wayup.has(y * w + x));
    // the place's own tiles are 1 .. CW and 1 .. CH inside the apron
    const own = (x, y) => x >= 1 && y >= 1 && x <= CW && y <= CH, comp = new Int32Array(w * h).fill(-1); let nc = 0;
    for (let s = 0; s < w * h; s++) {
      const sx = s % w, sy = (s / w) | 0; if (comp[s] >= 0 || !own(sx, sy) || !walk(sx, sy)) continue;
      const q = [s]; comp[s] = nc; for (let k = 0; k < q.length; k++) { const x = q[k] % w, y = (q[k] / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, m = b * w + a; if (own(a, b) && walk(a, b) && comp[m] < 0) { comp[m] = nc; q.push(m); } } }
      nc++;
    }
    // openings: runs of the border's walkable tiles whose tile across the border walks too; each is a set of components
    const opens = [];
    for (const [side, cells] of Object.entries({ n: Array.from({ length: CW }, (_, k) => [1 + k, 1, 0, -1]), s: Array.from({ length: CW }, (_, k) => [1 + k, CH, 0, 1]), w: Array.from({ length: CH }, (_, k) => [1, 1 + k, -1, 0]), e: Array.from({ length: CH }, (_, k) => [CW, 1 + k, 1, 0]) })) {
      let run = null;
      for (const [x, y, dx, dy] of cells) {
        if (walk(x, y) && walk(x + dx, y + dy)) { (run ||= { side, comps: new Set(), n: 0, up: ir.terrain[y * w + x] === TV.CLIFF }).comps.add(comp[y * w + x]); run.n++; } else if (run) { opens.push(run); run = null; }
      }
      if (run) opens.push(run);
    }
    const ways = (ir.wayups || []).filter((a) => a.x >= 0 && a.x + a.w <= w && a.y >= 0 && a.y <= h).map((a) => { const cs = new Set(); for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (own(x, y) && comp[y * w + x] >= 0) cs.add(comp[y * w + x]); return cs; });
    const bad = []; const meets = (a, b) => [...a].some((c) => b.has(c));
    for (let a = 0; a < opens.length; a++) {
      for (let b = a + 1; b < opens.length; b++) if (!meets(opens[a].comps, opens[b].comps)) bad.push(`${opens[a].side}${a}${opens[a].up ? '^' : ''}-${opens[b].side}${b}${opens[b].up ? '^' : ''}${opens[a].up === opens[b].up ? ' SAME-LEVEL' : ''}`);
      ways.forEach((wc, k) => { if (!meets(opens[a].comps, wc)) bad.push(`${opens[a].side}${a}-way${k}`); });
    }
    report.push({ seed, cell: [X, Y], openings: opens.length, ways: ways.length, components: nc, unreachable: bad });
  }
}
const withBad = report.filter((r) => r.unreachable.length), badWay = withBad.filter((r) => r.ways), noWay = withBad.filter((r) => !r.ways);
console.log(JSON.stringify({ places: report.length, openings: report.reduce((s, r) => s + r.openings, 0), ways: report.reduce((s, r) => s + r.ways, 0), unreachablePlaces: withBad.length, sameLevelPlaces: withBad.filter((r) => r.unreachable.some((u) => u.includes('SAME-LEVEL') || u.includes('way'))).length, withAWayUp: badWay.length, withoutWayUp: noWay.length, ...over, d: Number(opt('d', 5200)), faceRows: Number(opt('face', 3)) }));
for (const r of badWay) console.log('WAY UP PLACE', r.seed, r.cell.join(','), 'openings', r.openings, 'ways', r.ways, 'unreachable', r.unreachable.join(' '));
for (const r of noWay) console.log('no way up  ', r.seed, r.cell.join(','), 'openings', r.openings, 'components', r.components, 'unreachable', r.unreachable.join(' '));
