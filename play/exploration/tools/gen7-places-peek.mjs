// Print one place's plan: the ways in, the spine size, the spots, the finds and what the scenery keeps off. node tools/gen7-places-peek.mjs <seed> <X> <Y>
import { cellIR } from '../src/gen7/place.mjs';
import { planOf } from '../src/gen7/places.mjs';

const [seed, X, Y] = process.argv.slice(2, 5).map(Number);
const t0 = performance.now();
const plan = planOf(seed, X, Y), ir = cellIR(seed, X, Y);
console.log('ms', Math.round(performance.now() - t0));
if (!plan) { console.log('no plan (water)'); process.exit(0); }
console.log(JSON.stringify({ land: plan.land, entries: plan.entries, samples: plan.samples.length, spine: plan.spine.reduce((s, v) => s + v, 0), wayups: plan.wayups }));
for (const s of plan.spots) console.log(JSON.stringify({ id: s.id, role: s.role, x: s.x, y: s.y, w: s.w, h: s.h, tier: s.tier, entryDist: s.entryDist, spineDist: s.spineDist, seenFrom: s.seenFrom, cand: s.candidates }));
console.log('finds', ir.finds.length, ir.finds.map(f => f.kinds[0] + '@' + f.x + ',' + f.y + (f.spot ? '*' : '')).join(' '));
console.log('props', ir.props.length, 'pieces', JSON.stringify(ir.pieces), 'shelter', ir.shelter.length, 'landmarks', JSON.stringify(ir.landmarks.map(l => [l.kind, l.x, l.y])));
