// paths-gen-build-2 step 4: the baked cell's size, per cell. usage: node sizes.mjs <seed> <n cells>  (run in a tree: main for 'before', the branch for 'after')
// size = bytes of the structured clone the package keeps ({ ir, place }): typed arrays by byteLength, numbers 8, strings by length, plus the .mbplace bytes the header's sha covers (writePlace).
import { makePage } from '../../tests/page-harness.mjs';
const seed = +process.argv[2] || 64, n = +process.argv[3] || 40;
const pg = makePage({ gen: 7, console: 'silent' });
pg.run(`newWorld(${seed});`);
const r = JSON.parse(pg.run(`(() => { const v = biomeVersion(S), slot = hereRegion().slot, out = [];
  const sz = o => { if (o == null) return 1; if (ArrayBuffer.isView(o)) return o.byteLength; if (typeof o === 'string') return o.length; if (typeof o !== 'object') return 8; let s = 0; if (Array.isArray(o)) { for (const x of o) s += sz(x); return s + 8; } for (const k of Object.keys(o)) s += k.length + sz(o[k]); return s; };
  let c0 = 0; for (let c = 0; c < MW * MH && out.length < ${n}; c++) { if (!passableIn(G, c)) continue; const b = bakedCell7(PL.ctx, ${seed}, slot, c, v); out.push([c, sz(b), b.place.keepers ? 1 : 0, b.place.props.length, b.ir.props.length]); }
  return JSON.stringify(out); })()`));
const tot = r.reduce((s, x) => s + x[1], 0), k = r.filter(x => x[2]).length, props = r.reduce((s, x) => s + x[3], 0);
console.log(JSON.stringify({ seed, cells: r.length, bytesTotal: tot, bytesPerCell: Math.round(tot / r.length), withKeepers: k, props }));
if (process.env.SIZES_LIST) console.log(JSON.stringify(r));
