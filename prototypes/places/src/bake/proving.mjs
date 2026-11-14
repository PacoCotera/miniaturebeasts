// The proving place (art/places/proving-place.json): the one fixed place every cliff piece is judged on. A level IR made from the file's raised rectangles on grass, baked by the real pipeline (build.mjs buildPlace).
// It carries no heart, no openings and no props: it is a picture for the art director, not a playable place, so it is never run through checkRules and never baked to disk.
import PROVING from '../../../../art/places/proving-place.json' with { type: 'json' };
import { PIECES } from './relief.mjs';

export { PROVING };

// terrains: terrain.json's list. Returns the IR.
export function provingIR(terrains) {
  const V = Object.fromEntries(terrains.map((t) => [t.id, t.value])), { w, h } = PROVING, terrain = new Uint8Array(w * h).fill(V.grass);
  for (const [x0, y0, x1, y1] of PROVING.raised) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrain[y * w + x] = V.cliff;
  return {
    id: PROVING.id, w, h, type: 'meadow', names: ['Proving place'], tileset: PROVING.tileset, mirror: false, mood: '', terrain,
    props: [], decals: [], canopy: [], hearts: [], clues: [], finds: [], landmarks: [], openings: [], spawns: [], wayups: PROVING.wayups.map((a) => ({ ...a })), reedbanks: [],
  };
}

// The cases of the proving place with what each holds: the table's pieces by state, so a signed piece is named as placed and an empty one as a named slot for the art desk.
export function provingCases() {
  const byId = new Map(PIECES.pieces.map((p) => [p.id, p]));
  return PROVING.cases.map((c) => {
    const rows = c.pieces.map((id) => { const p = byId.get(id); if (!p) throw new Error(`proving place: case ${c.id} names the piece ${id}, which the table does not hold`); return p; });
    return { id: c.id, label: c.label, at: c.at, signed: rows.filter((p) => p.state === 'signed' || p.state === 'covered').map((p) => p.id), standIn: rows.filter((p) => p.state === 'stand-in').map((p) => p.id), emptySlots: rows.filter((p) => p.state === 'empty').map((p) => p.id) };
  });
}
