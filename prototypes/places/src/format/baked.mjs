// A baked cell as .mbplace bytes (format 2, baked-package-8): the place and the bake's hold outputs in ONE file, and back.
//   writeBaked(ir, place, { seed, cell }) -> bytes   the Station's side: what the places worker made (exploration/src/world7.mjs bakedCell) is kept as the bytes the device's flash takes.
//   readBaked(bytes) -> { ir, place }                the Companion's side, the one read path: the object adaptCell (exploration/src/adapt7.mjs) reads today, made from the bytes alone.
// The hold outputs are rolled once at the bake, from the seed; the Companion never generates. Nothing is rolled on a read: adaptCell's own hashes (the slab, the special tiles, a find's roll)
// are a function of the seed and the cell, and both are in the bytes (place.seed, place.cell).
// A value that changes in play is player state and stays in the save (a strike's age advances there, as the veil and the finds do); the file holds the bake's value.
import { writePlace, FORMAT_VERSION } from './write.mjs';
import { readPlace } from './read.mjs';

const CW = 24, CH = 28;   // a generated place's tiles (exploration/src/gen7/world.mjs); a cell's baked place has a one-tile apron, so its origin is one tile before the cell's own
export const FIND_KINDS = ['pod', 'fruit', 'dew', 'stone', 'material'];   // the order the format's `kinds` index (places/src/bake/ldtk.mjs)
const xy = (a) => ({ x: a[0], y: a[1] });

export function writeBaked(ir, place, { seed, cell }) {
  const lm = (ir.landmarks || [])[0] || null, soft = ir.soft || { wade: [], scree: [] };
  return writePlace({
    ...place, formatVersion: FORMAT_VERSION, seed, cell,
    finds: place.finds.map((f, i) => { const q = ir.finds[i] || {}; return { ...f, what: q.what, herd: q.herd, hollow: q.hollow, forced: q.forced, spot: q.spot }; }),
    groundAt: ir.ground || null, softWade: (soft.wade || []).map(xy), softScree: soft.scree || [], pieces: ir.pieces || [], shelter: (ir.shelter || []).map(xy), strikes: ir.strikes || [],
    signs: ir.signs || [], traces: ir.traces || [], stamps: ir.stamps || [], banks: ir.banks || [],
    holdLandmark: lm ? { kind: lm.kind, name: lm.name, slot: lm.slot, x: lm.x, y: lm.y } : null,
  });
}

export function readBaked(bytes) {
  const p = readPlace(bytes);
  if (p.formatVersion < 2) throw new Error('a place of format ' + p.formatVersion + ' has no hold outputs: it is not a baked cell');
  const m = /^g7-(\d+)-(\d+)$/.exec(p.id), lm = p.holdLandmark;
  const ir = {
    origin: m ? { x: +m[1] * CW - 1, y: +m[2] * CH - 1 } : { x: 0, y: 0 }, seed: p.seed,
    names: p.names, openings: p.openings.map(o => ({ side: o.side, from: o.from, to: o.to })), spawns: p.spawns,
    finds: p.finds.map(f => ({ ...f, kinds: f.kinds.map(k => FIND_KINDS[k]) })),
    landmarks: lm ? [{ kind: lm.kind, name: lm.name, label: lm.name, slot: lm.slot, x: lm.x, y: lm.y }] : [],
    ground: p.groundAt, soft: { wade: p.softWade.map(q => [q.x, q.y]), scree: p.softScree }, pieces: p.pieces, shelter: p.shelter.map(q => [q.x, q.y]), strikes: p.strikes,
    signs: p.signs, traces: p.traces, stamps: p.stamps, ...(p.banks.length ? { banks: p.banks } : {}),
  };
  const place = { ...p, finds: p.finds.map(f => ({ x: f.x, y: f.y, kinds: f.kinds, chance: f.chance })) };
  for (const k of ['seed', 'cell', 'groundAt', 'softWade', 'softScree', 'pieces', 'shelter', 'strikes', 'signs', 'traces', 'stamps', 'banks', 'holdLandmark']) delete place[k];
  return { ir, place, seed: p.seed, cell: p.cell };   // place keeps rimSteps (a bake output the walk reads)
}
