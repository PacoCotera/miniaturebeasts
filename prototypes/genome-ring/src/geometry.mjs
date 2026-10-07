// Ring geometry: genome -> a list of marks in unit coordinates (R = 1 at the
// outer edge of the rim, angles clockwise from 12 o'clock). The SVG writer and
// the rasterizer both draw this list, so the PNG and the SVG are the same ring.
import { genomeToBits, slotLayout, NOTCH_SLOTS, HEADER_BITS } from "./codec.mjs";
import { frameFor } from "./frames.mjs";

// Radii, from the outside in. Every data ring is long/short: the "base" part of
// a mark is always drawn, the "ext" part only for a 1. Reading ext against base
// on the same spoke makes the decision independent of ink, colour and light.
export const LAYOUT = {
  rim: [0.95, 1.0], // solid: finder and outer radial reference
  dash: { base: [0.875, 0.925], ext: [0.825, 0.875] }, // header: species, version, read mask, check
  outer: { base: [0.66, 0.73], ext: [0.73, 0.8] }, // second copy of every heritable part
  ticks: [0.595, 0.635], // timing marks, one per slot
  ref: [0.57, 0.595], // solid timing circle, broken at the notch: inner radial reference
  inner: { base: [0.41, 0.48], ext: [0.48, 0.545] }, // first copy (mother / pod's first)
  band: { base: [0.3, 0.345], ext: [0.255, 0.3] }, // locked frame, grey, species-constant
  glyph: 0.2, // species glyph half-width
  duty: 0.55, // spoke width as a share of the slot pitch
  tickDuty: 0.4,
  bandDuty: 0.5,
  hairDuty: 0.12,
  quiet: 0.08, // white margin outside the rim, per side, in R
};

export const PALETTE = {
  plate: "#fbf8f0", ink: "#2b2a27", inner: "#1f5a85", outer: "#a3392c", band: "#8e897d", hair: "#c9c3b5",
};
export const MONO = { plate: "#ffffff", ink: "#000000", inner: "#000000", outer: "#000000", band: "#000000", hair: "#000000" };

export const slotAngle = (k, S) => (2 * Math.PI * (k - 1)) / S; // slot 1 = notch centre = 12 o'clock

function glyphCells(seed) {
  // 5x5 mirrored rune from the species number: the same for every member.
  let h = (seed * 2654435761) >>> 0;
  const cells = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++) {
      h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
      const on = (h >>> 7) & 1 || (x === 2 && y === 2);
      if (on) {
        cells.push([x, y]);
        if (x < 2) cells.push([4 - x, y]);
      }
    }
  return cells;
}

export function ringGeometry(genome, { mono = false } = {}) {
  const frame = frameFor(genome.species, genome.version);
  if (!frame) throw new Error(`no frame for species ${genome.species} v${genome.version}`);
  const L = LAYOUT;
  const P = mono ? MONO : PALETTE;
  const bits = genomeToBits(frame, genome);
  const { S, slots } = slotLayout(frame);
  const pitch = (2 * Math.PI) / S;
  const marks = [];
  const arc = (r0, r1, a, w, fill) => marks.push({ k: "arc", r0, r1, a0: a - w / 2, a1: a + w / 2, fill });

  marks.push({ k: "ann", r0: L.rim[0], r1: L.rim[1], fill: P.ink });
  // timing circle with the notch gap, and one tick per non-notch slot
  marks.push({ k: "arc", r0: L.ref[0], r1: L.ref[1], a0: slotAngle(NOTCH_SLOTS - 0.5, S), a1: slotAngle(S - 0.5, S), fill: P.ink });
  for (let k = NOTCH_SLOTS; k < S; k++) arc(L.ticks[0], L.ticks[1], slotAngle(k, S), pitch * L.tickDuty, P.ink);
  // header dashes on every non-notch slot, the 40 header bits repeated
  for (let k = NOTCH_SLOTS; k < S; k++) {
    const b = bits.header[(k - NOTCH_SLOTS) % HEADER_BITS];
    const a = slotAngle(k, S);
    arc(L.dash.base[0], L.dash.base[1], a, pitch * L.duty, P.ink);
    if (b) arc(L.dash.ext[0], L.dash.ext[1], a, pitch * L.duty, P.ink);
  }
  // the two coloured tracks
  for (const [k, s] of slots.entries()) {
    if (s.type !== "spoke") continue;
    const a = slotAngle(k, S);
    for (const [track, zone, fill] of [[bits.inner, L.inner, P.inner], [bits.outer, L.outer, P.outer]]) {
      const b = track[s.spoke];
      if (b === null) {
        arc(Math.min(zone.base[0], zone.ext[0]), Math.max(zone.base[1], zone.ext[1]), a, pitch * L.hairDuty, mono ? P.hair : PALETTE.hair);
        continue;
      }
      arc(zone.base[0], zone.base[1], a, pitch * L.duty, fill);
      if (b) arc(zone.ext[0], zone.ext[1], a, pitch * L.duty, fill);
    }
  }
  // the locked band: one grey mark per locked bit, evenly over the non-notch arc
  const nb = frame.lockedMarks.length;
  const a0 = slotAngle(NOTCH_SLOTS - 0.5, S), a1 = slotAngle(S - 0.5, S);
  const bp = (a1 - a0) / nb;
  frame.lockedMarks.forEach((b, i) => {
    const a = a0 + (i + 0.5) * bp;
    arc(L.band.base[0], L.band.base[1], a, bp * L.bandDuty, P.band);
    if (b) arc(L.band.ext[0], L.band.ext[1], a, bp * L.bandDuty, P.band);
  });
  // centre glyph
  const g = L.glyph, c = (2 * g) / 5;
  for (const [x, y] of glyphCells(frame.glyphSeed))
    marks.push({ k: "rect", x0: -g + x * c, y0: -g + y * c, x1: -g + (x + 1) * c, y1: -g + (y + 1) * c, fill: P.ink });

  return { frame, S, slots, bits, marks, plate: P.plate, mono };
}
