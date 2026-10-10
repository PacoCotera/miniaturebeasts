// Genome <-> ring bits. Packing follows the codec contract: one bit per
// two-look copy, ceil(log2 n) bits MSB-first for a locus with n looks, against
// the species' pinned frame (shared-catalogue mode: the ring never carries the
// catalogue, only the species number and version that pin it).
//
// Header (40 bits, the outer dashes): species 12 | version 4 | read mask 8 | CRC-16.
// The CRC covers the 24 header bits and every shown payload bit (inner track,
// then outer track, read chapters only), so a misread spoke fails the check.
import { frameFor } from "./frames.mjs";

export const NOTCH_SLOTS = 3; // empty slots at 12 o'clock
export const MIN_SLOTS = 44; // enough dash slots for one full header copy
export const HEADER_BITS = 40;

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), bitwise. Hamming distance 4
// up to 32,751 data bits: every 1-3 wrong spokes in any ring is caught.
export function crc16(bits) {
  let c = 0xffff;
  for (const b of bits) {
    const top = ((c >> 15) & 1) ^ (b & 1);
    c = (c << 1) & 0xffff;
    if (top) c ^= 0x1021;
  }
  return c;
}

const toBits = (v, n) => Array.from({ length: n }, (_, i) => (v >> (n - 1 - i)) & 1);
const fromBits = (bits) => bits.reduce((v, b) => (v << 1) | b, 0);

// Slot plan: S equal angular slots clockwise from the notch. Slots 0..2 are the
// notch; then each chapter's spokes, one empty slot between chapters (padding
// goes into those gaps when a small frame needs MIN_SLOTS).
export function slotLayout(frame) {
  const n = frame.chapters.length;
  const needed = NOTCH_SLOTS + frame.spokesPerTrack + (n - 1);
  const S = Math.max(needed, MIN_SLOTS);
  const extra = S - needed;
  const gaps = Array.from({ length: n }, (_, i) => (i < n - 1 ? 1 : 0));
  for (let e = 0; e < extra; e++) gaps[e % n] += 1; // spread padding over gaps (incl. the trailing one)
  const slots = [];
  for (let i = 0; i < NOTCH_SLOTS; i++) slots.push({ type: "notch" });
  let spoke = 0;
  frame.chapters.forEach((ch, ci) => {
    ch.loci.forEach((locus, li) => {
      for (let b = 0; b < locus.bits; b++) slots.push({ type: "spoke", chapter: ci, spoke: spoke++, locus: li, bit: b });
    });
    for (let g = 0; g < gaps[ci]; g++) slots.push({ type: "gap", chapter: ci });
  });
  if (slots.length !== S) throw new Error("slot plan mismatch");
  return { S, slots };
}

export function readMask(frame, genome) {
  if (typeof genome.readMask === "number") return genome.readMask;
  const read = genome.read ?? frame.chapters.map((c) => c.name);
  return frame.chapters.reduce((m, c, i) => (read.includes(c.name) ? m | (1 << i) : m), 0);
}

// Per-track spoke bits (null where the chapter is unread).
export function genomeToBits(frame, genome) {
  const mask = readMask(frame, genome);
  const tracks = [[], []];
  for (const ch of frame.chapters) {
    const ci = frame.chapters.indexOf(ch);
    for (const locus of ch.loci) {
      const pair = genome.copies?.[locus.id];
      for (let t = 0; t < 2; t++) {
        if (!((mask >> ci) & 1)) {
          for (let b = 0; b < locus.bits; b++) tracks[t].push(null);
          continue;
        }
        const look = pair?.[t];
        const idx = locus.alleles.indexOf(look);
        if (idx < 0) throw new Error(`${locus.id} copy ${t}: unknown look ${look}`);
        tracks[t].push(...toBits(idx, locus.bits));
      }
    }
  }
  const head24 = [...toBits(frame.species, 12), ...toBits(frame.version, 4), ...toBits(mask, 8)];
  const crc = crc16([...head24, ...tracks[0].filter((b) => b !== null), ...tracks[1].filter((b) => b !== null)]);
  return { mask, crc, header: [...head24, ...toBits(crc, 16)], inner: tracks[0], outer: tracks[1] };
}

