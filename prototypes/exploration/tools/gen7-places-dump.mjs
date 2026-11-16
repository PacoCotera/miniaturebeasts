// Dump the places of a cells file (from tools/place-greybox-stills.mjs) as JSON for the top-down diagrams: the land, the structure, the set pieces, and the props and finds before (origin/main) and after.
// usage: node tools/gen7-places-dump.mjs <baseTreeRoot> <cells.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cellIR } from '../src/gen7/place.mjs';
import { planOf } from '../src/gen7/places.mjs';

const [baseRoot, cellsFile, outFile] = process.argv.slice(2), cells = JSON.parse(readFileSync(cellsFile, 'utf8'));
const base = await import(pathToFileURL(baseRoot + '/prototypes/exploration/src/gen7/place.mjs').href);
const view = (ir) => ({ props: ir.props.map((p) => [p.tx - ir.origin.x, p.ty - ir.origin.y, p.fam || 'other', p.kind]), finds: ir.finds.map((f) => [f.x, f.y, f.kinds[0]]), landmarks: ir.landmarks.map((l) => [l.x, l.y, l.kind]), shelter: ir.shelter || [] });
const out = [];
for (const seed of Object.keys(cells)) for (const q of cells[seed]) {
  const ir = cellIR(+seed, q.X, q.Y), b = base.cellIR(+seed, q.X, q.Y), p = planOf(+seed, q.X, q.Y), w = p.w;
  const spine = []; for (let i = 0; i < p.spine.length; i++) if (p.spine[i]) spine.push([i % w, (i / w) | 0]);
  out.push({ seed: +seed, X: q.X, Y: q.Y, c: q.c, land: p.land, w, h: p.h, terrain: Array.from(ir.terrain), wayups: p.wayups, entries: p.entries, samples: p.samples, spine, sightLine: p.sightLine,
    spots: p.spots.map((s) => ({ id: s.id, kind: s.kind, role: s.role, x: s.x, y: s.y, w: s.w, h: s.h, cells: s.cells.map((c) => [c.x, c.y, c.k]), seenFrom: s.seenFrom || null })),
    zone: { zw: p.zw, data: Array.from(p.zone) }, before: view(b), after: view(ir) });
}
writeFileSync(outFile, JSON.stringify(out));
console.log('places', out.length);
