// Land shape B1: how often the cell summary (world.mjs sideKind) and the tiles disagree at a border between two land cells of one region.
// Usage: node tools/border-measure.mjs <firstSeed> <count>
// For every land cell side that has a land neighbour in the same region: the tiles on both sides of the border (each cell's own layout) are read for a run of two walkable pairs.
//   cliffOpen: summary 'cliff' but the tiles hold an open run; openBlocked: summary open or stair but the tiles hold no open run.
import { makePage } from "../tests/page-harness.mjs";

const first = +process.argv[2] || 1, count = +process.argv[3] || 50;
const tot = { cliffSides: 0, cliffOpen: 0, openSides: 0, openBlocked: 0 };
for (let seed = first; seed < first + count; seed++) {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
  const r = p.run(`(() => {
    const out = { cliffSides: 0, cliffOpen: 0, openSides: 0, openBlocked: 0 }, cache = new Map();
    const lay = c => { let l = cache.get(c); if (!l) { l = layout(String(c)); cache.set(c, l); } return l; };
    const D = { right: [1, 0, 'left'], down: [0, 1, 'up'] };
    for (let c = 0; c < MW * MH; c++) {
      if (!G.comp[c] || G.land[c] === L.WATER || G.island[c]) continue;
      for (const dir of ['right', 'down']) {
        const [dx, dy] = D[dir], x = (c % MW) + dx, y = ((c / MW) | 0) + dy; if (x >= MW || y >= MH) continue;
        const n = y * MW + x; if (!G.comp[n] || G.land[n] === L.WATER || G.island[n]) continue;
        const ek = edgeKind(c, dir), kind = ek === EDGE.CLIFF ? (softKind(c, dir) ? 'soft' : 'cliff') : ek === EDGE.RAMP ? 'stair' : 'open'; if (kind !== 'cliff' && kind !== 'open' && kind !== 'stair') continue;
        const a = lay(c), b = lay(n); let run = 0, has = false;
        const len = dx ? a.h - 1 : a.w - 1;
        for (let k = 1; k < len && !has; k++) {
          const ia = dx ? k * a.w + a.w - 2 : (a.h - 2) * a.w + k, ib = dx ? k * b.w + 1 : b.w + k;
          const ra = dx ? a.raisedFn(a.w - 2, k) : a.raisedFn(k, a.h - 2), rb = dx ? b.raisedFn(1, k) : b.raisedFn(k, 1); run = (!T_BLOCK[a.tiles[ia]] && !T_BLOCK[b.tiles[ib]] && !!ra === !!rb) ? run + 1 : 0; has = run >= 2;
        }
        if (kind === 'cliff') { out.cliffSides++; if (has) out.cliffOpen++; } else { out.openSides++; if (!has) out.openBlocked++; }
      }
    }
    return out; })()`);
  for (const k of Object.keys(tot)) tot[k] += r[k];
}
console.log(JSON.stringify({ seeds: [first, first + count - 1], ...tot }));