export function parseHeader(bits) {
  return {
    species: fromBits(bits.slice(0, 12)),
    version: fromBits(bits.slice(12, 16)),
    mask: fromBits(bits.slice(16, 24)),
    crc: fromBits(bits.slice(24, 40)),
  };
}

// Inverse of genomeToBits; returns {ok, genome | error}.
export function bitsToGenome(header, inner, outer) {
  const h = parseHeader(header);
  const frame = frameFor(h.species, h.version);
  if (!frame) return { ok: false, error: `unknown species ${h.species} v${h.version}`, header: h };
  if (h.mask >> frame.chapters.length) return { ok: false, error: "read mask names a missing chapter", header: h };
  const shown = [];
  for (const t of [inner, outer]) for (const b of t) if (b !== null) shown.push(b);
  if (crc16([...header.slice(0, 24), ...shown]) !== h.crc) return { ok: false, error: "check failed", header: h };
  const copies = {};
  let s = 0;
  for (const [ci, ch] of frame.chapters.entries()) {
    const read = (h.mask >> ci) & 1;
    for (const locus of ch.loci) {
      if (read) {
        const pair = [inner, outer].map((t) => fromBits(t.slice(s, s + locus.bits)));
        if (pair.some((i) => i >= locus.alleles.length)) return { ok: false, error: `impossible look on ${locus.id}`, header: h };
        copies[locus.id] = pair.map((i) => locus.alleles[i]);
      }
      s += locus.bits;
    }
  }
  return {
    ok: true,
    genome: {
      species: h.species,
      version: h.version,
      read: frame.chapters.filter((_, i) => (h.mask >> i) & 1).map((c) => c.name),
      unread: frame.chapters.filter((_, i) => !((h.mask >> i) & 1)).map((c) => c.name),
      copies,
    },
    crc: h.crc,
  };
}

// The printed/displayed code under a ring: species.version · mask · check · payload digest.
export function ringCode(frame, genome) {
  const { mask, crc, inner, outer } = genomeToBits(frame, genome);
  let h = 0x811c9dc5; // FNV-1a over the shown bits, for a human-comparable tag
  for (const b of [...inner, ...outer]) if (b !== null) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  const hex = (v, n) => v.toString(16).toUpperCase().padStart(n, "0");
  return `S${frame.species}v${frame.version}-${hex(mask, 2)}-${hex(crc, 4)}-${hex(h >>> 8, 6)}`;
}

// Deterministic PRNG (mulberry32) for test genomes.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomGenome(frame, rand, { readProb = 0.75 } = {}) {
  const copies = {};
  for (const l of frame.heritable) copies[l.id] = [0, 1].map(() => l.alleles[Math.floor(rand() * l.alleles.length)]);
  const read = frame.chapters.filter(() => rand() < readProb).map((c) => c.name);
  return { species: frame.species, version: frame.version, read, copies };
}

// Comparison of a decoded genome with the expected one (shown parts only).
export function sameGenome(frame, expected, decoded) {
  if (!decoded || decoded.species !== frame.species || decoded.version !== frame.version) return false;
  const mask = readMask(frame, expected);
  for (const [ci, ch] of frame.chapters.entries()) {
    const read = (mask >> ci) & 1;
    if (read !== (decoded.read.includes(ch.name) ? 1 : 0)) return false;
    if (!read) continue;
    for (const l of ch.loci) {
      const a = expected.copies[l.id], b = decoded.copies[l.id];
      if (!b || a[0] !== b[0] || a[1] !== b[1]) return false;
    }
  }
  return true;
}
